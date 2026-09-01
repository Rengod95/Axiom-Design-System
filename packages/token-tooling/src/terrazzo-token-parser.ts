import {
  defineConfig,
  parse as parseWithTerrazzo,
  type TokenNormalized,
} from "@terrazzo/parser";

import {
  TokenParseError,
  isDtcgType,
  parseTokenIdentity,
  validateTokenDomainConstraints,
  validateTokenDomainType,
  type ParsedDtcgTokenV01,
  type TokenDiagnosticV01,
  type TokenDomainDefinition,
  type TokenJsonValue,
  type TokenParserPort,
  type TokenSourceDocumentV01,
} from "@axiom/tokens";

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
  const match = /^\{([^{}]+)\}$/.exec(value);
  return match?.[1];
};

const sourceLocation = (token: TokenNormalized): { file: string; pointer: string } => ({
  file: token.source.filename ?? "<unknown>",
  pointer: token.jsonID.startsWith("#") ? token.jsonID.slice(1) : token.jsonID,
});

const unsupportedType = (token: TokenNormalized): TokenDiagnosticV01 => ({
  code: "AXT1200",
  severity: "error",
  phase: "token",
  message: `Unsupported DTCG 2025.10 type '${token.$type}'.`,
  tokenId: token.id,
  location: sourceLocation(token),
});

const DTCG_SOURCE_UNITS = new Set(["px", "rem", "ms", "s"]);

const validateStandardUnits = (
  value: TokenJsonValue,
  token: TokenNormalized,
  pointer = "",
): readonly TokenDiagnosticV01[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      validateStandardUnits(entry, token, `${pointer}/${index}`),
    );
  }
  if (typeof value !== "object" || value === null) return [];

  const record = value as Readonly<Record<string, TokenJsonValue>>;
  const diagnostics: TokenDiagnosticV01[] = [];
  const unit = record["unit"];
  if (typeof unit === "string" && !DTCG_SOURCE_UNITS.has(unit)) {
    const source = sourceLocation(token);
    diagnostics.push({
      code: "AXT1203",
      severity: "error",
      phase: "token",
      message: `Unit '${unit}' is outside the DTCG 2025.10 source profile.`,
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
): { readonly token?: ParsedDtcgTokenV01; readonly diagnostics: readonly TokenDiagnosticV01[] } => {
  const identityResult = parseTokenIdentity(token.id, domains);
  const diagnostics: TokenDiagnosticV01[] = [...identityResult.diagnostics];

  if (!isDtcgType(token.$type)) diagnostics.push(unsupportedType(token));
  if (!identityResult.ok || !isDtcgType(token.$type)) return { diagnostics };

  diagnostics.push(...validateTokenDomainType(identityResult.identity, token.$type, domains));

  const value = cloneJson(token.$value, `${token.id} value`);
  const target = aliasTarget(token.$value);
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

  async parse(sources: readonly TokenSourceDocumentV01[]) {
    if (sources.length === 0) {
      throw new TokenParseError("At least one Token source is required.", [
        {
          code: "AXT0001",
          severity: "error",
          phase: "token",
          message: "At least one Token source is required.",
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
          skipLint: false,
        },
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new TokenParseError(
        "DTCG source parsing failed.",
        [
          {
            code: "AXT0002",
            severity: "error",
            phase: "token",
            message,
          },
        ],
        { cause },
      );
    }

    const diagnostics: TokenDiagnosticV01[] = [];
    const tokens: ParsedDtcgTokenV01[] = [];
    for (const token of Object.values(parsed.tokens).sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    )) {
      const normalized = normalizeToken(token, this.#domains);
      diagnostics.push(...normalized.diagnostics);
      if (normalized.token !== undefined) tokens.push(normalized.token);
    }

    if (diagnostics.length > 0) {
      throw new TokenParseError("Axiom Token normalization failed.", diagnostics);
    }

    return {
      schemaVersion: "0.1" as const,
      tokens,
    };
  }
}

export const createTerrazzoTokenParser = (
  options: TerrazzoTokenParserOptions,
): TokenParserPort => new TerrazzoTokenParser(options);
