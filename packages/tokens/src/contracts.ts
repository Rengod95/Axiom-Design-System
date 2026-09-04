import {
  DTCG_TYPES,
  RESOLVED_TOKEN_SCHEMA_VERSION,
  TOKEN_DIAGNOSTIC_PHASE,
  TOKEN_DIAGNOSTIC_SEVERITIES,
  TOKEN_SCHEMA_VERSION,
  TOKEN_TIERS,
} from "./constants.js";
import type { TokenTier } from "./generated/token-paths.js";

export type { TokenTier } from "./generated/token-paths.js";

export type DtcgType = (typeof DTCG_TYPES)[number];

export type TokenJsonPrimitive = boolean | null | number | string;

export interface TokenJsonObject {
  readonly [key: string]: TokenJsonValue;
}

export type TokenJsonValue =
  | TokenJsonPrimitive
  | readonly TokenJsonValue[]
  | TokenJsonObject;

export type TokenDomainConstraint =
  | {
      readonly kind: "numberRange";
      readonly minimum?: number;
      readonly maximum?: number;
      readonly exclusiveMinimum?: number;
      readonly exclusiveMaximum?: number;
      readonly integer?: boolean;
    }
  | {
      readonly kind: "dimensionRange";
      readonly minimum?: number;
      readonly exclusiveMinimum?: number;
    }
  | {
      readonly kind: "durationRange";
      readonly minimumMilliseconds?: number;
    };

export interface TokenDomainDefinition {
  readonly id: string;
  readonly root: string;
  readonly allowedDTCGTypes: readonly DtcgType[];
  readonly constraints?: readonly TokenDomainConstraint[];
  readonly cssSerializers: readonly string[];
}

/** Carries the schema-faithful Domain Registry across authoring ports without reading `spec/`. */
export interface TokenDomainRegistry {
  readonly schemaVersion: typeof TOKEN_SCHEMA_VERSION;
  readonly domains: readonly TokenDomainDefinition[];
}

/** Describes one registered composite Token projection and its exact output identity. */
export interface CompositeTokenProjectorDescriptor {
  readonly id: string;
  readonly domain: string;
  readonly dtcgType: DtcgType;
  readonly outputProperties: readonly string[];
  readonly version: string;
}

/** Carries the schema-faithful composite projector Registry across authoring ports. */
export interface CompositeTokenProjectorRegistry {
  readonly schemaVersion: typeof TOKEN_SCHEMA_VERSION;
  readonly projectors: readonly CompositeTokenProjectorDescriptor[];
}

/** Lets a trusted caller provide deterministic canonical JSON digests without package I/O. */
export interface CanonicalDigestPort {
  /** Returns a deterministic digest for one already canonical JSON-safe value. */
  digestCanonicalJson(value: TokenJsonValue): string;
}

export interface NormalizedTokenIdentity {
  readonly id: string;
  readonly domain: string;
  readonly tier: TokenTier;
}

export interface TokenSourceLocation {
  readonly file: string;
  readonly pointer: string;
}

export interface ParsedDtcgToken extends NormalizedTokenIdentity {
  readonly dtcgType: DtcgType;
  readonly value: TokenJsonValue;
  readonly source: TokenSourceLocation;
  readonly aliasTarget?: string;
  readonly description?: string;
  readonly deprecated?: boolean | string;
  readonly extensions?: Readonly<Record<string, TokenJsonValue>>;
}

export interface ParsedDtcgDocument {
  readonly schemaVersion: typeof TOKEN_SCHEMA_VERSION;
  readonly tokens: readonly ParsedDtcgToken[];
}

export interface TokenSourceDocument {
  readonly filename: URL;
  readonly content: string;
}

export interface TokenDiagnostic {
  readonly code: string;
  readonly severity: (typeof TOKEN_DIAGNOSTIC_SEVERITIES)[number];
  readonly phase: typeof TOKEN_DIAGNOSTIC_PHASE;
  readonly message: string;
  readonly tokenId?: string;
  readonly location?: TokenSourceLocation;
}

export interface TokenParserPort {
  parse(sources: readonly TokenSourceDocument[]): Promise<ParsedDtcgDocument>;
}

export interface TokenContext {
  readonly [modifier: string]: string;
}

export interface ResolverModifierDefinition {
  readonly id: string;
  readonly values: readonly string[];
}

export interface ResolverModifierRegistry {
  readonly schemaVersion: typeof TOKEN_SCHEMA_VERSION;
  readonly modifiers: readonly ResolverModifierDefinition[];
}

export interface TokenContextOverrideDocument {
  readonly schemaVersion: typeof TOKEN_SCHEMA_VERSION;
  readonly context: TokenContext;
  readonly tokens: readonly ParsedDtcgToken[];
}

export interface TokenResolutionInput {
  readonly profileVersion: string;
  readonly sourceDigest: string;
  readonly base: ParsedDtcgDocument;
  readonly contexts: readonly TokenContextOverrideDocument[];
}

export interface ResolvedTokenEntry extends NormalizedTokenIdentity {
  readonly dtcgType: DtcgType;
  readonly resolvedValue: TokenJsonValue;
  readonly source: TokenSourceLocation;
  readonly dependencies: readonly string[];
  readonly description?: string;
  readonly deprecated?: boolean | string;
}

export interface ResolvedTokenContext {
  readonly context: TokenContext;
  readonly tokens: readonly ResolvedTokenEntry[];
}

export interface ResolvedTokenManifest {
  readonly schemaVersion: typeof RESOLVED_TOKEN_SCHEMA_VERSION;
  readonly profileVersion: string;
  readonly sourceDigest: string;
  readonly contexts: readonly ResolvedTokenContext[];
}

/** Represents one Token's entries and contexts from a resolved manifest. */
export interface IndexedResolvedToken {
  readonly id: string;
  readonly entries: readonly ResolvedTokenEntry[];
  readonly contexts: readonly TokenContext[];
}

/** Provides deterministic lookup over a caller-supplied resolved Token Manifest. */
export interface ResolvedTokenManifestIndex {
  /** Finds the complete context-ordered evidence for one resolved Token identity. */
  find(id: string): IndexedResolvedToken | undefined;
  readonly tokens: readonly IndexedResolvedToken[];
  readonly diagnostics: readonly TokenDiagnostic[];
}

export interface TokenResolutionResult {
  readonly manifest: ResolvedTokenManifest;
  readonly diagnostics: readonly TokenDiagnostic[];
}

export class TokenParseError extends Error {
  readonly diagnostics: readonly TokenDiagnostic[];

  constructor(
    message: string,
    diagnostics: readonly TokenDiagnostic[],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = TokenParseError.name;
    this.diagnostics = diagnostics;
  }
}

export class TokenResolutionError extends Error {
  readonly diagnostics: readonly TokenDiagnostic[];

  constructor(
    message: string,
    diagnostics: readonly TokenDiagnostic[],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = TokenResolutionError.name;
    this.diagnostics = diagnostics;
  }
}

export const isDtcgType = (value: string): value is DtcgType =>
  (DTCG_TYPES as readonly string[]).includes(value);

export const isTokenTier = (value: string): value is TokenTier =>
  (TOKEN_TIERS as readonly string[]).includes(value);
