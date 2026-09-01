import type {
  Diagnostic,
  JsonValue,
  SemanticValidatorId,
} from "./types.js";

interface RecordValue {
  readonly [key: string]: unknown;
  readonly allowedDTCGTypes?: unknown;
  readonly constraints?: unknown;
  readonly domain?: unknown;
  readonly domains?: unknown;
  readonly id?: unknown;
  readonly kind?: unknown;
  readonly root?: unknown;
  readonly tier?: unknown;
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
  }
};
