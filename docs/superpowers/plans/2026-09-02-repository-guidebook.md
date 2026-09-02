# Axiom Repository Guidebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 처음 온 contributor가 Axiom의 authority, data flow, package boundary와 모든 현재 source module/API 역할을 한 문서에서 이해할 수 있는 한국어 가이드북을 제공한다.

**Architecture:** `docs/guidebook.md`가 유일한 reader-facing narrative와 reference를 함께 소유한다. `scripts/check-guidebook-coverage.mjs`는 package non-test source와 repository policy script의 path marker를 대조해 module 누락을 막고, 기존 ADR·SSOT·`spec/`는 계속 normative authority로 남는다.

**Tech Stack:** Markdown, Mermaid, Node.js 22 ESM, Vitest 4, pnpm 11

**Spec:** `docs/superpowers/specs/2026-09-02-repository-guidebook-design.md`

## Global Constraints

- 본문은 한국어로 작성하고 code identifier, signature, package name과 path는 영문 원문을 유지한다.
- 가이드북은 `Non-normative orientation`이며 ADR, SSOT, schema, registry를 대체하지 않는다.
- 모든 패키지 비테스트 source module 44개와 최종 repository policy script 4개를 설명한다.
- named function, arrow-function constant, class, constructor, method, getter, setter와 exported contract의 역할을 module별로 설명한다.
- generated Token path와 CSS property union member를 복제하지 않고 provenance, generator, consumer와 drift gate를 설명한다.
- 새 function과 method에는 역할을 설명하는 영문 JSDoc을 작성한다.
- source implementation과 normative contract는 변경하지 않는다.
- NodeNext relative import에는 emitted target인 `.js` 확장자를 유지한다.

---

### Task 1: Guidebook module coverage gate

**Files:**
- Create: `scripts/check-guidebook-coverage.mjs`
- Create: `scripts/check-guidebook-coverage.test.mjs`
- Modify: `vitest.config.ts`
- Modify: `package.json`
- Create initially: `docs/guidebook.md`

**Interfaces:**
- Consumes: repository root, `docs/guidebook.md`, `<!-- guidebook-module: path -->` markers
- Produces: `collectGuidebookModules(markdown)`, `discoverGuidebookModules(repositoryRoot)`, `compareGuidebookModules(actualPaths, documentedPaths)`, `checkGuidebookCoverage(repositoryRoot)` and the `pnpm guidebook:check` command

- [ ] **Step 1: Add the checker unit tests before the implementation**

Create `scripts/check-guidebook-coverage.test.mjs` with real filesystem and pure comparison cases:

```js
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  collectGuidebookModules,
  compareGuidebookModules,
  discoverGuidebookModules,
} from "./check-guidebook-coverage.mjs";

describe("guidebook coverage", () => {
  test("reports missing, stale, and duplicate module markers", () => {
    const documented = collectGuidebookModules([
      "<!-- guidebook-module: packages/example/src/index.ts -->",
      "<!-- guidebook-module: scripts/stale.mjs -->",
      "<!-- guidebook-module: scripts/stale.mjs -->",
    ].join("\n"));

    expect(compareGuidebookModules(
      ["packages/example/src/index.ts", "scripts/check.mjs"],
      documented,
    )).toEqual([
      "Missing guidebook module: scripts/check.mjs",
      "Stale guidebook module: scripts/stale.mjs",
      "Duplicate guidebook module: scripts/stale.mjs",
    ]);
  });
});
```

Extend `TEST_FILE_PATTERNS` in `vitest.config.ts` with `scripts/**/*.test.mjs` so this test is part of `pnpm test`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm exec vitest run scripts/check-guidebook-coverage.test.mjs
```

Expected: FAIL because `scripts/check-guidebook-coverage.mjs` does not exist.

- [ ] **Step 3: Implement the smallest deterministic checker**

Create the ESM checker with package source discovery, script discovery, marker parsing, stable sorting, explicit diagnostics, CLI execution detection and English JSDoc on every function. Exclude `*.test.ts`, `*.test.tsx`, `*.test.mjs`, and generated `dist/` trees from discovery.

- [ ] **Step 4: Add the command and a complete marker skeleton**

Add:

```json
"guidebook:check": "node scripts/check-guidebook-coverage.mjs"
```

Run it from the aggregate `check` command after boundary validation. Create `docs/guidebook.md` with all 48 module markers so the repository command can pass while prose is filled in.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm exec vitest run scripts/check-guidebook-coverage.test.mjs
pnpm guidebook:check
```

Expected: all checker tests pass and the command reports 48 documented modules.

- [ ] **Step 6: Commit the coverage gate**

```bash
git add scripts/check-guidebook-coverage.mjs scripts/check-guidebook-coverage.test.mjs vitest.config.ts package.json docs/guidebook.md docs/superpowers/specs/2026-09-02-repository-guidebook-design.md docs/superpowers/plans/2026-09-02-repository-guidebook.md
git commit -m "test: enforce guidebook module coverage"
```

### Task 2: Mental model and repository navigation

**Files:**
- Modify: `docs/guidebook.md`

**Interfaces:**
- Consumes: `docs/README.md`, `docs/architecture.md`, accepted ADRs, SSOT-00–05, `spec/manifest.json`, root configuration
- Produces: guidebook sections 1–7 covering reading instructions, authority, repository map, topology, concepts, flows, workspace and commands

- [ ] **Step 1: Write the non-normative reading contract and current checkpoint**

State the N0–N15 baseline, distinguish current implementation from N16+ plans, and link every normative claim to its owning document.

