import { test } from "node:test";
import assert from "node:assert/strict";
import type { JsonObject, JsonValue } from "../src/contracts.ts";
import { inspectDocumentDomain, inspectRecordDomain } from "../src/domain-validation.ts";
import { MAX_DOCUMENT_BYTES, MAX_STRUCTURE_DIAGNOSTICS } from "../src/constants.ts";

const port = (extra: JsonObject = {}): JsonObject => ({ id: "value.open", name: "Open", type: { kind: "boolean" }, ownership: "consumer", visibility: "public", ...extra });
const policy = (extra: JsonObject = {}): JsonObject => ({ id: "policy.select", version: "1", appliesTo: [], configurationType: { kind: "enum", values: ["first", "last"] }, invariants: [], allowedChoices: ["first", "last"], ...extra });
const text = (inlines: JsonValue[] = []): JsonObject => ({ id: "text.one", kind: "text", schemaVersion: "future", revision: "r1", name: "Text", blocks: [{ id: "b.one", kind: "paragraph", inlines }], localeHints: {} });
const component = (values: JsonValue[], events: JsonValue[] = []): JsonObject => ({ id: "component.one", kind: "component", schemaVersion: "future", revision: "r1", name: "Example", purpose: "Content", archetypeRef: { id: "archetype.one", expectedKind: "archetype" }, traitBindings: [], publicContract: { values, events, exposedSlots: [], replaceableParts: [], allowedOverrides: [], variants: [] }, parts: [], slots: [], behavior: { states: [], transitions: [], hostBindings: [] }, accessibility: { purpose: "Content", nameSources: [], descriptionSources: [], stateExposure: [], readingOrder: [], focus: {}, announcements: [], requirements: [] }, motion: [], requirements: [] });

test("ValuePort distinguishes absence and null without banning consumer defaults", () => {
  for (const input of [port(), port({ defaultValue: false }), port({ type: { kind: "nullable", inner: { kind: "boolean" } }, defaultValue: null })]) {
    const result = inspectRecordDomain("ValuePort", input);
    assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
    assert.ok(!result.unverifiedTypes.includes("TypeExpr"));
    assert.ok(!result.unverifiedTypes.includes("TypedValue"));
  }
  for (const value of [null, "false", 0, { value: false }]) {
    const result = inspectRecordDomain("ValuePort", port({ defaultValue: value }));
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.some(d => d.path === "/defaultValue" && d.code === "VALUE_INVALID"));
  }
  const invalidType = inspectRecordDomain("ValuePort", port({ type: { kind: "future-type" }, defaultValue: false }));
  assert.equal(invalidType.valid, false);
  assert.ok(invalidType.unverifiedTypes.includes("TypeExpr"));
  assert.ok(invalidType.unverifiedTypes.includes("TypedValue"));
  assert.ok(!invalidType.diagnostics.some(d => d.code === "VALUE_INVALID"), "An invalid declaration does not certify or match a default");
});

test("typed preserved extras remain opaque, precisely reported, and never mutated", () => {
  const type = { kind: "record", fields: { enabled: { kind: "boolean" } }, required: ["enabled"], additionalFields: "preserve-opaque" };
  const input = port({ type, defaultValue: { enabled: true, "vendor/~": { kind: "future-type", id: "not-an-entity", expectedKind: "not-a-ref" } } });
  const before = JSON.stringify(input);
  const report = inspectRecordDomain("ValuePort", input);
  assert.equal(report.valid, true, JSON.stringify(report.diagnostics));
  assert.ok(report.unverifiedTypes.includes("AdditionalTypedField"));
  assert.ok(report.diagnostics.some(d => d.code === "DOMAIN_UNVERIFIED" && d.path === "/defaultValue/vendor~1~0"));
  assert.equal(JSON.stringify(input), before);
  const rejected = inspectRecordDomain("ValuePort", port({ type: { ...type, additionalFields: "reject" }, defaultValue: input.defaultValue! }));
  assert.equal(rejected.valid, false);
});

test("Policy defaults and every allowed choice match their configuration declaration", () => {
  assert.equal(inspectRecordDomain("PolicyDefinition", policy({ default: "first" })).valid, true);
  assert.equal(inspectRecordDomain("PolicyDefinition", policy({ allowedChoices: [] })).valid, true);
  const result = inspectRecordDomain("PolicyDefinition", policy({ default: "other", allowedChoices: ["first", 1, "last"] }));
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(d => d.path === "/default" && d.code === "VALUE_INVALID"));
  assert.ok(result.diagnostics.some(d => d.path === "/allowedChoices/1" && d.code === "VALUE_INVALID"));
});

test("known nested records and standalone Trait/Event declarations share the checker", () => {
  const event = { id: "event.open", name: "Open", payloadType: { kind: "boolean" }, phase: "notification", cancellable: false, visibility: "public" };
  assert.equal(inspectRecordDomain("EventPort", event).valid, true);
  const nested = inspectDocumentDomain(component([port({ defaultValue: "bad" })], [{ ...event, payloadType: { kind: "future" } }]));
  assert.equal(nested.valid, false);
  assert.ok(nested.diagnostics.some(d => d.path === "/publicContract/values/0/defaultValue" && d.code === "VALUE_INVALID"));
  assert.ok(nested.diagnostics.some(d => d.path === "/publicContract/events/0/payloadType/kind" && d.code === "TYPE_UNSUPPORTED"));
  const trait = { id: "trait.one", version: "1", purpose: "Purpose", configurationType: { kind: "boolean", constraint: "unknown" }, requires: [], provides: [], ports: [], roleRequirements: [], inputClaims: [], obligations: [], incompatibleBindings: [], inspectorHints: {} };
  const invalid = inspectRecordDomain("TraitDefinition", trait);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.diagnostics.some(d => d.path === "/configurationType/constraint" && d.code === "TYPE_INVALID"));
});

