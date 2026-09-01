/** Package-wide protocol and policy constants for `@axiom/tokens`. */
export const DTCG_TYPES = [
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
  "typography",
] as const;

export const TOKEN_TIERS = ["primitive", "semantic", "component"] as const;

export const TOKEN_SCHEMA_VERSION = "0.1" as const;
export const RESOLVED_TOKEN_SCHEMA_VERSION = "0.2" as const;
export const TOKEN_DIAGNOSTIC_PHASE = "token" as const;
export const TOKEN_DIAGNOSTIC_SEVERITIES = ["error", "warning", "info"] as const;
export const DEFAULT_DIAGNOSTIC_SEVERITY = "error" as const;
export const INFORMATION_DIAGNOSTIC_SEVERITY = "info" as const;
export const JSON_INDENT_SPACES = 2;
export const TOKEN_ID_MINIMUM_SEGMENT_COUNT = 3;
export const TOKEN_ID_DOMAIN_SEGMENT_INDEX = 0;
export const TOKEN_ID_TIER_SEGMENT_INDEX = 1;
export const MILLISECONDS_PER_SECOND = 1_000;
export const STABLE_SORT_LOCALE = "en";

export const TOKEN_DIAGNOSTIC_CODE = {
  MISSING_IDENTITY_SEGMENTS: "AXT1100",
  UNKNOWN_DOMAIN: "AXT1103",
  UNKNOWN_TIER: "AXT1104",
  INVALID_PATH_SEGMENT: "AXT1105",
  DOMAIN_TYPE_MISMATCH: "AXT1201",
  DOMAIN_CONSTRAINT_VIOLATION: "AXT1202",
  DUPLICATE_TOKEN: "AXT1301",
  UNKNOWN_REFERENCE: "AXT1400",
  FORBIDDEN_TIER_EDGE: "AXT1401",
  ALIAS_DOMAIN_MISMATCH: "AXT1402",
  ALIAS_TYPE_MISMATCH: "AXT1403",
  ALIAS_CYCLE: "AXT1404",
  INVALID_COMPONENT_ALIAS: "AXT1405",
  INVALID_CONTEXT: "AXT1500",
  CONTEXT_SET_MISMATCH: "AXT1501",
  CONTEXT_INTRODUCES_TOKEN: "AXT1502",
  PRIMITIVE_CONTEXT_OVERRIDE: "AXT1503",
  CONTEXT_IDENTITY_MISMATCH: "AXT1504",
  MISSING_COMPONENT_OVERRIDE_DESCRIPTION: "AXT1505",
  COMPONENT_OVERRIDE_REVIEW: "AXT1506",
} as const;

export const TOKEN_ERROR_MESSAGE = {
  GRAPH_VALIDATION_FAILURE: "Axiom Token graph validation failed.",
  CONTEXT_RESOLUTION_FAILURE: "Axiom Token context resolution failed.",
} as const;

export const TOKEN_REFERENCE_PATTERN = /^\{([^{}]+)\}$/;
export const TOKEN_ID_HEAD_SEGMENT_PATTERN = /^[a-z][A-Za-z0-9]*$/;
export const TOKEN_ID_PATH_SEGMENT_PATTERN = /^[a-z0-9][A-Za-z0-9]*$/;
