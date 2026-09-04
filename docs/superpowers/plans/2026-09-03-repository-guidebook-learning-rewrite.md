# Axiom Repository Guidebook Learning Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `docs/guidebook.md` as a Korean, learner-centered N24 learning path while preserving complete and exact reference coverage for every current source module and repository policy script.

**Architecture:** Keep one guidebook with four deliberately different reading modes: Part I teaches one verified Button example, Part II gives task procedures, Part III explains design choices, and Part IV provides exact module/API lookup. Treat ADR, SSOT, schemas, registries, authored sources, and generated artifacts as external authorities that the guidebook explains but never changes.

**Tech Stack:** Markdown, Mermaid, Node.js 22 ESM, pnpm 11, TypeScript 7, Vitest 4

**Spec:** `docs/superpowers/specs/2026-09-03-repository-guidebook-learning-rewrite.md`

**Execution:** Completed on 2026-09-03; final evidence is recorded in `docs/implementation/2026-09-03-repository-guidebook-learning-rewrite.md`.

## Global Constraints

- Work on the existing `codex/add-repository-guidebook` branch. Do not create another branch or merge the PR.
- Preserve unrelated work and do not edit source implementation, ADR, SSOT, schemas, registries, fixtures, Token source, or generated artifacts.
- Use the verified current baseline: N0–N24 are current, N25 and later are planned, 10 packages exist, and the coverage checker requires 91 source modules plus 4 repository scripts.
- Keep `docs/guidebook.md` explicitly non-normative. Link each rule to the authority that owns it.
- Do not invent identifiers, paths, commands, values, inputs, outputs, errors, or future behavior.
- Preserve each exact `<!-- guidebook-module: ... -->` marker once and only once.
- Write natural Korean first. Retain English when it is a code identifier, search term, or semantic word whose nuance matters.
- Apply the Meatware Overclock teaching contract: visible learner map, prerequisite-safe concept order, worked examples, active recall, transfer prompts, self-repair, and failure-oriented maintenance guidance.

## Task 1: Freeze the executable inventory and rewrite anchors

**Files:**

- Read: `scripts/check-guidebook-coverage.mjs`
- Read: `docs/guidebook.md`
- Read: `packages/*/src/**/*.{ts,tsx}`
- Read: root `*.mjs`
- Read: `tokens/base.tokens.json`
- Read: `spec/token/foundation-resolved-token-manifest.json`
- Read: `spec/css/token-binding-catalog.json`
- Read: `fixtures/button/appearance.ts`
- Modify: `docs/superpowers/plans/2026-09-03-repository-guidebook-learning-rewrite.md`

- [ ] Run `pnpm guidebook:check` and record the expected pre-rewrite failure: 95 required entries, 48 documented, 47 missing.
- [ ] Extract the 95 required marker paths using the same inclusion and exclusion rules as the checker.
- [ ] Group the 91 modules by package and the 4 scripts by policy responsibility.
- [ ] Inspect each module's exports, dependencies, validation errors, and nearby tests or fixtures before describing it.
- [ ] Verify the Button chain and record its exact authored, resolved, binding, and consumer evidence paths.
- [ ] Confirm that the Button appearance fixture refers directly to the Semantic Token and does not falsely imply use of the Component Token.
- [ ] Mark the current N24 boundary and the planned N25+ behavior before writing future-facing prose.

**Checkpoint evidence:**

```bash
pnpm guidebook:check
```

Expected before the rewrite: non-zero exit with 47 missing markers. Any different count requires stopping to reconcile the design spec with the repository.

## Task 2: Rewrite Part I — Learn Axiom

**Files:**

- Modify: `docs/guidebook.md`
- Read: `README.md`
- Read: `docs/architecture.md`
- Read: `docs/decisions/README.md`
- Read: `docs/ssot/*`
- Read: `spec/README.md`

- [ ] Replace the catalog-first opening with audience, prerequisites, reading routes, authority notice, and a map of Parts I–IV.
- [ ] Explain Axiom's user problem before introducing package or module names.
- [ ] Introduce `contract`, `source of truth`, `authoring`, and `generated artifact` from familiar TypeScript/build examples.
- [ ] Present the full current data flow within the first 20% of the document.
- [ ] Teach the verified Button chain:

```text
color.component.button.root.background.default
→ color.semantic.fill.brand.default
→ color.primitive.brand.600
→ light/dark resolution
→ foundation-resolved-token-manifest.json
→ background-color eligibility
```