test("unknown bodies, requests and extensions never gain inferred type semantics", () => {
  const request = inspectRecordDomain("Request", { id: "request.one", ownerValueRef: "value.open", desired: { kind: "future", value: "opaque" }, baseValueRevision: "r1", status: "pending" });
  assert.equal(request.valid, true);
  assert.ok(request.unverifiedTypes.includes("TypedValue"));
  const registry = inspectDocumentDomain({ id: "registry.one", kind: "registry", schemaVersion: "future", revision: "r1", name: "Registry", definitions: [policy({ default: "invalid-but-opaque" })] });
  assert.equal(registry.valid, true);
  assert.ok(registry.unverifiedTypes.includes("RegistryDocument"));
  const unknown = inspectRecordDomain("NotACatalogRecord", {});
  assert.equal(unknown.valid, false);
  assert.ok(inspectRecordDomain("ValuePort", port({ extensions: { type: { kind: "future" } }, future: { type: { kind: "future" } } })).valid);
});

test("public domain boundary snapshots data before inspection and never invokes getters", () => {
  let reads = 0;
  const poison = Object.defineProperty({ unit: "px" }, "value", { enumerable: true, get() { reads++; return 1; } });
  const target = { mode: "fixed", value: { value: 1, unit: "px" } };
  const proxy = new Proxy(target, { get(object, key, receiver) { return key === "value" ? poison : Reflect.get(object, key, receiver); } });
  assert.equal(inspectRecordDomain("SizePolicy", proxy).valid, true);
  assert.equal(reads, 0);
  const accessor = Object.defineProperty({}, "id", { enumerable: true, get() { reads++; return "text.one"; } });
  assert.equal(inspectDocumentDomain(accessor).valid, false);
  const method = { toJSON() { reads++; return {}; } };
  assert.equal(inspectDocumentDomain(method as unknown as JsonValue).valid, false);
  assert.equal(reads, 0);
  const cycle: JsonObject = {}; cycle.self = cycle;
  for (const input of [cycle, { value: Number.NaN }, { value: Infinity }, new Date() as unknown as JsonValue]) assert.equal(inspectDocumentDomain(input).valid, false);
  const invalid = inspectDocumentDomain({ value: Number.NaN });
  assert.ok(invalid.diagnostics.some(d => d.code === "JSON_NUMBER" && d.phase === "parse"));
});

test("domain input byte/depth limits apply even within opaque extension data", () => {
  const large = text(); large.extensions = { data: "x".repeat(MAX_DOCUMENT_BYTES) };
  assert.ok(inspectDocumentDomain(large).diagnostics.some(d => d.code === "JSON_LIMIT"));
  let deep: JsonValue = null;
  for (let i = 0; i < 65; i++) deep = { child: deep };
  assert.ok(inspectDocumentDomain(deep).diagnostics.some(d => d.code === "JSON_LIMIT"));
  const badIdentity = inspectDocumentDomain(text(), " ");
  assert.equal(badIdentity.valid, false);
  assert.ok(badIdentity.diagnostics.every(d => d.sourceRef === "memory:document"));
});

test("bounded reports preserve late failures and shared typed-work exhaustion is explicit", () => {
  const inlines = Array.from({ length: 200 }, (_, i) => ({ id: `run.${i}`, text: "", marks: [], link: { href: "#ok", vendor: true } }));
  const manyWarnings = inspectDocumentDomain(text([...inlines, { id: "run.bad", text: "", marks: ["bad"] }]));
  assert.equal(manyWarnings.valid, false);
  assert.ok(manyWarnings.diagnostics.length <= MAX_STRUCTURE_DIAGNOSTICS);
  assert.ok(manyWarnings.diagnostics.some(d => d.code === "DOMAIN_INVALID" && d.path === "/blocks/0/inlines/200/marks/0"));
  assert.ok(manyWarnings.diagnostics.some(d => d.code === "STRUCTURE_LIMIT"));
  const values = Array.from({ length: 100 }, (_, i) => `${i}-${"x".repeat(100)}`);
  const limited = inspectRecordDomain("PolicyDefinition", policy({ configurationType: { kind: "enum", values }, allowedChoices: Array(900).fill(values[0]!) }));
  assert.equal(limited.valid, false);
  assert.ok(limited.unverifiedTypes.includes("DomainWorkLimit"));
  assert.ok(limited.diagnostics.some(d => d.code === "DOMAIN_INVALID" && d.message.includes("work limit")));
});

test("wide text coverage does not confuse sibling paths or absorb unchecked fields", () => {
  const inlines = Array.from({ length: 2_000 }, (_, i) => ({ id: `run.${i}`, text: "", marks: ["strong"] }));
  const result = inspectDocumentDomain(text(inlines));
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  assert.ok(!result.unverifiedTypes.includes("InlineMark"));
  assert.ok(result.unverifiedTypes.includes("LocaleTag"));
});
