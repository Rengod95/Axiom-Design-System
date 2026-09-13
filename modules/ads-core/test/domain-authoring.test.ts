import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { BUNDLE_FORMAT, canonicalJson, CommandService, DOMAIN_FORMAT, DOMAIN_PROFILE, MemoryStore, PROTOCOL_VERSION, STRUCTURAL_FORMAT, STRUCTURAL_PROFILE } from "../src/index.ts";
import type { CommandEnvelope, CommandResult, JsonObject, Principal, ProjectBundle } from "../src/index.ts";

const OWNER: Principal = { id: "author", scopes: ["project.read", "project.write", "review.apply"] };
const digest = (source: string): string => createHash("sha256").update(source).digest("hex");
const document = (mark = "strong", revision = "source-r1"): JsonObject => ({ id: "text.one", kind: "text", schemaVersion: "1.0.0", revision, name: "Text", blocks: [{ id: "block.one", kind: "paragraph", inlines: [{ id: "run.one", text: "원문", marks: [mark] }] }], localeHints: {} });
const bundlePayload = (bundle: ProjectBundle): JsonObject => ({ sourceRefs: [{ uri: "memory:bundle", ...bundle }], formatProfile: BUNDLE_FORMAT, importMode: "review" });

async function setup(prefix = "local") {
  let identities = 0;
  const store = new MemoryStore();
  const service = new CommandService(store, { createId: () => `${prefix}-${++identities}`, digest });
  const current = async (): Promise<string | null> => (await service.getProject(OWNER))?.revision ?? null;
  const envelope = async (operation: string, payload: JsonObject): Promise<CommandEnvelope> => {
    const id = `request-${++identities}`;
    return { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: OWNER.id, projectId: "project", baseRevision: await current(), operation, payload, idempotencyKey: id, transactionId: id, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
  };
  const execute = async (operation: string, payload: JsonObject): Promise<CommandResult> => service.execute(await envelope(operation, payload), OWNER);
  const prepare = async (source: JsonObject, mode = "review", format: string = DOMAIN_FORMAT, fields: JsonObject = {}): Promise<CommandResult> => execute("document.import", { sourceRefs: [{ uri: "memory:source", content: JSON.stringify(source), ...fields }], formatProfile: format, importMode: mode });
  const approve = async (candidate: CommandResult): Promise<CommandResult> => {
    assert.equal(candidate.status, "reviewRequired", JSON.stringify(candidate));
    const result = await execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
    assert.equal(result.status, "accepted", JSON.stringify(result));
    return result;
  };
  const adopt = async (candidate: CommandResult): Promise<CommandResult> => {
    const approved = await approve(candidate);
    const result = await execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: (await current())! });
    assert.equal(result.status, "accepted", JSON.stringify(result));
    return result;
  };
  await execute("project.create", { name: "Source project" });
  return { store, service, current, envelope, execute, prepare, approve, adopt };
}

test("domain draft repairs inherit the strongest profile and preserve invalid first source", async () => {
  const h = await setup();
  const invalid = document("not-a-mark");
  await h.prepare(invalid, "draft");
  const draft = (await h.service.listDrafts(OWNER))[0]!;
  assert.equal(draft.validationProfile, DOMAIN_PROFILE);
  assert.equal(draft.validation, "invalid");
  assert.ok(draft.diagnostics.some((item) => item.path === "/blocks/0/inlines/0/marks/0" && item.severity === "error"));
  const before = await h.store.read();
  assert.equal((await h.prepare(invalid, "review", STRUCTURAL_FORMAT, { draftId: draft.id })).status, "rejected");
  assert.deepEqual(await h.store.read(), before);
  await h.adopt(await h.prepare(document(), "review", "ads-envelope", { draftId: draft.id }));
  const entry = (await h.service.getDocument("text.one", OWNER))!;
  assert.equal(entry.validationProfile, DOMAIN_PROFILE);
  assert.equal(entry.originalText, JSON.stringify(invalid));
  assert.equal((await h.service.exportDocument("text.one", OWNER))!.validationProfile, DOMAIN_PROFILE);
  assert.equal((await h.prepare(document("not-a-mark", "source-r2"), "update", STRUCTURAL_FORMAT, { expectedRevision: "source-r1" })).status, "rejected");
});

