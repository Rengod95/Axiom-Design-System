import type { FoundationTokenType } from "./foundation-contracts.ts";
import { STUDIO_RESOLVER } from "./studio-constants.ts";

export const FOUNDATION_TOKEN_TYPES: readonly FoundationTokenType[] = Object.freeze(["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"]);
export const FOUNDATION_COLOR_SPACES = Object.freeze(["srgb", "srgb-linear", "hsl", "hwb", "lab", "lch", "oklab", "oklch", "display-p3", "a98-rgb", "prophoto-rgb", "rec2020", "xyz-d65", "xyz-d50"]);
export const FOUNDATION_CODES = Object.freeze({ INVALID: "FOUNDATION_INVALID", VALUE: "FOUNDATION_VALUE_INVALID", UNSUPPORTED: "FOUNDATION_UNSUPPORTED", ALIAS: "FOUNDATION_ALIAS_INVALID", CYCLE: "FOUNDATION_ALIAS_CYCLE", CONTEXT: "FOUNDATION_CONTEXT_INVALID", EXCHANGE: "FOUNDATION_EXCHANGE_UNSUPPORTED", LIMIT: "FOUNDATION_LIMIT" });
export const MAX_FOUNDATION_DIAGNOSTICS = 128;
export const FOUNDATION_RESOLVER_ID = STUDIO_RESOLVER.id;
export const FOUNDATION_RESOLVER_VERSION = STUDIO_RESOLVER.version;
