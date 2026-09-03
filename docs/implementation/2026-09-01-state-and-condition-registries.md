# Canonical State and Condition Registries — implementation report

**Date:** 2026-09-01  
**Status:** COMPLETE for N12–N13  
**Scope:** Canonical State Registry, Condition Registry, Condition Expression,
cross-registry semantic validation, and conformance fixtures

## Outcome

N12 and N13 establish the provider- and renderer-independent identities needed
before declaration, Appearance, Motion, or Recipe authoring can be normalized.

The Canonical State Registry contains the complete SSOT-05 vocabulary:

- fourteen boolean interaction/form states;
- the `orientation` enum with `horizontal` and `vertical` values;
- `entering`, `exiting`, and `motionSuppressed` lifecycle observations;
- explicit component applicability and Appearance/Motion usage evidence.

The Condition Registry contains:

- three minimum and three matching upper-bound viewport width conditions;
- three minimum and three matching upper-bound container inline-size
  conditions;
- the mandatory `preference.reducedMotion` condition;
- the registered `component` query-container identity and its stable
  `axiom-component` CSS name.

## N25 Select Slot reconciliation

N25 made the existing Slot-local State intent executable and advanced the
Canonical State Registry compatibility identity to `0.2`.
`applicableComponents` accepts either an exact Recipe ID for Recipe-wide
applicability or an exact `${recipeId}.${slot}` target for one declared Slot.
The authoring, Appearance semantic, and N23 closed-authority validators apply
the same rule to State rules and State selections. A migration fixture rejects
the former `0.1` identity.

The Select vocabulary now uses the canonical Recipe Slots already owned by the
Kernel, SSOT-05, and Component Tokens: `selected` targets `select.item`, while
`entering`, `exiting`, and `motionSuppressed` target `select.popup`. The stale
`select.option` and `select.popover` spellings were not retained as aliases.

## Semantic enforcement

The specification harness now loads all normative registries before semantic
validation so a contract can validate references to another authority.

Condition validation proves that every responsive threshold:

1. references the `breakpoint` Token Domain;
2. exists in every resolved context;
3. resolves to a non-negative `rem` dimension;
4. has the same value in light and dark contexts.

Condition Expressions permit flat AND with one OR level. Unknown IDs, raw query
strings, arbitrary nesting, and combinations whose resolved lower bound is not
below their upper bound are rejected. The validator explores OR alternatives
and accepts the expression when at least one combination is satisfiable.

## Artifacts

| Artifact | Responsibility |
| --- | --- |
| `spec/state/canonical-state-registry.schema.json` | State/Lifecycle entry shape and usage evidence |
| `spec/state/canonical-state-registry.json` | canonical state vocabulary and exact Recipe or Recipe/Slot target applicability |
| `spec/condition/condition-registry.schema.json` | viewport, container, preference, and container-name contracts |
| `spec/condition/condition-expression.schema.json` | bounded AND/OR expression shape |
| `spec/condition/condition-registry.json` | registered responsive and reduced-motion observations |
| `packages/spec-tooling/src/semantic-validators.ts` | ordering, reference, context invariance, and contradiction diagnostics |

## Acceptance evidence

- normative inventory: 26 schemas, 13 registries, 18 positive fixtures, and 33
  negative fixtures;
- State and Condition registry digests are emitted by `pnpm spec:check`;
- unit tests mutate a dark-context breakpoint and prove rejection;
- positive and negative expression fixtures prove satisfiable OR and
  contradictory range handling;
- no Recipe, React, renderer, raw media query, or runtime evaluator dependency
  enters either registry.

N14 ordered declaration/value schemas are the next implementation boundary.
N18 remains the authority for the combined generated/reference TypeScript
contract surface.
