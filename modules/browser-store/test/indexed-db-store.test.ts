import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";
import { IDBFactory, IDBObjectStore, forceCloseDatabase } from "fake-indexeddb";
import { IndexedDbStore, BrowserStoreError, browserDigest } from "../src/index.ts";
import { BROWSER_MAX_COMMITS, BROWSER_STORE_ERROR } from "../src/constants.ts";
import { createBrowserCommit, readBrowserJournal } from "../src/journal.ts";
import type { ValidatedBrowserSnapshots } from "../src/journal.ts";
import type { BrowserCommit, BrowserFaultPhase, IndexedDbStoreOptions, RecoveredBrowserState } from "../src/contracts.ts";
import type { KernelState, StoreUpdate } from "../../ads-core/src/index.ts";
import { canonicalJson } from "../../ads-core/src/index.ts";
import { MAX_CANONICAL_BYTES } from "../../ads-core/src/constants.ts";

function state(name = "Initial"): KernelState {
  return { formatVersion: "0.1.0", project: { id: "project", name, revision: "revision", documents: {} }, candidates: [], receipts: [], history: [], undo: [], redo: [] };
}
function setup(t: TestContext) {
  const factory = new IDBFactory();
  const stores: IndexedDbStore[] = [];
  const store = (options: IndexedDbStoreOptions = {}) => { const value = new IndexedDbStore("test-project", { indexedDB: factory, ...options }); stores.push(value); return value; };
  t.after(() => { for (const store of stores) store.close(); });
  return { factory, store };
}
function open(factory: IDBFactory, version?: number, upgrade?: (database: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open("test-project", version);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => upgrade?.(request.result);
    request.onsuccess = () => resolve(request.result);
  });
}
async function raw(factory: IDBFactory, work: (transaction: IDBTransaction) => void): Promise<void> {
  const database = await open(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["commits", "meta"], "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      work(transaction);
    });
  } finally { database.close(); }
}
async function records(factory: IDBFactory): Promise<BrowserCommit[]> {
  const database = await open(factory);
  try { return await new Promise((resolve, reject) => { const request = database.transaction("commits").objectStore("commits").getAll(); request.onsuccess = () => resolve(request.result as BrowserCommit[]); request.onerror = () => reject(request.error); }); }
  finally { database.close(); }
}
function code(expected: string) { return (error: unknown) => error instanceof BrowserStoreError && error.code === expected; }

test("oversized stored state is rejected by the codec preflight before digest byte allocation", async (t) => {
  const { factory, store } = setup(t), current = store();
  await current.transact(() => ({ state: state(), value: null, changed: true }));
  const commit = (await records(factory))[0]!;
  commit.stateText = "x".repeat(MAX_CANONICAL_BYTES + 1);
  await raw(factory, transaction => transaction.objectStore("commits").put(commit, commit.sequence));
  await assert.rejects(() => current.read(), (error: unknown) => error instanceof BrowserStoreError && error.code === BROWSER_STORE_ERROR.corrupt && error.message.includes("UTF-8 bound"));
});

test("warm and cold readers reject a malformed-surrogate ancestor even when UTF-8 replacement preserves its digest", async (t) => {
  const { factory, store } = setup(t), warm = store();
  await warm.transact(() => ({ state: state("\uFFFD"), value: null, changed: true }));
  await warm.transact(() => ({ state: state("Latest"), value: null, changed: true }));
  assert.equal((await warm.read())!.project!.name, "Latest");
  const ancestor = (await records(factory))[0]!;
  const malformed = ancestor.stateText.replace("\uFFFD", "\uD800");
  assert.notEqual(malformed, ancestor.stateText);
  assert.equal(browserDigest(malformed), ancestor.stateDigest);
  ancestor.stateText = malformed;
  await raw(factory, transaction => transaction.objectStore("commits").put(ancestor, ancestor.sequence));
  await assert.rejects(() => warm.read(), code(BROWSER_STORE_ERROR.corrupt));
  await assert.rejects(() => store().read(), code(BROWSER_STORE_ERROR.corrupt));
});

