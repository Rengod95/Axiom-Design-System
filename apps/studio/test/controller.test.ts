import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { CommandService, MemoryStore, canonicalJson } from "../../../modules/ads-core/src/index.ts";
import type { KernelServices, KernelState, StoreUpdate, TransactionalStore } from "../../../modules/ads-core/src/index.ts";
import { StudioController, STUDIO_PRINCIPAL } from "../src/controller.ts";

const services: KernelServices = { createId: randomUUID, digest: text => createHash("sha256").update(text).digest("hex") };
const color = (red: number) => ({ literal: { colorSpace: "srgb", components: [red, 0.2, 0.4], alpha: 1 } });
async function setup(store: TransactionalStore = new MemoryStore()) {
  const service = new CommandService(store, services), controller = new StudioController(service, services);
  await controller.connect(); await controller.createProject("My system");
  assert.equal(controller.getSnapshot().error, null, JSON.stringify(controller.getSnapshot().diagnostics));
  assert.equal(controller.getSnapshot().projection?.valid, true);
  return { store, service, controller };
}
const tokenId = (controller: StudioController) => controller.getSnapshot().projection!.foundation.tokens.find(token => token.type === "color" && token.aliasChain.length === 0)!.id;
async function apply(controller: StudioController) { await controller.review(); assert.ok(controller.getSnapshot().candidate, JSON.stringify(controller.getSnapshot().diagnostics)); await controller.approve(); assert.equal(controller.getSnapshot().error, null, JSON.stringify(controller.getSnapshot().diagnostics)); }

test("token preview, reviewed save, controller reconnect and one Undo retain original bytes", async () => {
  const { controller, service } = await setup();
  const before = (await service.getProject(STUDIO_PRINCIPAL))!;
  controller.edit({ kind: "token-value", id: tokenId(controller), value: color(0.8) });
  assert.equal(controller.dirty, true);
  assert.equal((await service.getProject(STUDIO_PRINCIPAL))!.revision, before.revision);
  const preview = canonicalJson(controller.getSnapshot().projection!.foundation.tokens);
  await controller.refresh();
  assert.equal(canonicalJson(controller.getSnapshot().projection!.foundation.tokens), preview);
  await controller.review();
  assert.ok(controller.getSnapshot().candidate);
  assert.equal((await service.getProject(STUDIO_PRINCIPAL))!.revision, before.revision);
  await controller.approve();
  const after = (await service.getProject(STUDIO_PRINCIPAL))!;
  assert.notEqual(after.revision, before.revision);
  for (const [id, entry] of Object.entries(after.documents)) assert.equal(entry.originalText, before.documents[id]!.originalText);
  const reopened = new StudioController(service, services);
  await reopened.connect();
  assert.ok(reopened.getSnapshot().authoring.undoHandle);
  await reopened.undo();
  assert.equal(canonicalJson((await service.getProject(STUDIO_PRINCIPAL))!.documents), canonicalJson(before.documents));
  await reopened.redo();
  assert.equal(canonicalJson((await service.getProject(STUDIO_PRINCIPAL))!.documents), canonicalJson(after.documents));
});

test("invalid input and unpreviewed source cannot stage a prior valid preview or Undo it", async () => {
  const { controller, service } = await setup();
  controller.edit({ kind: "token-value", id: tokenId(controller), value: color(0.6) });
  controller.inputError();
  const before = canonicalJson(await service.getProject(STUDIO_PRINCIPAL));
  await controller.review(); await controller.undo(); await controller.refresh();
  assert.equal(controller.getSnapshot().error, "STUDIO_INPUT_INVALID");
  assert.equal(controller.getSnapshot().candidate, null);
  assert.equal(canonicalJson(await service.getProject(STUDIO_PRINCIPAL)), before);
  controller.setBuffer("foundation.system", "{invalid json");
  await controller.review();
  assert.equal(controller.getSnapshot().candidate, null);
  controller.previewBuffer("foundation.system");
  assert.equal(controller.getSnapshot().buffers["foundation.system"], "{invalid json");
  assert.ok(controller.getSnapshot().error);
  await controller.captureBuffer("foundation.system");
  assert.equal((await service.listDrafts(STUDIO_PRINCIPAL)).at(-1)?.originalText, "{invalid json");
  assert.equal(canonicalJson(await service.getProject(STUDIO_PRINCIPAL)), before);
});

test("source edits preserve their original capture and invalidate conflicting visual editing", async () => {
  const { controller, service } = await setup();
  const before = (await service.getProject(STUDIO_PRINCIPAL))!;
  const component = controller.getSnapshot().projection!.components.find(item => item.archetype === "card")!;
  controller.setBuffer(component.id, "{unfinished");
  controller.edit({ kind: "sample-content", id: component.id, field: "body", value: "A visual edit" });
  assert.equal(controller.getSnapshot().error, "STUDIO_INPUT_INVALID");
  assert.equal(controller.getSnapshot().buffers[component.id], "{unfinished");
  const document = structuredClone(before.documents[component.id]!.document);
  document.metadata = { note: "Source-only opaque metadata" };
  controller.setBuffer(component.id, JSON.stringify(document));
  controller.previewBuffer(component.id);
  assert.equal(controller.getSnapshot().error, null);
  await apply(controller);
  assert.equal((await service.getProject(STUDIO_PRINCIPAL))!.documents[component.id]!.originalText, before.documents[component.id]!.originalText);
  assert.deepEqual((await service.getProject(STUDIO_PRINCIPAL))!.documents[component.id]!.document.metadata, document.metadata);
});

