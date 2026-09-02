# Semantic Scale and Aspect-Ratio Migration Plan

> **For agentic workers:** Use test-driven-development for vocabulary
> enforcement and verification-before-completion before publishing.

**Goal:** Complete the clean break with canonical ordered size/space paths and
the requested aspect-ratio catalog.

**Base:** OKLCH and Semantic Color PR head. \
**Stop:** hand off all three PRs for user review; do not start N15.

## Constraints

- `xs, sm, md, lg, xl` are the core ordered scale.
- `xxs/xxl` require explicit registered evidence.
- Do not rewrite semantic words that are not scale positions, including
  font-weight `medium`, duration `normal`, and heading `h1–h6`.
- Registered foundation families expose the five core sizes; component and
  purpose-specific families may expose an evidence-backed subset.
- Remove long-form scale paths and `space.semantic.overlap` without aliases.

### Task 1: Add failing vocabulary and ratio enforcement

**Files:**

- Modify `packages/token-tooling/src/foundation-policy.test.ts`
- Modify foundation policy schema/data/fixtures
- Add ratio boundary assertions to `packages/token-tooling` tests

Add RED cases for a core family missing `xs` or `xl`, a long-form scale segment,
an unregistered extended segment, removed space paths, a missing required ratio,
and an incorrect normalized ratio value.

### Task 2: Implement registry-backed scale validation

**Files:**

- Modify `packages/token-tooling/src/foundation-policy.ts`
- Modify `packages/token-tooling/src/generate-foundation-artifacts.ts`
- Load `spec/token/semantic-token-vocabulary.json` through one named constant

Validate only the registry's ordered scale families so unrelated semantic words
are untouched. Check exact core ordering, extension evidence, removed paths,
and ratio IDs/values.

### Task 3: Migrate size, typography, and logical spacing paths

**Files:**

- Modify `tokens/base.tokens.json`
- Modify active SSOT/annex examples and current conformance fixtures

Normalize registered font-size/line-height/typography families and generic
size families. Rename logical spacing to `control.padding.*` and
`layout.{stack,cluster}.gap`, fill the registered core size coverage, and remove
overlap. Update component aliases in the same source transaction.

### Task 4: Expand aspect ratios

Add all required normalized primitive IDs and exact width/height values. Keep
human-readable ratios in descriptions and retain role-based semantic aliases
only where the role is clear. Mark `1168x1000` as an Axiom custom ratio.

### Task 5: Regenerate, scan, verify, and publish

Run `pnpm tokens:generate`; inspect Token count, manifest digests, and generated
unions. Scan active normative sources/generated artifacts for old long forms,
old spacing paths, and missing ratios. Run all acceptance commands, add an
implementation report, request independent review, commit, publish, and open
the third stacked PR. Stop for user review before N15.