test("cached historical validation still rejects changed bytes and digest-valid invalid state on the same connection", async (t) => {
  for (const rehash of [false, true]) {
    const { factory, store } = setup(t), current = store();
    await current.transact(() => ({ state: state(), value: null, changed: true }));
    const detached = await current.read(); detached!.project!.name = "Caller mutation";
    assert.equal((await current.read())!.project!.name, "Initial");
    const commit = (await records(factory))[0]!;
    commit.stateText = canonicalJson({ ...state(), formatVersion: "invalid" });
    if (rehash) {
      commit.stateDigest = browserDigest(commit.stateText);
      const { stateText: _stateText, commitDigest: _commitDigest, ...metadata } = commit;
      commit.commitDigest = browserDigest(canonicalJson(metadata));
    }
    await raw(factory, transaction => { transaction.objectStore("commits").put(commit, commit.sequence); transaction.objectStore("meta").put({ storageFormatVersion: "0.1.0", sequence: commit.sequence, commitDigest: commit.commitDigest }, "head"); });
    await assert.rejects(() => current.read(), code(BROWSER_STORE_ERROR.corrupt));
    await assert.rejects(() => current.transact(() => ({ state: state("Overwrite"), value: null, changed: true })), code(BROWSER_STORE_ERROR.corrupt));
  }
});

test("warm reads avoid repeating the canonical history walk while returning complete isolated snapshots", async (t) => {
  const { store } = setup(t), current = store();
  const snapshot = state();
  const document = { id: "design.example", kind: "catalog", schemaVersion: "0.1.0", revision: "1", name: "Example",
    parts: Array.from({ length: 40 }, (_, index) => ({ id: `part.${index}`, properties: { label: `Part ${index}`, padding: 8 } })) };
  const documents = { [document.id]: { document, originalText: JSON.stringify(document), sourceUri: "memory:example", validation: "envelope-only" as const, diagnostics: [] } };
  snapshot.project!.documents = documents;
  for (let index = 0; index < 6; index++) {
    snapshot.candidates.push({ id: `candidate.${index}`, projectId: "project", baseRevision: String(index), actorId: "actor", digest: "0".repeat(64), documents, diff: [], diagnostics: [], status: "applied" });
    snapshot.undo.push({ handle: `undo.${index}`, actorId: "actor", applicableRevision: String(index), before: documents, after: documents });
    snapshot.history.push({ revision: String(index), parentRevision: index ? String(index - 1) : null, actorId: "actor", operation: "edit", transactionId: `transaction.${index}`, affectedRefs: [] });
  }
  await current.transact(() => ({ state: snapshot, value: null, changed: true }));
  const descriptors = Object.getOwnPropertyDescriptors;
  let walks = 0;
  t.mock.method(Object, "getOwnPropertyDescriptors", (value: object) => { walks++; return descriptors(value); });
  const cold = await current.read(), coldWalks = walks;
  walks = 0;
  const warm = await current.read(), warmWalks = walks;
  assert.deepEqual(cold, snapshot);
  assert.deepEqual(warm, snapshot);
  assert.ok(coldWalks > 100, "the initial read validates the complete retained history");
  assert.ok(warmWalks < coldWalks / 10, "authenticated snapshots do not repeat the full descriptor walk");
  warm!.project!.name = "Caller mutation";
  warm!.candidates.length = 0;
  warm!.undo[0]!.before[document.id]!.document.name = "Mutated undo";
  assert.deepEqual(await current.read(), snapshot);
  assert.deepEqual(await store().read(), snapshot, "reopening validates the same full history without a cache");
});

test("forged or transplanted validation identities cannot authorize a parse-only read", async (t) => {
  const { factory, store } = setup(t), current = store();
  await current.transact(() => ({ state: state(), value: null, changed: true }));
  const readWithCache = async (cache: ValidatedBrowserSnapshots): Promise<RecoveredBrowserState> => {
    const database = await open(factory);
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(["commits", "meta"]);
        transaction.onabort = () => reject(transaction.error);
        readBrowserJournal(transaction, resolve, reject, cache);
      });
    } finally { database.close(); }
  };
  const validated: ValidatedBrowserSnapshots = new Map();
  await readWithCache(validated);
  const identity = [...validated.values()][0]!;
  assert.ok(Object.isFrozen(identity), "validated identity metadata cannot be changed after minting");
  const commit = (await records(factory))[0]!;
  commit.stateText = canonicalJson({ ...state(), formatVersion: "invalid" });
  commit.stateDigest = browserDigest(commit.stateText);
  const { stateText: _stateText, commitDigest: _commitDigest, ...metadata } = commit;
  commit.commitDigest = browserDigest(canonicalJson(metadata));
  await raw(factory, transaction => {
    transaction.objectStore("commits").put(commit, commit.sequence);
    transaction.objectStore("meta").put({ storageFormatVersion: "0.1.0", sequence: commit.sequence, commitDigest: commit.commitDigest }, "head");
  });
  for (const cached of [{ projectId: "project", revision: "revision" }, identity]) {
    await assert.rejects(() => readWithCache(new Map([[commit.stateDigest, cached]])), code(BROWSER_STORE_ERROR.corrupt));
  }
});

