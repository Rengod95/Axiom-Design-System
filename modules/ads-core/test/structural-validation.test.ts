import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createContext, Script } from "node:vm";
import { Ajv2020 } from "ajv/dist/2020.js";
import ts from "typescript";
import type { AdsDocument, JsonObject, JsonValue } from "../src/contracts.ts";
import { MAX_STRUCTURE_DIAGNOSTICS } from "../src/constants.ts";
import { inspectDocumentStructure, inspectRecordStructure } from "../src/structural-validation.ts";
import { CATALOG_DIGEST, CATALOG_RECORDS, DOCUMENT_RECORDS, STRUCTURE_SCHEMA_DIGEST } from "../src/generated/catalog-metadata.ts";

const SCHEMA_BYTES = readFileSync(new URL("../schema/catalog-structure.json", import.meta.url));
const SCHEMA = JSON.parse(SCHEMA_BYTES.toString("utf8"));
const CATALOG_BYTES = readFileSync(new URL("../../../docs/foundation/annexes/field-catalog.json", import.meta.url));
const CATALOG = JSON.parse(CATALOG_BYTES.toString("utf8")) as { records: { name: string; ownerDocumentId: string; fields: { name: string; type: string; required: boolean }[] }[] };
const REF = { id: "target.example", expectedKind: "trait", version: "future-version", revision: "source-r1" };

function document(kind: string, body: JsonObject): AdsDocument {
  return { id: `${kind}.example`, kind, schemaVersion: "future-unverified", revision: "source-r1", name: "Example", ...body };
}

// These fixtures are written from the document contract, not generated from schema defaults.
const BODIES: Record<string, JsonObject> = {
  project: { documents: [], libraries: [], targetProfiles: [], brandLibraries: [], connections: [] },
  foundation: { tokens: [], domains: [], tiers: [], themeAxes: [], themeSets: [], policies: [], originalSources: [] },
  component: { purpose: "Content surface", archetypeRef: REF, traitBindings: [], publicContract: { values: [], events: [], exposedSlots: [], replaceableParts: [], allowedOverrides: [], variants: [] }, parts: [], slots: [], behavior: { states: [], transitions: [], hostBindings: [] }, accessibility: { purpose: "Read content", nameSources: [], descriptionSources: [], stateExposure: [], readingOrder: [], focus: {}, announcements: [], requirements: [] }, motion: [], requirements: [] },
  design: { componentRef: REF, category: "Web", nodeMappings: [], layout: [], appearance: [], targetOverrides: [] },
  screen: { instances: [], themeSetRef: REF, brandAssetRefs: [], layout: [] },
  scenario: { screenRef: REF, initialMockValues: {}, initialMockStates: {}, eventBindings: [], prototypeLinks: [], inputTrace: {}, expectations: [], stepBudget: 1, clock: {} },
  connection: { projectRoot: {}, directories: {}, aliases: {}, providers: [], allowedBehaviorBases: [], declaredEnvironment: { framework: {}, toolchain: {}, packageManager: {}, configurationDigest: {}, diagnostics: [] }, installationState: "none" },
  text: { blocks: [{ id: "block.welcome", kind: "paragraph", inlines: [{ id: "run.welcome", text: "안녕하세요\nAxiom", marks: [] }] }], localeHints: {} },
};

test("schema and metadata project all 57 catalog records with exact fields and required flags", () => {
  assert.equal(CATALOG.records.length, 57);
  assert.deepEqual(Object.keys(SCHEMA.$defs), CATALOG.records.map(record => record.name));
  assert.deepEqual(Object.keys(CATALOG_RECORDS), CATALOG.records.map(record => record.name));
  for (const record of CATALOG.records) {
    const definition = SCHEMA.$defs[record.name];
    assert.deepEqual(Object.keys(definition.properties), record.fields.map(field => field.name), record.name);
    assert.deepEqual(definition.required, record.fields.filter(field => field.required).map(field => field.name), record.name);
    assert.deepEqual(CATALOG_RECORDS[record.name]!.fields.map(({ shape: _shape, ...field }) => field), record.fields, record.name);
    assert.equal(CATALOG_RECORDS[record.name]!.ownerDocumentId, record.ownerDocumentId);
    assert.equal(definition.additionalProperties, true);
  }
  assert.equal(CATALOG_DIGEST, createHash("sha256").update(CATALOG_BYTES).digest("hex"));
  assert.equal(STRUCTURE_SCHEMA_DIGEST, createHash("sha256").update(SCHEMA_BYTES).digest("hex"));
});

