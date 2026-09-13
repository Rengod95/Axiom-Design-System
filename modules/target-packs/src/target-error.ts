import type { Diagnostic } from "../../ads-core/src/index.ts";
import type { TARGET_CODE } from "./constants.ts";

/** Stable document-phase failures shared by the pure generator and filesystem adapter. */
export class TargetError extends Error {
  readonly code: typeof TARGET_CODE[keyof typeof TARGET_CODE];
  readonly path: string | undefined;
  /** Preserve the affected source or output path without embedding host state. */
  constructor(code: TargetError["code"], message: string, path?: string) {
    super(message); this.name = "TargetError"; this.code = code; this.path = path;
  }
  /** Convert generation failure to the existing public diagnostic shape. */
  toDiagnostic(): Diagnostic { return { code: this.code, phase: "document", severity: "error", message: this.message, ...(this.path === undefined ? {} : { path: this.path }) }; }
}
