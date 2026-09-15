import test from "node:test";
import assert from "node:assert/strict";
import { transform } from "esbuild";
import vm from "node:vm";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { canonicalJson, inspectStudioProject, planStudioComponentCreate, planStudioComponentEdit } from "../../ads-core/src/index.ts";
import type { ProjectSnapshot, StudioComponentEdit, StudioComponentPlan } from "../../ads-core/src/index.ts";
import { generateTargetPack } from "../src/index.ts";
import { DIGEST, projectFixture } from "./target-fixture.ts";

function fixture(catalogId: string) {
  let count = 0; const id = () => `catalog.target.${++count}`;
  const plan = planStudioComponentCreate(projectFixture(), { catalogId }, id); assert.equal(plan.valid, true, canonicalJson(plan.diagnostics));
  const component = plan.changes.upserts.find(item => item.document.kind === "component")!.document;
  return { plan, component, id };
}
async function reactComponent(catalogId: string) {
  const { plan, component } = fixture(catalogId);
  return compiledComponent(plan.project, component.id);
}
async function compiledComponent(project: ProjectSnapshot, componentId: string) {
  const generated = generateTargetPack(project, { target: "react" }, DIGEST);
  assert.equal(generated.valid, true, canonicalJson(generated.diagnostics)); const pack = generated.pack!;
  const transformed = await transform(pack.files.find(file => file.path === "src/index.tsx")!.text, { loader: "tsx", format: "cjs", jsx: "automatic" });
  const module = { exports: {} as Record<string, unknown> };
  vm.runInNewContext(transformed.code, { module, exports: module.exports, require: (name: string) => name === "react" ? React : name === "react/jsx-runtime" ? jsxRuntime : {}, console });
  return { Component: module.exports[pack.manifest.publicApiMap[componentId]!] as React.ComponentType<Record<string, unknown>>, exports: module.exports, pack };
}

test("generated React catalog emits real input/select/table semantics and escapes consumer text", async () => {
  for (const [catalogId, pattern, props] of [
    ["catalog.checkbox", /type="checkbox"/, { onCheckedChangeRequest() {} }],
    ["catalog.textarea", /<textarea/, { onValueChangeRequest() {} }],
    ["catalog.select", /<select/, { onSelectedKeyChangeRequest() {} }],
    ["catalog.table", /<table/, {}],
    ["catalog.tabs", /role="tablist"/, { onSelectedKeyChangeRequest() {} }],
    ["catalog.rating", /type="radio"/, { onValueChangeRequest() {} }],
  ] as const) {
    const { Component } = await reactComponent(catalogId);
    const markup = renderToStaticMarkup(React.createElement(Component, { ...props, label: "<unsafe>" }));
    assert.match(markup, pattern); assert.match(markup, /&lt;unsafe&gt;/); assert.doesNotMatch(markup, /<unsafe>/);
  }
});

test("catalog controlled checkbox delegates one typed request without mutating a consumer-owned value", async () => {
  const { Component } = await reactComponent("catalog.checkbox");
  // React's server renderer verifies the controlled source; actual browser events live in test:targets.
  const requests: unknown[] = [];
  const markup = renderToStaticMarkup(React.createElement(Component, { checked: true, onCheckedChangeRequest: (request: unknown) => requests.push(request) }));
  assert.match(markup, /checked=""/); assert.deepEqual(requests, []);
});

test("overlay components require an explicit host and output contains native modal/focus mechanics", async () => {
  const { Component, exports, pack } = await reactComponent("catalog.dialog");
  assert.throws(() => renderToStaticMarkup(React.createElement(Component, { body: "Dialog body", onOpenChangeRequest() {} })), /AxiomOverlayHost/);
  const Host = exports.AxiomOverlayHost as React.ComponentType<{ children: React.ReactNode }>;
  const markup = renderToStaticMarkup(React.createElement(Host, { children: React.createElement(Component, { body: "Dialog body", onOpenChangeRequest() {} }) }));
  assert.match(markup, /<dialog/); assert.match(pack.files.find(file => file.path === "src/index.tsx")!.text, /element\.showModal\(\)/);
});

