import type {
  CSSAuthoringProperty,
  CSSCanonicalProperty,
  EffectiveCSSPropertyRegistry,
  SparsePropertyPolicySource,
  TokenBindingCatalog,
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
import type { TokenJsonValue } from "@axiom/tokens";
import type {
  CanonicalDigestPort,
  CompositeTokenProjectorRegistry,
  ResolvedTokenEntry,
  ResolvedTokenManifest,
  TokenDomainRegistry,
} from "@axiom/tokens";

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

/** Selects a registered composite projector without projector-specific parameters. */
export interface CSSProjectorOptions<TProjector extends string = string> {
  readonly projector: TProjector;
  readonly parameters?: never;
}

/** Selects the transition projector with its required canonical transitioned-property list. */
export interface CSSTransitionProjectorOptions {
  readonly projector: "css.transition-projector.v1";
  readonly parameters: Readonly<{
    readonly properties: readonly [CSSCanonicalProperty, ...CSSCanonicalProperty[]];
  }>;
}

/** Restricts the current transition projector to its required parameter shape. */
export type CSSProjectorOptionsFor<TProjector extends string> =
  TProjector extends "css.transition-projector.v1"
    ? CSSTransitionProjectorOptions
    : CSSProjectorOptions<TProjector>;

/** Preserves one closed composite Token application until N21 validates policy and output fields. */
export interface CSSProjectorValue {
  readonly kind: "token-projector";
  readonly token: TokenReference;
  readonly projector: string;
  readonly parameters?: Readonly<Record<string, TokenJsonValue>>;
}

/** Serializes one resolved Token value solely for N21 compatibility validation. */
export interface TokenCssSerializer {
  readonly id: string;
  /** Serializes one direct or template Token value for compatibility validation only. */
  serialize(entry: ResolvedTokenEntry): string;
}

/** Names whether a projected CSS literal derives from a Token field or transition parameters. */
export type ProjectedTokenDeclarationSource = "token" | "parameters";

/** Returns one context-specific CSS declaration from a registered pure projector port. */
export interface ProjectedTokenDeclaration {
  readonly property: string;
  readonly value: string;
  readonly source: ProjectedTokenDeclarationSource;
  readonly field: string;
}

/** Runs one registered composite projector without I/O, global state, or CSS emission. */
export interface TokenProjector {
  readonly id: string;
  /** Produces ordered, context-local declarations without I/O or global state. */
  project(
    entry: ResolvedTokenEntry,
    parameters: Readonly<Record<string, TokenJsonValue>> | undefined,
  ): readonly ProjectedTokenDeclaration[];
}

/** Carries the exact CSS policy inputs whose canonical digest generated the Effective Registry. */
export interface CSSPropertyPolicySourceAuthority {
  readonly policy: SparsePropertyPolicySource;
  readonly bindings: TokenBindingCatalog;
}

/** Pins the canonical identities that N21 verifies before processing declarations. */
export interface TokenBindingAuthorityDigests {
  readonly effectivePropertyRegistry: string;
  readonly propertyPolicySource: string;
  readonly resolvedTokenManifest: string;
  readonly tokenDomainRegistry: string;
  readonly projectorRegistry: string;
  readonly canonicalStateRegistry: string;
  readonly conditionRegistry: string;
}

/** Supplies every explicit authority and pure execution port needed for N21 Token validation. */
export interface TokenBindingValidationConfig {
  readonly resolvedTokenManifest: ResolvedTokenManifest;
  readonly tokenDomainRegistry: TokenDomainRegistry;
  readonly projectorRegistry: CompositeTokenProjectorRegistry;
  readonly propertyPolicySource: CSSPropertyPolicySourceAuthority;
  readonly authorityDigests: TokenBindingAuthorityDigests;
  readonly canonicalDigest: CanonicalDigestPort;
  readonly serializers: readonly TokenCssSerializer[];
  readonly projectors: readonly TokenProjector[];
}

/** Identifies an authored declaration without claiming a normalized N15 declaration origin. */
export interface TokenBindingDeclarationPath {
  readonly recipeId: string;
  readonly slot: string;
  readonly stage: "base" | "variant" | "state" | "compound" | "condition";
  readonly property: string;
  readonly source: string;
  readonly pointer: string;
  readonly declarationIndex: number;
}

/** Describes one N21-approved projector field for later N22 lowering. */
export interface ProjectedTokenBlueprint {
  readonly property: string;
  readonly source: ProjectedTokenDeclarationSource;
  readonly field: string;
  readonly value: CSSDeclarationValue;
}

/** Captures the immutable semantic evidence for one Token-bearing declaration. */
export interface ValidatedTokenEvidence {
  readonly tokenId: string;
  readonly domain: string;
  readonly dtcgType: string;
  readonly serializerId: string;
}

/** Captures the immutable semantic evidence for one Token-bearing declaration. */
export interface ValidatedTokenBinding {
  readonly path: TokenBindingDeclarationPath;
  readonly mode: "direct" | "template" | "negated-template" | "projector";
  readonly tokens: readonly ValidatedTokenEvidence[];
  readonly projectorId?: string;
  readonly projectorVersion?: string;
  readonly projectedDeclarations?: readonly ProjectedTokenBlueprint[];
}

/** Records the exact authority identities behind the source-ordered N21 binding report. */
export interface TokenBindingAuthorityReceipt extends TokenBindingAuthorityDigests {
  readonly profileInputDigest: string;
  readonly manifestSourceDigest: string;
  readonly contexts: readonly Readonly<Record<string, string>>[];
}

/** Gives N22 a detached, deterministic Token semantic result without exposing Appearance IR. */
export interface TokenBindingReport {
  readonly authority: TokenBindingAuthorityReceipt;
  readonly bindings: readonly ValidatedTokenBinding[];
}

/** Accepts raw CSS, a schema-shaped declaration value, or deferred Token-negation intent. */
export type CSSAuthoringValue = string | CSSDeclarationValue | NegatedTokenReference | CSSProjectorValue;

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
  readonly tokenValidation: TokenBindingValidationConfig;
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
  readonly pointer?: string;
  readonly declarationIndex?: number;
  readonly target?: string;
  readonly tokenId?: string;
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
  DefinedRecipe<CSSAuthoringStyleFragment, TDefinition> & Readonly<{
    readonly tokenBindingReport: TokenBindingReport;
  }>;

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
