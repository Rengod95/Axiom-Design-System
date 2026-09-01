/** Package-wide protocol, file, and diagnostic constants for specification tooling. */
export const SPEC_MANIFEST_SCHEMA_VERSION = "0.1" as const;
export const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema" as const;
export const SPEC_MANIFEST_SCHEMA_PATH = "spec-manifest.schema.json";
export const SPEC_MANIFEST_PATH = "manifest.json";
export const JSON_FILE_SUFFIX = ".json";
export const JSON_SCHEMA_FILE_SUFFIX = ".schema.json";
export const JSON_INDENT_SPACES = 2;
export const STABLE_SORT_LOCALE = "en";
export const CANONICAL_DIGEST_ALGORITHM = "sha256";
export const CANONICAL_DIGEST_PREFIX = `${CANONICAL_DIGEST_ALGORITHM}:`;
export const IN_MEMORY_SOURCE_NAME = "<memory>";
export const TOKEN_DIAGNOSTIC_PHASE = "token" as const;
export const STATE_DIAGNOSTIC_PHASE = "behavior" as const;
export const CONDITION_DIAGNOSTIC_PHASE = "condition" as const;
export const ERROR_DIAGNOSTIC_SEVERITY = "error" as const;
export const REQUIRED_RESOLVED_THEMES = ["light", "dark"] as const;
export const DIAGNOSTIC_SEVERITIES = ["error", "info", "warning"] as const;
export const DIAGNOSTIC_PHASES = [
  "behavior",
  "compiler",
  "condition",
  "motion",
  "normalization",
  "property",
  "react",
  "recipe",
  "schema",
  "token",
] as const;
export const SEMANTIC_VALIDATOR_IDS = [
  "canonical-state-registry",
  "condition-expression",
  "condition-registry",
  "parsed-token-document",
  "resolved-token-manifest",
  "token-context-override",
  "token-domain-registry",
  "token-identity",
] as const;
export const FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID =
  "foundation-resolved-token-manifest";
export const CONDITION_REGISTRY_ID = "condition-registry";
export const BREAKPOINT_TOKEN_DOMAIN = "breakpoint";
export const BREAKPOINT_DTCG_TYPE = "dimension";
export const BREAKPOINT_SOURCE_UNIT = "rem";
export const REQUIRED_CANONICAL_STATE_IDS = [
  "checked",
  "disabled",
  "entering",
  "exiting",
  "expanded",
  "focused",
  "focusVisible",
  "hovered",
  "indeterminate",
  "invalid",
  "motionSuppressed",
  "open",
  "orientation",
  "pending",
  "pressed",
  "readOnly",
  "required",
  "selected",
] as const;
export const REQUIRED_CONDITION_IDS = [
  "container.inline.belowCompact",
  "container.inline.belowRegular",
  "container.inline.belowWide",
  "container.inline.compact",
  "container.inline.regular",
  "container.inline.wide",
  "preference.reducedMotion",
  "viewport.width.belowLg",
  "viewport.width.belowMd",
  "viewport.width.belowSm",
  "viewport.width.lg",
  "viewport.width.md",
  "viewport.width.sm",
] as const;
export const TOKEN_ID_DOMAIN_SEGMENT_INDEX = 0;
export const TOKEN_ID_TIER_SEGMENT_INDEX = 1;

export const CONSTRAINT_REQUIRED_DTCG_TYPE = {
  dimensionRange: "dimension",
  durationRange: "duration",
  numberRange: "number",
} as const;

export const SPEC_DIAGNOSTIC_CODE = {
  DUPLICATE_STATE_ID: "AXS1001",
  STATE_ORDER: "AXS1002",
  DUPLICATE_CONTAINER_ID: "AXC1001",
  CONTAINER_ORDER: "AXC1002",
  DUPLICATE_CONDITION_ID: "AXC1003",
  CONDITION_ORDER: "AXC1004",
  CONDITION_ID_KIND_MISMATCH: "AXC1005",
  UNKNOWN_CONTAINER: "AXC1006",
  INVALID_BREAKPOINT_REFERENCE: "AXC1007",
  UNKNOWN_BREAKPOINT_TOKEN: "AXC1008",
  INVALID_BREAKPOINT_TOKEN: "AXC1009",
  THEME_VARIANT_BREAKPOINT: "AXC1010",
  UNKNOWN_CONDITION: "AXC1101",
  CONTRADICTORY_CONDITION_RANGE: "AXC1102",
  DUPLICATE_DOMAIN_ID: "AXT1001",
  DUPLICATE_DOMAIN_ROOT: "AXT1002",
  DOMAIN_ROOT_MISMATCH: "AXT1003",
  DOMAIN_ORDER: "AXT1004",
  CONSTRAINT_TYPE_MISMATCH: "AXT1005",
  CONSTRAINT_MINIMUM_CONFLICT: "AXT1006",
  CONSTRAINT_MAXIMUM_CONFLICT: "AXT1007",
  DOMAIN_IDENTITY_MISMATCH: "AXT1101",
  TIER_IDENTITY_MISMATCH: "AXT1102",
  DUPLICATE_TOKEN: "AXT1301",
  TOKEN_ORDER: "AXT1302",
  PRIMITIVE_CONTEXT_OVERRIDE: "AXT1503",
  CONTEXT_ORDER: "AXT1600",
  CONTEXT_TOKEN_SET_MISMATCH: "AXT1601",
  UNKNOWN_RESOLVED_DEPENDENCY: "AXT1602",
  UNRESOLVED_ALIAS: "AXT1603",
} as const;

export const TOKEN_REFERENCE_PATTERN = /^\{[^{}]+\}$/;
