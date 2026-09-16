import test from "node:test";
import assert from "node:assert/strict";
import { createStudioStarter } from "../src/studio-template.ts";
import { inspectFoundationDocument } from "../src/foundation-validation.ts";
import { applyFoundationStarter, FOUNDATION_STARTER_DOMAINS, inferFoundationStarterRole } from "../src/foundation-starters.ts";
import { FOUNDATION_STARTER_TEMPLATES } from "../src/foundation-starter-presets.ts";
import { FOUNDATION_AUTHORING_PROFILE, getFoundationRole, getFoundationRoles, getFoundationRoleDefaultValue, getFoundationReadiness, inferFoundationRole } from "../src/foundation-roles.ts";
import type { FoundationDocument, FoundationToken } from "../src/foundation-contracts.ts";
import type { JsonObject, JsonValue } from "../src/contracts.ts";

function fixture(template: typeof FOUNDATION_STARTER_TEMPLATES[number]["id"] = "essentials"): FoundationDocument {
  const document = createStudioStarter("project.roles").find(item => item.kind === "foundation") as FoundationDocument;
  document.tokens = []; document.domains = []; document.tiers = []; document.themeAxes = []; document.themeSets = []; document.resolutionOrder = [];
  let sequence = 0;
  applyFoundationStarter(document, { domains: ["color"], template }, () => `role.fixture.${++sequence}`);
  document.authoringProfile = { ...FOUNDATION_AUTHORING_PROFILE };
  return document;
}
function tokenFor(document: FoundationDocument, role: string): FoundationToken {
  const token = document.tokens.find(token => token.role === role && "literal" in token.value);
  assert.ok(token, role); return token;
}
function valid(document: FoundationDocument): void {
  const report = inspectFoundationDocument(document); assert.equal(report.valid, true, JSON.stringify(report.diagnostics));
}
function rejectsValue(role: string, value: JsonValue, match: RegExp): void {
  const document = fixture(), token = tokenFor(document, role); token.value = { literal: value };
  const report = inspectFoundationDocument(document);
  assert.equal(report.valid, false); assert.ok(report.diagnostics.some(item => match.test(item.message)), JSON.stringify(report.diagnostics));
}

test("all six starter templates include required domains and roles despite a partial old-client selection", () => {
  for (const template of FOUNDATION_STARTER_TEMPLATES) {
    const document = fixture(template.id);
    assert.deepEqual(new Set(document.domains.map(domain => (domain as JsonObject).bindingCategory)), new Set(FOUNDATION_STARTER_DOMAINS.map(domain => domain.id)));
    assert.deepEqual(new Set(document.tiers.map(tier => (tier as JsonObject).role)), new Set(["primitive", "semantic", "component"]));
    const readiness = getFoundationReadiness(document); assert.equal(readiness.ready, true, `${template.id}: ${JSON.stringify(readiness.issues)}`);
    valid(document);
    for (const token of document.tokens) {
      assert.ok(getFoundationRole(token.role!));
      if (token.typeRef.id === "dimension" && "literal" in token.value) assert.equal((token.value.literal as JsonObject).unit, token.role === "border.width" ? "px" : "rem");
    }
    const typography = tokenFor(document, "typography.style").value as { literal: JsonObject };
    assert.equal((typography.literal.fontSize as JsonObject).unit, "rem");
    const shadow = tokenFor(document, "shadow.elevation").value as { literal: JsonObject };
    assert.equal((shadow.literal.blur as JsonObject).unit, "rem");
  }
});

test("legacy source validity is independent of Axiom readiness and explicit profile adoption", () => {
  const legacy = createStudioStarter("project.legacy").find(item => item.kind === "foundation") as FoundationDocument;
  valid(legacy); assert.equal(getFoundationReadiness(legacy).ready, false);
  const adopted = structuredClone(legacy); adopted.authoringProfile = { ...FOUNDATION_AUTHORING_PROFILE };
  const report = inspectFoundationDocument(adopted);
  assert.equal(report.valid, false); assert.ok(report.diagnostics.some(item => item.path === "/domains"));
  const baseline = fixture(); delete tokenFor(baseline, "opacity.level").role;
  assert.equal(inspectFoundationDocument(baseline).valid, false);
});

test("role ranges reject impossible opacity, fractional layer, invalid lengths and negative durations", () => {
  rejectsValue("opacity.level", 3, /at most 1/);
  rejectsValue("layer.order", 1.5, /integer/);
  rejectsValue("typography.size", { value: 0, unit: "rem" }, /greater than 0/);
  rejectsValue("spacing.length", { value: -1, unit: "rem" }, /at least 0/);
  rejectsValue("radius.corner", { value: -1, unit: "px" }, /at least 0/);
  rejectsValue("border.width", { value: -1, unit: "px" }, /at least 0/);
  rejectsValue("motion.duration", { value: -1, unit: "ms" }, /at least 0/);
  rejectsValue("motion.reduced", { value: 1, unit: "s" }, /at most 0/);
});

test("negative tracking and shadow offsets remain meaningful while blur and text size are constrained", () => {
  const document = fixture();
  tokenFor(document, "typography.tracking").value = { literal: { value: -0.03, unit: "rem" } };
  const shadow = tokenFor(document, "shadow.elevation").value as { literal: JsonObject };
  shadow.literal.offsetX = { value: -1, unit: "rem" }; shadow.literal.offsetY = { value: -1, unit: "px" }; shadow.literal.spread = { value: -0.5, unit: "rem" };
  valid(document);
  shadow.literal.blur = { value: -1, unit: "rem" };
  assert.equal(inspectFoundationDocument(document).valid, false);
  const typography = getFoundationRoleDefaultValue("typography.style") as JsonObject;
  typography.fontSize = { value: 0, unit: "rem" };
  rejectsValue("typography.style", typography, /greater than 0/);
});

