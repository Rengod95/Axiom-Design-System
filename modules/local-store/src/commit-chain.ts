import { createHash, randomUUID } from "node:crypto";
import { lstat, open, readdir, rename } from "node:fs/promises";
import path from "node:path";
import type { KernelState } from "../../ads-core/src/index.ts";
import type { CommitMarker, StoreIdentity } from "./contracts.ts";
import { DIGEST_PATTERN, STORAGE_FORMAT_VERSION, STORE_ERROR, STORE_FILES, UUID_PATTERN } from "./constants.ts";
import { checkRootEntries, ensureDirectory, readRegular } from "./path-boundary.ts";
import { decodeState } from "./state-record.ts";
import { isRecord } from "./state-shape.ts";
import { FileStoreError, hasCode } from "./storage-error.ts";

export interface RecoveredStore { identity: StoreIdentity; head: CommitMarker | null; state: KernelState | null }

/** The digest covers exact bytes; it is integrity evidence, not proof against an owner rewriting all records. */
export function payloadDigest(bytes: Buffer): string { return createHash("sha256").update(bytes).digest("hex"); }

/** Exact existing content may be reused; immutable object paths are never overwritten. */
async function immutableFile(file: string, bytes: Buffer): Promise<void> {
  let handle;
  try { handle = await open(file, "wx", 0o600); }
  catch (error) {
    if (!hasCode(error, "EEXIST")) throw error;
    if (!(await readRegular(file)).equals(bytes)) throw new FileStoreError(STORE_ERROR.corrupt, "An immutable storage record has different bytes.");
    return;
  }
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}

/** The temporary file is complete before rename; directory power-loss durability is not claimed. */
async function replaceRecord(directory: string, name: string, prefix: string, value: unknown): Promise<void> {
  const destination = path.join(directory, name);
  try { await readRegular(destination); } catch (error) { if (!hasCode(error, "ENOENT")) throw error; }
  const temporary = path.join(directory, `${prefix}${randomUUID()}.tmp`);
  await immutableFile(temporary, Buffer.from(JSON.stringify(value), "utf8"));
  await rename(temporary, destination);
}

/** Metadata parsing failures are committed-data corruption, never a request to initialize a new project. */
async function jsonRecord(file: string): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    const bytes = await readRegular(file);
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!Buffer.from(JSON.stringify(value), "utf8").equals(bytes)) throw new FileStoreError(STORE_ERROR.corrupt, "Storage metadata differs from its exact encoded representation.");
  }
  catch (cause) { if (cause instanceof FileStoreError || hasCode(cause, "ENOENT")) throw cause; throw new FileStoreError(STORE_ERROR.corrupt, "A storage metadata record is malformed.", { cause }); }
  if (!isRecord(value)) throw new FileStoreError(STORE_ERROR.corrupt, "A storage metadata record must be an object.");
  return value;
}

/** Initialize only an empty layout; committed data without identity is never adopted. */
async function identityFor(directory: string): Promise<StoreIdentity> {
  const file = path.join(directory, STORE_FILES.identity);
  try {
    const identity = await jsonRecord(file);
    if (identity.storageFormatVersion !== STORAGE_FORMAT_VERSION || typeof identity.storeId !== "string" || !UUID_PATTERN.test(identity.storeId)) throw new FileStoreError(STORE_ERROR.corrupt, "The store identity or format is unsupported.");
    return identity as unknown as StoreIdentity;
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
    for (const name of [STORE_FILES.commits, STORE_FILES.objects, STORE_FILES.pending]) if ((await readdir(path.join(directory, name))).length) throw new FileStoreError(STORE_ERROR.corrupt, "Storage data exists without its identity record.");
    try { await lstat(path.join(directory, STORE_FILES.head)); throw new FileStoreError(STORE_ERROR.corrupt, "A head exists without its store identity."); } catch (headError) { if (!hasCode(headError, "ENOENT")) throw headError; }
    const identity = { storageFormatVersion: STORAGE_FORMAT_VERSION, storeId: randomUUID() };
    await replaceRecord(directory, STORE_FILES.identity, ".identity-", identity);
    return identity;
  }
}

