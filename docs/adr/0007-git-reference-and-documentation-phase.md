# ADR-0007 — Git Reference and Documentation Phase

**Status:** ACCEPTED for retirement and lifecycle only \
**Date:** 2026-09-12 \
**Owner:** Product owner; Codex executes authorized repository maintenance \
**Decision input:** Owner response to 정리-01: `3,4` \
**Amends:** ADR-0006 retention state; AGENTS phase checks; source standard enforcement and sections 5, 6.2 and 9 in this documentation-only checkout.

## Interpretation and decision

Option 3 requested a reference space separated from active product code. Option 4 requested keeping implementation only in Git and starting from new design documents. Applying both literally would duplicate source in the checkout while claiming it exists only in Git.

The combined interpretation is explicit: **the reference directory contains inventory and restoration guidance; executable source exists only at the pinned Git snapshot, also reachable through a reference branch.** No source files are physically relocated into that directory. This preserves both purposes while taking the Git-only choice as the storage rule.

Remote `reference/pre-studio` was verified at `1b7bd6843ac638fac89da424637afa755d076144` before removal. The commit, not the movable branch name, identifies restoration. Original main `f368ae7d208424c922637ca625ab9687a85ed5b9` is recorded separately because the snapshot already includes prior lifecycle notices and nine plan removals.

Remove the complete dependency set together: packages, schemas/fixtures, integration inputs, tokens, generators, manifests/lock, TypeScript/Vitest configuration and old CI steps. Preserve exact content in the 442-file snapshot inventory. LICENSE and `.gitignore` remain unchanged.

Previous architecture/implementation documents are retained in the same Git snapshot instead of competing as active instructions. Current lifecycle ADRs, engineering principles and maintenance records remain. Selective reuse requires a new contract owner and appropriate evidence after design approval; this retirement creates no replacement implementation.

## Rule exceptions, scope and review

- **Scope:** the active documentation-phase checkout. Restored source retains its original rules and checks.
- **Rules changed:** the standard's fixed package directory table, NodeNext requirement and pnpm checks no longer assert an active source workspace. They remain reference-specific until a new approved implementation profile exists.
- **Replacement checks:** snapshot/hash integrity, archive restoration, unchanged legal files, retired-path absence and local document links using Python standard-library maintenance tooling.
- **Owner:** product owner; executor must preserve provenance and report evidence scope.
- **Review condition:** after complete Foundation documentation confirmation and explicit implementation authorization, accept an implementation-bootstrap ADR before replacing the phase guard with product builds/tests. Decide new source ownership and checks instead of accidentally restoring the former layout.

The verifier is repository maintenance, not Studio implementation. Passing does not prove product functionality, accessibility, motion or platform conformance. Removing a test suite never counts as that suite passing.

## Consequences

The active tree does not impose the former CSS/state/token architecture on new design. Historical behavior is inspectable from its complete locked snapshot. Restoring bytes does not guarantee indefinite availability of old package downloads or toolchains.

LICENSE and visibility are unchanged. No Git history is rewritten, no npm registry action occurs and PRs #23 and #12 are untouched; this change updates the existing retirement PR #24. The maintenance layout is not the Foundation 1.0.0 document index.

See the [ledger](../maintenance/pre-studio-retirement.md) and [restoration guide](../../reference/pre-studio/README.md).
