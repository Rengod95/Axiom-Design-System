import type { CommandResult, Diagnostic, DocumentEntry, JsonObject, JsonValue, KernelState, Principal, ProjectSnapshot, SourceDraft, ValidationProfile } from "./contracts.ts";
import { CODE, DOMAIN_FORMAT, DOMAIN_PROFILE, IMPORT_LIMITS, STRUCTURAL_FORMAT, STRUCTURAL_PROFILE, STUDIO_FORMAT, STUDIO_PROFILE } from "./constants.ts";
import { canonicalJson, parseJson, utf8SourceBytes } from "./canonical-json.ts";
import { inspectDocument, isObject, isValidId } from "./documents.ts";
import { KernelError } from "./kernel-error.ts";
import { inspectProfileDocument, strongestValidationProfile } from "./validation-profile.ts";
import { BUNDLE_FORMAT } from "./bundle-constants.ts";
import { decodeProjectBundle } from "./project-bundle.ts";

interface ImportSource { uri: string; content: string; expectedRevision?: string; draftId?: string }
type ImportMode = "review" | "draft" | "update";
type PreparedImport = { kind: "drafts"; drafts: SourceDraft[] } | { kind: "documents"; documents: Record<string, DocumentEntry>; diff: CommandResult["diff"] };
interface ImportServices { createId(): string; digest(text: string): string }

/** Carry all inspection locations while preserving all-or-nothing review imports. */
export class ImportRejection extends KernelError {
  readonly diagnostics: Diagnostic[];
  constructor(diagnostics: Diagnostic[]) {
    super(diagnostics[0]?.code ?? CODE.DOCUMENT_INVALID, diagnostics[0]?.message ?? "Invalid source document.");
    this.diagnostics = diagnostics;
  }
}

function allowedFields(value: JsonObject, allowed: string[]): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new KernelError(CODE.PAYLOAD_INVALID, "Import contains fields outside the selected source mode.");
}

/** Bound the complete transport before any immutable source is captured. */
function sourcesFrom(payload: JsonObject): { mode: ImportMode; sources: ImportSource[]; profile: ValidationProfile | undefined } {
  allowedFields(payload, ["sourceRefs", "formatProfile", "importMode"]);
  const mode = payload.importMode;
  if ((payload.formatProfile !== "ads-envelope" && payload.formatProfile !== STRUCTURAL_FORMAT && payload.formatProfile !== DOMAIN_FORMAT && payload.formatProfile !== STUDIO_FORMAT) || (mode !== "review" && mode !== "draft" && mode !== "update")
    || !Array.isArray(payload.sourceRefs) || !payload.sourceRefs.length || payload.sourceRefs.length > IMPORT_LIMITS.maxDocuments) throw new KernelError(CODE.PAYLOAD_INVALID, "Import requires a bounded ads-envelope source batch and an explicit mode.");
  let bytes = 0;
  const sources = payload.sourceRefs.map((source): ImportSource => {
    if (!isObject(source)) throw new KernelError(CODE.PAYLOAD_INVALID, "Import source must contain URI and content.");
    allowedFields(source, mode === "draft" ? ["uri", "content"] : mode === "review" ? ["uri", "content", "draftId"] : ["uri", "content", "draftId", "expectedRevision"]);
    if (typeof source.content !== "string" || typeof source.uri !== "string" || !source.uri.trim()
      || (source.draftId !== undefined && !isValidId(source.draftId))
      || (mode === "update" && !isValidId(source.expectedRevision))) throw new KernelError(CODE.PAYLOAD_INVALID, "Source content, URI, draft identity or expected revision is invalid.");
    const size = utf8SourceBytes(source.content, IMPORT_LIMITS.maxDocumentBytes);
    bytes += size;
    if (size > IMPORT_LIMITS.maxDocumentBytes || bytes > IMPORT_LIMITS.maxBatchBytes) throw new KernelError(CODE.JSON_LIMIT, "Import source or batch exceeds the profile byte limit.");
    return source as unknown as ImportSource;
  });
  return { mode, sources, profile: payload.formatProfile === STUDIO_FORMAT ? STUDIO_PROFILE : payload.formatProfile === DOMAIN_FORMAT ? DOMAIN_PROFILE : payload.formatProfile === STRUCTURAL_FORMAT ? STRUCTURAL_PROFILE : undefined };
}

function draftFor(source: ImportSource, state: KernelState, project: ProjectSnapshot, principal: Principal): SourceDraft | undefined {
  if (source.draftId === undefined) return undefined;
  const draft = state.drafts?.find((entry) => entry.id === source.draftId && entry.projectId === project.id && entry.actorId === principal.id);
  if (!draft) throw new KernelError(CODE.DRAFT_MISSING, "Source draft is unavailable to the current principal.");
  return draft;
}

