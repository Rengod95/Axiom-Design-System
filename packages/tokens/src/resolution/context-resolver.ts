import {
  TokenResolutionError,
  type ParsedDtcgToken,
  type ResolvedTokenEntry,
  type ResolverModifierRegistry,
  type TokenContextOverrideDocument,
  type TokenContext,
  type TokenDiagnostic,
  type TokenDomainDefinition,
  type TokenJsonValue,
  type TokenResolutionInput,
  type TokenResolutionResult,
  type TokenTier,
} from "../contracts.js";
import {
  DEFAULT_DIAGNOSTIC_SEVERITY,
  INFORMATION_DIAGNOSTIC_SEVERITY,
  RESOLVED_TOKEN_SCHEMA_VERSION,
  STABLE_SORT_LOCALE,
  TOKEN_DIAGNOSTIC_CODE,
  TOKEN_DIAGNOSTIC_PHASE,
  TOKEN_ERROR_MESSAGE,
  TOKEN_REFERENCE_PATTERN,
} from "../constants.js";
import { validateTokenDomainConstraints } from "../domain/identity.js";
import { isTokenJsonObject } from "../domain/token-json-value.js";

export interface TokenContextResolverOptions {
  readonly domains: readonly TokenDomainDefinition[];
  readonly modifierRegistry: ResolverModifierRegistry;
}

const diagnostic = (
  code: string,
  message: string,
  token?: ParsedDtcgToken,
  severity: TokenDiagnostic["severity"] = DEFAULT_DIAGNOSTIC_SEVERITY,
): TokenDiagnostic => ({
  code,
  severity,
  phase: TOKEN_DIAGNOSTIC_PHASE,
  message,
  ...(token === undefined ? {} : { tokenId: token.id, location: token.source }),
});

const compareStableStrings = (left: string, right: string): number =>
  left.localeCompare(right, STABLE_SORT_LOCALE);

const referenceTarget = (value: TokenJsonValue): string | undefined =>
  typeof value === "string" ? TOKEN_REFERENCE_PATTERN.exec(value)?.[1] : undefined;

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
  if (isTokenJsonObject(value)) {
    for (const key of Object.keys(value).sort(compareStableStrings)) {
      const child = value[key];
      if (child !== undefined) collectReferences(child, references);
    }
  }
  return references;
};

const allowedTierEdge = (from: TokenTier, to: TokenTier): boolean => {
  if (from === "primitive") return to === "primitive";
  if (from === "semantic") return to === "primitive" || to === "semantic";
  return to === "semantic" || to === "component";
};

const duplicateTokenDiagnostics = (
  tokens: readonly ParsedDtcgToken[],
  label: string,
): readonly TokenDiagnostic[] => {
  const seen = new Set<string>();
  const diagnostics: TokenDiagnostic[] = [];
  for (const token of tokens) {
    if (seen.has(token.id)) {
      diagnostics.push(
        diagnostic(
          TOKEN_DIAGNOSTIC_CODE.DUPLICATE_TOKEN,
          `Duplicate Token id '${token.id}' in ${label}.`,
          token,
        ),
      );
    }
    seen.add(token.id);
  }
  return diagnostics;
};

const tokenMap = (
  tokens: readonly ParsedDtcgToken[],
): ReadonlyMap<string, ParsedDtcgToken> =>
  new Map(tokens.map((token) => [token.id, token]));

