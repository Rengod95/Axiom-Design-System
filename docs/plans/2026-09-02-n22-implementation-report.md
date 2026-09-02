# N22 Appearance normalizer implementation report

**Status:** COMPLETE — N23 integrated; N24 is next

N22 owns receipt-bound normalization from a freshly revalidated N21 Recipe
definition to the closed N15 Appearance IR. It exposes the generated
`CSSAppearanceIR` as the sole normalized Recipe identity seam for N23 and
serializes that IR canonically: object keys are lexical while all precedence-bearing
arrays retain their authored order.

The normalizer does not emit CSS, class names, or runtime/provider code. It
returns a detached frozen result, keeps collisions in a separate trace, and
uses the public Condition analyzer to decide whether Condition rules can be
simultaneously active. It authenticates output profile identity through the
`css-profile-input` authority and validates generated Appearance and trace
artifacts against their declared schemas and semantic validators before and
after JSON round-trip. This validation is conformance-test evidence; the public
`normalize()` boundary itself returns the detached artifact and trace without
loading specification files.
