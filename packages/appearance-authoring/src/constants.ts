/** Names the CSS profile accepted by the initial Recipe authoring adapter. */
export const CSS_RECIPE_PROFILE_ID = "axiom-css" as const;

/** Identifies the phase emitted by CSS Recipe authoring diagnostics. */
export const CSS_RECIPE_DIAGNOSTIC_PHASE = "recipeAuthoring" as const;

/** Identifies the only severity emitted when CSS Recipe authoring rejects input. */
export const CSS_RECIPE_DIAGNOSTIC_SEVERITY = "error" as const;

/** Provides a stable message for failures that carry CSS Recipe diagnostics. */
export const CSS_RECIPE_ERROR_MESSAGE = "Axiom CSS Recipe authoring validation failed.";

/** Supplies the provenance fallback when an authored Recipe omits an explicit source. */
export const CSS_RECIPE_FALLBACK_SOURCE = "<recipe>";

/** Identifies the closed authoring-only form that preserves Token-negation intent for N21. */
export const CSS_RECIPE_NEGATED_TOKEN_KIND = "negated-token" as const;

/** Identifies the closed authoring-only composite Token application form. */
export const CSS_RECIPE_TOKEN_PROJECTOR_KIND = "token-projector" as const;

/** Matches schema-owned stable identifiers supplied through N21 authority ports. */
export const CSS_RECIPE_IDENTIFIER_PATTERN = /^[a-z][A-Za-z0-9]*(?:[.-][a-z0-9][A-Za-z0-9]*)*$/;

/** Matches schema-owned resolved Token identifiers supplied through N21 authority ports. */
export const CSS_RECIPE_TOKEN_ID_PATTERN = /^[a-z][A-Za-z0-9]*\.(?:primitive|semantic|component)\.[a-z0-9][A-Za-z0-9]*(?:\.[a-z0-9][A-Za-z0-9]*)*$/;

/** Matches canonical SHA-256 identities supplied through N21 authority ports. */
export const CSS_RECIPE_SHA256_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;

/** Matches schema-owned canonical CSS property names. */
export const CSS_RECIPE_PROPERTY_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Matches registered serializer and projector identities. */
export const CSS_RECIPE_SERIALIZER_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;

/** Matches schema-owned stable semantic versions. */
export const CSS_RECIPE_SEMVER_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;

/** Matches a profile semantic version, including its optional prerelease label. */
export const CSS_RECIPE_PROFILE_VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;

/** Names stable diagnostics for CSS Recipe-specific authoring boundaries. */
export const CSS_RECIPE_DIAGNOSTIC_CODE = Object.freeze({
  NAMING_MODE_VIOLATION: "AXA1001",
  UNKNOWN_STATE: "AXA1002",
  STATE_NOT_APPLICABLE: "AXA1003",
  STATE_VALUE_INVALID: "AXA1004",
  UNKNOWN_CONDITION: "AXA1005",
  VALUE_KIND_NOT_ALLOWED: "AXA1006",
  INVALID_DECLARATION_VALUE: "AXA1007",
  AUTHORITY_DIGEST_MISMATCH: "AXA1101",
  TOKEN_UNRESOLVED: "AXA1102",
  TOKEN_IDENTITY_MISMATCH: "AXA1103",
  TOKEN_DOMAIN_INVALID: "AXA1104",
  TOKEN_SERIALIZER_INVALID: "AXA1105",
  TOKEN_NEGATION_INVALID: "AXA1106",
  TOKEN_PROJECTOR_INVALID: "AXA1107",
  TOKEN_PROJECTOR_OUTPUT_INVALID: "AXA1108",
} as const);
