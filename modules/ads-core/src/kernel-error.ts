import type { Diagnostic, DiagnosticPhase } from "./contracts.ts";
import { DIAGNOSTIC_PHASES } from "./constants.ts";

/** A machine-readable boundary failure; messages are only for display. */
export class KernelError extends Error {
  readonly code: string;
  readonly phase: DiagnosticPhase;
  constructor(code: string, message: string) {
    super(message);
    this.name = "KernelError";
    this.code = code;
    this.phase = Object.hasOwn(DIAGNOSTIC_PHASES, code) ? DIAGNOSTIC_PHASES[code]! : "command";
  }
  /** Convert a typed failure without disclosing candidate tokens or source text. */
  toDiagnostic(): Diagnostic {
    return { code: this.code, phase: this.phase, severity: "error", message: this.message };
  }
}
