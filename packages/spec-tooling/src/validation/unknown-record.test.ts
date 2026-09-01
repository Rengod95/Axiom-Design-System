import { describe, expect, it } from "vitest";

import { isUnknownRecord } from "./unknown-record.js";

describe("unknown record structure", () => {
  it("recognizes non-array objects at specification trust boundaries", () => {
    expect(isUnknownRecord({ id: "condition-registry" })).toBe(true);
    expect(isUnknownRecord([])).toBe(false);
    expect(isUnknownRecord(null)).toBe(false);
    expect(isUnknownRecord("condition-registry")).toBe(false);
  });
});
