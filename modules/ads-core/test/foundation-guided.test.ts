import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, createStudioStarter, foundationThemeGroups, getFoundationReadiness, inspectFoundationAuthoring, inspectFoundationDocument, inspectStudioProject, resolveFoundationTokens } from "../src/index.ts";
import type { FoundationDocument } from "../src/index.ts";
import { authoringFixture, brief, source } from "./foundation-authoring-fixtures.ts";

test("whole-project migration preserves identities, source bytes, themed values and applies length conversion once", () => {
  const h = authoringFixture(true), before = canonicalJson(h.project), old = source(h.project);
  const plan = h.plan(h.project, { kind: "foundation-migrate" });
  assert.equal(plan.valid, true, brief(plan)); assert.equal(plan.updates.length, 7);
  const next = source(plan.project);
  assert.equal(getFoundationReadiness(next).ready, true);
  assert.equal(canonicalJson(h.project), before);
  assert.ok(next.tokens.length > old.tokens.length);
  for (const token of old.tokens) assert.equal(next.tokens.find(item => item.id === token.id)?.name, token.name);
  for (const [id, entry] of Object.entries(h.project.documents)) assert.equal(plan.project.documents[id]!.originalText, entry.originalText);
  for (const theme of old.themeSets) {
    const baseline = resolveFoundationTokens(old, { themeSetId: theme.id }), migrated = resolveFoundationTokens(next, { themeSetId: theme.id });
    assert.equal(migrated.valid, true, brief(migrated));
    for (const token of baseline.tokens) {
      const actual = migrated.tokens.find(item => item.id === token.id)!;
      if (token.type === "dimension") assert.equal(canonicalJson(actual.value), canonicalJson({ value: (token.value as { value: number }).value / 16, unit: "rem" }));
      else assert.deepEqual(actual.value, token.value);
    }
    assert.equal(inspectStudioProject(plan.project, { themeSetId: theme.id }).valid, true);
  }
  const repeated = h.plan(plan.project, { kind: "foundation-migrate" });
  assert.equal(repeated.valid, true, brief(repeated)); assert.deepEqual(repeated.updates, []); assert.deepEqual(repeated.createdIds, []);
});

test("ambiguous or invalid migration aborts every change and accepts an explicit role mapping", () => {
  const h = authoringFixture(true), document = source(h.project);
  document.tokens.push({ id: "custom.dimension", name: "arbitrary.measure", typeRef: { id: "dimension" }, value: { literal: { value: 12, unit: "px" } } });
  const before = canonicalJson(h.project), blocked = h.plan(h.project, { kind: "foundation-migrate" });
  assert.equal(blocked.valid, false); assert.match(brief(blocked), /custom.dimension/); assert.deepEqual(blocked.updates, []); assert.equal(canonicalJson(blocked.project), before);
  const migrated = h.plan(h.project, { kind: "foundation-migrate", roles: { "custom.dimension": "typography.tracking" } });
  assert.equal(migrated.valid, true, brief(migrated));
  assert.equal(source(migrated.project).tokens.find(token => token.id === "custom.dimension")?.role, "typography.tracking");
});

test("value groups connect existing identities, explicit domain replacement wins, and group names never become token paths", () => {
  const h = authoringFixture(true), migrated = h.plan(h.project, { kind: "foundation-migrate" });
  assert.equal(migrated.valid, true, brief(migrated));
  let project = migrated.project, document = source(project);
  const color = document.tokens.find(token => token.id === "token.surface")!.domain!;
  const groupPlan = h.plan(project, { kind: "value-set-create", name: "Reading scheme", domain: color });
  assert.equal(groupPlan.valid, true, brief(groupPlan)); const groupId = groupPlan.createdIds[0]!;
  const value = { colorSpace: "srgb", components: [0.8, 0.7, 0.6], alpha: 1 };
  const linked = h.plan(groupPlan.project, [{ kind: "value-set-value", id: groupId, tokenId: "token.surface", value: { literal: value } }, { kind: "theme-set-update", id: "theme.dark", valueSetIds: [groupId] }]);
  assert.equal(linked.valid, true, brief(linked)); project = linked.project; document = source(project);
  const result = resolveFoundationTokens(document, { themeSetId: "theme.dark" });
  assert.equal(result.valid, true, brief(result)); assert.equal(canonicalJson(result.tokens.find(token => token.id === "token.surface")!.value), canonicalJson(value));
  // Other Color values fall back to base, rather than leaking inherited Dark values.
  assert.deepEqual(result.tokens.find(token => token.id === "token.content")!.value, resolveFoundationTokens(document, { themeSetId: "theme.light" }).tokens.find(token => token.id === "token.content")!.value);
  assert.ok(result.tokens.find(token => token.id === "token.surface")!.overrideTrace.some(trace => trace.valueSetId === groupId));
  assert.deepEqual(foundationThemeGroups(document, document.themeSets.find(theme => theme.id === "theme.dark")!).map(group => group.id), [groupId]);
  const renamed = h.plan(project, { kind: "value-set-update", id: groupId, name: "Reading colors" });
  assert.equal(renamed.valid, true, brief(renamed)); assert.deepEqual(source(renamed.project).tokens.map(token => token.name), document.tokens.map(token => token.name));
  assert.equal(h.plan(project, { kind: "value-set-delete", id: groupId }).valid, false);
  assert.equal(h.plan(project, { kind: "value-set-value", id: groupId, tokenId: "token.gap", value: { literal: { value: 1, unit: "rem" } } }).valid, false);
  const duplicate = h.plan(project, { kind: "value-set-create", name: "Copy", copyFrom: groupId });
  assert.equal(duplicate.valid, true, brief(duplicate));
  assert.equal(h.plan(duplicate.project, { kind: "theme-set-update", id: "theme.dark", valueSetIds: [groupId, duplicate.createdIds[0]!] }).valid, false);
});

