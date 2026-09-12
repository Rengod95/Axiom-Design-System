# ADR-0006 — Product Reset and Reference Lifecycle

**Status:** ACCEPTED for lifecycle and approval sequencing only \
**Date:** 2026-09-12 \
**Owner:** Product owner \
**Decision input:** Owner request to retire earlier implementation and establish Foundation 1.0.0 through staged confirmations. \
**Amended by:** [ADR-0007](0007-git-reference-and-documentation-phase.md) for the selected retention mode.

## Decision

Axiom is being redesigned around Design System Builder in Axiom Studio. Foundation and component definitions share an Axiom syntax; component contracts describe reusable UI purposes, values, events, behavior, accessibility and motion without consuming-application business logic. Common meaning and tokens may be shared while Web and Mobile designs differ. Mobile is a design category, not an output framework.

External React-code import, reverse reflection and repeated synchronization remain outside initial scope. Exported code remains user-owned. GUI and built-in AI authoring are supplemented by the latest follow-up allowing external agents to call defined API/MCP operations. This does not allow external agents to alter core API implementations, validators or authorization logic, or bypass those checks. Detailed access contracts and the overall design require reconciliation and confirmation.

The earlier ten packages are deprecated as the new implementation baseline. The owner selected combined reference-space/Git-only preservation; [ADR-0007](0007-git-reference-and-documentation-phase.md) records its operational meaning. Their executable sources and build graph are absent from the active tree.

Previous ADRs, SSOT, schemas and fixtures retain meaning for their pinned implementation only. They do not dictate Studio architecture, scope or continuation of N25/N26/Gate A. Historical results are not new product evidence.

## Required sequence

1. Collect, reconcile and confirm D01–D39 decisions.
2. Propose the Foundation 1.0.0 document index and continuous development direction across product, business, technology, architecture, design, UX/UI, marketing and operations; obtain confirmation.
3. Write the full documentation, reconcile examples/contracts/evidence, and obtain baseline confirmation.
4. Start new product implementation only after documentation confirmation.

Retirement is independently authorized. This ADR does not accept the tasks' interpretations, a full ADS schema, module layout, document index, final license or released product.

PRs [#23](https://github.com/Rengod95/Axiom-Design-System/pull/23) and [#12](https://github.com/Rengod95/Axiom-Design-System/pull/12) remain separate evaluation candidates. This change does not merge, close or rewrite them.

See the [ledger](../maintenance/pre-studio-retirement.md) and [reference guide](../../reference/pre-studio/README.md).
