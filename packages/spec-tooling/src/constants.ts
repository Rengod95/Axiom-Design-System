/** Package-wide protocol, file, and diagnostic constants for specification tooling. */
export const SPEC_MANIFEST_SCHEMA_VERSION = "0.1" as const;
export const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema" as const;
export const SPEC_MANIFEST_SCHEMA_PATH = "spec-manifest.schema.json";
export const SPEC_MANIFEST_PATH = "manifest.json";
/** Pins the six registered schemas that compose Motion's authority-validation boundary. */
export const MOTION_AUTHORITY_SCHEMA_ENTRIES = [
  {
    key: "propertyRegistry",
    id: "https://axiom.dev/schemas/css/effective-property-registry/0.1",
    path: "css/effective-property-registry.schema.json",
    semanticValidator: undefined,
  },
  {
    key: "resolvedTokenManifest",
    id: "https://axiom.dev/schemas/token/resolved-manifest/0.2",
    path: "token/resolved-token-manifest.schema.json",
    semanticValidator: "resolved-token-manifest",
  },
  {
    key: "tokenDomainRegistry",
    id: "https://axiom.dev/schemas/token/domain-registry/0.1",
    path: "token/token-domain-registry.schema.json",
    semanticValidator: "token-domain-registry",
  },
  {
    key: "canonicalStateRegistry",
    id: "https://axiom.dev/schemas/state/canonical-state-registry/0.2",
    path: "state/canonical-state-registry.schema.json",
    semanticValidator: "canonical-state-registry",
  },
  {
    key: "conditionRegistry",
    id: "https://axiom.dev/schemas/condition/registry/0.1",
    path: "condition/condition-registry.schema.json",
    semanticValidator: "condition-registry",
  },
  {
    key: "appearance",
    id: "https://axiom.dev/schemas/css/appearance-ir/0.1",
    path: "css/appearance-ir.schema.json",
    semanticValidator: "css-appearance-ir",
  },
] as const;
export const JSON_FILE_SUFFIX = ".json";
export const JSON_SCHEMA_FILE_SUFFIX = ".schema.json";
export const JSON_INDENT_SPACES = 2;
export const STABLE_SORT_LOCALE = "en";
export const CANONICAL_DIGEST_ALGORITHM = "sha256";
export const CANONICAL_DIGEST_PREFIX = `${CANONICAL_DIGEST_ALGORITHM}:`;
export const IN_MEMORY_SOURCE_NAME = "<memory>";
export const TOKEN_DIAGNOSTIC_PHASE = "token" as const;
export const STATE_DIAGNOSTIC_PHASE = "behavior" as const;
export const BEHAVIOR_DIAGNOSTIC_PHASE = "behavior" as const;
export const CONDITION_DIAGNOSTIC_PHASE = "condition" as const;
export const MOTION_DIAGNOSTIC_PHASE = "motion" as const;
export const ERROR_DIAGNOSTIC_SEVERITY = "error" as const;
export const WARNING_DIAGNOSTIC_SEVERITY = "warning" as const;
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
  "behavior-criteria-source-manifest",
  "component-behavior-criteria-profile",
  "canonical-state-registry",
  "css-appearance-ir",
  "css-collision-trace",
  "motion-ir",
  "condition-expression",
  "condition-registry",
  "parsed-token-document",
  "resolved-token-manifest",
  "semantic-token-vocabulary",
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
export const BEHAVIOR_PROVIDER_ID = "react-aria" as const;
export const BEHAVIOR_SOURCE_SCHEMA_VERSION = "0.1" as const;
export const BEHAVIOR_REQUIRED_PACKAGE_NAMES = [
  "react-aria",
  "react-aria-components",
  "react-stately",
] as const;
export const BEHAVIOR_COMPONENT_IDS = ["button", "dialog", "select"] as const;
export const BEHAVIOR_CRITERION_PREFIX = {
  button: "BTN",
  dialog: "DLG",
  select: "SEL",
} as const;
export const BEHAVIOR_RETRIEVAL_POLICY = "pinned-artifact" as const;
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
export const REQUIRED_SEMANTIC_COLOR_ROLE_IDS = [
  "background",
  "surface",
  "fill",
  "text",
  "icon",
  "border",
  "status",
  "focus",
  "backdrop",
  "selection",
] as const;
export const TOKEN_ID_DOMAIN_SEGMENT_INDEX = 0;
export const TOKEN_ID_TIER_SEGMENT_INDEX = 1;

