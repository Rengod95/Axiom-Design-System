import test from "node:test";
import assert from "node:assert/strict";
import type { JsonObject, JsonValue } from "../src/contracts.ts";
import { inspectFoundationDocument } from "../src/foundation-validation.ts";
import { resolveFoundationTokens } from "../src/foundation-resolution.ts";
import { FOUNDATION_COLOR_SPACES, FOUNDATION_TOKEN_TYPES } from "../src/foundation-constants.ts";
import { color, foundation, token, values } from "./foundation-fixtures.ts";

test("inspects all thirteen concrete DTCG types without normalizing source values", () => {
  const document = foundation(FOUNDATION_TOKEN_TYPES.map(type => token(`token.${type}`, type, values[type])));
  assert.equal(inspectFoundationDocument(document).valid, true);
  const result = resolveFoundationTokens(document);
  assert.equal(result.valid, true);
  assert.equal(result.tokens.length, 13);
  for (const item of result.tokens) assert.equal(JSON.stringify(item.value), JSON.stringify(values[item.type]));
  assert.equal((document.tokens as JsonObject[]).length, 13);
});

test("rejects independently chosen malformed values for every type", () => {
  const invalid: Record<string, JsonValue> = { color: "#ffffff", dimension: { value: 0 }, fontFamily: ["Inter", 4], fontWeight: "Bold", duration: { value: 20, unit: "seconds" }, cubicBezier: [0, 1, 2, 1], number: "2", strokeStyle: { dashArray: [], lineCap: "flat" }, border: { color, width: 2, style: "solid" }, transition: { duration: { value: 1, unit: "ms" }, timingFunction: [0, 0, 1, 1] }, shadow: [{ color, offsetX: 0 }], gradient: [{ color, position: "1" }], typography: { fontFamily: "Inter" } };
  for (const type of FOUNDATION_TOKEN_TYPES) {
    const report = inspectFoundationDocument(foundation([token("token.bad", type, invalid[type]!)]));
    assert.equal(report.valid, false, type);
    assert.ok(report.diagnostics.some(item => item.severity === "error"), type);
  }
});

test("validates all fourteen color spaces, none and declared boundaries", () => {
  for (const space of FOUNDATION_COLOR_SPACES) {
    assert.equal(inspectFoundationDocument(foundation([token("token.color", "color", { colorSpace: space, components: [0.5, 0.5, 0.5], alpha: 0, hex: "#ABCDEF" })])).valid, true, space);
    assert.equal(inspectFoundationDocument(foundation([token("token.color", "color", { colorSpace: space, components: ["none", "none", "none"] })])).valid, true, space);
  }
  for (const value of [{ colorSpace: "hsl", components: [360, 0, 0] }, { colorSpace: "srgb", components: [1.01, 0, 0] }, { colorSpace: "oklch", components: [0.5, -1, 30] }, { ...color, alpha: "none" }, { ...color, hex: "#ffffff00" }, { ...color, components: [0, 0] }]) assert.equal(inspectFoundationDocument(foundation([token("token.color", "color", value)])).valid, false);
  assert.equal(inspectFoundationDocument(foundation([token("token.color", "color", { colorSpace: "lab", components: [100, -10000, 10000] })])).valid, true);
});

test("preserves negative durations and gradient clamping semantics without inventing constraints", () => {
  const document = foundation([token("token.time", "duration", { value: -1, unit: "s" }), token("token.gradient", "gradient", [{ color, position: 42 }])]);
  const report = resolveFoundationTokens(document);
  assert.equal(report.valid, true);
  assert.ok(report.diagnostics.some(item => item.message.includes("clamps")));
  assert.equal((report.tokens[1]!.value as JsonObject[])[0]!.position, 42);
});

test("rejects extra composite fields and nested aliases explicitly", () => {
  assert.equal(inspectFoundationDocument(foundation([token("token.border", "border", { ...(values.border as JsonObject), unexpected: true })])).valid, false);
  const report = inspectFoundationDocument(foundation([token("token.border", "border", { ...(values.border as JsonObject), color: "{colors.primary}" })]));
  assert.equal(report.valid, false);
  assert.ok(report.diagnostics.some(item => item.code === "FOUNDATION_UNSUPPORTED"));
  assert.equal(inspectFoundationDocument(foundation([token("token.dimension", "dimension", { $ref: "#/size/$value" })])).valid, false);
});

test("requires every Foundation list and does not turn diagnostic truncation into success", () => {
  for (const key of ["tokens", "domains", "tiers", "themeAxes", "themeSets", "policies", "originalSources", "resolutionOrder"]) {
    const document = foundation(); delete document[key];
    assert.equal(inspectFoundationDocument(document).valid, false, key);
  }
  const document = foundation(Array.from({ length: 300 }, (_, index) => token(`token.${index}`, "number", "bad")));
  const result = resolveFoundationTokens(document);
  assert.equal(result.valid, false); assert.deepEqual(result.tokens, []);
  assert.equal(result.diagnostics.length, 128);
  assert.equal(result.diagnostics.at(-1)!.code, "FOUNDATION_LIMIT");
});

test("snapshots descriptors without getters or Proxy get and bounds hostile shared graphs", () => {
  let calls = 0;
  const document = foundation();
  const wrapped = new Proxy(document, { get() { calls++; throw new Error("get"); } });
  assert.equal(inspectFoundationDocument(wrapped).valid, true); assert.equal(calls, 0);
  Object.defineProperty(document, "tokens", { get() { calls++; return []; }, enumerable: true });
  assert.equal(inspectFoundationDocument(document).valid, false); assert.equal(calls, 0);
  const custom: unknown[] = []; Object.setPrototypeOf(custom, { toJSON() { calls++; return []; } });
  assert.equal(inspectFoundationDocument({ ...foundation(), tokens: custom }).valid, false); assert.equal(calls, 0);
  let graph: JsonValue = "x"; for (let index = 0; index < 25; index++) graph = [graph, graph];
  const bounded = inspectFoundationDocument({ ...foundation(), extensions: { graph } });
  assert.equal(bounded.valid, false); assert.ok(bounded.diagnostics.some(item => item.code === "JSON_LIMIT"));
  assert.equal(inspectFoundationDocument({ ...foundation(), extensions: { big: "x".repeat(1_048_577) } }).valid, false);
});
