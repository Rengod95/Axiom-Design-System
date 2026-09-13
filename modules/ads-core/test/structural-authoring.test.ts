import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, CommandService, MemoryStore, PROTOCOL_VERSION, STRUCTURAL_FORMAT, STRUCTURAL_PROFILE } from "../src/index.ts";
import type { CommandEnvelope, CommandResult, JsonObject, Principal } from "../src/index.ts";

const OWNER: Principal = { id: "author", scopes: ["project.read", "project.write", "review.apply"] };
const digest = (source: string): string => createHash("sha256").update(source).digest("hex");
const textDocument = (id = "text.one", extra: JsonObject = {}): JsonObject => ({ id, kind: "text", schemaVersion: "1.0.0", revision: "source-r1", name: "Text", blocks: [], localeHints: {}, ...extra });

async function setup() {
  let identities = 0;
  const store = new MemoryStore();
  const service = new CommandService(store, { createId: () => `generated-${++identities}`, digest });
  const current = async (): Promise<string | null> => (await service.getProject(OWNER))?.revision ?? null;
  const envelope = async (operation: string, payload: JsonObject): Promise<CommandEnvelope> => {
    const id = `request-${++identities}`;
    return { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: OWNER.id, projectId: "project", baseRevision: await current(), operation, payload, idempotencyKey: id, transactionId: id, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
  };
  const execute = async (operation: string, payload: JsonObject): Promise<CommandResult> => service.execute(await envelope(operation, payload), OWNER);
  const prepare = async (document: JsonObject, mode = "review", format: string = STRUCTURAL_FORMAT, sourceFields: JsonObject = {}): Promise<CommandResult> => execute("document.import", { sourceRefs: [{ uri: "memory:source", content: JSON.stringify(document), ...sourceFields }], formatProfile: format, importMode: mode });
  const approve = async (candidate: CommandResult): Promise<CommandResult> => {
    assert.equal(candidate.status, "reviewRequired", JSON.stringify(candidate));
    return execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
  };
  const adopt = async (candidate: CommandResult): Promise<CommandResult> => {
    const approved = await approve(candidate);
    const result = await execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: (await current())! });
    assert.equal(result.status, "accepted", JSON.stringify(result));
    return result;
  };
  await execute("project.create", { name: "Structure" });
  return { store, service, current, envelope, execute, prepare, approve, adopt };
}

test("structural draft policy is inherited by a default-format repair and keeps its invalid original", async () => {
  const h = await setup();
  const source = textDocument("text.one", { blocks: "broken" });
  const captured = await h.prepare(source, "draft");
  assert.equal(captured.status, "accepted");
  const draft = (await h.service.listDrafts(OWNER))[0]!;
  assert.equal(draft.validation, "invalid");
  assert.equal(draft.validationProfile, STRUCTURAL_PROFILE);
  assert.ok(draft.diagnostics.some((entry) => entry.path === "/blocks" && entry.severity === "error"));
  const before = await h.store.read();
  assert.equal((await h.prepare(source, "review", "ads-envelope", { draftId: draft.id })).status, "rejected");
  assert.deepEqual(await h.store.read(), before);
  await h.adopt(await h.prepare(textDocument(), "review", "ads-envelope", { draftId: draft.id }));
  const entry = (await h.service.getDocument("text.one", OWNER))!;
  assert.equal(entry.validationProfile, STRUCTURAL_PROFILE);
  assert.equal(entry.originalText, JSON.stringify(source));
  assert.equal((await h.service.exportDocument("text.one", OWNER))!.validationProfile, STRUCTURAL_PROFILE);
});

test("a draft reports known body errors even when its envelope is incomplete", async () => {
  const h = await setup();
  const document = textDocument("text.one", { blocks: 42 });
  delete document.name;
  const captured = await h.prepare(document, "draft");
  assert.equal(captured.status, "accepted");
  assert.ok(captured.diagnostics.some((entry) => entry.code === "DOCUMENT_INVALID" && entry.path === "/name"));
  assert.ok(captured.diagnostics.some((entry) => entry.code === "STRUCTURE_INVALID" && entry.path === "/blocks"));
  assert.equal((await h.service.listDrafts(OWNER))[0]!.originalText, JSON.stringify(document));
});

test("unchanged envelope promotion is reviewed and Undo restores its earlier validation policy", async () => {
  const h = await setup();
  await h.adopt(await h.prepare(textDocument(), "review", "ads-envelope"));
  const promoted = await h.prepare(textDocument(), "update", STRUCTURAL_FORMAT, { expectedRevision: "source-r1" });
  assert.deepEqual(promoted.diff[0]!.fields, []);
  const adopted = await h.adopt(promoted);
  assert.equal((await h.service.getDocument("text.one", OWNER))!.validationProfile, STRUCTURAL_PROFILE);
  const invalid = textDocument("text.one", { revision: "source-r2", blocks: false });
  assert.equal((await h.prepare(invalid, "update", "ads-envelope", { expectedRevision: "source-r1" })).status, "rejected");
  const undone = await h.execute("transaction.undo", { undoHandle: adopted.undoHandle!, expectedRevision: (await h.current())! });
  assert.equal(undone.status, "accepted");
  assert.equal((await h.service.getDocument("text.one", OWNER))!.validationProfile, undefined);
  const redone = await h.execute("transaction.redo", { redoHandle: undone.redoHandle!, expectedRevision: (await h.current())! });
  assert.equal(redone.status, "accepted");
  assert.equal((await h.service.getDocument("text.one", OWNER))!.validationProfile, STRUCTURAL_PROFILE);
});