test("target capability rejection is per semantic contract with no partial generated fallback", () => {
  const { plan } = fixture("catalog.areachart");
  for (const target of ["react", "react-native", "swiftui", "compose"] as const) { const result = generateTargetPack(plan.project, { target }, DIGEST); assert.equal(result.valid, false); assert.equal(result.pack, undefined); assert.equal(result.diagnostics[0]!.code, "TARGET_UNSUPPORTED"); }
  const slider = fixture("catalog.slider"); assert.equal(generateTargetPack(slider.plan.project, { target: "react-native" }, DIGEST).valid, false);
});

test("unsupported custom part and public-port edits fail output while authoring remains valid", () => {
  const { plan, component, id } = fixture("catalog.checkbox"), root = (component.parts as { id: string }[])[0]!;
  const part = planStudioComponentEdit(plan.project, { componentId: component.id, edit: { kind: "part-add", parentId: root.id, name: "Custom detail", role: "detail" } }, id);
  const value = planStudioComponentEdit(plan.project, { componentId: component.id, edit: { kind: "value-add", name: "customValue", type: { kind: "string" }, value: "Preserved", ownership: "consumer" } }, id);
  for (const edited of [part, value] as StudioComponentPlan[]) { assert.equal(edited.valid, true, canonicalJson(edited.diagnostics)); assert.equal(generateTargetPack(edited.project, { target: "react" }, DIGEST).valid, false); }
});

test("generated RN mixed checkbox exposes the mixed state and requests adoption without owning checked", async () => {
  const { plan, component } = fixture("catalog.checkbox");
  const result = generateTargetPack(plan.project, { target: "react-native" }, DIGEST); assert.equal(result.valid, true, canonicalJson(result.diagnostics));
  const transformed = await transform(result.pack!.files.find(file => file.path === "src/index.tsx")!.text, { loader: "tsx", format: "cjs", jsx: "automatic" });
  const module = { exports: {} as Record<string, unknown> };
  const native = Object.fromEntries(["View", "Text", "Pressable", "TextInput", "Switch", "ActivityIndicator", "Modal"].map(name => [name, name]));
  vm.runInNewContext(transformed.code, { module, exports: module.exports, require: (name: string) => name === "react" ? React : name === "react/jsx-runtime" ? jsxRuntime : name === "react-native" ? native : {} });
  const Component = module.exports[result.pack!.manifest.publicApiMap[component.id]!] as (props: object) => React.ReactElement<Record<string, unknown>>;
  const requests: unknown[] = [], input = { checked: false, indeterminate: true, onCheckedChangeRequest: (request: unknown) => requests.push(request) };
  const element = Component(input); assert.equal(element.type, "Pressable");
  assert.equal((element.props.accessibilityState as { checked: string }).checked, "mixed");
  (element.props.onPress as () => void)();
  assert.equal(JSON.stringify(requests), '[{"value":true}]'); assert.equal(input.checked, false);
  const text = element.props.children as React.ReactElement<{ style: { color: string; fontSize: number } }>;
  assert.equal(text.props.style.fontSize, 16); assert.equal(typeof text.props.style.color, "string");
});

