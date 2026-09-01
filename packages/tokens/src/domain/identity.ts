import {
  isTokenTier,
  type DtcgType,
  type NormalizedTokenIdentity,
  type TokenDiagnostic,
  type TokenDomainDefinition,
  type TokenJsonValue,
} from "../contracts.js";
import {
  DEFAULT_DIAGNOSTIC_SEVERITY,
  MILLISECONDS_PER_SECOND,
  TOKEN_DIAGNOSTIC_CODE,
  TOKEN_DIAGNOSTIC_PHASE,
  TOKEN_ID_DOMAIN_SEGMENT_INDEX,
  TOKEN_ID_HEAD_SEGMENT_PATTERN,
  TOKEN_ID_MINIMUM_SEGMENT_COUNT,
  TOKEN_ID_PATH_SEGMENT_PATTERN,
  TOKEN_ID_TIER_SEGMENT_INDEX,
} from "../constants.js";

export type TokenIdentityResult =
  | {
      readonly ok: true;
      readonly identity: NormalizedTokenIdentity;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly TokenDiagnostic[];
    };

const error = (code: string, message: string, tokenId: string): TokenDiagnostic => ({
  code,
  severity: DEFAULT_DIAGNOSTIC_SEVERITY,
  phase: TOKEN_DIAGNOSTIC_PHASE,
  message,
  tokenId,
});

export const parseTokenIdentity = (
  id: string,
  domains: readonly TokenDomainDefinition[],
): TokenIdentityResult => {
  const segments = id.split(".");
  const diagnostics: TokenDiagnostic[] = [];

  if (segments.length < TOKEN_ID_MINIMUM_SEGMENT_COUNT) {
    diagnostics.push(
      error(
        TOKEN_DIAGNOSTIC_CODE.MISSING_IDENTITY_SEGMENTS,
        "Token id must contain explicit domain, tier, and tier-specific path segments.",
        id,
      ),
    );
    return { ok: false, diagnostics };
  }

  const domain = segments[TOKEN_ID_DOMAIN_SEGMENT_INDEX] ?? "";
  const tier = segments[TOKEN_ID_TIER_SEGMENT_INDEX] ?? "";
  const invalidSegment = segments.find((segment, index) =>
    index <= TOKEN_ID_TIER_SEGMENT_INDEX
      ? !TOKEN_ID_HEAD_SEGMENT_PATTERN.test(segment)
      : !TOKEN_ID_PATH_SEGMENT_PATTERN.test(segment),
  );
  if (invalidSegment !== undefined) {
    diagnostics.push(
      error(
        TOKEN_DIAGNOSTIC_CODE.INVALID_PATH_SEGMENT,
        `Token path segment '${invalidSegment}' is invalid.`,
        id,
      ),
    );
  }

  if (!domains.some((entry) => entry.id === domain && entry.root === domain)) {
    diagnostics.push(
      error(TOKEN_DIAGNOSTIC_CODE.UNKNOWN_DOMAIN, `Unknown Token Domain '${domain}'.`, id),
    );
  }

  if (!isTokenTier(tier)) {
    diagnostics.push(
      error(TOKEN_DIAGNOSTIC_CODE.UNKNOWN_TIER, `Unknown or missing Token Tier '${tier}'.`, id),
    );
  }

  if (diagnostics.length > 0 || !isTokenTier(tier)) {
    return { ok: false, diagnostics };
  }

  return {
    ok: true,
    identity: { id, domain, tier },
    diagnostics: [],
  };
};

export const validateTokenDomainType = (
  identity: NormalizedTokenIdentity,
  dtcgType: DtcgType,
  domains: readonly TokenDomainDefinition[],
): readonly TokenDiagnostic[] => {
  const domain = domains.find((entry) => entry.id === identity.domain);
  if (domain === undefined) {
    return [
      error(
        TOKEN_DIAGNOSTIC_CODE.UNKNOWN_DOMAIN,
        `Unknown Token Domain '${identity.domain}'.`,
        identity.id,
      ),
    ];
  }
  if (!domain.allowedDTCGTypes.includes(dtcgType)) {
    return [
      error(
        TOKEN_DIAGNOSTIC_CODE.DOMAIN_TYPE_MISMATCH,
        `Token Domain '${identity.domain}' does not accept DTCG type '${dtcgType}'.`,
        identity.id,
      ),
    ];
  }
  return [];
};

const isRecord = (value: TokenJsonValue): value is Readonly<Record<string, TokenJsonValue>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numericValue = (dtcgType: DtcgType, value: TokenJsonValue): number | undefined => {
  if (dtcgType === "number") return typeof value === "number" ? value : undefined;
  if (!isRecord(value) || typeof value["value"] !== "number") return undefined;

  if (dtcgType === "dimension") return value["value"];
  if (dtcgType === "duration") {
    return value["unit"] === "s"
      ? value["value"] * MILLISECONDS_PER_SECOND
      : value["value"];
  }
  return undefined;
};

export const validateTokenDomainConstraints = (
  identity: NormalizedTokenIdentity,
  dtcgType: DtcgType,
  value: TokenJsonValue,
  domains: readonly TokenDomainDefinition[],
  aliasTarget?: string,
): readonly TokenDiagnostic[] => {
  if (aliasTarget !== undefined) return [];
  const domain = domains.find((entry) => entry.id === identity.domain);
  if (domain?.constraints === undefined) return [];

  const diagnostics: TokenDiagnostic[] = [];
  const numeric = numericValue(dtcgType, value);
  for (const constraint of domain.constraints) {
    let valid = numeric !== undefined;
    if (numeric !== undefined) {
      if (constraint.kind === "numberRange") {
        if (constraint.minimum !== undefined) valid &&= numeric >= constraint.minimum;
        if (constraint.maximum !== undefined) valid &&= numeric <= constraint.maximum;
        if (constraint.exclusiveMinimum !== undefined) {
          valid &&= numeric > constraint.exclusiveMinimum;
        }
        if (constraint.exclusiveMaximum !== undefined) {
          valid &&= numeric < constraint.exclusiveMaximum;
        }
        if (constraint.integer === true) valid &&= Number.isInteger(numeric);
      } else if (constraint.kind === "dimensionRange") {
        if (constraint.minimum !== undefined) valid &&= numeric >= constraint.minimum;
        if (constraint.exclusiveMinimum !== undefined) {
          valid &&= numeric > constraint.exclusiveMinimum;
        }
      } else if (constraint.minimumMilliseconds !== undefined) {
        valid &&= numeric >= constraint.minimumMilliseconds;
      }
    }

    if (!valid) {
      diagnostics.push(
        error(
          TOKEN_DIAGNOSTIC_CODE.DOMAIN_CONSTRAINT_VIOLATION,
          `Token '${identity.id}' violates Domain constraint '${constraint.kind}'.`,
          identity.id,
        ),
      );
    }
  }
  return diagnostics;
};
