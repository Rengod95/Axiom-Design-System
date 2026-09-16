import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, CommandService, createStudioStarter, decodeProjectBundle, exportProjectBundle, MemoryStore, planFoundationEdit, planStudioEdit, PROTOCOL_VERSION, STUDIO_FORMAT } from "../src/index.ts";
import type { CommandResult, FoundationEditPlan, JsonObject, Principal } from "../src/index.ts";

const OWNER: Principal = { id: "foundation.owner", scopes: ["project.read", "project.write", "review.apply"] };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const explain = (value: { diagnostics: unknown }) => JSON.stringify(value.diagnostics);
async function fixture() {
  let counter = 0; const createId = () => `adoption.${++counter}`;
  const store = new MemoryStore(), service = new CommandService(store, { createId, digest });
  const project = async () => (await service.getProject(OWNER))!;
  const execute = async (operation: string, payload: JsonObject) => {
    const id = createId();
    return service.execute({ protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: OWNER.id, projectId: "project.adoption", baseRevision: (await project())?.revision ?? null, operation, payload, idempotencyKey: id, transactionId: id, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] }, OWNER);
  };
  const approve = async (candidate: CommandResult) => {
    assert.equal(candidate.status, "reviewRequired", explain(candidate));
    const result = await execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
    assert.equal(result.status, "accepted", explain(result)); return result;
  };
  const apply = async (candidate: CommandResult) => {
    const approval = await approve(candidate);
    const result = await execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approval.reviewToken!, expectedRevision: (await project()).revision });
    assert.equal(result.status, "accepted", explain(result)); return result;
  };
  const stage = async (plan: FoundationEditPlan) => execute("document.import", { importMode: "update", formatProfile: STUDIO_FORMAT, sourceRefs: plan.updates.map(update => ({ uri: `memory:${update.document.id}`, content: canonicalJson(update.document), expectedRevision: update.expectedRevision })) });
  await execute("project.create", { name: "Adoption" });
  await apply(await execute("document.import", { importMode: "review", formatProfile: STUDIO_FORMAT, sourceRefs: createStudioStarter("project.adoption").map(document => ({ uri: `memory:${document.id}`, content: canonicalJson(document) })) }));
  const before = await project(), migration = planFoundationEdit(before, { kind: "foundation-migrate" }, createId);
  assert.equal(migration.valid, true, explain(migration));
  const applied = await apply(await stage(migration));
  return { service, store, project, execute, approve, apply, stage, createId, before, applied };
}

test("raw source, update and change cannot downgrade an adopted Foundation policy", async () => {
  const h = await fixture(), current = await h.project(), before = canonicalJson(current);
  for (const profile of [undefined, { id: "axiom.foundation", version: "2.0.0" }, { id: "other.profile", version: "1.0.0" }]) {
    const document = structuredClone(current.documents["foundation.system"]!.document);
    if (profile) document.authoringProfile = profile; else delete document.authoringProfile;
    const plan = planStudioEdit(current, { kind: "source", id: document.id, source: canonicalJson(document) }, h.createId);
    assert.equal(plan.valid, false); assert.deepEqual(plan.updates, []); assert.equal(canonicalJson(plan.project), before);
    document.revision = h.createId();
    for (const [importMode, formatProfile] of [["update", "ads-envelope"], ["update", STUDIO_FORMAT], ["change", STUDIO_FORMAT]] as const) {
      const result = await h.execute("document.import", { importMode, formatProfile, sourceRefs: [{ uri: "memory:downgrade", content: canonicalJson(document), expectedRevision: current.documents[document.id]!.document.revision }], ...(importMode === "change" ? { deleteRefs: [] } : {}) });
      assert.equal(result.status, "rejected", explain(result)); assert.ok(result.diagnostics.some(item => item.code === "MIGRATION_UNSUPPORTED"));
    }
  }
  assert.equal(canonicalJson(await h.project()), before);
  assert.equal((await h.service.getAuthoringState(OWNER)).pendingCandidates.length, 0);
});

test("apply rechecks the profile even if a persisted candidate carries a matching approved digest", async () => {
  const h = await fixture(), before = await h.project();
  const plan = planFoundationEdit(before, { kind: "token-update", id: "token.gap", description: "Reviewed spacing" }, h.createId);
  const candidate = await h.stage(plan);
  await h.store.transact(state => {
    const stored = state!.candidates.find(item => item.id === candidate.candidateId)!;
    const entry = stored.documents["foundation.system"]!;
    delete entry.document.authoringProfile; entry.currentText = canonicalJson(entry.document);
    stored.digest = digest(canonicalJson({ projectId: stored.projectId, baseRevision: stored.baseRevision, documents: stored.documents, diff: stored.diff }));
    candidate.patchDigest = stored.digest;
    return { state: state!, changed: true, value: null };
  });
  const approval = await h.approve(candidate);
  const result = await h.execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approval.reviewToken!, expectedRevision: before.revision });
  assert.equal(result.status, "rejected", explain(result)); assert.ok(result.diagnostics.some(item => item.code === "MIGRATION_UNSUPPORTED"));
  assert.equal(canonicalJson(await h.project()), canonicalJson(before));
});

test("migration Undo and Redo restore exact legacy and guided source snapshots", async () => {
  const h = await fixture(), adopted = await h.project();
  const undo = await h.execute("transaction.undo", { undoHandle: h.applied.undoHandle!, expectedRevision: adopted.revision });
  assert.equal(undo.status, "accepted", explain(undo));
  const legacy = await h.project();
  assert.equal(canonicalJson(legacy.documents), canonicalJson(h.before.documents));
  assert.equal(legacy.documents["foundation.system"]!.document.authoringProfile, undefined);
  const redo = await h.execute("transaction.redo", { redoHandle: undo.redoHandle!, expectedRevision: legacy.revision });
  assert.equal(redo.status, "accepted", explain(redo));
  assert.equal(canonicalJson((await h.project()).documents), canonicalJson(adopted.documents));
  for (const snapshot of [h.before, adopted]) {
    const bundle = exportProjectBundle(snapshot, digest);
    const restored = decodeProjectBundle({ uri: "memory:original-bundle", ...bundle }, { ...snapshot, documents: {} }, digest);
    for (const [id, entry] of Object.entries(snapshot.documents)) {
      assert.equal(restored[id]!.originalText, entry.originalText);
      assert.equal(canonicalJson(restored[id]!.document), canonicalJson(entry.document));
    }
  }
});
