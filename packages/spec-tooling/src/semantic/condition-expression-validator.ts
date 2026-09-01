import {
  CONDITION_REGISTRY_ID,
  FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID,
  SPEC_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
} from "../constants.js";
import type { Diagnostic, SemanticValidationContext } from "../types.js";
import {
  isUnknownRecord,
  type UnknownRecord,
} from "../validation/unknown-record.js";
import {
  conditionDefinitions,
  conditionDiagnostic,
  resolvedRange,
  type ResolvedRange,
} from "./condition-model.js";

const hasRangeContradiction = (
  conditionIds: readonly string[],
  definitions: ReadonlyMap<string, UnknownRecord>,
  manifest: unknown,
): boolean => {
  const rangesByFamily = new Map<string, ResolvedRange[]>();
  for (const id of conditionIds) {
    const condition = definitions.get(id);
    if (condition === undefined) continue;
    const range = resolvedRange(condition, manifest);
    if (range === undefined) continue;
    const familyRanges = rangesByFamily.get(range.family) ?? [];
    familyRanges.push(range);
    rangesByFamily.set(range.family, familyRanges);
  }
  return [...rangesByFamily.values()].some((ranges) => {
    const lowerBounds = ranges
      .filter((range) => range.comparison === ">=")
      .map((range) => range.threshold);
    const upperBounds = ranges
      .filter((range) => range.comparison === "<")
      .map((range) => range.threshold);
    if (lowerBounds.length === 0 || upperBounds.length === 0) return false;
    return Math.max(...lowerBounds) >= Math.min(...upperBounds);
  });
};

const conditionChoices = (value: UnknownRecord): readonly (readonly string[])[] => {
  const all = value["all"];
  if (!Array.isArray(all)) return [];
  return all.map((clause) => {
    if (typeof clause === "string") return [clause];
    if (!isUnknownRecord(clause) || !Array.isArray(clause["any"])) return [];
    return clause["any"].filter((id): id is string => typeof id === "string");
  });
};

const hasSatisfyingConditionChoice = (
  choices: readonly (readonly string[])[],
  definitions: ReadonlyMap<string, UnknownRecord>,
  manifest: unknown,
  index = 0,
  selected: readonly string[] = [],
  visited = new Set<string>(),
): boolean => {
  const normalizedSelection = [...new Set(selected)].sort((left, right) =>
    left.localeCompare(right, STABLE_SORT_LOCALE),
  );
  const searchKey = `${index}:${normalizedSelection.join("|")}`;
  if (visited.has(searchKey)) return false;
  visited.add(searchKey);
  if (hasRangeContradiction(normalizedSelection, definitions, manifest)) return false;
  if (index === choices.length) {
    return true;
  }
  return (choices[index] ?? []).some((id) =>
    hasSatisfyingConditionChoice(
      choices,
      definitions,
      manifest,
      index + 1,
      [...normalizedSelection, id],
      visited,
    ),
  );
};

export const validateConditionExpression = (
  value: unknown,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value) || !Array.isArray(value["all"])) return [];
  const definitions = conditionDefinitions(
    context?.registries[CONDITION_REGISTRY_ID],
  );
  if (definitions.size === 0) return [];
  const choices = conditionChoices(value);
  const diagnostics: Diagnostic[] = [];
  choices.forEach((ids, clauseIndex) => {
    ids.forEach((id) => {
      if (!definitions.has(id)) {
        diagnostics.push(
          conditionDiagnostic(
            SPEC_DIAGNOSTIC_CODE.UNKNOWN_CONDITION,
            `Condition expression references unknown id '${id}'.`,
            `/all/${clauseIndex}`,
          ),
        );
      }
    });
  });
  if (diagnostics.length > 0) return diagnostics;

  const resolvedManifest =
    context?.registries[FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID];
  if (!hasSatisfyingConditionChoice(choices, definitions, resolvedManifest)) {
    diagnostics.push(
      conditionDiagnostic(
        SPEC_DIAGNOSTIC_CODE.CONTRADICTORY_CONDITION_RANGE,
        "Condition expression contains no satisfiable viewport/container range combination.",
        "/all",
      ),
    );
  }
  return diagnostics;
};
