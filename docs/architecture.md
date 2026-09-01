# Axiom implementation architecture

This document is the implementation map for the repository. Normative behavior
is owned by the accepted ADRs, SSOT documents, and `spec/`; this map explains
where implementations belong and which dependency directions are legal.

## Authority flow

```text
ADRs + SSOT
    ↓
schemas + registries + source profiles
    ↓
conformance fixtures
    ↓
contracts and capability packages
    ↓
generated artifacts and framework projections
```

Implementation code may prove or realize a normative contract. It may not
silently amend one. A contract change starts in an ADR or the owning SSOT and is
then reflected in schemas, fixtures, types, and implementation in that order.

## Current package graph

```text
@axiom/spec-tooling

@axiom/tokens ← @axiom/token-tooling ← @terrazzo/parser
```

- `@axiom/spec-tooling` is repository tooling and has no dependency on runtime
  packages.
- `@axiom/tokens` is target-neutral. It must not import React, renderer,
  Tailwind, browser, or framework concepts.
- `@axiom/token-tooling` is an adapter boundary. Parser-specific values stop at
  this package; consumers receive Axiom contracts.
- Future packages must enter the graph only after the owning SSOT defines their
  authority, input/output contracts, diagnostics, and release gate.

## Token package structure

```text
packages/tokens/src/
├── constants.ts
├── contracts.ts
├── domain/
│   ├── identity.ts
│   └── identity.test.ts
├── resolution/
│   ├── context-resolver.ts
│   ├── context-resolver.test.ts
│   └── manifest-serializer.ts
└── index.ts
```

`constants.ts` owns package-wide protocol and policy values. `contracts.ts`
owns serializable types and typed errors. Domain directories own cohesive
behavior and colocated tests. `index.ts` is the only supported public entry
point and contains exports rather than implementation.

## Normative and executable boundaries

| Concern | Authority | Executable owner |
| --- | --- | --- |
| Architecture and dependency direction | `docs/adr/`, `docs/ssot/` | boundary checks in `scripts/` |
| Schema and registry shape | `spec/**/*.schema.json`, `spec/manifest.json` | `@axiom/spec-tooling` |
| Token identity and tier rules | SSOT-01 and token schemas | `@axiom/tokens` |
| DTCG parser integration | token source profile | `@axiom/token-tooling` |
| Positive and negative behavior | `spec/fixtures/`, `fixtures/` | package tests and spec harness |

## Change gate

Every source change must pass:

1. `pnpm check` for naming, constants policy, package boundaries, spec integrity,
   and type safety;
2. `pnpm test` for executable behavior;
3. `pnpm build` for package outputs.

The complete source-writing and module rules are normative for contributors and
automation: [Source-code and module structure](standards/source-code-and-module-structure.md).
