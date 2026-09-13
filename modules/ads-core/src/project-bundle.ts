import type { DocumentEntry, JsonObject, ProjectSnapshot } from "./contracts.ts";
import type { DigestService, ProjectBundle, ProjectBundleDocument, ProjectBundleManifest } from "./bundle-contracts.ts";
import { BUNDLE_FORMAT, BUNDLE_LIMITS, BUNDLE_VERSION, bundleFileName } from "./bundle-constants.ts";
import { CANONICAL_PROFILE_VERSION, CODE, DOCUMENT_KINDS, VALIDATION_PROFILES } from "./constants.ts";
import { canonicalJson, utf8SourceBytes } from "./canonical-json.ts";
import { isObject, isValidId, parseDocument, validateReferences } from "./documents.ts";
import { KernelError } from "./kernel-error.ts";
import { inspectProfileDocument } from "./validation-profile.ts";
import { inspectLocalReferences } from "./local-references.ts";

const HASH = /^[a-f0-9]{64}$/;
function invalid(message: string, path = ""): never { throw new KernelError(CODE.BUNDLE_INVALID, message, { path }); }
function exact(value: unknown, fields: readonly string[], required = fields): asserts value is JsonObject {
  if (!isObject(value) || Object.keys(value).some((field) => !fields.includes(field)) || required.some((field) => !Object.hasOwn(value, field))) invalid("Bundle record has missing or unsupported fields.");
}
function text(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function hash(text: string, digest: DigestService): string {
  const result = digest(text);
  if (!HASH.test(result)) throw new KernelError(CODE.STATE_INVALID, "Digest service must return a lowercase SHA-256 digest.");
  return result;
}
function bounded<T>(value: T): T {
  try { return JSON.parse(canonicalJson(value, BUNDLE_LIMITS.maxPayloadBytes)) as T; }
  catch (error) {
    if (error instanceof KernelError && error.code === CODE.JSON_LIMIT) throw new KernelError(CODE.BUNDLE_LIMIT, "Bundle exceeds its canonical transport limit.");
    throw error;
  }
}
function sourceSize(value: string): number {
  try { return utf8SourceBytes(value, BUNDLE_LIMITS.maxFileBytes); }
  catch (error) {
    if (error instanceof KernelError && error.code === CODE.JSON_LIMIT) throw new KernelError(CODE.BUNDLE_LIMIT, "Bundle source file exceeds its byte limit.");
    throw error;
  }
}
function unsigned(manifest: ProjectBundleManifest): Omit<ProjectBundleManifest, "bundleDigest"> {
  const { bundleDigest: _digest, ...content } = manifest;
  return content;
}

/** Validate shape and manifest integrity before an adapter follows any filenames. */
export function validateProjectBundleManifest(value: unknown, digest: DigestService): ProjectBundleManifest {
  value = bounded(value); // Use only captured descriptor values; never read the caller's Proxy again.
  exact(value, ["format", "version", "project", "canonicalProfile", "hashAlgorithm", "documents", "bundleDigest"]);
  if (value.format !== BUNDLE_FORMAT || value.version !== BUNDLE_VERSION || value.canonicalProfile !== CANONICAL_PROFILE_VERSION || value.hashAlgorithm !== "sha256") invalid("Unsupported project bundle format, version or canonical/hash profile.");
  exact(value.project, ["id", "name", "revision"]);
  if (!isValidId(value.project.id) || !isValidId(value.project.revision) || !text(value.project.name)) invalid("Bundle project identity, name or revision is invalid.", "/project");
  if (!Array.isArray(value.documents) || value.documents.length > BUNDLE_LIMITS.maxDocuments) throw new KernelError(CODE.BUNDLE_LIMIT, "Bundle document count exceeds its limit.", { path: "/documents" });
  const ids = new Set<string>();
  for (const [index, document] of value.documents.entries()) {
    const path = `/documents/${index}`;
    exact(document, ["id", "kind", "revision", "validationProfile", "original", "normalized"], ["id", "kind", "revision", "original", "normalized"]);
    if (!isValidId(document.id) || document.id === value.project.id || ids.has(document.id) || !isValidId(document.revision) || typeof document.kind !== "string" || !DOCUMENT_KINDS.has(document.kind)) invalid("Bundle document identity is invalid or duplicated.", path);
    if (document.validationProfile !== undefined && !VALIDATION_PROFILES.some((profile) => profile === document.validationProfile)) invalid("Bundle validation profile is unsupported.", `${path}/validationProfile`);
    ids.add(document.id);
    exact(document.original, ["file", "uri", "digest"]);
    exact(document.normalized, ["file", "digest"]);
    if (document.original.file !== bundleFileName(index, "original") || document.normalized.file !== bundleFileName(index, "normalized")) invalid("Bundle filenames must use their exact numeric slots.", path);
    if (!text(document.original.uri) || typeof document.original.digest !== "string" || !HASH.test(document.original.digest) || typeof document.normalized.digest !== "string" || !HASH.test(document.normalized.digest)) invalid("Bundle source URI or digest is invalid.", path);
  }
  if (typeof value.bundleDigest !== "string" || !HASH.test(value.bundleDigest)) invalid("Bundle manifest digest is invalid.", "/bundleDigest");
  const manifest = value as unknown as ProjectBundleManifest;
  if (hash(canonicalJson(unsigned(manifest)), digest) !== manifest.bundleDigest) throw new KernelError(CODE.DIGEST_MISMATCH, "Bundle manifest digest does not match its contents.", { path: "/bundleDigest" });
  return structuredClone(manifest);
}

/** Export one already captured project snapshot, excluding all private kernel records. */
export function exportProjectBundle(project: ProjectSnapshot, digest: DigestService): ProjectBundle {
  project = JSON.parse(canonicalJson(project)) as ProjectSnapshot;
  if (!isObject(project) || !isObject(project.documents)) invalid("A project snapshot is required.");
  if (Object.keys(project.documents).length > BUNDLE_LIMITS.maxDocuments) throw new KernelError(CODE.BUNDLE_LIMIT, "Project exceeds the bundle document limit.");
  const files: Record<string, string> = {};
  const documents: ProjectBundleDocument[] = [];
  let bytes = 0;
  for (const [index, id] of Object.keys(project.documents).sort().entries()) {
    const entry = project.documents[id]!;
    if (!isObject(entry) || !isObject(entry.document) || entry.document.id !== id || typeof entry.originalText !== "string" || !text(entry.sourceUri)) invalid("Project entry cannot be exported without its original source and stable identity.");
    const original = entry.originalText;
    const normalized = canonicalJson(entry.document, BUNDLE_LIMITS.maxFileBytes);
    bytes += sourceSize(original) + sourceSize(normalized);
    if (bytes > BUNDLE_LIMITS.maxCombinedBytes) throw new KernelError(CODE.BUNDLE_LIMIT, "Combined bundle source bytes exceed the profile limit.");
    parseDocument(normalized, id);
    const originalFile = bundleFileName(index, "original");
    const normalizedFile = bundleFileName(index, "normalized");
    files[originalFile] = original;
    files[normalizedFile] = normalized;
    documents.push({ id, kind: entry.document.kind, revision: entry.document.revision,
      ...(entry.validationProfile === undefined ? {} : { validationProfile: entry.validationProfile }),
      original: { file: originalFile, uri: entry.sourceUri, digest: hash(original, digest) }, normalized: { file: normalizedFile, digest: hash(normalized, digest) } });
  }
  const manifest: ProjectBundleManifest = { format: BUNDLE_FORMAT, version: BUNDLE_VERSION, project: { id: project.id, name: project.name, revision: project.revision }, canonicalProfile: CANONICAL_PROFILE_VERSION, hashAlgorithm: "sha256", documents, bundleDigest: "" };
  manifest.bundleDigest = hash(canonicalJson(unsigned(manifest)), digest);
  validateProjectBundleManifest(manifest, digest);
  const bundle = { manifest, files };
  decodeProjectBundle({ uri: "memory:bundle", ...bundle }, { ...project, documents: {} }, digest);
  return bundle;
}

/** Decode only integrity-checked source records; adoption still revalidates the complete graph. */
export function decodeProjectBundle(source: JsonObject, project: ProjectSnapshot, digest: DigestService): Record<string, DocumentEntry> {
  source = bounded({ formatProfile: BUNDLE_FORMAT, importMode: "review", sourceRefs: [source] }).sourceRefs[0]!;
  exact(source, ["uri", "manifest", "files"]);
  if (!text(source.uri)) invalid("Bundle source URI is required.", "/uri");
  const manifest = validateProjectBundleManifest(source.manifest, digest);
  project = JSON.parse(canonicalJson(project)) as ProjectSnapshot;
  if (project.id !== manifest.project.id || project.name !== manifest.project.name) throw new KernelError(CODE.PROJECT_MISMATCH, "Bundle restoration requires the same explicit project identity and name.");
  if (!isObject(project.documents) || Object.keys(project.documents).length !== 0) throw new KernelError(CODE.PROJECT_EXISTS, "Bundle restoration requires an empty target project.");
  if (!isObject(source.files)) invalid("Bundle files must be a filename-to-text map.", "/files");
  const names = manifest.documents.flatMap((document) => [document.original.file, document.normalized.file]);
  exact(source.files, names);
  const documents: Record<string, DocumentEntry> = {};
  let bytes = 0;
  for (const record of manifest.documents) {
    const original = source.files[record.original.file];
    const normalized = source.files[record.normalized.file];
    if (typeof original !== "string" || typeof normalized !== "string") invalid("Bundle source files must be UTF-8 text.", "/files");
    bytes += sourceSize(original) + sourceSize(normalized);
    if (bytes > BUNDLE_LIMITS.maxCombinedBytes) throw new KernelError(CODE.BUNDLE_LIMIT, "Combined bundle source bytes exceed the profile limit.");
    if (hash(original, digest) !== record.original.digest || hash(normalized, digest) !== record.normalized.digest) throw new KernelError(CODE.DIGEST_MISMATCH, "Bundle source digest does not match its file.", { sourceRef: record.id });
    const entry = parseDocument(normalized, `${source.uri}#${record.normalized.file}`);
    if (canonicalJson(entry.document) !== normalized) invalid("Bundle normalized source must match the canonical profile exactly.");
    if (entry.document.id !== record.id || entry.document.kind !== record.kind || entry.document.revision !== record.revision) invalid("Normalized document identity does not match the bundle manifest.");
    if (record.validationProfile) {
      const inspection = inspectProfileDocument(entry.document, record.validationProfile, record.id);
      if (!inspection.valid) {
        const error = inspection.diagnostics.find((diagnostic) => diagnostic.severity === "error");
        throw new KernelError(error?.code ?? CODE.BUNDLE_INVALID, error?.message ?? "Bundle document failed its declared validation profile.", {
          sourceRef: error?.sourceRef ?? record.id, ...(error?.path === undefined ? {} : { path: error.path }),
        });
      }
      entry.diagnostics.push(...inspection.diagnostics);
    }
    documents[record.id] = { ...entry, originalText: original, sourceUri: record.original.uri, currentText: normalized, currentSourceUri: `${source.uri}#${record.normalized.file}`,
      ...(record.validationProfile === undefined ? {} : { validationProfile: record.validationProfile }) };
  }
  const diagnostics = validateReferences(documents, project.id);
  const owners = Object.values(documents).filter((entry) => entry.validationProfile !== undefined).map((entry) => entry.document.id);
  if (owners.length) {
    const references = inspectLocalReferences(documents, project.id, owners);
    if (!references.valid) {
      const error = references.diagnostics.find((diagnostic) => diagnostic.severity === "error");
      throw new KernelError(error?.code ?? CODE.REFERENCE_INVALID, error?.message ?? "Bundle local-reference constraints failed.", {
        ...(error?.sourceRef === undefined ? {} : { sourceRef: error.sourceRef }), ...(error?.path === undefined ? {} : { path: error.path }),
      });
    }
    diagnostics.push(...references.diagnostics);
  }
  for (const diagnostic of diagnostics) {
    if (diagnostic.sourceRef && Object.hasOwn(documents, diagnostic.sourceRef)) documents[diagnostic.sourceRef]!.diagnostics.push(diagnostic);
  }
  return documents;
}