- [ ] Explain that N24 appearance authoring uses the connected Semantic Token directly in `fixtures/button/appearance.ts`.
- [ ] Explain parser, adapter, vendor output, normalization, JSON-safe values, alias, resolver, validation, manifest, registry, and profile only after the problem each solves is visible.
- [ ] Teach repository areas and all 10 packages at responsibility level, keeping helper inventories out of the learning flow.
- [ ] Explain Token tiers, theme contexts, CSS property profile, JSON Schema, runtime validation, semantic validation, state, condition, context, and Appearance IR using example-first code sandwiches.
- [ ] Add misconception checks, short recall prompts, and transfer prompts at useful chapter boundaries.
- [ ] Clearly label simplified examples and current repository examples.
- [ ] Where an analogy is used, state the point where the analogy stops matching the implementation.
- [ ] End Part I with a compact answer-back checklist covering the ten learning goals.

**Part I self-check:**

- The purpose and full data flow appear before module details.
- Hiding English terms still leaves the Korean explanation understandable.
- No core term is defined only by another undefined term.
- Every substantial code block has setup, line-by-line interpretation, expected result, and repository connection.

## Task 3: Rewrite Part II — Work with Axiom

**Files:**

- Modify: `docs/guidebook.md`
- Read: root `package.json`
- Read: package `package.json` files
- Read: generation and validation scripts
- Read: relevant tests and fixtures

- [ ] Add a task-to-authority lookup that points readers to authored inputs rather than generated outputs.
- [ ] Write procedures for adding or changing a Token, changing a Semantic Token, changing semantic vocabulary, adding schema and fixtures, changing CSS property policy/bindings, and adding semantic validation.
- [ ] Write procedures for regenerating artifacts, tracing a validation failure, moving from an error message to its owner module, and tracing an input to its current final N24 artifact.
- [ ] Give each procedure: trigger, authority, smallest real example, source files, exact commands, expected evidence, common failures, generated files not to hand-edit, and Part III/IV links.
- [ ] Use `pnpm tokens:generate`, `pnpm profile:generate`, and `pnpm contracts:generate` only where their actual scripts and ownership support them.
- [ ] Make failure lookup operational: identify the likely layer, diagnostic shape, evidence fixture/test, and next narrow command.
- [ ] State that final CSS text emission is planned N29 behavior, not a current N24 result.

**Part II self-check:** every how-to has a real starting file and a verification command; no command or output is guessed.

## Task 4: Rewrite Part III — Architecture Explanations

**Files:**

- Modify: `docs/guidebook.md`
- Read: relevant ADR and SSOT documents
- Read: `spec/**/*.{md,json}` selectively for the concept being explained
- Read: `packages/*/src/**/contracts.ts`
- Read: package entrypoints

- [ ] Explain contract-first architecture and `contracts.ts` responsibility boundaries through the Button example.
- [ ] Distinguish authored source, raw input, parsed input, normalized data, resolved data, effective policy, canonical form, and generated artifact.
- [ ] Explain parsing versus normalization versus resolution without collapsing them into one transformation.
- [ ] Explain serialization/deserialization and deterministic canonicalization with small JavaScript/JSON examples and actual repository connections.
- [ ] Compare schema, JSON Schema, TypeScript type, runtime validation, and semantic validation.
- [ ] Compare registry, manifest, and profile using exact owner, input, output, and consumer distinctions.
- [ ] Explain digest, pinning, provenance, Domain, Modifier, state, condition, context, IR, diagnostic, projection, boundary, public/internal API, entrypoint, and dependency direction.
- [ ] Explain ADR, SSOT, `spec/`, and executable contract authority without granting the guidebook normative status.
- [ ] Explain why repository policy scripts are part of architectural enforcement.
- [ ] Include the required English nuance notes once at first meaningful use and keep terminology stable thereafter.
- [ ] Add a supporting glossary that points back to first-use explanations rather than replacing them.

**Part III self-check:** every explanation reuses an example or mental model established in Part I, and every architectural rule names its authority.

## Task 5: Rebuild Part IV — Module & API Reference

**Files:**

- Modify: `docs/guidebook.md`
- Read: all 91 current package source modules
- Read: the 4 current root policy scripts
- Read: matching tests, schemas, registries, and fixtures

