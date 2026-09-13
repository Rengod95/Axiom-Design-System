import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createContext, Script } from "node:vm";
import { Ajv2020 } from "ajv/dist/2020.js";
import ts from "typescript";
import { inspectTypeExpression, inspectTypedValue } from "../src/type-validation.ts";
import { MAX_DOCUMENT_BYTES, MAX_STRUCTURE_DIAGNOSTICS } from "../src/constants.ts";
import validateGenerated from "../src/generated/type-expression.ts";

const boolean = { kind: "boolean" };
const string = { kind: "string" };
const record = (fields: object = {}, required: string[] = [], additionalFields = "reject") => ({ kind: "record", fields, required, additionalFields });
const SCHEMA_BYTES = readFileSync(new URL("../schema/type-expression.json", import.meta.url), "utf8");
const SCHEMA = JSON.parse(SCHEMA_BYTES) as object;
const DECLARATIONS: { type: unknown; valid: boolean }[] = [
  { type: boolean, valid: true }, { type: string, valid: true }, { type: { kind: "number" }, valid: true },
  { type: { kind: "enum", values: ["", "one"] }, valid: true },
  { type: record(), valid: true }, { type: record({ flag: boolean }, ["flag"], "preserve-opaque"), valid: true },
  { type: { kind: "list", items: boolean }, valid: true }, { type: { kind: "nullable", inner: string }, valid: true },
  { type: null, valid: false }, { type: "string", valid: false }, { type: [], valid: false }, { type: {}, valid: false },
  { type: { kind: "string", minLength: 1 }, valid: false }, { type: { kind: "number", maximum: 100 }, valid: false },
  { type: { kind: "enum", values: [] }, valid: false }, { type: { kind: "enum", values: ["one", "one"] }, valid: false },
  { type: { kind: "enum", values: [1] }, valid: false }, { type: { kind: "enum", values: [null] }, valid: false },
  { type: { kind: "list" }, valid: false }, { type: { kind: "list", items: string, minItems: 1 }, valid: false },
  { type: { kind: "nullable", items: string }, valid: false }, { type: { kind: "nullable", inner: null }, valid: false },
  { type: { kind: "record", fields: {} }, valid: false }, { type: record({}, [], "ignore"), valid: false },
  { type: record({ flag: boolean }, ["flag", "flag"]), valid: false },
  { type: { kind: "record", fields: [], required: [], additionalFields: "reject" }, valid: false },
  ...["tagged-union", "opaque-key", "reference", "date", "future"].map(kind => ({ type: { kind }, valid: false })),
];

test("closed declarations enforce seven kinds without guessing unsupported constraints", () => {
  for (const item of DECLARATIONS) assert.equal(inspectTypeExpression(item.type).valid, item.valid, JSON.stringify(item.type));
  const unsupported = inspectTypeExpression({ kind: "list", items: { kind: "reference" } }, "memory:component", "/values/0/type");
  assert.equal(unsupported.diagnostics[0]?.code, "TYPE_UNSUPPORTED");
  assert.equal(unsupported.diagnostics[0]?.path, "/values/0/type/items/kind");
  assert.equal(unsupported.diagnostics[0]?.sourceRef, "memory:component");
  const absent = inspectTypeExpression(record({ flag: boolean }, ["other"]), "memory:type", "/type");
  assert.equal(absent.valid, false);
  assert.equal(absent.diagnostics[0]?.path, "/type/required/0");
  assert.equal(inspectTypeExpression({ kind: "string", minimum: 1 }).diagnostics[0]?.path, "/minimum");
});

test("raw primitive, enum and list values never coerce or unwrap supplied JSON", () => {
  const cases: [unknown, unknown, boolean][] = [
    [boolean, false, true], [boolean, 0, false], [boolean, "false", false], [boolean, null, false],
    [string, "", true], [string, 12, false], [{ kind: "number" }, -2.5, true], [{ kind: "number" }, "2.5", false],
    [{ kind: "number" }, Infinity, false], [{ kind: "number" }, NaN, false], [{ kind: "number" }, null, false],
    [{ kind: "enum", values: ["One", ""] }, "One", true], [{ kind: "enum", values: ["One"] }, "one", false],
    [{ kind: "enum", values: ["1"] }, 1, false], [boolean, { type: boolean, value: false }, false],
    [{ kind: "list", items: boolean }, [], true], [{ kind: "list", items: boolean }, [true, false], true],
    [{ kind: "list", items: boolean }, [true, null], false], [{ kind: "list", items: boolean }, {}, false],
  ];
  for (const [type, value, valid] of cases) assert.equal(inspectTypedValue(type, value).valid, valid, JSON.stringify([type, value]));
  const report = inspectTypedValue({ kind: "list", items: boolean }, [true, "false"], "memory:default", "/defaultValue");
  assert.equal(report.diagnostics[0]?.path, "/defaultValue/1");
  assert.equal(report.diagnostics[0]?.code, "VALUE_INVALID");
});

