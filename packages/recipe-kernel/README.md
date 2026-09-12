# @axiom/recipe-kernel

**Lifecycle: deprecated pre-Studio baseline; frozen reference and reuse candidate.**

This package is not a supported implementation of the redesigned Studio contract.
It remains private and is not being deprecated in an npm registry.

Retained evidence: style structure, order, normalization and type fixtures.

Required redesign boundary: Retain only as a possible internal style mechanism; it is not the Studio command kernel.

Related decisions: D13, D19–D20.

Do not import this package into new product code by default, weaken its fixtures,
or delete generated files independently. Reuse requires an explicit new owner,
contract mapping and verification. See [ADR-0006](../../docs/adr/0006-product-reset-and-reference-lifecycle.md) and the
[retirement ledger](../../docs/maintenance/pre-studio-retirement.md).
