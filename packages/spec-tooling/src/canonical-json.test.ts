import { describe, expect, it } from "vitest";

import { canonicalJson, canonicalJsonDigest } from "./canonical-json.js";

describe("canonical JSON", () => {
  it("sorts object keys recursively while preserving array order", () => {
    expect(canonicalJson({ z: [{ b: 2, a: 1 }], a: -0 })).toBe(
      '{\n  "a": 0,\n  "z": [\n    {\n      "a": 1,\n      "b": 2\n    }\n  ]\n}\n',
    );
  });

  it("produces the same digest for equivalent object insertion orders", () => {
    expect(canonicalJsonDigest({ b: 2, a: 1 })).toBe(
      canonicalJsonDigest({ a: 1, b: 2 }),
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, undefined, 1n])(
    "rejects non-JSON value %s",
    (value) => {
      expect(() => canonicalJson({ value })).toThrow(TypeError);
    },
  );

  it("rejects cycles", () => {
    const value: Record<string, unknown> = {};
    value["self"] = value;
    expect(() => canonicalJson(value)).toThrow("cyclic values");
  });
});