const validateGraph = (
  tokens: ReadonlyMap<string, ParsedDtcgToken>,
  strictComponentBase: boolean,
): readonly TokenDiagnostic[] => {
  const diagnostics: TokenDiagnostic[] = [];

  for (const token of [...tokens.values()].sort((left, right) =>
    left.id.localeCompare(right.id, STABLE_SORT_LOCALE),
  )) {
    const references = [...collectReferences(token.value)].sort((left, right) =>
      left.localeCompare(right, STABLE_SORT_LOCALE),
    );
    const wholeTarget = referenceTarget(token.value);

    if (strictComponentBase && token.tier === "component") {
      const target = wholeTarget === undefined ? undefined : tokens.get(wholeTarget);
      if (target?.tier !== "semantic") {
        diagnostics.push(
          diagnostic(
            TOKEN_DIAGNOSTIC_CODE.INVALID_COMPONENT_ALIAS,
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
            TOKEN_DIAGNOSTIC_CODE.UNKNOWN_REFERENCE,
            `Token '${token.id}' references unknown Token '${reference}'.`,
            token,
          ),
        );
        continue;
      }
      if (!allowedTierEdge(token.tier, target.tier)) {
        diagnostics.push(
          diagnostic(
            TOKEN_DIAGNOSTIC_CODE.FORBIDDEN_TIER_EDGE,
            `Forbidden Token tier edge '${token.tier} -> ${target.tier}' from '${token.id}' to '${target.id}'.`,
            token,
          ),
        );
      }
      if (wholeTarget === reference && token.domain !== target.domain) {
        diagnostics.push(
          diagnostic(
            TOKEN_DIAGNOSTIC_CODE.ALIAS_DOMAIN_MISMATCH,
            `Whole-Token alias '${token.id}' must preserve Domain '${token.domain}', received '${target.domain}'.`,
            token,
          ),
        );
      }
      if (wholeTarget === reference && token.dtcgType !== target.dtcgType) {
        diagnostics.push(
          diagnostic(
            TOKEN_DIAGNOSTIC_CODE.ALIAS_TYPE_MISMATCH,
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
      const key = [...new Set(cycle)].sort(compareStableStrings).join("|");
      if (!reported.has(key)) {
        reported.add(key);
        diagnostics.push(
          diagnostic(
            TOKEN_DIAGNOSTIC_CODE.ALIAS_CYCLE,
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
      for (const target of [...collectReferences(token.value)].sort(compareStableStrings)) {
        if (tokens.has(target)) visit(target);
      }
    }
    stack.pop();
    state.set(id, "done");
  };

  for (const id of [...tokens.keys()].sort(compareStableStrings)) visit(id);
  return diagnostics;
};

const expectedContexts = (
  registry: ResolverModifierRegistry,
): readonly TokenContext[] => {
  let contexts: readonly TokenContext[] = [{}];
  for (const modifier of registry.modifiers) {
    contexts = contexts.flatMap((context) =>
      modifier.values.map((value) => ({ ...context, [modifier.id]: value })),
    );
  }
  return contexts;
};

const contextKey = (
  context: TokenContext,
  registry: ResolverModifierRegistry,
): string => registry.modifiers.map((modifier) => `${modifier.id}=${context[modifier.id] ?? ""}`).join(";");

const validateContext = (
  document: TokenContextOverrideDocument,
  registry: ResolverModifierRegistry,
): readonly TokenDiagnostic[] => {
  const diagnostics: TokenDiagnostic[] = [];
  const expectedKeys = registry.modifiers.map((modifier) => modifier.id);
  const actualKeys = Object.keys(document.context);
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) => !expectedKeys.includes(key))
  ) {
    diagnostics.push(
      diagnostic(
        TOKEN_DIAGNOSTIC_CODE.INVALID_CONTEXT,
        `Context must contain exactly the registered modifiers: ${expectedKeys.join(", ")}.`,
      ),
    );
  }
  for (const modifier of registry.modifiers) {
    const value = document.context[modifier.id];
    if (value === undefined || !modifier.values.includes(value)) {
      diagnostics.push(
        diagnostic(
          TOKEN_DIAGNOSTIC_CODE.INVALID_CONTEXT,
          `Unknown value '${value ?? ""}' for Resolver modifier '${modifier.id}'.`,
        ),
      );
    }
  }
  return diagnostics;
};

const composeContext = (
  base: ReadonlyMap<string, ParsedDtcgToken>,
  document: TokenContextOverrideDocument,
): {
  readonly tokens: ReadonlyMap<string, ParsedDtcgToken>;
  readonly diagnostics: readonly TokenDiagnostic[];
} => {
  const diagnostics: TokenDiagnostic[] = [
    ...duplicateTokenDiagnostics(document.tokens, `context '${JSON.stringify(document.context)}'`),
  ];
  const composed = new Map(base);

  for (const override of document.tokens) {
    const original = base.get(override.id);
    if (original === undefined) {
      diagnostics.push(
        diagnostic(
          TOKEN_DIAGNOSTIC_CODE.CONTEXT_INTRODUCES_TOKEN,
          `Context override cannot introduce Token '${override.id}'.`,
          override,
        ),
      );
      continue;
    }
    if (original.tier === "primitive") {
      diagnostics.push(
        diagnostic(
          TOKEN_DIAGNOSTIC_CODE.PRIMITIVE_CONTEXT_OVERRIDE,
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
          TOKEN_DIAGNOSTIC_CODE.CONTEXT_IDENTITY_MISMATCH,
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
            TOKEN_DIAGNOSTIC_CODE.MISSING_COMPONENT_OVERRIDE_DESCRIPTION,
            `Component context override '${override.id}' requires a review description.`,
            override,
          ),
        );
        continue;
      }
      diagnostics.push(
        diagnostic(
          TOKEN_DIAGNOSTIC_CODE.COMPONENT_OVERRIDE_REVIEW,
          `Component context exception '${override.id}' requires promotion-policy review.`,
          override,
          INFORMATION_DIAGNOSTIC_SEVERITY,
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
  tokens: ReadonlyMap<string, ParsedDtcgToken>,
  domains: readonly TokenDomainDefinition[],
): {
  readonly tokens: readonly ResolvedTokenEntry[];
  readonly diagnostics: readonly TokenDiagnostic[];
} => {
  const cache = new Map<string, TokenJsonValue>();
  const active = new Set<string>();

  const resolveValue = (value: TokenJsonValue): TokenJsonValue => {
    const target = referenceTarget(value);
    if (target !== undefined) return resolveToken(target);
    if (Array.isArray(value)) return value.map((child) => resolveValue(child));
    if (isTokenJsonObject(value)) {
      return Object.fromEntries(
        Object.keys(value)
          .sort(compareStableStrings)
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

  const diagnostics: TokenDiagnostic[] = [];
  const entries = [...tokens.values()]
    .sort((left, right) => left.id.localeCompare(right.id, STABLE_SORT_LOCALE))
    .map((token): ResolvedTokenEntry => {
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
          left.localeCompare(right, STABLE_SORT_LOCALE),
        ),
        ...(token.description === undefined ? {} : { description: token.description }),
        ...(token.deprecated === undefined ? {} : { deprecated: token.deprecated }),
      };
    });

  return { tokens: entries, diagnostics };
};

export const resolveTokenContexts = (
  input: TokenResolutionInput,
  options: TokenContextResolverOptions,
): TokenResolutionResult => {
  const errors: TokenDiagnostic[] = [
    ...duplicateTokenDiagnostics(input.base.tokens, "base document"),
  ];
  const base = tokenMap(input.base.tokens);
  errors.push(...validateGraph(base, true));

  const expected = expectedContexts(options.modifierRegistry);
  const documents = new Map<string, TokenContextOverrideDocument>();
  for (const document of input.contexts) {
    errors.push(...validateContext(document, options.modifierRegistry));
    const key = contextKey(document.context, options.modifierRegistry);
    if (documents.has(key)) {
      errors.push(
        diagnostic(
          TOKEN_DIAGNOSTIC_CODE.CONTEXT_SET_MISMATCH,
          `Duplicate Resolver context '${key}'.`,
        ),
      );
    }
    documents.set(key, document);
  }
  for (const context of expected) {
    const key = contextKey(context, options.modifierRegistry);
    if (!documents.has(key)) {
      errors.push(
        diagnostic(
          TOKEN_DIAGNOSTIC_CODE.CONTEXT_SET_MISMATCH,
          `Missing required Resolver context '${key}'.`,
        ),
      );
    }
  }

  if (errors.some((entry) => entry.severity === DEFAULT_DIAGNOSTIC_SEVERITY)) {
    throw new TokenResolutionError(TOKEN_ERROR_MESSAGE.GRAPH_VALIDATION_FAILURE, errors);
  }

  const diagnostics: TokenDiagnostic[] = [];
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
        (entry) => entry.severity === DEFAULT_DIAGNOSTIC_SEVERITY,
      )
    ) {
      return { context, tokens: [] as readonly ResolvedTokenEntry[] };
    }
    const resolved = resolveGraph(composed.tokens, options.domains);
    diagnostics.push(...resolved.diagnostics);
    return { context, tokens: resolved.tokens };
  });

  if (diagnostics.some((entry) => entry.severity === DEFAULT_DIAGNOSTIC_SEVERITY)) {
    throw new TokenResolutionError(
      TOKEN_ERROR_MESSAGE.CONTEXT_RESOLUTION_FAILURE,
      diagnostics,
    );
  }

  return {
    diagnostics,
    manifest: {
      schemaVersion: RESOLVED_TOKEN_SCHEMA_VERSION,
      profileVersion: input.profileVersion,
      sourceDigest: input.sourceDigest,
      contexts,
    },
  };
};
