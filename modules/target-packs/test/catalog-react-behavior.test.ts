import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { resolve } from "node:path";
import ts from "typescript";
import { transform } from "esbuild";
import * as jsxRuntime from "react/jsx-runtime";
import { canonicalJson, inspectStudioProject, planStudioComponentCreate, planStudioComponentEdit } from "../../ads-core/src/index.ts";
import type { JsonObject, StudioComponent } from "../../ads-core/src/index.ts";
import { projectFixture } from "./target-fixture.ts";
import { catalogReactBehavior, catalogReactBehaviorRuntime } from "../src/catalog-react-behavior.ts";
import { catalogProps } from "../src/catalog-source-types.ts";

function fixture(): StudioComponent {
  let sequence = 0; const id = () => `behavior.target.${++sequence}`;
  const created = planStudioComponentCreate(projectFixture(), { catalogId: "catalog.checkbox", name: "Stateful checkbox" }, id);
  assert.equal(created.valid, true, canonicalJson(created.diagnostics));
  const component = created.changes.upserts.find(item => item.document.kind === "component")!.document;
  const added = planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "value-add", name: "active", type: { kind: "boolean" }, value: false, ownership: "local" } }, id);
  const source = added.project.documents[component.id]!.document, contract = source.publicContract as JsonObject;
  const local = (contract.values as JsonObject[]).find(port => port.name === "active")!, request = (contract.events as JsonObject[]).find(port => port.name === "checkedChangeRequest")!;
  const edited = planStudioComponentEdit(added.project, { componentId: component.id, edit: { kind: "behavior-set", behavior: { version: "1.0.0", rules: [
    { id: "behavior.press", name: "Select", targetPartRef: String((source.parts as JsonObject[])[0]!.id), trigger: "press", condition: null, actions: [{ kind: "toggle", valueRef: String(local.id) }] },
    { id: "behavior.focus", name: "Focus", targetPartRef: String((source.parts as JsonObject[])[0]!.id), trigger: "focus", condition: null, actions: [{ kind: "set", valueRef: String(local.id), value: true }, { kind: "emit", eventRef: String(request.id), payload: { value: true } }] },
  ] } } }, id);
  assert.equal(edited.valid, true, canonicalJson(edited.diagnostics));
  return inspectStudioProject(edited.project).components.find(item => item.id === component.id)!;
}
function source(component: StudioComponent): string {
  const api = catalogProps(component, "BehaviorFixture"), behavior = catalogReactBehavior(component), root = component.parts.find(part => part.parent === null)!;
  return `import * as React from "react";${catalogReactBehaviorRuntime()}${api.declaration}
export function BehaviorFixture(props:BehaviorFixtureProps){${api.destructure}${behavior.hooks}return <div data-part=${JSON.stringify(root.id)} ${behavior.attributes}><button type="button">Child</button></div>;}`;
}

test("generated behavior hooks and the shared runtime pass strict TypeScript with real React declarations", () => {
  const text = source(fixture()), file = resolve("modules/target-packs/test/.behavior-consumer.tsx");
  const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, skipLibCheck: true, types: ["react"] };
  const host = ts.createCompilerHost(options), read = host.readFile.bind(host), get = host.getSourceFile.bind(host), exists = host.fileExists.bind(host);
  host.readFile = name => resolve(name) === file ? text : read(name); host.fileExists = name => resolve(name) === file || exists(name);
  host.getSourceFile = (name, language, onError, create) => resolve(name) === file ? ts.createSourceFile(name, text, language, true, ts.ScriptKind.TSX) : get(name, language, onError, create);
  const program = ts.createProgram([file], options, host), errors = ts.getPreEmitDiagnostics(program).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, "\n")), []);
});

test("generated React capture normalizes label input once, preserves batched local state and isolates child instances", async () => {
  const component = fixture(), generated = await transform(source(component), { loader: "tsx", format: "cjs", jsx: "automatic" });
  const cells: unknown[] = []; let cursor = 0;
  const hooks = {
    useState(initial: unknown) { const position = cursor++; if (!(position in cells)) cells[position] = typeof initial === "function" ? initial() : initial; return [cells[position], (next: unknown) => { cells[position] = next; }]; },
    useRef(initial: unknown) { const position = cursor++; if (!(position in cells)) cells[position] = { current: initial }; return cells[position]; },
  };
  class ElementNode {
    parentElement: ElementNode | null;
    attributes: Record<string, string>;
    constructor(attributes: Record<string, string>, parent: ElementNode | null = null) { this.attributes = attributes; this.parentElement = parent; }
    getAttribute(name: string) { return this.attributes[name] ?? null; }
    contains(target: ElementNode | null): boolean { for (let current = target; current; current = current.parentElement) if (current === this) return true; return false; }
    closest(selector: string): ElementNode | null { for (let current: ElementNode | null = this; current; current = current.parentElement) if (selector.includes("behavior-root") ? current.attributes["data-axiom-behavior-root"] : current.attributes.disabled === "true") return current; return null; }
  }
  const module = { exports: {} as { BehaviorFixture(props: Record<string, unknown>): { props: Record<string, unknown> } } };
  vm.runInNewContext(generated.code, { Element: ElementNode, Node: ElementNode, module, exports: module.exports, require: (name: string) => name === "react" ? hooks : name === "react/jsx-runtime" ? jsxRuntime : {} });
  const requests: unknown[] = [], render = (disabled = false) => { cursor = 0; return module.exports.BehaviorFixture({ disabled, checked: false, onCheckedChangeRequest: (request: unknown) => requests.push(request) }).props; };
  const root = new ElementNode({ "data-axiom-behavior-root": component.id, "data-part": component.parts.find(part => part.parent === null)!.id }), child = new ElementNode({ "data-part": component.parts.find(part => part.role === "label")!.id }, root);
  const dispatch = (props: Record<string, unknown>, key: string, target = child, relatedTarget?: ElementNode) => (props[key] as (event: unknown) => void)({ target, currentTarget: root, relatedTarget });
  const props = render(); assert.equal(props["data-state-active"], "false");
  dispatch(props, "onClickCapture"); dispatch(props, "onClickCapture");
  assert.equal(render()["data-state-active"], "false", "Two batched clicks toggle twice using the current local snapshot");
  assert.deepEqual(requests, []);
  const nested = new ElementNode({ "data-axiom-behavior-root": "child.instance" }, root), nestedLabel = new ElementNode({}, nested);
  dispatch(render(), "onClickCapture", nestedLabel); assert.equal(requests.length, 0);
  dispatch(render(true), "onClickCapture"); assert.equal(requests.length, 0);
  dispatch(render(), "onFocusCapture", child, root); assert.equal(render()["data-state-active"], "false", "Internal focus does not re-enter the matching root");
  dispatch(render(), "onFocusCapture"); assert.equal(render()["data-state-active"], "true");
  assert.deepEqual(JSON.parse(JSON.stringify(requests)), [{ value: true }]);
  assert.equal(component.catalog!.values.find(value => value.name === "active")!.defaultValue, false);
});
