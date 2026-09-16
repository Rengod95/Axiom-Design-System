import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { canonicalJson } from "../src/canonical-json.ts";
import { exportSelectedFoundationDtcg, importDtcgFoundation } from "../src/foundation-interchange.ts";
import { resolveFoundationTokens } from "../src/foundation-resolution.ts";
import { createStudioStarter } from "../src/studio-template.ts";
import { MAX_DOCUMENT_BYTES } from "../src/constants.ts";
import type { FoundationDocument, FoundationSelection } from "../src/foundation-contracts.ts";
import { foundation, profile, ref, token } from "./foundation-fixtures.ts";

function reimport(text: string): FoundationDocument {
  let sequence = 0;
  const report = importDtcgFoundation(text, { id: "foundation.exported", name: "Exported", revision: "r1", sourceUri: "memory:exported", createId: () => `exported.${++sequence}`, digest: value => createHash("sha256").update(value).digest("hex") });
  assert.equal(report.valid, true, JSON.stringify(report.diagnostics));
  return report.document!;
}
function roundTrip(document: FoundationDocument, selection: FoundationSelection, mode: "references" | "resolved") {
  const expected = resolveFoundationTokens(document, selection);
  assert.equal(expected.valid, true, JSON.stringify(expected.diagnostics));
  const exported = exportSelectedFoundationDtcg(document, selection, mode);
  assert.equal(exported.valid, true, JSON.stringify(exported.diagnostics));
  const actual = resolveFoundationTokens(reimport(exported.text!));
  assert.equal(actual.valid, true, JSON.stringify(actual.diagnostics));
  const actualByName = new Map(actual.tokens.map(item => [item.name, item.value]));
  for (const item of expected.tokens) assert.deepEqual(actualByName.get(item.name), item.value, `${mode}: ${item.name}`);
  assert.equal(actual.tokens.length, expected.tokens.length);
  return JSON.parse(exported.text!);
}

test("new guided Light and Dark reference exports reimport with the selected values and live aliases", () => {
  const document = createStudioStarter("project.export", { domains: ["color"] }).find(item => item.kind === "foundation") as FoundationDocument;
  const before = canonicalJson(document);
  for (const theme of document.themeSets) {
    const references = roundTrip(document, { themeSetId: theme.id }, "references");
    const resolved = roundTrip(document, { themeSetId: theme.id }, "resolved");
    assert.equal(references.action.primary.background.$value, theme.name === "Dark" ? "{color.brand.400}" : "{color.brand.600}");
    assert.equal(typeof resolved.action.primary.background.$value, "object");
  }
  assert.equal(canonicalJson(document), before);
});

test("selected reference exports preserve axis interleaving, partial domain replacements and transient contexts", () => {
  const document = foundation([
    token("token.base", "number", 1), token("token.other", "number", 2), token("token.fallback", "number", 3),
    { ...token("token.target"), value: ref("token.base") }, { ...token("token.chain"), value: ref("token.target") },
  ]) as unknown as FoundationDocument;
  document.domains = [{ id: "domain.scale", name: "Scale", allowedTypes: ["number"] }];
  for (const item of document.tokens) item.domain = "domain.scale";
  document.valueSets = [
    { id: "group.axis", name: "Axis scale", domain: "domain.scale", values: { "token.base": { literal: 10 }, "token.fallback": { literal: 30 }, "token.target": { ref: { id: "token.fallback", expectedKind: "token" } } } },
    { id: "group.later", name: "Later unscoped", values: { "token.base": { literal: 12 } } },
    { id: "group.theme", name: "Theme scale", domain: "domain.scale", values: { "token.target": { ref: { id: "token.other", expectedKind: "token" } } } },
  ];
  document.themeAxes = [
    { id: "axis.scheme", contexts: ["light", "dark"], default: "light", scope: { id: document.id, expectedKind: "foundation" }, valueSetIds: { dark: ["group.axis"] }, overrides: { light: { "token.base": { literal: 5 } }, dark: { "token.base": { literal: 11 } } } },
    { id: "axis.later", contexts: ["off", "on"], default: "off", scope: { id: document.id, expectedKind: "foundation" }, valueSetIds: { on: ["group.later"] } },
  ];
  document.resolutionOrder = ["axis.scheme", "axis.later"];
  document.themeSets = [{ id: "theme.dark", contexts: { "axis.scheme": "dark", "axis.later": "on" }, valueSetIds: ["group.theme"], resolutionProfile: profile as FoundationDocument["themeSets"][number]["resolutionProfile"] }];
  const scenarios: [FoundationSelection, number, number, string][] = [
    [{}, 5, 3, "{base}"],
    [{ contexts: { "axis.scheme": "dark", "axis.later": "on" } }, 12, 30, "{fallback}"],
    [{ themeSetId: "theme.dark" }, 12, 3, "{other}"],
    [{ themeSetId: "theme.dark", contexts: { "axis.later": "off" } }, 11, 3, "{other}"],
    [{ themeSetId: "theme.dark", contexts: { "axis.scheme": "light" } }, 12, 3, "{other}"],
  ];
  for (const [selection, base, fallback, target] of scenarios) {
    const references = roundTrip(document, selection, "references");
    assert.equal(references.base.$value, base);
    assert.equal(references.fallback.$value, fallback);
    assert.equal(references.target.$value, target);
    assert.equal(references.chain.$value, "{target}");
    const resolved = roundTrip(document, selection, "resolved");
    assert.equal(typeof resolved.target.$value, "number");
  }
  let gets = 0;
  const selection = new Proxy({ themeSetId: "theme.dark" }, { get() { gets++; throw new Error("Raw source read"); } });
  roundTrip(document, selection, "references");
  assert.equal(gets, 0, "selected theme identity is read only from captured descriptors");
});

