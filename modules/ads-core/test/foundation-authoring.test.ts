import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, inspectFoundationAuthoring, planFoundationEdit } from "../src/index.ts";
import type { FoundationAuthoringEdit, FoundationTokenType } from "../src/index.ts";
import { values } from "./foundation-fixtures.ts";
import { authoringFixture, brief, source, reviseFixture } from "./foundation-authoring-fixtures.ts";

test("creates all thirteen supported typed tokens in one source update without altering original input", () => {
  const h = authoringFixture(), before = canonicalJson(h.project);
  const edits: FoundationAuthoringEdit[] = Object.entries(values).map(([type, literal]) => ({ kind: "token-create", name: `new.${type}`, type: type as FoundationTokenType, value: { literal }, description: `A ${type} token` }));
  const plan = h.plan(h.project, edits);
  assert.equal(plan.valid, true, brief(plan)); assert.equal(plan.updates.length, 1); assert.equal(plan.createdIds.length, 13);
  assert.equal(canonicalJson(h.project), before);
  for (const [type, literal] of Object.entries(values)) assert.deepEqual(source(plan.project).tokens.find(token => token.name === `new.${type}`)!.value, { literal });
  assert.equal(plan.project.documents[source(plan.project).id]!.originalText, h.project.documents[source(h.project).id]!.originalText);
});

test("classification metadata is editable, searchable and separate from type capability", () => {
  const h = authoringFixture();
  let plan = h.plan(h.project, [{ kind: "classification-create", category: "domain", name: "Brand colors", description: "Identity and emphasis", allowedTypes: ["color"] }, { kind: "classification-create", category: "tier", name: "Semantic" }]);
  assert.equal(plan.valid, true, brief(plan)); const [domain, tier] = plan.createdIds;
  plan = h.plan(plan.project, { kind: "token-update", id: "token.accent", name: "brand.primary", description: "새 브랜드 색상", domain: domain!, tier: tier! });
  assert.equal(plan.valid, true, brief(plan));
  const query = inspectFoundationAuthoring(plan.project, {}, { query: "identity", type: "color", domain: domain! });
  assert.equal(query.matchingTokens, 0);
  const named = inspectFoundationAuthoring(plan.project, {}, { query: "Brand colors", tier: tier! });
  assert.equal(named.matchingTokens, 1); assert.equal(named.tokens[0]!.id, "token.accent"); assert.equal(named.domains[0]!.tokenCount, 1);
  const cleared = h.plan(plan.project, { kind: "token-update", id: "token.accent", description: null, domain: null, tier: null });
  assert.equal(cleared.valid, true, brief(cleared)); assert.equal(Object.hasOwn(source(cleared.project).tokens[0]!, "domain"), false);
  const bad = h.plan(plan.project, { kind: "token-update", id: "token.gap", domain: domain! });
  assert.equal(bad.valid, false); assert.deepEqual(bad.updates, []); assert.equal(canonicalJson(bad.project), canonicalJson(plan.project));
  assert.equal(h.plan(plan.project, { kind: "classification-delete", category: "domain", id: domain! }).valid, false);
  const replacement = h.plan(plan.project, { kind: "classification-create", category: "domain", name: "Color", allowedTypes: ["color"] });
  const deleted = h.plan(replacement.project, { kind: "classification-delete", category: "domain", id: domain!, replacementId: replacement.createdIds[0]! });
  assert.equal(deleted.valid, true, brief(deleted)); assert.equal(source(deleted.project).tokens[0]!.domain, replacement.createdIds[0]);
});

test("same-scope names, wrong values, unknown edits and unsafe generic paths reject the entire batch", () => {
  const h = authoringFixture();
  const bad: unknown[] = [
    { kind: "token-create", name: "brand.accent", type: "number", value: { literal: 2 } },
    { kind: "token-literal", id: "token.accent", value: "#abcdef" },
    { kind: "token-update", id: "token.accent", path: "/value", value: 3 },
    { kind: "token-update", id: "token.accent" },
    { kind: "classification-create", category: "tier", name: "Bad tier", allowedTypes: ["number"] },
    { kind: "token-create", name: "Undefined type", type: "custom", value: { literal: 1 } },
    { kind: "token-create", name: "Null description", type: "number", value: { literal: 1 }, description: null },
  ];
  for (const edit of bad) {
    const plan = h.plan(h.project, [{ kind: "token-update", id: "token.accent", description: "Must not leak" }, edit as FoundationAuthoringEdit]);
    assert.equal(plan.valid, false, JSON.stringify(edit)); assert.deepEqual(plan.updates, []); assert.deepEqual(plan.createdIds, []); assert.equal(canonicalJson(plan.project), canonicalJson(h.project));
  }
  assert.equal(h.plan(h.project, Array.from({ length: 129 }, () => ({ kind: "token-update", id: "token.accent", description: "Too many" }))).valid, false);
});

