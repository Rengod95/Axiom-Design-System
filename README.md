# Axiom Design System

Axiom is being redesigned around **Design System Builder in Axiom Studio**.
This repository currently contains a deprecated pre-Studio reference implementation,
not a released Studio product.

Start with [ADR-0006](docs/adr/0006-product-reset-and-reference-lifecycle.md)
and the [retirement ledger](docs/maintenance/pre-studio-retirement.md).

## Current development phase

The owner will confirm D01–D39 decisions first, then the Foundation 1.0.0
document index and development direction, then the complete documentation.
New product implementation follows those confirmations. Repository retirement
is a separately authorized task; it does not approve new product architecture.

Initial authoring is GUI plus built-in AI. External React import and repeated
code-to-GUI synchronization are outside initial scope. Common component meaning
and Foundation tokens can be shared while Web and Mobile designs differ.
Exported source remains user-owned.

## Reference packages

All ten packages below are frozen reuse candidates. Existing algorithms and tests
may be reused only after checking their new ownership and contract. The lifecycle
label is not an npm deprecation and does not make the packages part of the new
Studio architecture.

| Package | Retained reference purpose |
| --- | --- |
| [@axiom/tokens](packages/tokens/README.md) | token validation, serializable values, context resolution, manifest fixtures |
| [@axiom/token-tooling](packages/token-tooling/README.md) | pinned parser boundary, default-system template, policy and negative fixtures |
| [@axiom/recipe-kernel](packages/recipe-kernel/README.md) | style structure, order, normalization and type fixtures |
| [@axiom/css-property-profile](packages/css-property-profile/README.md) | pinned Web CSS grammar, registry, binding and validation |
| [@axiom/appearance-authoring](packages/appearance-authoring/README.md) | Web style and token-binding validation |
| [@axiom/appearance-normalizer](packages/appearance-normalizer/README.md) | ordered declarations, provenance, collision traces and fixtures |
| [@axiom/condition-registry](packages/condition-registry/README.md) | environment condition analysis and regression cases |
| [@axiom/motion-schema](packages/motion-schema/README.md) | Web motion grammar, authority checks and regression fixtures |
| [@axiom/behavior-contracts](packages/behavior-contracts/README.md) | generated criteria and source-evidence contracts |
| [@axiom/spec-tooling](packages/spec-tooling/README.md) | schema harness, positive/negative fixtures, generators and digests |

The earlier runtime/Tailwind MVP packages were already removed before this change.
The current Recipe and appearance-normalization packages do exist; the old README
statement that they were absent was stale. No Studio renderer or complete platform
realization pipeline is claimed here.

## Reference authority and verification

For the retained implementation, use the scoped authority order in the
[documentation index](docs/README.md). Historical contracts remain available to
interpret its fixtures and generated artifacts, not to prescribe new product work.

`spec/`, `fixtures/`, `tokens/`, package manifests, generated files and the lockfile
remain connected to the current reference checks. Generated files must not be
edited independently to hide an incompatibility.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

See [source standards](docs/standards/source-code-and-module-structure.md).
Version numbers belong in contract data and provenance, not source identifiers,
filenames or directories.
