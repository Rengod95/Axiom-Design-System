# @axiom/motion-schema

**Lifecycle: deprecated pre-Studio baseline; frozen reference and reuse candidate.**

This package is not a supported implementation of the redesigned Studio contract.
It remains private and is not being deprecated in an npm registry.

Retained evidence: Web motion grammar, authority checks and regression fixtures.

Required redesign boundary: Do not use CSS-coupled motion and CSS Appearance IR as the shared motion contract.

Related decisions: D18, D27, D30.

Do not import this package into new product code by default, weaken its fixtures,
or delete generated files independently. Reuse requires an explicit new owner,
contract mapping and verification. See [ADR-0006](../../docs/adr/0006-product-reset-and-reference-lifecycle.md) and the
[retirement ledger](../../docs/maintenance/pre-studio-retirement.md).
