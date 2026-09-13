# ADR-0009 — ADS document kernel implementation bootstrap

Status: ACCEPTED for the bounded I1 document-kernel profile

Date: 2026-09-13. Owner: product owner; executor: Codex.

## Authorization and scope

The owner's conditional request was fulfilled by the [56-document audit](../foundation/audits/completeness-review.md). PR #25 merged as `04c762c384bf41168a843649c542f5d69c04734b` after Quality Gate succeeded on `35916efcbe6390149446d826d8018fba04a2a180`. The [approval record](../decisions/axiom-foundation-baseline-approval.json) preserves the user request. This ADR accepts implementation bootstrap before product source is added, as required by ADR-0007.

The first deliverable is a runnable local document workflow: create a project, import native ADS envelopes as explicitly unverified drafts, review/apply an atomic candidate, inspect/history, delete with reference protection, Undo/redo, close/reopen and recover after interrupted local writes. It establishes storage and authoring contracts; it does not implement full component/token semantics, the Studio UI, Browser storage, AI execution, package installation or native output.

## Implementation profile and ownership

- `modules/ads-core`: browser-neutral TypeScript data contracts, strict JSON/envelope checks, typed command processing, candidates/approval, immutable receipts, current revision and Undo/redo. It imports no Node, UI, DB or AI SDK.
- `modules/local-store`: Node filesystem adapter implementing the same transactional store port. Immutable payload plus commit marker, digest/parent-chain recovery and an exclusive writer lock. No silent stale-lock deletion; process-crash guarantees are distinguished from power-loss durability.
- `apps/cli`: Node command-line adapter, local authenticated principal, original source loading and review/apply interaction. It exposes only the bounded supported operations and reports envelope-only validation.
- Product tests belong with these three modules. Shared compiler/build and the repository test launcher are maintenance files, not an implicit revival of the old package graph.

The private workspace uses Node `24.19.0`, pnpm `11.19.0`, TypeScript `5.9.3` (Apache-2.0) and `@types/node` `24.13.4` (MIT), pinned in manifests/lock. These are selected for this tested profile, not asserted to be latest. There are no product runtime dependencies. Type stripping runs erasable TS; separate strict `tsc` checks and emitted JS builds are required because Node stripping does not type-check. References: [Node 24 TypeScript](https://nodejs.org/docs/latest-v24.x/api/typescript.html), [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html).

These directories are logical modules within one private package. Until independent packages are justified, relative imports through another module's public `src/index.ts` are allowed; imports into its internal files are prohibited. This explicitly scopes the source standard's package-import rule to the current single-package layout. TypeScript rewrites the relative `.ts` specifiers to `.js` on emit, so the built CLI must execute the emitted modules rather than resolve back to source. Review this exception when introducing workspace package exports.

This profile uses a small envelope checker and keeps domain content opaque/unverified. SEL04's complete public schema/type-generation choice remains pending; this is not a handwritten substitute for full ADS validation. Similarly it does not select a token standard. Unknown extensions and original UTF-8 bytes are preserved and never evaluated. No generic arbitrary-path mutation command is exposed.

## Stable behavioral contract

The supported core commands use the existing operation names: project.create, document.import, entity.delete, transaction.review, transaction.apply, transaction.undo and transaction.redo. Queries describe the project, read documents and list history. Input protocol `0.1.0` is a bounded implementation profile, separate from Foundation document version `1.0.0`. Unsupported operations return an explicit diagnostic.

The CLI resolves `document.import.sourceRefs` to `{uri, content}` records in its trusted local adapter; formatProfile is `ads-envelope` and importMode is `review`. The original UTF-8 text is retained alongside the parsed envelope. Domain interpretation is always marked unverified. Structurally invalid JSON/envelopes reject the complete batch. Review-required import/delete creates a durable candidate without a new project revision. Reviewer authorization records an opaque token bound to principal, candidate digest and base. Apply revalidates under the same store transaction before one document revision and receipt are committed. No network API authentication implementation is implied by the trusted local principal adapter.

Core state carries the project snapshot, candidates, receipts and Undo/redo together. Exact authorized retries return the original receipt; a new payload under the same key conflicts. All stale bases conservatively conflict in I1; automatic rebasing remains later. Reference protection covers recognized local typed Ref objects outside opaque extensions/metadata, and cannot certify arbitrary future domain semantics. Individual Undo/redo acts only on the current applicable history; it cannot overwrite intervening document changes.

## Phase and validation

The [implementation profile](../implementation/ads-kernel-profile.json) lists the newly allowed source roots and explicitly reintroduced root toolchain files. It amends ADR-0007's documentation-only allowlist, not the frozen snapshot. `packages/`, `spec/`, `fixtures/` and `tokens/` remain retired. LICENSE and `.gitignore` remain byte-identical. Restored reference files and tests retain their historical meaning.

Required checks: reproducible Foundation verification, frozen-snapshot preservation with its negative cases, source-boundary/allowlist checks, strict TS, JS emit and real Node tests. Tests must cover actor/scope failure, identical/conflicting replay, null-base create, stale approval, invalid batch atomicity, original source/unknown data preservation, reference-safe deletion, Undo/redo/restart, concurrent writers, interrupted prepare/marker writes, damaged committed data and traversal/symlink paths. Test discovery may not silently pass zero tests.

Review this profile before adding another source root, public package, external effect or renderer. Later I2–I6 milestones retain the full approved release scope. A usable CLI kernel is only the first implementation result.
