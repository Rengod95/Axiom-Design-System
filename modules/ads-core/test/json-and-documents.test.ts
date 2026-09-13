import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, KernelError, parseDocument, parseJson } from "../src/index.ts";

test("strict parsing rejects decoded duplicate keys before they can be overwritten", () => {
  for (const input of ['{"x":1,"x":2}', '{"x":1,"\\u0078":2}', '{"outer":{"id":1,"id":2}}']) {
    assert.throws(() => parseJson(input), (error: unknown) => error instanceof KernelError && error.code === "JSON_DUPLICATE");
  }
});

test("strict parsing rejects nonfinite, malformed, trailing and overdeep JSON", () => {
  for (const input of ["1e999", "-1e999", "NaN", "Infinity", "01", "[1,]", '{"a":1,}', "true false", '"unclosed', '\ufeff{}']) assert.throws(() => parseJson(input), KernelError);
  assert.throws(() => parseJson("[".repeat(66) + "0" + "]".repeat(66)), (error: unknown) => error instanceof KernelError && error.code === "JSON_LIMIT");
  assert.throws(() => parseJson('"한글"', 7), (error: unknown) => error instanceof KernelError && error.code === "JSON_LIMIT");
});

test("canonicalization preserves array order and opaque prototype-like JSON keys", () => {
  const parsed = parseJson('{"z":[2,1],"__proto__":{"polluted":true},"a":"한글"}');
  assert.equal(canonicalJson(parsed), '{"__proto__":{"polluted":true},"a":"한글","z":[2,1]}');
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
  for (const invalid of [undefined, { bad: undefined }, new Date(), [Number.NaN], [Number.POSITIVE_INFINITY]]) assert.throws(() => canonicalJson(invalid), KernelError);
  const cycle: { self?: unknown } = {}; cycle.self = cycle;
  assert.throws(() => canonicalJson(cycle), KernelError);
});

test("envelope-only import preserves source formatting and unknown domain data", () => {
  const source = '{\r\n  "id":"card", "kind":"component", "schemaVersion":"future", "revision":"source-r1", "name":"카드", "extensions":{"vendor":{"script":"ignored()"}}, "unknown":{"meaning":42}\r\n}\r\n';
  const entry = parseDocument(source, "file:///review/card.json");
  assert.equal(entry.originalText, source);
  assert.equal(entry.validation, "envelope-only");
  assert.equal(entry.document.schemaVersion, "future");
  assert.equal(entry.diagnostics[0]?.code, "DOMAIN_UNVERIFIED");
  assert.equal(entry.diagnostics[0]?.phase, "document");
  assert.deepEqual(JSON.parse(canonicalJson(entry.document.unknown)), { meaning: 42 });
  assert.throws(() => parseDocument('{"id":"card"}'), (error: unknown) => error instanceof KernelError && error.code === "DOCUMENT_INVALID");
});

test("canonicalization rejects hidden and accessor data without invoking getters", () => {
  let reads = 0;
  const accessor = Object.defineProperty({}, "value", { enumerable: true, get() { reads += 1; return "executed"; } });
  const hidden = Object.defineProperty({}, "hidden", { value: true });
  const symbol = { [Symbol("secret")]: true };
  const sparse = new Array(2);
  const extra = Object.assign([1], { extra: 2 });
  const arrayGetter = Object.defineProperty([1], "0", { enumerable: true, get() { reads += 1; return 1; } });
  for (const invalid of [accessor, hidden, symbol, sparse, extra, arrayGetter]) assert.throws(() => canonicalJson(invalid), KernelError);
  assert.equal(reads, 0);
});
