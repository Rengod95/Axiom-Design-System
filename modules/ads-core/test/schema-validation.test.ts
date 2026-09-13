import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, Script } from "node:vm";
import { Ajv2020 } from "ajv/dist/2020.js";
import ts from "typescript";
import { inspectDocument, parseDocument } from "../src/documents.ts";
import { KernelError } from "../src/kernel-error.ts";

const VALID_ENVELOPE = { id: "component.example", kind: "component", schemaVersion: "future", revision: "source-r1", name: "한글 문서", metadata: {}, extensions: { vendor: { source: "neverRun()" } } };
const SCHEMA = JSON.parse(readFileSync(new URL("../schema/document-envelope.json", import.meta.url), "utf8")) as object;

test("standalone envelope matches declared field cases and independent Ajv compilation without mutation", () => {
  const reference = new Ajv2020({ strict: true, allErrors: true, ownProperties: true }).compile(SCHEMA);
  const corpus: { input: unknown; valid: boolean }[] = [
    { input: VALID_ENVELOPE, valid: true },
    { input: { ...VALID_ENVELOPE, unknown: { future: [1, true, null] } }, valid: true },
    { input: { ...VALID_ENVELOPE, metadata: [] }, valid: false },
    { input: { ...VALID_ENVELOPE, extensions: "opaque text" }, valid: false },
    { input: { ...VALID_ENVELOPE, name: " \n\t" }, valid: false },
    { input: { ...VALID_ENVELOPE, schemaVersion: "" }, valid: false },
    { input: { ...VALID_ENVELOPE, id: "constructor" }, valid: false },
    { input: { ...VALID_ENVELOPE, revision: "a".repeat(129) }, valid: false },
    { input: { ...VALID_ENVELOPE, kind: "future-kind" }, valid: false },
    { input: [], valid: false },
    { input: null, valid: false },
  ];
  for (const field of ["id", "kind", "schemaVersion", "revision", "name"] as const) {
    const copy: Partial<typeof VALID_ENVELOPE> = { ...VALID_ENVELOPE };
    delete copy[field];
    corpus.push({ input: copy, valid: false });
    corpus.push({ input: { ...VALID_ENVELOPE, [field]: 42 }, valid: false });
  }
  for (const kind of ["project", "foundation", "component", "design", "registry", "screen", "scenario", "connection", "text"]) corpus.push({ input: { ...VALID_ENVELOPE, kind }, valid: true });
  for (const item of corpus) {
    const source = JSON.stringify(item.input);
    const report = inspectDocument(source, "memory:fixture");
    assert.equal(report.validation === "envelope-only", item.valid, source);
    assert.equal(reference(item.input), item.valid, source);
    assert.equal(JSON.stringify(item.input), source);
    if (item.valid) assert.deepEqual(JSON.parse(JSON.stringify(report.document)), item.input);
  }
});

test("envelope diagnostics expose exact paths while malformed JSON remains a parse diagnostic", () => {
  const missing = inspectDocument('{"id":"partial"}', "memory:partial");
  assert.equal(missing.validation, "invalid");
  assert.deepEqual(missing.diagnostics.map((item) => item.path), ["/kind", "/schemaVersion", "/revision", "/name"]);
  assert.ok(missing.diagnostics.every((item) => item.phase === "envelope" && item.sourceRef === "memory:partial"));
  assert.throws(() => parseDocument(JSON.stringify({ ...VALID_ENVELOPE, metadata: [] }), "memory:bad-meta"), (error: unknown) => error instanceof KernelError && error.toDiagnostic().path === "/metadata" && error.toDiagnostic().sourceRef === "memory:bad-meta");
  const malformed = inspectDocument('{"id":1,"id":2}', "memory:duplicate");
  assert.equal(malformed.diagnostics[0]?.code, "JSON_DUPLICATE");
  assert.equal(malformed.diagnostics[0]?.phase, "parse");
  assert.equal(malformed.document, undefined);
});

test("generated validator runs with no Node globals or runtime string code generation", () => {
  const generated = readFileSync(new URL("../src/generated/document-envelope.ts", import.meta.url), "utf8");
  const emitted = ts.transpileModule(generated, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  const sandbox = { exports: {} as Record<string, unknown> };
  const context = createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  new Script(emitted, { filename: "standalone-envelope.js" }).runInContext(context);
  const validate = sandbox.exports.default as (value: unknown) => boolean;
  assert.equal(typeof validate, "function");
  assert.equal(validate(VALID_ENVELOPE), true);
  assert.equal(validate({ ...VALID_ENVELOPE, extensions: false }), false);
  assert.equal(new Script("typeof process + ':' + typeof require").runInContext(context), "undefined:undefined");
  assert.throws(() => new Script('Function("return 1")()').runInContext(context), /Code generation from strings disallowed/);
});
