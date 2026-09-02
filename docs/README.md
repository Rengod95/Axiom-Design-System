# Axiom Documentation

이 디렉터리는 Axiom의 규범, 결정 기록, 구현 계획, 소스 표준, 역사적 자료를
분리한다. 현재 패키지는 아래 SSOT와 machine-readable spec을 단계적으로
구현하며, 구현 자체가 별도의 authority가 되지 않는다.

## Authority Order

문서와 구현이 충돌할 때 다음 순서를 적용한다.

```text
1. Accepted ADRs that amend architecture
2. SSOT architecture/domain specifications
3. Normative JSON Schemas, registries, and pinned input manifests
4. Conformance fixtures and golden artifacts
5. Generated TypeScript/reference definitions
6. Compiler/runtime implementations
7. Examples and historical executable-spike documentation
```

Accepted ADR은 구현 전에 관련 SSOT에 반영해야 한다. Prose와 normative
schema가 충돌하면 어느 한쪽을 임의로 우선하지 않고 release를 중단한 뒤
reconciliation한다.

명시적으로 승인된 owner requirement가 아직 출시되지 않은 계약을 변경하는
경우 그 요구사항은 ADR의 decision input이 된다. 기존 SSOT가 그 요구사항과
충돌하면 구식 SSOT를 유지하기 위해 구현을 되돌리지 않고, 먼저 ADR에 결정을
기록한 다음 SSOT와 machine-readable 계약을 함께 갱신한다. 이 절차가 끝난 뒤에는
위 authority order가 다시 유일한 기준이며 구현 자체가 authority가 되지는 않는다.
ADR-0004와 SSOT-01 v0.4.0은 Token clean break에 이 절차를 적용한 결과다.

## Start Here

1. [Current implementation architecture](architecture.md)
2. [ADR-0001 — CSS-Native Appearance Profile and Initial Scope](adr/0001-css-native-appearance-profile-and-scope.md)
3. [ADR-0002 — React Aria Behavioral Criteria Source](adr/0002-react-aria-behavioral-criteria-source.md)
4. [ADR-0003 — Recipe Authoring Kernel and Third-Party Boundary](adr/0003-recipe-authoring-kernel-and-third-party-boundary.md)
5. [ADR-0005 — Behavior Criteria Schema Sequencing](adr/0005-behavior-criteria-schema-sequencing.md)
5. [ADR-0004 — Token Vocabulary and Perceptual Color Profile](adr/0004-token-vocabulary-and-color-profile.md)
6. [SSOT-00 — System Architecture & Standards Profile](ssot/00-system-architecture-and-standards-profile.md)
7. [Token Domain & CSS Binding Catalog](specs/token-domain-and-css-binding-catalog.md)
8. [React Aria Behavioral Criteria Profile](specs/react-aria-behavioral-criteria.md)
9. [Foundation Reconciliation & Implementation Plan](plans/2026-09-01-foundation-and-implementation-plan.md)
10. [Source-code and Module-structure Standard](standards/source-code-and-module-structure.md)
11. [P1 Normative Specification Harness — Implementation Report](implementation/2026-09-01-p1-normative-spec-harness.md)
12. [P2.1 DTCG Parser & Normalization Boundary — Implementation Report](implementation/2026-09-01-p2-token-parser-and-normalization.md)
13. [P2.3/P2.4 Tier Graph & Context Resolver — Implementation Report](implementation/2026-09-01-p2-tier-graph-and-context-resolver.md)
14. [MVP Removal & Source Standards — Implementation Report](implementation/2026-09-01-mvp-removal-and-source-standards.md)
15. [P2 Token Foundation Closeout — Implementation Report](implementation/2026-09-01-p2-token-foundation-closeout.md)
16. [P3 CSS Property Profile — Implementation Report](implementation/2026-09-01-p3-css-property-profile.md)
17. [Post-P3 Foundation Review and Next Sequence](plans/2026-09-01-post-p3-foundation-review.md)
18. [Token Foundation Scale Hardening](implementation/2026-09-01-token-foundation-scale-hardening.md)
19. [Canonical State and Condition Registries](implementation/2026-09-01-state-and-condition-registries.md)
20. [Ordered CSS Declaration Contracts](implementation/2026-09-02-ordered-declaration-contracts.md)
21. [Token Governance and Vocabulary Registry](implementation/2026-09-02-token-governance.md)
22. [OKLCH and Semantic Color Migration](implementation/2026-09-02-oklch-semantic-colors.md)
23. [Semantic Scales and Aspect Ratios](implementation/2026-09-02-semantic-scales-and-aspect-ratios.md)
24. [CSS Appearance IR](implementation/2026-09-02-appearance-ir.md)
25. [N15 Documentation Reconciliation](implementation/2026-09-02-n15-document-reconciliation.md)
26. [Motion IR](implementation/2026-09-02-motion-ir.md)
27. [N17 Behavior Criteria Contracts](implementation/2026-09-02-n17-behavior-criteria-contracts.md)
28. [N18 Generated Reference Contracts](implementation/2026-09-02-generated-reference-contracts.md)
29. [N19 Recipe Kernel Reconciliation](implementation/2026-09-02-recipe-kernel-preparation.md)
30. [N20 CSS Appearance Authoring](implementation/2026-09-02-css-appearance-authoring.md)
31. [N21 Token Binding Validation](implementation/2026-09-02-token-binding-validation.md)
32. [N22 Appearance Normalizer](plans/2026-09-02-n22-implementation-report.md)
33. [N23 Motion Authoring](implementation/2026-09-02-motion-authoring.md)
34. [N24 Button Foundation Conformance](implementation/2026-09-02-button-foundation-conformance.md)

