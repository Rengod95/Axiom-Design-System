# N25 Select Foundation Conformance

**Status:** complete; N26 Dialog conformance fixture is next  
**Date:** 2026-09-03

N25 proves one Select-only Foundation path through the public N20
`defineRecipe()`, N21 Token validation, N22 `normalize()`, and N23
`defineMotion()` APIs. It stops at serializable Foundation artifacts and does
not claim React/provider projection, DOM, browser, accessibility, compiler,
class emission, or Motion backend behavior.

## Contract reconciliation

The established Select Recipe Slots are `root`, `trigger`, `popup`, and `item`.
The Canonical State Registry still used `select.option` for `selected` and
`select.popover` for lifecycle observations, even though SSOT-05, the Recipe
Kernel fixture, and Component Token paths use `item` and `popup`.

N25 resolves that mismatch in favor of the canonical Recipe structure:

- `applicableComponents: ["select"]` applies across declared Select Slots;
- `applicableComponents: ["select.item"]` applies only to the exact `item` Slot;
- exact matching replaces aliases, prefix matching, and wildcard inference;
- `selected` now targets `select.item`;
- `entering`, `exiting`, and `motionSuppressed` now target `select.popup`.

The registry schema already permitted qualified identifiers, but assigning
normative Recipe/Slot semantics to that field changes compatibility. N25
therefore advances the Canonical State Registry schema identity and registry
`schemaVersion` to `0.2`; a migration fixture proves legacy `0.1` input is
rejected. N20 authoring, N15 semantic validation, and N23 closed-authority
validation now enforce the same rule for direct State rules plus Compound and
Condition State selections. The generated State reference provenance digest
was regenerated from the reconciled registry.

## Evidence

- `fixtures/select/appearance.ts` retains the exact four-Slot vocabulary,
  Select Component Tokens, `size.md`, root/trigger/item States, and one
  reduced-motion Condition without lowering Token references.
- `selected` remains attached to the repeated `item` Slot. Its declarations
  retain `item` provenance and never aggregate onto the Recipe root.
- `fixtures/select/motion.ts` authenticates popup enter/exit Motion against the
  normalized Appearance. Four ordered `AXM1012` warnings preserve the current
  backend-capability uncertainty for `opacity` and `transform`.
- N21 validates color, dimension, shadow, number, and duration bindings across
  both Token contexts through explicit test-local serializer ports.
- The N15 Appearance, N16 Motion, and N22 collision trace pass schema and
  semantic validation before and after JSON transport and match checked-in
  fixtures exactly.
- The collision trace pins a Base `border`/State `border-color` overlap and two
  repeated-item State overlaps with stable IDs and Slot-local applicability.
- A subordinate canonical bundle golden, fresh authority contexts, and a
  declaration-key permutation prove deterministic output.
- Type tests retain exact Select Slot, Variant, State, Condition, and Motion
  literals and reject the stale `option` Slot spelling.

## Negative boundaries

- a color Token bound to `z-index` fails N21 with `AXP1103`;
- a later resetting shorthand withholds Appearance at N22 with `AXP1302`;
- Motion targeting an absent Slot fails N23 with `AXM1018`;
- Slot-qualified `selected` succeeds on `item` and fails on `root` across all
  three semantic validation boundaries.

## Deferred work

N26 owns the Dialog vertical fixture. N27 owns the remaining exhaustive
negative/type/round-trip/determinism matrix, and N28 owns the Foundation
reconciliation review. Gate A remains open; runtime Select item-instance
projection and popup lifecycle observation remain N32–N35 work.
