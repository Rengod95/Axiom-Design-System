# Token Clean-Break Design

**Status:** Approved for implementation \
**Date:** 2026-09-02 \
**Base:** `main` after PR #4 and PR #5 (Gate A N14) \
**Stop condition:** hand off all three PRs for review; do not start N15

## Goal

Make the Token Foundation internally consistent without mixing the change into
Appearance IR. The end state uses one semantic scale vocabulary, one registered
palette shape, perceptual canonical colors with deterministic fallbacks, clear
background/surface/fill roles, and a broader aspect-ratio catalog.

## Delivery Topology

The changes are stacked because later source migrations consume the authority
created earlier, but each PR has its own tests and review boundary.

| PR | Base | Owns | Must not own |
| --- | --- | --- | --- |
| Governance | N14 `main` | ADR, SSOT, registry, policy link, NodeNext rationale, three plans | Token value migration |
| Color | Governance head | OKLCH/common/palette/color roles/themes/contrast/generated artifacts | size, space, ratios |
| Scale and ratio | Color head | scale vocabulary, logical space paths, ratios, generated artifacts | N15 Appearance IR |

All three remain open for user review. They are merged in stack order only
after approval.

## Compatibility

- Clean break: no old-to-new Token aliases.
- Generated `TokenPath` and resolved manifests are updated from normative
  sources, never by hand.
- Historical implementation reports may retain old example IDs; active ADR,
  SSOT, annex, registry, fixtures, and tests use the new contract.
- Component Tokens may expose evidence-backed subsets of a scale. Registered
  foundation scale families use `xs` through `xl`; `xxs`/`xxl` require an
  explicit registry entry.

## Color Contract

```json
{
  "$type": "color",
  "$value": {
    "colorSpace": "oklch",
    "components": [0.62, 0.19, 250],
    "alpha": 1,
    "hex": "#2377e8"
  }
}
```

The palette set is `neutral`, `brand`, `red`, `amber`, `green`, `cyan`, and
`purple`, each at `50–900`. `common.white` and `common.black` own absolute
endpoints. The Axiom validator checks color space, component precision, hex
shape, deterministic OKLCH-to-sRGB fallback, and contrast pairs in every
resolved context.

## Semantic Layer Contract

```text
background.canvas | subtle | inverse
surface.default | raised | overlay | brand
fill.neutral.* | brand.* | danger.*
```

Text, icon, border, status, focus, backdrop, and selection keep their distinct
purposes. Component aliases move from the removed `action` or old `surface`
paths to the closest new role. Color and shadow elevation remain separate.

## Scale and Space Contract

```text
core:      xs sm md lg xl
extended:  xxs ... xxl only with evidence
```

Core scale enforcement applies only to families registered as ordered size
families. Semantic words such as font-weight `medium`, duration `normal`, and
heading levels `h1–h6` are not rewritten.

Logical spacing is explicit:

```text
control.padding.inline
control.padding.block
layout.stack.gap
layout.cluster.gap
layout.gutter
layout.section
```

## Aspect-Ratio Contract

The required primitive IDs are:

```text
1x1, 1000x1618, 2x3, 3x4, 4x5, 5x4, 4x3, 3x2,
1168x1000, 1618x1000, 16x10, 16x9, 2x1, 5x2, 21x9, 3x1
```

Descriptions retain the human ratio. Values are deterministic width/height
numbers. Wanted directly supports a subset; portrait inverses and the custom
`1168x1000`, `5x2`, and `3x1` entries are Axiom extensions.

## Acceptance

Each PR must pass:

```bash
pnpm check
pnpm test
pnpm build
git diff --check
```

The final stack must additionally prove no old scale segments, `surface.sunken`,
old action-fill paths, removed palette coordinates, or source sRGB color values
remain in active normative sources or generated artifacts.
