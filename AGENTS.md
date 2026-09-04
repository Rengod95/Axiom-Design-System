# Axiom repository instructions

These instructions apply to every file in this repository.

Before changing source code, read:

1. `docs/README.md` for authority order;
2. the owning ADR and SSOT document;
3. `docs/standards/source-code-and-module-structure.md`;
4. the relevant schema, registry, and positive/negative fixtures in `spec/`.

Mandatory source rules:

- Do not use version markers in identifiers, filenames, or directory names.
  Compatibility versions belong in schema/profile data and provenance.
- Put package-wide protocol, diagnostic, integration, and policy values in
  `src/constants.ts`; exported constants use `CONSTANT_CASE`.
- Do not introduce unexplained repeated numbers or strings. Name domain values
  and keep one static owner for them.
- Keep package dependencies one-way and import other packages only through
  their declared public exports.
- Keep core contracts serializable, deterministic, and renderer-independent.
- Add concise English TSDoc to every newly written or materially modified public
  or exported TypeScript function, class, or method. Add it to newly written or
  materially modified internal callables when their contract, invariants,
  ordering, diagnostics, side
  effects, or boundary assumptions are not evident from the signature. Explain
  maintained intent rather than restating identifiers or control flow.
- Colocate unit tests; add normative positive and negative fixtures when a
  machine-readable contract changes.
- Do not treat removed MVP packages or historical reviews as implementation
  authority.

Before handing off a source change, run:

```bash
pnpm check
pnpm test
pnpm build
```
