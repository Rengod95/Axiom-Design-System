import {
  defineConfig,
  parse as parseWithTerrazzo,
  type TokenNormalized,
} from "@terrazzo/parser";

import {
  TOKEN_SCHEMA_VERSION,
  TokenParseError,
  isDtcgType,
  parseTokenIdentity,
  validateTokenDomainConstraints,
  validateTokenDomainType,
  type ParsedDtcgToken,
  type TokenDiagnostic,
  type TokenDomainDefinition,
  type TokenJsonValue,
  type TokenParserPort,
  type TokenSourceDocument,
} from "@axiom/tokens";

import {
  DTCG_PROFILE_VERSION,
  DTCG_SOURCE_UNITS,
  EMPTY_JSON_POINTER,
  ERROR_DIAGNOSTIC_SEVERITY,
  PARSER_DIAGNOSTIC_CODE,
  PARSER_ERROR_MESSAGE,
  PARSER_SKIP_LINT,
  ROOT_JSON_POINTER_PREFIX,
  ROOT_JSON_POINTER_PREFIX_LENGTH,
  TOKEN_DIAGNOSTIC_PHASE,
  TOKEN_REFERENCE_PATTERN,
  UNKNOWN_SOURCE_NAME,
} from "./constants.js";
import { validateDtcgValue } from "./dtcg-value-validator.js";

export interface TerrazzoTokenParserOptions {
  readonly domains: readonly TokenDomainDefinition[];
  readonly cwd?: URL;
}

const cloneJson = (value: unknown, subject: string): TokenJsonValue => {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError(`${subject} is not JSON-serializable.`);
  }
  return JSON.parse(serialized) as TokenJsonValue;
};

const aliasTarget = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const match = TOKEN_REFERENCE_PATTERN.exec(value);
  return match?.[1];
};

const authoredValue = (token: TokenNormalized): unknown => {
  const originalValue = (token as TokenNormalized & { readonly originalValue?: unknown })
    .originalValue;
  if (
    typeof originalValue === "object" &&
    originalValue !== null &&
    "$value" in originalValue
  ) {
    return (originalValue as unknown as Readonly<Record<string, unknown>>)["$value"];
  }
  return token.$value;
};

const sourceLocation = (token: TokenNormalized): { file: string; pointer: string } => ({
  file: token.source.filename ?? UNKNOWN_SOURCE_NAME,
  pointer: token.jsonID.startsWith(ROOT_JSON_POINTER_PREFIX)
    ? token.jsonID.slice(ROOT_JSON_POINTER_PREFIX_LENGTH)
    : token.jsonID,
});

const unsupportedType = (token: TokenNormalized): TokenDiagnostic => ({
  code: PARSER_DIAGNOSTIC_CODE.UNSUPPORTED_DTCG_TYPE,
  severity: ERROR_DIAGNOSTIC_SEVERITY,
  phase: TOKEN_DIAGNOSTIC_PHASE,
  message: `Unsupported DTCG ${DTCG_PROFILE_VERSION} type '${token.$type}'.`,
  tokenId: token.id,
  location: sourceLocation(token),
});

const validateStandardUnits = (
  value: TokenJsonValue,
  token: TokenNormalized,
  pointer = EMPTY_JSON_POINTER,
): readonly TokenDiagnostic[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      validateStandardUnits(entry, token, `${pointer}/${index}`),
    );
  }
  if (typeof value !== "object" || value === null) return [];

  const record = value as Readonly<Record<string, TokenJsonValue>>;
  const diagnostics: TokenDiagnostic[] = [];
  const unit = record["unit"];
  if (typeof unit === "string" && !DTCG_SOURCE_UNITS.has(unit)) {
    const source = sourceLocation(token);
    diagnostics.push({
      code: PARSER_DIAGNOSTIC_CODE.UNSUPPORTED_DTCG_UNIT,
      severity: ERROR_DIAGNOSTIC_SEVERITY,
      phase: TOKEN_DIAGNOSTIC_PHASE,
      message: `Unit '${unit}' is outside the DTCG ${DTCG_PROFILE_VERSION} source profile.`,
      tokenId: token.id,
      location: {
        ...source,
        pointer: `${source.pointer}/$value${pointer}/unit`,
      },
    });
  }

  for (const [key, child] of Object.entries(record)) {
    diagnostics.push(...validateStandardUnits(child, token, `${pointer}/${key}`));
  }
  return diagnostics;
};

