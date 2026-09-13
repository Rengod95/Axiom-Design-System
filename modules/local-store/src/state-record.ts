import type { KernelState } from "../../ads-core/src/index.ts";
import { MAX_JSON_DEPTH, MAX_STATE_BYTES, STORE_ERROR } from "./constants.ts";
import { FileStoreError } from "./storage-error.ts";
import { isRecord, validateSourceRecords } from "./state-shape.ts";

function withinSize(size: number): number {
  if (size > MAX_STATE_BYTES) throw new FileStoreError(STORE_ERROR.state, "State size exceeds this storage profile.");
  return size;
}

/** Count the well-formed JSON string encoding without allocating its escaped representation. */
function stringSize(value: string): number {
  withinSize(value.length + 2);
  let size = 2;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code === 34 || code === 92) size += 2;
    else if (code < 32) size += [8, 9, 10, 12, 13].includes(code) ? 2 : 6;
    else if (code < 128) size++;
    else if (code < 2048) size += 2;
    else if (code >= 0xd800 && code <= 0xdbff && value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) { size += 4; index++; }
    else size += code >= 0xd800 && code <= 0xdfff ? 6 : 3;
    withinSize(size);
  }
  return size;
}

/** Validate and measure before expansion; shared subtrees reuse a measured size, not exponential traversal. */
function checkJson(value: unknown, ancestors = new Set<object>(), depth = 0, sizes = new Map<object, { size: number; height: number }>()): number {
  if (depth > MAX_JSON_DEPTH) throw new FileStoreError(STORE_ERROR.state, "State nesting exceeds this storage profile.");
  if (value === null) return 4;
  if (typeof value === "string") return stringSize(value);
  if (typeof value === "boolean") return value ? 4 : 5;
  if (typeof value === "number" && Number.isFinite(value)) return String(value).length;
  if (typeof value !== "object" || (!Array.isArray(value) && !isRecord(value)) || ancestors.has(value)) throw new FileStoreError(STORE_ERROR.state, "The state must contain finite, acyclic plain JSON data.");
  if (Array.isArray(value) && Object.getPrototypeOf(value) !== Array.prototype) throw new FileStoreError(STORE_ERROR.state, "Arrays must have the plain JSON array prototype.");
  const measured = sizes.get(value);
  if (measured !== undefined) {
    if (depth + measured.height > MAX_JSON_DEPTH) throw new FileStoreError(STORE_ERROR.state, "State nesting exceeds this storage profile.");
    return measured.size;
  }
  if (Object.getOwnPropertySymbols(value).length) throw new FileStoreError(STORE_ERROR.state, "Symbol keys cannot be persisted.");
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  let size = 2, count = 0, height = 0;
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (Array.isArray(value) && key === "length") continue;
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) throw new FileStoreError(STORE_ERROR.state, "Accessors or hidden properties cannot be persisted.");
    size += (count++ ? 1 : 0) + (Array.isArray(value) ? 0 : stringSize(key) + 1);
    size = withinSize(size + checkJson(descriptor.value, ancestors, depth + 1, sizes));
    height = Math.max(height, 1 + (sizes.get(descriptor.value as object)?.height ?? 0));
  }
  if (Array.isArray(value) && (Object.keys(value).length !== value.length || !Array.from({ length: value.length }, (_, index) => Object.hasOwn(value, index)).every(Boolean))) throw new FileStoreError(STORE_ERROR.state, "Sparse arrays or extra array properties cannot be persisted.");
  ancestors.delete(value);
  sizes.set(value, { size, height });
  return size;
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
  validateSourceRecords(value);
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
