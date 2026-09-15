import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { CommandService, MemoryStore, canonicalJson } from "../../../modules/ads-core/src/index.ts";
import type { KernelServices, KernelState, StoreUpdate, TransactionalStore } from "../../../modules/ads-core/src/index.ts";
import { StudioController, STUDIO_PRINCIPAL } from "../src/controller.ts";

const services: KernelServices = { createId: randomUUID, digest: text => createHash("sha256").update(text).digest("hex") };
const color = { literal: { colorSpace: "srgb", components: [0.2, 0.3, 0.4], alpha: 1 } };
async function setup(store: TransactionalStore = new MemoryStore()) {
  const service = new CommandService(store, services), controller = new StudioController(service, services);
  await controller.connect(); await controller.createProject("Compound editing");
  assert.equal(controller.getSnapshot().error, null, JSON.stringify(controller.getSnapshot().diagnostics));
  return { service, controller, store };
}
function valid(controller: StudioController) { assert.equal(controller.getSnapshot().error, null, JSON.stringify(controller.getSnapshot().diagnostics)); }
async function apply(controller: StudioController) {
  await controller.review(); assert.ok(controller.getSnapshot().candidate, JSON.stringify(controller.getSnapshot().diagnostics));
  await controller.approve(); valid(controller);
}
const current = (service: CommandService) => service.getProject(STUDIO_PRINCIPAL).then(project => project!);

test("Foundation, create, duplicate, selected-object edit and delete share one reviewed transaction and restart Undo", async () => {
  const { service, controller } = await setup(), before = await current(service);
  const [domainId] = controller.foundation({ kind: "classification-create", category: "domain", name: "Feedback", allowedTypes: ["color"] });
  assert.ok(domainId);
  const [tokenId] = controller.foundation({ kind: "token-create", name: "feedback.notice", type: "color", value: color, domain: domainId });
  assert.ok(tokenId);
  controller.createComponent("catalog.checkbox", "Consent"); valid(controller);
  const createdId = controller.getSnapshot().projection!.components.find(item => item.name === "Consent")!.id;
  controller.component([{ componentId: createdId, edit: { kind: "accessibility", field: "label", value: "Accept terms" } }]);
  controller.duplicateComponent("component.button", "Secondary action");
  controller.edit({ kind: "sample-content", id: "component.card", field: "body", value: "Retained alongside the new catalog component" });
  controller.deleteComponent("component.toast"); valid(controller);
  const plan = controller.getSnapshot().plan!;
  assert.ok(plan.changes); assert.equal(plan.changes.deletes.length, 3);
  assert.equal(plan.changes.upserts.filter(item => item.expectedRevision === undefined).length, 6);
  assert.deepEqual((await current(service)).documents, before.documents);
  await controller.review(); valid(controller);
  assert.ok(controller.getSnapshot().candidate);
  assert.deepEqual((await current(service)).documents, before.documents);
  await controller.approve(); valid(controller);
  const after = await current(service);
  assert.equal(Object.keys(after.documents).length, 13);
  assert.equal(after.documents["component.toast"], undefined);
  assert.ok(controller.getSnapshot().projection!.foundation.tokens.some(token => token.id === tokenId));
  assert.equal(controller.getSnapshot().projection!.components.find(item => item.id === createdId)!.catalog!.accessibility.label, "Accept terms");
  assert.equal(controller.getSnapshot().projection!.components.find(item => item.id === "component.card")!.sampleContent.body, "Retained alongside the new catalog component");
  for (const [id, entry] of Object.entries(after.documents)) if (before.documents[id]) assert.equal(entry.originalText, before.documents[id]!.originalText);
  for (const [id, entry] of Object.entries(before.documents)) if (!plan.updates.some(update => update.document.id === id) && !plan.changes.deletes.some(ref => ref.id === id)) assert.deepEqual(after.documents[id], entry);
  const reopened = new StudioController(service, services); await reopened.connect();
  await reopened.undo(); valid(reopened); assert.deepEqual((await current(service)).documents, before.documents);
  await reopened.redo(); valid(reopened); assert.deepEqual((await current(service)).documents, after.documents);
});

test("stale compound rebase keeps created identities, later edits, deletions and concurrent unrelated documents", async () => {
  const { service, controller: first } = await setup(), second = new StudioController(service, services);
  await second.connect();
  const [tokenId] = second.foundation({ kind: "token-create", name: "status.saved", type: "color", value: color }); assert.ok(tokenId);
  second.createComponent("catalog.checkbox", "Original consent"); valid(second);
  const createdId = second.getSnapshot().projection!.components.find(item => item.name === "Original consent")!.id;
  second.component([{ componentId: createdId, edit: { kind: "name", name: "Renamed consent" } }]);
  second.deleteComponent("component.card"); valid(second);
  first.edit({ kind: "sample-content", id: "component.toast", field: "body", value: "Other window's adopted content" }); await apply(first);
  const adopted = await current(service);
  await second.review(); assert.equal(second.getSnapshot().error, "REVISION_CONFLICT");
  await second.rebase(); valid(second);
  assert.equal(second.getSnapshot().plan!.baseRevision, adopted.revision);
  assert.equal(second.getSnapshot().projection!.components.find(item => item.id === createdId)!.name, "Renamed consent");
  assert.ok(second.getSnapshot().projection!.foundation.tokens.some(token => token.id === tokenId));
  assert.deepEqual(second.getSnapshot().plan!.project.documents["component.toast"], adopted.documents["component.toast"]);
  await second.undo(); valid(second); assert.equal(second.getSnapshot().busy, false);
  assert.ok(second.getSnapshot().plan!.project.documents["component.card"]);
  await second.redo(); valid(second); assert.equal(second.getSnapshot().busy, false);
  assert.equal(second.getSnapshot().plan!.project.documents["component.card"], undefined);
  await apply(second);
  assert.deepEqual((await current(service)).documents["component.toast"], adopted.documents["component.toast"]);
  await second.undo(); valid(second); assert.deepEqual((await current(service)).documents, adopted.documents);
});

