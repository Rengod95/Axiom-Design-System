import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, createStudioStarter, inspectStudioProject, planStudioComponentCreate, STUDIO_PROFILE } from "../src/index.ts";
import type { FoundationDocument, FoundationToken, JsonObject, JsonValue, ProjectSnapshot } from "../src/index.ts";
import { applyDtcgImport } from "../src/foundation-import-authoring.ts";

const px = (value: number): JsonObject => ({ value, unit: "px" });
const gray = (value: number): JsonObject => ({ colorSpace: "srgb", components: [value, value, value], alpha: 1 });
const literal = (id: string, name: string, type: FoundationToken["typeRef"]["id"], value: JsonValue, domain?: string): FoundationToken => ({ id, name, typeRef: { id: type }, value: { literal: value }, ...(domain ? { domain } : {}) });
const alias = (id: string, name: string, target: FoundationToken, domain?: string): FoundationToken => ({ ...literal(id, name, target.typeRef.id, null, domain), value: { ref: { id: target.id, expectedKind: "token" } } });
function foundation(): FoundationDocument {
  const document = createStudioStarter("project.defaults").find(document => document.kind === "foundation") as FoundationDocument;
  for (const field of ["tokens", "domains", "tiers", "themeAxes", "themeSets", "policies", "originalSources", "resolutionOrder"] as const) document[field] = [];
  return document;
}
function create(document: FoundationDocument) {
  let sequence = 0;
  const before = canonicalJson(document);
  const project: ProjectSnapshot = { id: "project.defaults", name: "Custom foundation", revision: "project.initial", documents: { [document.id]: { document, originalText: before, sourceUri: "memory:custom", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] } } };
  const original = canonicalJson(project);
  const plan = planStudioComponentCreate(project, { catalogId: "catalog.card", name: "Created card" }, () => `created.${++sequence}`);
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics.filter(item => item.severity === "error")));
  assert.equal(canonicalJson(project), original, "Creation only proposes new sources");
  assert.equal(canonicalJson(plan.project.documents[document.id]!.document), before, "Foundation IDs, values, themes and original sources are untouched");
  const designs = plan.changes.upserts.filter(item => item.document.kind === "design").map(item => item.document);
  const declarations = (designs[0]!.appearance as JsonObject[])[0]!.declarations as JsonObject;
  assert.deepEqual((designs[1]!.appearance as JsonObject[])[0]!.declarations, declarations, "Web and Mobile keep the same semantic references");
  return { plan, declarations };
}

test("compatible canonical defaults retain priority even after display names change", () => {
  const document = createStudioStarter("project.defaults").find(document => document.kind === "foundation") as FoundationDocument;
  for (const token of document.tokens) token.name = `Renamed ${token.id}`;
  document.tokens.push(literal("custom.content", "text.primary", "color", gray(.3)));
  const { declarations } = create(document);
  for (const [property, id] of Object.entries({ color: "content", background: "surface", borderColor: "border", borderRadius: "radius", fontSize: "fontSize" })) assert.deepEqual(declarations[property], { tokenRef: `token.${id}` });
});

test("authored semantic tokens with independent IDs retain live aliases and theme overrides", () => {
  const document = foundation();
  document.domains = ["color", "radius", "typography"].map((category, index) => ({ id: `domain.${index}`, name: `User group ${index}`, bindingCategory: category }));
  document.tiers = [{ id: "tier.roles", name: "Semantic" }];
  const ink = literal("swatch.a", "palette.ink", "color", gray(.1), "domain.0"), paper = literal("swatch.b", "palette.paper", "color", gray(.9), "domain.0");
  const radius = literal("measure.a", "curve.medium", "dimension", px(11), "domain.1"), size = literal("measure.b", "body.measure", "dimension", px(17), "domain.2");
  const tokens = [alias("role.a", "colors.text.primary", ink, "domain.0"), alias("role.b", "surface.raised", paper, "domain.0"), alias("role.c", "border.default", ink, "domain.0"), alias("role.d", "radius.control", radius, "domain.1"), { ...literal("role.e", "font.size.body", "dimension", px(17), "domain.2"), tier: "tier.roles" }];
  document.tokens = [ink, paper, radius, size, ...tokens];
  document.themeAxes = [{ id: "axis.mode", contexts: ["light", "dark"], default: "light", scope: { id: document.id, expectedKind: "foundation" }, overrides: { dark: { "role.a": { ref: { id: paper.id, expectedKind: "token" } }, "role.b": { ref: { id: ink.id, expectedKind: "token" } } } } }];
  document.resolutionOrder = ["axis.mode"];
  document.themeSets = ["light", "dark"].map(context => ({ id: `theme.${context}`, contexts: { "axis.mode": context }, resolutionProfile: { id: "axiom.resolver.explicit-order", expectedKind: "resolutionProfile", version: "1.0.0" } }));
  const { plan, declarations } = create(document);
  for (const [index, property] of ["color", "background", "borderColor", "borderRadius", "fontSize"].entries()) assert.deepEqual(declarations[property], { tokenRef: tokens[index]!.id });
  const light = inspectStudioProject(plan.project, { themeSetId: "theme.light" }), dark = inspectStudioProject(plan.project, { themeSetId: "theme.dark" });
  assert.equal(light.valid && dark.valid, true);
  const root = light.components[0]!.parts[0]!.id;
  assert.notEqual(light.components[0]!.web.parts[root]!.base.color, dark.components[0]!.web.parts[root]!.base.color);
});