test("all eight declared document bodies enforce their required shape without inventing Registry", () => {
  for (const [kind, body] of Object.entries(BODIES)) {
    const input = document(kind, body);
    const before = JSON.stringify(input);
    const report = inspectDocumentStructure(input);
    assert.equal(report.valid, true, `${kind}: ${JSON.stringify(report.diagnostics)}`);
    assert.ok(report.checkedRecords.includes(DOCUMENT_RECORDS[kind]!));
    assert.ok(report.checkedRecords.includes("DocumentEnvelope"));
    assert.ok(report.unverifiedTypes.includes("SchemaVersionSemantics"));
    assert.equal(JSON.stringify(input), before);
    const firstBodyField = CATALOG_RECORDS[DOCUMENT_RECORDS[kind]!]!.fields.find(field => field.required && !["id", "name"].includes(field.name))!.name;
    const missing = { ...input }; delete missing[firstBodyField];
    const invalid = inspectDocumentStructure(missing);
    assert.equal(invalid.valid, false, kind);
    assert.ok(invalid.diagnostics.some(diagnostic => diagnostic.path === `/${firstBodyField}` && diagnostic.code === "STRUCTURE_INVALID"));
  }
  const registry = inspectDocumentStructure(document("registry", { entries: [{ arbitrary: true }] }));
  assert.equal(registry.valid, true);
  assert.deepEqual(registry.checkedRecords, ["DocumentEnvelope"]);
  assert.ok(registry.unverifiedTypes.includes("RegistryDocument"));
  assert.ok(registry.diagnostics.some(diagnostic => diagnostic.path === "/entries" && diagnostic.code === "STRUCTURE_UNVERIFIED"));
  assert.equal(inspectDocumentStructure(document("project", { ...BODIES.project, documents: {} })).valid, false, "Private kernel project maps are not ADS Project document lists");
});

test("Ref keeps open kind and independent pins while rejecting wrong known field types", () => {
  for (const kind of ["trait", "role", "archetype", "targetProfile", "text", "vendor.future-kind"]) {
    const result = inspectRecordStructure("Ref", { ...REF, expectedKind: kind });
    assert.equal(result.valid, true);
    assert.ok(result.unverifiedTypes.includes("Kind"));
    assert.ok(result.unverifiedTypes.includes("Version"));
  }
  assert.equal(inspectRecordStructure("Ref", { id: "entity", expectedKind: "component" }).valid, true);
  for (const input of [{ expectedKind: "trait" }, { id: "entity" }, { ...REF, id: 4 }, { ...REF, expectedKind: "  " }, { ...REF, version: 1 }, { ...REF, revision: null }]) assert.equal(inspectRecordStructure("Ref", input).valid, false);
});

test("incomplete and primitive draft JSON reports envelope and body failures without assuming an ADS document", () => {
  for (const input of [null, "source text", 42, [], {}, { kind: 1 }, { kind: "future-kind", blocks: 42 }]) {
    const report = inspectDocumentStructure(input);
    assert.equal(report.valid, false);
    assert.ok(report.diagnostics.some(diagnostic => diagnostic.code === "STRUCTURE_INVALID"));
    assert.ok(report.diagnostics.every(diagnostic => diagnostic.sourceRef === "memory:document"));
  }
  const input: JsonObject = { id: "text.draft", kind: "text", schemaVersion: "future", revision: "source-r1", blocks: 42, localeHints: {} };
  const report = inspectDocumentStructure(input, "memory:incomplete-text");
  assert.equal(report.valid, false);
  assert.ok(report.diagnostics.some(diagnostic => diagnostic.path === "/name" && diagnostic.code === "STRUCTURE_INVALID"));
  assert.ok(report.diagnostics.some(diagnostic => diagnostic.path === "/blocks" && diagnostic.code === "STRUCTURE_INVALID"));
  assert.ok(report.checkedRecords.includes("TextDocument"));
  assert.ok(report.diagnostics.every(diagnostic => diagnostic.sourceRef === "memory:incomplete-text"));
  assert.ok(inspectDocumentStructure(input).diagnostics.every(diagnostic => diagnostic.sourceRef === "text.draft"));
});

test("Text checks nested records and preserves unresolved marks, links and unknown content", () => {
  const input = document("text", { blocks: [{ id: "b1", kind: "list-item", inlines: [{ id: "r1", text: "", marks: ["future-mark"], link: { href: "javascript:neverExecute()" }, "future/~": { id: "not-an-entity" } }], list: { unspecified: true } }], localeHints: { "future/~": "not-a-certified-locale" }, extensions: { vendor: { script: "neverExecute()", expectedKind: "not-a-ref" } } });
  const before = JSON.stringify(input);
  const report = inspectDocumentStructure(input, "memory:text");
  assert.equal(report.valid, true);
  for (const type of ["InlineMark", "SafeLink", "ListMetadata", "LocaleTag", "OpaqueExtensionMap", "AdditionalField"]) assert.ok(report.unverifiedTypes.includes(type), type);
  assert.ok(report.diagnostics.some(diagnostic => diagnostic.path === "/blocks/0/inlines/0/future~1~0"));
  assert.ok(report.diagnostics.some(diagnostic => diagnostic.path === "/localeHints/future~1~0"));
  assert.ok(!report.checkedRecords.includes("SafeLink"));
  assert.equal(JSON.stringify(input), before);
  const bad = structuredClone(input);
  (bad.blocks as JsonObject[])[0]!.kind = "heading";
  (((bad.blocks as JsonObject[])[0]!.inlines as JsonObject[])[0]!).text = 42;
  const invalid = inspectDocumentStructure(bad);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.diagnostics.some(diagnostic => diagnostic.path === "/blocks/0/kind"));
  assert.ok(invalid.diagnostics.some(diagnostic => diagnostic.path === "/blocks/0/inlines/0/text"));
  assert.equal(inspectDocumentStructure(document("text", { blocks: [], localeHints: {} })).valid, true);
});

