import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonicalJson } from "../src/canonical-json.ts";
import { parseDocument, validateReferences } from "../src/documents.ts";
import { decodeProjectBundle, exportProjectBundle, validateProjectBundleManifest } from "../src/project-bundle.ts";
import { BUNDLE_LIMITS } from "../src/bundle-constants.ts";
import type { ProjectBundle } from "../src/bundle-contracts.ts";
import type { DocumentEntry, JsonObject, ProjectSnapshot } from "../src/contracts.ts";

const digest = (text: string): string => createHash("sha256").update(text).digest("hex");
function entry(id: string, fields: JsonObject = {}): DocumentEntry {
  return parseDocument(JSON.stringify({ id, kind: "component", schemaVersion: "future-version", revision: "document-r1", name: id, ...fields }), `file:///original/${id}.json`);
}
function project(documents: Record<string, DocumentEntry> = {}): ProjectSnapshot { return { id: "bundle-project", name: "Bundle project", revision: "project-r1", documents }; }
function source(bundle: ProjectBundle): JsonObject { return { uri: "file:///bundle/manifest.json", ...bundle }; }
function resign(bundle: ProjectBundle): void {
  const { bundleDigest: _digest, ...unsigned } = bundle.manifest;
  bundle.manifest.bundleDigest = digest(canonicalJson(unsigned));
}
function rejects(fn: () => unknown, code: string): void { assert.throws(fn, (error: unknown) => error instanceof Error && "code" in error && error.code === code); }

test("multi-document restoration preserves malformed first sources, references, opaque values and distinct source revisions", () => {
  const card = entry("card", { target: { id: "other", expectedKind: "component", revision: "document-r1" }, extensions: { future: { command: "do not execute", payload: [1, null] } } });
  card.originalText = "\uFEFF{ unfinished: 원문\r\n";
  card.currentText = canonicalJson(card.document);
  card.currentSourceUri = "file:///edited/card.json";
  const original = project({ other: entry("other"), card });
  const bundle = exportProjectBundle(original, digest);
  const restored = decodeProjectBundle(source(bundle), { ...project(), revision: "fresh-local-r1" }, digest);
  assert.equal(restored.card!.originalText, card.originalText);
  assert.equal(restored.card!.sourceUri, card.sourceUri);
  assert.deepEqual(restored.card!.document, card.document);
  assert.equal(restored.card!.currentText, bundle.files["document-0000-normalized.json"]);
  assert.equal(bundle.manifest.project.revision, "project-r1");
  assert.equal(restored.card!.document.revision, "document-r1");
  assert.deepEqual(validateReferences(restored, original.id), []);
  const next = exportProjectBundle({ ...project(), revision: "restored-r2", documents: restored }, digest);
  assert.deepEqual(next.files, bundle.files);
  assert.deepEqual(next.manifest.documents, bundle.manifest.documents);
  assert.notEqual(next.manifest.bundleDigest, bundle.manifest.bundleDigest);
  assert.deepEqual(Object.keys(bundle).sort(), ["files", "manifest"]);
});

test("empty projects round-trip and names/identity are explicit restoration preconditions", () => {
  const bundle = exportProjectBundle(project(), digest);
  assert.deepEqual(decodeProjectBundle(source(bundle), project(), digest), {});
  rejects(() => decodeProjectBundle(source(bundle), { ...project(), id: "copy-project" }, digest), "PROJECT_MISMATCH");
  rejects(() => decodeProjectBundle(source(bundle), { ...project(), name: "Renamed" }, digest), "PROJECT_MISMATCH");
  rejects(() => decodeProjectBundle(source(bundle), project({ existing: entry("existing") }), digest), "PROJECT_EXISTS");
});

