# Semantic Scale and Aspect-Ratio Migration

Date: 2026-09-02  
Status: Complete

## Outcome

The third Token clean-break stage replaces long-form foundation size labels
with the canonical `xs`, `sm`, `md`, `lg`, and `xl` vocabulary, makes logical
spacing responsibilities explicit, and expands the primitive aspect-ratio
catalog to the 16 registered ratios in ADR-0004.

The migration is intentionally alias-free. Removed Token IDs do not resolve and
generated `TokenPath` types expose only the new contract.

## Contract changes

- registered size, font-size, line-height, typography, and spacing families
  expose the complete ordered core scale;
- `space.semantic.control.padding.{block,inline}` owns control padding;
- `space.semantic.layout.{stack,cluster}.gap` owns layout gaps;
- `space.semantic.overlap` is removed in favor of governed negative spacing at
  declaration time;
- the body scale keeps a 13px minimum and uses 16px at `md` as the base body
  size;
- heading `h1` through `h6` and the four weight variants remain semantic
  vocabulary rather than scale labels;
- the aspect-ratio catalog contains 16 normalized integer-pair IDs, including
  the explicit Axiom extensions `1168x1000`, `5x2`, and `3x1`.

## Enforcement

`@axiom/token-tooling` now validates the registered semantic scale families,
removed semantic paths, and every required ratio ID/value. The Foundation
Policy schema owns the ratio provenance and exact width/height pair, while the
Semantic Token Vocabulary registry owns the set of scale-bearing families.

The resolved corpus contains 634 Token IDs in both light and dark contexts.
The generated manifest and public Token path union are regenerated from the
normative sources and remain drift-checked by `pnpm check`.

## Verification

- targeted Foundation Policy tests cover missing core labels, long-form and
  unregistered extensions, removed paths, missing ratios, and incorrect values;
- active normative sources and generated artifacts contain no removed
  long-form scale path;
- all 16 required aspect-ratio primitive IDs appear in the generated Token path
  union;
- `pnpm check`, `pnpm test`, `pnpm build`, and `git diff --check` are the merge
  acceptance gate.

## References

- [ADR-0004: Token Vocabulary and Color Profile](../adr/0004-token-vocabulary-and-color-profile.md)
- [Token clean-break design](../superpowers/specs/2026-09-02-token-clean-break.md)
- [Scale and ratio implementation plan](../superpowers/plans/2026-09-02-semantic-scales-and-ratios.md)