export const CONSTRAINT_REQUIRED_DTCG_TYPE = {
  dimensionRange: "dimension",
  durationRange: "duration",
  numberRange: "number",
} as const;

export const SPEC_DIAGNOSTIC_CODE = {
  BEHAVIOR_EVIDENCE_DIGEST_MISMATCH: "AXB1102",
  BEHAVIOR_SOURCE_MANIFEST_MISSING: "AXB1101",
  UNKNOWN_PROVIDER_OBSERVATION: "AXB1105",
  BEHAVIOR_EVIDENCE_ARTIFACT_UNAVAILABLE: "AXB1106",
  BEHAVIOR_EVIDENCE_REPOSITORY_ESCAPE: "AXB1107",
  BEHAVIOR_MANIFEST_DIGEST_MISMATCH: "AXB1201",
  BEHAVIOR_PACKAGE_SET: "AXB1202",
  BEHAVIOR_PACKAGE_ORDER: "AXB1203",
  BEHAVIOR_EVIDENCE_ORDER: "AXB1204",
  BEHAVIOR_PROFILE_IDENTITY: "AXB1205",
  BEHAVIOR_CRITERION_DUPLICATE: "AXB1206",
  BEHAVIOR_CRITERION_ORDER: "AXB1207",
  BEHAVIOR_SOURCE_DIGEST_MISMATCH: "AXB1208",
  BEHAVIOR_UNKNOWN_EVIDENCE: "AXB1209",
  BEHAVIOR_CRITERION_NAMESPACE: "AXB1210",
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
  CONDITION_OVERLAP_UNCLEAR: "AXC1103",
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
  DUPLICATE_SEMANTIC_VOCABULARY_PATH: "AXG1001",
  SEMANTIC_VOCABULARY_ORDER: "AXG1002",
  SEMANTIC_COLOR_ROLE_SET: "AXG1003",
  DUPLICATE_VARIANT_AXIS: "AXP1001",
  DUPLICATE_VARIANT_VALUE: "AXP1002",
  INVALID_VARIANT_DEFAULT: "AXP1003",
  UNKNOWN_APPEARANCE_SLOT: "AXP1004",
  UNKNOWN_APPEARANCE_STATE: "AXP1005",
  UNKNOWN_APPEARANCE_VARIANT: "AXP1006",
  APPEARANCE_ORIGIN_MISMATCH: "AXP1007",
  INVALID_APPEARANCE_STATE_VALUE: "AXP1008",
  APPEARANCE_PROFILE_MISMATCH: "AXP1009",
  COLLISION_TRACE_ID_ORDER: "AXN2101",
  COLLISION_TRACE_RECIPE_ID: "AXN2102",
  COLLISION_TRACE_PROPERTY_EVIDENCE: "AXN2103",
  COLLISION_TRACE_POLICY_PROVENANCE: "AXN2104",
  COLLISION_TRACE_RELATION_EVIDENCE: "AXN2105",
  COLLISION_TRACE_APPLICABILITY_ORDER: "AXN2106",
  UNKNOWN_MOTION_PROPERTY: "AXM1001",
  MOTION_PROPERTY_NOT_ANIMATABLE: "AXM1002",
  DISCRETE_MOTION_OPT_IN_REQUIRED: "AXM1003",
  INVALID_MOTION_KEYFRAME_OFFSET: "AXM1005",
  MOTION_KEYFRAME_GRAMMAR_MISMATCH: "AXM1004",
  REDUCED_MOTION_STRATEGY_MISSING: "AXM1007",
  MOTION_TOKEN_DOMAIN_MISMATCH: "AXM1008",
  MOTION_PROFILE_MISMATCH: "AXM1010",
  MOTION_CONDITION_DIGEST_MISMATCH: "AXM1011",
  UNKNOWN_MOTION_PROPERTY_CAPABILITY: "AXM1012",
  UNKNOWN_MOTION_STATE: "AXM1013",
  INVALID_MOTION_STATE_VALUE: "AXM1014",
  DISCRETE_MOTION_OPT_IN_ACCEPTED: "AXM1015",
  MOTION_KEYFRAME_VALUE_KIND_INVALID: "AXM1016",
  MOTION_KEYFRAME_TOKEN_BINDING_INVALID: "AXM1017",
} as const;

export const TOKEN_REFERENCE_PATTERN = /^\{[^{}]+\}$/;

/** Records the deterministic generator protocol used in generated reference-contract provenance. */
export const CONTRACT_GENERATOR_VERSION = "0.1.0" as const;
