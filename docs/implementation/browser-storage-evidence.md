# Browser kernel storage: usage and evidence

Date: 2026-09-13. [ADR-0013](../adr/0013-browser-transactional-storage.md) defines this bounded I1 increment after PR #27 merged. `IndexedDbStore` implements the existing synchronous `TransactionalStore` reducer. The same CommandService handles source drafts, profile inheritance, review, revision conflicts, receipt replay and Undo/redo in Node and the browser.

## Use the adapter

Build with `pnpm build`. A browser bundler can consume the TypeScript public entries below; the emitted equivalents are under `dist/modules/*/src/index.js`. Resolve the one pinned runtime dependency, `@noble/hashes/sha2.js`, using that bundler or an explicit import map. The test harness provides a working emitted-module import map; it is not a Studio application or deployment server.

```ts
import { CommandService } from "./modules/ads-core/src/index.ts";
import { IndexedDbStore, createBrowserServices } from "./modules/browser-store/src/index.ts";

const store = new IndexedDbStore("axiom-project-example");
const commands = new CommandService(store, createBrowserServices());
// Supply the same authorized principal and command contracts used by the core.
// All persisted state changes go through commands, including review and Undo.
// Close this instance when its owning session is disposed.
store.close();
```

Use a secure context providing `crypto.randomUUID` and IndexedDB. Each explicitly named, origin-scoped database holds one kernel state. A missing API fails explicitly; there is no volatile fallback. `read()` returns a detached snapshot or null for a truly empty database. `transact()` is an adapter port for the core, not a replacement authorization API. Its callback must be synchronous and return `{ state, value, changed }`; asynchronous callbacks and malformed state are rejected. `close()` prevents new operations and releases the connection; transactions already active may still complete. A closed instance is not reusable.

Browser storage is controlled by origin permissions and device/browser storage policy. Database names do not authenticate users. The local principal still represents the caller already authorized for that context; API authentication and multi-user access remain separate work.

## Selection and physical contract

| Option | Decision for this increment |
|---|---|
| IndexedDB snapshot journal | Selected for a single read/check/reduce/write transaction across connections, with atomic journal/head publication. |
| localStorage | Lacks the required multi-record transactional boundary. |
| OPFS | Requires a separate coordination and recovery layer; no equivalent implementation or performance comparison is claimed. |
| Yjs / Automerge / server sequencer | Collaboration semantics remain open under SEL05; local storage does not decide offline merge or collaborative Undo. |

Database schema version 1 has exactly `commits` and `meta` stores. Storage format `0.1.0` has an immutable sequence starting at 1, parent SHA-256 linkage, project identity/revision, canonical state text and its digest, plus a digest binding commit metadata. The advisory head contains sequence and digest. Each write checks the retained chain before invoking the reducer, appends one complete state and updates head in one transaction. Only the transaction's `complete` event returns success, including for receipt-producing operations. A successful individual request followed by abort cannot report a committed revision.

Readers validate all retained records with a cursor and keep only the latest parsed state. A missing or stale advisory head recovers the unique complete chain; malformed or mismatched heads, missing intermediate commits, unknown formats, digest or state corruption fail closed. No record is deleted to make recovery succeed. The core codec checks canonical bytes and known record shape without interpreting opaque document bodies or migrating the Node store's physical encoding.

State text is bounded to 64 MiB and depth 80; journal length is bounded to 10,000 commits. These are rejection limits, not measured performance targets or capacity guarantees. Complete snapshots and full-chain validation have growing disk and read cost. Compaction and long-history performance remain pending. SHA-256 detects changes and corruption; it does not authenticate writers or encrypt data. See the [dependency notice](browser-dependency-notice.md).

## Verification

Run `pnpm check`, `pnpm test`, `pnpm build`, then `pnpm test:browser`. The browser runner requires an installed Chrome/Chromium/Edge executable; `AXIOM_BROWSER_BIN` can select it. Missing browsers fail instead of silently skipping. It serves only emitted core/browser modules, the selected hash dependency and the harness on loopback, creates an isolated temporary profile and removes its owned resources after testing. It never opens the user's browser profile.

| Evidence | Verified boundary |
|---|---|
| Core codec and service tests | Canonical state shape/size/depth, descriptor-safe snapshots, invalid profiles, source preservation, known SHA-256 vectors and independent native-digest parity. |
| fake-indexeddb tests | Deterministic lifecycle, transaction, corruption and fault cases; in-memory emulation only. |
| Real Chromium emitted modules | Actual IndexedDB workflows, source repair/review/adoption, profile and source preservation, Undo/redo and bundle restoration. |
| Two distinct same-origin tabs | Simultaneous applies from the same base revision produce exactly one accepted result and one conflict; both tabs read the same state. |
| Actual request-success then abort | A native add request succeeds, then its transaction aborts; the adapter rejects and the stored snapshot is unchanged. |
| Completion response loss | A trusted fault after transaction completion rejects the response; retry replays the original persisted receipt without a second mutation. |
| Browser process restart | Terminate the dedicated Chromium process after completed transactions; reopen the same profile and verify the complete state, receipts and source data. |

Local evidence on 2026-09-13: Windows, Node 24.19.0, Chrome 152.0.7977.83 passed the real-browser runner. Its JSON result records the selected browser, scenarios, limitations and failures. The Quality Gate runs the same command on Windows and Ubuntu after building; the PR's exact commit and CI results remain authoritative. Quota failure is deliberately injected, not physical disk exhaustion. Process termination after completed writes is distinct from hardware power loss or interruption during a browser-internal disk flush.

## Failure handling and remaining work

`BROWSER_STORE_UNAVAILABLE`, `BLOCKED`, `CLOSED`, `VERSION`, `CORRUPT`, `STATE`, `QUOTA`, `ABORTED`, `CAPACITY` and `IO` are explicit error suffixes under the `BROWSER_STORE_` prefix. Blocked opening is time bounded; version changes close owned connections. Reopening requires a new instance. A response failure can occur after completion, so callers must use the normal stable request identity and receipt replay rather than guessing whether a new mutation is necessary. Keep existing data on corruption and use independent backups for recovery.

This evidence does not certify Safari/Firefox, user eviction, physical quota exhaustion, power loss, full offline preparation packs, assets, browser UI, the complete Foundation StoragePort or realtime collaboration. I1 and SEL05 remain partial. Next I1 work includes explicit registry/library snapshot pins, unresolved domain contracts and draft edits, an approved old/new schema pair with migration/loss reports, independent-copy interchange and history compaction. ADS schema versions, package versions and entry public versions are distinct; this storage format is not a migration between them.
