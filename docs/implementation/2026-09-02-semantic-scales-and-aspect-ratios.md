# Semantic Scales and Aspect Ratios

**Date:** 2026-09-02 \
**Scope:** clean-break governance stack, pull request 3 of 3 \
**Base:** OKLCH and Semantic Color Migration pull request \
**Gate A effect:** none; N15 remains blocked for user review

## Delivered

- Registry-backed Foundation validation projects the first label after every
  ordered-family path and requires the exact `xs`, `sm`, `md`, `lg`, `xl` set.
- `xxs` and `xxl` are accepted only for a family registered with evidence;
  unrelated meanings such as font-weight `medium`, duration `normal`, and
  heading levels remain unchanged.
- Font size, line height, typography, control height, icon size, logical
  spacing, and icon stroke-width families now expose the canonical five steps.
- Logical spacing uses `control.padding.{block,inline}` and
  `layout.{cluster,stack}.gap`; the unconsumed `space.semantic.overlap` family
  is removed.
- The primitive aspect-ratio catalog contains the approved 16 integer-pair IDs,
  deterministic width/height values, provenance, and human descriptions.
  Existing role-based media aliases remain intentionally sparse.
- Removed semantic paths are rejected in base and theme sources, and generated
  artifacts are derived from the migrated corpus.
- Generator provenance advances to `0.4.0` for registry-backed scale and ratio
  enforcement.

## Scale Mapping

`body.md` remains the 16px base size. Purpose-specific field, overlay, and
breakpoint families retain evidence-backed subsets because they are not
registered Foundation ordered scales. `strokeWidth.semantic.icon` is now a
registered ordered family rather than an undocumented long-form exception.

The control block-padding scale is `0/4/8/12/16px`; its existing `md` value
remains 8px. Stack gaps preserve the prior five values at
`4/8/16/24/32px`.

## Conformance Evidence

The production corpus now contains 635 Tokens in two complete contexts. The
Foundation validator rejects missing core labels, long-form or unregistered
extended labels, removed paths in base or themes, missing or extra ratios,
incorrect ratio values, and description drift.

The specification inventory remains:

```text
32 schemas
14 registries
25 positive fixtures
51 negative fixtures
```

## Handoff

This completes the three-pull-request clean-break stack. Appearance IR N15 is
not started; it begins only after the user reviews the full stack.
