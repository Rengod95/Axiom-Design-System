# ADR-0003 — Recipe Authoring Kernel and Third-Party Boundary

**Status:** ACCEPTED \
**Date:** 2026-09-01 \
**Decision owners:** Axiom Foundation \
**Amends:** SSOT-00, SSOT-02, SSOT-03

---

## 1. Context

Axiom Recipe authoring needs slots, variants, defaults, compound variants,
slot-local behavior states, environment conditions, literal type inference,
serializable normalization, Token Domain validation, and deterministic CSS
cascade output.

Established libraries already solve part of this problem:

- Panda CSS Slot Recipes provide slots, variants, defaults, compound variants,
  per-slot styles, type inference, and build-time CSS generation;
- Tailwind Variants provides slots, compound slots, default/compound variants,
  extension, and typed class selection;
- Class Variance Authority provides a small variant/default/compound core;
- vanilla-extract Recipes provides typed variants and compound variants with
  build-time CSS extraction.

Their public shapes are valuable evidence. Their output semantics are not the
same as Axiom Appearance IR.

---

## 2. Decision

### 2.1 Adopt the proven structural vocabulary

Axiom v0.1 keeps the following authoring concepts:

```text
slots
base
variants
defaultVariants
compoundVariants
states
conditions
```

`slots`, `variants`, `defaultVariants`, and `compoundVariants` deliberately
follow familiar Panda/CVA/Tailwind Variants ergonomics where their semantics do
not conflict with Axiom.

### 2.2 Axiom owns a renderer-neutral Recipe Kernel contract

The authoring package exposes an Axiom-owned structural port parameterized by a
style fragment type.

```ts
interface RecipeKernelPort<TStyle> {
  define<const TDefinition extends RecipeKernelDefinition<TStyle>>(
    definition: TDefinition,
  ): DefinedRecipe<TDefinition>;
}
```

The kernel owns structural validation and literal inference. The CSS Appearance
Profile supplies `TStyle` and performs property/value normalization.

The kernel does not emit CSS, class strings, DOM selectors, React nodes, or
runtime callbacks.

### 2.3 No evaluated third-party output becomes Adapter input

Panda, Tailwind Variants, CVA, and vanilla-extract all eventually return or emit
CSS/class artifacts under their own styling semantics. Those artifacts cannot
be losslessly converted back into Axiom Token References, declaration origins,
profile digests, state/condition axes, or ordered declaration IR.

Therefore no v0.1 normative compiler package directly consumes their evaluated
output.

### 2.4 Panda Slot Recipes is the primary authoring-shape reference

Panda Slot Recipes is the closest structural reference because it supports
multi-part components and compound variants with per-slot style application.
Tailwind Variants is a secondary reference for compound slots, extension, and
call-site ergonomics.

Reference does not mean dependency authority. Axiom independently specifies and
tests every retained semantic.

### 2.5 Optional source interop is downstream and loss-aware

After Gate A, optional packages may import a documented subset of third-party
source definitions:

```text
@axiom/interop-panda
@axiom/interop-tailwind-variants
```

Such an importer must reject selectors, utilities, responsive shortcuts,
runtime class functions, or other constructs without a lossless Axiom
equivalent. It produces ordinary Axiom authoring data and is never an alternate
IR or compiler path.

### 2.6 A conformance suite precedes implementation selection

Before the Recipe kernel is frozen, the same Button, Select, and Dialog
definitions must prove:

- literal slot and variant inference;
- defaulted versus required variants;
- per-slot base/variant/compound application;
- scalar AND and per-field simple OR matching;
- state and condition separation;
- JSON-safe normalized output;
- source-location diagnostics;
- no class-string or CSS-engine leakage.

If a third-party library can later satisfy the port without semantic loss, its
adapter may replace the reference kernel implementation without changing the
normative authoring or IR schemas.

---

## 3. Consequences

### Positive

- authors receive a familiar, already field-tested Recipe shape;
- Axiom retains its Token, CSS Profile, state, condition, and serialization
  guarantees;
- third-party adoption remains possible through a narrow replaceable port;
- the compiler does not become coupled to Tailwind, Panda, a bundler plugin, or
  runtime class merging.

### Cost

- Axiom implements a small structural kernel instead of delegating the complete
  pipeline;
- optional importers can support only a strict subset of third-party features;
- extension/composition semantics require a separate Axiom decision rather than
  inheriting one library's merge rules.

---

## 4. Rejected Alternatives

### Use Tailwind Variants as Core

It models values as class strings and resolves conflicts according to Tailwind
class semantics, which cannot preserve Axiom declaration and Token provenance.

### Use Panda Slot Recipes as Core

Its closest features are compelling, but its style aliases, condition syntax,
Token configuration, selector features, and atomic generation would make Panda
an undeclared authority over Axiom CSS and Token semantics.

### Use CVA plus a hand-built Slot wrapper

This remains class-string based and would recreate slot/state/condition and
normalization semantics around a kernel too small to remove meaningful work.

### Use vanilla-extract Recipes as Core

It is tied to vanilla-extract build-time CSS and does not natively own Axiom's
multi-slot, provider state, condition, or serializable IR requirements.

---

## References

- [Panda CSS Slot Recipes](https://panda-css.com/docs/concepts/slot-recipes)
- [Panda CSS Recipes](https://panda-css.com/docs/concepts/recipes)
- [Tailwind Variants slots](https://www.tailwind-variants.org/docs/slots)
- [Tailwind Variants compound variants](https://www.tailwind-variants.org/docs/compound-variants)
- [Class Variance Authority variants](https://cva.style/getting-started/variants/)
- [vanilla-extract Recipes](https://vanilla-extract.style/documentation/packages/recipes/)
