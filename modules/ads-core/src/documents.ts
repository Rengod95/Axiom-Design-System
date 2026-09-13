import type { AdsDocument, Diagnostic, DocumentEntry, JsonObject, JsonValue } from "./contracts.ts";
import { CODE, DOCUMENT_KINDS, ID_PATTERN, OPAQUE_FIELDS, RESERVED_IDS } from "./constants.ts";
import { parseJson } from "./canonical-json.ts";
import { KernelError } from "./kernel-error.ts";

/** IDs are identities only; adapters must never interpret them as paths. */
export function isValidId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value) && !RESERVED_IDS.has(value);
}

/** Narrow plain JSON objects after parsing or canonical validation. */
export function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Validate only the native envelope, retaining the exact source separately. */
export function parseDocument(originalText: string, sourceUri = "memory:document"): DocumentEntry {
  const value = parseJson(originalText);
  if (!isObject(value) || !isValidId(value.id) || typeof value.kind !== "string" || !DOCUMENT_KINDS.has(value.kind)
    || !isValidId(value.revision) || typeof value.schemaVersion !== "string" || !value.schemaVersion.trim()
    || typeof value.name !== "string" || !value.name.trim()) {
    throw new KernelError(CODE.DOCUMENT_INVALID, "Document requires valid id, kind, schemaVersion, revision and name fields.");
  }
  if (typeof sourceUri !== "string" || !sourceUri.trim()) throw new KernelError(CODE.DOCUMENT_INVALID, "Document source URI is required.");
  return {
    document: value as AdsDocument, originalText, sourceUri, validation: "envelope-only",
    diagnostics: [{ code: CODE.DOMAIN_UNVERIFIED, phase: "document", severity: "warning", message: "Envelope only: domain semantics, opaque data and runtime support are unverified.", sourceRef: value.id }],
  };
}

/** Validate recognized document Ref objects, never interpreting opaque areas. */
export function validateReferences(documents: Record<string, DocumentEntry>, projectId: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const visit = (value: JsonValue, owner: string): void => {
    if (Array.isArray(value)) { for (const child of value) visit(child, owner); return; }
    if (!isObject(value)) return;
    if (Object.hasOwn(value, "expectedKind")) {
      if (!isValidId(value.id) || !isValidId(value.expectedKind)
        || (value.version !== undefined && (typeof value.version !== "string" || !value.version.trim()))
        || (value.revision !== undefined && !isValidId(value.revision))) throw new KernelError(CODE.REFERENCE_INVALID, "Typed Ref requires valid identity, kind and optional version/revision fields.");
      const knownDocument = Object.hasOwn(documents, value.id) ? documents[value.id] : undefined;
      if (knownDocument && knownDocument.document.kind !== value.expectedKind) throw new KernelError(CODE.REFERENCE_KIND, `Document ${owner} has a mismatched reference kind.`);
      if (DOCUMENT_KINDS.has(value.expectedKind)) {
        const target = knownDocument;
        const isProjectScope = value.id === projectId && value.expectedKind === "project";
        if (!target && !isProjectScope) throw new KernelError(CODE.REFERENCE_MISSING, `Document ${owner} has a missing document reference.`);
        if (isProjectScope && (value.revision !== undefined || value.version !== undefined)) throw new KernelError(CODE.REFERENCE_REVISION, "Live project scope references cannot pin source revisions or public versions in this profile.");
        if (value.revision !== undefined && (typeof value.revision !== "string" || (target && value.revision !== target.document.revision))) throw new KernelError(CODE.REFERENCE_REVISION, `Document ${owner} has a mismatched reference revision.`);
      } else {
        diagnostics.push({ code: CODE.DOMAIN_UNVERIFIED, phase: "reference", severity: "warning", message: "Non-document reference is preserved but requires a domain resolver.", sourceRef: owner });
      }
    }
    for (const [key, child] of Object.entries(value)) if (!OPAQUE_FIELDS.has(key)) visit(child, owner);
  };
  for (const entry of Object.values(documents)) visit(entry.document, entry.document.id);
  return diagnostics;
}
