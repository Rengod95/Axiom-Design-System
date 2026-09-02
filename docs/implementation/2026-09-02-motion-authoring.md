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
- `createMotionAuthoring()` accepts profile registry/provenance, resolved Token Manifest/Domain Registry, State
  and Condition registries, expected digests, canonical digest port, and Token
  serializer ports, plus the closed N22 `CSSAppearanceIR` and its expected
  canonical digest.
- Source segments require explicit position and transition; tracks require
  property and `allowDiscrete`. Two value shorthand keyframes normalize to
  offsets zero/one; three or more keyframes require explicit offsets.
- Direct Tokens are binding- and serializer-validated in every resolved
  context; templates retain Token references and use a synthetic CSS variable
  for grammar validation. No Token is resolved into Motion IR.
- Canonical-digest, authority-validation, and Token-serializer function
  identities are captured at construction time so later caller mutation cannot
  change a previously created normalizer.
- N16 diagnostics and warnings are preserved. Backend AXM1006 and provider
  AXM1009 remain deferred to N31/N33.

## Reconciliation

SSOT-04 v0.2.3 replaces the incomplete keyed example with ordered source
phases/segments, adds mandatory `recipeId` and `allowDiscrete`, and makes
profile/digest ownership explicit. It allocates AXM1018 for N22 Appearance
applicability or digest failures. SSOT-02 now distinguishes this build-time
normalization boundary from the forbidden compiler input.

N23 validates the closed/schema-semantic form of every supplied authority
before it compares canonical digests. That includes a closed Effective Property
Registry, a two-context Token Manifest with stable ordered per-Token
domain/tier/type identities, resolved (non-alias) values and dependencies,
Domain/type compatibility, canonical Domain/State/Condition registry order,
and the complete N15 Appearance shape and its recipe/slot/origin-stage/state/
condition relationships. Malformed authority or serializer input short-circuits
as the sole AXM2004 diagnostic; AXM1018 remains reserved for an otherwise
valid, authenticated Appearance identity or digest mismatch. N23 then authenticates
the detached N22 Appearance artifact through the supplied canonical digest,
verifies its profile provenance, and requires the Motion source `recipeId` and
`slot` to exist in that artifact. This binds applicability without a dependency
on the Appearance normalizer package.

The N23 package has the deliberately one-way dependencies
`@axiom/css-property-profile`, `@axiom/condition-registry`, and
`@axiom/tokens`. It has no dependency on Appearance authoring, spec tooling,
compiler, runtime, or provider packages. The current `CanonicalDigestPort` and
Token serializer structural interfaces are supplied by `@axiom/tokens`; no new
shared serializer package is introduced.
