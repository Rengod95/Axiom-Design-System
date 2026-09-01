# Axiom Normative Specifications

`spec/` contains the machine-readable authority subordinate to the prose SSOT.
Generated TypeScript and runtime implementations must derive from these inputs.

## Authority Harness

[`manifest.json`](manifest.json) registers every normative schema, registry,
and conformance fixture suite. Run:

```bash
pnpm spec:check
```

The harness verifies:

- JSON Schema Draft 2020-12 meta-schema conformance;
- registered `$id` and local path agreement;
- resolvable schema references;
- registry schema and semantic validation;
- cross-registry reference, context-invariance, and contradiction validation;
- positive fixtures succeed;
- negative fixtures fail;
- canonical JSON SHA-256 digests are reproducible.

## Fixture Convention

Each suite declares a schema and optional semantic validator in
`manifest.json`. JSON files under its `positiveDirectory` must pass. Files under
its `negativeDirectory` must fail schema or semantic validation.

Fixtures are plain instances, not wrappers. Test expectations therefore cannot
accidentally invalidate an otherwise valid instance through extra metadata.

## Editing Rule

1. Update prose SSOT/ADR when semantics change.
2. Update the normative schema or registry.
3. Add positive and negative fixtures.
4. Run `pnpm spec:check`, `pnpm test`, and `pnpm build`.
5. Regenerate downstream types/artifacts only from the normative input.

Generated files must never be edited to compensate for an incorrect schema.