test("native catalog sources use typed platform controls and separate unexecuted evidence", () => {
  for (const [catalogId, target, pattern] of [
    ["catalog.input", "swiftui", /TextField\(placeholder, text: Binding\(get: \{ value \}, set: \{ onValueChangeRequest\(\$0\)/],
    ["catalog.select", "swiftui", /Picker\(label, selection: Binding/],
    ["catalog.switch", "swiftui", /Toggle\(label, isOn: Binding/],
    ["catalog.checkbox", "compose", /TriStateCheckbox\(state=if\(indeterminate\)ToggleableState\.Indeterminate/],
    ["catalog.input", "compose", /OutlinedTextField\(value=value,onValueChange=\{onValueChangeRequest\(it\)\}/],
    ["catalog.select", "compose", /onSelectedKeyChangeRequest\(null\)/],
  ] as const) {
    const { plan } = fixture(catalogId), result = generateTargetPack(plan.project, { target }, DIGEST); assert.equal(result.valid, true, canonicalJson(result.diagnostics));
    assert.match(result.pack!.files.find(file => file.path.endsWith(target === "swiftui" ? "/AxiomDesign.swift" : "/AxiomDesign.kt"))!.text, pattern);
    assert.equal(result.pack!.manifest.verification.typechecked, "not-run"); assert.equal(result.pack!.manifest.verification.runtime, "not-run");
  }
});

test("variant-specific geometry and unsupported motion reject instead of changing the source meaning", () => {
  for (const catalogId of ["catalog.grid", "catalog.ringprogress", "catalog.highlight"]) for (const target of ["react", "react-native", "swiftui", "compose"] as const) {
    const { plan } = fixture(catalogId), result = generateTargetPack(plan.project, { target }, DIGEST); assert.equal(result.valid, false); assert.equal(result.pack, undefined);
  }
  const { plan, component, id } = fixture("catalog.checkbox");
  const edit = planStudioComponentEdit(plan.project, { componentId: component.id, edit: { kind: "motion", field: "easing", value: "linear" } }, id);
  assert.equal(edit.valid, true); assert.equal(generateTargetPack(edit.project, { target: "react" }, DIGEST).valid, false);
});

test("toggle groups retain pressed-button semantics and CSS never reveals hidden tab panels", async () => {
  const { Component, pack } = await reactComponent("catalog.togglegroup");
  const markup = renderToStaticMarkup(React.createElement(Component, { selectedKeys: ["first"], onSelectedKeysChangeRequest() {} }));
  assert.match(markup, /<button[^>]+aria-pressed="true"/); assert.doesNotMatch(markup, /type="checkbox"/);
  assert.match(pack.files.find(file => file.path === "src/styles.css")!.text, /\[hidden\]\{display:none!important\}/);
});

test("React renders reordered logical parts in source order while unmapped native targets reject", async () => {
  const { plan, component, id } = fixture("catalog.card");
  const parts = component.parts as { id: string; studioRole: string }[], root = parts.find(part => part.studioRole === "root")!;
  const edit = planStudioComponentEdit(plan.project, { componentId: component.id, edit: { kind: "part-order", parentId: root.id, childIds: ["body", "header", "actions"].map(role => parts.find(part => part.studioRole === role)!.id) } }, id);
  assert.equal(edit.valid, true, canonicalJson(edit.diagnostics));
  const { Component } = await compiledComponent(edit.project, component.id);
  const markup = renderToStaticMarkup(React.createElement(Component, { body: "Body", header: "Header", actions: "Actions" }));
  const positions = ["body", "header", "actions"].map(role => markup.indexOf(`data-part="${parts.find(part => part.studioRole === role)!.id}"`));
  assert.ok(positions.every(position => position >= 0)); assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  for (const target of ["react-native", "swiftui", "compose"] as const) { const result = generateTargetPack(edit.project, { target }, DIGEST); assert.equal(result.valid, false); assert.equal(result.pack, undefined); assert.match(result.diagnostics[0]!.message, /part order/); }
});

test("compound React templates retain nested Trigger content, slots, unique relationships and native rejection", async () => {
  const { plan, component, id } = fixture("catalog.accordion"); let project = plan.project;
  const projection = () => inspectStudioProject(project).components.find(item => item.id === component.id)!;
  const edit = (edit: StudioComponentEdit) => { const next = planStudioComponentEdit(project, { componentId: component.id, edit }, id); assert.equal(next.valid, true, canonicalJson(next.diagnostics)); project = next.project; };
  const trigger = projection().parts.find(part => part.role === "trigger")!, panel = projection().parts.find(part => part.role === "panel")!;
  edit({ kind: "element-add", parentId: trigger.id, element: "box" });
  const box = projection().parts.find(part => part.elementKind === "box")!;
  edit({ kind: "element-add", parentId: box.id, element: "text" });
  const caption = projection().parts.find(part => part.elementKind === "text")!;
  edit({ kind: "part-text", partId: caption.id, text: "<Details>" });
  edit({ kind: "element-add", parentId: panel.id, element: "text" });
  const body = projection().parts.find(part => part.elementKind === "text" && part.id !== caption.id)!;
  edit({ kind: "part-text", partId: body.id, text: "Authored answer" });
  const { Component } = await compiledComponent(project, component.id);
  const props = { expandedKeys: ["one"], items: [{ key: "one", label: "First" }, { key: "two", label: "Second" }], onExpandedKeysChangeRequest() {} };
  const markup = renderToStaticMarkup(React.createElement(Component, props));
  assert.equal(markup.split("&lt;Details&gt;").length - 1, 2);
  assert.equal(markup.split("Authored answer").length - 1, 2);
  assert.match(markup, new RegExp(`<button[^>]*>[\\s\\S]*?<span[^>]*data-part="${box.id}"[^>]*><span[^>]*data-part="${caption.id}"`));
  assert.doesNotMatch(markup, /<button[^>]*>(?:(?!<\/button>)[\s\S])*<div/);
  const controls = [...markup.matchAll(/aria-controls="([^"]+)"/g)].map(match => match[1]!);
  assert.equal(new Set(controls).size, 2); controls.forEach(control => assert.ok(markup.includes(`id="${control}"`)));
  const replacement = renderToStaticMarkup(React.createElement(Component, { ...props, panel: "Consumer answer" }));
  assert.doesNotMatch(replacement, /Authored answer/); assert.equal(replacement.split("Consumer answer").length - 1, 2);
  for (const target of ["react-native", "swiftui", "compose"] as const) { const result = generateTargetPack(project, { target }, DIGEST); assert.equal(result.valid, false); assert.equal(result.pack, undefined); }
});

test("unchanged declaration counts cannot replace required value types, event payloads or slot ownership", () => {
  const checkbox = fixture("catalog.checkbox");
  for (const mutate of [
    (document: Record<string, unknown>) => { const contract = document.publicContract as { values: { type: unknown }[] }; contract.values[0]!.type = { kind: "string" }; },
    (document: Record<string, unknown>) => { const contract = document.publicContract as { events: { payloadType: unknown }[] }; contract.events[0]!.payloadType = { kind: "record", fields: {}, required: [], additionalFields: "reject" }; },
    (document: Record<string, unknown>) => { const contract = document.publicContract as { events: { id: string }[]; values: { name: string; requestEventRef?: string }[] }; contract.values.find(value => value.name === "disabled")!.requestEventRef = contract.events[0]!.id; },
  ]) {
    const project = structuredClone(checkbox.plan.project), entry = project.documents[checkbox.component.id]!; mutate(entry.document); entry.currentText = canonicalJson(entry.document);
    assert.equal(generateTargetPack(project, { target: "react" }, DIGEST).valid, false);
  }
  const card = fixture("catalog.card"), project = structuredClone(card.plan.project), entry = project.documents[card.component.id]!;
  const slots = entry.document.slots as { ownerPartRef: string }[], parts = entry.document.parts as { id: string; studioRole: string }[];
  slots[0]!.ownerPartRef = parts.find(part => part.studioRole === "root")!.id; entry.currentText = canonicalJson(entry.document);
  const result = generateTargetPack(project, { target: "react" }, DIGEST); assert.equal(result.valid, false); assert.equal(result.pack, undefined);
});
