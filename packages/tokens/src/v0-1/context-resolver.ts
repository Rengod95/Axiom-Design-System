import {
  TokenResolutionError,
  type ParsedDtcgTokenV01,
  type ResolvedTokenEntryV02,
  type ResolverModifierRegistryV01,
  type TokenContextOverrideDocumentV01,
  type TokenContextV01,
  type TokenDiagnosticV01,
  type TokenDomainDefinition,
  type TokenJsonValue,
  type TokenResolutionInputV01,
  type TokenResolutionResultV01,
  type TokenTierV01,
} from "./contracts.js";
import { validateTokenDomainConstraints } from "./identity.js";

export interface TokenContextResolverOptionsV01 {
  readonly domains: readonly TokenDomainDefinition[];
  readonly modifierRegistry: ResolverModifierRegistryV01;
}

const referencePattern = /^\{([^{}]+)\}$/;

const diagnostic = (
  code: string,
  message: string,
  token?: ParsedDtcgTokenV01,
  severity: TokenDiagnosticV01["severity"] = "error",
): TokenDiagnosticV01 => ({
  code,
  severity,
  phase: "token",
  message,
  ...(token === undefined ? {} : { tokenId: token.id, location: token.source }),
});

const referenceTarget = (value: TokenJsonValue): string | undefined =>
  typeof value === "string" ? referencePattern.exec(value)?.[1] : undefined;

const isJsonObject = (
  value: TokenJsonValue,
): value is Readonly<Record<string, TokenJsonValue>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const collectReferences = (value: TokenJsonValue, references = new Set<string>()): Set<string> => {
  const target = referenceTarget(value);
  if (target !== undefined) {
    references.add(target);
    return references;
  }
  if (Array.isArray(value)) {
    for (const child of value) collectReferences(child, references);
    return references;
  }
  if (isJsonObject(value)) {
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      if (child !== undefined) collectReferences(child, references);
    }
  }
  return references;
};

const allowedTierEdge = (from: TokenTierV01, to: TokenTierV01): boolean => {
  if (from === "primitive") return to === "primitive";
  if (from === "semantic") return to === "primitive" || to === "semantic";
  return to === "semantic" || to === "component";
};

const duplicateTokenDiagnostics = (
  tokens: readonly ParsedDtcgTokenV01[],
  label: string,
): readonly TokenDiagnosticV01[] => {
  const seen = new Set<string>();
  const diagnostics: TokenDiagnosticV01[] = [];
  for (const token of tokens) {
    if (seen.has(token.id)) {
      diagnostics.push(
        diagnostic("AXT1301", `Duplicate Token id '${token.id}' in ${label}.`, token),
      );
    }
    seen.add(token.id);
  }
  return diagnostics;
};

const tokenMap = (
  tokens: readonly ParsedDtcgTokenV01[],
): ReadonlyMap<string, ParsedDtcgTokenV01> =>
  new Map(tokens.map((token) => [token.id, token]));

const validateGraph = (
  tokens: ReadonlyMap<string, ParsedDtcgTokenV01>,
  strictComponentBase: boolean,
): readonly TokenDiagnosticV01[] => {
  const diagnostics: TokenDiagnosticV01[] = [];

  for (const token of [...tokens.values()].sort((left, right) =>
    left.id.localeCompare(right.id, "en"),
  )) {
    const references = [...collectReferences(token.value)].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
    const wholeTarget = referenceTarget(token.value);

    if (strictComponentBase && token.tier === "component") {
      const target = wholeTarget === undefined ? undefined : tokens.get(wholeTarget);
      if (target?.tier !== "semantic") {
        diagnostics.push(
          diagnostic(
            "AXT1405",
            `Base Component Token '${token.id}' must directly alias a Semantic Token.`,
            token,
          ),
        );
      }
    }

    for (const reference of references) {
      const target = tokens.get(reference);
      if (target === undefined) {
        diagnostics.push(
          diagnostic(
            "AXT1400",
            `Token '${token.id}' references unknown Token '${reference}'.`,
            token,
          ),
        );
        continue;
      }
      if (!allowedTierEdge(token.tier, target.tier)) {
        diagnostics.push(
          diagnostic(
            "AXT1401",
            `Forbidden Token tier edge '${token.tier} -> ${target.tier}' from '${token.id}' to '${target.id}'.`,
            token,
          ),
        );
      }
      if (wholeTarget === reference && token.domain !== target.domain) {
        diagnostics.push(
          diagnostic(
            "AXT1402",
            `Whole-Token alias '${token.id}' must preserve Domain '${token.domain}', received '${target.domain}'.`,
            token,
          ),
        );
      }
      if (wholeTarget === reference && token.dtcgType !== target.dtcgType) {
        diagnostics.push(
          diagnostic(
            "AXT1403",
            `Whole-Token alias '${token.id}' must preserve DTCG type '${token.dtcgType}', received '${target.dtcgType}'.`,
            token,
          ),
        );
      }
    }
  }

  const state = new Map<string, "active" | "done">();
  const stack: string[] = [];
  const reported = new Set<string>();
  const visit = (id: string): void => {
    const current = state.get(id);
    if (current === "done") return;
    if (current === "active") {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      const key = [...new Set(cycle)].sort().join("|");
      if (!reported.has(key)) {
        reported.add(key);
        diagnostics.push(
          diagnostic(
            "AXT1404",
            `Token alias cycle detected: ${cycle.join(" -> ")}.`,
            tokens.get(id),
          ),
        );
      }
      return;
    }

    state.set(id, "active");
    stack.push(id);
    const token = tokens.get(id);
    if (token !== undefined) {
      for (const target of [...collectReferences(token.value)].sort()) {
        if (tokens.has(target)) visit(target);
      }
    }
    stack.pop();
    state.set(id, "done");
  };

  for (const id of [...tokens.keys()].sort()) visit(id);
  return diagnostics;
};

