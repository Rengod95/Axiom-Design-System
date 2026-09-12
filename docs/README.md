# Axiom documentation

**Current phase: product direction confirmed; document index and development approach proposed for owner review.** Full documentation and new product implementation have not started.

Start with the [Foundation 1.0.0 index proposal](foundation/README.md), the [56-document responsibility index](foundation/document-index.md), and the [129-decision mapping](foundation/decision-coverage.md). The [owner direction approval](decisions/axiom-foundation-direction-approval.md) records what is confirmed and which technology, licensing and evidence decisions remain conditional.

1. [Product phase and confirmation sequence — ADR-0006](adr/0006-product-reset-and-reference-lifecycle.md)
2. [Git-only source preservation and active-tree retirement — ADR-0007](adr/0007-git-reference-and-documentation-phase.md)
3. [Retirement ledger](maintenance/pre-studio-retirement.md)
4. [Frozen source reference and restoration](../reference/pre-studio/README.md)
5. [Engineering rules and their current scope](standards/source-code-and-module-structure.md)

The owner confirmed the D01–D39 directions, follow-up interpretations, delegated defaults and conditional selection procedures. Unselected technologies, exact licenses/prices and runtime evidence are not made final by that confirmation. The proposed index still needs its own confirmation. Planning Markdown and JSON may be added under `docs/`; adding them does not make proposals accepted.

## Required progression

1. Reconcile and confirm the owner's task decisions.
2. Propose the document index and sustained development approach across product, business, technology, architecture, design, UX/UI, marketing and operations; obtain confirmation.
3. Write against the approved index, reconcile contracts, examples and evidence, and obtain confirmation of the complete documentation baseline.
4. Implement the new product only after that confirmation.

Retirement is independently authorized. It must not start new syntax, package, UI or adapter implementation before step 4.

## Authority during this phase

Explicit owner decisions govern product direction. Accepted lifecycle ADRs govern repository preservation and phase boundaries. Draft design documents remain proposals until confirmed. Pinned earlier ADRs, SSOT, schemas, fixtures and results explain only their historical implementation; they are not active instructions for Studio.

`python3 scripts/verify-retirement.py` checks this documentation phase. Source-build and product-test evidence will be introduced with the approved implementation bootstrap; it is not inferred from these checks.
