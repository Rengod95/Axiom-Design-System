import { canonicalJson, decodeKernelState, encodeKernelState, kernelStateTextBytes } from "../../ads-core/src/index.ts";
import type { KernelState } from "../../ads-core/src/index.ts";
import { browserDigest } from "./browser-services.ts";
import type { BrowserCommit, BrowserHead, RecoveredBrowserState } from "./contracts.ts";
import { BROWSER_DIGEST_PATTERN, BROWSER_MAX_COMMITS, BROWSER_PROOF_MAX_CHARACTERS, BROWSER_PROOF_MAX_REFERENCES, BROWSER_STORAGE_VERSION, BROWSER_STORE_ERROR, BROWSER_STORES } from "./constants.ts";
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
type ValidatedIdentity = Readonly<{ projectId: string | null; revision: string | null }>;
export type ValidatedBrowserSnapshots = Map<string, ValidatedIdentity>;
const MAX_CACHED_IDENTITIES = 1024;
const MAX_CACHED_IDENTITY_CHARACTERS = 1024;
const MAX_PROOF_CHUNK_CHARACTERS = 65_536;
const MAX_PROOF_PARTS = 32_768;
type TextProof = { length: number; parts: string[] };
type ProofPool = { characters: number; references: number; chunks: Map<string, { text: string; uses: number }>; proofs: Map<ValidatedIdentity, TextProof> };
const proofPools = new WeakMap<ValidatedBrowserSnapshots, ProofPool>();
const PROOF_ENCODER = new TextEncoder(), PROOF_DECODER = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function releaseProof(pool: ProofPool, identity: ValidatedIdentity): void {
  const proof = pool.proofs.get(identity);
  if (!proof) return;
  for (const part of proof.parts) {
    const chunk = pool.chunks.get(part)!;
    if (chunk.uses === 1) { pool.chunks.delete(part); pool.characters -= part.length; }
    else chunk.uses--;
  }
  pool.references -= proof.parts.length;
  pool.proofs.delete(identity);
}

/** A digest selects a proof; only full, exact UTF-16 equality can reuse its byte/Unicode validation. */
function matchesProof(text: string, identity: ValidatedIdentity, validated: ValidatedBrowserSnapshots): boolean {
  const proof = proofPools.get(validated)?.proofs.get(identity);
  if (!proof || proof.length !== text.length) return false;
  let offset = 0;
  for (const part of proof.parts) {
    const end = offset + part.length;
    // Exact string equality uses the engine's bulk comparison; temporary views
    // never enter the retained pool or keep another snapshot alive after this read.
    if (text.slice(offset, end) !== part) return false;
    offset = end;
  }
  return offset === text.length;
}

