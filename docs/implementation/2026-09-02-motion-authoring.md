# N23 Motion Authoring

**Status:** complete; N24 Button vertical fixture is next
**Date:** 2026-09-02

N23 extends `@axiom/motion-schema` with literal-preserving Motion source
capture and an explicit-context normalizer. It emits the existing N16 Motion
IR; it does not add a backend plan, runtime behavior, provider lifecycle, or
compiler input shortcut.

## Delivered boundary

- `defineMotion()` captures frozen JSON-safe source with explicit `id`,
  `recipeId`, `slot`, ordered phases, and required reduced-motion policy.
- `createMotionAuthoring()` accepts the exact detached six-authority bundle:
  Effective Property Registry, Resolved Token Manifest, Token Domain Registry,
  Canonical State Registry, Condition Registry, and closed N22
  `CSSAppearanceIR`; it deep-snapshots that bundle and every expected digest,
  then accepts trusted canonical-digest and `MotionAuthorityValidationPort`
  inputs plus Token serializer ports.
- Source segments require explicit position and transition; tracks require
  property and `allowDiscrete`. Two value shorthand keyframes normalize to
  offsets zero/one; three or more keyframes require explicit offsets.
- Direct Tokens are binding- and serializer-validated in every resolved
  context; templates retain Token references and use a synthetic CSS variable
  for grammar validation. No Token is resolved into Motion IR.
- N16 diagnostics and warnings are preserved. Backend AXM1006 and provider
  AXM1009 remain deferred to N31/N33.

## Reconciliation

SSOT-04 v0.3.0 replaces the incomplete keyed example with ordered source
phases/segments, adds mandatory `recipeId` and `allowDiscrete`, and makes
profile/digest ownership explicit. It allocates AXM1018 for N22 Appearance
applicability or digest failures. SSOT-02 now distinguishes this build-time
normalization boundary from the forbidden compiler input.

N23 validates the closed/schema-semantic form of every supplied authority
before it compares canonical digests. The composition root must asynchronously
preload `createMotionAuthorityValidationPort(specRoot)` and inject its
synchronous `MotionAuthorityValidationPort` before calling
`createMotionAuthoring()`/`defineMotion()`. The port owns six fixed internal
schema/semantic pairs and evaluates them against the supplied bundle as the
cross-authority registry context: Effective Property Registry; Resolved Token
Manifest; Token Domain Registry; Canonical State Registry; Condition Registry;
and the complete N15 Appearance artifact. This is deliberately not a runtime
spec-tooling dependency or package cycle.

The validation includes a two-context Token Manifest with stable ordered
per-Token domain/tier/type identities, resolved (non-alias) values and
dependencies, Domain/type compatibility, canonical Domain/State/Condition
registry order, and Appearance recipe/slot/origin-stage/state/condition
relationships. `MotionAuthorityValidationPort` is an explicit trusted
composition input analogous to `canonicalDigest`; a pass-through unit stub is
non-conformance-only. Malformed authority/serializer input, a validator result,
or validator throw short-circuits as AXM2004 only. AXM1018 remains reserved for
an otherwise valid, authenticated Appearance identity or digest mismatch. N23
then authenticates the detached N22 Appearance artifact through the supplied
canonical digest, verifies profile provenance, and requires the Motion source
`recipeId` and `slot` to exist in that artifact.

## Hostile authority evidence

The real preloaded validator has 33 hostile authority cases. They mutate all
six bundle members—including ordering, cross-authority references, unresolved
Token data, closed roots, and Appearance origin/applicability—and prove both a
non-empty validator result and the single public AXM2004 normalization. This
evidence is distinct from synchronous unit tests using a pass-through port.

The N23 package has the deliberately one-way dependencies
`@axiom/css-property-profile`, `@axiom/condition-registry`, and
`@axiom/tokens`. It has no dependency on Appearance authoring, spec tooling,
compiler, runtime, or provider packages. The current `CanonicalDigestPort` and
Token serializer structural interfaces are supplied by `@axiom/tokens`; no new
shared serializer package is introduced.
