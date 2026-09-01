# Recipe Authoring Third-Party Evaluation

**Date:** 2026-09-01 \
**Status:** REVIEWED / DECISION RECORDED IN ADR-0003 \
**Scope:** Recipe structure and authoring ergonomics; not CSS compiler selection

---

## 1. Required Capability

A candidate capable of replacing the Axiom Recipe kernel must preserve all of
the following before CSS compilation:

| Capability | Why Axiom requires it |
| --- | --- |
| literal-inferred slots | Slot IDs are Recipe and Component Token identities |
| literal-inferred variant axes and values | Generated public component props depend on them |
| required/default variant distinction | Runtime evaluator input must be exact |
| per-slot base and variant application | Select/Dialog are multi-part |
| ordered compound variants | Precedence and diagnostics depend on source order |
| scalar equality and simple OR | v0.1 condition algebra |
| slot-local provider state | repeated Select items have independent state |
| environment conditions separate from state | responsive appearance is not behavior |
| style fragments available as data | CSS Profile must validate property and Token Domain |
| JSON-safe normalized result | schema round trip and non-TypeScript consumers |
| source provenance | diagnostics need Recipe/Slot/stage/location |
| no class/CSS-engine authority | Web compiler owns final CSS |

Supporting only the first six items is useful authoring evidence but is not a
complete replacement.

---

## 2. Candidate Summary

| Candidate | Slots | Defaults | Compounds | Per-slot compounds | Style before output | Primary coupling | v0.1 disposition |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Panda Slot Recipes | yes | yes | yes | yes | yes, Panda style object | Panda tokens, utilities, conditions, atomic generator | primary shape reference |
| Tailwind Variants | yes | yes | yes | yes, including compound slots | class strings | Tailwind class resolution/runtime merge | ergonomics reference only |
| CVA | no native slots | yes | yes | no | class strings | class concatenation | too small for Core |
| vanilla-extract Recipes | no native slots | yes | yes | no | style objects at authoring | vanilla-extract compiler/plugin | single-slot reference only |

`yes` in this table means that the library documents the feature, not that the
feature has Axiom-equivalent semantics.

---

## 3. Panda CSS Slot Recipes

### Strong fit

- `slots`, per-slot `base`, `variants`, `defaultVariants`, and
  `compoundVariants` closely match Axiom's desired structural shape;
- variant prop types are inferred;
- compound application can target individual slots;
- generation happens ahead of time rather than requiring a general runtime
  style compiler;
- the official example includes `marginStart`, which confirms that multi-slot
  layout spacing is an ordinary Recipe concern.

### Semantic mismatch

- style properties include Panda utility aliases rather than only canonical CSS
  property projections;
- token paths and token resolution follow Panda configuration;
- conditions and nested selectors may appear inside style objects;
- compound state is ordinarily modeled as a variant, while Axiom separates
  design Variant from provider State and environment Condition;
- output is atomic CSS/classes, bypassing Axiom declaration provenance,
  shorthand analysis, profile digest, and Web compiler;
- slot targeting may generate selector conventions that Axiom deliberately
  excludes from serialized IR.

### Conclusion

Panda is the best design reference and the first optional importer candidate.
Directly importing its evaluator or generated output into Axiom Core would
collapse the boundaries ADR-0001 established.

---

## 4. Tailwind Variants

### Strong fit

- native slots and typed per-slot variants;
- compound variants and compound slots;
- default variants;
- extension/composition ergonomics;
- small call-site API that fits component libraries.

### Semantic mismatch

- values are Tailwind class strings rather than canonical declarations;
- conflict resolution is class/Tailwind-specific;
- extension inherits library-specific merging semantics;
- responsive behavior is expressed through Tailwind classes rather than the
  Axiom Condition Registry;
- class output loses Token Reference, property, stage, and source provenance.

### Conclusion

Tailwind Variants is useful for call-site and future composition design, but it
cannot be the normalized authoring kernel for a direct CSS compiler.

---

## 5. Class Variance Authority

### Strong fit

- very small API;
- variants, default variants, boolean variants, compound variants;
- array values in compound conditions cover simple OR ergonomically;
- mature conceptual vocabulary shared by several libraries.

