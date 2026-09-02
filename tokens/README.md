# Axiom Token sources

These DTCG 2025.10 documents are the normative public Token corpus used to
generate the resolved Foundation manifest and public Token path types.

- `base.tokens.json` owns Primitive, Semantic, and evidence-backed Component
  Tokens.
- `theme-light.tokens.json` and `theme-dark.tokens.json` own context overrides.
- Theme remains resolver context data and never appears in a Token ID.

`spec/token/foundation-token-policy.json` is the machine-readable scale
contract and pins `spec/token/semantic-token-vocabulary.json` as the canonical
semantic naming and role registry:

- Primitive names identify palette/scale coordinates, ratios, or value shapes;
  product-purpose names belong to the Semantic tier.
- Space follows a 4px grid and is authored as `rem` after the zero step.
- General size, radius, font size, blur, and breakpoint values use `rem`;
  border and stroke hairlines use `px`.
- DTCG 2025.10 does not permit `em` dimensions. A future Condition or CSS
  serializer may derive `em` from registered `rem` values without changing
  this source contract.
- The type system uses a 16px body base, supports body down to 13px, covers
  h1-h6, and exposes four weights for every registered typography family.
- Required semantic foreground/background pairs are contrast-checked in light
  and dark contexts.
- The accepted clean-break target uses `xs–xl` for registered ordered scale
  families, separate background/surface/fill roles, OKLCH with sRGB hex
  fallback, and palette coordinates `50–900` plus common white/black.

The governance registry lands before the two source migrations in a stacked
change. It is not a compatibility alias catalog, and no intermediate release is
published between the registry and source migrations.

Run `pnpm tokens:generate` after changing a source. Generated artifacts must be
reviewed with their source and must remain byte-stable across directories.
