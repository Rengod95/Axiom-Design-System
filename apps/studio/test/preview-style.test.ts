import test from "node:test";
import assert from "node:assert/strict";
import { closeActionSize, inheritPreviewText } from "../src/preview-style.ts";

test("unconfigured text leaves inherit the resolved root typography without inheriting its box", () => {
  const root = { color: "rgb(12, 34, 56)", fontSize: 27, background: "white", opacity: 0.5, borderWidth: 3 };
  assert.deepEqual(inheritPreviewText(root, {}), { color: root.color, fontSize: 27 });
  assert.deepEqual(inheritPreviewText(root, { color: "red", fontSize: 18 }), { color: "red", fontSize: 18 });
  assert.deepEqual(inheritPreviewText({}, { color: "red" }), { color: "red" });
});

test("Toast close hit area enforces each preview profile minimum without shrinking larger declarations", () => {
  assert.deepEqual(closeActionSize("Web", 34), { minWidth: 44, minHeight: 44 });
  assert.deepEqual(closeActionSize("Mobile", 34), { minWidth: 48, minHeight: 48 });
  assert.deepEqual(closeActionSize("Mobile", 80), { minWidth: 48, minHeight: 80 });
});