test("empty/read/reopen/close distinguish absence from committed state and return isolated values", async (t) => {
  const { store } = setup(t);
  const first = store();
  assert.equal(await first.read(), null);
  const source = state();
  assert.equal(await first.transact(() => ({ state: source, value: "saved", changed: true })), "saved");
  source.project!.name = "caller mutation";
  const read = await first.read();
  assert.equal(read!.project!.name, "Initial");
  read!.project!.name = "query mutation";
  assert.equal((await first.read())!.project!.name, "Initial");
  first.close();
  await assert.rejects(() => first.read(), code(BROWSER_STORE_ERROR.closed));
  assert.equal((await store().read())!.project!.name, "Initial");
});

test("same-instance and independent connections serialize complete reducers without lost updates", async (t) => {
  const { store, factory } = setup(t);
  const first = store();
  const second = store();
  await first.transact(() => ({ state: state("0"), value: null, changed: true }));
  const increment = (snapshot: KernelState | null) => {
    const next = Number(snapshot!.project!.name) + 1;
    snapshot!.project!.name = String(next);
    return { state: snapshot!, value: next, changed: true };
  };
  const outcomes = await Promise.all([first.transact(increment), first.transact(increment), second.transact(increment), second.transact(increment)]);
  assert.deepEqual(outcomes.sort(), [1, 2, 3, 4]);
  assert.equal((await first.read())!.project!.name, "4");
  const commits = await records(factory);
  assert.equal(commits.length, 5);
  assert.ok(commits.every((commit) => commit.revision === "revision"));
  assert.deepEqual(commits.map((commit) => commit.sequence), [1, 2, 3, 4, 5]);
});

test("before/after-write faults roll back journal and head; after-complete failure retains the committed state", async (t) => {
  const { store, factory } = setup(t);
  const stable = store();
  await stable.transact(() => ({ state: state(), value: null, changed: true }));
  for (const phase of ["before-write", "after-write"] as BrowserFaultPhase[]) {
    const failing = store({ fault: (actual) => { if (actual === phase) throw new Error("interruption"); } });
    await assert.rejects(() => failing.transact(() => ({ state: state("Uncommitted"), value: null, changed: true })), code(BROWSER_STORE_ERROR.io));
    assert.equal((await stable.read())!.project!.name, "Initial");
    assert.equal((await records(factory)).length, 1);
  }
  const lost = store({ fault: (phase) => { if (phase === "after-complete") throw new Error("reply lost"); } });
  await assert.rejects(() => lost.transact(() => ({ state: state("Committed"), value: null, changed: true })), code(BROWSER_STORE_ERROR.io));
  assert.equal((await stable.read())!.project!.name, "Committed");
  assert.equal((await records(factory)).length, 2);
});

test("quota failure and invalid/async reducers preserve the previous complete snapshot and allow retry", async (t) => {
  const { store } = setup(t);
  const stable = store();
  await stable.transact(() => ({ state: state(), value: null, changed: true }));
  const quota = store({ fault: () => { throw new DOMException("quota fixture", "QuotaExceededError"); } });
  await assert.rejects(() => quota.transact(() => ({ state: state("Not saved"), value: null, changed: true })), code(BROWSER_STORE_ERROR.quota));
  await assert.rejects(() => stable.transact(() => { throw new Error("reducer failed"); }), code(BROWSER_STORE_ERROR.io));
  await assert.rejects(() => stable.transact(() => ({ state: { ...state(), formatVersion: "unknown" }, value: null, changed: true })), code(BROWSER_STORE_ERROR.state));
  const asyncReducer = (async () => ({ state: state(), value: null, changed: true })) as unknown as (state: KernelState | null) => StoreUpdate<null>;
  await assert.rejects(() => stable.transact(asyncReducer), code(BROWSER_STORE_ERROR.state));
  const asynchronousFault = store({ fault: async () => { throw new Error("async hook rejection"); } });
  await assert.rejects(() => asynchronousFault.transact(() => ({ state: state(), value: null, changed: true })), code(BROWSER_STORE_ERROR.state));
  assert.equal((await stable.read())!.project!.name, "Initial");
  await stable.transact(() => ({ state: state("Retry"), value: null, changed: true }));
  assert.equal((await stable.read())!.project!.name, "Retry");
});

