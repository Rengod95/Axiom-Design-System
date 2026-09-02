# N19 Recipe Kernel reconciliation

Status: **COMPLETE — reconciled against N18**.

`@axiom/recipe-kernel` is reconciled onto the completed N16--N18 contract baseline as a
renderer-neutral structural port. Its Condition-expression contract aliases the public
N18-generated `@axiom/condition-registry` reference type through a type-only development
dependency; no generated package is imported at runtime, and N20--N22 retain CSS
authoring, Token validation, and normalization ownership.

The public package exports only `createRecipeKernel<TStyle>()`, structural contracts,
diagnostics, and validation. `TStyle` is a JSON-safe plain object or ordered plain-array
fragment; class strings, functions, CSS output, Token resolution, React, and compiler
behavior are outside this package. Ordered arrays remain opaque structural data so N20
can later own same-stage declaration semantics. The N20 `defineRecipe` SDK entry point is
deliberately not exposed here.

Definitions are descriptor-validated before any property value is read. The boundary
rejects non-finite numbers, sparse arrays, array extra properties, symbols,
non-enumerable/accessor properties, `toJSON`, functions, non-plain prototypes, and
cycles. Successful definitions are copied descriptor-by-descriptor into frozen plain
JSON data; accepted ordered arrays are rebuilt as frozen plain Arrays. Results contain
only `definition` and `snapshot`; the compound matcher is an internal pure helper used by
structural tests.

Validation mirrors the common identifier and source-location contracts, uses escaped
JSON Pointers and nearest rule-local sources, and closes Recipe, predicate, State, and
Condition shapes. AXR1001--AXR1012 meanings are registered in SSOT-03. Production emit
excludes unit, conformance, and type-fixture files; the dedicated type-fixture project
continues to exercise literal Slot and style boundaries.

The reconciliation retains the generated-contract drift and package type gates in the
root check. Focused structural, type, full-check, test, build, and whitespace gates
verify the stacked package against the N18 baseline.
