# ADR-0004 — Token Vocabulary and Perceptual Color Profile

**Status:** ACCEPTED \
**Date:** 2026-09-02 \
**Decision owners:** Axiom Foundation \
**Amends:** SSOT-01 v0.3.x and the Token Foundation Policy \
**Reconciled by:** SSOT-01 v0.4.0

---

## 1. Context

The production Token corpus mixes `xsmall`/`small`/`medium` with
`sm`/`md`/`lg`, uses different shade coordinates for neutral and chromatic
palettes, and represents every authored color in sRGB. It also places page
backgrounds, contained layers, and recessed regions under one `surface`
family. Those choices make authoring inconsistent and leave the intended layer
model unclear.

The packages are private, but Token IDs and generated `TokenPath` unions are
still serialized contracts. This migration therefore treats every renamed or
removed Token ID as an intentional breaking change.

## 2. Decision

### 2.1 Clean break and review stack

The migration is delivered as three stacked, independently verified pull
requests:

1. governance, authority documents, vocabulary registry, and NodeNext import
   rationale;
2. palette and semantic color migration;
3. semantic size/space and aspect-ratio migration.

No compatibility aliases are added to the DTCG graph. The stack is merged in
order after review; the target contract is complete only when all three changes
are present.

The production-grade Token requirements approved by the repository owner are
the decision input for this ADR and supersede conflicting draft examples in
SSOT-01 v0.3.x. This does not make an implementation authoritative: this ADR
records the change, SSOT-01 v0.4.0 describes the resulting contract, and the
machine-readable policy and vocabulary registry enforce it. The final stack was
restored to `main` through recovery PR #10 before this reconciliation; no
intermediate stack state was released.

### 2.2 Primitive color profile

- Every palette exposes exactly `50, 100, ..., 900`.
- Absolute white and black are `color.primitive.common.white` and
  `color.primitive.common.black`.
- Authored color values use DTCG `colorSpace: "oklch"`.
- Axiom strengthens DTCG by requiring a lowercase six-digit sRGB `hex`
  fallback for every explicit color value. Alpha remains a separate field.
- OKLCH components use at most six decimal places for lightness and chroma and
  at most three decimal places for hue.
- Fallback generation preserves lightness and hue and reduces chroma until the
  color is in sRGB, then rounds channels to 8-bit values. The implementation and
  fixtures own the exact deterministic algorithm.

The `hex` field is an Axiom profile requirement, not a DTCG requirement. DTCG
2025.10 deliberately leaves fallback gamut mapping to tools.

### 2.3 Semantic color roles

The top-level roles are distinct:

| Role | Owns | Does not own |
| --- | --- | --- |
| `background` | app, page, and section environment | contained card or popup layers |
| `surface` | card, panel, popover, dialog, and other contained layers | page canvas |
| `fill` | controls, badges, selections, and other compact painted regions | text or environmental backgrounds |

`surface.sunken` is removed. Its environmental use becomes
`background.subtle`; contained layers use an explicit `surface` role. Shadow
elevation remains in the `shadow` Domain and is not encoded in color names.

### 2.4 Semantic scale vocabulary

The canonical ordered Token scale is:

```text
xs, sm, md, lg, xl
```

`xxs` and `xxl` are permitted only for a registered family with a demonstrated
consumer. Long forms such as `xsmall`, `small`, `medium`, `large`, and `xlarge`
are not Token scale segments. This rule does not rename semantic words that are
not scale positions, such as the `medium` font-weight variant, nor does it force
every component API to expose five sizes.

### 2.5 Logical spacing roles

Logical axes remain part of the contract, with responsibility-bearing paths:

```text
space.semantic.control.padding.inline.<size>
space.semantic.control.padding.block.<size>
space.semantic.layout.stack.gap.<size>
space.semantic.layout.cluster.gap.<size>
space.semantic.layout.gutter.<size>
space.semantic.layout.section.<size>
```

The standalone `space.semantic.overlap` family is removed. A Recipe that needs
overlap uses a governed negative spacing operation with explicit declaration
provenance.

### 2.6 Aspect ratios

Primitive ratio IDs use normalized integer pairs and values use width divided
by height. The production set includes the requested portrait, landscape,
golden, wide, and panoramic ratios. `1168x1000` is retained as an explicit
Axiom custom ratio because `1.168:1` has no matching public reference in the
reviewed systems.

### 2.7 NodeNext imports

Relative TypeScript imports keep their emitted `.js` extension. With
`type: module` and `moduleResolution: NodeNext`, TypeScript resolves
`./module.js` to `module.ts` during compilation while Node executes the emitted
`module.js`. Relative `.ts` imports or extensionless imports are not the source
contract for this repository.

## 3. Consequences

### Positive

- palette coordinates and scale vocabulary become predictable;
- OKLCH becomes the perceptual authoring space without removing an sRGB
  fallback;
- environmental background, contained surface, and compact fill responsibilities
  are reviewable;
- generated Token paths expose one canonical naming system.

### Cost

- the migration changes Token IDs and regenerated manifests;
- every light/dark contrast pair must be revalidated;
- external consumers must migrate at the stack boundary because aliases are
  intentionally absent.

Because the packages had no supported external release, this migration is a
pre-Gate-A baseline reset rather than an in-place compatibility promise. The
resulting schema/profile identities are frozen as the starting point for future
change control.

## 4. Rejected Alternatives

### Change `.js` imports to `.ts` or omit extensions

This conflicts with the repository's NodeNext ESM emit and Node's mandatory
relative file extensions.

### Use Display P3 as the universal authored space

P3 is a device gamut, while OKLCH is better suited to perceptual scale design.
P3 remains a possible output target; it is not the canonical palette model.

### Keep `surface` as the only environmental and layered background family

This preserves the ambiguity that motivated the change and makes `sunken`
dependent on unfamiliar depth terminology.

### Publish compatibility aliases

Aliases would preserve two competing Token vocabularies in a private clean-break
migration and make the generated public union ambiguous.

## References

- [DTCG Color Module 2025.10](https://www.designtokens.org/TR/2025.10/color/)
- [Node.js mandatory ESM file extensions](https://nodejs.org/api/esm.html#mandatory-file-extensions)
- [TypeScript module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [Toss color system update](https://toss.tech/article/tds-color-system-update)
- [Geist Colors](https://vercel.com/geist/colors)
- [Wanted Semantic Colors](https://montage.wanted.co.kr/docs/foundations/base-material/colors/semantic)
- [Wanted Thumbnail ratios](https://montage.wanted.co.kr/docs/components/contents/thumbnail/web)
- [Apple color guidance](https://developer.apple.com/design/human-interface-guidelines/color)
