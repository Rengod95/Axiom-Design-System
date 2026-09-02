import { describe, expect, it } from "vitest";

import {
  createOklchColorValueFromSrgb,
  oklchToSrgbHex,
  parseSrgbHex,
  srgbToOklch,
  validateOklchColorValue,
} from "./oklch-color.js";

const PROFILE_PRECISION = {
  lightness: 6,
  chroma: 6,
  hue: 3,
} as const;

describe("canonical OKLCH colors", () => {
  it("round-trips registered sRGB fallbacks through perceptual components", () => {
    const srgb = parseSrgbHex("#2377e8");
    const color = createOklchColorValueFromSrgb(srgb, 1, PROFILE_PRECISION);

    expect(color.colorSpace).toBe("oklch");
    expect(color.hex).toBe("#2377e8");
    expect(oklchToSrgbHex(color.components)).toBe("#2377e8");
    expect(validateOklchColorValue(color, PROFILE_PRECISION)).toEqual([]);
  });

  it("maps known OKLCH endpoints and red to six-digit sRGB", () => {
    expect(createOklchColorValueFromSrgb([1, 1, 1], 1, PROFILE_PRECISION).components)
      .toEqual([1, 0, 0]);
    expect(oklchToSrgbHex([1, 0, 0])).toBe("#ffffff");
    expect(oklchToSrgbHex([0, 0, 0])).toBe("#000000");
    expect(oklchToSrgbHex([0.627955, 0.257683, 29.234])).toBe("#ff0000");
  });

  it("rejects non-canonical space, precision, hex, and fallback values", () => {
    expect(validateOklchColorValue({
      colorSpace: "srgb",
      components: [0.1, 0.2, 0.3],
      alpha: 1,
      hex: "#123456",
    }, PROFILE_PRECISION)).toContain("invalid-color-space");
    expect(validateOklchColorValue({
      colorSpace: "oklch",
      components: [0.1234567, 0.1, 20],
      alpha: 1,
      hex: "#123456",
    }, PROFILE_PRECISION)).toContain("excess-precision");
    expect(validateOklchColorValue({
      colorSpace: "oklch",
      components: srgbToOklch([1, 0, 0], PROFILE_PRECISION),
      alpha: 1,
      hex: "#00ff00",
    }, PROFILE_PRECISION)).toContain("fallback-mismatch");
    expect(validateOklchColorValue({
      colorSpace: "oklch",
      components: [0, 0, 0],
      alpha: 1,
      hex: "#000000ff",
    }, PROFILE_PRECISION)).toContain("invalid-hex");
    expect(validateOklchColorValue({
      colorSpace: "oklch",
      components: [1, 0, 90],
      alpha: 1,
      hex: "#ffffff",
    }, PROFILE_PRECISION)).toContain("non-canonical-achromatic-hue");
  });
});
