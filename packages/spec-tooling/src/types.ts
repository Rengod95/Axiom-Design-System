export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export interface JsonArray extends ReadonlyArray<JsonValue> {}

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type DiagnosticSeverity = "error" | "info" | "warning";

export type DiagnosticPhase =
  | "behavior"
  | "compiler"
  | "condition"
  | "motion"
  | "normalization"
  | "property"
  | "react"
  | "recipe"
  | "schema"
  | "token";

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

export type SemanticValidatorId =
  | "parsed-token-document"
  | "resolved-token-manifest"
  | "token-context-override"
  | "token-domain-registry"
  | "token-identity";

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
}

export interface SpecManifest {
  readonly schemaVersion: "0.1";
  readonly dialect: "https://json-schema.org/draft/2020-12/schema";
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
