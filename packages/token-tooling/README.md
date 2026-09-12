# @axiom/token-tooling

**Lifecycle: deprecated pre-Studio baseline; frozen reference and reuse candidate.**

This package is not a supported implementation of the redesigned Studio contract.
It remains private and is not being deprecated in an npm registry.

Retained evidence: pinned parser boundary, default-system template, policy and negative fixtures.

Required redesign boundary: Separate generic DTCG ingestion from the default palette, scale, tier and theme policy.

Related decisions: D06–D08, D26.

Do not import this package into new product code by default, weaken its fixtures,
or delete generated files independently. Reuse requires an explicit new owner,
contract mapping and verification. See [ADR-0006](../../docs/adr/0006-product-reset-and-reference-lifecycle.md) and the
[retirement ledger](../../docs/maintenance/pre-studio-retirement.md).