- [ ] Create one reference entry per checker-discovered path and place its exact marker immediately with that entry.
- [ ] Organize entries by the 10 package responsibilities, followed by repository policy scripts.
- [ ] For each package, start with user-facing purpose, encounter point, smallest input/output, public API, processing flow, directories, failures, evidence, dependency direction, and links back to Parts I–III.
- [ ] For each module, document its concrete responsibility, important exports, inputs/outputs/errors, dependencies, and relevant evidence without inventing public status.
- [ ] Explain `constants.ts`, `contracts.ts`, `index.ts`, and `cli.ts` as responsibility boundaries, not filename trivia.
- [ ] Include type-test and support modules because the checker includes them; clearly state their compile-time or test-support role.
- [ ] Keep each marker unique even when a module is mentioned elsewhere.
- [ ] Generate a marker inventory and compare it byte-for-byte with the checker's expected path set.

**Checkpoint evidence:**

```bash
pnpm guidebook:check
```

Expected after Part IV: `guidebook coverage OK (95/95: 91 package modules, 4 scripts).`

## Task 6: Align navigation, checkpoint status, and the work learning record

**Files:**

- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/architecture.md`
- Add: `docs/implementation/2026-09-03-repository-guidebook-learning-rewrite.md`

- [ ] Point the root README and docs index to the four guidebook reading modes and label the guidebook non-normative.
- [ ] Correct the docs-index ADR numbering defect without changing ADR contents or authority.
- [ ] Update only stale non-normative checkpoint text in `docs/architecture.md` from N18 to current N24 facts.
- [ ] Keep historical and normative documents unchanged.
- [ ] Write the work-specific learning record with verified baseline, Button trace, current/planned boundary, review findings, commands, failures encountered, and evidence paths.
- [ ] Ensure the learning record does not duplicate the stable guide or introduce a competing authority.

## Task 7: Run editorial and technical QA passes

**Files:**

- Modify as needed: `docs/guidebook.md`
- Modify as needed: `README.md`
- Modify as needed: `docs/README.md`
- Modify as needed: `docs/architecture.md`
- Modify as needed: `docs/implementation/2026-09-03-repository-guidebook-learning-rewrite.md`

- [ ] Novice-reader pass: verify prerequisite order, first-20% system understanding, Korean-only comprehensibility, and no helper-list dependency.
- [ ] Jargon-density pass: split sentences or paragraphs that introduce too many unexplained concepts.
- [ ] Terminology pass: keep schema/contract/registry/manifest and raw/normalized/resolved/effective/canonical distinct; keep current/planned/proposed distinct.
- [ ] Technical-accuracy pass: recheck all example values, paths, package relationships, commands, and N24 boundaries against current files.
- [ ] Code-sandwich pass: find every fenced block and verify meaningful lead-in and follow-through.
- [ ] Analogy pass: find analogy language and add its limit where missing.
- [ ] Coverage pass: prove 95 unique markers and no unexpected marker.
- [ ] Link pass: verify every relative Markdown link and anchor in changed documentation.
- [ ] Scope pass: verify no source, generated artifact, ADR, SSOT, schema, registry, fixture, or Token input changed.
- [ ] Search for unfinished language or placeholders:

```bash
rg -n 'TODO|TBD|FIXME|placeholder|나중에 작성|추후 작성' \
  docs/guidebook.md README.md docs/README.md docs/architecture.md \
  docs/implementation/2026-09-03-repository-guidebook-learning-rewrite.md
```

Expected: no matches introduced by this rewrite.

## Task 8: Run the complete repository gates and hand off

**Files:**

- Verify: all changed documentation and retained PR #12 coverage files

- [ ] Read and apply `superpowers:verification-before-completion` before making any completion claim.
- [ ] Run the exact requested gates from a built workspace:

```bash
pnpm guidebook:check
pnpm check
pnpm test
pnpm build
git diff --check origin/main...HEAD
```

- [ ] If a gate fails, diagnose the root cause before editing; do not weaken a test or checker to make it pass.
- [ ] Inspect `git status --short`, `git diff --stat origin/main...HEAD`, and the final changed-path list.
- [ ] Confirm 95/95 marker coverage, valid local links, current N24/planned N25+ labeling, and docs-only content changes beyond the already approved PR #12 checker integration.
- [ ] Commit the completed rewrite on the existing branch with a focused documentation commit.
- [ ] Push the existing branch to update PR #12 without merging it.
- [ ] Report changed documents, Part I–IV outcomes, exact running-example paths, coverage, commands and results, unresolved contradictions, planned items, and the no-source/no-generated-change confirmation.
