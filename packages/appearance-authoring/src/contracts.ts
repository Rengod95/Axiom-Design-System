import type {
  CSSAuthoringProperty,
  CSSCanonicalProperty,
  EffectiveCSSPropertyRegistry,
} from "@axiom/css-property-profile";
import type {
  CanonicalStateId,
  CanonicalStateRegistry,
  ConditionId,
  ConditionRegistry,
} from "@axiom/condition-registry";
import type {
  DefinedRecipe,
  RecipeConditionRule,
  RecipeKernelDefinition,
  RecipeStateRule,
} from "@axiom/recipe-kernel";
import type {
  CSSDeclarationValue,
  TokenReference,
} from "@axiom/motion-schema";

import {
  CSS_RECIPE_DIAGNOSTIC_CODE,
  CSS_RECIPE_DIAGNOSTIC_PHASE,
  CSS_RECIPE_DIAGNOSTIC_SEVERITY,
  CSS_RECIPE_ERROR_MESSAGE,
} from "./constants.js";

/** Preserves restricted Token-negation intent before N21 decides whether a property allows it. */
export interface NegatedTokenReference {
  readonly kind: "negated-token";
  readonly token: TokenReference;
}

/** Accepts raw CSS, a schema-shaped declaration value, or deferred Token-negation intent. */
export type CSSAuthoringValue = string | CSSDeclarationValue | NegatedTokenReference;

/** Represents the generated camel-case property form accepted in ordinary Recipe styles. */
export type CSSAuthoringStyleObject = Partial<Readonly<Record<CSSAuthoringProperty, CSSAuthoringValue>>>;

/** Represents one canonical property/value pair in an intentional declaration-order escape. */
export interface CSSAuthoringDeclaration {
  readonly property: CSSCanonicalProperty;
  readonly value: CSSAuthoringValue;
}

/** Keeps an authored style in exactly one property naming and ordering mode. */
export type CSSAuthoringStyleFragment = CSSAuthoringStyleObject | readonly CSSAuthoringDeclaration[];

/** Narrows a structural State rule to the N18-generated canonical State vocabulary. */
export type CSSRecipeStateRule<TSlot extends string = string> =
  Omit<RecipeStateRule<CSSAuthoringStyleFragment, TSlot>, "state"> & {
    readonly state: CanonicalStateId;
  };

/** Narrows a structural Condition expression to the N18-generated Condition vocabulary. */
export type CSSRecipeConditionExpression = Readonly<{
  readonly all: readonly [
    ConditionId | Readonly<{ readonly any: readonly [ConditionId, ...ConditionId[]] }>,
    ...(ConditionId | Readonly<{ readonly any: readonly [ConditionId, ...ConditionId[]] }>)[],
  ];
}>;

/** Narrows a structural Condition rule to the N18-generated Condition vocabulary. */
export type CSSRecipeConditionRule<TSlot extends string = string> =
  Omit<RecipeConditionRule<CSSAuthoringStyleFragment, TSlot>, "when"> & {
    readonly when: CSSRecipeConditionExpression;
  };

/** Specializes the renderer-neutral Kernel definition with CSS-aware style fragments. */
export type CSSRecipeDefinition<TSlots extends readonly string[] = readonly string[]> =
  Omit<RecipeKernelDefinition<CSSAuthoringStyleFragment, TSlots>, "states" | "conditions"> & {
    readonly states?: readonly CSSRecipeStateRule<TSlots[number]>[];
    readonly conditions?: readonly CSSRecipeConditionRule<TSlots[number]>[];
  };

/** Carries the authoritative profiles needed to validate CSS Recipe authoring without repository I/O. */
export interface CSSRecipeAuthoringInput {
  readonly propertyRegistry: EffectiveCSSPropertyRegistry;
  readonly canonicalStateRegistry: CanonicalStateRegistry;
  readonly conditionRegistry: ConditionRegistry;
  readonly enabledExperimentalProperties?: readonly string[];
}

/** Adds CSS provenance context to a stable property or authoring diagnostic. */
export interface CSSRecipeDiagnostic {
  readonly code: string;
  readonly severity: typeof CSS_RECIPE_DIAGNOSTIC_SEVERITY;
  readonly phase: typeof CSS_RECIPE_DIAGNOSTIC_PHASE;
  readonly message: string;
  readonly source: string;
  readonly recipeId?: string;
  readonly slot?: string;
  readonly stage?: "base" | "variant" | "state" | "compound" | "condition";
  readonly property?: string;
  readonly target?: string;
  readonly provenance?: EffectiveCSSPropertyRegistry["properties"][number]["policy"]["provenance"];
}

/** Reports every CSS-specific failure found after the Kernel has captured safe structural data. */
export class CSSRecipeAuthoringError extends Error {
  readonly diagnostics: readonly CSSRecipeDiagnostic[];

  /** Creates a typed public failure that callers can inspect without parsing message text. */
  constructor(diagnostics: readonly CSSRecipeDiagnostic[], options?: ErrorOptions) {
    super(CSS_RECIPE_ERROR_MESSAGE, options);
    this.name = CSSRecipeAuthoringError.name;
    this.diagnostics = diagnostics;
  }
}

/** Preserves the N19 definition/snapshot result without claiming normalized Appearance IR. */
export type DefinedCSSRecipe<TDefinition extends CSSRecipeDefinition> =
  DefinedRecipe<CSSAuthoringStyleFragment, TDefinition>;

/** Provides the configured CSS-aware `defineRecipe` operation. */
export interface CSSRecipeAuthoringPort {
  /** Validates CSS authoring and captures a detached renderer-neutral Kernel result. */
  defineRecipe<const TDefinition extends CSSRecipeDefinition>(
    definition: TDefinition,
  ): DefinedCSSRecipe<TDefinition>;
}

/** Exposes the stable code union owned by the CSS Recipe authoring package. */
export type CSSRecipeDiagnosticCode =
  typeof CSS_RECIPE_DIAGNOSTIC_CODE[keyof typeof CSS_RECIPE_DIAGNOSTIC_CODE];
