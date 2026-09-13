import type { KernelState } from "../../ads-core/src/index.ts";
import { MAX_JSON_DEPTH, MAX_STATE_BYTES, STORE_ERROR } from "./constants.ts";
import { FileStoreError } from "./storage-error.ts";

/** Plain JSON objects only; this does not interpret ADS domain content. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** Reject lossy serialization (undefined, accessors, cycles, nonfinite values) before persisting. */
function checkJson(value: unknown, ancestors = new Set<object>(), depth = 0): void {
  if (depth > MAX_JSON_DEPTH) throw new FileStoreError(STORE_ERROR.state, "State nesting exceeds this storage profile.");
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return;
  if (typeof value !== "object" || (!Array.isArray(value) && !isRecord(value)) || ancestors.has(value)) throw new FileStoreError(STORE_ERROR.state, "The state must contain finite, acyclic plain JSON data.");
  if (Array.isArray(value) && Object.getPrototypeOf(value) !== Array.prototype) throw new FileStoreError(STORE_ERROR.state, "Arrays must have the plain JSON array prototype.");
  if (Object.getOwnPropertySymbols(value).length) throw new FileStoreError(STORE_ERROR.state, "Symbol keys cannot be persisted.");
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (Array.isArray(value) && key === "length") continue;
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) throw new FileStoreError(STORE_ERROR.state, "Accessors or hidden properties cannot be persisted.");
    checkJson(descriptor.value, ancestors, depth + 1);
  }
  if (Array.isArray(value) && (Object.keys(value).length !== value.length || !Array.from({ length: value.length }, (_, index) => Object.hasOwn(value, index)).every(Boolean))) throw new FileStoreError(STORE_ERROR.state, "Sparse arrays or extra array properties cannot be persisted.");
  ancestors.delete(value);
}

/** Validate the storage envelope, leaving full ADS and command semantics to the core. */
export function validateState(value: unknown): asserts value is KernelState {
  checkJson(value);
  if (!isRecord(value) || typeof value.formatVersion !== "string" || !value.formatVersion) throw new FileStoreError(STORE_ERROR.state, "A state format version is required.");
  for (const key of ["candidates", "receipts", "undo", "redo", "history"]) {
    if (!Array.isArray(value[key]) || !value[key].every(isRecord)) throw new FileStoreError(STORE_ERROR.state, `State ${key} must be an array of records.`);
  }
  const project = value.project;
  if (project !== null && (!isRecord(project) || !["id", "name", "revision"].every(key => typeof project[key] === "string") || !isRecord(project.documents))) throw new FileStoreError(STORE_ERROR.state, "A state project must have identity, revision and a document map.");
}

/** Serialize once; these exact UTF-8 bytes become the immutable digest subject. */
export function encodeState(state: KernelState): Buffer {
  validateState(state);
  const bytes = Buffer.from(JSON.stringify(state), "utf8");
  if (bytes.length > MAX_STATE_BYTES) throw new FileStoreError(STORE_ERROR.state, "State size exceeds this storage profile.");
  return bytes;
}

/** On-disk malformed state is corruption, never an empty store. */
export function decodeState(bytes: Buffer): KernelState {
  try {
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    validateState(value);
    // The writer emits this one representation: duplicate keys, replacement decoding,
    // or a different numeric/string spelling cannot masquerade as its original bytes.
    if (!encodeState(value).equals(bytes)) throw new FileStoreError(STORE_ERROR.corrupt, "Committed state bytes are not the writer's exact JSON representation.");
    return value;
  }
  catch (cause) { throw new FileStoreError(STORE_ERROR.corrupt, "A committed payload does not contain a valid kernel state.", { cause }); }
}
