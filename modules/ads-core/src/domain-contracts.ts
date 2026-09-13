import type { Diagnostic } from "./contracts.ts";
import type { DOMAIN_PROFILE } from "./constants.ts";

/** Validity covers ADR-0012 constraints; unresolved ADS semantics remain explicit. */
export interface DomainReport {
  profile: typeof DOMAIN_PROFILE;
  valid: boolean;
  diagnostics: Diagnostic[];
  checkedRecords: string[];
  unverifiedTypes: string[];
}

/** Internal shared budget and diagnostic sink for content and catalog inspection. */
export interface ContentReportSink {
  error(path: string, message: string): void;
  unverified(type: string, path: string, message: string): void;
  handled(type: string, path: string): void;
  tick(): void;
}
