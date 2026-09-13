/** Versions identify the bounded profile, independently of Foundation. */
export const PROTOCOL_VERSION = "0.1.0" as const;
export const KERNEL_FORMAT_VERSION = "0.1.0" as const;
export const CANONICAL_PROFILE_VERSION = "1.0.0" as const;
export const STRUCTURAL_PROFILE = "foundation-structural" as const;
export const STRUCTURAL_FORMAT = "ads-structural" as const;
export const DOMAIN_PROFILE = "foundation-domain" as const;
export const DOMAIN_FORMAT = "ads-domain" as const;
export const VALIDATION_PROFILES = Object.freeze([STRUCTURAL_PROFILE, DOMAIN_PROFILE]);
export const MAX_STRUCTURE_DIAGNOSTICS = 128;
export const MAX_JSON_DEPTH = 64;
const INTERNAL_RECORD_DEPTH_ALLOWANCE = 16;
export const MAX_CANONICAL_DEPTH = MAX_JSON_DEPTH + INTERNAL_RECORD_DEPTH_ALLOWANCE;
export const MAX_CANONICAL_BYTES = 67_108_864;
export const MAX_DOCUMENT_BYTES = 1_048_576;
export const MAX_BATCH_DOCUMENTS = 64;
export const MAX_BATCH_BYTES = 8_388_608;
/** Adapters preflight sources against the same bounded import profile. */
export const IMPORT_LIMITS = Object.freeze({ maxDocuments: MAX_BATCH_DOCUMENTS, maxDocumentBytes: MAX_DOCUMENT_BYTES, maxBatchBytes: MAX_BATCH_BYTES });
export const MAX_COMMAND_BYTES = 9_437_184;
export const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
export const RESERVED_IDS = new Set(["__proto__", "prototype", "constructor"]);
export const DOCUMENT_KINDS = new Set(["project", "foundation", "component", "design", "registry", "screen", "scenario", "connection", "text"]);
export const OPAQUE_FIELDS = new Set(["metadata", "extensions"]);
export const OPERATION_SCOPES: Readonly<Record<string, string>> = Object.freeze({
  "project.create": "project.write", "document.import": "project.write", "entity.delete": "project.write",
  "transaction.review": "review.apply", "transaction.apply": "project.write", "transaction.undo": "project.write", "transaction.redo": "project.write",
});
export const CODE = Object.freeze({
  JSON_INVALID: "JSON_INVALID", JSON_DUPLICATE: "JSON_DUPLICATE", JSON_LIMIT: "JSON_LIMIT", JSON_NUMBER: "JSON_NUMBER",
  ENVELOPE_INVALID: "ENVELOPE_INVALID", PROTOCOL_UNSUPPORTED: "PROTOCOL_UNSUPPORTED", OPERATION_UNSUPPORTED: "OPERATION_UNSUPPORTED",
  AUTH_INVALID: "AUTH_INVALID", ACTOR_MISMATCH: "ACTOR_MISMATCH", SCOPE_REQUIRED: "SCOPE_REQUIRED", PAYLOAD_INVALID: "PAYLOAD_INVALID",
  PROJECT_EXISTS: "PROJECT_EXISTS", PROJECT_MISSING: "PROJECT_MISSING", PROJECT_MISMATCH: "PROJECT_MISMATCH", REVISION_CONFLICT: "REVISION_CONFLICT",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT", DOCUMENT_INVALID: "DOCUMENT_INVALID", DOCUMENT_EXISTS: "DOCUMENT_EXISTS", DOCUMENT_MISSING: "DOCUMENT_MISSING",
  REFERENCE_INVALID: "REFERENCE_INVALID", REFERENCE_MISSING: "REFERENCE_MISSING", REFERENCE_KIND: "REFERENCE_KIND", REFERENCE_REVISION: "REFERENCE_REVISION",
  DOMAIN_UNVERIFIED: "DOMAIN_UNVERIFIED", CANDIDATE_MISSING: "CANDIDATE_MISSING", CANDIDATE_STATE: "CANDIDATE_STATE",
  APPROVAL_INVALID: "APPROVAL_INVALID", DIGEST_MISMATCH: "DIGEST_MISMATCH", HISTORY_CONFLICT: "HISTORY_CONFLICT", STATE_INVALID: "STATE_INVALID",
  DRAFT_MISSING: "DRAFT_MISSING", MIGRATION_UNSUPPORTED: "MIGRATION_UNSUPPORTED",
  STRUCTURE_INVALID: "STRUCTURE_INVALID", STRUCTURE_UNVERIFIED: "STRUCTURE_UNVERIFIED", STRUCTURE_LIMIT: "STRUCTURE_LIMIT",
  ENTITY_DUPLICATE: "ENTITY_DUPLICATE", STRUCTURE_CYCLE: "STRUCTURE_CYCLE",
  TYPE_INVALID: "TYPE_INVALID", TYPE_UNSUPPORTED: "TYPE_UNSUPPORTED", VALUE_INVALID: "VALUE_INVALID", DOMAIN_INVALID: "DOMAIN_INVALID",
  BUNDLE_INVALID: "BUNDLE_INVALID", BUNDLE_LIMIT: "BUNDLE_LIMIT",
});

/** Stable error meanings and their producing boundary. */
export const DIAGNOSTIC_PHASES: Readonly<Record<string, DiagnosticPhase>> = Object.freeze({
  JSON_INVALID: "parse", JSON_DUPLICATE: "parse", JSON_LIMIT: "parse", JSON_NUMBER: "parse",
  ENVELOPE_INVALID: "envelope", PROTOCOL_UNSUPPORTED: "envelope", DOCUMENT_INVALID: "envelope",
  AUTH_INVALID: "authorization", ACTOR_MISMATCH: "authorization", SCOPE_REQUIRED: "authorization",
  REFERENCE_INVALID: "reference", REFERENCE_MISSING: "reference", REFERENCE_KIND: "reference", REFERENCE_REVISION: "reference",
  DOMAIN_UNVERIFIED: "document", CANDIDATE_MISSING: "review", CANDIDATE_STATE: "review", APPROVAL_INVALID: "review", DIGEST_MISMATCH: "review",
  HISTORY_CONFLICT: "history", STATE_INVALID: "state", OPERATION_UNSUPPORTED: "command", PAYLOAD_INVALID: "command", PROJECT_EXISTS: "command",
  PROJECT_MISSING: "command", PROJECT_MISMATCH: "command", REVISION_CONFLICT: "command", IDEMPOTENCY_CONFLICT: "command",
  DRAFT_MISSING: "document", MIGRATION_UNSUPPORTED: "document",
  STRUCTURE_INVALID: "document", STRUCTURE_UNVERIFIED: "document", STRUCTURE_LIMIT: "document",
  ENTITY_DUPLICATE: "reference", STRUCTURE_CYCLE: "reference",
  TYPE_INVALID: "document", TYPE_UNSUPPORTED: "document", VALUE_INVALID: "document", DOMAIN_INVALID: "document",
  BUNDLE_INVALID: "document", BUNDLE_LIMIT: "document",
});
import type { DiagnosticPhase } from "./contracts.ts";
