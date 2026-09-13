import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";
import { IDBFactory } from "fake-indexeddb";
import { CommandService, PROTOCOL_VERSION, BUNDLE_FORMAT, canonicalJson } from "../../ads-core/src/index.ts";
import type { CommandEnvelope, CommandResult, JsonObject, Principal } from "../../ads-core/src/index.ts";
import { IndexedDbStore, browserDigest, BrowserStoreError } from "../src/index.ts";
import type { IndexedDbStoreOptions } from "../src/contracts.ts";

const OWNER: Principal = { id: "author", scopes: ["project.read", "project.write", "review.apply"] };
const text = (revision = "source-r1", content = "원문"): JsonObject => ({ id: "text", kind: "text", schemaVersion: "1.0.0", revision, name: "Text", blocks: [{ id: "block", kind: "paragraph", inlines: [{ id: "run", text: content, marks: ["strong"] }] }], localeHints: {} });
function setup(t: TestContext) {
  const factory = new IDBFactory();
  const stores: IndexedDbStore[] = [];
  let ids = 0;
  const services = { createId: () => `generated-${++ids}`, digest: browserDigest };
  const open = (name = "source", options: IndexedDbStoreOptions = {}) => {
    const store = new IndexedDbStore(name, { indexedDB: factory, ...options });
    stores.push(store);
    return { store, service: new CommandService(store, services) };
  };
  const envelope = (operation: string, payload: JsonObject, revision: string | null): CommandEnvelope => {
    const id = `request-${++ids}`;
    return { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: OWNER.id, projectId: "project", baseRevision: revision, operation, payload, idempotencyKey: id, origin: "GUI", transactionId: id, requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
  };
  const execute = async (service: CommandService, operation: string, payload: JsonObject) => service.execute(envelope(operation, payload, (await service.getProject(OWNER))?.revision ?? null), OWNER);
  const approve = async (service: CommandService, candidate: CommandResult) => {
    assert.equal(candidate.status, "reviewRequired", JSON.stringify(candidate));
    const reviewed = await execute(service, "transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
    assert.equal(reviewed.status, "accepted");
    return reviewed;
  };
  const adopt = async (service: CommandService, candidate: CommandResult) => {
    const reviewed = await approve(service, candidate);
    const applied = await execute(service, "transaction.apply", { candidateId: candidate.candidateId!, approvalToken: reviewed.reviewToken!, expectedRevision: (await service.getProject(OWNER))!.revision });
    assert.equal(applied.status, "accepted", JSON.stringify(applied));
    return applied;
  };
  t.after(() => stores.forEach((store) => store.close()));
  return { open, envelope, execute, approve, adopt };
}

test("domain source repair/update, original preservation, Undo/redo and bundle restore survive new IDB connections", async (t) => {
  const { open, execute, adopt } = setup(t);
  let { service, store } = open();
  await execute(service, "project.create", { name: "Project" });
  const original = "\uFEFF{malformed 원문\r\n";
  const draft = await execute(service, "document.import", { formatProfile: "ads-domain", importMode: "draft", sourceRefs: [{ uri: "memory:first", content: original }] });
  assert.equal(draft.status, "accepted");
  const candidate = await execute(service, "document.import", { formatProfile: "ads-domain", importMode: "review", sourceRefs: [{ uri: "memory:repair", content: JSON.stringify(text()), draftId: draft.draftRefs![0]! }] });
  await adopt(service, candidate);
  const updated = await execute(service, "document.import", { formatProfile: "ads-envelope", importMode: "update", sourceRefs: [{ uri: "memory:update", content: JSON.stringify(text("source-r2", "수정")), expectedRevision: "source-r1" }] });
  const applied = await adopt(service, updated);
  const undone = await execute(service, "transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: (await service.getProject(OWNER))!.revision });
  assert.equal(undone.status, "accepted");
  const redone = await execute(service, "transaction.redo", { redoHandle: undone.redoHandle!, expectedRevision: (await service.getProject(OWNER))!.revision });
  assert.equal(redone.status, "accepted");
  store.close();
  ({ service, store } = open());
  const current = await service.getDocument("text", OWNER);
  assert.equal(current!.originalText, original);
  assert.equal(current!.validationProfile, "foundation-domain");
  assert.equal(current!.document.revision, "source-r2");
  const bundle = await service.exportBundle(OWNER);
  const target = open("restored");
  await execute(target.service, "project.create", { name: "Project" });
  const restore = await execute(target.service, "document.import", { formatProfile: BUNDLE_FORMAT, importMode: "review", sourceRefs: [{ uri: "memory:bundle", ...bundle }] });
  await adopt(target.service, restore);
  assert.deepEqual((await target.service.exportBundle(OWNER)).files, bundle.files);
  assert.equal((await target.service.getDocument("text", OWNER))!.originalText, original);
});

test("after-complete losses replay the exact import, approval and apply receipts without another commit", async (t) => {
  const { open, envelope, execute } = setup(t);
  const base = open();
  await execute(base.service, "project.create", { name: "Project" });
  const lost = open("source", { fault: (phase) => { if (phase === "after-complete") throw new Error("lost response"); } });
  const retry = open();
  const runLost = async (operation: string, payload: JsonObject): Promise<CommandResult> => {
    const request = envelope(operation, payload, (await base.service.getProject(OWNER))!.revision);
    await assert.rejects(() => lost.service.execute(request, OWNER), (error: unknown) => error instanceof BrowserStoreError);
    const before = (await base.store.read())!;
    const receipt = before.receipts.find((receipt) => receipt.key === request.idempotencyKey)!;
    assert.ok(receipt);
    const replay = await retry.service.execute(request, OWNER);
    assert.deepEqual(replay, receipt.result);
    assert.equal(canonicalJson(await base.store.read()), canonicalJson(before));
    return replay;
  };
  const imported = await runLost("document.import", { formatProfile: "ads-domain", importMode: "review", sourceRefs: [{ uri: "memory:source", content: JSON.stringify(text()) }] });
  const reviewed = await runLost("transaction.review", { candidateId: imported.candidateId!, patchDigest: imported.patchDigest!, decision: "approve" });
  const applied = await runLost("transaction.apply", { candidateId: imported.candidateId!, approvalToken: reviewed.reviewToken!, expectedRevision: (await base.service.getProject(OWNER))!.revision });
  assert.equal(applied.status, "accepted");
  const final = (await base.store.read())!;
  assert.equal(final.receipts.length, 4);
  assert.equal(final.history.length, 2);
  assert.equal(final.candidates.length, 1);
  assert.equal(final.undo.length, 1);
});

test("two independently connected services cannot apply competing approved candidates from the same base", async (t) => {
  const { open, envelope, execute, approve } = setup(t);
  const left = open();
  const right = open();
  await execute(left.service, "project.create", { name: "Project" });
  const prepare = async (service: CommandService, id: string) => execute(service, "document.import", { formatProfile: "ads-envelope", importMode: "review", sourceRefs: [{ uri: `memory:${id}`, content: JSON.stringify({ id, kind: "component", revision: "source-r1", schemaVersion: "1.0.0", name: id }) }] });
  const a = await prepare(left.service, "left");
  const b = await prepare(right.service, "right");
  const aa = await approve(left.service, a);
  const bb = await approve(right.service, b);
  const revision = (await left.service.getProject(OWNER))!.revision;
  const apply = (service: CommandService, candidate: CommandResult, review: CommandResult) => service.execute(envelope("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: review.reviewToken!, expectedRevision: revision }, revision), OWNER);
  const outcomes = await Promise.all([apply(left.service, a, aa), apply(right.service, b, bb)]);
  assert.deepEqual(outcomes.map((outcome) => outcome.status).sort(), ["accepted", "conflict"]);
  assert.equal(Object.keys((await right.service.getProject(OWNER))!.documents).length, 1);
  assert.equal((await left.service.getHistory(OWNER)).length, 2);
});