const expectedContexts = (
  registry: ResolverModifierRegistryV01,
): readonly TokenContextV01[] => {
  let contexts: readonly TokenContextV01[] = [{}];
  for (const modifier of registry.modifiers) {
    contexts = contexts.flatMap((context) =>
      modifier.values.map((value) => ({ ...context, [modifier.id]: value })),
    );
  }
  return contexts;
};

const contextKey = (
  context: TokenContextV01,
  registry: ResolverModifierRegistryV01,
): string => registry.modifiers.map((modifier) => `${modifier.id}=${context[modifier.id] ?? ""}`).join(";");

const validateContext = (
  document: TokenContextOverrideDocumentV01,
  registry: ResolverModifierRegistryV01,
): readonly TokenDiagnosticV01[] => {
  const diagnostics: TokenDiagnosticV01[] = [];
  const expectedKeys = registry.modifiers.map((modifier) => modifier.id);
  const actualKeys = Object.keys(document.context);
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) => !expectedKeys.includes(key))
  ) {
    diagnostics.push(
      diagnostic(
        "AXT1500",
        `Context must contain exactly the registered modifiers: ${expectedKeys.join(", ")}.`,
      ),
    );
  }
  for (const modifier of registry.modifiers) {
    const value = document.context[modifier.id];
    if (value === undefined || !modifier.values.includes(value)) {
      diagnostics.push(
        diagnostic(
          "AXT1500",
          `Unknown value '${value ?? ""}' for Resolver modifier '${modifier.id}'.`,
        ),
      );
    }
  }
  return diagnostics;
};

const composeContext = (
  base: ReadonlyMap<string, ParsedDtcgTokenV01>,
  document: TokenContextOverrideDocumentV01,
): {
  readonly tokens: ReadonlyMap<string, ParsedDtcgTokenV01>;
  readonly diagnostics: readonly TokenDiagnosticV01[];
} => {
  const diagnostics: TokenDiagnosticV01[] = [
    ...duplicateTokenDiagnostics(document.tokens, `context '${JSON.stringify(document.context)}'`),
  ];
  const composed = new Map(base);

  for (const override of document.tokens) {
    const original = base.get(override.id);
    if (original === undefined) {
      diagnostics.push(
        diagnostic(
          "AXT1502",
          `Context override cannot introduce Token '${override.id}'.`,
          override,
        ),
      );
      continue;
    }
    if (original.tier === "primitive") {
      diagnostics.push(
        diagnostic(
          "AXT1503",
          `Context override cannot change Primitive Token '${override.id}'.`,
          override,
        ),
      );
      continue;
    }
    if (
      original.domain !== override.domain ||
      original.tier !== override.tier ||
      original.dtcgType !== override.dtcgType
    ) {
      diagnostics.push(
        diagnostic(
          "AXT1504",
          `Context override '${override.id}' must preserve Domain, tier, and DTCG type.`,
          override,
        ),
      );
      continue;
    }
    if (original.tier === "component") {
      if (override.description === undefined || override.description.trim() === "") {
        diagnostics.push(
          diagnostic(
            "AXT1505",
            `Component context override '${override.id}' requires a review description.`,
            override,
          ),
        );
        continue;
      }
      diagnostics.push(
        diagnostic(
          "AXT1506",
          `Component context exception '${override.id}' requires promotion-policy review.`,
          override,
          "info",
        ),
      );
    }

    const { aliasTarget: _originalAliasTarget, ...originalWithoutAlias } = original;
    composed.set(override.id, {
      ...originalWithoutAlias,
      value: override.value,
      source: override.source,
      ...(override.aliasTarget === undefined ? {} : { aliasTarget: override.aliasTarget }),
      ...(override.description === undefined
        ? {}
        : { description: override.description }),
      ...(override.deprecated === undefined
        ? {}
        : { deprecated: override.deprecated }),
    });
  }

  return { tokens: composed, diagnostics };
};

