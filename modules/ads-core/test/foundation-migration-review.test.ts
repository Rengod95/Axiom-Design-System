import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, inspectFoundationDocument, resolveFoundationTokens } from "../src/index.ts";
import type { FoundationDocument, JsonValue } from "../src/index.ts";
import { authoringFixture, brief, source } from "./foundation-authoring-fixtures.ts";

const physical = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) return value.map(physical);
  if (!value || typeof value !== "object") return value;
  if (typeof value.value === "number" && (value.unit === "px" || value.unit === "rem")) return { value: value.value * (value.unit === "rem" ? 16 : 1), unit: "px" };
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, physical(child)]));
};

test("migration rejects an unknown explicit role instead of silently inferring another choice", () => {
  const h = authoringFixture(true), before = canonicalJson(h.project);
  const result = h.plan(h.project, { kind: "foundation-migrate", roles: { "token.gap": "unknown.role" } });
  assert.equal(result.valid, false); assert.match(brief(result), /Unknown explicit role/);
  assert.deepEqual(result.updates, []); assert.deepEqual(result.createdIds, []);
  assert.equal(canonicalJson(result.project), before); assert.equal(canonicalJson(h.project), before);
});

test("migration never replaces an explicitly incompatible alias role with an inferred target role", () => {
  for (const mapping of [false, true]) {
    const h = authoringFixture(true), document = source(h.project);
    document.tokens.push({ id: "token.gap.alias", name: "custom.gap", typeRef: { id: "dimension" }, value: { ref: { id: "token.gap", expectedKind: "token" } }, ...(!mapping ? { role: "color.palette" } : {}) });
    const before = canonicalJson(h.project);
    const result = h.plan(h.project, { kind: "foundation-migrate", ...(mapping ? { roles: { "token.gap.alias": "color.palette" } } : {}) });
    assert.equal(result.valid, false); assert.match(brief(result), /Explicit role color.palette is incompatible/);
    assert.deepEqual(result.updates, []); assert.deepEqual(result.createdIds, []);
    assert.equal(canonicalJson(result.project), before); assert.equal(canonicalJson(h.project), before);
  }
});

test("migration preserves interleaved groups and overrides for named themes and custom context selections", () => {
  for (const explicit of [false, true]) {
    const h = authoringFixture(true), document = source(h.project), domain = "domain.existing.colors";
    document.domains.push({ id: domain, name: "Existing Colors", bindingCategory: "color", allowedTypes: ["color"] });
    for (const token of document.tokens) if (token.typeRef.id === "color") token.domain = domain;
    const color = (gray: number) => ({ literal: { colorSpace: "srgb", components: [gray, gray, gray], alpha: 1 } });
    document.valueSets = [
      { id: "group.earlier", name: "Earlier scoped", domain, values: { "token.surface": color(.3) } },
      { id: "group.middle", name: "Middle unscoped", values: { "token.surface": color(.5) } },
      { id: "group.later", name: "Later unscoped", values: { "token.surface": color(1) } },
      { id: "group.explicit", name: "Partial explicit", domain, values: { "token.accent": color(.7) } },
    ];
    const firstAxis = document.themeAxes[0]!;
    firstAxis.valueSetIds = Object.fromEntries(firstAxis.contexts.map(context => [context, ["group.earlier", "group.middle"]]));
    const lastAxis = "axis.later";
    document.themeAxes.push({ id: lastAxis, contexts: ["off", "on"], default: "off", scope: { id: document.id, expectedKind: "foundation" }, valueSetIds: { on: ["group.later"] } });
    document.resolutionOrder.push(lastAxis);
    for (const theme of document.themeSets) { theme.contexts[lastAxis] = "on"; if (explicit) theme.valueSetIds = ["group.explicit"]; }
    assert.equal(inspectFoundationDocument(document).valid, true, brief(inspectFoundationDocument(document)));
    const before = canonicalJson(h.project), originals = canonicalJson(document.valueSets);
    const result = h.plan(h.project, { kind: "foundation-migrate" });
    assert.equal(result.valid, true, brief(result));
    const next = source(result.project);
    for (const themeSetId of [undefined, ...document.themeSets.map(theme => theme.id)]) {
      for (const first of firstAxis.contexts) for (const last of ["off", "on"]) {
        const selection = { ...(themeSetId ? { themeSetId } : {}), contexts: { [firstAxis.id]: first, [lastAxis]: last } };
        const baseline = resolveFoundationTokens(document, selection), migrated = resolveFoundationTokens(next, selection);
        assert.equal(baseline.valid, true, brief(baseline)); assert.equal(migrated.valid, true, brief(migrated));
        for (const token of baseline.tokens) assert.deepEqual(physical(migrated.tokens.find(item => item.id === token.id)!.value), physical(token.value), `${explicit}/${themeSetId}/${first}/${last}: ${token.id}`);
      }
    }
    assert.equal(canonicalJson(next.valueSets!.slice(0, document.valueSets.length)), originals, "existing reusable groups remain unchanged");
    assert.equal(canonicalJson(h.project), before);
    assert.ok(next.themeAxes.every(axis => !axis.overrides));
    assert.deepEqual(h.plan(result.project, { kind: "foundation-migrate" }).updates, []);
  }
});