test("group aliases participate in cycle detection, dependency protection, replacement and duplication", () => {
  const h = authoringFixture(true), migrated = h.plan(h.project, { kind: "foundation-migrate" });
  assert.equal(migrated.valid, true, brief(migrated));
  const document = source(migrated.project), group = document.valueSets!.find(item => item.name.startsWith("dark"))!;
  const aliased = h.plan(migrated.project, { kind: "value-set-value", id: group.id, tokenId: "token.surface", value: { ref: { id: "token.content", expectedKind: "token" } } });
  assert.equal(aliased.valid, true, brief(aliased));
  const references = inspectFoundationAuthoring(aliased.project).tokens.find(token => token.id === "token.content")!.references;
  assert.ok(references.some(reference => reference.kind === "theme-alias" && reference.valueSetId === group.id));
  assert.equal(h.plan(aliased.project, { kind: "value-set-value", id: group.id, tokenId: "token.content", value: { ref: { id: "token.surface", expectedKind: "token" } } }).valid, false);
  assert.equal(h.plan(aliased.project, { kind: "token-delete", id: "token.content" }).valid, false);
  const duplicated = h.plan(aliased.project, { kind: "token-duplicate", id: "token.surface", name: "surface.duplicate" });
  assert.equal(duplicated.valid, true, brief(duplicated));
  assert.deepEqual(source(duplicated.project).valueSets!.find(item => item.id === group.id)!.values[duplicated.createdIds[0]!], group.values["token.surface"] === undefined ? undefined : source(aliased.project).valueSets!.find(item => item.id === group.id)!.values["token.surface"]);
});

test("all new starter templates are guided, grouped and expose Semantic readiness without requiring the axis product", () => {
  const document = createStudioStarter("guided.project", { domains: ["color"] })[0] as FoundationDocument;
  assert.equal(inspectFoundationDocument(document).valid, true); assert.equal(getFoundationReadiness(document).ready, true);
  assert.ok(document.valueSets?.length); assert.ok(document.themeAxes.every(axis => !axis.overrides));
  for (let i = 0; i < 9; i++) {
    const id = `axis.option.${i}`;
    document.themeAxes.push({ id, contexts: ["a", "b"], default: "a", scope: { id: document.id, expectedKind: "foundation" } });
    document.resolutionOrder.push(id); for (const theme of document.themeSets) theme.contexts[id] = "a";
  }
  assert.equal(inspectFoundationDocument(document).valid, true, brief(inspectFoundationDocument(document)));
});

test("large shallow token sets validate within the bounded Foundation budget", () => {
  const h = authoringFixture(), document = source(h.project);
  document.tokens = Array.from({ length: 5000 }, (_, i) => ({ id: `scale.${i}`, name: `scale.${i}`, typeRef: { id: "number" }, value: { literal: i } }));
  document.themeAxes = []; document.themeSets = []; document.resolutionOrder = [];
  assert.equal(inspectFoundationDocument(document).valid, true, brief(inspectFoundationDocument(document)));
  assert.equal(resolveFoundationTokens(document).tokens.length, 5000);
  document.tokens = Array.from({ length: 20000 }, (_, i) => ({ id: `scale.${i}`, name: `scale.${i}`, typeRef: { id: "number" }, value: { literal: i } }));
  const oversized = resolveFoundationTokens(document);
  assert.equal(oversized.valid, false, "The explicit document byte limit remains enforced");
  assert.equal(oversized.tokens.length, 0, "Limit failures never expose a partially resolved system");
  assert.ok(oversized.diagnostics.some(item => item.code === "JSON_LIMIT"));
});