const resolveGraph = (
  tokens: ReadonlyMap<string, ParsedDtcgTokenV01>,
  domains: readonly TokenDomainDefinition[],
): {
  readonly tokens: readonly ResolvedTokenEntryV02[];
  readonly diagnostics: readonly TokenDiagnosticV01[];
} => {
  const cache = new Map<string, TokenJsonValue>();
  const active = new Set<string>();

  const resolveValue = (value: TokenJsonValue): TokenJsonValue => {
    const target = referenceTarget(value);
    if (target !== undefined) return resolveToken(target);
    if (Array.isArray(value)) return value.map((child) => resolveValue(child));
    if (isJsonObject(value)) {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, resolveValue(value[key] as TokenJsonValue)]),
      );
    }
    return value;
  };

  const resolveToken = (id: string): TokenJsonValue => {
    const cached = cache.get(id);
    if (cached !== undefined) return cached;
    if (active.has(id)) throw new Error(`cycle reached while resolving '${id}'`);
    const token = tokens.get(id);
    if (token === undefined) throw new Error(`unknown Token '${id}' reached while resolving`);
    active.add(id);
    const resolved = resolveValue(token.value);
    active.delete(id);
    cache.set(id, resolved);
    return resolved;
  };

  const diagnostics: TokenDiagnosticV01[] = [];
  const entries = [...tokens.values()]
    .sort((left, right) => left.id.localeCompare(right.id, "en"))
    .map((token): ResolvedTokenEntryV02 => {
      const resolvedValue = resolveToken(token.id);
      diagnostics.push(
        ...validateTokenDomainConstraints(
          token,
          token.dtcgType,
          resolvedValue,
          domains,
        ).map((entry) => ({ ...entry, location: token.source })),
      );
      return {
        id: token.id,
        domain: token.domain,
        tier: token.tier,
        dtcgType: token.dtcgType,
        resolvedValue,
        source: token.source,
        dependencies: [...collectReferences(token.value)].sort((left, right) =>
          left.localeCompare(right, "en"),
        ),
        ...(token.description === undefined ? {} : { description: token.description }),
        ...(token.deprecated === undefined ? {} : { deprecated: token.deprecated }),
      };
    });

  return { tokens: entries, diagnostics };
};

export const resolveTokenContextsV01 = (
  input: TokenResolutionInputV01,
  options: TokenContextResolverOptionsV01,
): TokenResolutionResultV01 => {
  const errors: TokenDiagnosticV01[] = [
    ...duplicateTokenDiagnostics(input.base.tokens, "base document"),
  ];
  const base = tokenMap(input.base.tokens);
  errors.push(...validateGraph(base, true));

  const expected = expectedContexts(options.modifierRegistry);
  const documents = new Map<string, TokenContextOverrideDocumentV01>();
  for (const document of input.contexts) {
    errors.push(...validateContext(document, options.modifierRegistry));
    const key = contextKey(document.context, options.modifierRegistry);
    if (documents.has(key)) {
      errors.push(diagnostic("AXT1501", `Duplicate Resolver context '${key}'.`));
    }
    documents.set(key, document);
  }
  for (const context of expected) {
    const key = contextKey(context, options.modifierRegistry);
    if (!documents.has(key)) {
      errors.push(diagnostic("AXT1501", `Missing required Resolver context '${key}'.`));
    }
  }

  if (errors.some((entry) => entry.severity === "error")) {
    throw new TokenResolutionError("Axiom Token graph validation failed.", errors);
  }

  const diagnostics: TokenDiagnosticV01[] = [];
  const contexts = expected.map((context) => {
    const key = contextKey(context, options.modifierRegistry);
    const document = documents.get(key);
    if (document === undefined) {
      throw new Error(`validated context '${key}' is missing`);
    }
    const composed = composeContext(base, document);
    diagnostics.push(...composed.diagnostics);
    const graphDiagnostics = validateGraph(composed.tokens, false);
    diagnostics.push(...graphDiagnostics);
    if (
      [...composed.diagnostics, ...graphDiagnostics].some(
        (entry) => entry.severity === "error",
      )
    ) {
      return { context, tokens: [] as readonly ResolvedTokenEntryV02[] };
    }
    const resolved = resolveGraph(composed.tokens, options.domains);
    diagnostics.push(...resolved.diagnostics);
    return { context, tokens: resolved.tokens };
  });

  if (diagnostics.some((entry) => entry.severity === "error")) {
    throw new TokenResolutionError("Axiom Token context resolution failed.", diagnostics);
  }

  return {
    diagnostics,
    manifest: {
      schemaVersion: "0.2",
      profileVersion: input.profileVersion,
      sourceDigest: input.sourceDigest,
      contexts,
    },
  };
};
