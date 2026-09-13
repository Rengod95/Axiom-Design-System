import test from "node:test";
import assert from "node:assert/strict";
import { summarizeField } from "../src/review-diff.ts";

test("review presentation narrows large unchanged token collections without losing changed values", () => {
  assert.deepEqual(summarizeField({ path: "/tokens", before: [{ id: "token.one", value: { literal: [1, 0, 0] } }, { id: "token.two", value: 4 }], after: [{ id: "token.one", value: { literal: [0, 1, 0] } }, { id: "token.two", value: 4 }] }), [
    { path: "/tokens/0/value/literal/0", before: 1, after: 0 }, { path: "/tokens/0/value/literal/1", before: 0, after: 1 },
  ]);
});

test("review preserves absence versus null and escapes JSON pointer keys", () => {
  assert.deepEqual(summarizeField({ path: "/metadata", before: { "a/b~": null, remove: false }, after: { "a/b~": false, create: null } }), [
    { path: "/metadata/a~1b~0", before: null, after: false }, { path: "/metadata/remove", before: false }, { path: "/metadata/create", after: null },
  ]);
});

test("summary limits fall back to the entire approved field instead of truncating changed values", () => {
  const field = { path: "/many", before: Object.fromEntries(Array.from({ length: 100 }, (_, index) => [index, 1])), after: Object.fromEntries(Array.from({ length: 100 }, (_, index) => [index, 2])) };
  assert.deepEqual(summarizeField(field), [field]);
});
