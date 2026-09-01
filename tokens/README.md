# Axiom Token sources

These DTCG 2025.10 documents are the normative public Token corpus used to
generate the resolved Foundation manifest and public Token path types.

- `base.tokens.json` owns Primitive, Semantic, and evidence-backed Component
  Tokens.
- `theme-light.tokens.json` and `theme-dark.tokens.json` own context overrides.
- Theme remains resolver context data and never appears in a Token ID.

`spec/token/foundation-token-policy.json` is the machine-readable scale
contract:

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

Run `pnpm tokens:generate` after changing a source. Generated artifacts must be
reviewed with their source and must remain byte-stable across directories.
