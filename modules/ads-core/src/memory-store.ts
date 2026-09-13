import type { KernelState, StoreUpdate, TransactionalStore } from "./contracts.ts";

/** Serialize callbacks and isolate caller mutations; this adapter is not durable. */
export class MemoryStore implements TransactionalStore {
  #state: KernelState | null;
  #tail: Promise<void> = Promise.resolve();
  constructor(initialState: KernelState | null = null) { this.#state = structuredClone(initialState); }
  /** Read after preceding transactions without exposing internal references. */
  async read(): Promise<KernelState | null> {
    await this.#tail;
    return structuredClone(this.#state);
  }
  /** Failed callbacks leave state unchanged and release the serialization queue. */
  async transact<T>(update: (state: KernelState | null) => StoreUpdate<T>): Promise<T> {
    const previous = this.#tail;
    let release!: () => void;
    this.#tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const result = update(structuredClone(this.#state));
      if (result.changed) this.#state = structuredClone(result.state);
      return structuredClone(result.value);
    } finally { release(); }
  }
}
