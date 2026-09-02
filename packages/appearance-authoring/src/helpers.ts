import type {
  CSSValueTemplate,
  TokenId,
  TokenReference,
} from "@axiom/motion-schema";

import {
  CSS_RECIPE_DIAGNOSTIC_CODE,
  CSS_RECIPE_DIAGNOSTIC_PHASE,
  CSS_RECIPE_DIAGNOSTIC_SEVERITY,
  CSS_RECIPE_FALLBACK_SOURCE,
  CSS_RECIPE_NEGATED_TOKEN_KIND,
} from "./constants.js";
import {
  CSSRecipeAuthoringError,
} from "./contracts.js";

/** Preserves literal Token interpolations while remaining assignable to the schema-owned template. */
type CSSValueTemplateWithLiteralParts<TValues extends readonly TokenReference[]> = Readonly<{
  readonly kind: "css-template";
  readonly parts: readonly [
    string | TValues[number],
    ...(string | TValues[number])[],
  ];
}>;

/** Creates a literal-preserving Token Reference without claiming that the Token currently resolves. */
export const token = <const TPath extends TokenId>(
  path: TPath,
): Readonly<{ readonly kind: "token"; readonly path: TPath }> => ({
  kind: "token",
  path,
});

/** Preserves literal Token-negation intent without making the N21 property-binding decision. */
export const negateToken = <const TTokenReference extends TokenReference>(
  tokenReference: TTokenReference,
): Readonly<{
  readonly kind: typeof CSS_RECIPE_NEGATED_TOKEN_KIND;
  readonly token: TTokenReference;
}> => ({ kind: CSS_RECIPE_NEGATED_TOKEN_KIND, token: tokenReference });

/** Marks a literal-preserving string as explicit CSS for value-kind and grammar validation. */
export const css = <const TValue extends string>(
  value: TValue,
): Readonly<{ readonly kind: "css"; readonly value: TValue }> => ({ kind: "css", value });

/** Preserves literal Token interpolation types in the schema-shaped CSS template representation. */
export const cssTemplate = <
  const TValues extends readonly [TokenReference, ...TokenReference[]],
>(
  strings: TemplateStringsArray,
  ...values: TValues
): CSSValueTemplateWithLiteralParts<TValues> => {
  if (values.length === 0) throw new CSSRecipeAuthoringError([{
    code: CSS_RECIPE_DIAGNOSTIC_CODE.INVALID_DECLARATION_VALUE,
    severity: CSS_RECIPE_DIAGNOSTIC_SEVERITY,
    phase: CSS_RECIPE_DIAGNOSTIC_PHASE,
    message: "A CSS template requires at least one Token Reference segment.",
    source: CSS_RECIPE_FALLBACK_SOURCE,
  }]);
  const parts: Array<string | TokenReference> = [];
  for (let index = 0; index < strings.length; index += 1) {
    parts.push(strings[index] ?? "");
    const value = values[index];
    if (value !== undefined) parts.push(value);
  }
  return {
    kind: "css-template",
    parts: parts as unknown as CSSValueTemplate["parts"],
  } as CSSValueTemplateWithLiteralParts<TValues>;
};
