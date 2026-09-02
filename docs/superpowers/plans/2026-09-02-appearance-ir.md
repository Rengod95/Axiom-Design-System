# N15 Appearance IR Implementation Plan

**Goal:** Freeze the renderer-neutral, JSON-serializable Appearance IR that
connects ordered declarations to the future Recipe normalizer.

## Contract

- one root `CSSAppearanceIR` schema with explicit arrays for every ordered
  stage;
- base, variant, state, compound, and condition rules matching SSOT-03/04;
- slot-local declaration records referencing the N14 declaration contract;
- canonical State and Condition IDs validated against their registries;
- declaration provenance validated against recipe, slot, and stage ownership;
- no selectors, callbacks, compiled queries, class strings, or backend output.

## Tasks

1. Add failing semantic tests for unknown slots, duplicate axes/values, invalid
   defaults, unknown State/Condition IDs, and mismatched declaration origin.
2. Add `spec/css/appearance-ir.schema.json` and complete positive/negative
   fixture suites.
3. Implement the `css-appearance-ir` semantic validator using the existing
   State, Condition, and resolved-manifest validation context.
4. Register the schema and fixture suite in `spec/manifest.json`, update count
   assertions, and remove incidental duplicate manifest fields if encountered.
5. Add an implementation report and reconcile the active implementation plan
   so N15 is complete and N16 is next.
6. Run `pnpm check`, `pnpm test`, `pnpm build`, and `git diff --check`, then
   publish a stacked PR on PR #8.