test("prefixed DTCG imports use compatible semantic intent without requiring ADS classifications", () => {
  const document = foundation(); let sequence = 0;
  const text = JSON.stringify({ palette: { ink: { $type: "color", $value: gray(.15) } }, semantic: { color: { foreground: { $type: "color", $value: "{palette.ink}" } } }, radius: { control: { $type: "dimension", $value: px(6) } }, font: { size: { body: { $type: "dimension", $value: px(15) } } } });
  applyDtcgImport(document, { kind: "dtcg-import", sourceName: "External system", sourceText: text, prefix: "imported.system", conflicts: "reject" }, () => `imported.${++sequence}`, text => createHash("sha256").update(text).digest("hex"));
  assert.equal(document.domains.length, 0);
  const { declarations } = create(document);
  for (const [property, name] of Object.entries({ color: "semantic.color.foreground", borderRadius: "radius.control", fontSize: "font.size.body" })) assert.deepEqual(declarations[property], { tokenRef: document.tokens.find(token => token.name === `imported.system.${name}`)!.id });
  assert.equal((document.originalSources[0] as JsonObject).originalText, text);
});

test("automatic baseline binding rejects misleading canonical IDs and incompatible declared domains", () => {
  const document = foundation();
  document.domains = [{ id: "d.spacing", name: "Radius-looking name", bindingCategory: "spacing" }, { id: "d.radius", name: "Custom curves", bindingCategory: "radius" }];
  const space = literal("space.8", "space.8", "dimension", px(32), "d.spacing");
  document.tokens = [space, alias("token.radius", "radius.default", space, "d.spacing"), literal("token.fontSize", "not.a.font", "color", gray(.2)), alias("curve.role", "radius.control", space, "d.radius"), literal("body.size", "font.size.body", "dimension", px(18))];
  const { declarations } = create(document);
  assert.deepEqual(declarations.borderRadius, { tokenRef: "curve.role" }, "The exposed alias domain is authoritative, not its primitive target's domain");
  assert.deepEqual(declarations.fontSize, { tokenRef: "body.size" });
});

test("semantic aliases beat lower-level literal intents and equally ranked choices remain unbound", () => {
  const document = foundation(), ink = literal("p.ink", "palette.ink", "color", gray(.2));
  document.tokens = [ink, literal("literal.text", "text.primary", "color", gray(.1)), alias("semantic.text", "foreground", ink)];
  assert.deepEqual(create(document).declarations.color, { tokenRef: "semantic.text" });
  document.tokens.push(alias("semantic.other", "colors.foreground", ink));
  assert.deepEqual(create(document).declarations.color, gray(.1), "Neither token order nor a lexicographic ID resolves an ambiguous default");
  document.tokens.reverse();
  assert.deepEqual(create(document).declarations.color, gray(.1));
});

test("unrenderable lengths, zero text size, deprecated tokens and arbitrary names keep valid literal defaults", () => {
  const document = foundation();
  document.tokens = [literal("token.fontSize", "font.size.body", "dimension", px(0)), literal("token.radius", "radius.control", "dimension", { value: 300, unit: "rem" }), { ...literal("token.content", "text.primary", "color", gray(.3)), deprecated: "Replace this token" }, literal("unrelated", "danger.text.primary", "color", gray(.5))];
  const { declarations } = create(document);
  assert.deepEqual(declarations.fontSize, px(14)); assert.deepEqual(declarations.borderRadius, px(8)); assert.deepEqual(declarations.color, gray(.1));
});

test("a default candidate must stay renderable in every named theme", () => {
  const document = foundation();
  document.tokens = [literal("token.radius", "radius.control", "dimension", px(10)), literal("compatible", "radius.default", "dimension", px(7))];
  document.themeAxes = [{ id: "axis.density", contexts: ["normal", "relative"], default: "normal", scope: { id: document.id, expectedKind: "foundation" }, overrides: { relative: { "token.radius": { literal: { value: 300, unit: "rem" } } } } }];
  document.resolutionOrder = ["axis.density"];
  document.themeSets = [{ id: "theme.relative", contexts: { "axis.density": "relative" }, resolutionProfile: { id: "axiom.resolver.explicit-order", expectedKind: "resolutionProfile", version: "1.0.0" } }];
  assert.deepEqual(create(document).declarations.borderRadius, { tokenRef: "compatible" });
});

test("rem baseline tokens remain live in generated components and named themes", () => {
  const document = foundation();
  document.tokens = [literal("token.radius", "radius.control", "dimension", { value: .5, unit: "rem" }), literal("token.fontSize", "font.size.body", "dimension", { value: 1, unit: "rem" })];
  document.themeAxes = [{ id: "axis.density", contexts: ["normal", "large"], default: "normal", scope: { id: document.id, expectedKind: "foundation" }, overrides: { large: { "token.radius": { literal: { value: .75, unit: "rem" } } } } }];
  document.resolutionOrder = ["axis.density"];
  document.themeSets = [{ id: "theme.large", contexts: { "axis.density": "large" }, resolutionProfile: { id: "axiom.resolver.explicit-order", expectedKind: "resolutionProfile", version: "1.0.0" } }];
  const { declarations } = create(document);
  assert.deepEqual(declarations.borderRadius, { tokenRef: "token.radius" });
  assert.deepEqual(declarations.fontSize, { tokenRef: "token.fontSize" });
});

test("an empty Foundation can create a component without required token names or a minimum count", () => {
  const document = foundation(), { plan, declarations } = create(document);
  assert.equal(Object.keys(plan.project.documents).length, 4);
  assert.deepEqual(declarations.color, gray(.1)); assert.deepEqual(declarations.background, gray(1));
  assert.deepEqual(declarations.fontSize, px(14)); assert.deepEqual(declarations.borderRadius, px(8));
});
