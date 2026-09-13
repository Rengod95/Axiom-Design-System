import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

test("canonical byte preflight counts escaped and Unicode text exactly before expansion", () => {
  for (const value of [{ "é": "😊" }, ["\u0000\b\n\r\t\f\\\"", "\ud800", "\udc00"], { z: [1, false, null], a: -0 }]) {
    const expected = canonicalJson(value);
    const bytes = Buffer.byteLength(expected, "utf8");
    assert.equal(canonicalJson(value, bytes), expected);
    assert.throws(() => canonicalJson(value, bytes - 1), (error: unknown) => error instanceof KernelError && error.code === "JSON_LIMIT");
  }
  const shared = { nested: [1, 2, 3] };
  assert.equal(canonicalJson([shared, shared]), '[{"nested":[1,2,3]},{"nested":[1,2,3]}]');
  let nested: unknown = shared;
  for (let depth = 0; depth < 79; depth += 1) nested = [nested];
  assert.throws(() => canonicalJson([shared, nested]), (error: unknown) => error instanceof KernelError && error.code === "JSON_LIMIT");
});

test("a compact shared graph rejects within a small child heap before canonical or command expansion", () => {
  const moduleUrl = new URL("../src/index.ts", import.meta.url).href;
  const script = `import { canonicalJson, CommandService, MemoryStore } from ${JSON.stringify(moduleUrl)};
    let value = { leaf: 'x' }; for (let level = 0; level < 30; level++) value = { left: value, right: value };
    try { canonicalJson(value); process.exit(2); } catch (error) { if (error.code !== 'JSON_LIMIT') throw error; }
    const service = new CommandService(new MemoryStore(), { createId: () => 'id', digest: () => 'digest' });
    const result = await service.execute({ payload: value }, { id: 'owner', scopes: [] });
    if (result.diagnostics[0]?.code !== 'JSON_LIMIT') process.exit(3);`;
  const result = spawnSync(process.execPath, ["--max-old-space-size=64", "--input-type=module", "--eval", script], { encoding: "utf8", timeout: 5_000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});

test("numeric parsing rejects decimal-value loss but permits equivalent notation and representable values", () => {
  for (const input of ["1e-400", "-1e-400", "9007199254740993", "1.0000000000000001", "0.10000000000000001", "4.9406564584124654e-324"]) assert.throws(() => parseJson(input), (error: unknown) => error instanceof KernelError && error.code === "JSON_NUMBER");
  for (const [input, expected] of [["1.0", 1], ["1e3", 1000], ["1.2300", 1.23], ["0.1", 0.1], ["5e-324", 5e-324], ["9007199254740992", 9007199254740992], ["0e9999999999999999999999", 0]] as const) assert.equal(parseJson(input), expected);
  for (const input of ['"\ud800"', '"\udc00"']) assert.throws(() => parseJson(input), (error: unknown) => error instanceof KernelError && error.code === "JSON_INVALID");
  assert.equal(parseJson('"\\ud800"'), "\ud800");
});