test("unchanged callbacks do not append a commit or trigger write fault hooks", async (t) => {
  const { store, factory } = setup(t);
  const empty = store({ fault: () => { throw new Error("unexpected write"); } });
  assert.equal(await empty.transact(() => ({ state: state(), value: "read-only", changed: false })), "read-only");
  assert.equal(await empty.read(), null);
  assert.equal((await records(factory)).length, 0);
});

test("missing and stale heads recover only the latest complete verified chain", async (t) => {
  const { store, factory } = setup(t);
  const current = store();
  await current.transact(() => ({ state: state("First"), value: null, changed: true }));
  await current.transact(() => ({ state: state("Last"), value: null, changed: true }));
  const commits = await records(factory);
  const old = commits[0]!;
  await raw(factory, (transaction) => transaction.objectStore("meta").put({ storageFormatVersion: "0.1.0", sequence: old.sequence, commitDigest: old.commitDigest }, "head"));
  assert.equal((await current.read())!.project!.name, "Last");
  await raw(factory, (transaction) => transaction.objectStore("meta").delete("head"));
  assert.equal((await current.read())!.project!.name, "Last");
  await current.transact(() => ({ state: state("Next"), value: null, changed: true }));
  assert.equal((await records(factory)).at(-1)!.sequence, 3);
});

test("malformed heads, corrupt retained ancestors and disconnected sequences never become an empty project", async (t) => {
  for (const damage of ["head", "digest", "ancestor", "gap", "metadata", "extra-meta", "noncanonical"] as const) {
    const { store, factory } = setup(t);
    const current = store();
    await current.transact(() => ({ state: state("First"), value: null, changed: true }));
    await current.transact(() => ({ state: state("Last"), value: null, changed: true }));
    const commits = await records(factory);
    await raw(factory, (transaction) => {
      const commit = { ...commits[damage === "ancestor" ? 0 : 1]! };
      if (damage === "head") transaction.objectStore("meta").put({ sequence: 99 }, "head");
      else if (damage === "extra-meta") transaction.objectStore("meta").put("unexpected", "other");
      else if (damage === "gap") transaction.objectStore("commits").delete(1);
      else {
        if (damage === "digest") commit.commitDigest = "0".repeat(64);
        if (damage === "ancestor") commit.stateText = "{}";
        if (damage === "metadata") commit.projectId = "other";
        if (damage === "noncanonical") { commit.stateText += " "; commit.stateDigest = browserDigest(commit.stateText); }
        transaction.objectStore("commits").put(commit, commit.sequence);
      }
    });
    await assert.rejects(() => current.read(), code(BROWSER_STORE_ERROR.corrupt), damage);
    await assert.rejects(() => current.transact(() => ({ state: state("Overwrite"), value: null, changed: true })), code(BROWSER_STORE_ERROR.corrupt), damage);
  }
});

test("unsupported versions, wrong object-store schemas and unavailable IndexedDB are explicit failures", async (t) => {
  const { store, factory } = setup(t);
  const foreign = await open(factory, 2, (database) => database.createObjectStore("foreign"));
  foreign.close();
  await assert.rejects(() => store().read(), code(BROWSER_STORE_ERROR.version));
  const wrong = setup(t);
  const malformed = await open(wrong.factory, 1, (database) => { database.createObjectStore("commits", { autoIncrement: true }); database.createObjectStore("meta"); });
  malformed.close();
  await assert.rejects(() => wrong.store().read(), code(BROWSER_STORE_ERROR.version));
  assert.throws(() => new IndexedDbStore(""), code(BROWSER_STORE_ERROR.state));
  assert.throws(() => new IndexedDbStore("name", { indexedDB: {} as IDBFactory }), code(BROWSER_STORE_ERROR.unavailable));
});

test("versionchange closes an existing adapter and close during opening does not leak a connection", async (t) => {
  const { store, factory } = setup(t);
  const current = store();
  await current.read();
  const upgraded = await open(factory, 2);
  upgraded.close();
  await assert.rejects(() => current.read(), code(BROWSER_STORE_ERROR.closed));
  const other = setup(t);
  const closing = other.store();
  const reading = closing.read();
  closing.close();
  await assert.rejects(() => reading, code(BROWSER_STORE_ERROR.closed));
  const reopened = await open(other.factory, 2);
  reopened.close();
});

