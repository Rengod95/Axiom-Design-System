import type {
  Diagnostic,
  JsonValue,
  SemanticValidatorId,
} from "./types.js";

interface RecordValue {
  readonly [key: string]: unknown;
  readonly allowedDTCGTypes?: unknown;
  readonly constraints?: unknown;
  readonly context?: unknown;
  readonly contexts?: unknown;
  readonly dependencies?: unknown;
  readonly domain?: unknown;
  readonly domains?: unknown;
  readonly id?: unknown;
  readonly kind?: unknown;
  readonly root?: unknown;
  readonly resolvedValue?: unknown;
  readonly tier?: unknown;
  readonly tokens?: unknown;
}

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const tokenDiagnostic = (
  code: string,
  message: string,
  pointer: string,
  details?: Readonly<Record<string, JsonValue>>,
): Diagnostic => ({
  code,
  severity: "error",
  phase: "token",
  message,
  location: { file: "<memory>", pointer },
  ...(details === undefined ? {} : { details }),
});

const validateTokenIdentity = (value: unknown): readonly Diagnostic[] => {
  if (!isRecord(value)) return [];

  const { domain, id, tier } = value;
  if (typeof id !== "string" || typeof domain !== "string" || typeof tier !== "string") {
    return [];
  }

  const segments = id.split(".");
  const diagnostics: Diagnostic[] = [];

  if (segments[0] !== domain) {
    diagnostics.push(
      tokenDiagnostic(
        "AXT1101",
        `Token path domain '${segments[0] ?? ""}' does not match declared domain '${domain}'.`,
        "/domain",
        { declaredDomain: domain, pathDomain: segments[0] ?? "" },
      ),
    );
  }

  if (segments[1] !== tier) {
    diagnostics.push(
      tokenDiagnostic(
        "AXT1102",
        `Token path tier '${segments[1] ?? ""}' does not match declared tier '${tier}'.`,
        "/tier",
        { declaredTier: tier, pathTier: segments[1] ?? "" },
      ),
    );
  }

  return diagnostics;
};

const containsTokenReference = (value: unknown): boolean => {
  if (typeof value === "string") return /^\{[^{}]+\}$/.test(value);
  if (Array.isArray(value)) return value.some(containsTokenReference);
  if (isRecord(value)) return Object.values(value).some(containsTokenReference);
  return false;
};

const validateTokenContextOverride = (value: unknown): readonly Diagnostic[] => {
  if (!isRecord(value) || !Array.isArray(value.tokens)) return [];
  const diagnostics = [...validateParsedTokenDocument(value)];
  value.tokens.forEach((token, index) => {
    if (isRecord(token) && token.tier === "primitive") {
      diagnostics.push(
        tokenDiagnostic(
          "AXT1503",
          "Resolver contexts cannot override Primitive Tokens in v0.1.",
          `/tokens/${index}/tier`,
        ),
      );
    }
  });
  return diagnostics;
};

const validateResolvedTokenManifest = (value: unknown): readonly Diagnostic[] => {
  if (!isRecord(value) || !Array.isArray(value.contexts)) return [];
  const diagnostics: Diagnostic[] = [];
  const expectedThemes = ["light", "dark"];
  let baselineIds: readonly string[] | undefined;

  value.contexts.forEach((contextEntry, contextIndex) => {
    if (!isRecord(contextEntry) || !isRecord(contextEntry.context)) return;
    const theme = contextEntry.context["theme"];
    if (theme !== expectedThemes[contextIndex]) {
      diagnostics.push(
        tokenDiagnostic(
          "AXT1600",
          `Resolved contexts must be serialized as theme=light, then theme=dark.`,
          `/contexts/${contextIndex}/context/theme`,
        ),
      );
    }
    if (!Array.isArray(contextEntry.tokens)) return;

    diagnostics.push(
      ...validateParsedTokenDocument({ tokens: contextEntry.tokens }).map((entry) => ({
        ...entry,
        ...(entry.location === undefined
          ? {}
          : {
              location: {
                ...entry.location,
                pointer: `/contexts/${contextIndex}${entry.location.pointer}`,
              },
            }),
      })),
    );

    const ids = contextEntry.tokens
      .filter(isRecord)
      .map((token) => token.id)
      .filter((id): id is string => typeof id === "string");
    const idSet = new Set(ids);
    if (baselineIds === undefined) baselineIds = ids;
    else if (baselineIds.length !== ids.length || baselineIds.some((id, index) => id !== ids[index])) {
      diagnostics.push(
        tokenDiagnostic(
          "AXT1601",
          "Every resolved context must contain the same ordered Token ids.",
          `/contexts/${contextIndex}/tokens`,
        ),
      );
    }

    contextEntry.tokens.forEach((token, tokenIndex) => {
      if (!isRecord(token)) return;
      if (containsTokenReference(token.resolvedValue)) {
        diagnostics.push(
          tokenDiagnostic(
            "AXT1603",
            `Resolved Token '${String(token.id)}' still contains an unresolved alias.`,
            `/contexts/${contextIndex}/tokens/${tokenIndex}/resolvedValue`,
          ),
        );
      }
      if (!Array.isArray(token.dependencies)) return;
      token.dependencies.forEach((dependency, dependencyIndex) => {
        if (typeof dependency === "string" && !idSet.has(dependency)) {
          diagnostics.push(
            tokenDiagnostic(
              "AXT1602",
              `Resolved dependency '${dependency}' is absent from its context.`,
              `/contexts/${contextIndex}/tokens/${tokenIndex}/dependencies/${dependencyIndex}`,
            ),
          );
        }
      });
    });
  });
  return diagnostics;
};

