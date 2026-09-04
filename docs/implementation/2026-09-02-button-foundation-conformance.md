# N24 Button Foundation Conformance

**Status:** complete; N25 Select conformance fixture is next
**Date:** 2026-09-02

N24 is one Button-only Foundation vertical proof. It drives authored input
through the public N20 `defineRecipe()`, N21 validated receipt, N22
`normalize()`, and N23 `defineMotion()` APIs. It does not implement or claim
React, provider, DOM, browser, accessibility, compiler, class-emission, or
runtime conformance.

## Evidence

- `fixtures/button/appearance.ts` defines the five N15 stages: Base, Variant,
  State, Compound, and Condition. Its pressed State intentionally creates the
  one governed `border` to `border-color` collision.
- `fixtures/button/motion.ts` defines the existing pressed `false -> true`
  transform Motion source with disabled reduced motion.
- The narrow `@axiom/appearance-normalizer` conformance test builds explicit
  checked-in authority inputs, then compares public output with the N15 Button
  Appearance fixture, existing N16 Button Motion fixture, and the new N22
  Button collision-trace fixture.
- Each artifact passes public schema plus semantic validation before and after
  JSON transport. The subordinate package-local
  `button-foundation.golden.json` pins the canonical three-artifact bundle;
  two independently cloned authority contexts each preload a new validation
  port and produce identical bundle bytes. Ordinary declaration-object key
  permutation also preserves canonical output.
- Button-local negative cases prove N21 wrong-domain Token rejection
  (`AXP1103`), N22 directional reset-longhand withholding (`AXP1302`), and N23
  authenticated unknown-slot rejection (`AXM1018`). Literal no-emit checks
  retain Button, Slot, Variant, State, Condition, and Motion identities.

## N15 fixture reconciliation

The existing `css-appearance-ir/positive/button.json` is the single N15 Button
golden, not a new N24 artifact family. Its prior illustrative `recipes/button.ts`
origins and empty neutral Variant could not be emitted by the current public
authoring path: N20 requires a non-empty Variant application, and N21 requires
paint to use the registered color Token binding rather than raw CSS. The
authored Button source therefore uses inert `opacity: 1` for the neutral value,
registered `border-color` Token paint for pressed state, and a Base `border`
declaration. N22 canonicalizes those declarations and their definition-pointer
origins. The test proves exact equality with the reconciled N15 golden.

The new `css-collision-trace/positive/button-shorthand-longhand.json` is the
governed N22 counterpart: one stable `collision-0001`, Base `border` earlier,
pressed `border-color` later, concrete affected longhand, and a later winner.
It remains subordinate to the existing trace schema and semantic authority.

## Authority reconciliation

N24 is based on N23 `9b8fde9`, which requires a trusted composition-owned
`MotionAuthorityValidationPort` before any digest comparison. The Button test
asynchronously preloads the public
`createMotionAuthorityValidationPort(specRoot)` and supplies it with the real
profile, resolved Token Manifest, Domain, State, Condition, Appearance, and
digest authorities. The positive path therefore crosses the pinned
schema/semantic `AXM2004` boundary rather than trusting shallow matching
digests, while Motion retains no runtime dependency on spec tooling.

## Deferred work

N25--N26 own Select and Dialog vertical fixtures. N27 owns exhaustive
negative/type/round-trip/determinism coverage. N28 is the Foundation
reconciliation review. N29 onward remain Gate A compiler/integration work; N31
and N33 still own backend and provider Motion capabilities.
