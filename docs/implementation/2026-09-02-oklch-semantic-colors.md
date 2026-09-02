# OKLCH and Semantic Color Migration

**Date:** 2026-09-02 \
**Scope:** clean-break governance stack, pull request 2 of 3 \
**Base:** Token Governance and Vocabulary Registry pull request \
**Gate A effect:** none; N15 remains blocked for user review

## Delivered

- All production explicit colors use canonical OKLCH components, alpha, and a
  lowercase six-digit sRGB hex fallback.
- The deterministic converter pins 6/6/3 component precision and an
  OKLCH-chroma-reduction fallback mapping.
- Every `neutral`, `brand`, `red`, `amber`, `green`, `cyan`, and `purple`
  palette exposes exactly `50–900`; absolute endpoints are
  `color.primitive.common.white` and `.black`.
- Environmental `background`, contained `surface`, and compact `fill` roles
  replace the ambiguous old surface/action split in base, light, and dark
  sources.
- `surface.sunken` and `action.*` are removed, status painted regions use
  `.background`, and component aliases target the new roles.
- Contrast validation reads the required hex fallback and checks every policy
  pair in both resolved theme contexts.
- The breaking Token source profile advances to `0.2.0`, and generator
  provenance advances to `0.3.0` for the new policy behavior.

## Conformance Evidence

The color profile validator rejects non-OKLCH values, malformed components,
excess precision, invalid or mismatched fallbacks, missing common endpoints,
non-opaque palette colors, and unregistered shades. All migrated values
round-trip to their prior sRGB fallback at the pinned precision.

The specification inventory is now:

```text
32 schemas
14 registries
25 positive fixtures
51 negative fixtures
```

Regeneration produces 566 Tokens in two complete contexts. The generated
manifest and `TokenPath` contract contain no removed palette coordinates,
`surface.sunken`, or `action.*` paths.

## Deferred to the Stack

- Ordered size and spacing vocabulary normalization and aspect-ratio expansion
  remain in pull request 3.
- Appearance IR N15 begins only after the user reviews all three pull requests.
