# Axiom

Axiom is being redesigned as a design-system builder in Axiom Studio. The active repository is a **documentation and product-definition workspace**. It does not currently contain an installable Studio, a token compiler, or an executable UI library.

Start with the [documentation entry point](docs/README.md). The owner's sequence is: confirm product decisions, confirm the Foundation 1.0.0 document index and development direction, write and confirm that documentation, then implement the product. The version names an intended documentation baseline, not a released product.

The earlier implementation has been removed from the active tree as a complete source, specification, fixture, generator and build set. It remains recoverable at a pinned Git commit through the [pre-Studio reference guide](reference/pre-studio/README.md). That directory contains inventory and restoration instructions, not another executable copy. See the [retirement ledger](docs/maintenance/pre-studio-retirement.md).

## Current verification

Python 3.9+ and Git are the only requirements:

```sh
python3 scripts/verify-retirement.py
python3 scripts/verify-retirement.py --self-test
```

These check snapshot integrity and restoration, retired-path absence, unchanged legal files and local document links. They are **not product tests**. Old pnpm checks are available only in a restored reference; earlier results retain their original revision scope.

The existing [license](LICENSE) is unchanged. Future product licensing and distribution require their own documented approval.