test("inspection requires read authority and cannot promote or mutate legacy documents", async () => {
  const h = await setup();
  await h.adopt(await h.prepare(textDocument("text.one", { blocks: null }), "review", "ads-envelope"));
  const before = await h.store.read();
  await assert.rejects(h.service.inspectStructure({ id: "author", scopes: [] }), { code: "SCOPE_REQUIRED" });
  const report = await h.service.inspectStructure(OWNER);
  assert.equal(report.valid, false);
  assert.equal(report.revision, await h.current());
  report.documents.length = 0;
  assert.deepEqual(await h.store.read(), before);
  assert.equal((await h.service.inspectStructure(OWNER)).documents.length, 1);
});

test("apply rechecks structural constraints even for a current approved candidate", async () => {
  const h = await setup();
  const proposed = await h.prepare(textDocument());
  await h.store.transact((state) => {
    const candidate = state!.candidates[0]!;
    candidate.documents["text.one"]!.document.blocks = false;
    candidate.digest = digest(canonicalJson({ projectId: candidate.projectId, baseRevision: candidate.baseRevision, documents: candidate.documents, diff: candidate.diff }));
    return { state: state!, value: undefined, changed: true };
  });
  const candidate = (await h.store.read())!.candidates[0]!;
  const approved = await h.approve({ ...proposed, patchDigest: candidate.digest });
  assert.equal(approved.status, "accepted");
  const before = await h.store.read();
  const failed = await h.execute("transaction.apply", { candidateId: candidate.id, approvalToken: approved.reviewToken!, expectedRevision: (await h.current())! });
  assert.equal(failed.status, "rejected");
  assert.ok(failed.diagnostics.some((entry) => entry.code === "STRUCTURE_INVALID"));
  assert.deepEqual(await h.store.read(), before);
});

test("same-batch structural identities cannot collide inside separately valid documents", async () => {
  const h = await setup();
  const documents = ["text.one", "text.two"].map((id) => textDocument(id, { blocks: [{ id: "shared.block", kind: "paragraph", inlines: [] }] }));
  const before = await h.store.read();
  const failed = await h.execute("document.import", { sourceRefs: documents.map((document) => ({ uri: document.id!, content: JSON.stringify(document) })), importMode: "review", formatProfile: STRUCTURAL_FORMAT });
  assert.equal(failed.status, "rejected");
  assert.ok(failed.diagnostics.some((entry) => entry.code === "ENTITY_DUPLICATE"));
  assert.deepEqual(await h.store.read(), before);
});

test("opaque fields do not create references in structural documents", async () => {
  const h = await setup();
  const source = textDocument("text.one", { unknown: { expectedKind: "text", id: "absent" }, extensions: { vendor: { expectedKind: "component", id: "absent" } }, blocks: [{ id: "block.one", kind: "paragraph", inlines: [{ id: "run.one", text: "", marks: [{ expectedKind: "text", id: "absent" }] }] }] });
  await h.adopt(await h.prepare(source));
  const report = await h.service.inspectStructure(OWNER);
  assert.equal(report.valid, true, JSON.stringify(report.diagnostics));
  assert.ok(report.documents[0]!.structure.unverifiedTypes.includes("InlineMark"));
  assert.deepEqual((await h.service.getDocument("text.one", OWNER))!.document, source);
});

test("a public version pin cannot bypass deletion protection for a local document", async () => {
  const h = await setup();
  const manifest: JsonObject = { id: "manifest", kind: "project", schemaVersion: "1.0.0", revision: "manifest-r1", name: "Manifest", documents: [{ id: "text.one", expectedKind: "text", version: "1.0.0" }], libraries: [], targetProfiles: [], brandLibraries: [], connections: [] };
  const candidate = await h.execute("document.import", { sourceRefs: [textDocument(), manifest].map((document) => ({ uri: document.id!, content: JSON.stringify(document) })), importMode: "review", formatProfile: STRUCTURAL_FORMAT });
  await h.adopt(candidate);
  const before = await h.store.read();
  const failed = await h.execute("entity.delete", { refs: [{ id: "text.one", expectedKind: "text" }] });
  assert.equal(failed.status, "rejected");
  assert.ok(failed.diagnostics.some((entry) => entry.code === "REFERENCE_MISSING"));
  assert.deepEqual(await h.store.read(), before);
});

test("an omitted late reference error still rejects when earlier warnings exhaust the diagnostic limit", async () => {
  const h = await setup();
  const manifest: JsonObject = { id: "manifest", kind: "project", schemaVersion: "1.0.0", revision: "manifest-r1", name: "Manifest", documents: [], libraries: [], targetProfiles: Array.from({ length: 140 }, (_, index) => ({ id: `external-${index}`, expectedKind: "targetProfile" })), brandLibraries: [], connections: [{ id: "missing-connection", expectedKind: "connection" }] };
  const before = await h.store.read();
  const failed = await h.prepare(manifest);
  assert.equal(failed.status, "rejected");
  assert.ok(failed.diagnostics.some((entry) => entry.severity === "error"));
  assert.deepEqual(await h.store.read(), before);
});
