import {
  CONSTRAINT_REQUIRED_DTCG_TYPE,
  REQUIRED_RESOLVED_THEMES,
  SPEC_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
  TOKEN_DIAGNOSTIC_PHASE,
  TOKEN_ID_DOMAIN_SEGMENT_INDEX,
  TOKEN_ID_TIER_SEGMENT_INDEX,
  TOKEN_REFERENCE_PATTERN,
} from "./constants.js";
import { validateCanonicalStateRegistry } from "./semantic/canonical-state-registry-validator.js";
import { validateAppearanceIr } from "./semantic/appearance-ir-validator.js";
import { validateMotionIr } from "./semantic/motion-ir-validator.js";
import { validateConditionExpression } from "./semantic/condition-expression-validator.js";
import { validateConditionRegistry } from "./semantic/condition-registry-validator.js";
import { createSemanticDiagnosticFactory } from "./semantic/semantic-diagnostic.js";
import { validateSemanticTokenVocabulary } from "./semantic/semantic-token-vocabulary-validator.js";
import {
  validateBehaviorCriteriaSourceManifest,
  validateBehaviorCriteriaPair,
  validateComponentBehaviorCriteriaProfile,
} from "./semantic/behavior-criteria-validator.js";
import type {
  Diagnostic,
  SemanticValidationContext,
  SemanticValidatorId,
} from "./types.js";
import { isUnknownRecord } from "./validation/unknown-record.js";

const tokenDiagnostic = createSemanticDiagnosticFactory(
  TOKEN_DIAGNOSTIC_PHASE,
);

const validateTokenIdentity = (value: unknown): readonly Diagnostic[] => {
  if (!isUnknownRecord(value)) return [];

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
  if (isUnknownRecord(value)) return Object.values(value).some(containsTokenReference);
  return false;
};