test("a failed intent during rebase preserves the complete prior draft instead of approving the later successful subset", async () => {
  const { service, controller: first } = await setup(), second = new StudioController(service, services);
  await second.connect();
  second.edit({ kind: "sample-content", id: "component.card", field: "body", value: "Must not disappear silently" });
  second.foundation({ kind: "token-create", name: "later.intent", type: "color", value: color }); valid(second);
  const planned = canonicalJson(second.getSnapshot().plan), preview = canonicalJson(second.getSnapshot().projection);
  first.deleteComponent("component.card"); await apply(first);
  const adopted = await current(service);
  await second.review(); assert.equal(second.getSnapshot().error, "REVISION_CONFLICT");
  await second.rebase();
  assert.equal(second.getSnapshot().error, "REVISION_CONFLICT");
  assert.equal(canonicalJson(second.getSnapshot().plan), planned);
  assert.equal(canonicalJson(second.getSnapshot().projection), preview);
  assert.ok(second.getSnapshot().diagnostics.some(item => item.severity === "error"));
  await second.review(); assert.equal(second.getSnapshot().candidate, null);
  assert.deepEqual((await current(service)).documents, adopted.documents);
});

test("rebase reconstructs theme edits before restoring a selection that exists only in the final draft", async () => {
  const { service, controller: first } = await setup(), second = new StudioController(service, services);
  await second.connect(); second.setSelection({ contexts: { "axis.scheme": "light" } });
  second.foundation({ kind: "token-create", name: "before.rename", type: "color", value: color });
  second.foundation({ kind: "theme-context-rename", axisId: "axis.scheme", context: "light", name: "day" }); valid(second);
  assert.equal(second.getSnapshot().selection.contexts?.["axis.scheme"], "day");
  first.edit({ kind: "sample-content", id: "component.card", field: "body", value: "Concurrent content" }); await apply(first);
  await second.review(); assert.equal(second.getSnapshot().error, "REVISION_CONFLICT");
  await second.rebase(); valid(second);
  assert.equal(second.getSnapshot().projection!.valid, true);
  assert.equal(second.getSnapshot().selection.contexts?.["axis.scheme"], "day");
  await apply(second);
  assert.equal(second.getSnapshot().projection!.components.find(item => item.id === "component.card")!.sampleContent.body, "Concurrent content");
});

test("a new edit after local Undo starts a fresh group instead of merging across the Undo boundary", async () => {
  const { controller, service } = await setup(), before = await current(service);
  controller.edit({ kind: "sample-content", id: "component.card", field: "body", value: "First value" });
  controller.edit({ kind: "sample-content", id: "component.toast", field: "body", value: "Second group" }); valid(controller);
  await controller.undo(); valid(controller);
  controller.edit({ kind: "sample-content", id: "component.card", field: "body", value: "Value after Undo" }); valid(controller);
  await controller.undo(); valid(controller);
  assert.equal(controller.getSnapshot().projection!.components.find(item => item.id === "component.card")!.sampleContent.body, "First value");
  assert.equal(controller.getSnapshot().project!.revision, before.revision);
});

test("Undoing a source preview restores its unpreviewed text and blocks further draft Undo until it is resolved", async () => {
  const { controller, service } = await setup(), before = await current(service);
  controller.edit({ kind: "sample-content", id: "component.card", field: "body", value: "First value" });
  const text = JSON.stringify({ ...before.documents["component.toast"]!.document, metadata: { rawNote: "Keep this source buffer" } }, null, 3);
  controller.setBuffer("component.toast", text); controller.previewBuffer("component.toast"); valid(controller);
  await controller.undo(); valid(controller);
  assert.equal(controller.getSnapshot().buffers["component.toast"], text);
  assert.deepEqual(controller.getSnapshot().pendingBuffers, ["component.toast"]);
  assert.equal(controller.canUndo, false);
  await controller.undo();
  assert.equal(controller.getSnapshot().buffers["component.toast"], text);
  assert.equal(controller.getSnapshot().projection!.components.find(item => item.id === "component.card")!.sampleContent.body, "First value");
});