test("named unions remain explicitly unverified while closed enums and numeric unions stay enforced", () => {
  const token = inspectRecordStructure("Token", { id: "token.one", name: "Token", typeRef: {}, value: { id: "future.reference" } });
  assert.equal(token.valid, true);
  assert.ok(token.unverifiedTypes.includes("Literal"));
  assert.ok(token.unverifiedTypes.includes("TokenRef"));
  assert.ok(!token.checkedRecords.includes("Ref"));
  const motion = inspectRecordStructure("MotionDefinition", { id: "motion.one", trigger: null, targetPartRef: "part.one", property: null, keyframes: [], timing: { future: true }, interruption: null, reducedAlternative: null });
  assert.equal(motion.valid, true);
  assert.ok(motion.unverifiedTypes.includes("Tween"));
  assert.ok(motion.unverifiedTypes.includes("Spring"));
  const slot: JsonObject = { id: "slot.one", ownerPartRef: "part.one", contentKinds: ["future-kind"], min: 0, max: "unbounded", defaultContent: [], allowedContractRefs: [] };
  assert.equal(inspectRecordStructure("Slot", slot).valid, true);
  for (const max of [-1, 1.5, "infinity", true]) assert.equal(inspectRecordStructure("Slot", { ...slot, max }).valid, false);
  assert.equal(inspectRecordStructure("Slot", { ...slot, contentKinds: [] }).valid, false);
  assert.equal(inspectRecordStructure("RecordTypeExpr", { kind: "record", fields: {}, required: [], additionalFields: "reject" }).valid, true);
  assert.equal(inspectRecordStructure("RecordTypeExpr", { kind: "anything", fields: {}, required: [], additionalFields: "reject" }).valid, false);
  assert.equal(inspectRecordStructure("RecordTypeExpr", { kind: "record", fields: {}, required: [], additionalFields: "coerce" }).valid, false);
});

test("report truncation is explicit and never changes invalid known structure into success", () => {
  const report = inspectDocumentStructure(document("text", { blocks: Array.from({ length: 200 }, () => ({ kind: "heading", inlines: 42 })), localeHints: {} }));
  assert.equal(report.valid, false);
  assert.equal(report.diagnostics.length, MAX_STRUCTURE_DIAGNOSTICS);
  assert.equal(report.diagnostics.at(-1)!.code, "STRUCTURE_LIMIT");
  assert.ok(report.diagnostics.some(diagnostic => diagnostic.severity === "error"));
  const unknown = inspectRecordStructure("constructor", {});
  assert.equal(unknown.valid, false);
  assert.deepEqual(unknown.checkedRecords, []);
});

test("standalone schemas match independent Ajv compilation and run without runtime code generation", () => {
  const ajv = new Ajv2020({ strict: true, allErrors: true, ownProperties: true });
  ajv.addSchema(SCHEMA);
  for (const [kind, body] of Object.entries(BODIES)) {
    const input = document(kind, body);
    const before = JSON.stringify(input);
    assert.equal(ajv.getSchema(SCHEMA.$id)!(input), inspectDocumentStructure(input).valid);
    assert.equal(JSON.stringify(input), before);
  }
  const cases: [string, JsonValue][] = [["Ref", REF], ["Ref", { ...REF, version: 1 }], ["VariantAxis", { id: "v1", name: "size", options: [], default: "none" }], ["ThemeAxis", { id: "t1", contexts: ["dark"], scope: { id: "bad" } }]];
  for (const [name, input] of cases) assert.equal(ajv.getSchema(`${SCHEMA.$id}#/$defs/${name}`)!(input), inspectRecordStructure(name, input).valid);
  const source = readFileSync(new URL("../src/generated/catalog-structure.ts", import.meta.url), "utf8");
  const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  const sandbox = { exports: {} as Record<string, (value: unknown) => boolean> };
  const context = createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  new Script(emitted).runInContext(context);
  assert.equal(Object.keys(sandbox.exports).length, 58);
  for (const record of CATALOG.records) assert.equal(typeof sandbox.exports[`validate${record.name}`], "function", record.name);
  assert.equal(sandbox.exports.validateRef!(REF), true);
  assert.equal(sandbox.exports.validateRef!({ id: "incomplete" }), false);
  assert.equal(sandbox.exports.validateDocumentStructure!(document("text", BODIES.text!)), true);
  assert.equal(new Script("typeof process + ':' + typeof require").runInContext(context), "undefined:undefined");
  assert.throws(() => new Script('Function("return 1")()').runInContext(context), /Code generation from strings disallowed/);
});
