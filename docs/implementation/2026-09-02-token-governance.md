# Token Governance and Vocabulary Registry

**Date:** 2026-09-02 \
**Scope:** clean-break governance stack, pull request 1 of 3 \
**Gate A effect:** none; N14 remains complete and N15 remains blocked for user review

## Delivered

- ADR-0004 records the clean-break palette, OKLCH fallback, semantic role,
  ordered scale, logical spacing, aspect-ratio, and NodeNext decisions.
- SSOT-01 and the Token Domain annex expose the target vocabulary and stack
  activation rule.
- `semantic-token-vocabulary.json` owns the core and extended size labels,
  registered ordered families, color-role responsibilities, logical spacing
  paths, and removed paths.
- The Foundation Policy pins the registry by stable ID.
- Generated artifact provenance includes the registry content as a digest input.
- The source-structure standard explains why relative TypeScript imports use
  emitted `.js` extensions under NodeNext.

## Conformance Evidence

The specification inventory is now:

```text
32 schemas
14 registries
25 positive fixtures
49 negative fixtures
```

The vocabulary suite accepts the canonical `xs–xl` order and rejects the old
long-form order. Semantic validation rejects incomplete color-role authority,
duplicate family paths, and non-deterministic path ordering. The Foundation
Policy suite rejects a mismatched vocabulary registry ID.

The production Token corpus remains 578 Tokens in two contexts. Regeneration
changed only the source digest in the resolved manifest and generated Token
path header; Token IDs and resolved values are unchanged in this governance PR.

## Deferred to the Stack

- OKLCH values, `50–900` palettes, common white/black, semantic color roles,
  themes, and contrast migration are pull request 2.
- Scale-path normalization, logical spacing source migration, ratio expansion,
  and corpus-level vocabulary enforcement are pull request 3.
- Appearance IR N15 begins only after the user reviews the complete stack.
