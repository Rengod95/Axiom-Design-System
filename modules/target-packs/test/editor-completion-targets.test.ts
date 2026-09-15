import test from "node:test";
import assert from "node:assert/strict";
import { transform } from "esbuild";
import vm from "node:vm";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { canonicalJson, planStudioComponentCreate, planStudioComponentEdit } from "../../ads-core/src/index.ts";
import type { JsonObject } from "../../ads-core/src/index.ts";
import { generateTargetPack } from "../src/index.ts";
import { DIGEST, projectFixture } from "./target-fixture.ts";

test("React realizes nested custom layout, escaped part text and typed effects; unmapped native output rejects", async () => {
  let count = 0; const id = () => `custom.target.${++count}`;
  const created = planStudioComponentCreate(projectFixture(), { catalogId: "catalog.box" }, id), component = created.changes.upserts.find(item => item.document.kind === "component")!.document;
  const root = String((component.parts as JsonObject[])[0]!.id);
  const part = planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "part-add", parentId: root, name: "Caption", role: "caption" } }, id), parts = part.project.documents[component.id]!.document.parts as JsonObject[];
  const caption = String(parts.find(part => part.studioRole === "caption")!.id), body = String(parts.find(part => part.studioRole === "body")!.id);
  const edited = planStudioComponentEdit(part.project, { componentId: component.id, edit: [
    { kind: "part-parent", partId: caption, parentId: body }, { kind: "part-text", partId: caption, text: "<caption>" },
    { kind: "appearance-rule", category: "Web", partId: root, condition: "base", property: "typography", value: { fontFamily: ["SUIT", "sans-serif"], fontSize: { value: 24, unit: "px" }, fontWeight: 600, letterSpacing: { value: .5, unit: "px" }, lineHeight: 1.5 } },
    { kind: "appearance-rule", category: "Web", partId: root, condition: "base", property: "transition", value: { duration: { value: 200, unit: "ms" }, delay: { value: 50, unit: "ms" }, timingFunction: [.2, 0, 0, 1] } },
    { kind: "appearance-rule", category: "Web", partId: root, condition: "outlined", property: "opacity", value: .8 },
  ] }, id); assert.equal(edited.valid, true, canonicalJson(edited.diagnostics));
  const generated = generateTargetPack(edited.project, { target: "react" }, DIGEST); assert.equal(generated.valid, true, canonicalJson(generated.diagnostics));
  const pack = generated.pack!, css = pack.files.find(file => file.path.endsWith(".css"))!.text;
  assert.match(css, /transition-delay:50ms/); assert.match(css, /font-weight:600/); assert.match(css, /line-height:1.5/); assert.doesNotMatch(css, /font-weight:600px/);
  const transformed = await transform(pack.files.find(file => file.path === "src/index.tsx")!.text, { loader: "tsx", format: "cjs", jsx: "automatic" });
  const module = { exports: {} as Record<string, unknown> };
  vm.runInNewContext(transformed.code, { module, exports: module.exports, require: (name: string) => name === "react" ? React : name === "react/jsx-runtime" ? jsxRuntime : {} });
  const Component = module.exports[pack.manifest.publicApiMap[component.id]!] as React.ComponentType<Record<string, unknown>>;
  const markup = renderToStaticMarkup(React.createElement(Component, { body: "Body" }));
  assert.match(markup, /&lt;caption&gt;/); assert.ok(markup.indexOf(`data-part="${body}"`) < markup.indexOf(`data-part="${caption}"`));
  for (const target of ["react-native", "swiftui", "compose"] as const) { const rejected = generateTargetPack(edited.project, { target }, DIGEST); assert.equal(rejected.valid, false); assert.equal(rejected.pack, undefined); }
});