test("domain and role identity controls references even when raw DTCG types and display names match", () => {
  const document = fixture(), radius = tokenFor(document, "radius.corner"), spacing = tokenFor(document, "spacing.length");
  radius.name = "space.same-looking-name"; radius.value = { ref: { id: spacing.id, expectedKind: "token" } };
  assert.equal(inspectFoundationDocument(document).valid, false);
  delete document.authoringProfile;
  valid(document);
  const baseline = fixture(), tracking = tokenFor(baseline, "typography.tracking");
  tracking.name = "radius.component"; tracking.value = { literal: { value: -0.01, unit: "rem" } };
  valid(baseline);
});

test("composite references permit declared cross-domain fields and reject raw scalar expression bypasses", () => {
  const document = fixture(), border = tokenFor(document, "border.stroke"), color = tokenFor(document, "color.palette"), width = tokenFor(document, "border.width");
  border.value = { composite: { color: { ref: { id: color.id, expectedKind: "token" } }, width: { ref: { id: width.id, expectedKind: "token" } }, style: "solid" } };
  valid(document);
  const size = tokenFor(document, "typography.size"), style = tokenFor(document, "typography.style");
  size.value = { ref: { id: style.id, expectedKind: "token", path: "/fontSize" } };
  valid(document);
  const layer = tokenFor(document, "layer.order"); layer.value = { literal: -1 };
  size.value = { composite: { value: { ref: { id: layer.id, expectedKind: "token" } }, unit: "rem" } };
  const report = inspectFoundationDocument(document);
  assert.equal(report.valid, false); assert.ok(report.diagnostics.some(item => /raw scalar fields/.test(item.message)), JSON.stringify(report.diagnostics));
});

test("all theme overrides and reusable value groups retain role range checks", () => {
  const document = fixture(), opacity = tokenFor(document, "opacity.level"), axis = document.themeAxes[0]!;
  axis.overrides ??= {}; axis.overrides.dark ??= {}; axis.overrides.dark[opacity.id] = { literal: 2 };
  assert.equal(inspectFoundationDocument(document).valid, false);
  delete axis.overrides.dark[opacity.id];
  document.valueSets = [{ id: "group.audit", name: "Not selected yet", values: { [opacity.id]: { literal: 2 } } }];
  const report = inspectFoundationDocument(document);
  assert.equal(report.valid, false); assert.ok(report.diagnostics.some(item => item.path?.startsWith("/valueSets/0/values/")));
  document.valueSets[0]!.values[opacity.id] = { literal: 0.5 }; valid(document);
});

test("role suggestions do not infer authority from names or expose mutable validation tables", () => {
  assert.equal(inferFoundationRole({ typeRef: { id: "dimension" } }, "typography"), undefined);
  assert.equal(inferFoundationRole({ typeRef: { id: "number" } }, "opacity")?.id, "opacity.level");
  assert.equal(inferFoundationRole({ typeRef: { id: "number" }, role: "layer.order" }, "opacity"), undefined);
  const detached = getFoundationRoles("opacity"); detached[0]!.maximum = 99; detached[0]!.references.push("layer.order");
  const defaultValue = getFoundationRoleDefaultValue("typography.style") as JsonObject; (defaultValue.fontSize as JsonObject).value = -1;
  assert.equal(getFoundationRole("opacity.level")!.maximum, 1);
  assert.equal(((getFoundationRoleDefaultValue("typography.style") as JsonObject).fontSize as JsonObject).value, 1);
  rejectsValue("opacity.level", 3, /at most 1/);
});

test("starter reapplication preserves existing records and only retained pinned provenance suggests migration roles", () => {
  const document = fixture("radix"), before = structuredClone(document); let sequence = 0;
  applyFoundationStarter(document, { domains: ["color"], template: "radix", accent: "#ffffff" }, () => `unused.${++sequence}`);
  assert.deepEqual(document, before); assert.equal(sequence, 0);
  const token = structuredClone(tokenFor(document, "typography.tracking")); delete token.role;
  assert.equal(inferFoundationStarterRole(token)?.id, "typography.tracking");
  const retained = structuredClone(tokenFor(document, "typography.size")); delete retained.role;
  retained.metadata!.version = "1.0.0"; retained.metadata!.templateVersion = "1.0.0";
  assert.equal(inferFoundationStarterRole(retained)?.id, "typography.size");
  token.metadata!.version = "1.0.0"; token.metadata!.templateVersion = "1.0.0";
  assert.equal(inferFoundationStarterRole(token), undefined, "New role additions cannot masquerade as retained starter tokens");
  delete token.metadata; assert.equal(inferFoundationStarterRole(token), undefined);
});

test("a raw domain cannot permit another purpose by broadening allowedTypes", () => {
  const document = fixture(); const opacity = document.domains.find(domain => (domain as JsonObject).bindingCategory === "opacity") as JsonObject;
  opacity.name = "Custom colors"; opacity.allowedTypes = ["number", "color"];
  const report = inspectFoundationDocument(document);
  assert.equal(report.valid, false); assert.ok(report.diagnostics.some(item => item.path?.endsWith("/allowedTypes")));
});
