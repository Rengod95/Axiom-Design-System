export const DTCG_TYPES = [
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
  "typography",
] as const;

export type DtcgType = (typeof DTCG_TYPES)[number];

export const TOKEN_TIERS = ["primitive", "semantic", "component"] as const;

export type TokenTierV01 = (typeof TOKEN_TIERS)[number];

export type TokenJsonPrimitive = boolean | null | number | string;

export type TokenJsonValue =
  | TokenJsonPrimitive
  | readonly TokenJsonValue[]
  | { readonly [key: string]: TokenJsonValue };

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
}

export interface NormalizedTokenIdentityV01 {
  readonly id: string;
  readonly domain: string;
  readonly tier: TokenTierV01;
}

export interface TokenSourceLocationV01 {
  readonly file: string;
  readonly pointer: string;
}

export interface ParsedDtcgTokenV01 extends NormalizedTokenIdentityV01 {
  readonly dtcgType: DtcgType;
  readonly value: TokenJsonValue;
  readonly source: TokenSourceLocationV01;
  readonly aliasTarget?: string;
  readonly description?: string;
  readonly deprecated?: boolean | string;
  readonly extensions?: Readonly<Record<string, TokenJsonValue>>;
}

export interface ParsedDtcgDocumentV01 {
  readonly schemaVersion: "0.1";
  readonly tokens: readonly ParsedDtcgTokenV01[];
}

export interface TokenSourceDocumentV01 {
  readonly filename: URL;
  readonly content: string;
}

export interface TokenDiagnosticV01 {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly phase: "token";
  readonly message: string;
  readonly tokenId?: string;
  readonly location?: TokenSourceLocationV01;
}

export interface TokenParserPort {
  parse(sources: readonly TokenSourceDocumentV01[]): Promise<ParsedDtcgDocumentV01>;
}

export class TokenParseError extends Error {
  readonly diagnostics: readonly TokenDiagnosticV01[];

  constructor(
    message: string,
    diagnostics: readonly TokenDiagnosticV01[],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TokenParseError";
    this.diagnostics = diagnostics;
  }
}

export const isDtcgType = (value: string): value is DtcgType =>
  (DTCG_TYPES as readonly string[]).includes(value);

export const isTokenTierV01 = (value: string): value is TokenTierV01 =>
  (TOKEN_TIERS as readonly string[]).includes(value);
