# Post-P3 foundation review and next sequence

**Date:** 2026-09-01  
**Status:** ACTIVE SEQUENCING REVIEW  
**Reviewed checkpoint:** P2 Token Foundation, P3 CSS Property Profile, and N12–N15 contracts
**Authority:** SSOT-02 normative implementation order N0–N36

## Review conclusion

P2 and P3 close N0–N11. N12–N13 add provider-neutral canonical State and
Lifecycle identities plus registered viewport, container, and reduced-motion
conditions. N14 adds the ordered declaration/value boundary with explicit
provenance and separate CSS literal, Token Reference, and CSS template forms.
N15 adds the renderer-neutral Appearance IR with registered Slot, Variant,
State, Condition, stage, profile, and provenance constraints.
The repository now has reproducible Token resolution, composite projector
descriptors, pinned full-property metadata, sparse property policy, expanded
Token bindings, generated types, validation services, and artifact drift
checks.

The next implementation must not jump directly to `defineRecipe`. SSOT-02
forbids consuming an authoring object before the normalized schemas it depends
on exist. With N15 complete, the correct next boundary is N16, the Motion IR
schema, followed by the remaining Gate A schemas.

## Completed evidence

| Order | Status | Evidence |
| --- | --- | --- |
| N0–N6 | Complete | specification harness, Token schemas/registry/profile, resolver manifest, projector descriptors |
| N7–N11 | Complete | CSS input/policy/effective/binding schemas, pinned Webref generator, fixtures |
| N12 | Complete | Canonical State Registry schema/data, component applicability, semantic fixtures |
| N13 | Complete | Condition Registry/expression schemas, responsive/preference data, breakpoint and contradiction validation |
| N14 | Complete | discriminated declaration values, provenance, explicit ordered arrays, positive/negative fixtures |
| N15 | Complete | normalized Appearance stages, Slot/Variant/State/Condition identity, profile and provenance fixtures |
| Profile-level N21 proof | Partial early proof | direct/template/projector and negation validators exist, but declaration integration does not |

The early N21 proof is reusable and does not authorize skipping N12–N20.

## Required next work

| Priority | Order | Deliverable | Exit evidence |
| ---: | --- | --- | --- |
| 1 | N16 | Motion IR schema | lifecycle, reduced-motion, Token binding, and backend-neutral value contracts |
| 2 | N17 | Behavioral Criteria Source/Profile schemas | pinned evidence manifest and Button/Select/Dialog criteria shapes |
| 3 | N18 | Generated/reference TypeScript types | schema-aligned State, Condition, declaration, Appearance, Motion, and Behavior types |
| 4 | N19 | Recipe Kernel proof | JSON-safe structural result and Button/Select/Dialog conformance suite |

Only after these steps should N20–N23 implement `defineRecipe`, declaration
binding integration, normalization/collision traces, and Motion authoring.

## Gaps intentionally still open

- Composite projector descriptors are present; CSS serialization and
  declaration revalidation belong to N21/N22.
- Property resource policy is present; URL extraction, resource manifests, and
  final-output security comparison belong to declaration/compiler stages.
- P2/P3 generated types cover current Token and CSS identities; N18 must add the
  types created by N12–N17 rather than hand-writing parallel contracts.
- Gate A still requires Button, Select, and Dialog normalization plus
  negative/type/round-trip/determinism fixtures and a reconciliation report.

## Completed contract boundary

The N12–N15 implementation sequence remained contract-first and bounded:

1. add Canonical State and Condition Registry schemas;
2. add authored registries and positive/negative semantic fixtures;
3. validate registry digests only after schemas validate;
4. prove breakpoint Tokens are complete and theme-invariant;
5. distinguish CSS literals, direct Token References, and Token-bearing CSS
   templates in normalized declaration values;
6. require declaration provenance and preserve repeated-property order in
   explicit arrays;
7. bind normalized Appearance stages to registered Slot, Variant, State, and
   Condition identities without adding authoring or rendering behavior;
8. stop before Recipe or runtime implementation.

This creates a reviewable authority boundary and prepares N15–N17 without
coupling State or Condition semantics to a renderer or provider.
