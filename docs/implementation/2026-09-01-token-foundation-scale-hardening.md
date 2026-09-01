# Token Foundation scale hardening

**Date:** 2026-09-01  
**Status:** COMPLETE  
**Scope:** Primitive/Semantic separation, production palettes, spacing and unit
policy, responsive scale, typography coverage, and resolved contrast

## Audit result

The first P2 corpus proved parsing, resolution, generated types, and every Token
Domain, but its value coverage was an MVP sample rather than a production
foundation. It contained only four Primitive colors, two spacing values, one
font size, and one font weight. Product-purpose names including `disabled`,
`backdrop`, `control`, `focus`, `overlay`, and `productive` also appeared
in the Primitive tier.

## Corrective contract

The corrected corpus contains 578 Tokens:

| Tier | Count | Responsibility |
| --- | ---: | --- |
| Primitive | 237 | registered values, scales, palettes, ratios, and curves |
| Semantic | 301 | product-wide roles and all typography compositions |
| Component | 40 | evidence-backed Button, Select, and Dialog axes |

The production profile now provides:

- neutral, brand, red, amber, green, cyan, and purple shade systems;
- surface, text, icon, border, action, status, focus, selection, and backdrop
  roles with complete light/dark overrides;
- a 4px spacing grid and rem-based size, radius, font-size, blur, and breakpoint
  scales;
- px-only border and stroke hairlines;
- viewport and container breakpoint roles from 30rem through 96rem;
- a 16px base body, 13px minimum body, h1 through h6, label, code, and display
  styles;
- regular, medium, semibold, and bold composites for every typography family;
- deterministic contrast checks for required semantic foreground/background
  pairs in both theme contexts.

## Unit boundary

DTCG 2025.10 admits only `px` and `rem` for dimension values. Axiom therefore
does not add a private `em` source extension. Component-relative and media
condition `em` values may be derived later by the owning CSS or Condition
serializer from registered rem values. This preserves DTCG interoperability and
keeps platform conversion explicit.

## Enforcement

`spec/token/foundation-token-policy.json` is a normative registry. The Token
generation gate rejects:

- semantic usage terms in Primitive paths;
- missing or extra palette shades and space steps;
- values outside the 4px spacing rhythm;
- Domain/unit mismatches;
- missing font-size, weight, or typography family variants;
- resolved semantic contrast below the registered threshold.

Generated manifests and public Token path types retain their existing
source-digest and byte-drift guarantees.

## Public reference boundary

The change uses public systems as structural evidence, not as a source of
private or copied product values:

- [DTCG 2025.10](https://www.designtokens.org/TR/2025.10/format/) for portable
  value shapes and the px/rem dimension boundary;
- [Toss colors](https://tossmini-docs.toss.im/tds-mobile/foundation/colors/) and
  [Toss typography](https://tossmini-docs.toss.im/tds-react-native/foundation/typography/)
  for shared palette vocabulary, hierarchy, and cross-platform type rules;
- [Apple typography](https://developer.apple.com/design/human-interface-guidelines/typography)
  for scalable text hierarchy and user-adjustable sizing;
- [Vercel Geist colors](https://vercel.com/geist/colors) and
  [typography](https://vercel.com/geist/typography) for ordered color scales,
  accessible text roles, and composed typography styles;
- [Linear brand guidance](https://linear.app/brand) for restrained,
  light/dark-compatible brand color use.

## Verification

```text
pnpm tokens:check
pnpm spec:check
pnpm test
pnpm build
```

The source, policy, resolved manifests, generated types, and tests are reviewed
as one atomic contract.
