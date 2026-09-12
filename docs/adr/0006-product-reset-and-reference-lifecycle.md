# ADR-0006 — Product Reset and Reference Lifecycle

**Status:** ACCEPTED for lifecycle and approval sequencing only  
**Date:** 2026-09-12  
**Decision input:** Product owner's explicit request to retire unnecessary earlier implementation and establish Foundation 1.0.0 through staged confirmations.  
**Amends:** The scope of ADR-0001–0005, SSOT-00–05, old execution plans, and repository entry points as instructions for future product work.

## Decision

Axiom is being redesigned around Design System Builder in Axiom Studio. Initial authoring uses GUI and built-in AI. External React-code import, reverse reflection and repeated synchronization are excluded from initial scope. Exported code remains user-owned.

Foundation and component definitions share an Axiom syntax. Component contracts describe reusable UI purposes, values, events, behavior, accessibility and motion, without consuming-application business logic. Common meaning and tokens may be shared while Web and Mobile designs differ; Mobile is a design category, not the name of an output framework.

The ten existing packages are **deprecated as the new product implementation baseline** and retained as **frozen reference and reuse candidates** while their disposition is resolved. This is a repository lifecycle label, not an npm registry deprecation, security finding, or claim that every algorithm is obsolete. All current packages are private.

Old ADRs, SSOT, schemas and fixtures retain their meaning for interpreting and reproducing that reference implementation. They do not dictate the new Studio architecture, its feature scope or a continuation of the old N25/N26/Gate A execution plan. Do not weaken reference tests to make unapproved new semantics pass.

This ADR does **not** accept the 39 tasks' proposed answers, a new full ADS schema, a final module layout, a Foundation 1.0.0 document index, or a finished product.

## Required sequence for new product work

1. Collect and confirm the owner's decisions for D01–D39, preserving open questions and conflicts.
2. Propose the Foundation 1.0.0 document index and continuous development direction across product, business, technology, architecture, design, UX/UI, marketing and operations; obtain owner confirmation.
3. Write the complete documentation against that approved index, reconcile examples/contracts/evidence, and obtain owner confirmation of the baseline.
4. Start new product implementation only after that documentation confirmation.

Repository retirement is independently authorized now. It must not be used to bypass the new implementation gate. The exact source-retention choice is pending; physical source removal must identify preserved evidence and affected imports, generated destinations, schemas, manifests, tests and CI.

## Retirement in this change

- Remove superseded future execution-plan files from the active checkout. Their exact originals remain linked to the audited Git commit.
- Update entry points and legacy document lifecycle notices.
- Mark all ten packages as reference/reuse candidates at their package entry points.
- Preserve executable sources, schemas, token corpus, positive and negative fixtures, generated artifacts, dependency locks and quality checks as one reproducible set in this change.
- Keep open PR #23 and #12 intact. Re-evaluate their useful evidence separately; their older “next step” instructions do not authorize new product work.

See the [retirement ledger](../maintenance/pre-studio-retirement.md) for exact paths, dependency reasons, removal conditions and verification scope.

## Evidence scope

The source audit used main commit `f368ae7d208424c922637ca625ab9687a85ed5b9`, refreshed on 2026-09-12 without a new main commit. The ten packages and 438 tracked files are the pre-change inventory. Prior test results apply to their original revisions and are not Studio end-to-end evidence.
