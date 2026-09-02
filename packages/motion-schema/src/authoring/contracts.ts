import type { EffectiveCSSPropertyRegistry } from "@axiom/css-property-profile";
import type { CanonicalStateRegistry, ConditionRegistry } from "@axiom/condition-registry";
import { MOTION_DIAGNOSTIC_CODE } from "../constants.js";
import type {
  CanonicalDigestPort,
  ResolvedTokenEntry,
  ResolvedTokenManifest,
  TokenDomainRegistry,
} from "@axiom/tokens";

import type {
  CSSAppearanceIR,
  CSSDeclarationValue,
  CSSValueTemplate,
  MotionIR,
  MotionPhaseName,
  MotionSegmentAt,
  MotionStateTransition,
  MotionTransition,
  TokenReference,
} from "../generated/reference-contracts.js";

/** Accepts literal CSS alongside the exact serialized declaration-value union. */
export type MotionValue = string | CSSDeclarationValue;

/** Preserves an explicitly positioned and transitioned source segment. */
export interface MotionSegmentAuthoring {
  readonly at: MotionSegmentAt;
  readonly tracks: readonly [MotionTrackAuthoring, ...MotionTrackAuthoring[]];
  readonly transition: MotionTransition;
}

/** Retains a required discrete opt-in and either shorthand or explicit keyframes. */
export interface MotionTrackAuthoring {
  readonly property: string;
  readonly allowDiscrete: boolean;
  readonly keyframes: MotionKeyframesAuthoring;
}

/** States one keyframe offset when the shorthand would be ambiguous. */
export interface MotionKeyframeAuthoring {
  readonly offset: number;
  readonly value: MotionValue;
}

/** Allows exactly two raw values or an explicit sequence of three or more offsets. */
export type MotionKeyframesAuthoring =
  | readonly [MotionValue, MotionValue]
  | readonly [MotionKeyframeAuthoring, MotionKeyframeAuthoring, MotionKeyframeAuthoring, ...MotionKeyframeAuthoring[]];

/** Represents one ordered N16 phase before values receive their normalized CSS wrapper. */
export type MotionPhaseAuthoring =
  | Readonly<{ readonly phase: Exclude<MotionPhaseName, "stateChange">; readonly sequence: readonly [MotionSegmentAuthoring, ...MotionSegmentAuthoring[]] }>
  | Readonly<{ readonly phase: "stateChange"; readonly state: MotionStateTransition; readonly sequence: readonly [MotionSegmentAuthoring, ...MotionSegmentAuthoring[]] }>;

/** Captures all user-authored Motion data and deliberately excludes compiler provenance. */
export interface MotionDefinition {
  readonly id: string;
  readonly recipeId: string;
  readonly slot: string;
  readonly phases: readonly [MotionPhaseAuthoring, ...MotionPhaseAuthoring[]];
  readonly reducedMotion:
    | Readonly<{ readonly strategy: "disable" }>
    | Readonly<{ readonly strategy: "replace"; readonly phases: readonly [MotionPhaseAuthoring, ...MotionPhaseAuthoring[]] }>;
}

/** Serializes one resolved Token only for grammar checks; it never resolves source values into IR. */
export interface MotionTokenSerializer {
  readonly id: string;
  /** Serializes one resolved Token only for context-specific CSS grammar validation. */
  serialize(entry: ResolvedTokenEntry): string;
}

/**
 * Pins all context-owned provenance and detached-authority identities expected
 * during N23 normalization. `profileInputDigest` names the profile Webref input
 * provenance, while `conditionRegistryDigest` retains the Motion IR field name
 * for the complete Condition Registry identity. The remaining fields pin the
 * Effective Property Registry, Resolved Token Manifest, Token Domain Registry,
 * Canonical State Registry, and complete N22 Appearance artifact respectively.
 */
export interface MotionExpectedDigests {
  /** Pins the CSS profile Webref input provenance; it is distinct from the full effective registry digest. */
  readonly profileInputDigest: string;
  /** Pins the full Effective CSS Property Registry. */
  readonly effectivePropertyRegistry: string;
  /** Pins the complete two-context Resolved Token Manifest. */
  readonly resolvedTokenManifest: string;
  /** Pins the complete Token Domain Registry. */
  readonly tokenDomainRegistry: string;
  /** Pins the complete Canonical State Registry. */
  readonly canonicalStateRegistry: string;
  /** Pins the complete Condition Registry under the Motion IR-compatible field name. */
  readonly conditionRegistryDigest: string;
  /** Pins the complete N22-normalized Appearance artifact used for Recipe and Slot applicability. */
  readonly appearanceIR: string;
}

