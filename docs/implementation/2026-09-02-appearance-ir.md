# CSS Appearance IR — implementation report

**Date:** 2026-09-02
**Status:** COMPLETE for N15
**Scope:** renderer-neutral Appearance IR shape, ordered Recipe stages,
cross-registry identity validation, provenance, and conformance fixtures

## Outcome

N15 establishes the normalized Appearance contract consumed by future Recipe
normalization and CSS compilation. The IR is a JSON-serializable record tied to
the pinned `axiom-css` profile and preserves the normative stage order:

```text
Base → Variant → State → Compound → Condition
```

Every declaration remains inside the ordered N14 declaration boundary. The IR
therefore preserves repeated-property fallbacks and source evidence without
introducing renderer, runtime, DOM, or framework ownership.

## Contract structure

| Field | Responsibility |
| --- | --- |
| `profile` / `profileInputDigest` | bind the IR to the pinned CSS profile input |
| `recipeId` / `slots` | declare stable Recipe and Slot identities |
| `base` | ordered slot declaration records for the base stage |
| `variantAxes` | named values, optional valid default, and ordered applications |
| `stateRules` | slot-local Canonical State cases and direct declarations |
| `compoundRules` | variant/state predicates and ordered slot applications |
| `conditionRules` | registered Condition expressions with optional variant/state constraints |

Arrays are normative wherever stage or source order affects the result. Object
maps are used only for identity selections where enumeration order is not part
of precedence.

## Semantic enforcement

The `css-appearance-ir` validator rejects contracts that are structurally valid
JSON but violate repository authority:

- undeclared or duplicate Slot applications;
- duplicate Variant axes or values and defaults outside the declared value set;
- unknown Variant selections in Compound or Condition rules;
- State IDs not registered for Appearance usage;
- boolean or enum State values that contradict the Canonical State Registry;
- unknown Condition IDs or invalid Condition expression structure;
- declaration origins whose Recipe, Slot, or stage differs from their owner;
- CSS profile IDs or input digests that differ from the pinned profile manifest.

The validator consumes Canonical State, Condition, and CSS profile registries
through the existing specification harness. It does not copy those authorities
into the Appearance schema.

## Deliberate boundary

N15 defines normalized structure and cross-registry identity, not authoring or
CSS emission. It intentionally does not:

- add `defineRecipe`, Recipe Kernel, collision traces, or normalization code;
- validate direct/template/projector Token bindings inside declarations;
- serialize projector values or compile Condition IDs to media/container rules;
- add Motion, Behavioral Criteria, generated TypeScript, runtime, or React APIs.

Those responsibilities remain ordered as N16–N23. In particular, the existing
profile-level binding validators become declaration-aware only at N21.

## Conformance evidence

- the positive Button fixture exercises Base, Variant, State, Compound, and
  Condition stages with two Slots and complete declaration provenance;
- six semantic unit tests cover valid composition, slot/variant/default errors,
  unknown State and Condition IDs, State value types, origin mismatch, and
  pinned profile identity;
- six negative fixtures prove invalid defaults, slots, State IDs and values,
  Condition IDs, and profile digests are rejected;
- normative inventory: 33 schemas, 14 registries, 26 positive fixtures, and 57
  negative fixtures.

N16 Motion IR is the next normative implementation boundary.
