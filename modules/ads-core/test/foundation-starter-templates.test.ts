import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, createStudioStarter, FOUNDATION_STARTER_DOMAINS, FOUNDATION_STARTER_TEMPLATES, foundationStarterTokens, inspectStudioProject, planFoundationEdit, resolveFoundationTokens, STUDIO_PROFILE } from "../src/index.ts";
import type { FoundationDocument, FoundationStarterOptions, FoundationStarterToken, JsonObject, ProjectSnapshot } from "../src/index.ts";

const DOMAINS = FOUNDATION_STARTER_DOMAINS.map(domain => domain.id);
const OPTIONS = { domains: DOMAINS, accent: "#8dfc52", fontFamily: "Geist", density: "comfortable" as const };
function fixture(options?: FoundationStarterOptions): ProjectSnapshot {
  const documents = createStudioStarter("project.templates", options);
  return { id: "project.templates", name: "Templates", revision: "initial", documents: Object.fromEntries(documents.map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:templates", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
}
function resolve(tokens: FoundationStarterToken[], name: string, dark = false): FoundationStarterToken {
  const byName = new Map(tokens.map(token => [token.name, token])); let token = byName.get(name)!;
  const seen = new Set<string>();
  while (token.alias) { assert.ok(!seen.has(token.name), `Cycle at ${token.name}`); seen.add(token.name); token = byName.get(dark && token.darkAlias ? token.darkAlias : token.alias)!; assert.ok(token); }
  return token;
}

test("five additional documented architectures have independent scales, roles and source provenance", () => {
  assert.equal(FOUNDATION_STARTER_TEMPLATES.length, 6);
  const signatures = new Set<string>();
  for (const template of FOUNDATION_STARTER_TEMPLATES) {
    const tokens = foundationStarterTokens({ ...OPTIONS, template: template.id });
    assert.equal(new Set(tokens.map(token => token.name)).size, tokens.length);
    assert.equal(new Set(tokens.map(token => token.type)).size, 13);
    signatures.add(canonicalJson(tokens.filter(token => token.domain === "spacing" || token.domain === "radius" || token.domain === "typography").map(token => ({ name: token.name.replace(`${template.id}.`, ""), literal: token.literal ?? null }))));
    if (template.id !== "essentials") {
      const project = fixture({ ...OPTIONS, template: template.id }), foundation = project.documents["foundation.system"]!.document as FoundationDocument;
      assert.ok(foundation.tokens.some(token => token.metadata?.template === template.id && token.metadata.reference === template.source && token.metadata.adaptation === "axiom-authored"));
      assert.ok(tokens.some(token => token.tier === "primitive" && token.name.startsWith(`${template.id}.`)));
    }
  }
  assert.equal(signatures.size, 6, "Templates differ beyond their labels and seed colors");
  assert.deepEqual(foundationStarterTokens(OPTIONS), foundationStarterTokens({ ...OPTIONS, template: "essentials" }), "Omitted template preserves the established Essentials blueprint");
});

test("every template preserves the mandatory baseline when older clients select one domain", () => {
  for (const template of FOUNDATION_STARTER_TEMPLATES) {
    const baseline = foundationStarterTokens({ ...OPTIONS, template: template.id });
    for (const domain of FOUNDATION_STARTER_DOMAINS) {
      const tokens = foundationStarterTokens({ ...OPTIONS, template: template.id, domains: [domain.id] });
      assert.deepEqual(tokens, baseline, `${template.id}/${domain.id} cannot remove mandatory domains`);
    }
    assert.deepEqual(new Set(baseline.map(token => token.domain)), new Set(DOMAINS));
    for (const token of baseline) for (const dark of [false, true]) { const value = resolve(baseline, token.name, dark); assert.equal(value.type, token.type); assert.notEqual(value.literal, undefined); }
    const project = fixture({ ...OPTIONS, template: template.id, domains: ["color"] });
    for (const themeSetId of ["theme.light", "theme.dark"]) { const report = inspectStudioProject(project, { themeSetId }); assert.equal(report.valid, true, `${template.id}: ${JSON.stringify(report.diagnostics)}`); }
  }
});

test("new projects bind common semantic adapters through each architecture in both themes", () => {
  for (const template of FOUNDATION_STARTER_TEMPLATES) {
    const project = fixture({ ...OPTIONS, template: template.id });
    for (const themeSetId of ["theme.light", "theme.dark"]) {
      const report = inspectStudioProject(project, { themeSetId }); assert.equal(report.valid, true, JSON.stringify(report.diagnostics));
      const action = report.foundation.tokens.find(token => token.id === "token.action")!;
      assert.ok(action.aliasChain.length >= (template.id === "essentials" ? 2 : 3));
      const actual = report.foundation.tokens.find(token => token.name === "action.primary.background")!;
      assert.deepEqual(action.value, actual.value);
      const foreground = report.foundation.tokens.find(token => token.name === "action.primary.foreground")!.value as JsonObject;
      const luminance = (color: JsonObject) => (color.components as number[]).reduce((sum, channel, i) => sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][i]!, 0);
      const first = luminance(actual.value as JsonObject), second = luminance(foreground);
      assert.ok((Math.max(first, second) + .05) / (Math.min(first, second) + .05) >= 4.5, `${template.id} fluorescent foreground/${themeSetId}`);
    }
  }
});

test("adding and reapplying different templates preserves authored tokens, IDs, overrides and source", () => {
  let project = fixture(OPTIONS), sequence = 0; const allocate = () => `template.${++sequence}`;
  for (const template of FOUNDATION_STARTER_TEMPLATES.slice(1)) {
    const original = canonicalJson(project), foundation = project.documents["foundation.system"]!.document as FoundationDocument, beforeTokens = canonicalJson(foundation.tokens), beforeAxes = canonicalJson(foundation.themeAxes);
    const applied = planFoundationEdit(project, { kind: "template-apply", ...OPTIONS, template: template.id }, allocate);
    assert.equal(applied.valid, true, JSON.stringify(applied.diagnostics));
    assert.equal(canonicalJson(project), original);
    const next = applied.project.documents["foundation.system"]!.document as FoundationDocument;
    assert.equal(canonicalJson(next.tokens.slice(0, foundation.tokens.length)), beforeTokens);
    const oldTokenIds = new Set(foundation.tokens.map(token => token.id));
    const oldGroupIds = new Set((foundation.valueSets ?? []).map(group => group.id));
    const newTokenGroups = new Set((next.valueSets ?? []).filter(group => !oldGroupIds.has(group.id) && Object.keys(group.values).every(id => !oldTokenIds.has(id))).map(group => group.id));
    assert.equal(canonicalJson((next.valueSets ?? []).filter(group => oldGroupIds.has(group.id))), canonicalJson(foundation.valueSets ?? []), "existing reusable groups are not overwritten");
    const priorAxes = structuredClone(next.themeAxes);
    // Newly added template tokens may select their own inherited groups; original selections remain.
    for (const axis of priorAxes) for (const [context, ids] of Object.entries(axis.valueSetIds ?? {})) axis.valueSetIds![context] = ids.filter(id => !newTokenGroups.has(id));
    for (const axis of priorAxes) for (const overrides of Object.values(axis.overrides ?? {})) for (const id of Object.keys(overrides)) if (!oldTokenIds.has(id)) delete overrides[id];
    for (const axis of priorAxes) {
      const prior = foundation.themeAxes.find(item => item.id === axis.id);
      if (axis.overrides) for (const [context, values] of Object.entries(axis.overrides)) if (!Object.keys(values).length && prior?.overrides?.[context] === undefined) delete axis.overrides[context];
      if (axis.overrides && !Object.keys(axis.overrides).length && prior?.overrides === undefined) delete axis.overrides;
    }
    assert.equal(canonicalJson(priorAxes), beforeAxes);
    for (const theme of foundation.themeSets) {
      const before = resolveFoundationTokens(foundation, { themeSetId: theme.id }), after = resolveFoundationTokens(next, { themeSetId: theme.id });
      assert.equal(after.valid, true, JSON.stringify(after.diagnostics));
      for (const token of before.tokens) assert.deepEqual(after.tokens.find(item => item.id === token.id)?.value, token.value, `${template.id}/${theme.id}/${token.name}`);
    }
    const again = planFoundationEdit(applied.project, { kind: "template-apply", ...OPTIONS, template: template.id, accent: "#000000", density: "compact" }, allocate);
    assert.equal(again.valid, true, JSON.stringify(again.diagnostics));
    assert.equal(canonicalJson(again.project.documents["foundation.system"]!.document), canonicalJson(next));
    project = applied.project;
  }
});

test("template boundary rejects unknown IDs and namespace type collisions atomically", () => {
  let sequence = 0; const allocate = () => `template.invalid.${++sequence}`, project = fixture();
  assert.throws(() => foundationStarterTokens({ ...OPTIONS, template: "unknown" as never }), /known starter template/);
  assert.throws(() => foundationStarterTokens({ ...OPTIONS, domains: [] }));
  const invalid = planFoundationEdit(project, { kind: "template-apply", ...OPTIONS, template: "unknown" as never }, allocate);
  assert.equal(invalid.valid, false); assert.deepEqual(invalid.project, project);
  const collision = planFoundationEdit(project, { kind: "token-create", name: "radix.color.neutral.light.1", type: "number", value: { literal: 3 } }, allocate);
  const rejected = planFoundationEdit(collision.project, { kind: "template-apply", ...OPTIONS, template: "radix" }, allocate);
  assert.equal(rejected.valid, false); assert.deepEqual(rejected.updates, []); assert.deepEqual(rejected.project, collision.project);
});

test("role mappings retain architecture differences rather than copying one palette under five names", () => {
  const radix = foundationStarterTokens({ ...OPTIONS, template: "radix" }), carbon = foundationStarterTokens({ ...OPTIONS, template: "carbon" }), material = foundationStarterTokens({ ...OPTIONS, template: "material" }), fluent = foundationStarterTokens({ ...OPTIONS, template: "fluent" }), spectrum = foundationStarterTokens({ ...OPTIONS, template: "spectrum" });
  assert.equal(radix.filter(token => token.name.startsWith("radix.color.neutral.light.")).length, 12);
  assert.deepEqual(resolve(carbon, "carbon.role.layer.01").literal, resolve(carbon, "carbon.role.layer.03").literal);
  assert.notDeepEqual(resolve(carbon, "carbon.role.layer.01", true).literal, resolve(carbon, "carbon.role.layer.03", true).literal);
  assert.ok(material.find(token => token.name === "material.sys.color.primary")!.alias!.endsWith(".40"));
  assert.ok(material.find(token => token.name === "material.sys.color.primary")!.darkAlias!.endsWith(".80"));
  assert.deepEqual(resolve(fluent, "radius.control").literal, { value: .25, unit: "rem" });
  assert.equal(spectrum.find(token => token.name === "spectrum.alias.accent.background.default")!.alias, "spectrum.accent.default");
});