/** Pool repeated source records without retaining backing strings for whole historical snapshots. */
function rememberProof(text: string, identity: ValidatedIdentity, validated: ValidatedBrowserSnapshots): void {
  let pool = proofPools.get(validated);
  if (!pool) { pool = { characters: 0, references: 0, chunks: new Map(), proofs: new Map() }; proofPools.set(validated, pool); }
  // External callers may clear the metadata map; remove now-unreachable optimization entries too.
  const retained = new Set(validated.values());
  for (const previous of pool.proofs.keys()) if (!retained.has(previous)) releaseProof(pool, previous);
  releaseProof(pool, identity);
  const parts: string[] = [];
  const abandon = () => { pool!.proofs.set(identity, { length: text.length, parts }); releaseProof(pool!, identity); };
  const add = (start: number, end: number): boolean => {
    while (start < end) {
      let next = Math.min(end, start + MAX_PROOF_CHUNK_CHARACTERS);
      // Validated text may contain astral characters; chunking must not split a surrogate pair.
      if (next < end && text.charCodeAt(next - 1) >= 0xd800 && text.charCodeAt(next - 1) <= 0xdbff) next--;
      const slice = text.slice(start, next);
      while (pool!.characters + (pool!.chunks.has(slice) ? 0 : slice.length) > BROWSER_PROOF_MAX_CHARACTERS || pool!.references + 1 > BROWSER_PROOF_MAX_REFERENCES) {
        const oldest = pool!.proofs.keys().next().value;
        if (!oldest) return false;
        releaseProof(pool!, oldest);
      }
      if (parts.length >= MAX_PROOF_PARTS) return false;
      // Encoding/decoding occurs only when minting a distinct chunk. It makes an
      // independent flat string, so a short slice cannot keep a large snapshot alive.
      // Map equality is exact string equality, never a digest or a caller-provided key.
      // Retain the pooled key itself instead of a new slice's historical backing store.
      const existing = pool!.chunks.get(slice);
      let owned: string;
      if (existing) {
        existing.uses++; owned = existing.text;
      } else {
        owned = PROOF_DECODER.decode(PROOF_ENCODER.encode(slice));
        pool!.chunks.set(owned, { text: owned, uses: 1 }); pool!.characters += owned.length;
      }
      parts.push(owned); pool!.references++; start = next;
    }
    return true;
  };
  // These are byte boundaries, not parsed/trusted fields. Malicious matching text
  // cannot bypass validation: all characters remain in the ordered exact proof.
  const boundaries = /"(?:currentText|document|originalText)":/g;
  let start = 0;
  for (const match of text.matchAll(boundaries)) {
    if (!add(start, match.index)) { abandon(); return; }
    start = match.index;
  }
  if (!add(start, text.length)) { abandon(); return; }
  pool.proofs.set(identity, { length: text.length, parts });
}
// Only identities minted by the full codec proof authorize the parse-only path. The
// supplied Map cannot forge validation or transplant an identity to other bytes.
const validatedIdentityDigests = new WeakMap<ValidatedIdentity, string>();
function rememberValidatedIdentity(state: KernelState, stateDigest: string, validated: ValidatedBrowserSnapshots, text: string): ValidatedIdentity {
  const identity = Object.freeze({ projectId: state.project?.id ?? null, revision: state.project?.revision ?? null });
  // Oversized compatible identities remain valid; only their optimization is skipped.
  if ((identity.projectId?.length ?? 0) + (identity.revision?.length ?? 0) <= MAX_CACHED_IDENTITY_CHARACTERS) {
    if (validated.size >= MAX_CACHED_IDENTITIES) validated.delete(validated.keys().next().value!);
    validatedIdentityDigests.set(identity, stateDigest);
    validated.set(stateDigest, identity);
    rememberProof(text, identity, validated);
  }
  return identity;
}
function decodeCommit(value: unknown, key: IDBValidKey, parent: BrowserHead | null, validated: ValidatedBrowserSnapshots): { commit: BrowserCommit; state: KernelState | null } {
  exact(value, ["storageFormatVersion", "sequence", "parentDigest", "projectId", "revision", "stateText", "stateDigest", "commitDigest"]);
  if (value.storageFormatVersion !== BROWSER_STORAGE_VERSION || !sequence(value.sequence) || value.sequence !== key || value.sequence !== (parent?.sequence ?? 0) + 1
    || value.parentDigest !== (parent?.commitDigest ?? null) || !digest(value.stateDigest) || !digest(value.commitDigest)
    || typeof value.stateText !== "string" || !(value.projectId === null || typeof value.projectId === "string") || !(value.revision === null || typeof value.revision === "string")) corrupt("Browser commit sequence, lineage or metadata is invalid.");
  const commit = value as unknown as BrowserCommit;
  const cached = validated.get(commit.stateDigest);
  let state: KernelState | null = null, identity = cached && validatedIdentityDigests.get(cached) === commit.stateDigest ? cached : undefined;
  // TextEncoder replaces lone UTF-16 surrogates. Reject them before hashing so
  // a replacement character and malformed stored text cannot share a cache key.
  if (!identity || !matchesProof(commit.stateText, identity, validated)) {
    try { kernelStateTextBytes(commit.stateText); }
    catch (cause) { return corrupt("Browser commit text exceeds its UTF-8 bound or contains malformed Unicode.", cause); }
    if (browserDigest(commit.stateText) !== commit.stateDigest) corrupt("Browser commit digest does not match its snapshot.");
    // A missing, evicted or unequal exact proof also repeats the full codec check.
    // A matching caller-supplied digest never substitutes for retained equal text.
    identity = undefined;
  }
  // Metadata and actual journal lineage are checked even when every stored text
  // character equals privately retained, previously validated bytes.
  if (browserDigest(canonicalJson(metadata(commit))) !== commit.commitDigest) corrupt("Browser commit digest does not match its snapshot.");
  if (!identity) {
    try { state = decodeKernelState(commit.stateText); }
    catch (cause) { return corrupt("Browser commit contains invalid or noncanonical kernel state.", cause); }
    identity = rememberValidatedIdentity(state, commit.stateDigest, validated, commit.stateText);
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
          // decodeCommit has authenticated these exact bytes against a prior full
          // codec proof. Parse afresh for caller isolation without repeating its entire
          // canonical/shape walk over retained candidates and undo snapshots.
          done({ head, state: state ?? (latestText === null ? null : JSON.parse(latestText) as KernelState) });
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
export function createBrowserCommit(state: unknown, parent: BrowserHead | null, validated?: ValidatedBrowserSnapshots): BrowserCommit {
  if ((parent?.sequence ?? 0) >= BROWSER_MAX_COMMITS) throw new BrowserStoreError(BROWSER_STORE_ERROR.capacity, "Browser journal is full; export before changing storage or capacity.");
  let stateText: string;
  try { stateText = encodeKernelState(state); }
  catch (cause) { throw new BrowserStoreError(BROWSER_STORE_ERROR.state, "A browser commit requires a valid bounded kernel state.", { cause }); }
  const snapshot = JSON.parse(stateText) as KernelState;
  const commit: BrowserCommit = { storageFormatVersion: BROWSER_STORAGE_VERSION, sequence: (parent?.sequence ?? 0) + 1, parentDigest: parent?.commitDigest ?? null,
    projectId: snapshot.project?.id ?? null, revision: snapshot.project?.revision ?? null, stateText, stateDigest: browserDigest(stateText), commitDigest: "" };
  commit.commitDigest = browserDigest(canonicalJson(metadata(commit)));
  // encodeKernelState already proves canonical descriptor bytes and the complete
  // detached state shape. Reusing that proof avoids decoding this same fresh
  // snapshot on the next command. This caches validity, never commit/adoption:
  // every read compares all stored text exactly and checks the actual journal chain.
  if (validated) rememberValidatedIdentity(snapshot, commit.stateDigest, validated, stateText);
  return commit;
}