test("forced connection close rejects future work without clearing persisted state", async (t) => {
  const { store, factory } = setup(t);
  const current = store();
  await current.transact(() => ({ state: state(), value: null, changed: true }));
  // Capture the real connection through the injectable factory without reading adapter internals.
  const original = factory.open.bind(factory);
  let captured: IDBDatabase | undefined;
  factory.open = ((...args: Parameters<IDBFactory["open"]>) => {
    const request = original(...args);
    request.addEventListener("success", () => { captured = request.result; });
    return request;
  }) as IDBFactory["open"];
  const second = store();
  await second.read();
  assert.ok(captured);
  // Upstream 6.2.5 types this instance-taking test helper as the constructor type.
  forceCloseDatabase(captured as unknown as Parameters<typeof forceCloseDatabase>[0]);
  await assert.rejects(() => second.read(), code(BROWSER_STORE_ERROR.closed));
  assert.equal((await current.read())!.project!.name, "Initial");
});

test("full journal capacity rejects the next commit while preserving the retained head", () => {
  const head = { storageFormatVersion: "0.1.0", sequence: BROWSER_MAX_COMMITS, commitDigest: "0".repeat(64) };
  assert.throws(() => createBrowserCommit(state(), head), code(BROWSER_STORE_ERROR.capacity));
});

test("a successful add request followed by native transaction abort never resolves as saved", async (t) => {
  const { store, factory } = setup(t);
  const current = store();
  await current.transact(() => ({ state: state(), value: null, changed: true }));
  const add = IDBObjectStore.prototype.add;
  let requestSucceeded = false;
  t.mock.method(IDBObjectStore.prototype, "add", function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
    const request = add.call(this, value, key);
    if (this.name === "commits") request.addEventListener("success", () => { requestSucceeded = true; this.transaction.abort(); });
    return request;
  });
  await assert.rejects(() => current.transact(() => ({ state: state("Not committed"), value: "never returned", changed: true })), code(BROWSER_STORE_ERROR.aborted));
  assert.equal(requestSucceeded, true);
  assert.equal((await current.read())!.project!.name, "Initial");
  assert.equal((await records(factory)).length, 1);
});

test("blocked opening times out explicitly and closes a connection arriving after rejection", async (t) => {
  const factory = new IDBFactory();
  const database = await open(factory, 1, (value) => { value.createObjectStore("commits"); value.createObjectStore("meta"); });
  const request = { onblocked: null, onerror: null, onupgradeneeded: null, onsuccess: null, transaction: null, result: database } as unknown as IDBOpenDBRequest;
  const pending = new IndexedDbStore("blocked", { indexedDB: { open: () => request } as unknown as IDBFactory, openTimeoutMs: 10 });
  t.after(() => { pending.close(); database.close(); });
  const reading = pending.read();
  request.onblocked?.call(request, {} as IDBVersionChangeEvent);
  await assert.rejects(() => reading, code(BROWSER_STORE_ERROR.blocked));
  request.onsuccess?.call(request, {} as Event);
  assert.throws(() => database.transaction("commits"), { name: "InvalidStateError" });
});

test("descriptor-captured states cannot be changed by Proxy getters or a later caller mutation", async (t) => {
  const { store } = setup(t);
  const current = store();
  const original = state();
  let gets = 0;
  const proxy = new Proxy(original, { get() { gets += 1; throw new Error("Proxy get must not run"); } });
  await current.transact(() => ({ state: proxy, value: null, changed: true }));
  assert.equal(gets, 0);
  original.project!.name = "changed after commit";
  assert.equal((await current.read())!.project!.name, "Initial");
});

test("restricted IndexedDB capability getters report unavailable storage without leaking native exception codes", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  try {
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, get() { throw new DOMException("Restricted origin", "SecurityError"); } });
    assert.throws(() => new IndexedDbStore("restricted"), code(BROWSER_STORE_ERROR.unavailable));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "indexedDB", descriptor);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  }
  const factory = Object.defineProperty({}, "open", { get() { throw new DOMException("Restricted factory", "SecurityError"); } });
  assert.throws(() => new IndexedDbStore("restricted", { indexedDB: factory as IDBFactory }), code(BROWSER_STORE_ERROR.unavailable));
});
