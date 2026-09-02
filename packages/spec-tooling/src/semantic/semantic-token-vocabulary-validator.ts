import {
  REQUIRED_SEMANTIC_COLOR_ROLE_IDS,
  SPEC_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
  TOKEN_DIAGNOSTIC_PHASE,
} from "../constants.js";
import type { Diagnostic } from "../types.js";
import { isUnknownRecord } from "../validation/unknown-record.js";
import { createSemanticDiagnosticFactory } from "./semantic-diagnostic.js";

const vocabularyDiagnostic = createSemanticDiagnosticFactory(
  TOKEN_DIAGNOSTIC_PHASE,
);

const validateUniqueOrderedPaths = (
  value: Record<string, unknown>,
  key: string,
): readonly Diagnostic[] => {
  const entries = value[key];
  if (!Array.isArray(entries)) return [];

  const diagnostics: Diagnostic[] = [];
  const paths = new Set<string>();
  let previousPath: string | undefined;
  entries.forEach((entry, index) => {
    if (!isUnknownRecord(entry) || typeof entry["path"] !== "string") return;
    const path = entry["path"];
    if (paths.has(path)) {
      diagnostics.push(
        vocabularyDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DUPLICATE_SEMANTIC_VOCABULARY_PATH,
          `Semantic vocabulary path '${path}' has more than one owner in '${key}'.`,
          `/${key}/${index}/path`,
        ),
      );
    }
    paths.add(path);

    if (
      previousPath !== undefined &&
      previousPath.localeCompare(path, STABLE_SORT_LOCALE) > 0
    ) {
      diagnostics.push(
        vocabularyDiagnostic(
          SPEC_DIAGNOSTIC_CODE.SEMANTIC_VOCABULARY_ORDER,
          `Semantic vocabulary paths in '${key}' must be serialized in ascending order.`,
          `/${key}/${index}/path`,
        ),
      );
    }
    previousPath = path;
  });
  return diagnostics;
};

export const validateSemanticTokenVocabulary = (
  value: unknown,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value)) return [];

  const diagnostics: Diagnostic[] = [];
  const colorRoles = Array.isArray(value["colorRoles"])
    ? value["colorRoles"]
        .filter(isUnknownRecord)
        .map((entry) => entry["id"])
        .filter((id): id is string => typeof id === "string")
    : [];
  if (
    colorRoles.length !== REQUIRED_SEMANTIC_COLOR_ROLE_IDS.length ||
    colorRoles.some((id, index) => id !== REQUIRED_SEMANTIC_COLOR_ROLE_IDS[index])
  ) {
    diagnostics.push(
      vocabularyDiagnostic(
        SPEC_DIAGNOSTIC_CODE.SEMANTIC_COLOR_ROLE_SET,
        "Semantic color roles must contain the complete canonical role set in registered order.",
        "/colorRoles",
      ),
    );
  }

  for (const key of [
    "extendedScaleFamilies",
    "orderedScaleFamilies",
    "spaceFamilies",
  ]) {
    diagnostics.push(...validateUniqueOrderedPaths(value, key));
  }
  return diagnostics;
};