ADR-0001은 CSS-native Appearance Profile을, ADR-0002는 React Aria 기반
Behavioral Criteria Source를, ADR-0003은 Recipe Kernel과 third-party 경계를,
ADR-0004는 Token vocabulary와 perceptual color profile을 기록한다.
SSOT-00은 전체 모듈·권한·의존 방향을, implementation plan은
실제 파일과 작업 순서·검증 gate를 정의한다.

## Normative Specifications

| Document | Version | Owns |
| --- | --- | --- |
| [SSOT-00 — System Architecture & Standards Profile](ssot/00-system-architecture-and-standards-profile.md) | 0.3.1 | authority, layers, boundaries, frozen v0.1 scope |
| [SSOT-01 — Token Foundation & Domain Contracts](ssot/01-foundation-and-domain-contracts.md) | 0.4.1 | primitive/semantic/component tiers, production scales, semantic vocabulary, themes, resolver, manifests |
| [SSOT-02 — Compiler Contracts, Readiness & Governance](ssot/02-adapter-contract-readiness-and-governance.md) | 0.5.4 | compiler contracts, artifacts, diagnostics, Gates A/B/C, implementation order |
| [SSOT-03 — CSS Appearance Profile & Property Policy](ssot/03-css-appearance-profile-and-property-policy.md) | 0.3.2 | generated CSS registry, direct/template/projector policy, Recipe Kernel/Appearance IR |
| [SSOT-04 — Environment Conditions & Motion](ssot/04-environment-conditions-and-motion.md) | 0.2.3 | responsive/container conditions, reduced motion, Motion DSL/IR/backend |
| [SSOT-05 — React Runtime, Behavior Projection & Public API](ssot/05-react-runtime-behavior-and-public-api.md) | 0.2.3 | React Aria criteria source, canonical state, projections, public API |

## Normative Annexes

- [Token Domain & CSS Binding Catalog](specs/token-domain-and-css-binding-catalog.md)
- [React Aria Behavioral Criteria Profile](specs/react-aria-behavioral-criteria.md)

이 Catalog는 margin을 포함한 common CSS property binding을 정의하지만 CSS
allowlist가 아니다. 전체 표준 property authoring은 generated registry가,
Token을 직접·template·projector 방식으로 연결할 수 있는지는 Catalog와
sparse Property Policy가 담당한다.

## Architecture at a Glance

```text
DTCG Token Sources ──→ Resolved Context Manifests ───────────────┐
                                                               │
Pinned Webref ──→ Generated CSS Registry ──→ Binding Catalog ──┼─→ Recipe Normalizer
                                                               │          ↓
Recipe + Condition Authoring ───────────────────────────────────┘   Appearance IR
                                                                          ↓
                                                              Web CSS Compiler
                                                                          ↓
                                                        CSS + evaluator + manifest

Motion Authoring ──→ Motion IR ──→ Motion backend

React Aria ──→ Criteria Profile ──→ state/lifecycle projection ──→ React API
```

핵심 원칙은 다음과 같다.

- CSS property identity와 syntax는 pinned Webref에서 생성한다.
- 표준 CSS property는 기본적으로 raw CSS authoring이 가능하다.
- Token을 어느 CSS property에 연결할 수 있는지는 sparse Axiom Property
  Policy가 결정한다. 따라서 모든 CSS property를 수작업으로 열거하지 않는다.
- `space`는 모든 physical/logical margin·padding·gap과 등록된 inset/scroll
  spacing에 연결되며 direct/template/projector permission은 별도로 생성된다.
- Token은 CSS value의 별칭이 아니라 `primitive → semantic → component`의
  디자인 의미 그래프다.
- Theme은 token tier가 아니라 resolver context다.
- Variant, behavior State, environment Condition, Theme은 서로 다른 축이다.
- Responsive Appearance, Component Token, Motion DSL, React Aria behavior
  projection과 Axiom-owned React API는 v0.1 release gate의 필수 대상이다.