const validateTokenDomainRegistry = (value: unknown): readonly Diagnostic[] => {
  if (!isRecord(value) || !Array.isArray(value.domains)) return [];

  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  const roots = new Set<string>();
  let previousId: string | undefined;

  value.domains.forEach((domain, index) => {
    if (!isRecord(domain) || typeof domain.id !== "string" || typeof domain.root !== "string") {
      return;
    }

    const pointer = `/domains/${index}`;
    if (ids.has(domain.id)) {
      diagnostics.push(
        tokenDiagnostic(
          "AXT1001",
          `Duplicate Token Domain id '${domain.id}'.`,
          `${pointer}/id`,
        ),
      );
    }
    ids.add(domain.id);

    if (roots.has(domain.root)) {
      diagnostics.push(
        tokenDiagnostic(
          "AXT1002",
          `Duplicate Token Domain root '${domain.root}'.`,
          `${pointer}/root`,
        ),
      );
    }
    roots.add(domain.root);

    if (domain.id !== domain.root) {
      diagnostics.push(
        tokenDiagnostic(
          "AXT1003",
          `Token Domain id '${domain.id}' must equal its v0.1 root '${domain.root}'.`,
          `${pointer}/root`,
        ),
      );
    }

    if (previousId !== undefined && previousId.localeCompare(domain.id, "en") > 0) {
      diagnostics.push(
        tokenDiagnostic(
          "AXT1004",
          "Token Domains must be serialized in ascending id order.",
          `${pointer}/id`,
        ),
      );
    }
    previousId = domain.id;

    const allowedTypes = Array.isArray(domain.allowedDTCGTypes)
      ? new Set(domain.allowedDTCGTypes.filter((item): item is string => typeof item === "string"))
      : new Set<string>();
    if (!Array.isArray(domain.constraints)) return;

    domain.constraints.forEach((constraint, constraintIndex) => {
      if (!isRecord(constraint) || typeof constraint.kind !== "string") return;
      const expectedType = {
        dimensionRange: "dimension",
        durationRange: "duration",
        numberRange: "number",
      }[constraint.kind];
      if (expectedType !== undefined && !allowedTypes.has(expectedType)) {
        diagnostics.push(
          tokenDiagnostic(
            "AXT1005",
            `Constraint '${constraint.kind}' requires allowed DTCG type '${expectedType}'.`,
            `${pointer}/constraints/${constraintIndex}`,
          ),
        );
      }

      if (
        (constraint.kind === "numberRange" || constraint.kind === "dimensionRange") &&
        "minimum" in constraint &&
        "exclusiveMinimum" in constraint
      ) {
        diagnostics.push(
          tokenDiagnostic(
            "AXT1006",
            `Constraint '${constraint.kind}' cannot define both minimum and exclusiveMinimum.`,
            `${pointer}/constraints/${constraintIndex}`,
          ),
        );
      }

      if (
        constraint.kind === "numberRange" &&
        "maximum" in constraint &&
        "exclusiveMaximum" in constraint
      ) {
        diagnostics.push(
          tokenDiagnostic(
            "AXT1007",
            "Constraint 'numberRange' cannot define both maximum and exclusiveMaximum.",
            `${pointer}/constraints/${constraintIndex}`,
          ),
        );
      }
    });
  });

  return diagnostics;
};

const validateParsedTokenDocument = (value: unknown): readonly Diagnostic[] => {
  if (!isRecord(value) || !Array.isArray(value.tokens)) return [];

  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  let previousId: string | undefined;

  value.tokens.forEach((token, index) => {
    if (!isRecord(token)) return;
    const id = token.id;
    if (typeof id === "string") {
      if (ids.has(id)) {
        diagnostics.push(
          tokenDiagnostic("AXT1301", `Duplicate normalized Token id '${id}'.`, `/tokens/${index}/id`),
        );
      }
      ids.add(id);

      if (previousId !== undefined && previousId.localeCompare(id, "en") > 0) {
        diagnostics.push(
          tokenDiagnostic(
            "AXT1302",
            "Normalized Tokens must be serialized in ascending id order.",
            `/tokens/${index}/id`,
          ),
        );
      }
      previousId = id;
    }

    diagnostics.push(
      ...validateTokenIdentity(token).map((diagnostic) => ({
        ...diagnostic,
        ...(diagnostic.location === undefined
          ? {}
          : {
              location: {
                ...diagnostic.location,
                pointer: `/tokens/${index}${diagnostic.location.pointer}`,
              },
            }),
      })),
    );
  });

  return diagnostics;
};

export const runSemanticValidator = (
  id: SemanticValidatorId | undefined,
  value: unknown,
): readonly Diagnostic[] => {
  switch (id) {
    case undefined:
      return [];
    case "token-domain-registry":
      return validateTokenDomainRegistry(value);
    case "token-identity":
      return validateTokenIdentity(value);
    case "parsed-token-document":
      return validateParsedTokenDocument(value);
    case "resolved-token-manifest":
      return validateResolvedTokenManifest(value);
    case "token-context-override":
      return validateTokenContextOverride(value);
  }
};
