import { BUNDLE_FORMAT, canonicalJson, CommandService, DOMAIN_FORMAT, DOMAIN_PROFILE, PROTOCOL_VERSION } from "/dist/modules/ads-core/src/index.js";
import { IndexedDbStore, createBrowserServices } from "/dist/modules/browser-store/src/index.js";

const PRINCIPAL = { id: "browser.author", scopes: ["project.read", "project.write", "review.apply"] };
const PROJECT = "browser.project";
const NAME = "Browser regression project";
const ORIGINAL = "{ 잘못된 원문\r\n";
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const same = (left, right, message) => assert(canonicalJson(left) === canonicalJson(right), message);
const services = createBrowserServices();
const document = (revision, value) => ({ id: "text.one", kind: "text", schemaVersion: "1.0.0", revision, name: "Text", blocks: [{ id: "block.one", kind: "paragraph", inlines: [{ id: "run.one", text: value, marks: ["strong"] }] }], localeHints: {}, extensions: { vendor: { opaque: "보존", id: "inert-id" } } });
let database, store, service, pendingApply, lostEnvelope;

async function current(instance = service) { return (await instance.getProject(PRINCIPAL))?.revision ?? null; }
async function envelope(operation, payload, instance = service) {
  const id = crypto.randomUUID();
  return { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: PRINCIPAL.id, projectId: PROJECT, baseRevision: await current(instance), operation, payload, idempotencyKey: id, transactionId: id, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
}
async function execute(operation, payload, instance = service) { return instance.execute(await envelope(operation, payload, instance), PRINCIPAL); }
function status(result, expected, label) { assert(result.status === expected, `${label}: expected ${expected}, received ${result.status}; ${result.diagnostics.map(d => d.code).join(",")}`); return result; }
async function approved(candidate, instance = service) {
  status(candidate, "reviewRequired", "candidate");
  const approval = status(await execute("transaction.review", { candidateId: candidate.candidateId, patchDigest: candidate.patchDigest, decision: "approve" }, instance), "accepted", "review");
  return envelope("transaction.apply", { candidateId: candidate.candidateId, approvalToken: approval.reviewToken, expectedRevision: await current(instance) }, instance);
}
async function adopt(candidate, instance = service) { const command = await approved(candidate, instance); return { command, result: status(await instance.execute(command, PRINCIPAL), "accepted", "apply") }; }
async function importDocument(value, extra = {}, mode = "review", instance = service) {
  return execute("document.import", { sourceRefs: [{ uri: "memory:browser-source", content: JSON.stringify(value), ...extra }], formatProfile: DOMAIN_FORMAT, importMode: mode }, instance);
}
async function stateDigest() { return services.digest(canonicalJson(await store.read())); }
async function rejected(action, label) {
  try { await action(); } catch (error) { return { code: error.code ?? error.name, message: error.message }; }
  throw new Error(`${label} unexpectedly succeeded`);
}

async function setup(name) {
  database = name;
  store = new IndexedDbStore(name);
  service = new CommandService(store, services);
  assert(isSecureContext && typeof crypto.randomUUID === "function", "Secure browser services unavailable");
  assert(services.digest("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256 known answer failed");
  for (const source of ["", "abc", "한글😀\r\n", "x".repeat(1000)]) {
    const native = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)))].map(byte => byte.toString(16).padStart(2, "0")).join("");
    assert(services.digest(source) === native, "Native SHA-256 comparison failed");
  }
  return { secureContext: true, digestComparisons: 4, indexedDB: typeof indexedDB.open === "function" };
}

