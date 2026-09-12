# Pre-Studio retirement ledger

**Date:** 2026-09-12 \
**Status:** authorized active-tree retirement prepared for review; no new product implementation. \
**Decision:** choices `3,4`; see [ADR-0007](../adr/0007-git-reference-and-documentation-phase.md).

The reference directory contains inventory and restoration guidance; executable implementation remains only in the pinned Git snapshot and reference branch. No source copy was physically moved into `reference/`.

The [snapshot](../../reference/pre-studio/snapshot.json) preserves **442 files** at PR #24's pre-removal commit `1b7bd6843ac638fac89da424637afa755d076144`. This change removes **432 of those paths**, preserves LICENSE and `.gitignore` byte-for-byte, and revises eight lifecycle/documentation/workflow files. New ADR, reference and verifier files support maintenance only.

| Removed group | Files | Preserved content |
| --- | ---: | --- |
| Ten packages | 162 | source, types, generated definitions, tests and manifests |
| Normative specifications | 184 | schemas, registries, source manifests, positive/negative fixtures and goldens |
| Integration/source fixtures | 31 | parser inputs and behavior evidence |
| Default token sources | 4 | base/theme files and instructions |
| Former repository controls | 9 | three scripts; package, lock, workspace, two TS and Vitest configurations |
| Earlier documentation | 42 | previous ADRs/SSOT, architecture, specs, reports and reviews |
| **Total removed paths** | **432** | **All preserved at the pinned commit** |

This includes **131 TypeScript paths** (tests, type fixtures and Vitest included) and **three JavaScript policy scripts**. Counts describe files, not obsolete algorithms.

Original main `f368ae7d208424c922637ca625ab9687a85ed5b9` is recorded separately. Its 438 files predate ten package README additions, three lifecycle files and nine plan removals. Those nine removals happened before this revision and are not counted again here.

## Dependency completeness

Root scripts and TS references address all ten packages. Vitest scans packages; the spec manifest consumes schemas/fixtures; generators write fixed token, CSS and reference-type paths; policy scripts hardcode the graph. These artifacts are retired as one recoverable set. No active imports, generated targets or manifests point into removed directories.

The old CI steps are replaced by documentation-phase checks while retaining workflow/job identity. Removing source tests does not make those tests pass.

## Reuse candidates

Token validation, aliases, context resolution, default-system data and negative cases remain available, alongside Web CSS grammar, ordering, collision/provenance fixtures, condition analysis, behavior criteria and schema harness examples. They require new ownership and evidence after design approval. Earlier naming policy, concrete-name states, CSS-coupled motion and Recipe API do not become the new baseline by being preserved.

## Verification

```sh
python3 scripts/verify-retirement.py
python3 scripts/verify-retirement.py --self-test
```

The [verifier](../../scripts/verify-retirement.py) checks the complete Git inventory and hashes, restores all 442 archived files into a temporary directory, checks retired-path absence and unchanged legal files, and validates local Markdown links. Negative cases prove detection of digest corruption, package resurrection, broken links and newly introduced product source.

Local verification passed for all 442 restored files, 432 absent paths, 23 local links and four rejection cases. Actual local results are in the [machine-readable ledger](pre-studio-retirement.json). Old pnpm check/test/build are **not applicable to the active tree and are not reported as passing**. Their commands remain in the restored reference. Studio functionality, accessibility, motion and target rendering remain unimplemented/unverified here.

## Separate work

PRs [#23](https://github.com/Rengod95/Axiom-Design-System/pull/23) and [#12](https://github.com/Rengod95/Axiom-Design-System/pull/12) are untouched. LICENSE and visibility are unchanged; no history rewrite or npm registry action occurs.

The next sequence remains overall decision confirmation, index/development-direction confirmation, documentation and confirmation, then implementation. This maintenance layout does not approve the Foundation 1.0.0 document index.
