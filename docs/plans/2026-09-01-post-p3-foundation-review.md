# Post-P3 foundation review and next sequence

**Date:** 2026-09-01  
**Status:** ACTIVE SEQUENCING REVIEW  
**Reviewed checkpoint:** P2 Token Foundation and P3 CSS Property Profile  
**Authority:** SSOT-02 normative implementation order N0–N36

## Review conclusion

P2 and P3 close N0–N11. The repository now has reproducible Token resolution,
composite projector descriptors, pinned full-property metadata, sparse property
policy, expanded Token bindings, generated types, validation services, and
artifact drift checks.

The next implementation must not jump directly to `defineRecipe`. SSOT-02
forbids consuming an authoring object before the normalized schemas it depends
on exist. The correct next boundary is therefore N12, the Canonical State
Registry, followed by the remaining Gate A schemas.

## Completed evidence

| Order | Status | Evidence |
| --- | --- | --- |
| N0–N6 | Complete | specification harness, Token schemas/registry/profile, resolver manifest, projector descriptors |
| N7–N11 | Complete | CSS input/policy/effective/binding schemas, pinned Webref generator, fixtures |
| Profile-level N21 proof | Partial early proof | direct/template/projector and negation validators exist, but declaration integration does not |

The early N21 proof is reusable and does not authorize skipping N12–N20.

## Required next work

| Priority | Order | Deliverable | Exit evidence |
| ---: | --- | --- | --- |
| 1 | N12 | Canonical State Registry schema/data | canonical state IDs, component applicability, positive/negative fixtures |
| 2 | N13 | Condition Registry schema/data | viewport/container/reduced-motion definitions, breakpoint Domain checks, contradiction fixtures |
| 3 | N14 | Ordered declaration/value schema | distinct CSS literal, Token Reference, and template forms; provenance and order fixtures |
| 4 | N15 | Appearance IR schema | slot/stage/condition structure and shorthand trace contracts |
| 5 | N16 | Motion IR schema | lifecycle, reduced-motion, Token binding, and backend-neutral value contracts |
| 6 | N17 | Behavioral Criteria Source/Profile schemas | pinned evidence manifest and Button/Select/Dialog criteria shapes |
| 7 | N18 | Generated/reference TypeScript types | schema-aligned State, Condition, declaration, Appearance, Motion, and Behavior types |
| 8 | N19 | Recipe Kernel proof | JSON-safe structural result and Button/Select/Dialog conformance suite |

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

## Next PR recommendation

Keep the next PR contract-first and bounded to N12–N13:

1. add Canonical State and Condition Registry schemas;
2. add authored registries and positive/negative semantic fixtures;
3. add deterministic registry/type generation only after schemas validate;
4. prove breakpoint Tokens are complete and theme-invariant;
5. stop before Recipe or runtime implementation.

This creates a reviewable authority boundary and prepares N14–N17 without
coupling State or Condition semantics to a renderer or provider.