test("selected export captures source and theme selection once before resolving and serializing", () => {
  const document = createStudioStarter("project.capture", { domains: ["color"] }).find(item => item.kind === "foundation") as FoundationDocument;
  const light = document.themeSets.find(theme => theme.name === "Light")!, dark = document.themeSets.find(theme => theme.name === "Dark")!;
  let sourceReads = 0, selectionReads = 0;
  const source = new Proxy(document, { getOwnPropertyDescriptor(target, key) {
    if (key === "tokens") { sourceReads++; return { configurable: true, enumerable: true, writable: true, value: sourceReads === 1 ? target.tokens : [] }; }
    return Reflect.getOwnPropertyDescriptor(target, key);
  } });
  const selection = new Proxy({ themeSetId: light.id }, { getOwnPropertyDescriptor(target, key) {
    if (key === "themeSetId") return { configurable: true, enumerable: true, writable: true, value: ++selectionReads === 1 ? light.id : dark.id };
    return Reflect.getOwnPropertyDescriptor(target, key);
  } });
  const exported = exportSelectedFoundationDtcg(source, selection, "references");
  assert.equal(exported.valid, true, JSON.stringify(exported.diagnostics));
  assert.equal(JSON.parse(exported.text!).action.primary.background.$value, "{color.brand.600}");
  assert.equal(sourceReads, 1); assert.equal(selectionReads, 1);
  const actual = resolveFoundationTokens(reimport(exported.text!));
  const expected = resolveFoundationTokens(document, { themeSetId: light.id });
  assert.equal(actual.valid, true); assert.equal(actual.tokens.length, expected.tokens.length);
  const actualValues = new Map(actual.tokens.map(token => [token.name, token.value]));
  for (const token of expected.tokens) assert.deepEqual(actualValues.get(token.name), token.value, token.name);
});

test("selected export preserves input safety diagnostics and never returns partial text", () => {
  const document = foundation([token("token.value", "number", 1)]);
  const oversized = exportSelectedFoundationDtcg({ ...document, description: "x".repeat(MAX_DOCUMENT_BYTES) });
  assert.equal(oversized.valid, false); assert.equal(oversized.text, undefined);
  assert.ok(oversized.diagnostics.some(item => item.code === "JSON_LIMIT" && item.path === "/description"));
  let reads = 0;
  const selected = Object.defineProperty({}, "themeSetId", { enumerable: true, get() { reads++; return "theme.dark"; } });
  const accessor = exportSelectedFoundationDtcg(document, selected);
  assert.equal(accessor.valid, false); assert.equal(accessor.text, undefined); assert.equal(reads, 0);
  assert.ok(accessor.diagnostics.some(item => item.code === "JSON_INVALID" && item.path === "/selection/themeSetId"));
});
