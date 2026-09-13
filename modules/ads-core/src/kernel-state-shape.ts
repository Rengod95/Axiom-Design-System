import { CODE, DIAGNOSTIC_PHASES, KERNEL_FORMAT_VERSION, VALIDATION_PROFILES } from "./constants.ts";
import { KernelError } from "./kernel-error.ts";
import type { KernelState } from "./contracts.ts";

type RecordValue = Record<string, unknown>;
type Checker = (value: unknown, path: string) => void;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const DIAGNOSTIC_PHASE_VALUES: ReadonlySet<string> = new Set(Object.values(DIAGNOSTIC_PHASES));
const RESULT_STATUSES = ["accepted", "reviewRequired", "conflict", "rejected"];
const CANDIDATE_STATUSES = ["pending", "approved", "applied", "rejected"];
const DIFF_CHANGES = ["created", "deleted", "restored", "updated"];
const pathOf = (path: string, key: string): string => `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
const invalid = (path: string, description: string): never => { throw new KernelError(CODE.STATE_INVALID, description, { path }); };

function record(value: unknown, path: string): RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return invalid(path, "A kernel record must be a JSON object.");
  // The input is a detached JSON.parse snapshot. A local null-prototype view
  // prevents missing fields from consulting an inherited property or accessor.
  return Object.assign(Object.create(null), value) as RecordValue;
}
function text(value: unknown, path: string): void { if (typeof value !== "string") invalid(path, "A kernel text field must be a string."); }
function identity(value: unknown, path: string): void { if (typeof value !== "string" || !value.trim()) invalid(path, "A kernel identity or source URI must be a nonblank string."); }
function digest(value: unknown, path: string): void { if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) invalid(path, "A kernel digest must be a lowercase SHA-256 hex string."); }
function nullableIdentity(value: unknown, path: string): void { if (value !== null) identity(value, path); }
function oneOf(value: unknown, path: string, allowed: readonly string[]): void {
  if (typeof value !== "string" || !allowed.includes(value)) invalid(path, "A kernel field has an unsupported value.");
}
function array(value: unknown, path: string, check: Checker): void {
  if (!Array.isArray(value)) return invalid(path, "A kernel collection must be an array.");
  value.forEach((item, index) => check(item, pathOf(path, String(index))));
}
function fields(value: RecordValue, path: string, names: readonly string[], check: Checker): void {
  for (const name of names) check(value[name], pathOf(path, name));
}
function optional(value: RecordValue, path: string, name: string, check: Checker): void {
  if (Object.hasOwn(value, name)) check(value[name], pathOf(path, name));
}
function profile(value: RecordValue, path: string): void {
  optional(value, path, "validationProfile", (item, at) => oneOf(item, at, VALIDATION_PROFILES));
}
function diagnostic(value: unknown, path: string): void {
  const item = record(value, path);
  fields(item, path, ["code", "message"], text);
  if (typeof item.phase !== "string" || !DIAGNOSTIC_PHASE_VALUES.has(item.phase)) invalid(pathOf(path, "phase"), "A diagnostic phase is unsupported.");
  oneOf(item.severity, pathOf(path, "severity"), ["info", "warning", "error"]);
  for (const name of ["sourceRef", "path"]) optional(item, path, name, text);
}
const diagnostics: Checker = (value, path) => array(value, path, diagnostic);

/** ADS bodies and schemaVersion meanings remain outside the storage codec. */
function documentEntry(value: unknown, path: string): void {
  const entry = record(value, path);
  const documentPath = pathOf(path, "document");
  const document = record(entry.document, documentPath);
  fields(document, documentPath, ["id", "kind", "schemaVersion", "revision", "name"], identity);
  text(entry.originalText, pathOf(path, "originalText"));
  identity(entry.sourceUri, pathOf(path, "sourceUri"));
  oneOf(entry.validation, pathOf(path, "validation"), ["envelope-only"]);
  diagnostics(entry.diagnostics, pathOf(path, "diagnostics"));
  optional(entry, path, "currentText", text);
  optional(entry, path, "currentSourceUri", identity);
  profile(entry, path);
}
function documents(value: unknown, path: string): void {
  const entries = record(value, path);
  for (const [id, entry] of Object.entries(entries)) {
    const at = pathOf(path, id);
    documentEntry(entry, at);
    if ((entry as { document: { id: string } }).document.id !== id) invalid(at, "A document map key must match its stored document identity.");
  }
}
function fieldDiff(value: unknown, path: string): void {
  const item = record(value, path);
  text(item.path, pathOf(path, "path"));
  // before/after are optional raw JSON, already checked by the canonical boundary.
}
function diffEntry(value: unknown, path: string): void {
  const item = record(value, path);
  identity(item.id, pathOf(path, "id"));
  oneOf(item.change, pathOf(path, "change"), DIFF_CHANGES);
  optional(item, path, "fields", (entries, at) => array(entries, at, fieldDiff));
}
const diff: Checker = (value, path) => array(value, path, diffEntry);
function result(value: unknown, path: string): void {
  const item = record(value, path);
  oneOf(item.status, pathOf(path, "status"), RESULT_STATUSES);
  nullableIdentity(item.revision, pathOf(path, "revision"));
  diagnostics(item.diagnostics, pathOf(path, "diagnostics"));
  array(item.affectedRefs, pathOf(path, "affectedRefs"), identity);
  diff(item.diff, pathOf(path, "diff"));
  for (const name of ["candidateId", "reviewToken", "undoHandle", "redoHandle"]) optional(item, path, name, identity);
  optional(item, path, "patchDigest", digest);
  optional(item, path, "draftRefs", (entries, at) => array(entries, at, identity));
  optional(item, path, "originalHashes", (entries, at) => array(entries, at, digest));
}
function receipt(value: unknown, path: string): void {
  const item = record(value, path);
  fields(item, path, ["projectId", "principalId", "key"], identity);
  digest(item.requestDigest, pathOf(path, "requestDigest"));
  result(item.result, pathOf(path, "result"));
}
function approval(value: unknown, path: string): void {
  const item = record(value, path);
  fields(item, path, ["principalId", "token", "baseRevision"], identity);
  digest(item.digest, pathOf(path, "digest"));
}
function candidate(value: unknown, path: string): void {
  const item = record(value, path);
  fields(item, path, ["id", "projectId", "baseRevision", "actorId"], identity);
  digest(item.digest, pathOf(path, "digest"));
  documents(item.documents, pathOf(path, "documents"));
  diff(item.diff, pathOf(path, "diff"));
  diagnostics(item.diagnostics, pathOf(path, "diagnostics"));
  oneOf(item.status, pathOf(path, "status"), CANDIDATE_STATUSES);
  optional(item, path, "approval", approval);
}
function undo(value: unknown, path: string): void {
  const item = record(value, path);
  fields(item, path, ["handle", "actorId", "applicableRevision"], identity);
  documents(item.before, pathOf(path, "before"));
  documents(item.after, pathOf(path, "after"));
}
function history(value: unknown, path: string): void {
  const item = record(value, path);
  fields(item, path, ["revision", "actorId", "operation", "transactionId"], identity);
  nullableIdentity(item.parentRevision, pathOf(path, "parentRevision"));
  array(item.affectedRefs, pathOf(path, "affectedRefs"), identity);
}
function draft(value: unknown, path: string): void {
  const item = record(value, path);
  fields(item, path, ["id", "projectId", "actorId", "sourceUri"], identity);
  text(item.originalText, pathOf(path, "originalText"));
  digest(item.sourceDigest, pathOf(path, "sourceDigest"));
  diagnostics(item.diagnostics, pathOf(path, "diagnostics"));
  oneOf(item.validation, pathOf(path, "validation"), ["invalid", "envelope-only"]);
  profile(item, path);
}

/** Internal only: inspect a detached JSON.parse snapshot, never caller objects. */
export function assertKernelStateShape(value: unknown): asserts value is KernelState {
  const state = record(value, "");
  if (state.formatVersion !== KERNEL_FORMAT_VERSION) invalid("/formatVersion", "The kernel state format is missing or unsupported.");
  if (state.project !== null) {
    const project = record(state.project, "/project");
    fields(project, "/project", ["id", "name", "revision"], identity);
    documents(project.documents, "/project/documents");
  }
  array(state.candidates, "/candidates", candidate);
  array(state.receipts, "/receipts", receipt);
  array(state.undo, "/undo", undo);
  array(state.redo, "/redo", undo);
  array(state.history, "/history", history);
  optional(state, "", "drafts", (entries, path) => array(entries, path, draft));
}
