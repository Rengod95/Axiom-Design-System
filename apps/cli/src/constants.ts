import { IMPORT_LIMITS } from "../../../modules/ads-core/src/index.ts";
import type { DiagnosticPhase } from "../../../modules/ads-core/src/index.ts";

export const EXIT_CODE = { SUCCESS: 0, FAILURE: 1, USAGE: 2, CONFLICT: 3 } as const;
export const CLI_DIAGNOSTIC = {
  USAGE: "CLI_USAGE", IO: "CLI_IO", UTF8: "CLI_UTF8", NOT_FOUND: "CLI_NOT_FOUND",
  IMPORT_LIMIT: "CLI_IMPORT_LIMIT", SOURCE_TYPE: "CLI_SOURCE_TYPE", SOURCE_CHANGED: "CLI_SOURCE_CHANGED",
  EXPORT_PATH: "CLI_EXPORT_PATH",
} as const;
export const CLI_DIAGNOSTIC_PHASE: Readonly<Record<string, DiagnosticPhase>> = {
  [CLI_DIAGNOSTIC.USAGE]: "command", [CLI_DIAGNOSTIC.IO]: "state",
  [CLI_DIAGNOSTIC.UTF8]: "parse", [CLI_DIAGNOSTIC.NOT_FOUND]: "reference",
  [CLI_DIAGNOSTIC.IMPORT_LIMIT]: "parse", [CLI_DIAGNOSTIC.SOURCE_TYPE]: "parse", [CLI_DIAGNOSTIC.SOURCE_CHANGED]: "state",
  [CLI_DIAGNOSTIC.EXPORT_PATH]: "state",
};
export const CLI_OUTPUT_CONTEXT = { profile: "ads-kernel", validation: "envelope-only", semantics: "unverified" } as const;
export const LOCAL_PRINCIPAL = { id: "local-owner", scopes: ["project.read", "project.write", "review.apply"] } as const;
export const LOCAL_ID_PREFIX = "local";
export const VALUE_OPTIONS = ["store", "project", "name", "token", "draft-id", "out"] as const;
export const FLAG_OPTIONS = ["approve", "reject", "help", "draft"] as const;
export const CLI_HELP = `Axiom ADS document kernel

Usage: pnpm axiom --store <directory> <command> [arguments]

  init [--project <id>] [--name <name>]  Create a local project
  import <file...> [--approve]          Stage new UTF-8 ADS documents
  import <file...> --draft              Preserve sources, even invalid JSON
  update <file...> [--approve]          Stage edits to existing document IDs
  import/update <file> --draft-id <id>  Bind one repair to a preserved source
  drafts                              List this local principal's drafts
  draft <draft-id>                     Read preserved source and diagnostics
  diagnostics                         Read project and source draft diagnostics
  export <document-id> --out <dir>     Write source pair to a fresh directory
  delete <document-id...> [--approve]   Stage reference-safe deletion
  candidate <candidate-id>             Inspect the proposed diff
  review <candidate-id> --approve      Approve the exact candidate
  review <candidate-id> --reject       Reject the candidate
  apply <candidate-id> --token <token>  Apply an approved candidate
  apply <candidate-id> --approve       Show diff, approve, then apply
  undo [undo-handle]                   Undo the latest applicable edit
  redo [redo-handle]                   Redo the latest applicable undo
  show [document-id]                   Read project or document
  history                             Read revision history
  recover-lock                        Recover a proven dead local writer
  help                                Show this help

Results are JSON. Import/update/delete without --approve only stage a candidate.
--draft preserves an immutable source without changing the active project.
Imports allow ${IMPORT_LIMITS.maxDocuments} files, ${IMPORT_LIMITS.maxDocumentBytes} bytes each,
and ${IMPORT_LIMITS.maxBatchBytes} bytes total; UTF-8 only.
--approve is an explicit review decision; the core still validates every step.
Only envelope structure and recognized references are checked. ADS domain
semantics, Studio, token rendering and output targets remain unverified.
Exit codes: 0 success or staged review; 1 rejected/I/O; 2 usage; 3 conflict/lock.
`;
