# Axiom documentation

The current product direction and document index are confirmed. All 56 Foundation bodies and governed annexes passed the 2026-09-13 semantic audit after repairs. PR #25 merged and the owner's conditional implementation authorization is fulfilled in [baseline approval](decisions/axiom-foundation-baseline-approval.json). [ADR-0009](adr/0009-ads-kernel-implementation-bootstrap.md) accepts the bounded I1 document kernel before product code was added; [ADR-0010](adr/0010-source-preserving-draft-authoring.md) extends it to source-preserving draft authoring and common-envelope schema validation.

1. [Foundation reading entry](foundation/README.md)
2. [Document index](foundation/document-index.md)
3. [Baseline review](foundation/baseline-review.md)
4. [Decision coverage](foundation/decision-coverage.md)
5. [Direction approval](decisions/axiom-foundation-direction-approval.md) and [index approval](decisions/axiom-foundation-index-approval.md)
6. [Kernel quickstart](implementation/kernel-quickstart.md) and [implementation evidence](implementation/kernel-evidence.md)
7. [Initial self-review and continuation](implementation/initial-kernel-review.md), [schema evidence](implementation/schema-selection-evidence.md) and [remaining implementation map](implementation/implementation-roadmap.json)

Current lifecycle authority remains [ADR-0006](adr/0006-product-reset-and-reference-lifecycle.md), [ADR-0007](adr/0007-git-reference-and-documentation-phase.md) and the explicit implementation amendments in ADR-0009 and ADR-0010. Documentation QA and reference restoration checks do not prove product runtime support.

[Engineering principles](standards/source-code-and-module-structure.md), [retirement ledger](maintenance/pre-studio-retirement.md), and [reference restoration](../reference/pre-studio/README.md) continue to govern the preserved history. The new core, Node store and CLI are allowed only within the [implementation profile](implementation/ads-kernel-profile.json). The earlier package graph, full ADS schemas and output target packages have not been restored.
