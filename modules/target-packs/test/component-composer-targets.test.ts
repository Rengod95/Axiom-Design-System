import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { transform } from "esbuild";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { canonicalJson, planStudioComponentCreate, planStudioComponentEdit } from "../../ads-core/src/index.ts";
import type { JsonObject } from "../../ads-core/src/index.ts";
import { generateTargetPack } from "../src/index.ts";
import type { TargetPack } from "../src/index.ts";
import { DIGEST, projectFixture } from "./target-fixture.ts";

async function render(pack: TargetPack, componentId: string): Promise<string> {
  const source = pack.files.find(file => file.path === "src/index.tsx")!;
  const transformed = await transform(source.text, { loader: "tsx", format: "cjs", jsx: "automatic" });
  const module = { exports: {} as Record<string, unknown> };
  vm.runInNewContext(transformed.code, { module, exports: module.exports, require: (name: string) => name === "react" ? React : name === "react/jsx-runtime" ? jsxRuntime : {} });
  const Component = module.exports[pack.manifest.publicApiMap[componentId]!] as React.ComponentType<Record<string, unknown>>;
  return renderToStaticMarkup(React.createElement(Component, { body: React.createElement("em", null, "Consumer content") }));
}

test("React renders authored article, heading, paragraph and nested text tags with escaped content", async () => {
  let counter = 0; const id = () => `composer.target.${++counter}`;
  const created = planStudioComponentCreate(projectFixture(), { catalogId: "catalog.box", name: "Editorial article", structure: "article" }, id);
  assert.equal(created.valid, true, canonicalJson(created.diagnostics));
  const definition = created.changes.upserts.find(item => item.document.kind === "component")!.document;
  const parts = definition.parts as JsonObject[], heading = String(parts.find(part => part.studioRole === "heading")!.id), root = String(parts.find(part => part.parent === null)!.id);
  const edited = planStudioComponentEdit(created.project, { componentId: definition.id, edit: [
    { kind: "part-text", partId: heading, text: "<script>alert('text only')</script>" },
    { kind: "part-element", category: "Mobile", partId: root, element: "section" },
  ] }, id);
  assert.equal(edited.valid, true, canonicalJson(edited.diagnostics));
  const generated = generateTargetPack(edited.project, { target: "react" }, DIGEST);
  assert.equal(generated.valid, true, canonicalJson(generated.diagnostics));
  const markup = await render(generated.pack!, definition.id);
  assert.match(markup, /^<article\b/);
  assert.match(markup, /<h2\b[^>]*>&lt;script&gt;alert\(&#x27;text only&#x27;\)&lt;\/script&gt;<\/h2>/);
  assert.match(markup, /<p\b[^>]*>Add a short description for your component\.<\/p>/);
  assert.match(markup, /<div\b[^>]*><em>Consumer content<\/em><\/div>/);
  assert.ok(markup.indexOf("<h2") < markup.indexOf("<p") && markup.indexOf("<p") < markup.indexOf("<em"));
  assert.doesNotMatch(markup, /<script|<section/);
});

test("native generators explicitly reject authored HTML semantics instead of silently dropping element mappings", () => {
  let counter = 0; const id = () => `composer.native.${++counter}`;
  const created = planStudioComponentCreate(projectFixture(), { catalogId: "catalog.box", structure: "article" }, id);
  assert.equal(created.valid, true, canonicalJson(created.diagnostics));
  for (const target of ["react-native", "swiftui", "compose"] as const) {
    const generated = generateTargetPack(created.project, { target }, DIGEST);
    assert.equal(generated.valid, false, target);
    assert.equal(generated.pack, undefined, target);
    assert.ok(generated.diagnostics.some(item => item.message.includes("HTML element semantics")), canonicalJson(generated.diagnostics));
  }
});
