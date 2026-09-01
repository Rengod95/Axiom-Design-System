import {
  isTokenTierV01,
  type DtcgType,
  type NormalizedTokenIdentityV01,
  type TokenDiagnosticV01,
  type TokenDomainDefinition,
  type TokenJsonValue,
} from "./contracts.js";

const HEAD_SEGMENT_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const PATH_SEGMENT_PATTERN = /^[a-z0-9][A-Za-z0-9]*$/;

export type TokenIdentityResult =
  | {
      readonly ok: true;
      readonly identity: NormalizedTokenIdentityV01;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly TokenDiagnosticV01[];
    };

const error = (code: string, message: string, tokenId: string): TokenDiagnosticV01 => ({
  code,
  severity: "error",
  phase: "token",
  message,
  tokenId,
});

export const parseTokenIdentity = (
  id: string,
  domains: readonly TokenDomainDefinition[],
): TokenIdentityResult => {
  const segments = id.split(".");
  const diagnostics: TokenDiagnosticV01[] = [];

  if (segments.length < 3) {
    diagnostics.push(
      error(
        "AXT1100",
        "Token id must contain explicit domain, tier, and tier-specific path segments.",
        id,
      ),
    );
    return { ok: false, diagnostics };
  }

  const domain = segments[0] ?? "";
  const tier = segments[1] ?? "";
  const invalidSegment = segments.find((segment, index) =>
    index < 2 ? !HEAD_SEGMENT_PATTERN.test(segment) : !PATH_SEGMENT_PATTERN.test(segment),
  );
  if (invalidSegment !== undefined) {
    diagnostics.push(
      error("AXT1105", `Token path segment '${invalidSegment}' is invalid.`, id),
    );
  }

  if (!domains.some((entry) => entry.id === domain && entry.root === domain)) {
    diagnostics.push(error("AXT1103", `Unknown Token Domain '${domain}'.`, id));
  }

  if (!isTokenTierV01(tier)) {
    diagnostics.push(error("AXT1104", `Unknown or missing Token Tier '${tier}'.`, id));
  }

  if (diagnostics.length > 0 || !isTokenTierV01(tier)) {
    return { ok: false, diagnostics };
  }

  return {
    ok: true,
    identity: { id, domain, tier },
    diagnostics: [],
  };
};

export const validateTokenDomainType = (
  identity: NormalizedTokenIdentityV01,
  dtcgType: DtcgType,
  domains: readonly TokenDomainDefinition[],
): readonly TokenDiagnosticV01[] => {
  const domain = domains.find((entry) => entry.id === identity.domain);
  if (domain === undefined) {
    return [error("AXT1103", `Unknown Token Domain '${identity.domain}'.`, identity.id)];
  }
  if (!domain.allowedDTCGTypes.includes(dtcgType)) {
    return [
      error(
        "AXT1201",
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
    return value["unit"] === "s" ? value["value"] * 1_000 : value["value"];
  }
  return undefined;
};

export const validateTokenDomainConstraints = (
  identity: NormalizedTokenIdentityV01,
  dtcgType: DtcgType,
  value: TokenJsonValue,
  domains: readonly TokenDomainDefinition[],
  aliasTarget?: string,
): readonly TokenDiagnosticV01[] => {
  if (aliasTarget !== undefined) return [];
  const domain = domains.find((entry) => entry.id === identity.domain);
  if (domain?.constraints === undefined) return [];

  const diagnostics: TokenDiagnosticV01[] = [];
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
          "AXT1202",
          `Token '${identity.id}' violates Domain constraint '${constraint.kind}'.`,
          identity.id,
        ),
      );
    }
  }
  return diagnostics;
};