test("concurrent revision conflict preserves draft intents for an explicit fresh comparison", async () => {
  const { controller: first, service } = await setup();
  const second = new StudioController(service, services); await second.connect();
  const card = second.getSnapshot().projection!.components.find(item => item.archetype === "card")!;
  second.edit({ kind: "sample-content", id: card.id, field: "body", value: "Kept through conflict" });
  first.edit({ kind: "token-value", id: tokenId(first), value: color(0.3) }); await apply(first);
  await second.review();
  assert.equal(second.getSnapshot().error, "REVISION_CONFLICT");
  assert.equal(second.getSnapshot().projection!.components.find(item => item.id === card.id)!.sampleContent.body, "Kept through conflict");
  await second.rebase();
  assert.equal(second.getSnapshot().error, null);
  await apply(second);
  assert.equal(second.getSnapshot().projection!.components.find(item => item.id === card.id)!.sampleContent.body, "Kept through conflict");
});

class LostReplyStore implements TransactionalStore {
  readonly memory = new MemoryStore();
  loseNext = false;
  loseOperation: string | null = null;
  read() { return this.memory.read(); }
  async transact<T>(update: (state: KernelState | null) => StoreUpdate<T>): Promise<T> {
    let lose = false;
    const result = await this.memory.transact(state => {
      const previousHistory = state?.history.length ?? 0;
      const outcome = update(state);
      if (this.loseOperation && outcome.changed && (outcome.state?.history.length ?? 0) > previousHistory && outcome.state?.history.at(-1)?.operation === this.loseOperation) { lose = true; this.loseOperation = null; }
      return outcome;
    });
    if (this.loseNext || lose) { this.loseNext = false; throw new Error("The committed response was lost."); }
    return result;
  }
}
test("a lost staging response retries its exact idempotent envelope with one candidate", async () => {
  const store = new LostReplyStore();
  const { controller } = await setup(store);
  controller.edit({ kind: "token-value", id: tokenId(controller), value: color(0.5) });
  store.loseNext = true; await controller.review();
  assert.equal(controller.getSnapshot().retryable, true);
  assert.equal(controller.dirty, true);
  const candidates = (await store.read())!.candidates.length;
  const pendingPlan = canonicalJson(controller.getSnapshot().plan);
  controller.edit({ kind: "token-value", id: tokenId(controller), value: color(0.1) });
  controller.setBuffer("foundation.system", "A conflicting buffer");
  await controller.discard();
  assert.equal(canonicalJson(controller.getSnapshot().plan), pendingPlan);
  assert.equal(controller.getSnapshot().buffers["foundation.system"], undefined);
  assert.equal(controller.getSnapshot().retryable, true);
  await controller.retry();
  assert.equal(controller.getSnapshot().error, null);
  assert.equal(controller.getSnapshot().retryable, false);
  assert.equal((await store.read())!.candidates.length, candidates);
  assert.ok(controller.getSnapshot().candidate);
  await controller.approve();
  assert.equal(controller.getSnapshot().error, null);
});

test("a saved candidate resumes after reconnect without exposing its approval token", async () => {
  const { controller, service } = await setup();
  controller.edit({ kind: "token-value", id: tokenId(controller), value: color(0.7) });
  await controller.review();
  const reopened = new StudioController(service, services); await reopened.connect();
  const candidate = reopened.getSnapshot().authoring.pendingCandidates[0]!;
  assert.equal(candidate.id, controller.getSnapshot().candidate!.id);
  assert.equal(Object.hasOwn(candidate, "approval"), false);
  reopened.resume(candidate); await reopened.approve();
  assert.equal(reopened.getSnapshot().error, null);
  assert.equal(reopened.getSnapshot().candidate, null);
});

test("a lost apply response retains review state and replays one adopted change with one Undo", async () => {
  const store = new LostReplyStore(); const { controller, service } = await setup(store);
  const before = (await service.getProject(STUDIO_PRINCIPAL))!;
  controller.edit({ kind: "token-value", id: tokenId(controller), value: color(0.9) });
  await controller.review(); store.loseOperation = "transaction.apply"; await controller.approve();
  assert.equal(controller.getSnapshot().retryable, true);
  assert.ok(controller.getSnapshot().candidate);
  assert.notEqual((await service.getProject(STUDIO_PRINCIPAL))!.revision, before.revision);
  const count = (await store.read())!.history.length;
  await controller.retry();
  assert.equal(controller.getSnapshot().error, null);
  assert.equal(controller.getSnapshot().candidate, null);
  assert.equal((await store.read())!.history.length, count);
  await controller.undo();
  assert.equal(canonicalJson((await service.getProject(STUDIO_PRINCIPAL))!.documents), canonicalJson(before.documents));
});
