/** Package-wide parser profile and diagnostic constants. */
export const DTCG_PROFILE_VERSION = "2025.10" as const;
export const DTCG_SOURCE_UNITS: ReadonlySet<string> = new Set(["px", "rem", "ms", "s"]);
export const UNKNOWN_SOURCE_NAME = "<unknown>";
export const TOKEN_DIAGNOSTIC_PHASE = "token" as const;
export const ERROR_DIAGNOSTIC_SEVERITY = "error" as const;
export const ROOT_JSON_POINTER_PREFIX = "#";
export const ROOT_JSON_POINTER_PREFIX_LENGTH = ROOT_JSON_POINTER_PREFIX.length;
export const EMPTY_JSON_POINTER = "";

export const PARSER_DIAGNOSTIC_CODE = {
  MISSING_SOURCE: "AXT0001",
  PARSE_FAILURE: "AXT0002",
  UNSUPPORTED_DTCG_TYPE: "AXT1200",
  UNSUPPORTED_DTCG_UNIT: "AXT1203",
} as const;

export const PARSER_ERROR_MESSAGE = {
  MISSING_SOURCE: "At least one Token source is required.",
  PARSE_FAILURE: "DTCG source parsing failed.",
  NORMALIZATION_FAILURE: "Axiom Token normalization failed.",
} as const;

export const TOKEN_REFERENCE_PATTERN = /^\{([^{}]+)\}$/;