test("nullable preserves missing/null distinction and record extra fields follow the explicit policy", () => {
  const declaration = record({ optional: string, selected: { kind: "nullable", inner: string } }, ["selected"]);
  assert.equal(inspectTypedValue(declaration, { selected: null }).valid, true);
  assert.equal(inspectTypedValue(declaration, { selected: "" }).valid, true);
  assert.equal(inspectTypedValue(declaration, {}).diagnostics[0]?.path, "/selected");
  assert.equal(inspectTypedValue(declaration, { selected: null, optional: null }).valid, false);
  assert.equal(inspectTypedValue(declaration, { selected: undefined }).valid, false);
  assert.equal(inspectTypedValue(declaration, { selected: null, extra: true }).diagnostics[0]?.path, "/extra");
  const opaque = { selected: null, extra: { kind: "reference", id: "missing.target", execute: "neverRun()", values: [null, 12] } };
  const before = JSON.stringify(opaque);
  const preserved = inspectTypedValue({ ...declaration, additionalFields: "preserve-opaque" }, opaque);
  assert.equal(preserved.valid, true);
  assert.equal(preserved.diagnostics[0]?.code, "DOMAIN_UNVERIFIED");
  assert.equal(preserved.diagnostics[0]?.severity, "warning");
  assert.equal(preserved.diagnostics[0]?.path, "/extra");
  assert.equal(JSON.stringify(opaque), before);
});

test("prototype-like field names and enum strings stay data while duplicate names are rejected", () => {
  const names = ["__proto__", "constructor", "prototype"];
  const fields = Object.fromEntries(names.map(name => [name, string]));
  const value = Object.fromEntries(names.map(name => [name, "data"]));
  const declaration = record(fields, names);
  assert.equal(inspectTypeExpression(declaration).valid, true);
  assert.equal(inspectTypedValue(declaration, value).valid, true);
  assert.equal(inspectTypedValue(record(), value).valid, false);
  assert.equal(inspectTypeExpression({ kind: "enum", values: names }).valid, true);
  for (const name of names) {
    assert.equal(inspectTypeExpression({ kind: "enum", values: [name, name] }).valid, false);
    assert.equal(validateGenerated({ kind: "enum", values: [name, name] }), false);
    assert.equal(inspectTypeExpression(record(fields, [name, name])).valid, false);
    assert.equal(inspectTypedValue({ kind: "enum", values: names }, name).valid, true);
  }
  const escaped = inspectTypedValue(record({ "a/b~c": boolean }, ["a/b~c"]), {}, "memory:record", "/value");
  assert.equal(escaped.diagnostics[0]?.path, "/value/a~1b~0c");
  assert.equal(Object.prototype.hasOwnProperty.call({}, "polluted"), false);
});

test("public unknown inputs reject lossy and executable host shapes without invoking getters or toJSON", () => {
  let executed = 0;
  const accessor = Object.defineProperty({}, "bad", { enumerable: true, get() { executed++; return false; } });
  const hidden = Object.defineProperty({}, "bad", { value: 1 });
  class CustomArray extends Array { toJSON() { executed++; return []; } }
  const circular: Record<string, unknown> = {}; circular.self = circular;
  const invalid = [accessor, hidden, new CustomArray(), new Date(), { toJSON() { executed++; return {}; } },
    { [Symbol("key")]: 1 }, Object.assign([1], { extra: true }), new Array(2), circular, undefined, 1n, () => false];
  for (const value of invalid) {
    const report = inspectTypedValue(record({}, [], "preserve-opaque"), value, "memory:input", "/raw");
    assert.equal(report.valid, false);
    assert.equal(report.diagnostics[0]?.code, "JSON_INVALID");
  }
  assert.equal(inspectTypedValue(record(), accessor).diagnostics[0]?.path, "/bad");
  assert.equal(executed, 0);
  assert.equal(inspectTypeExpression(Object.create({ kind: "string" })).valid, false);
  assert.equal(inspectTypedValue(record(), Object.create(null)).valid, true);
});

