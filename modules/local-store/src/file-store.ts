import type { KernelState, StoreUpdate, TransactionalStore } from "../../ads-core/src/index.ts";
import type { FileStoreOptions } from "./contracts.ts";
import { LOCK_TIMEOUT_MS, MAX_LOCK_TIMEOUT_MS, STORE_ERROR } from "./constants.ts";
import { prepareCommit, publishCommit, recoverStore } from "./commit-chain.ts";
import { ensureDirectory, storageDirectory } from "./path-boundary.ts";
import { encodeState } from "./state-record.ts";
import { FileStoreError, storageError } from "./storage-error.ts";
import { recoverWriterLock, withWriterLock } from "./writer-lock.ts";

/** Local process-crash persistence; this is neither a power-loss guarantee nor a hostile-OS sandbox. */
export class FileStore implements TransactionalStore {
  readonly directory: string;
  private readonly options: FileStoreOptions;
  private queue: Promise<void> = Promise.resolve();

  /** A dedicated directory is required; existing symlink ancestors and traversal are rejected. */
  constructor(directory: string, options: FileStoreOptions = {}) {
    this.directory = storageDirectory(directory);
    const timeout = options.lockTimeoutMs ?? LOCK_TIMEOUT_MS;
    if (!Number.isFinite(timeout) || timeout < 0 || timeout > MAX_LOCK_TIMEOUT_MS) throw new FileStoreError(STORE_ERROR.state, "The lock timeout is outside the supported range.");
    this.options = { ...options, lockTimeoutMs: timeout };
  }

  /** Read under the writer lease so a partially published multi-file state cannot be observed. */
  read(): Promise<KernelState | null> {
    return this.serialized(() => this.locked(async () => (await recoverStore(this.directory)).state));
  }

  /** The full synchronous callback is serialized; its state and receipt persist before success resolves. */
  transact<T>(update: (state: KernelState | null) => StoreUpdate<T>): Promise<T> {
    return this.serialized(() => this.locked(async () => {
      const recovered = await recoverStore(this.directory);
      const result = update(recovered.state);
      if (!result || typeof result.changed !== "boolean") throw new FileStoreError(STORE_ERROR.state, "A synchronous store update result is required.");
      if (result.changed) {
        const bytes = encodeState(result.state);
        const marker = await prepareCommit(this.directory, recovered, bytes);
        await this.options.fault?.("after-prepare");
        await publishCommit(this.directory, marker);
        await this.options.fault?.("after-marker");
      }
      return result.value;
    }));
  }

  /** Remove only a same-host writer lock whose PID is proven absent; age alone is never sufficient. */
  recoverLock(): Promise<void> {
    return this.serialized(async () => { await ensureDirectory(this.directory); await recoverWriterLock(this.directory); });
  }

  private async locked<T>(work: () => Promise<T>): Promise<T> {
    await ensureDirectory(this.directory);
    return withWriterLock(this.directory, this.options.lockTimeoutMs!, work);
  }

  /** Rejections must not poison subsequent calls on the same instance. */
  private serialized<T>(work: () => Promise<T>): Promise<T> {
    const task = this.queue.then(work).catch((error: unknown) => { throw storageError(error); });
    this.queue = task.then(() => undefined, () => undefined);
    return task;
  }
}