test("domain promotion is reviewed, can be undone, and read-only inspection never promotes legacy data", async () => {
  const h = await setup();
  await h.adopt(await h.prepare(document(), "review", STRUCTURAL_FORMAT));
  const before = await h.store.read();
  await assert.rejects(h.service.inspectDomain({ id: OWNER.id, scopes: [] }), { code: "SCOPE_REQUIRED" });
  assert.equal((await h.service.inspectDomain(OWNER)).profile, DOMAIN_PROFILE);
  assert.deepEqual(await h.store.read(), before);
  const promoted = await h.prepare(document(), "update", DOMAIN_FORMAT, { expectedRevision: "source-r1" });
  assert.deepEqual(promoted.diff[0]!.fields, []);
  const applied = await h.adopt(promoted);
  assert.equal((await h.service.getDocument("text.one", OWNER))!.validationProfile, DOMAIN_PROFILE);
  const undone = await h.execute("transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: (await h.current())! });
  assert.equal(undone.status, "accepted");
  assert.equal((await h.service.getDocument("text.one", OWNER))!.validationProfile, STRUCTURAL_PROFILE);
  const redone = await h.execute("transaction.redo", { redoHandle: undone.redoHandle!, expectedRevision: (await h.current())! });
  assert.equal(redone.status, "accepted");
  assert.equal((await h.service.getDocument("text.one", OWNER))!.validationProfile, DOMAIN_PROFILE);
});

test("old structural marks remain readable while domain inspection reports their unsupported encoding", async () => {
  const h = await setup();
  await h.adopt(await h.prepare(document("vendor.future-mark"), "review", STRUCTURAL_FORMAT));
  const before = await h.store.read();
  assert.equal((await h.service.inspectStructure(OWNER)).valid, true);
  assert.equal((await h.service.inspectDomain(OWNER)).valid, false);
  assert.deepEqual(await h.store.read(), before);
});

test("domain rules are rechecked at apply even after a candidate is approved", async () => {
  const h = await setup();
  const proposed = await h.prepare(document());
  await h.store.transact((state) => {
    const candidate = state!.candidates[0]!;
    candidate.documents["text.one"]!.document = document("unsupported") as typeof candidate.documents[string]["document"];
    candidate.digest = digest(canonicalJson({ projectId: candidate.projectId, baseRevision: candidate.baseRevision, documents: candidate.documents, diff: candidate.diff }));
    return { state: state!, value: undefined, changed: true };
  });
  const candidate = (await h.store.read())!.candidates[0]!;
  const approval = await h.approve({ ...proposed, patchDigest: candidate.digest });
  const before = await h.store.read();
  const failed = await h.execute("transaction.apply", { candidateId: candidate.id, approvalToken: approval.reviewToken!, expectedRevision: (await h.current())! });
  assert.equal(failed.status, "rejected");
  assert.ok(failed.diagnostics.some((item) => item.severity === "error" && item.path?.endsWith("/marks/0")));
  assert.deepEqual(await h.store.read(), before);
});

test("a complete bundle preserves malformed originals and cross-document references through reviewed restore and history", async () => {
  const source = await setup("source");
  const captured = await source.execute("document.import", { sourceRefs: [{ uri: "memory:first", content: "{ broken 원문" }], formatProfile: DOMAIN_FORMAT, importMode: "draft" });
  await source.adopt(await source.prepare(document(), "review", DOMAIN_FORMAT, { draftId: captured.draftRefs![0]! }));
  const manifest: JsonObject = { id: "manifest", kind: "project", schemaVersion: "1.0.0", revision: "source-r1", name: "Manifest", documents: [{ id: "text.one", expectedKind: "text" }], libraries: [], targetProfiles: [], brandLibraries: [], connections: [] };
  await source.adopt(await source.prepare(manifest));
  await assert.rejects(source.service.exportBundle({ id: OWNER.id, scopes: [] }), { code: "SCOPE_REQUIRED" });
  const bundle = await source.service.exportBundle(OWNER);
  assert.equal(bundle.manifest.documents.length, 2);
  assert.equal(Object.keys(bundle.files).length, 4);
  assert.deepEqual(Object.keys(bundle).sort(), ["files", "manifest"]);
  const target = await setup("target");
  const staged = await target.execute("document.import", bundlePayload(bundle));
  assert.deepEqual((await target.service.getProject(OWNER))!.documents, {});
  const approved = await target.approve(staged);
  const applyEnvelope = await target.envelope("transaction.apply", { candidateId: staged.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: (await target.current())! });
  const applied = await target.service.execute(applyEnvelope, OWNER);
  assert.equal(applied.status, "accepted");
  assert.notEqual(applied.revision, bundle.manifest.project.revision);
  const committed = await target.store.read();
  assert.deepEqual(await target.service.execute(applyEnvelope, OWNER), applied, "a lost apply response replays its exact durable receipt");
  assert.deepEqual(await target.store.read(), committed);
  assert.equal((await target.service.getDocument("text.one", OWNER))!.originalText, "{ broken 원문");
  assert.equal((await target.service.getDocument("text.one", OWNER))!.validationProfile, DOMAIN_PROFILE);
  assert.equal((await target.service.inspectDomain(OWNER)).valid, true);
  assert.equal((await target.service.listDrafts(OWNER)).length, 0);
  assert.equal((await target.service.getHistory(OWNER)).length, 2);
  const exported = await target.service.exportBundle(OWNER);
  assert.deepEqual(exported.files, bundle.files);
  assert.deepEqual(exported.manifest.documents, bundle.manifest.documents);
  assert.equal((await target.execute("entity.delete", { refs: [{ id: "text.one", expectedKind: "text" }] })).status, "rejected");
  const undone = await target.execute("transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: (await target.current())! });
  assert.equal(undone.status, "accepted");
  assert.deepEqual((await target.service.getProject(OWNER))!.documents, {});
  const redone = await target.execute("transaction.redo", { redoHandle: undone.redoHandle!, expectedRevision: (await target.current())! });
  assert.equal(redone.status, "accepted");
  assert.deepEqual((await target.service.exportBundle(OWNER)).files, bundle.files);
});

test("bundle restore refuses a stale approval and leaves the intervening project intact", async () => {
  const source = await setup("source");
  await source.adopt(await source.prepare(document()));
  const bundle = await source.service.exportBundle(OWNER);
  const target = await setup("target");
  const staged = await target.execute("document.import", bundlePayload(bundle));
  const approved = await target.approve(staged);
  const stale = await target.envelope("transaction.apply", { candidateId: staged.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: (await target.current())! });
  await target.adopt(await target.prepare(document("emphasis")));
  const before = await target.store.read();
  assert.equal((await target.service.execute(stale, OWNER)).status, "conflict");
  assert.deepEqual((await target.service.getProject(OWNER))!.documents, before!.project!.documents);
  assert.equal((await target.execute("document.import", bundlePayload(bundle))).status, "rejected");
});

test("empty project bundles are reviewed and committed as one reversible restore", async () => {
  const source = await setup("source");
  const target = await setup("target");
  const bundle = await source.service.exportBundle(OWNER);
  const applied = await target.adopt(await target.execute("document.import", bundlePayload(bundle)));
  assert.deepEqual(applied.affectedRefs, []);
  assert.equal((await target.service.getHistory(OWNER)).length, 2);
  assert.equal((await target.execute("transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: (await target.current())! })).status, "accepted");
});
