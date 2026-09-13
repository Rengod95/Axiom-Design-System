import type { Diagnostic, DocumentEntry, KernelState, SourceExport } from "./contracts.ts";
import { CANONICAL_PROFILE_VERSION, CODE, IMPORT_LIMITS, STRUCTURAL_PROFILE } from "./constants.ts";
import { canonicalJson, utf8SourceBytes } from "./canonical-json.ts";
import { isObject, isValidId } from "./documents.ts";
import { KernelError } from "./kernel-error.ts";

const HASH_PATTERN = /^[a-f0-9]{64}$/;

function isDiagnostic(value: unknown): value is Diagnostic {
  return isObject(value) && typeof value.code === "string" && typeof value.phase === "string" && typeof value.message === "string"
    && (value.severity === "info" || value.severity === "warning" || value.severity === "error")
    && (value.sourceRef === undefined || typeof value.sourceRef === "string") && (value.path === undefined || typeof value.path === "string");
}

function checkCurrentSources(documents: Record<string, DocumentEntry>): void {
  if (!isObject(documents)) throw new KernelError(CODE.STATE_INVALID, "Invalid document source map.");
  for (const entry of Object.values(documents)) {
    if (!isObject(entry) || entry.currentText !== undefined && typeof entry.currentText !== "string"
      || entry.currentSourceUri !== undefined && (typeof entry.currentSourceUri !== "string" || !entry.currentSourceUri.trim())
      || entry.validationProfile !== undefined && entry.validationProfile !== STRUCTURAL_PROFILE) throw new KernelError(CODE.STATE_INVALID, "Invalid current source preservation fields.");
  }
}

/** Additive optional records are checked without rewriting any legacy snapshot. */
export function validateSourceRecords(state: KernelState): void {
  if (state.drafts !== undefined) {
    if (!Array.isArray(state.drafts)) throw new KernelError(CODE.STATE_INVALID, "Source drafts must be an array when present.");
    const ids = new Set<string>();
    for (const draft of state.drafts) {
      if (!isObject(draft) || !isValidId(draft.id) || !isValidId(draft.projectId) || !isValidId(draft.actorId) || draft.projectId !== state.project?.id
        || typeof draft.sourceUri !== "string" || !draft.sourceUri.trim() || typeof draft.originalText !== "string"
        || utf8SourceBytes(draft.originalText, IMPORT_LIMITS.maxDocumentBytes) > IMPORT_LIMITS.maxDocumentBytes
        || typeof draft.sourceDigest !== "string" || !HASH_PATTERN.test(draft.sourceDigest)
        || (draft.validation !== "invalid" && draft.validation !== "envelope-only") || !Array.isArray(draft.diagnostics) || !draft.diagnostics.every(isDiagnostic)
        || (draft.validationProfile !== undefined && draft.validationProfile !== STRUCTURAL_PROFILE)
        || ids.has(draft.id)) throw new KernelError(CODE.STATE_INVALID, "Invalid or duplicated immutable source draft.");
      ids.add(draft.id);
    }
  }
  if (state.project) checkCurrentSources(state.project.documents);
  for (const candidate of state.candidates) checkCurrentSources(candidate.documents);
  for (const inverse of [...state.undo, ...state.redo]) { checkCurrentSources(inverse.before); checkCurrentSources(inverse.after); }
}

/** Export first-source bytes separately from the current normalized document. */
export function exportSource(entry: DocumentEntry, projectRevision: string, diagnostics: Diagnostic[], digest: (text: string) => string): SourceExport {
  const normalized = canonicalJson(entry.document);
  return {
    documentId: entry.document.id, revision: entry.document.revision, projectRevision,
    canonicalProfile: CANONICAL_PROFILE_VERSION, hashAlgorithm: "sha256",
    original: { uri: entry.sourceUri, text: entry.originalText, digest: digest(entry.originalText) },
    normalized: { text: normalized, digest: digest(normalized) }, diagnostics,
    validation: "envelope-only", semantics: "unverified", ...(entry.validationProfile ? { validationProfile: entry.validationProfile } : {}),
  };
}
