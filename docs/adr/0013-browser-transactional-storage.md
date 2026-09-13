# ADR-0013 — Browser transactional storage

Status: ACCEPTED for continued I1 implementation

Date: 2026-09-13. Owner: product owner; executor: Codex. The owner requested PR #27 merge and continued implementation. PR #27 merged at `f19710500c5f754b3e614481b9d225fb485f4770` after Windows/Ubuntu checks passed on `58bfffc5d99a1dc706802be7a93a390ba858fa5f`.

## Scope and selection

[ARC04](../foundation/architecture/storage-offline-and-recovery.md) requires Browser and Folder storage to share revision, receipt and recovery semantics. This increment adds `modules/browser-store` as a browser-only adapter of the existing synchronous-reducer `TransactionalStore` port. Core remains independent of storage, Node, UI and cryptographic libraries. This is the local kernel's browser persistence implementation; Studio editing, the complete StoragePort surface, external folder watching, asset packs and release-wide offline readiness remain separate.

IndexedDB is selected for this bounded profile because a transaction covering the journal and head can serialize read/check/reduce/write across connections and commit them atomically. OPFS would require an additional journal/locking layer; localStorage cannot provide the same multi-record transaction. The [IndexedDB specification](https://www.w3.org/TR/IndexedDB/) owns transaction completion/abort and durability semantics. A put request succeeding is not transaction success. The adapter resolves only after `complete`; abort/quota/unavailable/blocked/closed errors are explicit and never become an empty project or memory-only success. `durability: strict` is requested, without claiming universal hardware flush or power-loss protection.

## Physical record and lifecycle

One explicitly named origin-scoped database contains `commits` and `meta` stores. Each immutable commit has a monotonically increasing sequence, parent commit digest, storage format version, project identity/revision, canonical kernel-state text and its SHA-256 digest; its commit digest binds that metadata and payload digest. The `meta` head identifies the committed sequence/digest. One readwrite transaction validates the retained chain, invokes the synchronous reducer, adds the commit and updates head. No await, network operation or asynchronous reducer runs within that active transaction.

Cursor-based reads verify sequence continuity, parent linkage, metadata, digests, canonical text and bounded state shape while retaining only the current decoded state. A missing or stale advisory head may select the last unique complete validated journal, as in the Node profile; malformed heads, corrupt commits, discontinuity, unknown formats or ambiguous lineage fail closed. Empty means neither head nor journal exists. No older commit is pruned and no corrupt data is deleted automatically. Journal capacity is bounded explicitly and quota failures require export/space recovery; compaction remains separate.

Database opening checks the exact supported object-store schema. It creates schema only for a new database, closes on versionchange, rejects unsupported versions and bounds blocked opening waits. Closing a store prevents new operations and releases owned connections without manufacturing a transaction result. Fault injection is a trusted synchronous test seam at before-write/after-write and a post-completion response-loss seam; production callers still use normal CommandService authorization and receipt replay.

The browser-neutral core owns an additive canonical kernel-state codec used by this adapter. It validates plain JSON, finite values, bounded bytes/depth, kernel record shape and optional source policies without executing source content. It does not migrate or rewrite the existing Node disk encoding. Document semantics remain in the command boundary. All records include candidates, receipts, drafts and Undo/redo in the same state commit.

## Runtime and verification dependencies

KernelServices.digest is synchronous. Awaiting WebCrypto between IndexedDB requests would violate the reducer contract and transaction lifetime. The browser adapter therefore pins `@noble/hashes` **2.4.0** (MIT) for synchronous SHA-256 and exposes browser services using secure-context `crypto.randomUUID`. Only `@noble/hashes/sha2.js` may be imported by the browser services module; core and the Node store retain their existing dependency boundaries. [Upstream API and audit scope](https://github.com/paulmillr/noble-hashes) are reference evidence, not a claim that this exact release received an independent audit. Known-answer and independent native-digest comparisons verify the selected operation. The exact npm integrity is locked.

`fake-indexeddb` **6.2.5** (Apache-2.0) is a test-only dependency for deterministic scheduling/abort/corruption cases. [Its upstream description](https://github.com/dumbmatter/fakeIndexedDB) explicitly describes in-memory emulation; those tests do not certify actual browser durability, quota or eviction. Actual Chromium tests must run the emitted modules over loopback HTTP in separate browser contexts, exercise simultaneous writers, restart/reopen, interrupted transactions and receipt recovery, and verify browser source bundles. A narrow local test server and browser runner are maintenance tooling, not a product Host or deployment. No user browser profile or database is used.

## Required evidence and boundaries

Verify create/import/review/apply, source/profile preservation, Undo/redo, bundle export/restore, multi-connection conflicts, abort before commit, response loss after commit, failed callbacks, explicit quota failure, blocked upgrades, versionchange/close, corruption and canonical/digest checks. Tests must distinguish real Chromium from emulation; neither proves Safari/Firefox, user-eviction resilience, sudden power-loss durability or full offline preparation packs. Required Windows/Ubuntu repository checks remain in force. SEL05 and I1 remain partial until their broader acceptance conditions are met.

There is no approved old/new ADS schema pair. MigrationPlan/LossReport wire and real transformations remain pending; neither policy promotion nor bundle normalization is relabeled as migration. Library/package snapshot pins and entry public versions also require distinct contracts before a version resolver is adopted.