async function workflow() {
  status(await execute("project.create", { name: NAME }), "accepted", "create");
  const captured = status(await execute("document.import", { sourceRefs: [{ uri: "memory:invalid-original", content: ORIGINAL }], formatProfile: DOMAIN_FORMAT, importMode: "draft" }), "accepted", "draft capture");
  assert((await service.getDraft(captured.draftRefs[0], PRINCIPAL)).validation === "invalid", "Invalid draft must remain invalid");
  await adopt(await importDocument(document("source-r1", "첫 내용"), { draftId: captured.draftRefs[0] }));
  const first = await service.exportDocument("text.one", PRINCIPAL);
  assert(first.original.text === ORIGINAL && first.validationProfile === DOMAIN_PROFILE, "First original or inherited profile lost");
  const updated = await adopt(await importDocument(document("source-r2", "수정한 내용"), { expectedRevision: "source-r1" }, "update"));
  const beforeReplay = await stateDigest();
  same(await service.execute(updated.command, PRINCIPAL), updated.result, "Exact receipt replay differs");
  assert(await stateDigest() === beforeReplay, "Receipt replay changed persisted state");
  const undo = status(await execute("transaction.undo", { undoHandle: updated.result.undoHandle, expectedRevision: await current() }), "accepted", "undo");
  assert((await service.getDocument("text.one", PRINCIPAL)).document.revision === "source-r1", "Undo did not restore prior source");
  status(await execute("transaction.redo", { redoHandle: undo.redoHandle, expectedRevision: await current() }), "accepted", "redo");
  const bundle = await service.exportBundle(PRINCIPAL);
  const targetStore = new IndexedDbStore(`${database}-bundle`);
  const target = new CommandService(targetStore, services);
  try {
    status(await execute("project.create", { name: NAME }, target), "accepted", "restore create");
    await adopt(await execute("document.import", { sourceRefs: [{ uri: "memory:browser-bundle", ...bundle }], formatProfile: BUNDLE_FORMAT, importMode: "review" }, target), target);
    const source = await service.exportDocument("text.one", PRINCIPAL), restored = await target.exportDocument("text.one", PRINCIPAL);
    same(restored.original, source.original, "Bundle changed original bytes/hash");
    same(restored.normalized, source.normalized, "Bundle changed normalized bytes/hash");
    assert(restored.validationProfile === DOMAIN_PROFILE, "Bundle lost domain policy");
  } finally { targetStore.close(); }
  return { create: true, invalidDraftRepair: true, sourceProfilePreserved: true, receiptReplay: true, undoRedo: true, bundleRestore: true };
}

async function prepareRace(label) {
  const candidate = await importDocument(document(`race-${label}`, `Writer ${label}`), { expectedRevision: "source-r2" }, "update");
  pendingApply = await approved(candidate);
  return { baseRevision: pendingApply.baseRevision, candidatePrepared: true };
}
async function applyRace() { const result = await service.execute(pendingApply, PRINCIPAL); return { status: result.status, revision: result.revision }; }
async function inspectRace() { const entry = await service.getDocument("text.one", PRINCIPAL); return { revision: await current(), documentDigest: services.digest(canonicalJson(entry.document)), sourceRevision: entry.document.revision }; }

