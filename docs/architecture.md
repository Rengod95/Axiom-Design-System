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
An explicit owner-approved requirement enters this flow as ADR decision input;
it does not insert implementation above SSOT. The Token clean break follows
this rule through ADR-0004 and SSOT-01 v0.4.0.

## Current package graph

```text
@webref/css + css-tree → @axiom/css-property-profile → @axiom/spec-tooling
                                                        │
                                                        └→ generated reference contracts
                                                           ├→ @axiom/condition-registry
                                                           ├→ @axiom/motion-schema
                                                           └→ @axiom/behavior-contracts

@axiom/tokens ← @axiom/token-tooling ← @terrazzo/parser
```

- `@axiom/spec-tooling` is repository tooling. It consumes the public
  `@axiom/css-property-profile` validation API one-way while validating
  cross-registry State, Condition, resolved Token, Appearance IR, and Motion IR
  invariants before generating drift-checked reference contracts. Generated
  packages do not runtime-import `@axiom/spec-tooling`.
- `@axiom/tokens` is target-neutral. It must not import React, renderer,
  Tailwind, browser, or framework concepts.
- `@axiom/token-tooling` is an adapter boundary. Parser-specific values stop at
  this package; consumers receive Axiom contracts.
- `@axiom/css-property-profile` owns pinned Webref import, sparse policy
  resolution, Token Binding coverage, generated property types, and CSS grammar
  validation. It does not depend on Token runtime, Recipe, React, or a renderer.
- Future packages must enter the graph only after the owning SSOT defines their
  authority, input/output contracts, diagnostics, and release gate.

## Token package structure

```text
packages/tokens/src/
├── constants.ts
├── contracts.ts
├── domain/
│   ├── identity.ts
│   ├── identity.test.ts
│   ├── token-json-value.ts
│   └── token-json-value.test.ts
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
| Token source corpus and resolved manifests | SSOT-01 and `tokens/` | `@axiom/token-tooling`, `@axiom/tokens` |
| CSS property identity and policy | SSOT-03, Webref input manifest, CSS registries | `@axiom/css-property-profile` |
| Canonical State and Lifecycle identity | SSOT-05, Canonical State Registry | `@axiom/spec-tooling` semantic gate |
| Environment conditions and responsive thresholds | SSOT-04, Condition Registry | `@axiom/spec-tooling` semantic gate |
| Ordered declarations and Appearance IR | SSOT-03, declaration/Appearance schemas | `@axiom/spec-tooling` schema and semantic gates |
| Generated State, Condition, Appearance, Motion, and Behavior references | completed schemas and registries | `@axiom/spec-tooling` generator and the three generated contract packages |
| Positive and negative behavior | `spec/fixtures/`, `fixtures/` | package tests and spec harness |

## Current N18 checkpoint

The `spec/manifest.json` inventory remains 36 schemas, 14 registries, and 26
fixture suites with 40 positive and 78 negative files. N18 adds no new schema
or fixture authority: it adds deterministic, provenance-stamped and
drift-checked reference types for N12–N17 in three zero-runtime-dependency
packages. Token generation emits the same 635 Token IDs for light and dark
contexts. Under ADR-0005, N32 owns pinned React Aria source data and N33 owns
behavior projection and cross-coverage. N22, not N18, owns the future collision
trace schema and coverage.

## Change gate

Every source change must pass:

1. `pnpm check` for naming, constants policy, package boundaries, spec integrity,
   and type safety;
2. `pnpm test` for executable behavior;
3. `pnpm build` for package outputs.

The complete source-writing and module rules are normative for contributors and
automation: [Source-code and module structure](standards/source-code-and-module-structure.md).
