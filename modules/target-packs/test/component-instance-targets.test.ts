import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import { transform } from "esbuild";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { canonicalJson, inspectStudioProject, planStudioComponentCreate, planStudioComponentEdit, planStudioInstanceEdit } from "../../ads-core/src/index.ts";
import type { StudioComponentPlan, StudioInstanceEdit } from "../../ads-core/src/index.ts";
import { generateTargetPack } from "../src/index.ts";
import type { TargetPack } from "../src/index.ts";
import { DIGEST, projectFixture } from "./target-fixture.ts";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
function composer() {
  let project = projectFixture(), counter = 0;
  const id = () => `instance.target.${++counter}`;
  const accept = (plan: StudioComponentPlan) => { assert.equal(plan.valid, true, canonicalJson(plan.diagnostics)); project = plan.project; };
  const component = (componentId: string) => inspectStudioProject(project).components.find(component => component.id === componentId)!;
  const create = (catalogId: string) => {
    const plan = planStudioComponentCreate(project, { catalogId }, id);
    accept(plan);
    return plan.changes.upserts.find(item => item.document.kind === "component")!.document.id;
  };
  const edit = (owner: string, value: StudioInstanceEdit) => accept(planStudioInstanceEdit(project, owner, value, id));
  const insert = (owner: string, source: string) => {
    const slot = component(owner).catalog!.slots.find(slot => component(owner).parts.find(part => part.id === slot.ownerPartRef)!.role === "body")!;
    edit(owner, { kind: "insert", ownerPartRef: String(slot.ownerPartRef), slotRef: String(slot.id), sourceComponentId: source });
    return component(owner).instances!.at(-1)!;
  };
  return { id, accept, component, create, edit, insert, get project() { return project; } };
}

async function compile(pack: TargetPack, hookOverrides: Record<string, unknown> = {}) {
  const source = pack.files.find(file => file.path === "src/index.tsx")!.text;
  const transformed = await transform(source, { loader: "tsx", format: "cjs", jsx: "automatic" });
  const module = { exports: {} as Record<string, React.ComponentType<Record<string, unknown>>> };
  vm.runInNewContext(transformed.code, { module, exports: module.exports, require: (name: string) => name === "react" ? { ...React, ...hookOverrides } : name === "react/jsx-runtime" ? jsxRuntime : {} });
  return { source, get: (componentId: string) => module.exports[pack.manifest.publicApiMap[componentId]!]! };
}

test("composed React source typechecks and SSR renders scalar overrides and escaped required slot content", async () => {
  const fixture = composer(), owner = fixture.create("catalog.box"), input = fixture.create("catalog.input"), checkbox = fixture.create("catalog.checkbox"), card = fixture.create("catalog.card");
  const text = '<img src=x onerror="throw 1"> 한글';
  const inputInstance = fixture.insert(owner, input), checkInstance = fixture.insert(owner, checkbox), cardInstance = fixture.insert(owner, card);
  const value = fixture.component(input).catalog!.values.find(value => value.name === "value")!;
  const checked = fixture.component(checkbox).catalog!.values.find(value => value.name === "checked")!;
  const body = fixture.component(card).catalog!.slots.find(slot => fixture.component(card).parts.find(part => part.id === slot.ownerPartRef)!.role === "body")!;
  fixture.edit(owner, { kind: "value", instanceId: inputInstance.id, valueId: String(value.id), value: text, reset: false });
  fixture.edit(owner, { kind: "value", instanceId: checkInstance.id, valueId: String(checked.id), value: true, reset: false });
  fixture.edit(owner, { kind: "content", instanceId: cardInstance.id, slotId: String(body.id), text: '<strong>Instance body</strong>' });
  const generated = generateTargetPack(fixture.project, { target: "react" }, DIGEST);
  assert.equal(generated.valid, true, canonicalJson(generated.diagnostics));
  const pack = generated.pack!;
  mkdirSync(resolve(ROOT, "dist"), { recursive: true });
  const consumer = mkdtempSync(resolve(ROOT, "dist/composed-react-typecheck-"));
  for (const file of pack.files) { const path = resolve(consumer, file.path); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, file.text); }
  const typecheck = spawnSync(process.execPath, [resolve(ROOT, "node_modules/typescript/bin/tsc"), "-p", resolve(consumer, "tsconfig.json"), "--noEmit"], { cwd: ROOT, encoding: "utf8", timeout: 30000 });
  assert.equal(typecheck.error, undefined);
  assert.equal(typecheck.status, 0, typecheck.stdout + typecheck.stderr);
  const compiled = await compile(pack);
  const markup = renderToStaticMarkup(React.createElement(compiled.get(owner), {}));
  assert.match(markup, /type="checkbox"[^>]*checked=""/);
  assert.match(markup, /value="&lt;img src=x onerror=&quot;throw 1&quot;&gt; 한글"/);
  assert.match(markup, /&lt;strong&gt;Instance body&lt;\/strong&gt;/);
  assert.doesNotMatch(markup, /<img|<strong>Instance body/);
  assert.equal((markup.match(/type="checkbox"/g) ?? []).length, 1);
  assert.ok(markup.indexOf('type="text"') < markup.indexOf('type="checkbox"'), "Sibling insertion order must survive export");
});

