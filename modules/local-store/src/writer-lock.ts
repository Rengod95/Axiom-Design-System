import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { open, unlink } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { LockRecord } from "./contracts.ts";
import { LOCK_POLL_MS, STORE_ERROR, STORE_FILES, UUID_PATTERN } from "./constants.ts";
import { readRegular } from "./path-boundary.ts";
import { isRecord } from "./state-record.ts";
import { FileStoreError, hasCode } from "./storage-error.ts";

/** Missing is distinct from an unreadable, symlinked or malformed lock. */
async function loadLock(file: string): Promise<LockRecord | null> {
  let bytes: Buffer;
  try { bytes = await readRegular(file); } catch (error) { if (hasCode(error, "ENOENT")) return null; throw error; }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!Buffer.from(JSON.stringify(value), "utf8").equals(bytes)) throw new Error("Lock metadata is not its exact encoded representation.");
  } catch (cause) { throw new FileStoreError(STORE_ERROR.locked, "The lock record is incomplete or ambiguous; its owner cannot safely be inferred.", { cause }); }
  if (!isRecord(value) || typeof value.hostname !== "string" || !Number.isSafeInteger(value.pid) || Number(value.pid) <= 0 || typeof value.token !== "string" || !UUID_PATTERN.test(value.token) || typeof value.createdAt !== "string") throw new FileStoreError(STORE_ERROR.locked, "The lock owner cannot safely be verified.");
  return value as unknown as LockRecord;
}

/** The exclusive create is the acquisition point; metadata never determines automatic expiry. */
async function createLock(file: string): Promise<LockRecord> {
  const record: LockRecord = { hostname: hostname(), pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() };
  const handle = await open(file, "wx", 0o600);
  try { await handle.writeFile(JSON.stringify(record), "utf8"); await handle.sync(); }
  catch (error) { await handle.close(); await unlink(file); throw error; }
  await handle.close();
  return record;
}

/** Release only the exact lock this process acquired. */
async function releaseLock(file: string, record: LockRecord): Promise<void> {
  const current = await loadLock(file);
  if (current?.token !== record.token || current.pid !== process.pid) throw new FileStoreError(STORE_ERROR.locked, "The writer lock changed before release.");
  await unlink(file);
}

/** Bounded contention waits serialize cooperating processes; dead locks remain explicit recovery work. */
export async function withWriterLock<T>(directory: string, timeoutMs: number, work: () => Promise<T>): Promise<T> {
  const file = path.join(directory, STORE_FILES.writer);
  const recovery = path.join(directory, STORE_FILES.recovery);
  const deadline = performance.now() + timeoutMs;
  let record: LockRecord | undefined;
  while (!record) {
    let recoveryExists = false;
    try { await readRegular(recovery); recoveryExists = true; } catch (error) { if (!hasCode(error, "ENOENT")) throw error; }
    if (!recoveryExists) {
      try {
        const acquired = await createLock(file);
        // A recovery gate which raced acquisition must finish before this writer enters.
        let gatePresent = false;
        try { await readRegular(recovery); gatePresent = true; }
        catch (error) { if (!hasCode(error, "ENOENT")) { await releaseLock(file, acquired); throw error; } }
        if (gatePresent) await releaseLock(file, acquired); else record = acquired;
      } catch (error) {
        if (!hasCode(error, "EEXIST")) throw error;
        // Reject a symlink immediately, but tolerate the owner's in-progress metadata write.
        try { await readRegular(file); } catch (readError) { if (!hasCode(readError, "ENOENT")) throw readError; }
      }
    }
    if (!record) {
      const remaining = deadline - performance.now();
      if (remaining <= 0) throw new FileStoreError(STORE_ERROR.locked, "Another writer or recovery operation holds the store lock.");
      await delay(Math.min(LOCK_POLL_MS, remaining));
    }
  }
  try { return await work(); } finally { await releaseLock(file, record); }
}

/** Explicit recovery uses a separate exclusive gate; incomplete recovery gates fail safely for manual inspection. */
export async function recoverWriterLock(directory: string): Promise<void> {
  const gateFile = path.join(directory, STORE_FILES.recovery);
  let gate: LockRecord;
  try { gate = await createLock(gateFile); }
  catch (error) { if (hasCode(error, "EEXIST")) throw new FileStoreError(STORE_ERROR.locked, "A recovery gate already exists; inspect its owner before further recovery."); throw error; }
  try {
    const file = path.join(directory, STORE_FILES.writer);
    const writer = await loadLock(file);
    if (writer === null) return;
    if (writer.hostname !== hostname()) throw new FileStoreError(STORE_ERROR.locked, "A different host owns this lock; local process absence is not evidence of death.");
    try { process.kill(writer.pid, 0); }
    catch (error) {
      if (!hasCode(error, "ESRCH")) throw new FileStoreError(STORE_ERROR.locked, "The writer process cannot be proven dead.", { cause: error });
      const current = await loadLock(file);
      if (current?.token !== writer.token) throw new FileStoreError(STORE_ERROR.locked, "The lock changed during recovery.");
      await unlink(file);
      return;
    }
    throw new FileStoreError(STORE_ERROR.locked, "The writer process is still alive; its lock will not be removed.");
  } finally { await releaseLock(gateFile, gate); }
}
