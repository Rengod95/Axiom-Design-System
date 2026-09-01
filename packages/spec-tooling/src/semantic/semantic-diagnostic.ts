import {
  ERROR_DIAGNOSTIC_SEVERITY,
  IN_MEMORY_SOURCE_NAME,
} from "../constants.js";
import type {
  Diagnostic,
  DiagnosticPhase,
  JsonValue,
} from "../types.js";

export const createSemanticDiagnosticFactory = (
  phase: DiagnosticPhase,
) => (
  code: string,
  message: string,
  pointer: string,
  details?: Readonly<Record<string, JsonValue>>,
): Diagnostic => ({
  code,
  severity: ERROR_DIAGNOSTIC_SEVERITY,
  phase,
  message,
  location: { file: IN_MEMORY_SOURCE_NAME, pointer },
  ...(details === undefined ? {} : { details }),
});