/** Recover one complete chain; any malformed committed record or branching history is a visible failure. */
export async function recoverStore(directory: string): Promise<RecoveredStore> {
  await checkRootEntries(directory);
  for (const name of [STORE_FILES.objects, STORE_FILES.commits, STORE_FILES.pending]) await ensureDirectory(path.join(directory, name));
  const identity = await identityFor(directory);
  const markers = new Map<string, CommitMarker>();
  for (const name of await readdir(path.join(directory, STORE_FILES.commits))) {
    const id = name.slice(0, -5);
    if (!name.endsWith(".json") || !UUID_PATTERN.test(id)) throw new FileStoreError(STORE_ERROR.corrupt, "A commit filename is outside the storage format.");
    const record = await jsonRecord(path.join(directory, STORE_FILES.commits, name));
    if (record.storageFormatVersion !== STORAGE_FORMAT_VERSION || record.storeId !== identity.storeId || record.commitId !== id || typeof record.payloadHash !== "string" || !DIGEST_PATTERN.test(record.payloadHash) || (record.parentCommitId !== null && (typeof record.parentCommitId !== "string" || !UUID_PATTERN.test(record.parentCommitId)))) throw new FileStoreError(STORE_ERROR.corrupt, "A committed marker is invalid.");
    markers.set(id, record as unknown as CommitMarker);
  }
  const roots = [...markers.values()].filter(marker => marker.parentCommitId === null);
  if (markers.size && roots.length !== 1) throw new FileStoreError(STORE_ERROR.corrupt, "The committed history has no unique root.");
  const children = new Map<string, CommitMarker>();
  for (const marker of markers.values()) {
    if (marker.parentCommitId !== null) {
      if (!markers.has(marker.parentCommitId) || children.has(marker.parentCommitId)) throw new FileStoreError(STORE_ERROR.corrupt, "The committed history is incomplete or ambiguous.");
      children.set(marker.parentCommitId, marker);
    }
  }
  let head = roots[0] ?? null;
  let count = head ? 1 : 0;
  while (head && children.has(head.commitId)) { head = children.get(head.commitId)!; count++; if (count > markers.size) throw new FileStoreError(STORE_ERROR.corrupt, "The commit history contains a cycle."); }
  if (count !== markers.size) throw new FileStoreError(STORE_ERROR.corrupt, "The committed history is disconnected.");
  try {
    const pointer = await jsonRecord(path.join(directory, STORE_FILES.head));
    if (pointer.storageFormatVersion !== STORAGE_FORMAT_VERSION || pointer.storeId !== identity.storeId || typeof pointer.commitId !== "string" || !markers.has(pointer.commitId)) throw new FileStoreError(STORE_ERROR.corrupt, "The active head refers to missing committed data.");
  } catch (error) { if (!hasCode(error, "ENOENT")) throw error; }
  // Every ancestor remains an integrity subject, but historical snapshots must
  // not all stay alive in memory when the caller needs only the selected head.
  let state: KernelState | null = null;
  for (const marker of markers.values()) {
    const snapshot = await readCommittedState(directory, marker);
    if (marker.commitId === head?.commitId) state = snapshot;
  }
  return { identity, head, state };
}

async function readCommittedState(directory: string, marker: CommitMarker): Promise<KernelState> {
  let bytes: Buffer;
  try { bytes = await readRegular(path.join(directory, STORE_FILES.objects, `${marker.payloadHash}.json`)); }
  catch (cause) { if (cause instanceof FileStoreError) throw cause; throw new FileStoreError(STORE_ERROR.corrupt, "A committed payload is missing or unreadable.", { cause }); }
  if (payloadDigest(bytes) !== marker.payloadHash) throw new FileStoreError(STORE_ERROR.corrupt, "A committed payload digest does not match.");
  return decodeState(bytes);
}

/** Prepare preserves a recoverable candidate without changing the visible committed chain. */
export async function prepareCommit(directory: string, recovered: RecoveredStore, bytes: Buffer): Promise<CommitMarker> {
  const marker: CommitMarker = { ...recovered.identity, commitId: randomUUID(), parentCommitId: recovered.head?.commitId ?? null, payloadHash: payloadDigest(bytes) };
  const object = path.join(directory, STORE_FILES.objects, `${marker.payloadHash}.json`);
  try {
    if (!(await readRegular(object)).equals(bytes)) throw new FileStoreError(STORE_ERROR.corrupt, "An immutable payload has different bytes.");
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
    // A process crash during write leaves only an ignored pending file, never a
    // half-written content-addressed object which would poison an exact retry.
    const stagedObject = path.join(directory, STORE_FILES.pending, `${marker.commitId}.payload.tmp`);
    await immutableFile(stagedObject, bytes);
    await rename(stagedObject, object);
  }
  await immutableFile(path.join(directory, STORE_FILES.pending, `${marker.commitId}.json`), Buffer.from(JSON.stringify(marker), "utf8"));
  return marker;
}

/** The marker rename commits the payload and its receipts together; pending preparation is retained. */
export async function publishCommit(directory: string, marker: CommitMarker): Promise<void> {
  const temporary = path.join(directory, STORE_FILES.pending, `${marker.commitId}.tmp`);
  const destination = path.join(directory, STORE_FILES.commits, `${marker.commitId}.json`);
  await immutableFile(temporary, Buffer.from(JSON.stringify(marker), "utf8"));
  try { await lstat(destination); throw new FileStoreError(STORE_ERROR.corrupt, "An immutable commit identifier already exists."); } catch (error) { if (!hasCode(error, "ENOENT")) throw error; }
  await rename(temporary, destination);
  await replaceRecord(directory, STORE_FILES.head, ".head-", { storageFormatVersion: marker.storageFormatVersion, storeId: marker.storeId, commitId: marker.commitId });
}