/** Captures the exact detached authority bundle consumed by one Motion normalization port. */
export interface MotionAuthoritySnapshot {
  readonly propertyRegistry: unknown;
  readonly resolvedTokenManifest: unknown;
  readonly tokenDomainRegistry: unknown;
  readonly canonicalStateRegistry: unknown;
  readonly conditionRegistry: unknown;
  readonly appearance: unknown;
}

/** Reports a schema or semantic rejection from the explicit registered-authority validator. */
export interface MotionAuthorityValidationDiagnostic {
  readonly code: string;
  readonly message: string;
}

/** Trusted composition-owned validator for the exact detached N23 authority bundle. */
export interface MotionAuthorityValidationPort {
  validateBundle(snapshot: MotionAuthoritySnapshot): readonly MotionAuthorityValidationDiagnostic[];
}

/** Supplies every explicit registry and pure port required to normalize Motion source. */
export interface MotionAuthoringInput {
  readonly propertyRegistry: EffectiveCSSPropertyRegistry;
  readonly resolvedTokenManifest: ResolvedTokenManifest;
  readonly tokenDomainRegistry: TokenDomainRegistry;
  readonly canonicalStateRegistry: CanonicalStateRegistry;
  readonly conditionRegistry: ConditionRegistry;
  /** Supplies the closed N22 Appearance artifact without importing the N22 normalizer package. */
  readonly appearance: CSSAppearanceIR;
  readonly expectedDigests: MotionExpectedDigests;
  readonly canonicalDigest: CanonicalDigestPort;
  /** Supplies the trusted downward schema-and-semantic authority validation boundary. */
  readonly authorityValidation: MotionAuthorityValidationPort;
  readonly serializers: readonly MotionTokenSerializer[];
}

/** Makes a normalized Motion artifact and retained warnings observable without a compiler dependency. */
export interface DefinedMotion<TDefinition extends MotionDefinition = MotionDefinition> {
  readonly definition: TDefinition;
  readonly motion: MotionIR;
  readonly diagnostics: readonly MotionDiagnostic[];
}

/** Gives consumers a typed, stable diagnostic instead of requiring error-message parsing. */
export interface MotionDiagnostic {
  readonly code: MotionDiagnosticCode;
  readonly severity: "error" | "warning";
  readonly phase: "motionAuthoring";
  readonly message: string;
  readonly source: string;
  readonly property?: string;
  readonly tokenId?: string;
  /** Names the authenticated Recipe/Slot target or other governed Motion subject. */
  readonly target?: string;
}

/** Enumerates diagnostics governed by the Motion schema and N23 authoring boundary. */
export type MotionDiagnosticCode =
  typeof MOTION_DIAGNOSTIC_CODE[keyof typeof MOTION_DIAGNOSTIC_CODE];

/** Signals that source cannot be transformed into N16 Motion IR. */
export class MotionAuthoringError extends Error {
  readonly diagnostics: readonly MotionDiagnostic[];

  /** Carries all deterministic source diagnostics so callers can report them together. */
  constructor(diagnostics: readonly MotionDiagnostic[], options?: ErrorOptions) {
    super("Axiom Motion authoring validation failed.", options);
    this.name = MotionAuthoringError.name;
    this.diagnostics = diagnostics;
  }
}

/** Exposes the only N23 validation/normalization operation and retains source literalness. */
export interface MotionAuthoringPort {
  /** Validates authored source against explicit registries and returns exact N16 Motion IR. */
  defineMotion<const TDefinition extends MotionDefinition>(definition: TDefinition): DefinedMotion<TDefinition>;
}

/** Narrows a CSS template before synthetic CSS-variable grammar validation. */
export type MotionTemplateValue = CSSValueTemplate;
/** Names a direct Token source value for public authoring helpers. */
export type MotionTokenValue = TokenReference;
