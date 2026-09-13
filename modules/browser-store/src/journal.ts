import { canonicalJson, decodeKernelState, encodeKernelState, kernelStateTextBytes } from "../../ads-core/src/index.ts";
import type { KernelState } from "../../ads-core/src/index.ts";
import { browserDigest } from "./browser-services.ts";
import type { BrowserCommit, BrowserHead, RecoveredBrowserState } from "./contracts.ts";
import { BROWSER_DIGEST_PATTERN, BROWSER_MAX_COMMITS, BROWSER_STORAGE_VERSION, BROWSER_STORE_ERROR, BROWSER_STORES } from "./constants.ts";
import { BrowserStoreError } from "./storage-error.ts";

function corrupt(message: string, cause?: unknown): never { throw new BrowserStoreError(BROWSER_STORE_ERROR.corrupt, message, { cause }); }
function exact(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) corrupt("Browser journal record has an unsupported shape.");
}
function sequence(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 1; }
function digest(value: unknown): value is string { return typeof value === "string" && BROWSER_DIGEST_PATTERN.test(value); }
function metadata(commit: BrowserCommit) {
  return { storageFormatVersion: commit.storageFormatVersion, sequence: commit.sequence, parentDigest: commit.parentDigest, projectId: commit.projectId, revision: commit.revision, stateDigest: commit.stateDigest };
}
function validateHead(value: unknown): BrowserHead {
  exact(value, ["storageFormatVersion", "sequence", "commitDigest"]);
  if (value.storageFormatVersion !== BROWSER_STORAGE_VERSION || !sequence(value.sequence) || !digest(value.commitDigest)) corrupt("Browser advisory head is malformed or unsupported.");
  return value as unknown as BrowserHead;
}
export type ValidatedBrowserSnapshots = Map<string, { projectId: string | null; revision: string | null }>;
function decodeCommit(value: unknown, key: IDBValidKey, parent: BrowserHead | null, validated: ValidatedBrowserSnapshots): { commit: BrowserCommit; state: KernelState | null } {
  exact(value, ["storageFormatVersion", "sequence", "parentDigest", "projectId", "revision", "stateText", "stateDigest", "commitDigest"]);
  if (value.storageFormatVersion !== BROWSER_STORAGE_VERSION || !sequence(value.sequence) || value.sequence !== key || value.sequence !== (parent?.sequence ?? 0) + 1
    || value.parentDigest !== (parent?.commitDigest ?? null) || !digest(value.stateDigest) || !digest(value.commitDigest)
    || typeof value.stateText !== "string" || !(value.projectId === null || typeof value.projectId === "string") || !(value.revision === null || typeof value.revision === "string")) corrupt("Browser commit sequence, lineage or metadata is invalid.");
  const commit = value as unknown as BrowserCommit;
  // TextEncoder replaces lone UTF-16 surrogates. Reject them before hashing so
  // a replacement character and malformed stored text cannot share a cache key.
  try { kernelStateTextBytes(commit.stateText); }
  catch (cause) { return corrupt("Browser commit text exceeds its UTF-8 bound or contains malformed Unicode.", cause); }
  // Rehash every stored byte and recheck lineage on every read. Only the costly
  // semantic decode of an already validated, identical historical snapshot is cached.
  if (browserDigest(commit.stateText) !== commit.stateDigest || browserDigest(canonicalJson(metadata(commit))) !== commit.commitDigest) corrupt("Browser commit digest does not match its snapshot.");
  let state: KernelState | null = null, identity = validated.get(commit.stateDigest);
  if (!identity) {
    try { state = decodeKernelState(commit.stateText); }
    catch (cause) { return corrupt("Browser commit contains invalid or noncanonical kernel state.", cause); }
    identity = { projectId: state.project?.id ?? null, revision: state.project?.revision ?? null };
    if (validated.size >= BROWSER_MAX_COMMITS) validated.delete(validated.keys().next().value!);
    validated.set(commit.stateDigest, identity);
  }
  if (identity.projectId !== commit.projectId || identity.revision !== commit.revision) corrupt("Browser commit project metadata does not match its snapshot.");
  return { commit, state };
}

/** Cursor requests keep the native transaction active; no asynchronous work enters these handlers. */
export function readBrowserJournal(transaction: IDBTransaction, done: (recovered: RecoveredBrowserState) => void, failed: (cause: unknown) => void, validated: ValidatedBrowserSnapshots = new Map()): void {
  let advisory: BrowserHead | null = null;
  let metaCount = 0;
  const meta = transaction.objectStore(BROWSER_STORES.meta).openCursor();
  meta.onsuccess = () => {
    try {
      const cursor = meta.result;
      if (cursor) {
        if (++metaCount > 1 || cursor.key !== BROWSER_STORES.head) corrupt("Browser metadata includes an unexpected record.");
        advisory = validateHead(cursor.value);
        cursor.continue();
      } else readCommits();
    } catch (cause) { failed(cause); }
  };
  function readCommits(): void {
    let head: BrowserHead | null = null;
    let state: KernelState | null = null;
    let latestText: string | null = null;
    let count = 0;
    let advisoryFound = advisory === null;
    const request = transaction.objectStore(BROWSER_STORES.commits).openCursor();
    request.onsuccess = () => {
      try {
        const cursor = request.result;
        if (!cursor) {
          if (!advisoryFound) corrupt("Browser head does not identify a retained commit.");
          // Never retain or return a shared mutable decoded snapshot from the cache.
          done({ head, state: state ?? (latestText === null ? null : decodeKernelState(latestText)) });
          return;
        }
        if (++count > BROWSER_MAX_COMMITS) throw new BrowserStoreError(BROWSER_STORE_ERROR.capacity, "Browser journal exceeds the supported commit capacity.");
        const decoded = decodeCommit(cursor.value, cursor.key, head, validated);
        head = { storageFormatVersion: BROWSER_STORAGE_VERSION, sequence: decoded.commit.sequence, commitDigest: decoded.commit.commitDigest };
        state = decoded.state; // Historical decoded snapshots are intentionally not retained.
        latestText = decoded.commit.stateText;
        if (advisory?.sequence === head.sequence) {
          if (advisory.commitDigest !== head.commitDigest) corrupt("Browser advisory head digest does not match its commit.");
          advisoryFound = true;
        }
        cursor.continue();
      } catch (cause) { failed(cause); }
    };
  }
}

/** Serialize descriptor-captured state and bind metadata to those exact bytes. */
export function createBrowserCommit(state: unknown, parent: BrowserHead | null): BrowserCommit {
  if ((parent?.sequence ?? 0) >= BROWSER_MAX_COMMITS) throw new BrowserStoreError(BROWSER_STORE_ERROR.capacity, "Browser journal is full; export before changing storage or capacity.");
  let stateText: string;
  try { stateText = encodeKernelState(state); }
  catch (cause) { throw new BrowserStoreError(BROWSER_STORE_ERROR.state, "A browser commit requires a valid bounded kernel state.", { cause }); }
  const snapshot = JSON.parse(stateText) as KernelState;
  const commit: BrowserCommit = { storageFormatVersion: BROWSER_STORAGE_VERSION, sequence: (parent?.sequence ?? 0) + 1, parentDigest: parent?.commitDigest ?? null,
    projectId: snapshot.project?.id ?? null, revision: snapshot.project?.revision ?? null, stateText, stateDigest: browserDigest(stateText), commitDigest: "" };
  commit.commitDigest = browserDigest(canonicalJson(metadata(commit)));
  return commit;
}