const validateTokenContextOverride = (value: unknown): readonly Diagnostic[] => {
  if (!isUnknownRecord(value) || !Array.isArray(value["tokens"])) return [];
  const diagnostics = [...validateParsedTokenDocument(value)];
  value["tokens"].forEach((token, index) => {
    if (isUnknownRecord(token) && token["tier"] === "primitive") {
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
  if (!isUnknownRecord(value) || !Array.isArray(value["contexts"])) return [];
  const diagnostics: Diagnostic[] = [];
  let baselineIds: readonly string[] | undefined;

  value["contexts"].forEach((contextEntry, contextIndex) => {
    if (!isUnknownRecord(contextEntry) || !isUnknownRecord(contextEntry["context"])) return;
    const theme = contextEntry["context"]["theme"];
    if (theme !== REQUIRED_RESOLVED_THEMES[contextIndex]) {
      diagnostics.push(
        tokenDiagnostic(
          SPEC_DIAGNOSTIC_CODE.CONTEXT_ORDER,
          `Resolved contexts must be serialized as theme=light, then theme=dark.`,
          `/contexts/${contextIndex}/context/theme`,
        ),
      );
    }
    if (!Array.isArray(contextEntry["tokens"])) return;

    diagnostics.push(
      ...validateParsedTokenDocument({ tokens: contextEntry["tokens"] }).map((entry) => ({
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

    const ids = contextEntry["tokens"]
      .filter(isUnknownRecord)
      .map((token) => token["id"])
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

    contextEntry["tokens"].forEach((token, tokenIndex) => {
      if (!isUnknownRecord(token)) return;
      if (containsTokenReference(token["resolvedValue"])) {
        diagnostics.push(
          tokenDiagnostic(
            SPEC_DIAGNOSTIC_CODE.UNRESOLVED_ALIAS,
            `Resolved Token '${String(token["id"])}' still contains an unresolved alias.`,
            `/contexts/${contextIndex}/tokens/${tokenIndex}/resolvedValue`,
          ),
        );
      }
      if (!Array.isArray(token["dependencies"])) return;
      token["dependencies"].forEach((dependency, dependencyIndex) => {
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
  if (!isUnknownRecord(value) || !Array.isArray(value["domains"])) return [];

  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  const roots = new Set<string>();
  let previousId: string | undefined;

  value["domains"].forEach((domain, index) => {
    if (
      !isUnknownRecord(domain) ||
      typeof domain["id"] !== "string" ||
      typeof domain["root"] !== "string"
    ) {
      return;
    }
    const id = domain["id"];
    const root = domain["root"];

    const pointer = `/domains/${index}`;
    if (ids.has(id)) {
      diagnostics.push(
        tokenDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DUPLICATE_DOMAIN_ID,
          `Duplicate Token Domain id '${id}'.`,
          `${pointer}/id`,
        ),
      );
    }
    ids.add(id);

    if (roots.has(root)) {
      diagnostics.push(
        tokenDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DUPLICATE_DOMAIN_ROOT,
          `Duplicate Token Domain root '${root}'.`,
          `${pointer}/root`,
        ),
      );
    }
    roots.add(root);

    if (id !== root) {
      diagnostics.push(
        tokenDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DOMAIN_ROOT_MISMATCH,
          `Token Domain id '${id}' must equal its root '${root}'.`,
          `${pointer}/root`,
        ),
      );
    }

    if (
      previousId !== undefined &&
      previousId.localeCompare(id, STABLE_SORT_LOCALE) > 0
    ) {
      diagnostics.push(
        tokenDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DOMAIN_ORDER,
          "Token Domains must be serialized in ascending id order.",
          `${pointer}/id`,
        ),
      );
    }
    previousId = id;

    const allowedTypes = Array.isArray(domain["allowedDTCGTypes"])
      ? new Set(
          domain["allowedDTCGTypes"].filter(
            (item): item is string => typeof item === "string",
          ),
        )
      : new Set<string>();
    if (!Array.isArray(domain["constraints"])) return;

    domain["constraints"].forEach((constraint, constraintIndex) => {
      if (!isUnknownRecord(constraint) || typeof constraint["kind"] !== "string") return;
      const kind = constraint["kind"];
      const expectedType =
        CONSTRAINT_REQUIRED_DTCG_TYPE[
          kind as keyof typeof CONSTRAINT_REQUIRED_DTCG_TYPE
        ];
      if (expectedType !== undefined && !allowedTypes.has(expectedType)) {
        diagnostics.push(
          tokenDiagnostic(
            SPEC_DIAGNOSTIC_CODE.CONSTRAINT_TYPE_MISMATCH,
            `Constraint '${kind}' requires allowed DTCG type '${expectedType}'.`,
            `${pointer}/constraints/${constraintIndex}`,
          ),
        );
      }

      if (
        (kind === "numberRange" || kind === "dimensionRange") &&
        "minimum" in constraint &&
        "exclusiveMinimum" in constraint
      ) {
        diagnostics.push(
          tokenDiagnostic(
            SPEC_DIAGNOSTIC_CODE.CONSTRAINT_MINIMUM_CONFLICT,
            `Constraint '${kind}' cannot define both minimum and exclusiveMinimum.`,
            `${pointer}/constraints/${constraintIndex}`,
          ),
        );
      }

      if (
        kind === "numberRange" &&
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
  if (!isUnknownRecord(value) || !Array.isArray(value["tokens"])) return [];

  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  let previousId: string | undefined;

  value["tokens"].forEach((token, index) => {
    if (!isUnknownRecord(token)) return;
    const id = token["id"];
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

/** Dispatches a manifest-selected semantic validator after its JSON Schema has accepted the value. */
export const runSemanticValidator = (
  id: SemanticValidatorId | undefined,
  value: unknown,
  context?: SemanticValidationContext,
): readonly Diagnostic[] => {
  switch (id) {
    case undefined:
      return [];
    case "behavior-criteria-source-manifest":
      return validateBehaviorCriteriaSourceManifest(value);
    case "component-behavior-criteria-profile":
      return [
        ...validateComponentBehaviorCriteriaProfile(value),
        ...(context?.relatedFixtures?.["source"] === undefined
          ? [{ code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_SOURCE_MANIFEST_MISSING, severity: "error" as const, phase: "behavior" as const, message: "Component criteria profiles require a related source manifest.", location: { file: "<memory>", pointer: "/" } }]
          : validateBehaviorCriteriaPair(context.relatedFixtures["source"], value)),
      ];
    case "canonical-state-registry":
      return validateCanonicalStateRegistry(value);
    case "css-appearance-ir":
      return validateAppearanceIr(value, context);
    case "motion-ir":
      return validateMotionIr(value, context);
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
    case "semantic-token-vocabulary":
      return validateSemanticTokenVocabulary(value);
    case "token-context-override":
      return validateTokenContextOverride(value);
  }
};
