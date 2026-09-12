# Pre-Studio Retirement Ledger

Date: 2026-09-12 \
Baseline: [f368ae7d2084](https://github.com/Rengod95/Axiom-Design-System/commit/f368ae7d208424c922637ca625ab9687a85ed5b9) \
Status: deprecation prepared; executable-source retention and deletion remain pending.

## What changed

All ten package entry points identify the earlier implementation as a frozen reference and reuse candidate. Root documentation no longer claims absent packages or an active earlier execution plan. Existing prose is explicitly scoped to the reference code. The old plans listed below are physically removed from this checkout; their exact original content remains available in Git.

**Executable source files physically deleted in this change: 0.** Schemas, fixtures, token sources, generated artifacts, manifests, lockfiles and CI are preserved. This is not a claim that all retained code belongs in the future product. The owner is choosing the retention mode through question 정리-01, and D01–D39 will determine new contract ownership.

## Package disposition

| Package | Preserve for evaluation | Required boundary | Decisions |
| --- | --- | --- | --- |
| [@axiom/tokens](../../packages/tokens/README.md) | token validation, serializable values, context resolution, manifest fixtures | Separate identity from naming policy and per-system generated unions. | D04, D06–D08 |
| [@axiom/token-tooling](../../packages/token-tooling/README.md) | pinned parser boundary, default-system template, policy and negative fixtures | Separate generic DTCG ingestion from the default palette, scale, tier and theme policy. | D06–D08, D26 |
| [@axiom/recipe-kernel](../../packages/recipe-kernel/README.md) | style structure, order, normalization and type fixtures | Retain only as a possible internal style mechanism; it is not the Studio command kernel. | D13, D19–D20 |
| [@axiom/css-property-profile](../../packages/css-property-profile/README.md) | pinned Web CSS grammar, registry, binding and validation | Treat as a Web profile candidate, not a shared Mobile property vocabulary. | D19, D24, D30 |
| [@axiom/appearance-authoring](../../packages/appearance-authoring/README.md) | Web style and token-binding validation | Replace global component-name state applicability only after a new typed scope contract exists. | D09–D19, D30 |
| [@axiom/appearance-normalizer](../../packages/appearance-normalizer/README.md) | ordered declarations, provenance, collision traces and fixtures | Revisit Web input ownership and CSS types currently supplied by motion-schema. | D19, D30–D31 |
| [@axiom/condition-registry](../../packages/condition-registry/README.md) | environment condition analysis and regression cases | Separate environment conditions from the fixed concrete-component state registry. | D11, D14, D19 |
| [@axiom/motion-schema](../../packages/motion-schema/README.md) | Web motion grammar, authority checks and regression fixtures | Do not use CSS-coupled motion and CSS Appearance IR as the shared motion contract. | D18, D27, D30 |
| [@axiom/behavior-contracts](../../packages/behavior-contracts/README.md) | generated criteria and source-evidence contracts | This is not an implemented interaction engine or complete custom trait system. | D11, D15, D17, D31 |
| [@axiom/spec-tooling](../../packages/spec-tooling/README.md) | schema harness, positive/negative fixtures, generators and digests | Keep reproducible evidence; revisit hardcoded destinations and Node-specific ownership. | D03–D05, D31, D38 |

## Removed active execution plans

- [docs/plans/2026-09-01-foundation-and-implementation-plan.md](https://github.com/Rengod95/Axiom-Design-System/blob/f368ae7d208424c922637ca625ab9687a85ed5b9/docs/plans/2026-09-01-foundation-and-implementation-plan.md) — original retained at the audited commit.
- [docs/plans/2026-09-01-post-p3-foundation-review.md](https://github.com/Rengod95/Axiom-Design-System/blob/f368ae7d208424c922637ca625ab9687a85ed5b9/docs/plans/2026-09-01-post-p3-foundation-review.md) — original retained at the audited commit.
- [docs/superpowers/plans/2026-09-02-appearance-ir.md](https://github.com/Rengod95/Axiom-Design-System/blob/f368ae7d208424c922637ca625ab9687a85ed5b9/docs/superpowers/plans/2026-09-02-appearance-ir.md) — original retained at the audited commit.
- [docs/superpowers/plans/2026-09-02-gate-a-n16-n24.md](https://github.com/Rengod95/Axiom-Design-System/blob/f368ae7d208424c922637ca625ab9687a85ed5b9/docs/superpowers/plans/2026-09-02-gate-a-n16-n24.md) — original retained at the audited commit.
- [docs/superpowers/plans/2026-09-02-n15-document-reconciliation.md](https://github.com/Rengod95/Axiom-Design-System/blob/f368ae7d208424c922637ca625ab9687a85ed5b9/docs/superpowers/plans/2026-09-02-n15-document-reconciliation.md) — original retained at the audited commit.
- [docs/superpowers/plans/2026-09-02-oklch-semantic-colors.md](https://github.com/Rengod95/Axiom-Design-System/blob/f368ae7d208424c922637ca625ab9687a85ed5b9/docs/superpowers/plans/2026-09-02-oklch-semantic-colors.md) — original retained at the audited commit.
- [docs/superpowers/plans/2026-09-02-ordered-declaration-contracts.md](https://github.com/Rengod95/Axiom-Design-System/blob/f368ae7d208424c922637ca625ab9687a85ed5b9/docs/superpowers/plans/2026-09-02-ordered-declaration-contracts.md) — original retained at the audited commit.
- [docs/superpowers/plans/2026-09-02-semantic-scales-and-ratios.md](https://github.com/Rengod95/Axiom-Design-System/blob/f368ae7d208424c922637ca625ab9687a85ed5b9/docs/superpowers/plans/2026-09-02-semantic-scales-and-ratios.md) — original retained at the audited commit.
- [docs/superpowers/plans/2026-09-02-token-governance.md](https://github.com/Rengod95/Axiom-Design-System/blob/f368ae7d208424c922637ca625ab9687a85ed5b9/docs/superpowers/plans/2026-09-02-token-governance.md) — original retained at the audited commit.

## Concrete source-removal prerequisites

| Item | Existing source coupling to retire | Must preserve or reconnect before deletion |
| --- | --- | --- |
| C01 | Token path supplies identity/domain/tier in tokens/domain/identity and parser normalization | Alias, original pointer, rename, resolver, manifests and type fixtures |
| C02 | Default palette/scales/base-light-dark enforced by token-tooling and token policy | Default DS onboarding template, generators, template-scoped negative fixtures |
| C03 | tokens core imports and exports default-system generated path unions | Public imports/exports, generated destinations, type fixtures and locked inputs |
| C04 | Concrete component-name applicability in state registry, appearance and motion validators | Typed trait/Part scope contract, state ownership and existing scope regression fixtures |
| C05 | Shared motion input requires CSS values and Appearance IR | Web CSS types' ownership, normalizer imports and generated schema/type families |
| C06 | TypeScript Recipe API mistaken for Studio document/command kernel | Useful structural/order/token validation; new commands remain a design task |
| C07 | Similar serializers with distinct format/digest rules | Compatibility corpus and digest namespace before consolidating any functions |
| C08 | Earlier overall architecture and future execution sequence | Completed reports and immutable historical plans; addressed as lifecycle in this change |
| C09 | Explicit workspace/build/spec/generator/CI path graph | Manifests, imports, generated sources/destinations and all required checks |

These are removal conditions, not authorization to implement replacement contracts before the documentation approval gate. The package-level mixture of reusable and obsolete responsibilities prevents safe directory-wide source deletion on the current evidence alone.

## Open work already on GitHub

- [Add N25 Select Foundation conformance](https://github.com/Rengod95/Axiom-Design-System/pull/23): keep exact scope/negative fixtures as evaluation candidates; do not automatically continue its N26 plan.
- [docs: rebuild Guidebook around the learner journey](https://github.com/Rengod95/Axiom-Design-System/pull/12): keep earlier explanatory material as reference; it is not the new product Foundation.

Neither PR is merged, closed or rewritten by this retirement change.

## Verification scope

See [machine-readable ledger](pre-studio-retirement.json) for preserved baseline file hashes and results. The expected change is documentation, package lifecycle notices and removal of obsolete plan documents only. No new Studio code or replacement schema is implemented, and previous test results are not reported as new runs.