- [ ] **Step 2: Add compact architecture visuals**

Add Mermaid diagrams for authority cascade, package dependency graph, Token flow, CSS profile flow and specification validation flow. Keep all current topology separate from future packages.

- [ ] **Step 3: Explain every root directory and operational file**

Cover `README.md`, `AGENTS.md`, workspace/TypeScript/Vitest configuration, `docs/`, `spec/`, `fixtures/`, `tokens/`, `packages/`, `scripts/`, `.github/`, generated `dist/`, and ignored dependencies with owner and change rules.

- [ ] **Step 4: Verify navigation content**

Run:

```bash
pnpm guidebook:check
git diff --check
```

Expected: 48 documented modules and no whitespace errors.

- [ ] **Step 5: Commit the narrative foundation**

```bash
git add docs/guidebook.md
git commit -m "docs: explain Axiom architecture and data flows"
```

### Task 3: Complete package, module, and API reference

**Files:**
- Modify: `docs/guidebook.md`

**Interfaces:**
- Consumes: all 44 `packages/*/src/**/*.ts` non-test modules, their colocated tests, public `index.ts`, package manifests and related normative sources
- Produces: package guides and module entries using the Role/Inputs/Outputs/Dependencies/Side effects/Related evidence contract

- [ ] **Step 1: Document `@axiom/tokens`**

Explain its 8 modules, public contracts, identity validation, JSON value guard, context resolution, manifest serialization, generated Token paths and public export boundary. Include every named function, class/method and exported contract group.

- [ ] **Step 2: Document `@axiom/token-tooling`**

Explain its 8 modules, Terrazzo adapter, DTCG value validation, foundation policy, OKLCH conversion and deterministic artifact generation. Include all named functions, classes/methods and exported contract groups.

- [ ] **Step 3: Document `@axiom/css-property-profile`**

Explain its 13 modules, Webref adapter, canonical serialization, stable order, profile generation/diff, generated types, grammar validator and Token binding validator. Include all named functions, classes/methods and exported contract groups.

- [ ] **Step 4: Document `@axiom/spec-tooling`**

Explain its 15 modules, manifest harness, canonical digest, semantic dispatch and State/Condition/Token/Appearance validators. Include all named functions, classes/methods and exported contract groups.

- [ ] **Step 5: Reconcile symbol coverage against source**

Use repository search to list every named top-level function, function-valued constant, class member and public re-export. Check each identifier against its module table and record no unexplained symbol omissions.

- [ ] **Step 6: Verify and commit the reference**

Run:

```bash
pnpm guidebook:check
git diff --check
```

Then commit:

```bash
git add docs/guidebook.md
git commit -m "docs: catalog Axiom packages modules and APIs"
```

### Task 4: Contributor workflows and entry points

**Files:**
- Modify: `docs/guidebook.md`
- Modify: `README.md`
- Modify: `docs/README.md`

**Interfaces:**
- Consumes: package test files, `spec/fixtures/`, generation commands, policy scripts and documentation authority index
- Produces: change recipes, diagnostics/test map, glossary, complete index and discoverable guidebook links

- [ ] **Step 1: Add authority-first change recipes**

Document exact navigation and verification sequences for Token changes, schema/registry changes, parser integration, CSS property policy, semantic validators and generated artifacts.

- [ ] **Step 2: Add diagnostics, testing, and generated-artifact guidance**

Explain diagnostic ownership, typed errors, positive/negative fixtures, unit tests, drift checks, `pnpm check`, `pnpm test`, and `pnpm build` without claiming test coverage beyond current evidence.

- [ ] **Step 3: Add glossary and reverse indexes**

Provide term definitions, role-based reading paths, package/module/API index links and a “where do I change this?” lookup table.

- [ ] **Step 4: Link the guidebook from both entry points**

Add the guidebook as the recommended onboarding start in `README.md` and `docs/README.md`, while explicitly retaining the documentation authority order.

- [ ] **Step 5: Verify local links and marker inventory**

Run a local Markdown link-target check, confirm all 48 module markers occur once, and run:

```bash
pnpm guidebook:check
git diff --check
```

- [ ] **Step 6: Commit the contributor workflow**

```bash
git add docs/guidebook.md README.md docs/README.md
git commit -m "docs: complete Axiom repository guidebook"
```

### Task 5: Full reconciliation and PR update

**Files:**
- Verify all files changed since `main`

**Interfaces:**
- Consumes: completed guidebook, coverage checker, unit tests and design checklist
- Produces: a byte-consistent update to `codex/add-repository-guidebook` and Draft PR #12

- [ ] **Step 1: Review the final diff against the design checklist**

Confirm language, authority safety, 48 module entries, named identifier coverage, current/future separation, generated provenance and dependency direction.

- [ ] **Step 2: Run fresh full verification**

```bash
pnpm guidebook:check
pnpm check
pnpm test
pnpm build
git diff --check main...HEAD
```

Expected: every command exits `0`, Vitest reports the previous 87 tests plus the new checker tests, and the worktree is clean.

- [ ] **Step 3: Reconcile remote tree to the same PR branch**

Upload only the verified changed blobs, create commits on the current remote head of `codex/add-repository-guidebook`, and compare each remote blob and final tree to local `HEAD` before moving the ref. Do not force-update the branch.

- [ ] **Step 4: Update and verify Draft PR #12**

Update the PR description with the completed artifact and verification evidence. Confirm base `main`, head branch, changed files, CI status and unresolved review thread count.
