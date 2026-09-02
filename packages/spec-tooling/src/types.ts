import type {
  DIAGNOSTIC_PHASES,
  DIAGNOSTIC_SEVERITIES,
  JSON_SCHEMA_DIALECT,
  SEMANTIC_VALIDATOR_IDS,
  SPEC_MANIFEST_SCHEMA_VERSION,
} from "./constants.js";

export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export interface JsonArray extends ReadonlyArray<JsonValue> {}

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type DiagnosticSeverity = (typeof DIAGNOSTIC_SEVERITIES)[number];

export type DiagnosticPhase = (typeof DIAGNOSTIC_PHASES)[number];

export interface SourceLocation {
  readonly file: string;
  readonly pointer: string;
  readonly line?: number;
  readonly column?: number;
}

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly phase: DiagnosticPhase;
  readonly message: string;
  readonly location?: SourceLocation;
  readonly target?: string;
  readonly details?: Readonly<Record<string, JsonValue>>;
}

export type SemanticValidatorId = (typeof SEMANTIC_VALIDATOR_IDS)[number];

export interface SemanticValidationContext {
  readonly registries: Readonly<Record<string, unknown>>;
}

export interface SchemaManifestEntry {
  readonly id: string;
  readonly path: string;
}

export interface RegistryManifestEntry {
  readonly id: string;
  readonly path: string;
  readonly schema: string;
  readonly semanticValidator?: SemanticValidatorId;
}

export interface FixtureSuiteManifestEntry {
  readonly id: string;
  readonly schema: string;
  readonly positiveDirectory: string;
  readonly negativeDirectory: string;
  readonly semanticValidator?: SemanticValidatorId;
  readonly allowedWarnings?: readonly string[];
}

export interface SpecManifest {
  readonly schemaVersion: typeof SPEC_MANIFEST_SCHEMA_VERSION;
  readonly dialect: typeof JSON_SCHEMA_DIALECT;
  readonly schemas: readonly SchemaManifestEntry[];
  readonly registries: readonly RegistryManifestEntry[];
  readonly fixtureSuites: readonly FixtureSuiteManifestEntry[];
}

export interface SpecCheckReport {
  readonly schemaCount: number;
  readonly registryCount: number;
  readonly positiveFixtureCount: number;
  readonly negativeFixtureCount: number;
  readonly digests: Readonly<Record<string, string>>;
}
