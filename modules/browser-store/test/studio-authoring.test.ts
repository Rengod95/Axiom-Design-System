import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { IndexedDbStore, browserDigest } from "../src/index.ts";
import { canonicalJson, CommandService, createStudioStarter, inspectStudioProject, planStudioEdit, PROTOCOL_VERSION, STUDIO_FORMAT, STUDIO_PROFILE } from "../../ads-core/src/index.ts";
import type { BrowserFaultPhase } from "../src/index.ts";
import type { CommandEnvelope, CommandResult, JsonObject, Principal } from "../../ads-core/src/index.ts";

const OWNER: Principal = { id: "studio.browser.owner", scopes: ["project.read", "project.write", "review.apply"] };
const brief = (result: CommandResult): string => JSON.stringify({ status: result.status, errors: result.diagnostics.filter(item => item.severity === "error").slice(0, 3) });

for (const faultPhase of ["after-write", "after-complete"] as BrowserFaultPhase[]) test(`Studio apply ${faultPhase} interruption preserves reviewed sources and exact replay across reopen`, async t => {
  const factory = new IDBFactory(); const stores: IndexedDbStore[] = [];
  let sequence = 0, armed = false;
  const createId = () => `browser.studio.${++sequence}`;
  const services = { createId, digest: browserDigest };
  const open = (fault = false) => {
    const store = new IndexedDbStore("studio-command-test", { indexedDB: factory, ...(fault ? { fault: (phase: BrowserFaultPhase) => { if (armed && phase === faultPhase) throw new Error("response interrupted"); } } : {}) });
    stores.push(store); return store;
  };
  t.after(() => { for (const store of stores) store.close(); });
  let store = open(true), service = new CommandService(store, services);
  const envelope = async (operation: string, payload: JsonObject): Promise<CommandEnvelope> => {
    const id = createId();
    return { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: OWNER.id, projectId: "project.studio.browser", baseRevision: (await service.getProject(OWNER))?.revision ?? null, operation, payload, idempotencyKey: id, transactionId: id, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
  };
  const execute = async (operation: string, payload: JsonObject) => service.execute(await envelope(operation, payload), OWNER);
  const approve = async (candidate: CommandResult) => {
    assert.equal(candidate.status, "reviewRequired", brief(candidate));
    const result = await execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
    assert.equal(result.status, "accepted", brief(result)); return result;
  };
  await execute("project.create", { name: "Browser Studio" });
  const sources = createStudioStarter("project.studio.browser");
  const candidate = await execute("document.import", { sourceRefs: sources.map(document => ({ uri: `memory:${document.id}`, content: canonicalJson(document) })), formatProfile: STUDIO_FORMAT, importMode: "review" });
  const approved = await approve(candidate);
  const adopted = await execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: (await service.getProject(OWNER))!.revision });
  assert.equal(adopted.status, "accepted", brief(adopted));
  const before = (await service.getProject(OWNER))!;
  const original = before.documents["foundation.system"]!.originalText;
  const plan = planStudioEdit(before, { kind: "theme-value", axisId: "axis.scheme", context: "dark", id: "token.accent", value: { literal: { colorSpace: "srgb", components: [1, 0.5, 0] } } }, createId, { themeSetId: "theme.dark" });
  assert.equal(plan.valid, true);
  const staged = await execute("document.import", { sourceRefs: plan.updates.map(update => ({ uri: "studio:theme", content: canonicalJson(update.document), expectedRevision: update.expectedRevision })), formatProfile: "ads-envelope", importMode: "update" });
  const review = await approve(staged);
  const request = await envelope("transaction.apply", { candidateId: staged.candidateId!, approvalToken: review.reviewToken!, expectedRevision: before.revision });
  const historyBefore = (await service.getHistory(OWNER)).length;
  armed = true;
  await assert.rejects(() => service.execute(request, OWNER), { code: "BROWSER_STORE_IO" });
  armed = false; store.close(); store = open(); service = new CommandService(store, services);
  const persisted = (await store.read())!;
  const originalReceipt = persisted.receipts.find(receipt => receipt.key === request.idempotencyKey)?.result;
  if (faultPhase === "after-write") {
    assert.equal(originalReceipt, undefined);
    assert.equal(persisted.project!.revision, before.revision);
    assert.equal((await service.getAuthoringState(OWNER)).pendingCandidates[0]!.status, "approved");
  } else {
    assert.equal(originalReceipt!.status, "accepted");
    assert.notEqual(persisted.project!.revision, before.revision);
  }
  const replay = await service.execute(request, OWNER);
  assert.equal(replay.status, "accepted", brief(replay));
  if (originalReceipt) assert.deepEqual(replay, originalReceipt);
  assert.equal((await service.getHistory(OWNER)).length, historyBefore + 1);
  const current = (await service.getProject(OWNER))!;
  const projection = inspectStudioProject(current, { themeSetId: "theme.dark" });
  assert.equal(projection.valid, true);
  assert.equal(projection.components.find(component => component.archetype === "button")!.web.parts["component.button.root"]!.base.background, "rgba(255, 128, 0, 1)");
  assert.equal(current.documents["foundation.system"]!.validationProfile, STUDIO_PROFILE);
  assert.equal(current.documents["foundation.system"]!.originalText, original);
  assert.equal((await service.getAuthoringState(OWNER)).undoHandle, replay.undoHandle);
  const undo = await execute("transaction.undo", { undoHandle: replay.undoHandle!, expectedRevision: current.revision });
  assert.equal(undo.status, "accepted", brief(undo));
  store.close(); store = open(); service = new CommandService(store, services);
  assert.equal(canonicalJson((await service.getProject(OWNER))!.documents), canonicalJson(before.documents));
  assert.deepEqual(await service.execute(request, OWNER), replay);
  assert.equal((await service.getHistory(OWNER)).length, historyBefore + 2);
});
