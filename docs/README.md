# Axiom documentation

The current product direction and document index are confirmed. All 56 Foundation bodies and governed annexes passed the 2026-09-13 semantic audit after repairs. PR #25 merged and the owner's conditional implementation authorization is fulfilled in [baseline approval](decisions/axiom-foundation-baseline-approval.json). [ADR-0009](adr/0009-ads-kernel-implementation-bootstrap.md) accepts the bounded I1 document kernel before product code was added; [ADR-0010](adr/0010-source-preserving-draft-authoring.md) extends it to source-preserving draft authoring and common-envelope schema validation.

1. [Foundation reading entry](foundation/README.md)
2. [Document index](foundation/document-index.md)
3. [Baseline review](foundation/baseline-review.md)
4. [Decision coverage](foundation/decision-coverage.md)
5. [Direction approval](decisions/axiom-foundation-direction-approval.md) and [index approval](decisions/axiom-foundation-index-approval.md)
6. [Kernel quickstart](implementation/kernel-quickstart.md) and [implementation evidence](implementation/kernel-evidence.md)
7. [Initial self-review and continuation](implementation/initial-kernel-review.md), [schema evidence](implementation/schema-selection-evidence.md) and [remaining implementation map](implementation/implementation-roadmap.json)

8. [Structural domain and local-reference evidence](implementation/structural-domain-evidence.md)
9. [Typed values, content and project-bundle evidence](implementation/typed-bundle-evidence.md)
10. [Browser storage evidence and usage](implementation/browser-storage-evidence.md)

Current lifecycle authority remains [ADR-0006](adr/0006-product-reset-and-reference-lifecycle.md), [ADR-0007](adr/0007-git-reference-and-documentation-phase.md) and the explicit implementation amendments in ADR-0009, ADR-0010, [ADR-0011](adr/0011-structural-domain-inspection-and-local-references.md), [ADR-0012](adr/0012-typed-values-and-project-bundles.md) and [ADR-0013](adr/0013-browser-transactional-storage.md) and [ADR-0014](adr/0014-studio-authoring-and-target-delivery.md). Documentation QA and reference restoration checks do not prove product runtime support.

[Engineering principles](standards/source-code-and-module-structure.md), [retirement ledger](maintenance/pre-studio-retirement.md), and [reference restoration](../reference/pre-studio/README.md) continue to govern the preserved history. The new core, Node store, browser store, CLI, Studio, target generators and delivery adapter are allowed only within the [implementation profile](implementation/ads-kernel-profile.json). The earlier package graph, full ADS schemas and output target packages have not been restored.

11. [Studio quickstart](implementation/studio-quickstart.md), [editor/target evidence](implementation/studio-delivery-evidence.md) and [dependency decisions](implementation/studio-dependency-notice.md)

12. [Workbench extension](adr/0015-studio-workbench-and-catalog-authoring.md), [complete editor audit](implementation/editor-completeness-audit.md), [workbench evidence](implementation/workbench-evidence.md), and [Axiom UI design system](../apps/studio/DESIGN.md)

13. [Foundation onboarding and editor completion](adr/0016-foundation-onboarding-and-editor-completion.md)

The [2026-09-14 editor follow-up](implementation/editor-completion-followup.md) retains all 119 requirement IDs and current source hashes after the property-input, token onboarding and custom-authoring corrections. Its outstanding obligations remain part of the Foundation implementation scope.

14. [Foundation interchange and live expressions](adr/0017-foundation-interchange-and-live-expressions.md), with [incremental delivery evidence](implementation/foundation-interchange-continuation.md). The prior 119-row ledger remains a historical baseline; this increment updates FT03, FT07, FT08 and FT12 only.

15. [Contextual Foundation and component composition](adr/0018-contextual-foundation-and-component-composition.md), with the [fresh 56-document implementation audit](implementation/foundation-audit-2026-09-15.md). Earlier audit artifacts remain historical evidence.

16. [Element composition, policy and behavior authoring](adr/0019-element-composition-policy-and-behavior-authoring.md), [policy contracts](implementation/foundation-policy-authoring.md), [behavior contracts](implementation/component-behavior-authoring.md), [Library design baselines](implementation/library-component-design-baselines.md) and [native runtime verification](implementation/native-runtime-verification.md).

17. [Compound anatomy and canvas insertion](adr/0020-compound-anatomy-and-canvas-insertion.md).

18. [Pinned original Library templates](adr/0021-pinned-reference-templates.md), [duplicate consolidation review](implementation/library-duplicate-review.md) and [visual review](implementation/library-reference-visual-review.md). The Studio quickstart includes the four locked reference-runtime installations.
