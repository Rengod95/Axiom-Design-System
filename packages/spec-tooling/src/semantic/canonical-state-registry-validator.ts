import {
  SPEC_DIAGNOSTIC_CODE,
  STATE_DIAGNOSTIC_PHASE,
  STABLE_SORT_LOCALE,
} from "../constants.js";
import type { Diagnostic } from "../types.js";
import { isUnknownRecord } from "../validation/unknown-record.js";
import { createSemanticDiagnosticFactory } from "./semantic-diagnostic.js";

const stateDiagnostic = createSemanticDiagnosticFactory(
  STATE_DIAGNOSTIC_PHASE,
);

export const validateCanonicalStateRegistry = (
  value: unknown,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value) || !Array.isArray(value["states"])) return [];

  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  let previousId: string | undefined;
  value["states"].forEach((state, index) => {
    if (!isUnknownRecord(state) || typeof state["id"] !== "string") return;
    const id = state["id"];
    const pointer = `/states/${index}/id`;
    if (ids.has(id)) {
      diagnostics.push(
        stateDiagnostic(
          SPEC_DIAGNOSTIC_CODE.DUPLICATE_STATE_ID,
          `Duplicate canonical state id '${id}'.`,
          pointer,
        ),
      );
    }
    ids.add(id);
    if (
      previousId !== undefined &&
      previousId.localeCompare(id, STABLE_SORT_LOCALE) > 0
    ) {
      diagnostics.push(
        stateDiagnostic(
          SPEC_DIAGNOSTIC_CODE.STATE_ORDER,
          "Canonical states must be serialized in ascending id order.",
          pointer,
        ),
      );
    }
    previousId = id;
  });
  return diagnostics;
};
