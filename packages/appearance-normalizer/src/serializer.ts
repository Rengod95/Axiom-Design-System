import type { CSSAppearanceIR } from "@axiom/motion-schema";

/** Canonicalizes object members recursively while retaining every precedence-bearing array position. */
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([key, nested]) => [key, canonicalize(nested)]),
  );
  return value;
};

/** Serializes Appearance IR canonically without changing its explicit declaration and rule array order. */
export const serializeAppearanceIR = (appearance: CSSAppearanceIR): string => JSON.stringify(canonicalize(appearance));