### Semantic mismatch

- no native Slot model;
- class-string input/output;
- no state/condition distinction;
- no structured style data for Token Domain or CSS grammar validation;
- no declaration origin or serialized Appearance IR.

### Conclusion

CVA validates the core variant vocabulary but adopting it would not remove the
hard Axiom-specific work.

---

## 6. vanilla-extract Recipes

### Strong fit

- typed variants, default variants, and compound variants;
- styles are structured at authoring time;
- CSS is statically extracted;
- single-slot components have a concise model.

### Semantic mismatch

- multi-slot recipes require an additional composition convention;
- style compilation is owned by vanilla-extract and its build integration;
- normalized data is not an Axiom JSON IR;
- provider state, environment condition, profile digest, and Component Token
  projection remain external work.

### Conclusion

It is a useful build-time comparison but not a multi-slot Recipe authority.

---

## 7. Decision Matrix

Scoring uses `3 = native/good fit`, `2 = adaptable`, `1 = major wrapper`, and
`0 = incompatible or absent`.

| Criterion | Panda Slot Recipe | Tailwind Variants | CVA | vanilla-extract |
| --- | ---: | ---: | ---: | ---: |
| slots/per-slot application | 3 | 3 | 0 | 1 |
| variants/defaults/compounds | 3 | 3 | 3 | 3 |
| style data before class output | 2 | 0 | 0 | 2 |
| Axiom State/Condition separation | 1 | 0 | 0 | 0 |
| JSON-safe Axiom IR potential | 1 | 0 | 0 | 1 |
| Token Domain/CSS Profile integration | 1 | 0 | 0 | 1 |
| compiler neutrality | 1 | 0 | 1 | 0 |
| authoring ergonomics evidence | 3 | 3 | 3 | 2 |
| **Total / 24** | **15** | **9** | **7** | **10** |

The score is an architectural-fit aid, not a general quality ranking.

---

## 8. Recommended Implementation

### Step 1 — Generic structural kernel

```ts
interface RecipeKernelDefinition<
  TSlots extends string,
  TVariants extends VariantMap,
  TStyle,
> {
  id: string;
  slots: readonly TSlots[];
  base?: Partial<Record<TSlots, TStyle>>;
  variants?: VariantDefinition<TSlots, TVariants, TStyle>;
  defaultVariants?: DefaultVariantSelection<TVariants>;
  compoundVariants?: readonly CompoundDefinition<
    TSlots,
    TVariants,
    TStyle
  >[];
}
```

The actual reference types must avoid widening literal values and must reflect
required versus defaulted axes.

### Step 2 — Axiom profile extensions

The CSS authoring layer adds:

```text
states
conditions
Token-aware CSS style fragments
source locations
profile identity
```

These remain outside a generic third-party-inspired structural kernel.

### Step 3 — Normalize immediately

`defineRecipe` output is validated and normalized at build time. Runtime React
code imports generated evaluators, never the authoring library.

### Step 4 — Optional importer proof after Gate A

Test a strict Panda Slot Recipe source importer against Button and Select. The
importer must fail closed for:

```text
Panda utility aliases without canonical mapping
nested selectors
arbitrary conditions
runtime callbacks
Panda-only Token paths
compound state represented as a visual variant
```

No importer is a Gate A requirement.

---

## 9. Revisit Conditions

Direct third-party adoption may be reconsidered only if a candidate can:

1. expose pre-evaluation structural data;
2. accept Axiom's generated style type without owning Token/CSS semantics;
3. keep State and Condition axes distinct;
4. emit no class or compiler artifact before Axiom normalization;
5. pass the same schema, diagnostic, round-trip, and provenance fixtures.

---

## References

- [Panda CSS Slot Recipes](https://panda-css.com/docs/concepts/slot-recipes)
- [Panda CSS Recipes](https://panda-css.com/docs/concepts/recipes)
- [Tailwind Variants API](https://www.tailwind-variants.org/docs/api-reference)
- [Class Variance Authority variants](https://cva.style/getting-started/variants/)
- [vanilla-extract Recipes](https://vanilla-extract.style/documentation/packages/recipes/)