test("bytes, nesting, expanded work and diagnostics are bounded with explicit failure", () => {
  assert.equal(inspectTypedValue(string, "x".repeat(MAX_DOCUMENT_BYTES - 2)).valid, true);
  assert.equal(inspectTypedValue(string, "x".repeat(MAX_DOCUMENT_BYTES - 1)).diagnostics[0]?.code, "JSON_LIMIT");
  for (const text of ["😀\n\"\\한글", "\ud800", "\udc00"]) assert.equal(inspectTypedValue(string, text).valid, true);
  let deep: unknown = string;
  for (let index = 0; index < 65; index++) deep = { kind: "nullable", inner: deep };
  assert.equal(inspectTypeExpression(deep).diagnostics[0]?.code, "JSON_LIMIT");
  assert.equal(inspectTypedValue({ kind: "list", items: boolean }, Array(40_000).fill(true)).diagnostics.at(-1)?.code, "JSON_LIMIT");
  const many = inspectTypedValue({ kind: "list", items: boolean }, Array(200).fill(0));
  assert.equal(many.valid, false);
  assert.equal(many.diagnostics.length, MAX_STRUCTURE_DIAGNOSTICS);
  assert.equal(many.diagnostics.at(-1)?.code, "STRUCTURE_LIMIT");
  const child = spawnSync(process.execPath, ["--max-old-space-size=32", "--input-type=module", "-e", `
    import { inspectTypedValue } from ${JSON.stringify(new URL("../src/type-validation.ts", import.meta.url).href)};
    let value = {}; for (let index = 0; index < 30; index++) value = {a:value,b:value};
    const report = inspectTypedValue({kind:'record',fields:{},required:[],additionalFields:'preserve-opaque'}, value);
    if (report.valid || report.diagnostics[0]?.code !== 'JSON_LIMIT') process.exit(2);
  `], { encoding: "utf8", timeout: 10_000 });
  assert.equal(child.status, 0, child.stderr);
});

test("reused enum declarations do not multiply membership scans for each list item", () => {
  const values = Array.from({ length: 15_000 }, (_, index) => `key${index}`);
  const type = { kind: "list", items: { kind: "enum", values } };
  assert.equal(inspectTypedValue(type, Array(15_000).fill(values.at(-1))).valid, true);
});

test("schema provenance and standalone behavior match independent fixtures without runtime compilation", () => {
  const reference = new Ajv2020({ strict: true, allErrors: false, ownProperties: true }).compile(SCHEMA);
  for (const item of DECLARATIONS) {
    const before = JSON.stringify(item.type);
    assert.equal(reference(item.type), item.valid, before);
    assert.equal(validateGenerated(item.type), item.valid, before);
    assert.equal(JSON.stringify(item.type), before);
  }
  const generated = readFileSync(new URL("../src/generated/type-expression.ts", import.meta.url), "utf8");
  assert.ok(generated.includes(`sha256=${createHash("sha256").update(SCHEMA_BYTES).digest("hex")}`));
  assert.equal((generated.match(/const indices\d+ = Object.create\(null\);/g) ?? []).length, 2);
  assert.doesNotMatch(generated, /\b(?:require|eval|Function)\s*\(|\bimport\s/);
  const emitted = ts.transpileModule(generated, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  const sandbox = { exports: {} as Record<string, (value: unknown) => boolean> };
  const context = createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  new Script(emitted).runInContext(context);
  for (const item of DECLARATIONS) assert.equal(sandbox.exports.default!(item.type), item.valid);
  for (const name of ["__proto__", "constructor", "prototype"]) {
    assert.equal(sandbox.exports.default!({ kind: "enum", values: [name] }), true);
    assert.equal(sandbox.exports.default!({ kind: "enum", values: [name, name] }), false);
    assert.equal(sandbox.exports.default!(record({ [name]: string }, [name, name])), false);
  }
  assert.equal(new Script("typeof process + ':' + typeof require").runInContext(context), "undefined:undefined");
  assert.throws(() => new Script('Function("return 1")()').runInContext(context), /Code generation from strings disallowed/);
});
