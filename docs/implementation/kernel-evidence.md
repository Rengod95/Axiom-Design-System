# ADS document kernel: scope, evidence and next work

Profile: [ADR-0009](../adr/0009-ads-kernel-implementation-bootstrap.md) and [ADR-0010](../adr/0010-source-preserving-draft-authoring.md), accepted 2026-09-13 after the audited Foundation merged in [PR #25](https://github.com/Rengod95/Axiom-Design-System/pull/25) and the owner requested continuation. This is a bounded I1 source-authoring implementation, not completion of I1 or the full Studio product.

## Implemented user flow

The [CLI quickstart](kernel-quickstart.md) exercises a real local project: create, capture malformed sources as private immutable drafts, repair a selected draft, review/apply new or updated documents, reopen, inspect diagnostics/history, delete, Undo/redo and export original/normalized sources together. Invalid review/update batches do not partly apply. Draft capture preserves bounded UTF-8 text and diagnostics without changing the active document revision. No imported content is evaluated.

The [core public API](../../modules/ads-core/src/index.ts) implements bounded profiles of seven existing command names plus project/document/history, draft, diagnostic and source-export queries. An authenticated local principal, requested scopes, base revision, candidate digest, opaque approval and idempotency receipt are checked before mutation. Exact currently authorized retries return the durable original result, including after newer document revisions; changing the payload under the same scoped key conflicts. The memory adapter supports isolated tests; the filesystem adapter persists state, candidate, receipt and inverse snapshots together. [The implementation map](implementation-roadmap.json) marks partial profiles separately from the full catalog contracts.

The [local store](../../modules/local-store/src/index.ts) serializes cooperating processes with an exclusive writer lock. A complete immutable payload is prepared before an atomic commit-marker rename; recovery verifies exact encoded bytes, digests and a unique parent chain. A damaged committed payload, missing history or ambiguous chain produces an error. Explicit recovery removes a writer lock only after its same-host PID is proven absent. No time-based automatic lock deletion is used.

## Reproducible evidence

Run `pnpm check`, `pnpm test` and `pnpm build` with the pinned toolchain. The test launcher fails if any module's test directory is missing or empty. The [Quality Gate](../../.github/workflows/quality.yml) runs the documentation, frozen-reference and new product checks independently on Windows and Ubuntu; the PR's exact commit status is the authority for CI completion.

| Evidence | Boundary exercised |
|---|---|
| [Core command tests](../../modules/ads-core/test/command-service.test.ts) | Actor/scope authorization, null-base create, exact and conflicting replay, stale candidate approval, atomic batch, reference-safe deletion, inverse-history conflicts |
| [JSON and envelope tests](../../modules/ads-core/test/json-and-documents.test.ts) | Duplicate keys, non-finite/precision-losing numbers, bounded depth/expanded bytes, opaque preservation, no accessor execution, exact UTF-8 source |
| [Source authoring tests](../../modules/ads-core/test/source-workflow.test.ts) | Private draft capture/repair, reviewed replacement, field diffs, revision/kind/schema checks, original/normalized export, query identity isolation |
| [Generated schema tests](../../modules/ads-core/test/schema-validation.test.ts) | Field/type corpus, differential Ajv results, diagnostic locations, execution with runtime code generation disabled |
| [Filesystem tests](../../modules/local-store/test/file-store.test.ts) | Independent-process concurrent writes, interrupted prepare/commit, reopen with receipts, corrupt bytes/records, missing or branching history, path and symlink rejection, live/dead writer recovery |
| [CLI integration tests](../../apps/cli/test/cli.test.ts) | Separate-process authoring/approval/Undo/redo, Korean source preservation, invalid UTF-8 and batch atomicity, stale approval, CLI diagnostics, real-store replay after later edits |
| [Module guard](../../scripts/check-implementation.mjs) | AST-based dependency direction/public barrels, portable core, code-generation/type-suppression boundaries and eight negative cases |
| [Foundation verifier](../../scripts/verify-foundation.py) | All 56 bodies, approved decision ownership, links/anchors, command and field projections, governed annex hashes and targeted negative cases |
| [Reference verifier](../../scripts/verify-retirement.py) | Exact frozen 442-file restoration, 428 retired paths still absent, four explicitly approved replacement root files, legal-file preservation and seven negative cases |

The Windows quickstart was also executed as separate CLI invocations with a BOM-free PowerShell UTF-8 file. Build output uses emitted `.js` imports and can be run directly with Node. Documentation evidence and runtime evidence remain separate; the tests cover the bounded profile and do not validate all Foundation semantics.

## Limits and next implementation

- The generated schema checks the common header, object-valued metadata/extensions and recognized local typed references. Full ADS domain schemas, registered migration transforms and domain-aware unresolved editing remain I1 work. Future schemaVersion strings are preserved and explicitly unverified; unknown kinds can be captured as drafts but not adopted as supported envelopes.
- Review import creates new identities; update replaces an explicitly matched existing identity under source/project revision guards and approval. Schema/kind conversion, automatic rebasing and selective collaborative Undo remain unsupported. Known domain fields remain unverified even when the envelope passes.
- State snapshots, drafts, candidates, inverse history and receipts are retained. Recovery memory is bounded by sequential history validation and state encoding preflights expanded size, but scan time still grows with history. No compaction, garbage collection or long-history capacity guarantee is claimed. The store assumes a trusted local filesystem, not hostile OS processes or a shared network volume. Process-crash tests do not prove power-loss durability.
- A crash while writing lock metadata or during lock recovery can leave an unverifiable lock or recovery gate. The adapter stops for inspection; it does not guess an owner or erase the gate. General recovery tooling and operational UX remain later work.
- The local principal is supplied by the CLI's trusted process adapter. Network/API authentication, memberships, Browser storage, remote synchronization and collaboration are not implemented.

Next, finish the I1 schema/migration and editable-draft contracts with representative positive and negative fixtures, then implement the I2 token/theme flow with the approved standard comparison evidence. I3 adds Button/Card/Toast editing and preview. I4 proves React/RN delivery and AI candidate checks; I5 expands to the full catalog and Swift/Android; I6 supplies release evidence. These are the existing [OPS04 milestones](../foundation/operations/development-and-maintenance.md), not a reduction of the approved first-release scope.
