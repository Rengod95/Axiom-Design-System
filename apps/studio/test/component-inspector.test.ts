import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { canonicalJson, createStudioStarter, inspectStudioProject, planStudioComponentCreate, planStudioComponentEdit, STUDIO_PROFILE } from "../../../modules/ads-core/src/index.ts";
import type { ProjectSnapshot, StudioCategory, StudioComponent } from "../../../modules/ads-core/src/index.ts";
import type { StudioState } from "../src/controller.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const directory = await mkdtemp(join(tmpdir(), "axiom-component-inspector-"));
after(async () => { assert.equal(dirname(resolve(directory)), resolve(tmpdir())); assert.ok(directory.includes("axiom-component-inspector-")); await rm(directory, { recursive: true, force: true }); });
const compiled = await build({ absWorkingDir: root, stdin: { contents: `
  import { createElement } from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';
  import { ComponentInspector } from './apps/studio/src/component-inspector.tsx';
  import { StructureTree } from './apps/studio/src/structure-tree.tsx';
  import { FormDraftProvider } from './apps/studio/src/form-drafts.tsx';
  import { Inspector } from './apps/studio/src/inspector.tsx';
  export * from './apps/studio/src/component-inspector.tsx';
  export function renderTree(component, part) { return renderToStaticMarkup(createElement(StructureTree,{component,selectedPart:part,category:'Web',locale:'en',disabled:false,onSelect(){},onEdit(){return true}})); }
  export function render(state, id, part, category='Web', locale='en', whole=false) {
    const component=state.projection.components.find(item=>item.id===id);
    const controller={component(){},inputError(){},getSnapshot(){return state},exportSource(){return Promise.resolve(null)}};
    return renderToStaticMarkup(createElement(FormDraftProvider,null,createElement(whole?Inspector:ComponentInspector,{state,controller,component,selectedPart:part,category,locale,tokenId:null})));
  }
`, resolveDir: root, loader: "tsx" }, loader: { ".css": "empty" }, bundle: true, platform: "node", format: "cjs", target: "node24", jsx: "automatic", write: false, logLevel: "silent" });
const filename = join(directory, "inspector.cjs"); await writeFile(filename, compiled.outputFiles[0]!.text);
const ui = (await import(pathToFileURL(filename).href)).default as {
  render(state: StudioState, id: string, part: string | null, category?: StudioCategory, locale?: string, whole?: boolean): string;
  renderTree(component: StudioComponent, part: string | null): string;
  inspectorNumber(text: string, min?: number, max?: number): number | null;
  movedChildren(component: StudioComponent, id: string, direction: -1 | 1): string[] | null;
  inspectorSource(state: StudioState, component: StudioComponent, id: string, category: StudioCategory): { declarations: Record<string, unknown>; values: { id: string; name: string; type: unknown }[] };
};
function fixture() {
  let count = 0; const id = () => `inspector.generated.${++count}`;
  const project: ProjectSnapshot = { id: "project.inspector", name: "Inspector", revision: "project.initial", documents: Object.fromEntries(createStudioStarter("project.inspector").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:initial", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  const state = (working = project): StudioState => ({ loading: false, busy: false, project, projection: inspectStudioProject(working), plan: working === project ? null : { valid: true, diagnostics: [], baseRevision: project.revision, project: working, updates: [], impact: [] }, selection: {}, authoring: { revision: project.revision, pendingCandidates: [] }, candidate: null, buffers: {}, pendingBuffers: [], diagnostics: [], error: null, message: null, retryable: false });
  return { project, state, id };
}
const tag = (html: string, selector: string): string => html.match(new RegExp(`<[^>]+data-testid="${selector}"[^>]*>`))?.[0] ?? "";

test("builtin inspector exposes editable properties and preserves required semantic structure", () => {
  const h = fixture(), state = h.state(), before = canonicalJson(state);
  const html = ui.render(state, "component.button", "component.button.root");
  for (const selector of ["component-name", "component-purpose", "sample-label", "part-name", "layout-gap", "layout-padding", "layout-minHeight", "layout-axis", "motion-duration"]) assert.ok(tag(html, selector), selector);
  assert.equal(tag(html, "part-delete"), "", "Structure actions belong to the left tree");
  assert.equal(tag(html, "part-add"), ""); assert.equal(tag(html, "layout-width"), ""); assert.equal(tag(html, "a11y-label"), "");
  assert.match(tag(html, "value-delete-component.button.disabled"), /disabled=""/);
  assert.doesNotMatch(html, /class="element-tree"/);
  for (const field of ["background", "color", "borderColor", "borderWidth", "borderRadius", "fontSize", "opacity"]) assert.ok(tag(html, `appearance-${field}-binding`), field);
  assert.equal(canonicalJson(state), before, "rendering never modifies source");
});

test("catalog properties expose authored part, size, value, accessibility and motion contracts", () => {
  const h = fixture(), created = planStudioComponentCreate(h.project, { catalogId: "catalog.checkbox", name: "Consent" }, h.id);
  assert.equal(created.valid, true);
  const state = h.state(created.project), component = state.projection!.components.find(item => item.name === "Consent")!, rootPart = component.parts.find(item => item.parent === null)!;
  const html = ui.render(state, component.id, rootPart.id);
  for (const selector of ["layout-width", "layout-height", "layout-alignment", "value-add", "a11y-label", "a11y-description", "motion-easing"]) assert.ok(tag(html, selector), selector);
  const source = ui.inspectorSource(state, component, rootPart.id, "Web");
  const checked = source.values.find(value => value.name === "checked")!;
  assert.match(tag(html, `value-${checked.id}`), /<select/); assert.match(tag(html, `value-delete-${checked.id}`), /disabled=""/);
  assert.match(html, /value="ease"/);
  assert.doesNotMatch(html, /data-testid="value-add-type"/, "new-value form starts closed");
  assert.match(ui.render(state, component.id, rootPart.id, "Mobile", "ko"), /접근 가능한 이름/);
});

test("new optional parts can move among exact siblings and be deleted without enabling required-part removal", () => {
  const h = fixture(), created = planStudioComponentCreate(h.project, { catalogId: "catalog.checkbox", name: "Consent" }, h.id);
  const component = inspectStudioProject(created.project).components.find(item => item.name === "Consent")!, rootPart = component.parts.find(item => item.parent === null)!;
  const changed = planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "part-add", parentId: rootPart.id, name: "Help", role: "help" } }, h.id);
  assert.equal(changed.valid, true);
  const state = h.state(changed.project), next = state.projection!.components.find(item => item.id === component.id)!, help = next.parts.find(item => item.name === "Help")!;
  const html = ui.render(state, next.id, help.id);
  assert.doesNotMatch(tag(html, "part-delete"), /disabled/);
  assert.match(tag(ui.renderTree(next, help.id), "part-delete"), /<button/);
  assert.doesNotMatch(tag(ui.renderTree(next, help.id), "part-delete"), /disabled/);
  const labelPart = next.parts.find(part => part.role === "label")!;
  assert.match(tag(ui.renderTree(next, labelPart.id), "part-delete"), /disabled/);
  assert.equal(tag(ui.renderTree(next, rootPart.id), "part-delete"), "");
  const ordered = ui.movedChildren(next, help.id, -1)!;
  assert.deepEqual(new Set(ordered), new Set(next.parts.filter(part => part.parent === rootPart.id).map(part => part.id)));
  assert.equal(ordered.at(-2), help.id); assert.equal(ui.movedChildren(next, help.id, 1), null);
  assert.equal(ui.movedChildren(next, rootPart.id, 1), null);
});