test("unpreviewed source blocks affected deletion, Foundation creation and draft Undo without dropping input", async () => {
  const { controller, service } = await setup();
  controller.edit({ kind: "sample-content", id: "component.card", field: "body", value: "A valid earlier preview" });
  const planned = canonicalJson(controller.getSnapshot().plan);
  controller.setBuffer("component.card", "{unfinished component");
  controller.deleteComponent("component.card");
  assert.equal(controller.getSnapshot().error, "STUDIO_INPUT_INVALID");
  assert.equal(canonicalJson(controller.getSnapshot().plan), planned);
  assert.equal(controller.canUndo, false); await controller.undo();
  assert.equal(controller.getSnapshot().buffers["component.card"], "{unfinished component");
  assert.equal(canonicalJson(controller.getSnapshot().plan), planned);
  controller.setBuffer("foundation.system", "{unfinished foundation");
  assert.deepEqual(controller.foundation({ kind: "token-create", name: "Not actually accepted", type: "color", value: color }), []);
  assert.equal(controller.getSnapshot().buffers["foundation.system"], "{unfinished foundation");
  await controller.review(); assert.equal(controller.getSnapshot().candidate, null);
  assert.equal(controller.getSnapshot().project!.revision, (await current(service)).revision);
});

test("create then delete has no adopted change, while local Undo and Redo remain available", async () => {
  const { controller, service } = await setup(), before = await current(service);
  controller.createComponent("catalog.checkbox", "Temporary"); valid(controller);
  const id = controller.getSnapshot().projection!.components.find(item => item.name === "Temporary")!.id;
  controller.deleteComponent(id); valid(controller);
  assert.equal(controller.dirty, false); assert.equal(controller.getSnapshot().plan, null);
  await controller.review(); assert.equal(controller.getSnapshot().candidate, null);
  await controller.undo(); valid(controller); assert.ok(controller.getSnapshot().plan!.project.documents[id]);
  await controller.redo(); valid(controller); assert.equal(controller.dirty, false);
  assert.deepEqual((await current(service)).documents, before.documents);
});

/** Delay one captured read, without delaying transactions or subsequent independent reads. */
class DelayedReadStore implements TransactionalStore {
  readonly memory = new MemoryStore();
  reads = 0;
  #delay: { captured: () => void; wait: Promise<void> } | null = null;
  holdNextRead() {
    let captured!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { captured = resolve; }), wait = new Promise<void>(resolve => { release = resolve; });
    this.#delay = { captured, wait }; return { started, release };
  }
  async read() {
    this.reads++;
    const delay = this.#delay; this.#delay = null;
    const state = await this.memory.read();
    if (delay) { delay.captured(); await delay.wait; }
    return state;
  }
  transact<T>(update: (state: KernelState | null) => StoreUpdate<T>) { return this.memory.transact(update); }
}

test("a focus refresh cannot overwrite an edit, error or adopted revision that arrived while its read was pending", async () => {
  const store = new DelayedReadStore(), { controller, service } = await setup(store);
  const held = store.holdNextRead(), refresh = controller.refresh(); await held.started;
  controller.edit({ kind: "sample-content", id: "component.card", field: "body", value: "Written after refresh began" });
  controller.inputError(); const draft = controller.getSnapshot();
  held.release(); await refresh;
  assert.equal(controller.getSnapshot(), draft);
  controller.edit({ kind: "sample-content", id: "component.card", field: "body", value: "Adopted while an older read is pending" });
  await apply(controller);
  const next = store.holdNextRead(), olderRead = controller.refresh(); await next.started;
  controller.edit({ kind: "sample-content", id: "component.toast", field: "body", value: "The second adopted value" }); await apply(controller);
  const adopted = await current(service); next.release(); await olderRead;
  assert.equal(controller.getSnapshot().project!.revision, adopted.revision);
  assert.equal(controller.getSnapshot().authoring.revision, adopted.revision);
});

test("refresh uses one coherent snapshot and a later refresh invalidates local Redo from an older base", async () => {
  const store = new DelayedReadStore(), { controller: first, service } = await setup(store), second = new StudioController(service, services);
  await second.connect();
  second.createComponent("catalog.checkbox", "Old base draft"); await second.undo();
  assert.equal(second.dirty, false); assert.equal(second.canRedo, true);
  const previous = second.getSnapshot(), held = store.holdNextRead(), refresh = second.refresh(); await held.started;
  first.edit({ kind: "sample-content", id: "component.card", field: "body", value: "New base content" }); await apply(first);
  held.release(); await refresh;
  // A concurrent commit can follow the read's snapshot. It must never mix new history with old documents.
  assert.equal(second.getSnapshot().project!.revision, previous.project!.revision);
  assert.equal(second.getSnapshot().authoring.revision, previous.project!.revision);
  const reads = store.reads;
  await second.refresh();
  assert.equal(store.reads - reads, 1);
  assert.equal(second.getSnapshot().project!.revision, (await current(service)).revision);
  assert.equal(second.getSnapshot().authoring.revision, second.getSnapshot().project!.revision);
  assert.equal(second.canRedo, false);
  await second.redo(); assert.equal(second.getSnapshot().plan, null);
  assert.equal(second.getSnapshot().projection!.components.find(item => item.id === "component.card")!.sampleContent.body, "New base content");
});