test("file and manifest tampering are rejected and self-rehashed noncanonical or wrong-identity sources still fail", () => {
  const original = exportProjectBundle(project({ card: entry("card") }), digest);
  for (const filename of Object.keys(original.files)) {
    const bundle = structuredClone(original);
    bundle.files[filename] += " ";
    rejects(() => decodeProjectBundle(source(bundle), project(), digest), "DIGEST_MISMATCH");
  }
  const changed = structuredClone(original);
  changed.manifest.project.name = "tampered";
  rejects(() => validateProjectBundleManifest(changed.manifest, digest), "DIGEST_MISMATCH");
  const formatted = structuredClone(original);
  const record = formatted.manifest.documents[0]!;
  formatted.files[record.normalized.file] += "\n";
  record.normalized.digest = digest(formatted.files[record.normalized.file]!);
  resign(formatted);
  rejects(() => decodeProjectBundle(source(formatted), project(), digest), "BUNDLE_INVALID");
  const identity = structuredClone(original);
  identity.manifest.documents[0]!.revision = "false-source-r2";
  resign(identity);
  rejects(() => decodeProjectBundle(source(identity), project(), digest), "BUNDLE_INVALID");
});

test("unknown manifest fields, profiles, versions and any non-positional filename are rejected", () => {
  const original = exportProjectBundle(project({ card: entry("card") }), digest);
  for (const name of ["../outside.json", "/outside.json", "C:\\outside.json", "card.json", "document-0001-original.json"]) {
    const bundle = structuredClone(original);
    bundle.manifest.documents[0]!.original.file = name;
    resign(bundle);
    rejects(() => validateProjectBundleManifest(bundle.manifest, digest), "BUNDLE_INVALID");
  }
  for (const change of [
    (bundle: ProjectBundle) => { Object.assign(bundle.manifest, { receipts: [] }); },
    (bundle: ProjectBundle) => { Object.assign(bundle.manifest.documents[0]!, { validationProfile: "trusted" }); },
    (bundle: ProjectBundle) => { Object.assign(bundle.manifest, { version: "2.0.0" }); },
  ]) {
    const bundle = structuredClone(original);
    change(bundle); resign(bundle);
    rejects(() => validateProjectBundleManifest(bundle.manifest, digest), "BUNDLE_INVALID");
  }
});

test("exact file inventory rejects missing, extra, repeated and mistyped sources", () => {
  const original = exportProjectBundle(project({ card: entry("card"), other: entry("other") }), digest);
  const missing = structuredClone(original);
  delete missing.files["document-0000-original.json"];
  rejects(() => decodeProjectBundle(source(missing), project(), digest), "BUNDLE_INVALID");
  const extra = structuredClone(original);
  extra.files["unlisted.json"] = "private";
  rejects(() => decodeProjectBundle(source(extra), project(), digest), "BUNDLE_INVALID");
  const duplicate = structuredClone(original);
  duplicate.manifest.documents[1]!.id = "card";
  resign(duplicate);
  rejects(() => decodeProjectBundle(source(duplicate), project(), digest), "BUNDLE_INVALID");
  const nonString = source(original);
  (nonString.files as JsonObject)["document-0000-original.json"] = {};
  rejects(() => decodeProjectBundle(nonString, project(), digest), "BUNDLE_INVALID");
});

test("profiled text is revalidated on decode and export while unprofiled content remains unverified", () => {
  const text = entry("text", { kind: "text", blocks: [{ id: "block", kind: "paragraph", inlines: [{ id: "run", text: "본문", marks: [] }] }], localeHints: {} });
  text.validationProfile = "foundation-structural";
  const bundle = exportProjectBundle(project({ text }), digest);
  assert.equal(decodeProjectBundle(source(bundle), project(), digest).text!.validationProfile, "foundation-structural");
  const altered = structuredClone(bundle);
  const record = altered.manifest.documents[0]!;
  const invalid = { ...text.document, blocks: "wrong" };
  altered.files[record.normalized.file] = canonicalJson(invalid);
  record.normalized.digest = digest(altered.files[record.normalized.file]!);
  resign(altered);
  assert.throws(() => decodeProjectBundle(source(altered), project(), digest));
  assert.throws(() => exportProjectBundle(project({ text: { ...text, document: invalid } }), digest));
  delete text.validationProfile;
  const legacy = { ...text, document: invalid };
  assert.equal(decodeProjectBundle(source(exportProjectBundle(project({ text: legacy }), digest)), project(), digest).text!.validationProfile, undefined);
});

