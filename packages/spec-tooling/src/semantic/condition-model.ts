import {
  BREAKPOINT_DTCG_TYPE,
  BREAKPOINT_SOURCE_UNIT,
  BREAKPOINT_TOKEN_DOMAIN,
  CONDITION_DIAGNOSTIC_PHASE,
  ERROR_DIAGNOSTIC_SEVERITY,
  IN_MEMORY_SOURCE_NAME,
} from "../constants.js";
import type { Diagnostic } from "../types.js";

export interface JsonRecord {
  readonly [key: string]: unknown;
}

export interface ResolvedRange {
  readonly comparison: "<" | ">=";
  readonly family: string;
  readonly threshold: number;
}

export const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const conditionDiagnostic = (
  code: string,
  message: string,
  pointer: string,
): Diagnostic => ({
  code,
  severity: ERROR_DIAGNOSTIC_SEVERITY,
  phase: CONDITION_DIAGNOSTIC_PHASE,
  message,
  location: { file: IN_MEMORY_SOURCE_NAME, pointer },
});

export const tokenPathFromCondition = (condition: JsonRecord): string | undefined => {
  const reference = condition["value"];
  if (!isJsonRecord(reference) || typeof reference["path"] !== "string") return undefined;
  return reference["path"];
};

export const resolvedContexts = (value: unknown): readonly JsonRecord[] =>
  isJsonRecord(value) && Array.isArray(value["contexts"])
    ? value["contexts"].filter(isJsonRecord)
    : [];

export const resolvedToken = (
  context: JsonRecord,
  tokenId: string,
): JsonRecord | undefined => {
  const tokens = context["tokens"];
  if (!Array.isArray(tokens)) return undefined;
  return tokens.find(
    (token): token is JsonRecord => isJsonRecord(token) && token["id"] === tokenId,
  );
};

export const isBreakpointDimension = (token: JsonRecord): boolean => {
  const resolvedValue = token["resolvedValue"];
  if (
    token["domain"] !== BREAKPOINT_TOKEN_DOMAIN ||
    token["dtcgType"] !== BREAKPOINT_DTCG_TYPE ||
    !isJsonRecord(resolvedValue)
  ) {
    return false;
  }
  const unit = resolvedValue["unit"];
  const number = resolvedValue["value"];
  return unit === BREAKPOINT_SOURCE_UNIT && typeof number === "number" && number >= 0;
};

export const conditionDefinitions = (
  registry: unknown,
): ReadonlyMap<string, JsonRecord> => {
  const definitions = new Map<string, JsonRecord>();
  if (!isJsonRecord(registry) || !Array.isArray(registry["conditions"])) {
    return definitions;
  }
  registry["conditions"].forEach((condition) => {
    if (isJsonRecord(condition) && typeof condition["id"] === "string") {
      definitions.set(condition["id"], condition);
    }
  });
  return definitions;
};

export const resolvedRange = (
  condition: JsonRecord,
  manifest: unknown,
): ResolvedRange | undefined => {
  const kind = condition["kind"];
  const comparison = condition["comparison"];
  if (
    (kind !== "container" && kind !== "viewport") ||
    (comparison !== "<" && comparison !== ">=")
  ) {
    return undefined;
  }
  const tokenPath = tokenPathFromCondition(condition);
  const firstContext = resolvedContexts(manifest)[0];
  if (tokenPath === undefined || firstContext === undefined) return undefined;
  const token = resolvedToken(firstContext, tokenPath);
  if (token === undefined || !isJsonRecord(token["resolvedValue"])) return undefined;
  const threshold = token["resolvedValue"]["value"];
  if (typeof threshold !== "number") return undefined;
  const family =
    kind === "container"
      ? `container:${String(condition["container"])}:${String(condition["feature"])}`
      : `viewport:${String(condition["feature"])}`;
  return { comparison, family, threshold };
};
