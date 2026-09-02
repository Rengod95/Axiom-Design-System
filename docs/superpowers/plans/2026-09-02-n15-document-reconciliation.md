# N15 Document Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the accepted Token clean break and implemented N0–N15 baseline into every active authority document before N16.

**Architecture:** Preserve ADR → SSOT → machine-readable contract authority while recording owner directives as the requirement input that caused ADR-0004. Correct active examples against the resolved manifest, close the Motion input and identity gaps, and retain historical reports as point-in-time evidence.

**Tech Stack:** Markdown, JSON registries, pnpm repository quality gates

**Spec:** `docs/superpowers/specs/2026-09-02-n15-document-reconciliation.md`

## Global Constraints

- Token clean-break requirements and the current 635-ID manifest supersede conflicting draft Token prose.
- Do not modify normative JSON, generated artifacts, or runtime/compiler source in this PR.
- Do not rewrite historical implementation outcomes; mark their authority and current replacement clearly.
- N16 remains the next implementation boundary.

---

### Task 1: Reconcile authority and Token documentation

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/adr/0004-token-vocabulary-and-color-profile.md`
- Modify: `docs/ssot/00-system-architecture-and-standards-profile.md`
- Modify: `docs/ssot/01-foundation-and-domain-contracts.md`
- Modify: `docs/specs/token-domain-and-css-binding-catalog.md`

**Interfaces:**
- Consumes: ADR-0004 and `spec/token/foundation-resolved-token-manifest.json`
- Produces: Current Token authority, paths, and version baseline

- [ ] Replace obsolete normative Token examples with manifest-backed IDs.
- [ ] Record the owner-directive → ADR → SSOT reconciliation rule.
- [ ] Separate document, schema, profile, and generator version meanings.
- [ ] Run the Markdown Token-path audit and require no unexplained current-path misses.

### Task 2: Reconcile Motion and behavior readiness

**Files:**
- Modify: `docs/ssot/02-adapter-contract-readiness-and-governance.md`
- Modify: `docs/ssot/04-environment-conditions-and-motion.md`
- Modify: `docs/ssot/05-react-runtime-behavior-and-public-api.md`
- Modify: `docs/specs/react-aria-behavioral-criteria.md`

**Interfaces:**
- Consumes: Canonical State Registry and Condition Registry
- Produces: Unambiguous N16 compiler input and reduced-motion identity mapping

- [ ] Add the Condition Registry to the Motion compiler input.
- [ ] Define preference, strategy, and lifecycle responsibilities.
- [ ] Replace stale Motion and breakpoint Token paths.
- [ ] Mark React Aria versions as an N17 candidate until the lockfile pins them.

### Task 3: Reconcile current architecture and sequencing

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/plans/2026-09-01-foundation-and-implementation-plan.md`
- Modify: `docs/plans/2026-09-01-post-p3-foundation-review.md`
- Create: `docs/implementation/2026-09-02-n15-document-reconciliation.md`

**Interfaces:**
- Consumes: `spec/manifest.json`, package graph, PR #10 recovery state
- Produces: Current N0–N15 inventory and N16 handoff

- [ ] Record 33 schemas, 14 registries, 23 fixture suites, and N15 completion.
- [ ] Replace obsolete migration paths and update the package/validator map.
- [ ] Record the stacked-PR recovery without making it normative authority.
- [ ] Link the reconciliation evidence from the documentation index.

### Task 4: Verify and hand off

**Files:**
- Verify: all modified documentation and unchanged normative/generated artifacts

**Interfaces:**
- Consumes: reconciled repository tree
- Produces: reviewable docs-only PR against `main`

- [ ] Run local-link and Token-path audits.
- [ ] Run `pnpm check`, `pnpm test`, and `pnpm build`.
- [ ] Confirm `git diff --check`, a clean generated-artifact diff, and the exact PR base/head.
- [ ] Create the PR and wait for the exact-head Quality Gate result.
