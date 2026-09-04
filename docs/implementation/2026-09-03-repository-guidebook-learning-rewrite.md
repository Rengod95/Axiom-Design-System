# Repository Guidebook Learning Rewrite

**Status:** complete
**Date:** 2026-09-03
**Branch:** `codex/add-repository-guidebook`
**Stable learning document:** [`docs/guidebook.md`](../guidebook.md)

> **Follow-up:** 실제 독자 검토에서 드러난 개념 관계와 탐색 순서 문제는
> [`2026-09-04-guidebook-comprehension-revision.md`](2026-09-04-guidebook-comprehension-revision.md)에서
> 분석하고 구조적으로 수정했다.

## Purpose

The PR #12 guidebook began as a useful module catalog at the N15 checkpoint. The
repository reached N24 while that branch remained open, and the catalog required
readers to understand architecture vocabulary before seeing the problems it solved.
This work rewrites the guidebook as a learner-centered Korean path while retaining
complete current module/API lookup coverage.

This report is a work-specific learning record. It captures investigation, decisions,
evidence, and verification for this rewrite; it does not become a normative authority
or duplicate the stable guide.

## Reconciled baseline

Read-only investigation found that the original prompt and guidebook checkpoint no
longer matched the target branch after bringing the existing PR branch up to current
`main`:

| Concern | Stale assumption | Verified N24 fact |
| --- | --- | --- |
| Implemented sequence | N0–N15 | N0–N24 |
| Current packages | 4 | 10 |
| Guidebook coverage | 44 modules + 4 scripts | 91 modules + 4 scripts |
| Specification inventory | older N15 counts | 37 schemas, 14 registries, 44 positive and 87 negative fixtures |
| Foundation output | not reconciled with current branch | 635 Tokens in each of 2 contexts |
| CSS profile | older generated state | 818 effective properties |
| Current final boundary | generic future pipeline | Button Appearance IR, collision trace, and Motion IR conformance |

The selected treatment was to keep the same PR branch, merge current `main` into it,
and rewrite against N24. No source implementation, ADR, SSOT, schema, registry,
fixture, Token source, or generated artifact is changed by the guidebook rewrite.

## Why the old structure was hard to learn from

- Package and helper inventories appeared before a learner could explain the product
  problem, input, output, or authority model.
- `contract`, `canonical`, `effective`, `pin`, `provenance`, `adapter`, and related
  words appeared with little contextual Korean explanation.
- Learn, how-to, explanation, and reference information were mixed at one level.
- The end-to-end diagrams used generic nouns rather than one real value a reader
  could trace through authored and generated files.
- The generation commands in the old guidebook used stale names instead of current
  `tokens:generate`, `profile:generate`, and `contracts:generate` scripts.
- The old reference had 48 valid markers but the current checker discovered 95 paths.

## Running-example evidence

The stable guide follows this verified Foundation path:

```text
tokens/base.tokens.json#/color/component/button/root/background/default
→ color.semantic.fill.brand.default
→ color.primitive.brand.600
→ light/dark resolved contexts
→ spec/token/foundation-resolved-token-manifest.json
→ spec/css/token-binding-catalog.json#color-paint
→ background-color direct color binding
```

Both current contexts resolve the three entries to an opaque OKLCH value with
components `[0.514676, 0.228711, 272.806]` and sRGB fallback `#444ce7`.

The N24 consumer path is deliberately described as a connected but distinct view:
`fixtures/button/appearance.ts` directly references
`color.semantic.fill.brand.default` through `backgroundColor`; it does not directly
consume the Component Token. The authoring package validates that Token and property
against explicit authorities, the normalizer produces Appearance IR and a collision
trace, and the N24 conformance test combines those with Button Motion IR.

The current endpoint is not CSS text, a class name, DOM, React, or provider runtime.
N25–N26 are Select/Dialog vertical fixtures, N27 is exhaustive coverage, N28 is the
Foundation review, and N29 onward is compiler/integration work.

## Learning design applied

The rewrite separates four reader modes in one file:

1. **Learn:** problem-first concepts and the Button worked example.
2. **Work:** authority → authored source → exact command → expected evidence → failure
   diagnosis procedures.
3. **Explain:** architecture distinctions and trade-offs, always linked back to the
   running example.
4. **Reference:** one checked entry for every current module and policy script.

Following the Meatware Overclock teaching contract, Part I states prerequisites and
learning outcomes, introduces concepts in dependency order, uses code sandwiches,
adds recall and transfer prompts, and names where each analogy stops matching the
implementation. English semantic words remain searchable while Korean explanations
carry the meaning without requiring the reader to infer it from a translation pair.

## Files changed by this work

- `docs/guidebook.md`: complete Part I–IV rewrite.
- `README.md`: current 10-package workspace and N24 boundary.
- `docs/README.md`: four reading modes, corrected ADR numbering, current/planned map.
- `docs/architecture.md`: N24 package graph, module map, executable owners, inventory,
  and planned boundary.
- this work-specific learning record.
- approved design and implementation plan under `docs/superpowers/`.

## Verification record

Before rewriting, `pnpm test` passed 35 files and 348 tests. The initial
`pnpm guidebook:check` failed exactly as expected with 47 missing current modules.
After rebuilding Part IV, the checker reported 95 discovered, 95 documented, 95
unique, and no missing/stale/duplicate path.

The final verification used the completed document state:

| Gate | Result |
| --- | --- |
| `pnpm guidebook:check` | pass; 95 current paths covered exactly once |
| `pnpm check` | pass; standards, boundaries, coverage, TypeScript, generated drift, and spec integrity |
| `pnpm test` | pass; 35 test files and 348 tests |
| `pnpm build` | pass; TypeScript project build |
| Markdown file/anchor/fence validation | pass for all changed reader-facing documents |
| Button source/value/binding verification | pass for both contexts and effective CSS policy |
| `git diff --check origin/main...HEAD` | pass after the final documentation commit |

No unresolved code/schema/registry/ADR/SSOT contradiction remains in the rewrite.
The scope check contains documentation changes plus the already approved PR #12
guidebook checker integration; no source implementation or generated artifact was
changed by this work.

## Known reconciliation decisions

- The user's explicit choice to update PR #12 to N24 supersedes stale N15/4-package/
  48-marker numbers; all pedagogical and quality requirements remain in force.
- The Component Token Foundation trace and Semantic Token Appearance usage are shown
  as two truthful views, not collapsed into a fabricated direct consumer chain.
- `docs/architecture.md` is non-normative and had a stale N18 checkpoint, so this
  rewrite updates its current facts without changing authority documents.
- Generated files are described and verified but not directly edited.
