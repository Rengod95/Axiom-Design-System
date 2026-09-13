import { DIGEST_PATTERN, STORE_ERROR } from "./constants.ts";
import { FileStoreError } from "./storage-error.ts";
import { VALIDATION_PROFILES } from "../../ads-core/src/index.ts";

/** Plain JSON objects only; this does not interpret ADS domain content. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** The storage boundary checks record shapes; the core owns identity, authorization and ADS meaning. */
export function validateSourceRecords(state: Record<string, unknown>): void {
  if (Object.hasOwn(state, "drafts")) {
    if (!Array.isArray(state.drafts)) throw new FileStoreError(STORE_ERROR.state, "Source drafts must be an array.");
    for (const draft of state.drafts) {
      if (!isRecord(draft) || !["id", "projectId", "actorId", "sourceUri"].every(key => typeof draft[key] === "string" && draft[key].length > 0) || typeof draft.originalText !== "string" || typeof draft.sourceDigest !== "string" || !DIGEST_PATTERN.test(draft.sourceDigest) || (draft.validation !== "invalid" && draft.validation !== "envelope-only") || !Array.isArray(draft.diagnostics) || !draft.diagnostics.every(isDiagnostic)) throw new FileStoreError(STORE_ERROR.state, "A source draft record is malformed.");
      validateProfile(draft);
    }
  }
  if (isRecord(state.project)) validateDocumentSources(state.project.documents);
  for (const candidate of state.candidates as Record<string, unknown>[]) validateDocumentSources(candidate.documents);
  for (const key of ["undo", "redo"]) {
    for (const entry of state[key] as Record<string, unknown>[]) {
      validateDocumentSources(entry.before);
      validateDocumentSources(entry.after);
    }
  }
}

function isDiagnostic(value: unknown): boolean {
  return isRecord(value) && ["code", "phase", "message"].every(key => typeof value[key] === "string") && (value.severity === "info" || value.severity === "warning" || value.severity === "error") && ["sourceRef", "path"].every(key => !Object.hasOwn(value, key) || typeof value[key] === "string");
}

function validateDocumentSources(documents: unknown): void {
  if (documents === undefined) return;
  if (!isRecord(documents)) throw new FileStoreError(STORE_ERROR.state, "A document source map must be a record.");
  for (const entry of Object.values(documents)) {
    if (!isRecord(entry) || (Object.hasOwn(entry, "currentText") && typeof entry.currentText !== "string") || (Object.hasOwn(entry, "currentSourceUri") && (typeof entry.currentSourceUri !== "string" || !entry.currentSourceUri))) throw new FileStoreError(STORE_ERROR.state, "Current document source text and URI must be strings when present.");
    validateProfile(entry);
  }
}

/** Persisted validation policy is additive, but unknown policies cannot silently downgrade. */
function validateProfile(record: Record<string, unknown>): void {
  if (Object.hasOwn(record, "validationProfile") && !VALIDATION_PROFILES.some((profile) => profile === record.validationProfile)) throw new FileStoreError(STORE_ERROR.state, "Unsupported source validation profile.");
}
