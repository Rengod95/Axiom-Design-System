import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { browserDigest, createBrowserServices } from "../src/browser-services.ts";

test("browser SHA-256 matches known answers and independent native UTF-8 digests", () => {
  assert.equal(browserDigest(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(browserDigest("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  for (const text of ["한글 🧭\n원본", "a".repeat(1_000_000), "x".repeat(55), "x".repeat(56), "x".repeat(63), "x".repeat(64), "\ud800", "\u0000\u0001\u007f"]) {
    assert.equal(browserDigest(text), createHash("sha256").update(text, "utf8").digest("hex"));
  }
  assert.throws(() => browserDigest(42 as unknown as string), { code: "BROWSER_STORE_STATE" });
});

test("browser identity services bind crypto capability and refuse an unavailable generator", () => {
  let counter = 0;
  const provider: Pick<Crypto, "randomUUID"> = { randomUUID: () => `10000000-0000-4000-8000-${String(++counter).padStart(12, "0")}` };
  const services = createBrowserServices(provider);
  provider.randomUUID = () => { throw new Error("A later provider mutation must not replace the bound capability"); };
  assert.notEqual(services.createId(), services.createId());
  assert.match(services.createId(), /^browser-10000000-/);
  assert.equal(services.digest("abc"), browserDigest("abc"));
  assert.throws(() => createBrowserServices({} as Pick<Crypto, "randomUUID">), { code: "BROWSER_STORE_UNAVAILABLE" });
});