test("duplication creates a new identity, keeps outgoing aliases and all owned overrides without moving users", () => {
  const h = authoringFixture(true), document = source(h.project);
  document.tokens[0]!.extensions = { vendor: { ref: { id: "uninterpreted" } } }; reviseFixture(h.project, document);
  const original = canonicalJson(h.project);
  const duplicate = h.plan(h.project, { kind: "token-duplicate", id: "token.accent", name: "brand.secondary" });
  assert.equal(duplicate.valid, true, brief(duplicate)); const id = duplicate.createdIds[0]!;
  assert.deepEqual(source(duplicate.project).tokens.find(token => token.id === id)!.extensions, document.tokens[0]!.extensions);
  assert.deepEqual(source(duplicate.project).themeAxes[0]!.overrides!.dark![id], document.themeAxes[0]!.overrides!.dark!["token.accent"]);
  assert.equal(inspectFoundationAuthoring(duplicate.project).tokens.find(token => token.id === id)!.inUse, false);
  const aliasCopy = h.plan(duplicate.project, { kind: "token-duplicate", id: "token.action", name: "action.secondary" });
  assert.deepEqual(source(aliasCopy.project).tokens.find(token => token.id === aliasCopy.createdIds[0])!.value, { ref: { id: "token.accent", expectedKind: "token" } });
  assert.equal(canonicalJson(h.project), original);
});

test("known references protect deletion, while an explicit same-type replacement rewrites aliases and designs atomically", () => {
  const h = authoringFixture(true), before = canonicalJson(h.project);
  const rejected = h.plan(h.project, { kind: "token-delete", id: "token.accent" });
  assert.equal(rejected.valid, false); assert.deepEqual(rejected.updates, []);
  assert.equal(h.plan(h.project, { kind: "token-delete", id: "token.accent", replacementId: "token.gap" }).valid, false);
  const replacement = h.plan(h.project, { kind: "token-duplicate", id: "token.accent", name: "brand.replacement" });
  const deleted = h.plan(replacement.project, { kind: "token-delete", id: "token.accent", replacementId: replacement.createdIds[0]! });
  assert.equal(deleted.valid, true, brief(deleted)); assert.ok(deleted.updates.length > 1); assert.ok(deleted.impact.some(usage => usage.componentId === "component.button"));
  const query = inspectFoundationAuthoring(deleted.project);
  assert.equal(query.references.some(reference => reference.tokenId === "token.accent"), false);
  assert.equal(source(deleted.project).tokens.some(token => token.id === "token.accent"), false);
  assert.equal(canonicalJson(h.project), before);
});

test("renaming and changing alias sources preserve IDs, metadata, reverse-reference provenance and failure isolation", () => {
  const h = authoringFixture(true);
  const before = inspectFoundationAuthoring(h.project);
  assert.ok(before.tokens.find(token => token.id === "token.accent")!.dependentAliases.includes("token.action"));
  assert.ok(before.tokens.find(token => token.id === "token.accent")!.usages.length);
  const renamed = h.plan(h.project, { kind: "token-update", id: "token.accent", name: "brand.renamed" });
  assert.equal(renamed.valid, true, brief(renamed));
  assert.deepEqual(source(renamed.project).tokens.find(token => token.id === "token.action")!.value, { ref: { id: "token.accent", expectedKind: "token" } });
  const cycle = h.plan(renamed.project, { kind: "token-alias", id: "token.accent", targetId: "token.action" });
  assert.equal(cycle.valid, false); assert.deepEqual(cycle.updates, []);
  const detached = h.plan(renamed.project, { kind: "token-literal", id: "token.action", value: values.color });
  assert.equal(detached.valid, true, brief(detached)); assert.equal(inspectFoundationAuthoring(detached.project, {}, { aliasesOnly: true }).tokens.some(token => token.id === "token.action"), false);
});

test("public authoring boundaries do not execute getters, mutate proxies or accept colliding injected IDs", () => {
  const h = authoringFixture(); let calls = 0;
  const proxy = new Proxy(h.project, { get() { calls++; throw new Error("Do not read original properties"); } });
  assert.equal(planFoundationEdit(proxy, { kind: "token-update", id: "token.accent", description: "Safe" }, h.createId).valid, true);
  const getter = Object.defineProperty({ kind: "token-update", id: "token.accent" }, "description", { enumerable: true, get() { calls++; return "Unsafe"; } });
  assert.equal(h.plan(h.project, getter as FoundationAuthoringEdit).valid, false); assert.equal(calls, 0);
  assert.equal(planFoundationEdit(h.project, { kind: "token-duplicate", id: "token.accent", name: "copy" }, () => "token.accent").valid, false);
  const opaque = source(h.project); opaque.extensions = { fake: { tokenRef: "not-real", ref: { id: "token.accent", expectedKind: "token" } } }; reviseFixture(h.project, opaque);
  assert.equal(inspectFoundationAuthoring(h.project).references.some(reference => reference.path.startsWith("/extensions")), false);
});