test("migration preserves typed property aliases and partial explicit theme groups over legacy overrides", () => {
  const h = authoringFixture(true), document = source(h.project);
  document.domains.push({ id: "domain.existing.colors", name: "Existing Colors", bindingCategory: "color", allowedTypes: ["color"] });
  for (const token of document.tokens) if (token.typeRef.id === "color") token.domain = "domain.existing.colors";
  document.tokens.push(
    { id: "token.custom.type", name: "custom.type", typeRef: { id: "typography" }, value: { literal: { fontFamily: "Geist", fontSize: { value: 32, unit: "px" }, fontWeight: 500, letterSpacing: { value: -0.5, unit: "px" }, lineHeight: 1.25 } } },
    { id: "token.custom.size", name: "custom.size", typeRef: { id: "dimension" }, value: { ref: { id: "token.custom.type", expectedKind: "token", path: "/fontSize" } } },
  );
  document.valueSets = [{ id: "group.explicit", name: "Explicit brand", domain: "domain.existing.colors", values: { "token.accent": { literal: { colorSpace: "srgb", components: [.1, .2, .3], alpha: 1 } } } }];
  for (const theme of document.themeSets) theme.valueSetIds = ["group.explicit"];
  assert.equal(inspectFoundationDocument(document).valid, true);
  const before = canonicalJson(h.project), originalGroup = canonicalJson(document.valueSets[0]);
  const result = h.plan(h.project, { kind: "foundation-migrate", roles: { "token.custom.type": "typography.style", "token.custom.size": "typography.size" } });
  assert.equal(result.valid, true, brief(result));
  const next = source(result.project);
  for (const theme of document.themeSets) {
    const baseline = resolveFoundationTokens(document, { themeSetId: theme.id });
    const migrated = resolveFoundationTokens(next, { themeSetId: theme.id });
    assert.equal(migrated.valid, true, brief(migrated));
    for (const token of baseline.tokens) assert.deepEqual(physical(migrated.tokens.find(item => item.id === token.id)!.value), physical(token.value), `${theme.id}: ${token.id}`);
  }
  assert.equal(canonicalJson(next.valueSets!.find(group => group.id === "group.explicit")), originalGroup, "shared original group remains reusable");
  assert.equal(canonicalJson(h.project), before);
  for (const [id, entry] of Object.entries(h.project.documents)) assert.equal(result.project.documents[id]!.originalText, entry.originalText);
});

test("disconnected groups cannot store a cycle and the rejected batch is atomic", () => {
  const h = authoringFixture(true), migrated = h.plan(h.project, { kind: "foundation-migrate" });
  assert.equal(migrated.valid, true, brief(migrated));
  const document = source(migrated.project);
  const created = h.plan(migrated.project, { kind: "value-set-create", name: "Disconnected", domain: document.tokens.find(token => token.id === "token.surface")!.domain! });
  const before = canonicalJson(created.project), groupId = created.createdIds[0]!;
  const result = h.plan(created.project, [
    { kind: "value-set-value", id: groupId, tokenId: "token.surface", value: { ref: { id: "token.content", expectedKind: "token" } } },
    { kind: "value-set-value", id: groupId, tokenId: "token.content", value: { ref: { id: "token.surface", expectedKind: "token" } } },
  ]);
  assert.equal(result.valid, false); assert.ok(result.diagnostics.some(item => item.code === "FOUNDATION_ALIAS_CYCLE"));
  assert.deepEqual(result.updates, []); assert.equal(canonicalJson(result.project), before);
});

test("guided arbitrary context combinations reject conflicts without publishing partial token results", () => {
  const h = authoringFixture(true), migrated = h.plan(h.project, { kind: "foundation-migrate" });
  assert.equal(migrated.valid, true, brief(migrated));
  const document: FoundationDocument = structuredClone(source(migrated.project));
  document.valueSets!.push(
    { id: "group.a", name: "A", values: { "token.surface": { ref: { id: "token.content", expectedKind: "token" } } } },
    { id: "group.b", name: "B", values: { "token.content": { ref: { id: "token.surface", expectedKind: "token" } } } },
  );
  for (const suffix of ["a", "b"]) {
    const id = `axis.${suffix}`;
    document.themeAxes.push({ id, contexts: ["off", "on"], default: "off", scope: { id: document.id, expectedKind: "foundation" }, valueSetIds: { on: [`group.${suffix}`] } });
    document.resolutionOrder.push(id); for (const theme of document.themeSets) theme.contexts[id] = "off";
  }
  assert.equal(inspectFoundationDocument(document).valid, true, brief(inspectFoundationDocument(document)));
  const result = resolveFoundationTokens(document, { contexts: { "axis.a": "on", "axis.b": "on" } });
  assert.equal(result.valid, false); assert.deepEqual(result.tokens, []);
  assert.ok(result.diagnostics.some(item => item.code === "FOUNDATION_ALIAS_CYCLE"));
});
