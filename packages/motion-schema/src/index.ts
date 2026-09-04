import type { TokenReference } from "./generated/reference-contracts.js";

export type {
  AppearanceCompoundRule, AppearanceConditionRule, AppearanceStateRule, CompoundPredicate,
  AxiomIdentifier, CollisionApplicability, CollisionConditionRelation, CollisionDeclarationEvidence,
  CollisionPolicyProvenance, CollisionStateApplicability, CollisionTrace, CollisionTraceEntry,
  CollisionVariantApplicability, CSSAppearanceIR, CSSDeclaration, CSSDeclarationValue, CSSLiteral, CSSValueTemplate,
  CSSValueTemplatePart, CSSPropertyName, ConditionExpression,
  DeclarationOrigin, MotionIR, MotionKeyframe, MotionPhase,
  MotionSegment, MotionSegmentAt, MotionStateTransition, MotionTrack, MotionTransition,
  MotionPhaseName, OrderedDeclarationList, ReducedMotionPolicy, Sha256Digest,
  SlotDeclarationRecord, StateCase, StateSelection, TokenId, TokenReference, VariantAxis,
  VariantSelection, VariantValue,
} from "./generated/reference-contracts.js";
export {
  MOTION_DIAGNOSTIC_CODE,
  MOTION_PROFILE_ID,
  MOTION_SCHEMA_VERSION,
} from "./constants.js";
export {
  createMotionAuthoring,
  defineMotion,
} from "./authoring/define-motion.js";
export type {
  DefinedMotion,
  MotionAuthoringInput,
  MotionAuthoritySnapshot,
  MotionAuthorityValidationDiagnostic,
  MotionAuthorityValidationPort,
  MotionAuthoringPort,
  MotionDefinition,
  MotionDiagnostic,
  MotionExpectedDigests,
  MotionKeyframeAuthoring,
  MotionKeyframesAuthoring,
  MotionPhaseAuthoring,
  MotionSegmentAuthoring,
  MotionTokenSerializer,
  MotionTrackAuthoring,
  MotionValue,
  MotionDiagnosticCode,
} from "./authoring/contracts.js";
export { MotionAuthoringError } from "./authoring/contracts.js";

/** Creates a serialized direct Token value without resolving the referenced Token. */
export const token = <const TPath extends string>(path: TPath): Readonly<{ readonly kind: "token"; readonly path: TPath }> => ({ kind: "token", path });
