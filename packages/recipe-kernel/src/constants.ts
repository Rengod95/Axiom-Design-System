/** Package-wide protocol, validation, and diagnostic constants. */
export const RECIPE_KERNEL_DIAGNOSTIC_PHASE = "recipe" as const;
export const RECIPE_KERNEL_DIAGNOSTIC_SEVERITY = "error" as const;
export const RECIPE_KERNEL_ERROR_MESSAGE = "Axiom Recipe Kernel validation failed.";
export const RECIPE_KERNEL_FALLBACK_SOURCE = "<recipe>";
export const RECIPE_IDENTIFIER_MAXIMUM_LENGTH = 160;
export const RECIPE_IDENTIFIER_PATTERN = /^[a-z][A-Za-z0-9]*(?:[.-][a-z0-9][A-Za-z0-9]*)*$/;
export const RECIPE_CONDITION_ALL_MAXIMUM_LENGTH = 12;
export const RECIPE_CONDITION_ANY_MAXIMUM_LENGTH = 8;
export const RECIPE_STATE_CASE_MAXIMUM_LENGTH = 16;
export const RECIPE_KERNEL_ALLOWED_DEFINITION_KEYS = Object.freeze([
  "id", "slots", "base", "variants", "defaultVariants", "states",
  "compoundVariants", "conditions", "source",
] as const);

export const RECIPE_KERNEL_DIAGNOSTIC_CODE = Object.freeze({
  INVALID_DEFINITION: "AXR1001",
  INVALID_IDENTIFIER: "AXR1002",
  DUPLICATE_SLOT: "AXR1003",
  UNKNOWN_SLOT: "AXR1004",
  INVALID_VARIANT: "AXR1005",
  INVALID_DEFAULT_VARIANT: "AXR1006",
  INVALID_COMPOUND_PREDICATE: "AXR1007",
  INVALID_STATE_RULE: "AXR1008",
  INVALID_CONDITION: "AXR1010",
  NON_JSON_SAFE_VALUE: "AXR1011",
  INVALID_SOURCE: "AXR1012",
} as const);
