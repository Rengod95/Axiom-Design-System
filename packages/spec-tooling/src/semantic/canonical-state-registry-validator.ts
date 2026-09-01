import {
  ERROR_DIAGNOSTIC_SEVERITY,
  IN_MEMORY_SOURCE_NAME,
  SPEC_DIAGNOSTIC_CODE,
  STATE_DIAGNOSTIC_PHASE,
  STABLE_SORT_LOCALE,
} from "../constants.js";
import type { Diagnostic } from "../types.js";

interface StateRegistryRecord {
  readonly [key: string]: unknown;
  readonly id?: unknown;
  readonly states?: unknown;
}

const isRecord = (value: unknown): value is StateRegistryRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stateDiagnostic = (
  code: string,
  message: string,
  pointer: string,
): Diagnostic => ({
  code,
  severity: ERROR_DIAGNOSTIC_SEVERITY,
  phase: STATE_DIAGNOSTIC_PHASE,
  message,
  location: { file: IN_MEMORY_SOURCE_NAME, pointer },
});

export const validateCanonicalStateRegistry = (
  value: unknown,
): readonly Diagnostic[] => {
  if (!isRecord(value) || !Array.isArray(value.states)) return [];

  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  let previousId: string | undefined;
  value.states.forEach((state, index) => {
    if (!isRecord(state) || typeof state.id !== "string") return;
    const pointer = `/states/${index}/id`;
    if (ids.has(state.id)) {
      diagnostics.push(
        stateDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DUPLICATE_STATE_ID,
          `Duplicate canonical state id '${state.id}'.`,
          pointer,
        ),
      );
    }
    ids.add(state.id);
    if (
      previousId !== undefined &&
      previousId.localeCompare(state.id, STABLE_SORT_LOCALE) > 0
    ) {
      diagnostics.push(
        stateDiagnostic(
          SPEC_DIAGNOSTIC_CODE.STATE_ORDER,
          "Canonical states must be serialized in ascending id order.",
          pointer,
        ),
      );
    }
    previousId = state.id;
  });
  return diagnostics;
};
