import type {
  CSSRecipeDefinition,
  CSSRecipeAuthoringInput,
  DefinedCSSRecipe,
} from "@axiom/appearance-authoring";
import type { CollisionTrace, CSSAppearanceIR } from "@axiom/motion-schema";
import type {
  APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE,
  APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY,
} from "./constants.js";

type AppearanceNormalizerDiagnosticCode = (typeof APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE)[keyof typeof APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE];
type AppearanceNormalizerDiagnosticSeverity = (typeof APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY)[keyof typeof APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY];

/** Describes one stable normalizer diagnostic without extending the closed Appearance IR. */
export interface AppearanceNormalizationDiagnostic {
  readonly code: AppearanceNormalizerDiagnosticCode;
  readonly severity: AppearanceNormalizerDiagnosticSeverity;
  readonly message: string;
  readonly traceId?: string;
}

/** Returns an artifact only when no blocking normalization diagnostic was found. */
export type AppearanceNormalizationResult = Readonly<{
  readonly diagnostics: readonly AppearanceNormalizationDiagnostic[];
  readonly trace: CollisionTrace;
  readonly appearance?: CSSAppearanceIR;
}>;

/** Normalizes only an immutable N21-approved recipe using the matching explicit authorities. */
export interface AppearanceNormalizer {
  /** Produces deterministic N15 Appearance IR and its separate collision trace. */
  normalize(recipe: DefinedCSSRecipe<CSSRecipeDefinition>): AppearanceNormalizationResult;
}

/** Captures the public N21 authoring authorities required to verify a receipt. */
export type AppearanceNormalizerInput = Pick<CSSRecipeAuthoringInput,
  "propertyRegistry" | "canonicalStateRegistry" | "conditionRegistry" | "tokenValidation">;