/** Field paths are review evidence, never an executable mutation program. */
export function documentChanges(before: JsonObject, after: JsonObject): NonNullable<CommandResult["diff"][number]["fields"]> {
  const fields: NonNullable<CommandResult["diff"][number]["fields"]> = [];
  const visit = (previous: JsonValue | undefined, next: JsonValue | undefined, path: string): void => {
    if (previous !== undefined && next !== undefined && canonicalJson(previous) === canonicalJson(next)) return;
    if (isObject(previous) && isObject(next)) {
      for (const key of [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort()) {
        const escaped = key.replaceAll("~", "~0").replaceAll("/", "~1");
        visit(Object.hasOwn(previous, key) ? previous[key] : undefined, Object.hasOwn(next, key) ? next[key] : undefined, `${path}/${escaped}`);
      }
      return;
    }
    const field: (typeof fields)[number] = { path };
    if (previous !== undefined) field.before = structuredClone(previous);
    if (next !== undefined) field.after = structuredClone(next);
    fields.push(field);
  };
  visit(before, after, "");
  return fields;
}

/** Prepare only source data; the service owns candidate/receipt publication. */
export function prepareImport(payload: JsonObject, state: KernelState, project: ProjectSnapshot, principal: Principal, services: ImportServices): PreparedImport {
  if (payload.formatProfile === BUNDLE_FORMAT) {
    allowedFields(payload, ["sourceRefs", "formatProfile", "importMode"]);
    if (payload.importMode !== "review" || !Array.isArray(payload.sourceRefs) || payload.sourceRefs.length !== 1 || !isObject(payload.sourceRefs[0])) throw new KernelError(CODE.PAYLOAD_INVALID, "Bundle restore requires one complete source and explicit review mode.");
    const documents = decodeProjectBundle(payload.sourceRefs[0], project, (text) => services.digest(text));
    return { kind: "documents", documents, diff: Object.keys(documents).map((id) => ({ id, change: "created" })) };
  }
  const { mode, sources, profile } = sourcesFrom(payload);
  if (mode === "draft") {
    const ids = new Set(state.drafts?.map((draft) => draft.id));
    const drafts = sources.map((source): SourceDraft => {
      const inspection = inspectDocument(source.content, source.uri);
      const id = services.createId();
      if (ids.has(id)) throw new KernelError(CODE.STATE_INVALID, "Source draft identity collision.");
      ids.add(id);
      let parsed: JsonValue | undefined = inspection.document;
      if (profile && parsed === undefined) {
        try { parsed = parseJson(source.content); }
        catch (error) { if (!(error instanceof KernelError)) throw error; }
      }
      const structure = profile && parsed !== undefined ? inspectProfileDocument(parsed, profile, source.uri) : undefined;
      return { id, projectId: project.id, actorId: principal.id, sourceUri: source.uri, originalText: source.content, sourceDigest: services.digest(source.content), diagnostics: [...inspection.diagnostics, ...(structure?.diagnostics ?? [])], validation: structure && !structure.valid ? "invalid" : inspection.validation, ...(profile ? { validationProfile: profile } : {}) };
    });
    return { kind: "drafts", drafts };
  }
  const documents = structuredClone(project.documents);
  const diff: CommandResult["diff"] = [];
  const imported = new Set<string>();
  for (const source of sources) {
    const original = draftFor(source, state, project, principal);
    const inspection = inspectDocument(source.content, source.uri);
    if (inspection.validation !== "envelope-only" || !inspection.document) throw new ImportRejection(inspection.diagnostics);
    const document = inspection.document;
    if (imported.has(document.id)) throw new KernelError(CODE.DOCUMENT_EXISTS, "Import repeats a document identity.");
    imported.add(document.id);
    const existing = Object.hasOwn(documents, document.id) ? documents[document.id] : undefined;
    const validationProfile = strongestValidationProfile(profile, original?.validationProfile, existing?.validationProfile);
    const structure = validationProfile ? inspectProfileDocument(document, validationProfile) : undefined;
    if (structure && !structure.valid) throw new ImportRejection(structure.diagnostics);
    const diagnostics = [...inspection.diagnostics, ...(structure?.diagnostics ?? [])];
    if (mode === "review") {
      if (document.id === project.id || existing) throw new KernelError(CODE.DOCUMENT_EXISTS, "Duplicate document identity; choose explicit update mode for existing documents.");
      const entry: DocumentEntry = { document, originalText: original?.originalText ?? source.content, sourceUri: original?.sourceUri ?? source.uri, validation: "envelope-only", diagnostics, ...(validationProfile ? { validationProfile } : {}) };
      if (original) { entry.currentText = source.content; entry.currentSourceUri = source.uri; }
      documents[document.id] = entry;
      diff.push({ id: document.id, change: "created" });
    } else {
      if (!existing) throw new KernelError(CODE.DOCUMENT_MISSING, "Update requires an existing document identity.");
      if (source.expectedRevision !== existing.document.revision) throw new KernelError(CODE.REVISION_CONFLICT, "Update expected source revision is stale.");
      if (document.kind !== existing.document.kind) throw new KernelError(CODE.REFERENCE_KIND, "Update cannot change document kind.");
      if (document.schemaVersion !== existing.document.schemaVersion) throw new KernelError(CODE.MIGRATION_UNSUPPORTED, "Schema changes require a registered migration; update does not migrate schemas.");
      if (canonicalJson(document) !== canonicalJson(existing.document) && document.revision === existing.document.revision) throw new KernelError(CODE.REVISION_CONFLICT, "Changed document content requires a new source revision.");
      documents[document.id] = { document, originalText: existing.originalText, sourceUri: existing.sourceUri, currentText: source.content, currentSourceUri: source.uri, validation: "envelope-only", diagnostics, ...(validationProfile ? { validationProfile } : {}) };
      diff.push({ id: document.id, change: "updated", fields: documentChanges(existing.document, document) });
    }
  }
  return { kind: "documents", documents, diff };
}