test("stale component and category design pins require explicit review before React export", () => {
  for (const change of ["component", "design"] as const) {
    const fixture = composer(), owner = fixture.create("catalog.box"), source = fixture.create("catalog.button");
    const instance = fixture.insert(owner, source), root = fixture.component(source).parts.find(part => part.role === "root")!;
    fixture.accept(planStudioComponentEdit(fixture.project, { componentId: source, edit: change === "component" ? { kind: "name", name: "Updated source" } : { kind: "appearance", category: "Web", partId: root.id, property: "opacity", value: .9 } }, fixture.id));
    assert.equal(fixture.component(owner).instances![0]!.status, "stale");
    const stale = generateTargetPack(fixture.project, { target: "react" }, DIGEST);
    assert.equal(stale.valid, false); assert.equal(stale.pack, undefined);
    assert(stale.diagnostics.some(item => /stale instance/i.test(item.message)), canonicalJson(stale.diagnostics));
    fixture.edit(owner, { kind: "refresh", instanceId: instance.id });
    assert.equal(generateTargetPack(fixture.project, { target: "react" }, DIGEST).valid, true);
  }
});

test("native targets reject composition explicitly without publishing partial source", () => {
  const fixture = composer(), owner = fixture.create("catalog.box"), source = fixture.create("catalog.button");
  fixture.insert(owner, source);
  for (const target of ["react-native", "swiftui", "compose"] as const) {
    const generation = generateTargetPack(fixture.project, { target }, DIGEST);
    assert.equal(generation.valid, false, target); assert.equal(generation.pack, undefined);
    assert(generation.diagnostics.some(item => /composition.*native mapping/i.test(item.message)), canonicalJson(generation.diagnostics));
  }
});

test("nested instances emit real child trees and keep the leaf event identity in ancestor forwarding", async () => {
  const fixture = composer(), owner = fixture.create("catalog.box"), nested = fixture.create("catalog.box"), source = fixture.create("catalog.button");
  const leaf = fixture.insert(nested, source);
  fixture.insert(owner, nested);
  const generated = generateTargetPack(fixture.project, { target: "react" }, DIGEST);
  assert.equal(generated.valid, true, canonicalJson(generated.diagnostics));
  const hooks = { useState: (value: unknown) => [typeof value === "function" ? (value as () => unknown)() : value, () => {}], useId: () => "composition-test-id" };
  const compiled = await compile(generated.pack!, hooks);
  const events: unknown[] = [];
  // Invoke the emitted wrappers under a minimal hook host to inspect the actual JSX callback chain.
  {
    const Parent = compiled.get(owner) as (props: Record<string, unknown>) => React.ReactElement;
    const descendants = (element: React.ReactNode): React.ReactElement[] => React.isValidElement(element) ? [element, ...React.Children.toArray((element.props as { children?: React.ReactNode }).children).flatMap(descendants)] : [];
    const top = Parent({ onInstanceEvent: (event: unknown) => events.push(event) });
    const nestedElement = descendants(top).find(element => element.type === compiled.get(nested))!;
    const Nested = nestedElement.type as (props: Record<string, unknown>) => React.ReactElement;
    const nestedTree = Nested(nestedElement.props as Record<string, unknown>);
    const leafElement = descendants(nestedTree).find(element => element.type === compiled.get(source))!;
    (leafElement.props as { onActivate: (request: object) => void }).onActivate({});
    assert.deepEqual(JSON.parse(JSON.stringify(events)), [{ instanceId: leaf.id, event: "activate", payload: {} }]);
  }
  const reactHooks = await compile(generated.pack!);
  const markup = renderToStaticMarkup(React.createElement(reactHooks.get(owner), {}));
  assert.equal((markup.match(/<button\b/g) ?? []).length, 1);
});

test("custom content areas that collide with generated API names reject before emitting broken TypeScript", () => {
  for (const role of ["label", "default", "onInstanceEvent", "instance0Values", "axiomLocal", "constructor"]) {
    const fixture = composer(), owner = fixture.create("catalog.box"), root = fixture.component(owner).parts.find(part => part.role === "root")!;
    fixture.accept(planStudioComponentEdit(fixture.project, { componentId: owner, edit: { kind: "part-add", parentId: root.id, name: "Content area", role } }, fixture.id));
    const part = fixture.component(owner).parts.find(part => part.role === role)!;
    fixture.accept(planStudioComponentEdit(fixture.project, { componentId: owner, edit: { kind: "slot-add", partId: part.id, required: false, multiple: true } }, fixture.id));
    const generated = generateTargetPack(fixture.project, { target: "react" }, DIGEST);
    assert.equal(generated.valid, false, role); assert.equal(generated.pack, undefined);
    assert(generated.diagnostics.some(item => /Content area name conflicts/.test(item.message)), canonicalJson(generated.diagnostics));
  }
});
