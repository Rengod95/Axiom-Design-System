# Ordered CSS Declaration Contracts — implementation report

**Date:** 2026-09-02
**Status:** COMPLETE for N14
**Scope:** CSS declaration property identity, value algebra, provenance,
ordered declaration arrays, and conformance fixtures

## Outcome

N14 establishes the normalized declaration boundary consumed by the future
Appearance IR. Declarations are serializable records whose property names are
canonical CSS identifiers, whose values use an explicit discriminant, whose
`important` field is fixed to `false`, and whose origin preserves Recipe,
slot, normalization stage, and source evidence.

Declaration collections are arrays rather than property maps. The contract
therefore preserves repeated-property fallbacks and source order without
depending on object property enumeration or imposing value uniqueness.

## Contract structure

| Artifact | Responsibility |
| --- | --- |
| `spec/css/property-name.schema.json` | canonical kebab-case and custom-property name syntax; vendor prefixes rejected |
| `spec/css/declaration-value.schema.json` | discriminated CSS literal, Token Reference, and CSS template union |
| `spec/css/declaration-origin.schema.json` | Recipe, slot, stage, and source provenance |
| `spec/css/declaration.schema.json` | property, value, `important: false`, and origin composition |
| `spec/css/ordered-declaration-list.schema.json` | explicit ordered array of declarations |

The value schema reuses the existing common Token Reference contract. A CSS
template is a JSON-safe array of string and Token Reference segments and must
contain at least one Token Reference; a template containing only literal text
must use the simpler CSS literal form.

## Conformance evidence

Three fixture suites cover the independent boundaries:

- declaration values accept literal, Token, and Token-bearing template forms;
- empty literals, unknown discriminants, invalid Token paths, and literal-only
  templates fail;
- declarations require valid property syntax, `important: false`, complete
  provenance, and a registered normalization stage;
- the ordered-list fixture preserves two consecutive `background-color`
  fallbacks with distinct source pointers;
- a property map and an array item without provenance fail.

Canonical JSON already preserves array order, so no new serializer or runtime
owner is introduced by N14.

## Deliberate boundary

N14 defines normalized shape, not final CSS validity. It intentionally does
not:

- match literal or synthesized template values against the pinned CSS grammar;
- check custom-property names against the effective profile registration list;
- check direct/template Token Domains against the effective property profile;
- resolve Tokens across light and dark contexts;
- normalize shorthands or diagnose shorthand/longhand collisions;
- add Recipe authoring, Appearance IR, compiler, or generated TypeScript APIs.

Those operations remain assigned to N15 and N20–N22, with the existing
profile-level validators reused when N21 integrates them into declarations.

## Acceptance evidence

- normative inventory: 31 schemas, 13 registries, 24 positive fixtures, and 45
  negative fixtures;
- all pre-existing registry digests remain unchanged; only the specification
  manifest digest changes because five schemas and three fixture suites are
  newly registered;
- the specification harness fails before the declared schemas exist and passes
  after the contracts are present;
- no package dependency, runtime source module, or public TypeScript export is
  added.

N15 Appearance IR is the next normative implementation boundary.
