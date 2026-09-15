import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { JsonObject } from "../src/contracts.ts";
import { importDtcgFoundation, exportFoundationDtcg } from "../src/foundation-interchange.ts";
import { resolveFoundationTokens } from "../src/foundation-resolution.ts";
import { foundation, themed, token } from "./foundation-fixtures.ts";

const options = () => {
  let next = 0;
  return { id: "foundation.import", name: "Imported", revision: "r1", sourceUri: "memory:tokens", createId: () => `token.import${++next}`, digest: (text: string) => createHash("sha256").update(text).digest("hex") };
};

test("imports flat explicit types and aliases while preserving exact original bytes and extensions", () => {
  const text = '{\n  "$extensions": {"vendor": {"unknown": true}}, "base": {"$type":"number","$value":12,"$description":"간격","$extensions":{"vendor":{"future":[1,2]}}},\n"alias":{"$type":"number","$value":"{base}"}\n}\n';
  const imported = importDtcgFoundation(text, options());
  assert.equal(imported.valid, true, JSON.stringify(imported.diagnostics));
  assert.equal(imported.originalText, text);
  assert.equal((imported.document!.originalSources[0] as JsonObject).originalText, text);
  assert.equal(resolveFoundationTokens(imported.document).tokens[1]!.value, 12);
  const authored = exportFoundationDtcg(imported.document);
  assert.equal(authored.valid, true, JSON.stringify(authored.diagnostics));
  assert.deepEqual(JSON.parse(authored.text!), JSON.parse(text));
  imported.document!.tokens[0]!.value = { literal: 99 };
  const original = exportFoundationDtcg(imported.document, "original");
  assert.equal(original.text, text); assert.equal(original.valid, true);
  assert.ok(original.diagnostics.some(item => item.message.includes("not an export")));
  assert.equal(JSON.parse(exportFoundationDtcg(imported.document).text!).base.$value, 99);
});

test("rejects unsupported exchange atomically and keeps raw sources available", () => {
  const unsupported = [
    { group: { nested: { $type: "unknown", $value: 1 } } },
    { $type: "unknown", base: { $value: 1 } },
    { base: { $type: "number", $value: 1, $deprecated: 1 } },
    { base: { $type: "number", $value: { $ref: "#/other/$value" } } },
    { base: { $type: "number", $value: 1 }, alias: { $type: "number", $value: "{missing}" } },
    { sets: {}, modifiers: {}, resolutionOrder: [] },
  ];
  for (const value of unsupported) {
    const text = JSON.stringify(value);
    const result = importDtcgFoundation(text, options());
    assert.equal(result.valid, false); assert.equal(result.document, undefined); assert.equal(result.originalText, text);
    assert.ok(result.diagnostics.some(item => item.severity === "error"));
  }
  for (const text of ['{"base":{"$type":"number","$value":1,"$value":2}}', '{"base":{"$type":"number","$value":9007199254740993}}', '{']) assert.equal(importDtcgFoundation(text, options()).valid, false);
});

test("does not execute option getters and rejects broken injected services", () => {
  const text = '{"base":{"$type":"number","$value":1}}';
  let calls = 0; const injected = options();
  Object.defineProperty(injected, "createId", { enumerable: true, get() { calls++; return () => "token.test"; } });
  assert.equal(importDtcgFoundation(text, injected).valid, false); assert.equal(calls, 0);
  assert.equal(importDtcgFoundation(text, { ...options(), digest: () => "bad" }).valid, false);
  assert.equal(importDtcgFoundation(text, { ...options(), createId: () => "__proto__" }).valid, false);
  const duplicate = '{"one":{"$type":"number","$value":1},"two":{"$type":"number","$value":2}}';
  assert.equal(importDtcgFoundation(duplicate, { ...options(), createId: () => "token.same" }).valid, false);
});

test("authored exchange refuses contextual flattening, unknown data and name collisions", () => {
  assert.equal(exportFoundationDtcg(themed()).valid, false);
  const unknown = foundation(); unknown.metadata = { private: 3 };
  assert.equal(exportFoundationDtcg(unknown).valid, false);
  const collision = foundation([token("token.one"), token("token.two")]);
  (collision.tokens as JsonObject[])[1]!.name = "one";
  assert.equal(exportFoundationDtcg(collision).valid, false);
  const dotted = foundation(); (dotted.tokens as JsonObject[])[0]!.name = "base.value";
  assert.equal(exportFoundationDtcg(dotted).valid, true);
  assert.equal(JSON.parse(exportFoundationDtcg(dotted).text!).base.value.$value, 1);
  assert.equal(exportFoundationDtcg(foundation(), "original").valid, false);
});

test("treats prototype-named DTCG token names as data without prototype mutation", () => {
  const text = '{"__proto__":{"$type":"number","$value":1},"constructor":{"$type":"number","$value":"{__proto__}"}}';
  const imported = importDtcgFoundation(text, options());
  assert.equal(imported.valid, true, JSON.stringify(imported.diagnostics));
  const exported = exportFoundationDtcg(imported.document);
  assert.equal(exported.valid, true); assert.deepEqual(JSON.parse(exported.text!), JSON.parse(text));
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
});
