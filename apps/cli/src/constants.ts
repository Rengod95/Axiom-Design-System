import type { DiagnosticPhase } from "../../../modules/ads-core/src/index.ts";

export const EXIT_CODE = { SUCCESS: 0, FAILURE: 1, USAGE: 2, CONFLICT: 3 } as const;
export const CLI_DIAGNOSTIC = { USAGE: "CLI_USAGE", IO: "CLI_IO", UTF8: "CLI_UTF8", NOT_FOUND: "CLI_NOT_FOUND" } as const;
export const CLI_DIAGNOSTIC_PHASE: Readonly<Record<string, DiagnosticPhase>> = {
  [CLI_DIAGNOSTIC.USAGE]: "command", [CLI_DIAGNOSTIC.IO]: "state",
  [CLI_DIAGNOSTIC.UTF8]: "parse", [CLI_DIAGNOSTIC.NOT_FOUND]: "reference",
};
export const CLI_OUTPUT_CONTEXT = { profile: "ads-kernel", validation: "envelope-only", semantics: "unverified" } as const;
export const LOCAL_PRINCIPAL = { id: "local-owner", scopes: ["project.read", "project.write", "review.apply"] } as const;
export const LOCAL_ID_PREFIX = "local";
export const SUPPORTED_COMMANDS = ["init", "import", "delete", "candidate", "review", "apply", "undo", "redo", "show", "history", "recover-lock", "help"] as const;
export const VALUE_OPTIONS = ["store", "project", "name", "token"] as const;
export const FLAG_OPTIONS = ["approve", "reject", "help"] as const;
export const CLI_HELP = `Axiom ADS document kernel

Usage: pnpm axiom --store <directory> <command> [arguments]

  init [--project <id>] [--name <name>]  Create a local project
  import <file...> [--approve]          Stage UTF-8 ADS documents
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

Results are JSON. An import/delete without --approve only creates a candidate.
--approve is an explicit review decision; the core still validates every step.
Only envelope structure and recognized references are checked. ADS domain
semantics, Studio, token rendering and output targets remain unverified.
Exit codes: 0 success or staged review; 1 rejected/I/O; 2 usage; 3 conflict/lock.
`;
