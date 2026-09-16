import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, createStudioStarter, inspectFoundationDocument, inspectStudioProject, planFoundationEdit, planStudioEdit, resolveStudioDimension, studioLengthCss, studioLengthPixels } from "../src/index.ts";
import { resolveExtendedStudioStyle } from "../src/studio-style-values.ts";
import type { FoundationDocument, JsonObject, ProjectSnapshot } from "../src/index.ts";

function fixture(): ProjectSnapshot {
  return { id: "project.lengths", name: "Lengths", revision: "initial", documents: Object.fromEntries(createStudioStarter("project.lengths").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:lengths", validation: "envelope-only", validationProfile: "foundation-studio", diagnostics: [] }])) };
}

test("a used spacing token accepts rem through reviewed planning without rewriting px sources", () => {
  const project = fixture(), before = canonicalJson(project);
  const foundation = project.documents["foundation.system"]!.document as FoundationDocument;
  const spacing = foundation.tokens.find(token => token.name === "spacing.component")!;
  assert.ok(spacing);
  const planned = planFoundationEdit(project, { kind: "token-literal", id: spacing.id, value: { value: 1, unit: "rem" } }, () => "revision.rem");
  assert.equal(planned.valid, true, canonicalJson(planned.diagnostics));
  assert.equal(inspectFoundationDocument(planned.project.documents["foundation.system"]!.document).valid, true);
  const projection = inspectStudioProject(planned.project);
  assert.equal(projection.valid, true, canonicalJson(projection.diagnostics));
  assert.equal(projection.components.find(component => component.archetype === "button")!.web.layout["component.button.root"]!.gap, "1rem");
  assert.equal(canonicalJson(project), before);
  assert.deepEqual((planned.project.documents["foundation.system"]!.document as FoundationDocument).tokens.find(token => token.id === spacing.id)!.value, { literal: { value: 1, unit: "rem" } });
});

test("primitive and composite paint preserve rem including negative tracking and shadow offsets", () => {
  assert.equal(resolveStudioDimension({ value: 12, unit: "px" }), 12);
  assert.equal(resolveStudioDimension({ value: .75, unit: "rem" }), "0.75rem");
  const color = { colorSpace: "srgb", components: [0, 0, 0], alpha: .25 };
  const typography = resolveExtendedStudioStyle("typography", { fontFamily: "Geist", fontWeight: 500, fontSize: { value: 1.25, unit: "rem" }, letterSpacing: { value: -.025, unit: "rem" }, lineHeight: 1.5 });
  assert.equal(typography.fontSize, "1.25rem"); assert.equal(typography.letterSpacing, "-0.025rem"); assert.equal(typography.lineHeight, 1.5);
  assert.deepEqual(resolveExtendedStudioStyle("border", { width: { value: .0625, unit: "rem" }, color, style: "solid" }), { borderWidth: "0.0625rem", borderColor: "rgba(0, 0, 0, 0.25)", borderStyle: "solid" });
  assert.equal(resolveExtendedStudioStyle("boxShadow", { color, offsetX: { value: -.25, unit: "rem" }, offsetY: { value: 2, unit: "px" }, blur: { value: .5, unit: "rem" }, spread: { value: -1, unit: "px" } }).boxShadow, "-0.25rem 2px 0.5rem -1px rgba(0, 0, 0, 0.25)");
  assert.equal(studioLengthCss("1.25rem"), "1.25rem"); assert.equal(studioLengthPixels("1.25rem", 20), 25);
});

test("unit-aware projection retains bounds, positive text and minimum action size", () => {
  for (const bad of [{ value: 1, unit: "em" }, { value: -1, unit: "rem" }, { value: 257, unit: "rem" }, { value: 1, unit: "rem", extra: true }]) assert.throws(() => resolveStudioDimension(bad));
  assert.throws(() => studioLengthPixels("1rem", 0));
  assert.throws(() => studioLengthCss("calc(1rem)" as never));
  const project = fixture();
  const zero = planStudioEdit(project, { kind: "appearance", id: "component.button", category: "Web", partId: "component.button.root", property: "fontSize", value: { value: 0, unit: "rem" } }, () => "revision.zero");
  assert.equal(zero.valid, false); assert.ok(zero.diagnostics.some(item => item.message.includes("positive size")));
  const document = structuredClone(project.documents["design.button.web"]!.document);
  (document.layout as JsonObject[])[0]!.minHeight = { value: 2, unit: "rem" };
  const short = planStudioEdit(project, { kind: "source", id: document.id, source: canonicalJson(document) }, () => "revision.short");
  assert.equal(short.valid, false); assert.ok(short.diagnostics.some(item => item.path === "/layout/0/minHeight"));
});
