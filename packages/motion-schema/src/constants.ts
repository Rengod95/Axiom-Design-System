/** Identifies the package that publishes generated declaration, Appearance, and Motion references. */
export const MOTION_SCHEMA_PACKAGE_NAME = "@axiom/motion-schema" as const;

/** Stable Motion-authoring diagnostics mapped to the N16 Motion contract. */
export const MOTION_DIAGNOSTIC_CODE = {
  UNKNOWN_PROPERTY: "AXM1001",
  NOT_ANIMATABLE: "AXM1002",
  DISCRETE_OPT_IN_REQUIRED: "AXM1003",
  GRAMMAR_MISMATCH: "AXM1004",
  INVALID_KEYFRAME_OFFSET: "AXM1005",
  REDUCED_MOTION_INVALID: "AXM1007",
  TOKEN_DOMAIN_MISMATCH: "AXM1008",
  PROFILE_MISMATCH: "AXM1010",
  CONDITION_DIGEST_MISMATCH: "AXM1011",
  UNKNOWN_CAPABILITY: "AXM1012",
  UNKNOWN_STATE: "AXM1013",
  INVALID_STATE_VALUE: "AXM1014",
  DISCRETE_OPT_IN_ACCEPTED: "AXM1015",
  INVALID_VALUE_KIND: "AXM1016",
  TOKEN_BINDING_MISMATCH: "AXM1017",
  APPEARANCE_APPLICABILITY_MISMATCH: "AXM1018",
  INVALID_AUTHORING_SHAPE: "AXM2001",
  INVALID_IDENTIFIER: "AXM2002",
  INVALID_AUTHORITY: "AXM2004",
} as const;

/** Identifies the profile accepted by the closed N16 Motion IR. */
export const MOTION_PROFILE_ID = "axiom-css" as const;
/** Identifies the serializable schema shape emitted by the N16 normalizer. */
export const MOTION_SCHEMA_VERSION = "0.1" as const;
/** Gives synthetic template references a deterministic grammar-validation spelling. */
export const MOTION_TEMPLATE_TOKEN_VARIABLE = "var(--axiom-motion-token)" as const;
/** Names semantic Token domains for tween timing fields. */
export const MOTION_TRANSITION_TOKEN_DOMAIN = {
  DURATION: "duration",
  EASING: "easing",
} as const;
/** Lists the closed DTCG types accepted by resolved Motion authority Tokens. */
export const MOTION_DTCG_TYPES = ["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"] as const;
/** Fixes the only ordered resolver contexts accepted by the v0.1 foundation manifest. */
export const MOTION_RESOLVED_THEMES = ["light", "dark"] as const;
/** Lists canonical State axes that can govern Motion and Appearance artifacts. */
export const MOTION_STATE_AXES = ["lifecycle", "state"] as const;
/** Lists registered State consumer surfaces. */
export const MOTION_STATE_USAGES = ["appearance", "behavior", "motion"] as const;
/** Lists declaration stages that N22 can serialize into its detached Appearance artifact. */
export const MOTION_DECLARATION_STAGES = ["base", "variant", "state", "compound", "condition"] as const;
/** Defines the strict serializer identifier grammar shared by Token Domain authorities. */
export const MOTION_SERIALIZER_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
/** Defines the closed N15 CSS property spelling, including custom properties. */
export const MOTION_CSS_PROPERTY_NAME_PATTERN = /^(?:-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*|--[a-z0-9][a-z0-9-]*)$/;
/** Supplies one stable source label where callers did not retain a source path. */
export const MOTION_FALLBACK_SOURCE = "<motion>" as const;
/** Defines stable lexical identity accepted by the common identifier schema. */
export const MOTION_IDENTIFIER_PATTERN = /^[a-z][A-Za-z0-9]*(?:[.-][a-z0-9][A-Za-z0-9]*)*$/;
/** Defines the stricter Token-ID grammar used by the closed Token reference schema. */
export const MOTION_TOKEN_ID_PATTERN = /^[a-z][A-Za-z0-9]*\.(?:primitive|semantic|component)\.[a-z0-9][A-Za-z0-9]*(?:\.[a-z0-9][A-Za-z0-9]*)*$/;
/** Limits identifiers to the common schema's maximum source length. */
export const MOTION_IDENTIFIER_MAXIMUM_LENGTH = 160;
