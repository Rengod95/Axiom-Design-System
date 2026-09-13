import test from "node:test";
import assert from "node:assert/strict";
import type { JsonObject } from "../src/contracts.ts";
import { resolveFoundationTokens } from "../src/foundation-resolution.ts";
import { inspectFoundationDocument } from "../src/foundation-validation.ts";
import { foundation, profile, ref, themed, token } from "./foundation-fixtures.ts";

test("completes theme selection and merges explicit axis order before aliases", () => {
  const document = themed(); const before = JSON.stringify(document);
  assert.equal(resolveFoundationTokens(document).tokens[1]!.value, 2);
  assert.equal(resolveFoundationTokens(document, { themeSetId: "theme.dark" }).tokens[1]!.value, 3);
  const result = resolveFoundationTokens(document, { themeSetId: "theme.dark", contexts: { "axis.density": "compact" } });
  assert.equal(result.valid, true); assert.equal(result.tokens[1]!.value, 4);
  assert.deepEqual(result.tokens[1]!.aliasChain, ["token.base"]);
  assert.equal(result.tokens[1]!.overrideTrace.length, 2);
  assert.equal(result.tokens[1]!.sourcePath, "/themeAxes/1/overrides/compact/token.base");
  assert.equal(JSON.stringify(document), before);
  document.resolutionOrder = ["axis.density", "axis.scheme"];
  assert.equal(resolveFoundationTokens(document, { contexts: { "axis.density": "compact" } }).tokens[1]!.value, 2);
});

test("renaming keeps aliases on stable identity and returned values detach from input", () => {
  const document = foundation([token("token.base", "fontFamily", ["Inter"]), { ...token("token.alias", "fontFamily"), value: ref("token.base") }]);
  (document.tokens as JsonObject[])[0]!.name = "Renamed";
  const result = resolveFoundationTokens(document);
  assert.equal(result.valid, true); assert.equal(result.tokens[1]!.aliasChain[0], "token.base");
  (result.tokens[0]!.value as string[]).push("changed");
  assert.equal(JSON.stringify(((document.tokens as JsonObject[])[0]!.value as JsonObject).literal), '["Inter"]');
});

test("rejects missing, mismatched, duplicate and cyclic token identities", () => {
  const cases = [foundation([{ ...token(), value: ref("token.missing") }]), foundation([token("token.color", "color", { colorSpace: "srgb", components: [0, 0, 0] }), { ...token(), value: ref("token.color") }]), foundation([token(), token()]), foundation([{ ...token("token.a"), value: ref("token.b") }, { ...token("token.b"), value: ref("token.a") }])];
  for (const document of cases) { const report = resolveFoundationTokens(document); assert.equal(report.valid, false); assert.deepEqual(report.tokens, []); }
});

test("validates all named themes and checks arbitrary runtime combinations without enumerating products", () => {
  const document = foundation([token("token.a"), token("token.b")]);
  document.themeAxes = [
    { id: "axis.a", contexts: ["off", "on"], default: "off", scope: { id: document.id!, expectedKind: "foundation" }, overrides: { on: { "token.a": ref("token.b") } } },
    { id: "axis.b", contexts: ["off", "on"], default: "off", scope: { id: document.id!, expectedKind: "foundation" }, overrides: { on: { "token.b": ref("token.a") } } },
  ]; document.resolutionOrder = ["axis.a", "axis.b"];
  assert.equal(inspectFoundationDocument(document).valid, true);
  assert.equal(resolveFoundationTokens(document, { contexts: { "axis.a": "on", "axis.b": "on" } }).valid, false);
  document.themeSets = [{ id: "theme.cycle", contexts: { "axis.a": "on", "axis.b": "on" }, resolutionProfile: profile }];
  assert.equal(inspectFoundationDocument(document).valid, false);
});

test("rejects malformed axis scope, profile pins, order and incomplete or unknown selections", () => {
  const mutations: ((document: JsonObject) => void)[] = [
    document => { document.resolutionOrder = ["axis.scheme", "axis.scheme"]; },
    document => { (document.themeAxes as JsonObject[])[0]!.scope = { id: "other", expectedKind: "foundation" }; },
    document => { (document.themeAxes as JsonObject[])[0]!.contexts = []; },
    document => { (document.themeAxes as JsonObject[])[0]!.default = "unknown"; },
    document => { (document.themeSets as JsonObject[])[0]!.contexts = { "axis.scheme": "dark" }; },
    document => { (document.themeSets as JsonObject[])[0]!.resolutionProfile = { ...profile, version: "2.0.0" }; },
    document => { (document.themeAxes as JsonObject[])[0]!.overrides = { dark: { missing: { literal: 1 } } }; },
  ];
  for (const mutate of mutations) { const document = themed(); mutate(document); assert.equal(inspectFoundationDocument(document).valid, false); }
  for (const selection of [{ themeSetId: "missing" }, { contexts: { missing: "light" } }, { contexts: { "axis.scheme": "missing" } }]) assert.equal(resolveFoundationTokens(themed(), selection).valid, false);
  const document = themed(); delete (document.themeAxes as JsonObject[])[0]!.default;
  assert.equal(inspectFoundationDocument(document).valid, true);
  assert.equal(resolveFoundationTokens(document).valid, false);
  assert.equal(resolveFoundationTokens(document, { themeSetId: "theme.dark" }).valid, true);
});

test("selection accessors are not invoked and execution work exhaustion clears partial results", () => {
  let called = false;
  const selection = Object.defineProperty({}, "contexts", { get() { called = true; return {}; }, enumerable: true });
  assert.equal(resolveFoundationTokens(themed(), selection).valid, false); assert.equal(called, false);
  const tokens = Array.from({ length: 600 }, (_, index) => index === 0 ? token(`token.${index}`) : { ...token(`token.${index}`), value: ref(`token.${index - 1}`) });
  const result = resolveFoundationTokens(foundation(tokens));
  assert.equal(result.valid, false); assert.deepEqual(result.tokens, []);
  assert.ok(result.diagnostics.some(item => item.code === "JSON_LIMIT"));
});