const normalizeToken = (
  token: TokenNormalized,
  domains: readonly TokenDomainDefinition[],
): { readonly token?: ParsedDtcgToken; readonly diagnostics: readonly TokenDiagnostic[] } => {
  const identityResult = parseTokenIdentity(token.id, domains);
  const diagnostics: TokenDiagnostic[] = [...identityResult.diagnostics];

  if (!isDtcgType(token.$type)) diagnostics.push(unsupportedType(token));
  if (!identityResult.ok || !isDtcgType(token.$type)) return { diagnostics };

  diagnostics.push(...validateTokenDomainType(identityResult.identity, token.$type, domains));

  const sourceValue = authoredValue(token);
  const value = cloneJson(sourceValue, `${token.id} value`);
  const target = aliasTarget(sourceValue);
  diagnostics.push(...validateDtcgValue(token.id, token.$type, value, sourceLocation(token)));
  diagnostics.push(...validateStandardUnits(value, token));
  diagnostics.push(
    ...validateTokenDomainConstraints(
      identityResult.identity,
      token.$type,
      value,
      domains,
      target,
    ),
  );
  if (diagnostics.length > 0) return { diagnostics };

  const extensions =
    token.$extensions === undefined
      ? undefined
      : (cloneJson(token.$extensions, `${token.id} extensions`) as Readonly<
          Record<string, TokenJsonValue>
        >);

  return {
    diagnostics,
    token: {
      ...identityResult.identity,
      dtcgType: token.$type,
      value,
      source: sourceLocation(token),
      ...(target === undefined ? {} : { aliasTarget: target }),
      ...(token.$description === undefined ? {} : { description: token.$description }),
      ...(token.$deprecated === undefined ? {} : { deprecated: token.$deprecated }),
      ...(extensions === undefined ? {} : { extensions }),
    },
  };
};

export class TerrazzoTokenParser implements TokenParserPort {
  readonly #domains: readonly TokenDomainDefinition[];
  readonly #cwd: URL | undefined;

  constructor(options: TerrazzoTokenParserOptions) {
    this.#domains = options.domains;
    this.#cwd = options.cwd;
  }

  async parse(sources: readonly TokenSourceDocument[]) {
    if (sources.length === 0) {
      throw new TokenParseError(PARSER_ERROR_MESSAGE.MISSING_SOURCE, [
        {
          code: PARSER_DIAGNOSTIC_CODE.MISSING_SOURCE,
          severity: ERROR_DIAGNOSTIC_SEVERITY,
          phase: TOKEN_DIAGNOSTIC_PHASE,
          message: PARSER_ERROR_MESSAGE.MISSING_SOURCE,
        },
      ]);
    }

    const sortedSources = [...sources].sort((left, right) =>
      left.filename.href < right.filename.href
        ? -1
        : left.filename.href > right.filename.href
          ? 1
          : 0,
    );
    const cwd = this.#cwd ?? new URL(".", sortedSources[0]?.filename);
    const config = defineConfig({}, { cwd });

    let parsed: Awaited<ReturnType<typeof parseWithTerrazzo>>;
    try {
      parsed = await parseWithTerrazzo(
        sortedSources.map((source) => ({
          filename: source.filename,
          src: source.content,
        })),
        {
          config,
          resolveAliases: false,
          skipLint: PARSER_SKIP_LINT,
        },
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new TokenParseError(
        PARSER_ERROR_MESSAGE.PARSE_FAILURE,
        [
          {
            code: PARSER_DIAGNOSTIC_CODE.PARSE_FAILURE,
            severity: ERROR_DIAGNOSTIC_SEVERITY,
            phase: TOKEN_DIAGNOSTIC_PHASE,
            message,
          },
        ],
        { cause },
      );
    }

    const diagnostics: TokenDiagnostic[] = [];
    const tokens: ParsedDtcgToken[] = [];
    for (const token of Object.values(parsed.tokens).sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    )) {
      const normalized = normalizeToken(token, this.#domains);
      diagnostics.push(...normalized.diagnostics);
      if (normalized.token !== undefined) tokens.push(normalized.token);
    }

    if (diagnostics.length > 0) {
      throw new TokenParseError(PARSER_ERROR_MESSAGE.NORMALIZATION_FAILURE, diagnostics);
    }

    return {
      schemaVersion: TOKEN_SCHEMA_VERSION,
      tokens,
    };
  }
}

export const createTerrazzoTokenParser = (
  options: TerrazzoTokenParserOptions,
): TokenParserPort => new TerrazzoTokenParser(options);
