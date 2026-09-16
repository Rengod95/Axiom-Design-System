import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalJson, utf8SourceBytes } from "../src/canonical-json.ts";
import { KernelError } from "../src/kernel-error.ts";

function sourceOracle(text: string, limit: number): number | string {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const low = text.charCodeAt(++index);
      if (!(low >= 0xdc00 && low <= 0xdfff)) return "JSON_INVALID";
      bytes += 4;
    } else {
      if (code >= 0xdc00 && code <= 0xdfff) return "JSON_INVALID";
      bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    }
    if (bytes > limit) return "JSON_LIMIT";
  }
  return bytes;
}
function sourceResult(text: string, limit: number): number | string {
  try { return utf8SourceBytes(text, limit); }
  catch (error) { if (error instanceof KernelError) return error.code; throw error; }
}
const limitError = (error: unknown): boolean => error instanceof KernelError && error.code === "JSON_LIMIT";

test("source bytes match the UTF-8 oracle for every BMP code unit and valid astral boundaries", () => {
  for (let code = 0; code <= 0xffff; code++) {
    const text = String.fromCharCode(code);
    const expected = code >= 0xd800 && code <= 0xdfff ? "JSON_INVALID" : Buffer.byteLength(text, "utf8");
    assert.equal(sourceResult(text, 4), expected, `U+${code.toString(16)}`);
  }
  for (const code of [0x10000, 0x1f600, 0x1ffff, 0xfffff, 0x10ffff]) {
    const text = "ASCII" + String.fromCodePoint(code) + "한글\ufeffend";
    const bytes = Buffer.byteLength(text, "utf8");
    assert.equal(utf8SourceBytes(text, bytes), bytes);
    assert.equal(sourceResult(text, bytes - 1), "JSON_LIMIT");
  }
});

test("bounded ASCII scanning preserves the first source error and surrogate pairs at the prefix boundary", () => {
  const cases: [string, number, number | string][] = [
    ["aaa\ud800", 2, "JSON_LIMIT"], ["aaa\ud800", 3, "JSON_INVALID"],
    ["aaa\ud800\udc00", 3, "JSON_LIMIT"], ["aaa\ud800\udc00", 7, 7],
    ["aaa\udc00", 2, "JSON_LIMIT"], ["aaa\udc00", 3, "JSON_INVALID"],
    ["é\ud800", 1, "JSON_LIMIT"], ["é\ud800", 2, "JSON_INVALID"],
    ["\ud800\udc00", 0, "JSON_LIMIT"], ["\ud800", 0, "JSON_INVALID"],
    ["x".repeat(262_144) + "\ud800", 2, "JSON_LIMIT"], ["", 0, 0],
  ];
  for (const [text, limit, expected] of cases) assert.equal(sourceResult(text, limit), expected);
  let seed = 0x51a23d;
  const next = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const alphabet = ["a", "z", "\n", "é", "\u07ff", "\u0800", "한", "\ud800", "\udc00", "😀", "\ufeff"];
  for (let run = 0; run < 2000; run++) {
    let text = "x".repeat(next() % 32);
    for (let index = 0, count = next() % 16; index < count; index++) text += alphabet[next() % alphabet.length];
    for (const limit of [-1, 0, 1, 2, 3, 4, text.length, text.length * 4, Infinity, NaN]) {
      assert.equal(sourceResult(text, limit), sourceOracle(text, limit), `${JSON.stringify(text)} at ${limit}`);
    }
  }
});

test("repeated canonical strings preserve quoting, sorted keys and exact expanded byte limits", () => {
  const strings = ["", 'quote"slash\\', "\u0000\b\t\n\f\r\u001f", "é한😀\ufeff", "\ud800", "\udc00", "\ud800x\udc00", "constructor", "__proto__"];
  for (const text of strings) {
    const item = Object.fromEntries([["z", text], [text, [text, text]], ["a", text]]);
    const expected = "{" + Object.keys(item).sort().map((key) => `${JSON.stringify(key)}:${JSON.stringify(item[key])}`).join(",") + "}";
    const bytes = Buffer.byteLength(expected, "utf8");
    assert.equal(canonicalJson(item, bytes), expected);
    assert.throws(() => canonicalJson(item, bytes - 1), limitError);
  }
  const repeated = Array.from({ length: 5000 }, (_, index) => `text.${index}.é\n\ud800`);
  const values = [...repeated, ...repeated];
  const expected = JSON.stringify(values);
  const bytes = Buffer.byteLength(expected, "utf8");
  assert.equal(canonicalJson(values, bytes), expected);
  assert.throws(() => canonicalJson(values, bytes - 1), limitError);
});

test("string reuse remains per call, respects entry and character budgets, and waits for full preflight", (context) => {
  const original = JSON.stringify;
  const calls = new Map<string, number>();
  context.mock.method(JSON, "stringify", (value: unknown) => {
    if (typeof value === "string") calls.set(value, (calls.get(value) ?? 0) + 1);
    return original(value);
  });
  assert.equal(canonicalJson(["repeat", "repeat"]), '["repeat","repeat"]');
  assert.equal(calls.get("repeat"), 1);
  canonicalJson(["repeat", "repeat"]);
  assert.equal(calls.get("repeat"), 2, "another call must validate and quote independently");

  const distinct = Array.from({ length: 4097 }, (_, index) => `entry.${index}`);
  canonicalJson([...distinct, distinct[0], distinct[4096]]);
  assert.equal(calls.get(distinct[0]!), 1);
  assert.equal(calls.get(distinct[4096]!), 2, "strings beyond the entry budget take the normal path");

  // ASCII quoted output adds two characters: source + quoted exactly fills 4 Mi.
  const fits = "a".repeat(2 * 1024 * 1024 - 1);
  const bypass = fits + "b";
  for (const text of [fits, bypass]) {
    const expected = original([text, text]);
    assert.equal(canonicalJson([text, text], expected.length), expected);
  }
  assert.equal(calls.get(fits), 1);
  assert.equal(calls.get(bypass), 2, "the reserved source plus quoted characters must fit");
  assert.throws(() => canonicalJson([bypass, bypass], bypass.length * 2 + 6), limitError);

  let getterCalls = 0;
  const invalid = Object.defineProperty({}, "value", { enumerable: true, get() { getterCalls++; return true; } });
  assert.throws(() => canonicalJson(["preflight.only", invalid]), (error: unknown) => error instanceof KernelError && error.code === "JSON_INVALID");
  assert.equal(calls.has("preflight.only"), false, "no quoted output is allocated for a rejected shape");
  assert.equal(getterCalls, 0);
});
