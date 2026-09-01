import {
  BREAKPOINT_TOKEN_DOMAIN,
  FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID,
  SPEC_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
} from "../constants.js";
import type { Diagnostic, SemanticValidationContext } from "../types.js";
import {
  conditionDiagnostic,
  isBreakpointDimension,
  isJsonRecord,
  resolvedContexts,
  resolvedToken,
  tokenPathFromCondition,
  type JsonRecord,
} from "./condition-model.js";

const conditionIdMatchesKind = (condition: JsonRecord): boolean => {
  const id = condition["id"];
  const kind = condition["kind"];
  if (typeof id !== "string" || typeof kind !== "string") return true;
  switch (kind) {
    case "container":
      return id.startsWith("container.inline.");
    case "preference":
      return id === "preference.reducedMotion";
    case "viewport":
      return id.startsWith("viewport.width.");
    default:
      return true;
  }
};

const validateConditionToken = (
  condition: JsonRecord,
  index: number,
  manifest: unknown,
): readonly Diagnostic[] => {
  const kind = condition["kind"];
  if (kind !== "container" && kind !== "viewport") return [];
  const tokenPath = tokenPathFromCondition(condition);
  const pointer = `/conditions/${index}/value/path`;
  if (tokenPath === undefined || !tokenPath.startsWith(`${BREAKPOINT_TOKEN_DOMAIN}.`)) {
    return [
      conditionDiagnostic(
        SPEC_DIAGNOSTIC_CODE.INVALID_BREAKPOINT_REFERENCE,
        "Viewport and container conditions must reference the breakpoint Token Domain.",
        pointer,
      ),
    ];
  }

  const contexts = resolvedContexts(manifest);
  if (contexts.length === 0) return [];
  const tokens = contexts.map((context) => resolvedToken(context, tokenPath));
  if (tokens.some((token) => token === undefined)) {
    return [
      conditionDiagnostic(
        SPEC_DIAGNOSTIC_CODE.UNKNOWN_BREAKPOINT_TOKEN,
        `Breakpoint Token '${tokenPath}' must resolve in every registered context.`,
        pointer,
      ),
    ];
  }
  const definedTokens = tokens.filter((token): token is JsonRecord => token !== undefined);
  if (definedTokens.some((token) => !isBreakpointDimension(token))) {
    return [
      conditionDiagnostic(
        SPEC_DIAGNOSTIC_CODE.INVALID_BREAKPOINT_TOKEN,
        `Condition Token '${tokenPath}' must be a non-negative rem dimension in the breakpoint Domain.`,
        pointer,
      ),
    ];
  }
  const baselineValue = JSON.stringify(definedTokens[0]?.["resolvedValue"]);
  if (
    definedTokens.some(
      (token) => JSON.stringify(token["resolvedValue"]) !== baselineValue,
    )
  ) {
    return [
      conditionDiagnostic(
        SPEC_DIAGNOSTIC_CODE.THEME_VARIANT_BREAKPOINT,
        `Breakpoint Token '${tokenPath}' must remain identical in every resolver context.`,
        pointer,
      ),
    ];
  }
  return [];
};

export const validateConditionRegistry = (
  value: unknown,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (
    !isJsonRecord(value) ||
    !Array.isArray(value["containers"]) ||
    !Array.isArray(value["conditions"])
  ) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const containerIds = new Set<string>();
  let previousContainerId: string | undefined;
  value["containers"].forEach((container, index) => {
    if (!isJsonRecord(container) || typeof container["id"] !== "string") return;
    const id = container["id"];
    if (containerIds.has(id)) {
      diagnostics.push(
        conditionDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DUPLICATE_CONTAINER_ID,
          `Duplicate query container id '${id}'.`,
          `/containers/${index}/id`,
        ),
      );
    }
    containerIds.add(id);
    if (
      previousContainerId !== undefined &&
      previousContainerId.localeCompare(id, STABLE_SORT_LOCALE) > 0
    ) {
      diagnostics.push(
        conditionDiagnostic(
          SPEC_DIAGNOSTIC_CODE.CONTAINER_ORDER,
          "Query containers must be serialized in ascending id order.",
          `/containers/${index}/id`,
        ),
      );
    }
    previousContainerId = id;
  });

  const conditionIds = new Set<string>();
  let previousConditionId: string | undefined;
  const resolvedManifest =
    context?.registries[FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID];
  value["conditions"].forEach((condition, index) => {
    if (!isJsonRecord(condition) || typeof condition["id"] !== "string") return;
    const id = condition["id"];
    if (conditionIds.has(id)) {
      diagnostics.push(
        conditionDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DUPLICATE_CONDITION_ID,
          `Duplicate Condition id '${id}'.`,
          `/conditions/${index}/id`,
        ),
      );
    }
    conditionIds.add(id);
    if (
      previousConditionId !== undefined &&
      previousConditionId.localeCompare(id, STABLE_SORT_LOCALE) > 0
    ) {
      diagnostics.push(
        conditionDiagnostic(
          SPEC_DIAGNOSTIC_CODE.CONDITION_ORDER,
          "Conditions must be serialized in ascending id order.",
          `/conditions/${index}/id`,
        ),
      );
    }
    previousConditionId = id;

    if (!conditionIdMatchesKind(condition)) {
      diagnostics.push(
        conditionDiagnostic(
          SPEC_DIAGNOSTIC_CODE.CONDITION_ID_KIND_MISMATCH,
          `Condition id '${id}' does not match kind '${String(condition["kind"])}'.`,
          `/conditions/${index}/id`,
        ),
      );
    }
    const container = condition["container"];
    if (
      condition["kind"] === "container" &&
      typeof container === "string" &&
      !containerIds.has(container)
    ) {
      diagnostics.push(
        conditionDiagnostic(
          SPEC_DIAGNOSTIC_CODE.UNKNOWN_CONTAINER,
          `Condition '${id}' references unregistered container '${container}'.`,
          `/conditions/${index}/container`,
        ),
      );
    }
    diagnostics.push(...validateConditionToken(condition, index, resolvedManifest));
  });

  return diagnostics;
};
