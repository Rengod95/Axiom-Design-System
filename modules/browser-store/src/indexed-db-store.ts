import type { KernelState, StoreUpdate, TransactionalStore } from "../../ads-core/src/index.ts";
import type { BrowserFaultPhase, IndexedDbStoreOptions, RecoveredBrowserState } from "./contracts.ts";
import { BROWSER_DATABASE_VERSION, BROWSER_MAX_DATABASE_NAME_LENGTH, BROWSER_MAX_OPEN_TIMEOUT_MS, BROWSER_OPEN_TIMEOUT_MS, BROWSER_STORE_ERROR, BROWSER_STORES } from "./constants.ts";
import { createBrowserCommit, readBrowserJournal } from "./journal.ts";
import { BrowserStoreError, browserStorageError } from "./storage-error.ts";

function synchronous(value: unknown, label: string): void {
  if (value !== null && (typeof value === "object" || typeof value === "function") && "then" in value && typeof value.then === "function") {
    // A rejected async callback must not escape later as an unhandled rejection.
    void Promise.resolve(value).catch(() => undefined);
    throw new BrowserStoreError(BROWSER_STORE_ERROR.state, `${label} must be synchronous.`);
  }
}

/** Native IndexedDB transactions serialize the entire reducer across all connections. */
export class IndexedDbStore implements TransactionalStore {
  readonly databaseName: string;
  private readonly factory: IDBFactory;
  private readonly timeout: number;
  private readonly fault: IndexedDbStoreOptions["fault"];
  private opening: Promise<IDBDatabase> | null = null;
  private database: IDBDatabase | null = null;
  private closed = false;

  /** Open only an explicitly named origin database; injected factories/faults are trusted test capabilities. */
  constructor(databaseName: string, options: IndexedDbStoreOptions = {}) {
    if (typeof databaseName !== "string" || !databaseName.trim() || databaseName.length > BROWSER_MAX_DATABASE_NAME_LENGTH) throw new BrowserStoreError(BROWSER_STORE_ERROR.state, "An explicit bounded database name is required.");
    const timeout = options.openTimeoutMs ?? BROWSER_OPEN_TIMEOUT_MS;
    if (!Number.isFinite(timeout) || timeout < 1 || timeout > BROWSER_MAX_OPEN_TIMEOUT_MS) throw new BrowserStoreError(BROWSER_STORE_ERROR.state, "Database open timeout is outside the supported range.");
    let factory: IDBFactory;
    try {
      factory = options.indexedDB ?? globalThis.indexedDB;
      if (!factory || typeof factory.open !== "function") throw new BrowserStoreError(BROWSER_STORE_ERROR.unavailable, "IndexedDB is unavailable in this environment.");
    } catch (cause) { throw browserStorageError(cause); }
    if (options.fault !== undefined && typeof options.fault !== "function") throw new BrowserStoreError(BROWSER_STORE_ERROR.state, "Fault injection requires a synchronous function.");
    this.databaseName = databaseName;
    this.factory = factory;
    this.timeout = timeout;
    this.fault = options.fault;
  }

  /** Validate every retained commit and return its latest detached state after readonly completion. */
  read(): Promise<KernelState | null> { return this.run("readonly", (recovered) => ({ value: recovered.state, changed: false })); }

  /** Read, synchronously reduce and publish journal/head in one native strict-durability transaction. */
  transact<T>(update: (state: KernelState | null) => StoreUpdate<T>): Promise<T> {
    return this.run("readwrite", (recovered, transaction) => {
      if (typeof update !== "function") throw new BrowserStoreError(BROWSER_STORE_ERROR.state, "A synchronous reducer function is required.");
      const result = update(recovered.state);
      synchronous(result, "Store reducer");
      if (!result || typeof result.changed !== "boolean" || !Object.hasOwn(result, "value")) throw new BrowserStoreError(BROWSER_STORE_ERROR.state, "A synchronous store update result is required.");
      if (result.changed) {
        const commit = createBrowserCommit(result.state, recovered.head);
        this.inject("before-write");
        transaction.objectStore(BROWSER_STORES.commits).add(commit, commit.sequence);
        transaction.objectStore(BROWSER_STORES.meta).put({ storageFormatVersion: commit.storageFormatVersion, sequence: commit.sequence, commitDigest: commit.commitDigest }, BROWSER_STORES.head);
        this.inject("after-write");
      }
      return { value: result.value, changed: result.changed };
    });
  }

  /** Pending native transactions finish normally; new calls are rejected immediately. */
  close(): void { this.closed = true; this.database?.close(); this.database = null; }

  private inject(phase: BrowserFaultPhase): void { synchronous(this.fault?.(phase), "Fault hook"); }

