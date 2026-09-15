import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, CommandService, MemoryStore, planFoundationEdit, PROTOCOL_VERSION, STUDIO_FORMAT } from "../src/index.ts";
import type { CommandEnvelope, CommandResult, FoundationEditPlan, JsonObject, Principal } from "../src/index.ts";
import { authoringFixture, brief, source } from "./foundation-authoring-fixtures.ts";

const owner: Principal = { id: "authoring.owner", scopes: ["project.read", "project.write", "review.apply"] };
async function setup() {
  const h = authoringFixture(true), store = new MemoryStore();
  const service = new CommandService(store, { createId: h.createId, digest: text => createHash("sha256").update(text).digest("hex") });
  const project = async () => (await service.getProject(owner))!;
  const execute = async (operation: string, payload: JsonObject, base?: string | null): Promise<CommandResult> => {
    const id = h.createId(); const command: CommandEnvelope = { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: owner.id, projectId: h.project.id, baseRevision: base === undefined ? (await service.getProject(owner))?.revision ?? null : base, operation, payload, idempotencyKey: id, transactionId: id, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
    return service.execute(command, owner);
  };
  const approve = async (candidate: CommandResult) => {
    assert.equal(candidate.status, "reviewRequired", brief(candidate));
    const review = await execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
    assert.equal(review.status, "accepted", brief(review));
    const applied = await execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: review.reviewToken!, expectedRevision: (await project()).revision });
    assert.equal(applied.status, "accepted", brief(applied)); return applied;
  };
  const stage = (plan: FoundationEditPlan) => execute("document.import", { sourceRefs: plan.updates.map(update => ({ uri: `authoring:${update.document.id}`, content: canonicalJson(update.document), expectedRevision: update.expectedRevision })), formatProfile: STUDIO_FORMAT, importMode: "update" }, plan.baseRevision);
  await execute("project.create", { name: "Foundation authoring" });
  await approve(await execute("document.import", { sourceRefs: Object.values(h.project.documents).map(entry => ({ uri: entry.sourceUri, content: entry.originalText })), formatProfile: STUDIO_FORMAT, importMode: "review" }));
  return { ...h, store, service, project, execute, approve, stage };
}

test("multi-document token replacement uses explicit review and one Undo/redo while keeping immutable originals", async () => {
  const h = await setup();
  const duplicate = planFoundationEdit(await h.project(), { kind: "token-duplicate", id: "token.accent", name: "brand.replacement" }, h.createId);
  assert.equal(duplicate.valid, true, brief(duplicate)); await h.approve(await h.stage(duplicate));
  const before = await h.project();
  const plan = planFoundationEdit(before, [{ kind: "token-delete", id: "token.accent", replacementId: duplicate.createdIds[0]! }, { kind: "token-update", id: "token.action", description: "Uses the reviewed replacement" }], h.createId);
  assert.equal(plan.valid, true, brief(plan)); assert.ok(plan.updates.length > 1);
  const candidate = await h.stage(plan);
  assert.equal(candidate.status, "reviewRequired", brief(candidate)); assert.equal(canonicalJson(await h.project()), canonicalJson(before));
  const bypass = await h.execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: "not-approved", expectedRevision: before.revision });
  assert.equal(bypass.status, "rejected");
  const applied = await h.approve(candidate), after = await h.project();
  assert.equal(source(after).tokens.some(token => token.id === "token.accent"), false);
  for (const [id, entry] of Object.entries(after.documents)) assert.equal(entry.originalText, before.documents[id]!.originalText);
  const undone = await h.execute("transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: after.revision });
  assert.equal(undone.status, "accepted", brief(undone)); assert.equal(canonicalJson((await h.project()).documents), canonicalJson(before.documents));
  const redone = await h.execute("transaction.redo", { redoHandle: undone.redoHandle!, expectedRevision: (await h.project()).revision });
  assert.equal(redone.status, "accepted", brief(redone)); assert.equal(canonicalJson((await h.project()).documents), canonicalJson(after.documents));
});

test("another adopted revision invalidates a Foundation authoring plan and leaves both source and candidate atomic", async () => {
  const h = await setup(), before = await h.project();
  const stale = planFoundationEdit(before, { kind: "token-update", id: "token.accent", description: "Stale edit" }, h.createId);
  const concurrent = planFoundationEdit(before, { kind: "token-update", id: "token.accent", description: "Adopted edit" }, h.createId);
  await h.approve(await h.stage(concurrent)); const current = await h.project();
  const result = await h.stage(stale); assert.equal(result.status, "conflict", brief(result));
  assert.equal(canonicalJson(await h.project()), canonicalJson(current));
});

test("source import cannot bypass same-scope name uniqueness or reference-protected deletion", async () => {
  const h = await setup(), before = await h.project();
  for (const mutate of [(document: ReturnType<typeof source>) => { document.tokens[0]!.name = document.tokens[1]!.name; }, (document: ReturnType<typeof source>) => { document.tokens = document.tokens.filter(token => token.id !== "token.accent"); }]) {
    const document = structuredClone(source(before)); mutate(document); document.revision = h.createId();
    const result = await h.execute("document.import", { sourceRefs: [{ uri: "memory:direct-source", content: canonicalJson(document), expectedRevision: source(before).revision }], formatProfile: STUDIO_FORMAT, importMode: "update" });
    assert.equal(result.status, "rejected", brief(result)); assert.equal(canonicalJson(await h.project()), canonicalJson(before));
  }
});
