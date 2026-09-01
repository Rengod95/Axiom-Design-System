export { canonicalJson, canonicalJsonDigest } from "./canonical-json.js";
export { runSemanticValidator } from "./semantic-validators.js";
export { checkSpecification } from "./spec-harness.js";
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
  SemanticValidatorId,
  SourceLocation,
  SpecCheckReport,
  SpecManifest,
} from "./types.js";