test("bundle transport counts raw original bytes, canonical escape expansion and document cardinality", () => {
  const large = entry("large");
  large.originalText = "x".repeat(BUNDLE_LIMITS.maxFileBytes + 1);
  rejects(() => exportProjectBundle(project({ large }), digest), "BUNDLE_LIMIT");
  const documents = Object.fromEntries(Array.from({ length: 5 }, (_, index) => {
    const id = `doc-${index}`;
    return [id, { ...entry(id), originalText: "x".repeat(BUNDLE_LIMITS.maxFileBytes) }];
  }));
  rejects(() => exportProjectBundle(project(documents), digest), "BUNDLE_LIMIT");
  const escaped = Object.fromEntries(Array.from({ length: 2 }, (_, index) => {
    const id = `doc-${index}`;
    return [id, { ...entry(id), originalText: "\u0000".repeat(BUNDLE_LIMITS.maxFileBytes) }];
  }));
  rejects(() => exportProjectBundle(project(escaped), digest), "BUNDLE_LIMIT");
  const tooMany = Object.fromEntries(Array.from({ length: BUNDLE_LIMITS.maxDocuments + 1 }, (_, index) => [`doc-${index}`, entry(`doc-${index}`)]));
  rejects(() => exportProjectBundle(project(tooMany), digest), "BUNDLE_LIMIT");
});

test("public bundle boundaries reject accessors and invalid Unicode without executing or replacing them", () => {
  let invoked = false;
  const input = Object.defineProperty({}, "manifest", { enumerable: true, get() { invoked = true; return {}; } });
  rejects(() => validateProjectBundleManifest(input, digest), "JSON_INVALID");
  assert.equal(invoked, false);
  const bad = entry("bad");
  bad.originalText = "\ud800";
  rejects(() => exportProjectBundle(project({ bad }), digest), "JSON_INVALID");
});

test("public export and decoder reject missing legacy and profiled targets before publishing a bundle", () => {
  const legacy = entry("legacy", { target: { id: "missing", expectedKind: "component" } });
  rejects(() => exportProjectBundle(project({ legacy }), digest), "REFERENCE_MISSING");
  const text = entry("text", { kind: "text", blocks: [{ id: "block", kind: "paragraph", typographyRef: { id: "missing-token", expectedKind: "token", version: "1.0.0" }, inlines: [] }], localeHints: {} });
  text.validationProfile = "foundation-structural";
  rejects(() => exportProjectBundle(project({ text }), digest), "REFERENCE_MISSING");
  const valid = exportProjectBundle(project({ card: entry("card") }), digest);
  const record = valid.manifest.documents[0]!;
  valid.files[record.normalized.file] = canonicalJson({ ...entry("card").document, target: { id: "missing", expectedKind: "component" } });
  record.normalized.digest = digest(valid.files[record.normalized.file]!);
  resign(valid);
  rejects(() => decodeProjectBundle(source(valid), project(), digest), "REFERENCE_MISSING");
});

test("domain profile survives the bundle and rejects stronger-policy content failures", () => {
  const text = entry("text", { kind: "text", blocks: [{ id: "block", kind: "paragraph", inlines: [{ id: "run", text: "Text", marks: ["strong"] }] }], localeHints: {} });
  text.validationProfile = "foundation-domain";
  const bundle = exportProjectBundle(project({ text }), digest);
  assert.equal(decodeProjectBundle(source(bundle), project(), digest).text!.validationProfile, "foundation-domain");
  const record = bundle.manifest.documents[0]!;
  const document = structuredClone(text.document);
  ((document.blocks as JsonObject[])[0]!.inlines as JsonObject[])[0]!.marks = ["unsupported-mark"];
  bundle.files[record.normalized.file] = canonicalJson(document);
  record.normalized.digest = digest(bundle.files[record.normalized.file]!);
  resign(bundle);
  assert.throws(() => decodeProjectBundle(source(bundle), project(), digest));
});

test("bundle APIs consume captured descriptor data without invoking a Proxy get trap", () => {
  let reads = 0;
  const proxy = <T extends object>(value: T): T => new Proxy(value, { get() { reads += 1; throw new Error("Untrusted Proxy get must not run"); } });
  const bundle = exportProjectBundle(proxy(project({ card: entry("card") })), digest);
  assert.deepEqual(validateProjectBundleManifest(proxy(bundle.manifest), digest), bundle.manifest);
  assert.equal(decodeProjectBundle(proxy(source(bundle)), proxy(project()), digest).card!.document.id, "card");
  assert.equal(reads, 0);
});
