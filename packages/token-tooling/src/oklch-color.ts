import {
  isTokenJsonObject,
  type TokenJsonValue,
} from "@axiom/tokens";

export interface OklchComponentPrecision {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
}

export interface CanonicalOklchColorValue extends Readonly<Record<string, TokenJsonValue>> {
  readonly colorSpace: "oklch";
  readonly components: readonly [number, number, number];
  readonly alpha: number;
  readonly hex: string;
}

export type OklchColorIssue =
  | "invalid-color-space"
  | "invalid-components"
  | "invalid-alpha"
  | "invalid-hex"
  | "excess-precision"
  | "non-canonical-achromatic-hue"
  | "fallback-mismatch";

type ColorTriplet = readonly [number, number, number];

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;
const HEX_RADIX = 16;
const BYTE_MAX = 255;
const HUE_TURN_DEGREES = 360;
const DEGREES_TO_RADIANS = Math.PI / 180;
const SRGB_LINEAR_THRESHOLD = 0.0031308;
const SRGB_CHANNEL_THRESHOLD = 0.04045;
const GAMUT_EPSILON = 1e-7;
const GAMUT_SEARCH_STEPS = 32;
const ACHROMATIC_EPSILON = 1e-12;

const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const hasPrecision = (value: number, digits: number): boolean =>
  Math.abs(roundTo(value, digits) - value) <= Number.EPSILON * Math.max(1, Math.abs(value));

const channelToHex = (channel: number): string =>
  Math.round(Math.min(1, Math.max(0, channel)) * BYTE_MAX)
    .toString(HEX_RADIX)
    .padStart(2, "0");

const linearToSrgb = (channel: number): number =>
  channel <= SRGB_LINEAR_THRESHOLD
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055;

const srgbToLinear = (channel: number): number =>
  channel <= SRGB_CHANNEL_THRESHOLD
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;

const oklchToLinearSrgb = ([lightness, chroma, hue]: ColorTriplet): ColorTriplet => {
  const hueRadians = hue * DEGREES_TO_RADIANS;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

const isInSrgbGamut = (channels: ColorTriplet): boolean =>
  channels.every(
    (channel) => channel >= -GAMUT_EPSILON && channel <= 1 + GAMUT_EPSILON,
  );

const mapOklchToSrgb = (components: ColorTriplet): ColorTriplet => {
  let mapped = oklchToLinearSrgb(components);
  if (!isInSrgbGamut(mapped)) {
    let lowerChroma = 0;
    let upperChroma = components[1];
    for (let step = 0; step < GAMUT_SEARCH_STEPS; step += 1) {
      const candidateChroma = (lowerChroma + upperChroma) / 2;
      const candidate = oklchToLinearSrgb([
        components[0],
        candidateChroma,
        components[2],
      ]);
      if (isInSrgbGamut(candidate)) lowerChroma = candidateChroma;
      else upperChroma = candidateChroma;
    }
    mapped = oklchToLinearSrgb([components[0], lowerChroma, components[2]]);
  }
  return mapped.map((channel) => linearToSrgb(Math.min(1, Math.max(0, channel)))) as unknown as ColorTriplet;
};

const serializeSrgbHex = (components: ColorTriplet): string =>
  `#${components.map(channelToHex).join("")}`;

export const parseSrgbHex = (hex: string): ColorTriplet => {
  if (!HEX_COLOR_PATTERN.test(hex)) {
    throw new Error(`Expected a lowercase six-digit sRGB hex color, received '${hex}'.`);
  }
  return [
    Number.parseInt(hex.slice(1, 3), HEX_RADIX) / BYTE_MAX,
    Number.parseInt(hex.slice(3, 5), HEX_RADIX) / BYTE_MAX,
    Number.parseInt(hex.slice(5, 7), HEX_RADIX) / BYTE_MAX,
  ];
};

export const oklchToSrgbHex = (components: ColorTriplet): string =>
  serializeSrgbHex(mapOklchToSrgb(components));

export const srgbToOklch = (
  components: ColorTriplet,
  precision: OklchComponentPrecision,
): ColorTriplet => {
  const [red, green, blue] = components.map(srgbToLinear) as unknown as ColorTriplet;
  const lRoot = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const mRoot = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const sRoot = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  const lightness = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const b = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
  const chroma = Math.sqrt(a ** 2 + b ** 2);
  const roundedChroma = roundTo(chroma, precision.chroma);
  const hue = roundedChroma === 0 || chroma <= ACHROMATIC_EPSILON
    ? 0
    : (Math.atan2(b, a) / DEGREES_TO_RADIANS + HUE_TURN_DEGREES) % HUE_TURN_DEGREES;
  return [
    roundTo(lightness, precision.lightness),
    roundedChroma,
    roundTo(hue, precision.hue),
  ];
};

export const createOklchColorValueFromSrgb = (
  components: ColorTriplet,
  alpha: number,
  precision: OklchComponentPrecision,
): CanonicalOklchColorValue => ({
  colorSpace: "oklch",
  components: srgbToOklch(components, precision),
  alpha,
  hex: serializeSrgbHex(components),
});

export const validateOklchColorValue = (
  value: TokenJsonValue,
  precision: OklchComponentPrecision,
): readonly OklchColorIssue[] => {
  if (!isTokenJsonObject(value)) return ["invalid-components"];
  const issues: OklchColorIssue[] = [];
  if (value["colorSpace"] !== "oklch") issues.push("invalid-color-space");

  const componentValue = value["components"];
  const componentsValid =
    Array.isArray(componentValue) &&
    componentValue.length === 3 &&
    componentValue.every((component) => typeof component === "number" && Number.isFinite(component)) &&
    typeof componentValue[0] === "number" &&
    componentValue[0] >= 0 &&
    componentValue[0] <= 1 &&
    typeof componentValue[1] === "number" &&
    componentValue[1] >= 0 &&
    typeof componentValue[2] === "number" &&
    componentValue[2] >= 0 &&
    componentValue[2] < HUE_TURN_DEGREES;
  if (!componentsValid) issues.push("invalid-components");

  const alpha = value["alpha"];
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    issues.push("invalid-alpha");
  }

  const hex = value["hex"];
  const hexValid = typeof hex === "string" && HEX_COLOR_PATTERN.test(hex);
  if (!hexValid) issues.push("invalid-hex");

  if (componentsValid) {
    const components = componentValue as unknown as ColorTriplet;
    if (
      !hasPrecision(components[0], precision.lightness) ||
      !hasPrecision(components[1], precision.chroma) ||
      !hasPrecision(components[2], precision.hue)
    ) {
      issues.push("excess-precision");
    }
    if (components[1] === 0 && components[2] !== 0) {
      issues.push("non-canonical-achromatic-hue");
    }
    if (hexValid && oklchToSrgbHex(components) !== hex) {
      issues.push("fallback-mismatch");
    }
  }
  return issues;
};