async function faultCases() {
  const cases = {};
  for (const stage of ["before-write", "after-write"]) {
    const before = await stateDigest(); let reached = false;
    const failing = new IndexedDbStore(database, { fault(actual) { if (actual === stage) { reached = true; throw new Error(`Injected ${stage}`); } } });
    try {
      const failedService = new CommandService(failing, services);
      const command = await envelope("document.import", { sourceRefs: [{ uri: "memory:aborted", content: stage }], formatProfile: "ads-envelope", importMode: "draft" });
      const failure = await rejected(() => failedService.execute(command, PRINCIPAL), stage);
      assert(reached, `Fault stage ${stage} was not reached`);
      assert(await stateDigest() === before, `Aborted ${stage} transaction changed state`);
      cases[stage] = { reached, atomicAbort: true, code: failure.code };
    } finally { failing.close(); }
  }
  const beforeCallback = await stateDigest();
  let reducerReached = false;
  await rejected(() => store.transact(state => { reducerReached = true; state.project.name = "must not leak"; throw new Error("Reducer failed"); }), "failed reducer");
  assert(reducerReached, "Failed reducer case did not execute its callback");
  assert(await stateDigest() === beforeCallback, "Failed reducer changed committed state");
  cases.failedReducer = true;
  // Queuing a write is distinct from a successful request. Abort the real native
  // transaction after its commit add succeeds, before transaction completion.
  const originalAdd = IDBObjectStore.prototype.add;
  let addSucceeded = false;
  const beforeSuccessfulRequest = await stateDigest();
  IDBObjectStore.prototype.add = function (...args) {
    const request = originalAdd.apply(this, args);
    if (this.name === "commits") request.addEventListener("success", () => { addSucceeded = true; this.transaction.abort(); }, { once: true });
    return request;
  };
  try {
    const failure = await rejected(() => store.transact(state => ({ state, changed: true, value: "must not escape" })), "abort after request success");
    assert(addSucceeded, "Native commit add request never succeeded");
    assert(failure.code === "BROWSER_STORE_ABORTED", `Native abort error was lost: ${failure.code}`);
    assert(await stateDigest() === beforeSuccessfulRequest, "Successful request leaked despite transaction abort");
    cases.abortAfterRequestSuccess = { nativeRequestSucceeded: true, transactionAborted: true, stateUnchanged: true, code: failure.code };
  } finally { IDBObjectStore.prototype.add = originalAdd; }
  const quotaStore = new IndexedDbStore(database, { fault(stage) { if (stage === "after-write") throw new DOMException("Injected quota", "QuotaExceededError"); } });
  try {
    const before = await stateDigest();
    const failure = await rejected(() => quotaStore.transact(state => ({ state, changed: true, value: null })), "injected quota");
    assert(failure.code === "BROWSER_STORE_QUOTA", `Quota error lost its explicit code: ${failure.code}`);
    assert(await stateDigest() === before, "Injected quota failure changed state");
    cases.quota = { injected: true, physicalQuotaExhaustionTested: false, code: failure.code };
  } finally { quotaStore.close(); }
  let lost = false;
  const lossStore = new IndexedDbStore(database, { fault(stage) { if (stage === "after-complete" && !lost) { lost = true; throw new Error("Injected lost response"); } } });
  try {
    lostEnvelope = await envelope("document.import", { sourceRefs: [{ uri: "memory:lost-response", content: "[malformed lost response" }], formatProfile: DOMAIN_FORMAT, importMode: "draft" });
    await rejected(() => new CommandService(lossStore, services).execute(lostEnvelope, PRINCIPAL), "response loss");
    assert(lost, "Post-completion fault was not reached");
    const beforeReplay = await stateDigest();
    const replay = status(await service.execute(lostEnvelope, PRINCIPAL), "accepted", "lost response replay");
    assert((await service.getDraft(replay.draftRefs[0], PRINCIPAL)).originalText === "[malformed lost response", "Committed draft missing after response loss");
    assert(await stateDigest() === beforeReplay, "Lost-response replay duplicated a write");
    cases.lostResponse = { committed: true, receiptReplayed: true };
  } finally { lossStore.close(); }
  return cases;
}

async function reconnect() {
  const before = await stateDigest(); store.close();
  const failure = await rejected(() => store.read(), "closed connection");
  assert(failure.code === "BROWSER_STORE_CLOSED", "Closed connection did not report closed");
  store = new IndexedDbStore(database); service = new CommandService(store, services);
  assert(await stateDigest() === before, "Reconnect changed state");
  return { stateUnchanged: true, closedCode: failure.code };
}
async function checkpoint() {
  return { stateDigest: await stateDigest(), revision: await current(), bundleDigest: (await service.exportBundle(PRINCIPAL)).manifest.bundleDigest, replayEnvelope: lostEnvelope };
}
async function verifyRestart(expected) {
  assert(await stateDigest() === expected.stateDigest, "Process restart changed committed state");
  assert(await current() === expected.revision, "Process restart changed project revision");
  assert((await service.exportBundle(PRINCIPAL)).manifest.bundleDigest === expected.bundleDigest, "Process restart changed source bundle");
  status(await service.execute(expected.replayEnvelope, PRINCIPAL), "accepted", "restart receipt replay");
  assert(await stateDigest() === expected.stateDigest, "Restart receipt replay appended a commit");
  const before = (await service.getDocument("text.one", PRINCIPAL)).document;
  const state = await store.read(); const latest = state.undo.at(-1);
  assert(latest, "Restart lost Undo stack");
  const undo = status(await execute("transaction.undo", { undoHandle: latest.handle, expectedRevision: await current() }), "accepted", "restart undo");
  assert((await service.getDocument("text.one", PRINCIPAL)).document.revision === "source-r2", "Restart Undo failed");
  status(await execute("transaction.redo", { redoHandle: undo.redoHandle, expectedRevision: await current() }), "accepted", "restart redo");
  same((await service.getDocument("text.one", PRINCIPAL)).document, before, "Restart redo changed current source");
  return { sameProfileProcessRestart: true, committedStatePreserved: true, receiptReplay: true, undoRedo: true, bundleDigestPreserved: true };
}

globalThis.browserHarness = { ready: true, setup, workflow, prepareRace, applyRace, inspectRace, faultCases, reconnect, checkpoint, verifyRestart };
