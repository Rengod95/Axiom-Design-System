/** Names the only profile accepted by the N22 Appearance normalizer. */
export const APPEARANCE_NORMALIZER_PROFILE_ID = "axiom-css" as const;

/** Pins the shared N15 Appearance IR and N22 collision-trace protocol version. */
export const APPEARANCE_NORMALIZER_SCHEMA_VERSION = "0.1" as const;

/** Names the only blocking and non-blocking severities emitted by N22. */
export const APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY = Object.freeze({
  ERROR: "error",
  WARNING: "warning",
} as const);

/** Names stable N22 normalization diagnostics without extending the closed N15 schema. */
export const APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE = Object.freeze({
  SHORTHAND_LONGHAND: "AXP1301",
  RESET_LONGHAND: "AXP1302",
  UNSTABLE_ORDER: "AXN2001",
  AUTHORITY_INVALID: "AXN2002",
  CONDITION_CONTRADICTORY: "AXC1102",
  CONDITION_OVERLAP: "AXC1103",
} as const);

/** Prefixes deterministic collision evidence identifiers. */
export const APPEARANCE_COLLISION_ID_PREFIX = "collision-";

/** Fixes collision evidence ordinal width for byte-stable serialization. */
export const APPEARANCE_COLLISION_ID_WIDTH = 4;
