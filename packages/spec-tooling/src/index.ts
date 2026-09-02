export { canonicalJson, canonicalJsonDigest } from "./canonical-json.js";
export { runSemanticValidator } from "./semantic-validators.js";
export { checkSpecification, createMotionAuthorityValidationPort, createSpecificationValueValidator, validateSpecificationValue } from "./spec-harness.js";
export type {
  Diagnostic,
  DiagnosticPhase,
  DiagnosticSeverity,
  FixtureSuiteManifestEntry,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  RegistryManifestEntry,
  SchemaManifestEntry,
  SemanticValidationContext,
  SemanticValidatorId,
  SourceLocation,
  SpecCheckReport,
  SpecManifest,
} from "./types.js";
