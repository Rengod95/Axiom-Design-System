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

/** Names stable diagnostics for CSS Recipe-specific authoring boundaries. */
export const CSS_RECIPE_DIAGNOSTIC_CODE = Object.freeze({
  NAMING_MODE_VIOLATION: "AXA1001",
  UNKNOWN_STATE: "AXA1002",
  STATE_NOT_APPLICABLE: "AXA1003",
  STATE_VALUE_INVALID: "AXA1004",
  UNKNOWN_CONDITION: "AXA1005",
  VALUE_KIND_NOT_ALLOWED: "AXA1006",
  INVALID_DECLARATION_VALUE: "AXA1007",
} as const);