  private async run<T>(mode: IDBTransactionMode, work: (recovered: RecoveredBrowserState, transaction: IDBTransaction) => { value: T; changed: boolean }): Promise<T> {
    const database = await this.connection();
    if (this.closed) throw new BrowserStoreError(BROWSER_STORE_ERROR.closed, "Browser store is closed.");
    return new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction;
      try { transaction = database.transaction([BROWSER_STORES.commits, BROWSER_STORES.meta], mode, { durability: "strict" }); }
      catch (cause) { reject(browserStorageError(cause)); return; }
      let outcome: { value: T; changed: boolean } | undefined;
      let failure: unknown;
      const abort = (cause: unknown): void => {
        failure ??= cause;
        try { transaction.abort(); } catch { reject(browserStorageError(failure)); }
      };
      transaction.onerror = (event) => { failure ??= (event.target as IDBRequest | null)?.error ?? transaction.error; };
      transaction.onabort = () => reject(browserStorageError(failure ?? transaction.error ?? new DOMException("Browser transaction aborted.", "AbortError")));
      transaction.oncomplete = () => {
        if (!outcome) { reject(new BrowserStoreError(BROWSER_STORE_ERROR.state, "Browser transaction completed without a reducer result.")); return; }
        try { if (outcome.changed) this.inject("after-complete"); resolve(outcome.value); }
        catch (cause) { reject(browserStorageError(cause)); }
      };
      try { readBrowserJournal(transaction, (recovered) => { try { outcome = work(recovered, transaction); } catch (cause) { abort(cause); } }, abort); }
      catch (cause) { abort(cause); }
    });
  }

  private connection(): Promise<IDBDatabase> {
    if (this.closed) return Promise.reject(new BrowserStoreError(BROWSER_STORE_ERROR.closed, "Browser store is closed."));
    if (this.opening) return this.opening;
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try { request = this.factory.open(this.databaseName, BROWSER_DATABASE_VERSION); }
      catch (cause) { reject(browserStorageError(cause)); return; }
      let settled = false;
      let blocked = false;
      const finishError = (cause: unknown): void => { if (!settled) { settled = true; clearTimeout(timer); reject(browserStorageError(cause)); } };
      const timer = setTimeout(() => {
        finishError(new BrowserStoreError(blocked ? BROWSER_STORE_ERROR.blocked : BROWSER_STORE_ERROR.unavailable, "Opening browser storage timed out."));
        try { request.transaction?.abort(); } catch { /* A pending open has no abortable upgrade. */ }
      }, this.timeout);
      request.onblocked = () => { blocked = true; };
      request.onerror = () => finishError(request.error);
      request.onupgradeneeded = (event) => {
        try {
          if (this.closed || settled) throw new BrowserStoreError(BROWSER_STORE_ERROR.closed, "Browser store closed while opening.");
          if (event.oldVersion !== 0) throw new BrowserStoreError(BROWSER_STORE_ERROR.version, "Existing browser database requires an unsupported schema upgrade.");
          request.result.createObjectStore(BROWSER_STORES.commits);
          request.result.createObjectStore(BROWSER_STORES.meta);
        } catch (cause) { finishError(cause); request.transaction?.abort(); }
      };
      request.onsuccess = () => {
        const database = request.result;
        if (settled || this.closed) { database.close(); finishError(new BrowserStoreError(BROWSER_STORE_ERROR.closed, "Browser store closed while opening.")); return; }
        try {
          this.checkSchema(database);
          database.onversionchange = () => { this.closed = true; database.close(); this.database = null; };
          database.onclose = () => { this.closed = true; this.database = null; };
          this.database = database;
          settled = true; clearTimeout(timer); resolve(database);
        } catch (cause) { database.close(); finishError(cause); }
      };
    });
    this.opening = opening;
    void opening.catch(() => { if (this.opening === opening) this.opening = null; });
    return opening;
  }

  private checkSchema(database: IDBDatabase): void {
    const names = Array.from(database.objectStoreNames).sort();
    if (database.version !== BROWSER_DATABASE_VERSION || names.length !== 2 || names[0] !== BROWSER_STORES.commits || names[1] !== BROWSER_STORES.meta) throw new BrowserStoreError(BROWSER_STORE_ERROR.version, "Browser database object-store schema is unsupported.");
    const transaction = database.transaction(names, "readonly");
    for (const name of names) {
      const store = transaction.objectStore(name);
      if (store.keyPath !== null || store.autoIncrement || store.indexNames.length !== 0) { transaction.abort(); throw new BrowserStoreError(BROWSER_STORE_ERROR.version, "Browser database keys or indexes are unsupported."); }
    }
  }
}