test("inspector reads bindings from the selected category and working document instead of writing resolved literals", () => {
  const h = fixture(), source = h.project.documents["design.button.mobile"]!.document;
  const component = h.state().projection!.components.find(item => item.id === "component.button")!;
  const changed = planStudioComponentEdit(h.project, { componentId: component.id, edit: { kind: "appearance", category: "Mobile", partId: "component.button.root", property: "opacity", value: 0.5 } }, h.id);
  assert.equal(changed.valid, true);
  const state = h.state(changed.project);
  assert.equal(ui.inspectorSource(state, component, "component.button.root", "Mobile").declarations.opacity, 0.5);
  assert.notEqual(ui.inspectorSource(state, component, "component.button.root", "Web").declarations.opacity, 0.5);
  const html = ui.render(state, component.id, "component.button.root", "Mobile");
  assert.match(tag(html, "appearance-opacity-value"), /value="0.5"/);
  assert.deepEqual(h.project.documents["design.button.mobile"]!.document, source);
});

test("source access includes unapproved documents and review state disables editing controls", () => {
  const h = fixture(), created = planStudioComponentCreate(h.project, { catalogId: "catalog.checkbox", name: "<script>unsafe</script>" }, h.id);
  assert.equal(created.valid, true);
  const state = h.state(created.project), component = state.projection!.components.find(item => item.archetype === "catalog")!;
  state.candidate = { id: "candidate.pending", baseRevision: h.project.revision, digest: "digest", status: "pending", diff: [], diagnostics: [] };
  const html = ui.render(state, component.id, null, "Web", "en", true);
  for (const selector of ["source-tab", "source-editor", "source-preview", "source-capture", "source-original"]) assert.ok(tag(html, selector), selector);
  assert.ok(html.includes(`<option value="${component.id}">`));
  assert.match(html, /<fieldset[^>]*disabled=""/); assert.match(tag(html, "source-preview"), /disabled=""/);
  assert.doesNotMatch(html, /<script>unsafe/); assert.match(html, /&lt;script&gt;unsafe/);
  assert.match(html, /aria-controls="inspector-source-panel"/);
});

test("numeric text accepts explicit zero and decimal forms while incomplete or out-of-range input stays invalid", () => {
  assert.equal(ui.inspectorNumber("0"), 0); assert.equal(ui.inspectorNumber(" 12.5 "), 12.5); assert.equal(ui.inspectorNumber("1e2"), 100);
  assert.equal(ui.inspectorNumber("4096"), 4096);
  for (const text of ["", " ", "-", ".", "1e", "Infinity", "NaN", "-1", "4097"]) assert.equal(ui.inspectorNumber(text), null, text);
  assert.equal(ui.inspectorNumber("1.1", 0, 1), null); assert.equal(ui.inspectorNumber("0", 1, 2048), null);
});
