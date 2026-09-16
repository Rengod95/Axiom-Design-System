import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, planStudioComponentCreate, planStudioEdit } from "../../ads-core/src/index.ts";
import type { FoundationDocument, JsonObject } from "../../ads-core/src/index.ts";
import { generateTargetPack } from "../src/index.ts";
import { DIGEST, projectFixture } from "./target-fixture.ts";

function remFixture() {
  const project = projectFixture(), foundation = project.documents["foundation.system"]!.document as FoundationDocument;
  foundation.tokens.find(token => token.name === "spacing.component")!.value = { literal: { value: 1, unit: "rem" } };
  for (const category of ["web", "mobile"]) {
    const root = (project.documents[`design.button.${category}`]!.document.appearance as JsonObject[])[0]!.declarations as JsonObject;
    root.fontSize = { value: 1.25, unit: "rem" }; root.borderRadius = { value: .5, unit: "rem" };
  }
  return project;
}

test("Web emits rem verbatim and native exports declare their independent length and text conversion", () => {
  const project = remFixture(), original = canonicalJson(project);
  const web = generateTargetPack(project, { target: "react" }, DIGEST);
  assert.equal(web.valid, true, canonicalJson(web.diagnostics));
  const css = web.pack!.files.find(file => file.path.endsWith(".css"))!.text;
  assert.match(css, /gap:1rem/); assert.match(css, /font-size:1.25rem/); assert.match(css, /border-radius:0.5rem/); assert.doesNotMatch(css, /rempx/);
  assert.match(web.pack!.manifest.conversionPolicy.dimension, /consumer root/);
  for (const target of ["react-native", "swiftui", "compose"] as const) {
    const output = generateTargetPack(project, { target, nativeRootFontSize: 20 }, DIGEST);
    assert.equal(output.valid, true, canonicalJson(output.diagnostics));
    assert.match(output.pack!.manifest.conversionPolicy.dimension, /20 logical px/);
    const runtime = output.pack!.files.filter(file => [".tsx", ".swift", ".kt"].some(extension => file.path.endsWith(extension))).map(file => file.text).join("\n");
    assert.match(runtime, target === "react-native" ? /"fontSize":25/ : target === "swiftui" ? /fontSize = 25/ : /fontSize = 25f/);
    const tokens = output.pack!.files.find(file => file.path.endsWith("tokens.json"))!;
    assert.match(tokens.text, /"unit":"rem"/);
  }
  assert.equal(canonicalJson(project), original);
});

test("native conversion validates its root basis and refuses unmapped composite typography", () => {
  const project = remFixture();
  for (const root of [0, -1, 257]) assert.equal(generateTargetPack(project, { target: "compose", nativeRootFontSize: root }, DIGEST).valid, false);
  assert.equal(generateTargetPack(project, { target: "react", nativeRootFontSize: 16 }, DIGEST).valid, false);
  const declarations = (project.documents["design.card.mobile"]!.document.appearance as JsonObject[])[0]!.declarations as JsonObject;
  declarations.typography = { fontFamily: "Geist", fontWeight: 400, fontSize: { value: 1, unit: "rem" }, letterSpacing: { value: 0, unit: "rem" }, lineHeight: 1.5 };
  const result = generateTargetPack(project, { target: "react-native" }, DIGEST);
  assert.equal(result.valid, false); assert.equal(result.pack, undefined); assert.ok(result.diagnostics.some(item => item.message.includes("native mapping")));
});

test("a native root conversion cannot shrink the Button minimum interactive target", () => {
  const project = remFixture();
  (project.documents["design.button.mobile"]!.document.layout as JsonObject[])[0]!.minHeight = { value: 2.75, unit: "rem" };
  const result = generateTargetPack(project, { target: "react-native", nativeRootFontSize: 12 }, DIGEST);
  assert.equal(result.valid, false); assert.equal(result.pack, undefined);
  assert.ok(result.diagnostics.some(item => item.message.includes("below 44 logical units")));
});

test("table-specific React border spacing serializes rem and px through the same length contract", () => {
  let count = 0; const id = () => `table.length.${++count}`;
  const created = planStudioComponentCreate(projectFixture(), { catalogId: "catalog.datatable" }, id);
  assert.equal(created.valid, true, canonicalJson(created.diagnostics));
  const design = created.changes.upserts.find(update => update.document.kind === "design" && update.document.category === "Web")!.document;
  for (const unit of ["rem", "px"]) {
    const source = structuredClone(design);
    (source.layout as JsonObject[])[0]!.gap = { value: 1, unit };
    const planned = planStudioEdit(created.project, { kind: "source", id: source.id, source: canonicalJson(source) }, id);
    assert.equal(planned.valid, true, canonicalJson(planned.diagnostics));
    const output = generateTargetPack(planned.project, { target: "react" }, DIGEST);
    assert.equal(output.valid, true, canonicalJson(output.diagnostics));
    const css = output.pack!.files.find(file => file.path.endsWith(".css"))!.text;
    assert.ok(css.includes(`border-spacing:1${unit}`)); assert.doesNotMatch(css, /rempx/);
  }
});
