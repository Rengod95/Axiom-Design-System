# Axiom Token sources

These DTCG 2025.10 documents are the normative public Token corpus used to
generate the resolved Foundation manifest and public Token path types.

- `base.tokens.json` owns Primitive, Semantic, and evidence-backed Component
  Tokens.
- `theme-light.tokens.json` and `theme-dark.tokens.json` own context overrides.
- Theme remains resolver context data and never appears in a Token ID.

Run `pnpm tokens:generate` after changing a source. Generated artifacts must be
reviewed with their source and must remain byte-stable across directories.
