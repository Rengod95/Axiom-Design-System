import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { CommandService, MemoryStore, PROTOCOL_VERSION } from "../src/index.ts";
import type { CommandEnvelope, CommandResult, JsonObject, JsonValue, Principal } from "../src/index.ts";

const OWNER: Principal = { id: "owner", scopes: ["project.read", "project.write", "review.apply"] };
const OTHER: Principal = { id: "other", scopes: OWNER.scopes };
const PROJECT_ID = "project-test";

function setup() {
  let identity = 0;
  let commands = 0;
  const store = new MemoryStore();
  const services = { createId: () => `generated-${++identity}`, digest: (text: string) => createHash("sha256").update(text).digest("hex") };
  const service = new CommandService(store, services);
  const envelope = (operation: string, payload: JsonObject, baseRevision: string | null, principal = OWNER): CommandEnvelope => {
    const key = `command-${++commands}`;
    return { protocolVersion: PROTOCOL_VERSION, commandId: key, actorId: principal.id, projectId: PROJECT_ID, baseRevision, operation, payload, idempotencyKey: key, origin: "GUI", transactionId: key, requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
  };
  const current = async (): Promise<string> => (await service.getProject(OWNER))!.revision;
  const create = async (): Promise<CommandResult> => service.execute(envelope("project.create", { name: "Review" }, null), OWNER);
  const importDocs = async (sources: string[], principal = OWNER): Promise<CommandResult> => service.execute(envelope("document.import", { sourceRefs: sources.map((content, index) => ({ uri: `memory:source-${index}`, content })), formatProfile: "ads-envelope", importMode: "review" }, await current(), principal), principal);
  const review = async (candidate: CommandResult, principal = OWNER): Promise<CommandResult> => service.execute(envelope("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" }, await current(), principal), principal);
  const apply = async (candidate: CommandResult, approval: CommandResult, principal = OWNER): Promise<CommandResult> => service.execute(envelope("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approval.reviewToken!, expectedRevision: await current() }, await current(), principal), principal);
  const commitDocs = async (sources: string[]): Promise<CommandResult> => {
    const candidate = await importDocs(sources); assert.equal(candidate.status, "reviewRequired");
    const approval = await review(candidate); assert.equal(approval.status, "accepted");
    const applied = await apply(candidate, approval); assert.equal(applied.status, "accepted");
    return applied;
  };
  return { store, service, services, envelope, current, create, importDocs, review, apply, commitDocs };
}

function document(id: string, fields: JsonObject = {}): string {
  return JSON.stringify({ id, kind: "component", schemaVersion: "1.0.0", revision: "source-r1", name: id, ...fields });
}

test("project create uses null base and authorized exact replay precedes create and stale conflicts", async () => {
  const h = setup();
  const command = h.envelope("project.create", { name: "Review" }, null);
  const created = await h.service.execute(command, OWNER);
  assert.equal(created.status, "accepted");
  await h.commitDocs([document("card")]);
  assert.deepEqual(await h.service.execute(command, OWNER), created);
  assert.equal((await h.service.getHistory(OWNER)).length, 2);
  const changed = { ...command, payload: { name: "Overwrite" } };
  assert.equal((await h.service.execute(changed, OWNER)).diagnostics[0]?.code, "IDEMPOTENCY_CONFLICT");
  assert.equal((await h.service.execute(h.envelope("project.create", { name: "Second" }, null), OWNER)).status, "conflict");
  const fresh = setup();
  assert.equal((await fresh.service.execute(fresh.envelope("project.create", { name: "bad" }, "non-null"), OWNER)).status, "conflict");
  assert.equal(await fresh.store.read(), null);
});

test("actor, actual scope, requested scope and revoked receipt access fail without mutation", async () => {
  const h = setup(); await h.create();
  const command = h.envelope("document.import", { sourceRefs: [{ uri: "memory:a", content: document("a") }], formatProfile: "ads-envelope", importMode: "review" }, await h.current());
  const before = await h.store.read();
  assert.equal((await h.service.execute(command, OTHER)).diagnostics[0]?.code, "ACTOR_MISMATCH");
  assert.equal((await h.service.execute(command, { id: OWNER.id, scopes: ["project.read"] })).diagnostics[0]?.code, "SCOPE_REQUIRED");
  assert.equal((await h.service.execute({ ...command, requestedScopes: [] }, OWNER)).diagnostics[0]?.code, "SCOPE_REQUIRED");
  assert.deepEqual(await h.store.read(), before);
  assert.equal((await h.service.execute(command, OWNER)).status, "reviewRequired");
  assert.equal((await h.service.execute(command, { id: OWNER.id, scopes: ["project.write"] })).status, "rejected");
  await assert.rejects(h.service.getProject({ id: OWNER.id, scopes: [] }), { code: "SCOPE_REQUIRED" });
});

test("invalid import batch leaves no partial document, candidate or receipt", async () => {
  const h = setup(); await h.create();
  const before = await h.store.read();
  for (const invalid of ['{"id":"broken"}', '{"x":1,"x":2}', document("first")]) {
    const response = await h.importDocs([document("first"), invalid]);
    assert.equal(response.status, "rejected");
    assert.deepEqual(await h.store.read(), before);
  }
});

test("valid source depth remains importable when internal candidate wrappers add nesting", async () => {
  const h = setup(); await h.create();
  let metadata: JsonValue = null;
  for (let depth = 0; depth < 62; depth += 1) metadata = [metadata];
  assert.equal((await h.importDocs([document("deep", { metadata })])).status, "reviewRequired");
});

test("candidate persists without revision then requires its private digest and opaque approval", async () => {
  const h = setup(); await h.create();
  const revision = await h.current();
  const candidate = await h.importDocs([document("card")]);
  assert.equal(await h.current(), revision);
  assert.equal(await h.service.getDocument("card", OWNER), null);
  assert.equal((await h.store.read())?.candidates.length, 1);
  assert.equal((await h.review(candidate, OTHER)).diagnostics[0]?.code, "CANDIDATE_MISSING");
  const badDigest = await h.service.execute(h.envelope("transaction.review", { candidateId: candidate.candidateId!, patchDigest: "wrong", decision: "approve" }, revision), OWNER);
  assert.equal(badDigest.diagnostics[0]?.code, "DIGEST_MISMATCH");
  const badApply = await h.service.execute(h.envelope("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: "forged", expectedRevision: revision }, revision), OWNER);
  assert.equal(badApply.diagnostics[0]?.code, "APPROVAL_INVALID");
  const approval = await h.review(candidate);
  assert.notEqual(approval.reviewToken, candidate.patchDigest);
  const applied = await h.apply(candidate, approval);
  assert.equal(applied.status, "accepted");
  assert.notEqual(await h.current(), revision);
  assert.equal((await h.service.getDocument("card", OWNER))?.validation, "envelope-only");
  assert.equal(applied.diagnostics[0]?.code, "DOMAIN_UNVERIFIED");
});

test("stale approved candidate cannot apply after another atomic document commit", async () => {
  const h = setup(); await h.create();
  const first = await h.importDocs([document("first")]);
  const firstApproval = await h.review(first);
  await h.commitDocs([document("second")]);
  const result = await h.apply(first, firstApproval);
  assert.equal(result.status, "conflict");
  assert.equal(result.diagnostics[0]?.code, "REVISION_CONFLICT");
  assert.equal(await h.service.getDocument("first", OWNER), null);
  assert.notEqual(await h.service.getDocument("second", OWNER), null);
});

test("review scope revocation prevents new application of an approved candidate", async () => {
  const h = setup(); await h.create();
  const candidate = await h.importDocs([document("card")]);
  const approval = await h.review(candidate);
  const principal = { id: OWNER.id, scopes: ["project.read", "project.write"] };
  assert.equal((await h.apply(candidate, approval, principal)).diagnostics[0]?.code, "SCOPE_REQUIRED");
  assert.equal(await h.service.getDocument("card", OWNER), null);
});

test("recognized document refs protect deletion while opaque metadata remains uninterpreted", async () => {
  const h = setup(); await h.create();
  await h.commitDocs([document("consumer", { componentRef: { id: "target", expectedKind: "component", revision: "source-r1" } }), document("target")]);
  const blocked = await h.service.execute(h.envelope("entity.delete", { refs: [{ id: "target", expectedKind: "component" }] }, await h.current()), OWNER);
  assert.equal(blocked.diagnostics[0]?.code, "REFERENCE_MISSING");
  const batch = await h.service.execute(h.envelope("entity.delete", { refs: [{ id: "consumer", expectedKind: "component" }, { id: "target", expectedKind: "component" }] }, await h.current()), OWNER);
  assert.equal((await h.apply(batch, await h.review(batch))).status, "accepted");
  await h.commitDocs([document("opaque", { metadata: { externalRef: { id: "not-local", expectedKind: "component" } }, extensions: { vendor: { id: "also-not-local", expectedKind: "component" } } })]);
  assert.notEqual(await h.service.getDocument("opaque", OWNER), null);
});

test("missing refs, wrong kinds and wrong pinned source revisions reject before candidate persistence", async () => {
  const h = setup(); await h.create();
  await h.commitDocs([document("target")]);
  for (const ref of [{ id: "missing", expectedKind: "component" }, { id: "target", expectedKind: "foundation" }, { id: "target", expectedKind: "trait" }, { id: "target", expectedKind: "component", revision: "wrong" }]) {
    assert.equal((await h.importDocs([document("consumer", { ref })])).status, "rejected");
    assert.equal(await h.service.getDocument("consumer", OWNER), null);
  }
});

test("live project scope refs cannot silently accept unsupported revision pins", async () => {
  const h = setup(); await h.create();
  const pinned = await h.importDocs([document("scoped", { scope: { id: PROJECT_ID, expectedKind: "project", revision: "bogus" } })]);
  assert.equal(pinned.diagnostics[0]?.code, "REFERENCE_REVISION");
  const versioned = await h.importDocs([document("scoped", { scope: { id: PROJECT_ID, expectedKind: "project", version: "1.0.0" } })]);
  assert.equal(versioned.diagnostics[0]?.code, "REFERENCE_REVISION");
  assert.equal((await h.importDocs([document("scoped", { scope: { id: PROJECT_ID, expectedKind: "project" } })])).status, "reviewRequired");
});

test("undo and redo survive service restart and never overwrite intervening history", async () => {
  const h = setup(); await h.create();
  const source = document("card", { extensions: { vendor: { untouched: true } } });
  const applied = await h.commitDocs([source]);
  const restarted = new CommandService(new MemoryStore(await h.store.read()), h.services);
  const undo = await restarted.execute(h.envelope("transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: applied.revision! }, applied.revision!), OWNER);
  assert.equal(undo.status, "accepted");
  assert.equal(await restarted.getDocument("card", OWNER), null);
  const redo = await restarted.execute(h.envelope("transaction.redo", { redoHandle: undo.redoHandle!, expectedRevision: undo.revision! }, undo.revision!), OWNER);
  assert.equal(redo.status, "accepted");
  assert.equal((await restarted.getDocument("card", OWNER))?.originalText, source);
  await h.commitDocs([document("intervening")]);
  const oldUndo = await h.service.execute(h.envelope("transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: await h.current() }, await h.current()), OWNER);
  assert.equal(oldUndo.status, "conflict");
  assert.notEqual(await h.service.getDocument("intervening", OWNER), null);
});

test("concurrent same-base candidates serialize and only one apply can commit", async () => {
  const h = setup(); await h.create();
  const [one, two] = await Promise.all([h.importDocs([document("one")]), h.importDocs([document("two")])]);
  const [approvedOne, approvedTwo] = await Promise.all([h.review(one), h.review(two)]);
  const revision = await h.current();
  const commands = [[one, approvedOne], [two, approvedTwo]].map(([candidate, approval]) => h.envelope("transaction.apply", { candidateId: candidate!.candidateId!, approvalToken: approval!.reviewToken!, expectedRevision: revision }, revision));
  const outcomes = await Promise.all(commands.map((command) => h.service.execute(command, OWNER)));
  assert.deepEqual(outcomes.map((outcome) => outcome.status).sort(), ["accepted", "conflict"]);
  assert.equal(Object.keys((await h.service.getProject(OWNER))!.documents).length, 1);
});

test("source and receipt results are isolated from caller mutation and raw patch is unsupported", async () => {
  const h = setup(); await h.create();
  await h.commitDocs([document("card")]);
  const read = (await h.service.getDocument("card", OWNER))!; read.document.name = "tampered";
  assert.equal((await h.service.getDocument("card", OWNER))?.document.name, "card");
  const raw = await h.service.execute(h.envelope("document.patch", { path: "/validator", value: "skip" }, await h.current()), OWNER);
  assert.equal(raw.diagnostics[0]?.code, "OPERATION_UNSUPPORTED");
  const before = await h.store.read();
  await assert.rejects(h.store.transact((state) => { state!.project!.name = "mutated"; throw new Error("interrupt"); }));
  assert.deepEqual(await h.store.read(), before);
});
