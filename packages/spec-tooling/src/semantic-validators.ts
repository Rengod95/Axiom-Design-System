import {
  CONSTRAINT_REQUIRED_DTCG_TYPE,
  ERROR_DIAGNOSTIC_SEVERITY,
  IN_MEMORY_SOURCE_NAME,
  REQUIRED_RESOLVED_THEMES,
  SPEC_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
  TOKEN_DIAGNOSTIC_PHASE,
  TOKEN_ID_DOMAIN_SEGMENT_INDEX,
  TOKEN_ID_TIER_SEGMENT_INDEX,
  TOKEN_REFERENCE_PATTERN,
} from "./constants.js";
import { validateCanonicalStateRegistry } from "./semantic/canonical-state-registry-validator.js";
import { validateConditionExpression } from "./semantic/condition-expression-validator.js";
import { validateConditionRegistry } from "./semantic/condition-registry-validator.js";
import type {
  Diagnostic,
  JsonValue,
  SemanticValidationContext,
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
  severity: ERROR_DIAGNOSTIC_SEVERITY,
  phase: TOKEN_DIAGNOSTIC_PHASE,
  message,
  location: { file: IN_MEMORY_SOURCE_NAME, pointer },
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

  if (segments[TOKEN_ID_DOMAIN_SEGMENT_INDEX] !== domain) {
    diagnostics.push(
      tokenDiagnostic(
        SPEC_DIAGNOSTIC_CODE.DOMAIN_IDENTITY_MISMATCH,
        `Token path domain '${segments[TOKEN_ID_DOMAIN_SEGMENT_INDEX] ?? ""}' does not match declared domain '${domain}'.`,
        "/domain",
        {
          declaredDomain: domain,
          pathDomain: segments[TOKEN_ID_DOMAIN_SEGMENT_INDEX] ?? "",
        },
      ),
    );
  }

  if (segments[TOKEN_ID_TIER_SEGMENT_INDEX] !== tier) {
    diagnostics.push(
      tokenDiagnostic(
        SPEC_DIAGNOSTIC_CODE.TIER_IDENTITY_MISMATCH,
        `Token path tier '${segments[TOKEN_ID_TIER_SEGMENT_INDEX] ?? ""}' does not match declared tier '${tier}'.`,
        "/tier",
        {
          declaredTier: tier,
          pathTier: segments[TOKEN_ID_TIER_SEGMENT_INDEX] ?? "",
        },
      ),
    );
  }

  return diagnostics;
};

const containsTokenReference = (value: unknown): boolean => {
  if (typeof value === "string") return TOKEN_REFERENCE_PATTERN.test(value);
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
          SPEC_DIAGNOSTIC_CODE.PRIMITIVE_CONTEXT_OVERRIDE,
          "Resolver contexts cannot override Primitive Tokens in the foundation profile.",
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
  let baselineIds: readonly string[] | undefined;

  value.contexts.forEach((contextEntry, contextIndex) => {
    if (!isRecord(contextEntry) || !isRecord(contextEntry.context)) return;
    const theme = contextEntry.context["theme"];
    if (theme !== REQUIRED_RESOLVED_THEMES[contextIndex]) {
      diagnostics.push(
        tokenDiagnostic(
          SPEC_DIAGNOSTIC_CODE.CONTEXT_ORDER,
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
          SPEC_DIAGNOSTIC_CODE.CONTEXT_TOKEN_SET_MISMATCH,
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
            SPEC_DIAGNOSTIC_CODE.UNRESOLVED_ALIAS,
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
              SPEC_DIAGNOSTIC_CODE.UNKNOWN_RESOLVED_DEPENDENCY,
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
          SPEC_DIAGNOSTIC_CODE.DUPLICATE_DOMAIN_ID,
          `Duplicate Token Domain id '${domain.id}'.`,
          `${pointer}/id`,
        ),
      );
    }
    ids.add(domain.id);

    if (roots.has(domain.root)) {
      diagnostics.push(
        tokenDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DUPLICATE_DOMAIN_ROOT,
          `Duplicate Token Domain root '${domain.root}'.`,
          `${pointer}/root`,
        ),
      );
    }
    roots.add(domain.root);

    if (domain.id !== domain.root) {
      diagnostics.push(
        tokenDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DOMAIN_ROOT_MISMATCH,
          `Token Domain id '${domain.id}' must equal its root '${domain.root}'.`,
          `${pointer}/root`,
        ),
      );
    }

    if (
      previousId !== undefined &&
      previousId.localeCompare(domain.id, STABLE_SORT_LOCALE) > 0
    ) {
      diagnostics.push(
        tokenDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DOMAIN_ORDER,
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
      const expectedType =
        CONSTRAINT_REQUIRED_DTCG_TYPE[
          constraint.kind as keyof typeof CONSTRAINT_REQUIRED_DTCG_TYPE
        ];
      if (expectedType !== undefined && !allowedTypes.has(expectedType)) {
        diagnostics.push(
          tokenDiagnostic(
            SPEC_DIAGNOSTIC_CODE.CONSTRAINT_TYPE_MISMATCH,
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
            SPEC_DIAGNOSTIC_CODE.CONSTRAINT_MINIMUM_CONFLICT,
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
            SPEC_DIAGNOSTIC_CODE.CONSTRAINT_MAXIMUM_CONFLICT,
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
          tokenDiagnostic(SPEC_DIAGNOSTIC_CODE.DUPLICATE_TOKEN, `Duplicate normalized Token id '${id}'.`, `/tokens/${index}/id`),
        );
      }
      ids.add(id);

      if (
        previousId !== undefined &&
        previousId.localeCompare(id, STABLE_SORT_LOCALE) > 0
      ) {
        diagnostics.push(
          tokenDiagnostic(
            SPEC_DIAGNOSTIC_CODE.TOKEN_ORDER,
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
  context?: SemanticValidationContext,
): readonly Diagnostic[] => {
  switch (id) {
    case undefined:
      return [];
    case "canonical-state-registry":
      return validateCanonicalStateRegistry(value);
    case "condition-expression":
      return validateConditionExpression(value, context);
    case "condition-registry":
      return validateConditionRegistry(value, context);
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
