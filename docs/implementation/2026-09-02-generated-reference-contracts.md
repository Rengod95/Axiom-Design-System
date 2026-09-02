# N18 Generated Reference Contracts

**Status:** COMPLETE
**Date:** 2026-09-02

N18 adds deterministic, schema-aligned TypeScript reference surfaces for the
completed N12–N17 contracts. They remain subordinate to the owning JSON
schemas, registries, fixtures, and semantic validators: static types do not
replace runtime registry, grammar, Token, or semantic validation.

## Ownership and generation

`@axiom/spec-tooling` owns `contracts:generate` and `contracts:check`. The
generator reads authoritative JSON inputs into a constrained schema-derived
intermediate model, renders supported `const`, `enum`, object required fields,
`oneOf`, `allOf` conditionals, arrays, and local/external `$ref` forms, computes
a canonical input digest, and writes three public
`src/generated/reference-contracts.ts` artifacts:

- `@axiom/condition-registry`: canonical State, Condition Registry, and
  Condition Expression identities;
- `@axiom/motion-schema`: declaration/value, Appearance IR, and Motion IR
  serializable references;
- `@axiom/behavior-contracts`: N17 source-manifest and component-profile
  references.

Every generated artifact records source identities, generator version, contract
family, and canonical input digest. `contracts:check` regenerates into a clean
temporary location and fails when a checked-in destination differs. The public
packages have no runtime dependencies and never import the generator.

TypeScript cannot exactly represent JSON Schema regexes, numeric ranges,
uniqueness, or closed-object behavior for arbitrary values. The renderer
preserves literal discriminants, required fields, supported tuple cardinality,
and unions; the omitted constraints remain the responsibility of the normative
schema and semantic validation. Production package builds exclude compile-time
`*.type-test.ts` files. Separate no-emit package configurations compile the
positive and `@ts-expect-error` negative assertions during `pnpm check`.

## Reconciled decisions

- Appearance declaration/value references share `@axiom/motion-schema` because
  Motion IR directly consumes the closed N14 value algebra. This is a generated
  reference surface only; N20–N22 retain authoring and normalization ownership.
- The generator deliberately does not create or pre-own collision-trace types.
  N22 adds that schema and its reference surface when the collision contract is
  authoritative.
- Generated types encode serializable discriminants and required fields, while
  JSON Schema and semantic checks retain cardinality, pattern, digest, registry,
  grammar, Token, and provider-evidence authority.

## Evidence

Focused generator tests prove deterministic output, provenance metadata, drift
detection, restoration, and source-shape mutations for each generated family.
Package-local compile-time tests include valid
State/Condition, Appearance/Motion, and Behavior objects plus expected failures
for lifecycle enum State, missing container, missing `allowDiscrete`, and an
incorrect Behavior provider. The existing normative inventory is unchanged:
36 schemas, 14 registries, 26 fixture suites, 40 positive fixtures, and 78
negative fixtures.