- Recipe authoring은 Panda Slot Recipes의 검증된 구조를 참고하지만 Axiom
  Recipe Kernel이 IR과 provenance를 소유한다.

## Active Plan

- [Foundation Reconciliation & Implementation Plan — 2026-09-01](plans/2026-09-01-foundation-and-implementation-plan.md)
- [P1 Normative Specification Harness — Implementation Report — 2026-09-01](implementation/2026-09-01-p1-normative-spec-harness.md)
- [P2.1 DTCG Parser & Normalization Boundary — Implementation Report — 2026-09-01](implementation/2026-09-01-p2-token-parser-and-normalization.md)
- [P2.3/P2.4 Tier Graph & Context Resolver — Implementation Report — 2026-09-01](implementation/2026-09-01-p2-tier-graph-and-context-resolver.md)
- [P2 Token Foundation Closeout — Implementation Report — 2026-09-01](implementation/2026-09-01-p2-token-foundation-closeout.md)
- [P3 CSS Property Profile — Implementation Report — 2026-09-01](implementation/2026-09-01-p3-css-property-profile.md)
- [Post-P3 Foundation Review and Next Sequence — 2026-09-01](plans/2026-09-01-post-p3-foundation-review.md)
- [Token Foundation Scale Hardening — 2026-09-01](implementation/2026-09-01-token-foundation-scale-hardening.md)
- [Canonical State and Condition Registries — 2026-09-01](implementation/2026-09-01-state-and-condition-registries.md)
- [Ordered CSS Declaration Contracts — 2026-09-02](implementation/2026-09-02-ordered-declaration-contracts.md)
- [Token Governance and Vocabulary Registry — 2026-09-02](implementation/2026-09-02-token-governance.md)
- [OKLCH and Semantic Color Migration — 2026-09-02](implementation/2026-09-02-oklch-semantic-colors.md)
- [Semantic Scales and Aspect Ratios — 2026-09-02](implementation/2026-09-02-semantic-scales-and-aspect-ratios.md)
- [CSS Appearance IR — 2026-09-02](implementation/2026-09-02-appearance-ir.md)
- [N15 Documentation Reconciliation — 2026-09-02](implementation/2026-09-02-n15-document-reconciliation.md)
- [Motion IR — 2026-09-02](implementation/2026-09-02-motion-ir.md)
- [N17 Behavior Criteria Contracts — 2026-09-02](implementation/2026-09-02-n17-behavior-criteria-contracts.md)
- [N18 Generated Reference Contracts — 2026-09-02](implementation/2026-09-02-generated-reference-contracts.md)
- [N19 Recipe Kernel Reconciliation — 2026-09-02](implementation/2026-09-02-recipe-kernel-preparation.md)
- [N20 CSS Appearance Authoring — 2026-09-02](implementation/2026-09-02-css-appearance-authoring.md)
- [N21 Token Binding Validation — 2026-09-02](implementation/2026-09-02-token-binding-validation.md)
- [N22 Appearance Normalizer — 2026-09-02](plans/2026-09-02-n22-implementation-report.md)
- [Token Clean-Break Design — 2026-09-02](superpowers/specs/2026-09-02-token-clean-break.md)
- [N15 Documentation Reconciliation Design — 2026-09-02](superpowers/specs/2026-09-02-n15-document-reconciliation.md)
- [Token Governance Plan — 2026-09-02](superpowers/plans/2026-09-02-token-governance.md)
- [OKLCH and Semantic Color Plan — 2026-09-02](superpowers/plans/2026-09-02-oklch-semantic-colors.md)
- [Semantic Scale and Aspect-Ratio Plan — 2026-09-02](superpowers/plans/2026-09-02-semantic-scales-and-ratios.md)
- [Appearance IR Plan — 2026-09-02](superpowers/plans/2026-09-02-appearance-ir.md)
- [N15 Documentation Reconciliation Plan — 2026-09-02](superpowers/plans/2026-09-02-n15-document-reconciliation.md)
- [MVP Removal & Source Standards — Implementation Report — 2026-09-01](implementation/2026-09-01-mvp-removal-and-source-standards.md)
- [Recipe Authoring Third-Party Evaluation — 2026-09-01](reviews/2026-09-01-recipe-authoring-third-party-evaluation.md)

계획은 현 패키지 disposition, 목표 workspace, schema/artifact inventory,
P0–P8 작업, Gate A–C, fixture/test matrix, migration map, risk register와 첫
구현 순서를 포함한다.

## Historical Reviews

- [Foundation Gap Analysis & Stabilization Plan — 2026-08-31](reviews/2026-08-31-foundation-gap-analysis-and-stabilization-plan.md)

이 문서는 당시 레포의 문제와 실행 가능한 vertical slice를 분석한
역사적 자료다. 현재 property, component token, responsive, Motion,
provider 범위 판단에는 사용하지 않는다.
