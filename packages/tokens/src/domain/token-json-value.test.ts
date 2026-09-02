import { describe, expect, it } from "vitest";

import { isTokenJsonObject } from "./token-json-value.js";

describe("Token JSON value structure", () => {
  it("recognizes object values without accepting arrays or null", () => {
    expect(isTokenJsonObject({ value: 1, unit: "rem" })).toBe(true);
    expect(isTokenJsonObject([1, "rem"])).toBe(false);
    expect(isTokenJsonObject(null)).toBe(false);
  });
});
