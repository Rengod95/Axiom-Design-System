# CMP10 · 외형 규칙·조건·우선순위

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 외형을 결정하는 축

사용자가 말한 variant×slot×state의 slot은 외형을 바꾸는 부위에 해당한다. ADS에서는 이를 Part/style surface로 명시하고 콘텐츠 삽입 Slot과 구별한다. filled Button의 icon이 pressed일 때 어떤 색이 되는지 출처와 결과를 확인할 수 있어야 한다.

AppearanceRule은 id, designRef, targetPartRef, variant predicates, state predicates, environment predicates, declarations, explicitPriority를 가진다. 선언 값은 typed literal/tokenRef/expression이고 실제 CSS 문자열은 Web 제한 확장으로 분리한다.

## 설계안의 결정 순서

1. component와 Web/Mobile design을 선택한다.
2. 선택 theme context로 token 값을 해석한다.
3. 해당 Part의 base rule을 적용한다.
4. 조건을 만족하는 rule의 명시된 priority와 refinement 관계를 평가한다.
5. 허용된 instance override를 적용한다.
6. typed 결과와 provenance, 필수 디자인·접근성 진단을 계산한다.

한 property에서 조건을 만족하는 선언 중 더 큰 explicitPriority가 우선한다. 최대 priority가 같은 선언은 아래 refinement 규칙으로 하나의 최종 선언을 결정할 수 있을 때만 선택한다. 선택할 수 없는 동점 선언의 해석된 typed value가 다르면 충돌이며, 같은 값이면 출처를 모두 보존해 합친다. 작성 순서·파일 순서·CSS 우연한 specificity에 숨기지 않는다.

`refines`는 같은 design·Part의 더 넓은 조건을 가진 rule ID를 명시한다. 자기 참조·cycle·존재하지 않는 rule·상위 rule보다 낮은 priority의 refinement는 거부한다. 하위 조건이 상위 조건을 포함하는 더 좁은 경우임을 확인할 수 있어야 한다. 같은 priority의 최대 후보 중 하나가 다른 모든 후보를 직접 또는 전이적으로 refine하면 그것을 선택한다. 서로 비교할 수 없는 후보가 남으면 새 조합 rule이나 priority 수정이 필요하다. property가 겹치지 않는 선언에는 refinement가 값을 덮는 효과를 만들지 않는다. 편집기는 관계·최대 후보·최종 값 또는 충돌을 함께 보여 준다.

## 예시

Card base가 surface token, outlined variant가 border token, selected state가 선택 강조 token을 정의할 수 있다. plain Card에는 selected 규칙을 등록하기 전에 선택 trait와 state가 있어야 한다. variant=outlined×state=selected×Part=surface 조합이 필요한 경우 별도 rule로 작성하고 결과표에서 비교한다.

“dark이면 selected” 같은 의미 혼합은 허용하지 않는다. dark는 token 해석의 context이고 selected는 사용자 선택값이다. 같은 결과 색을 만들 수 있어도 원인은 보존한다.

### 한 속성의 계산 예

다음은 별도 검토 예시이며 plain Card에 selected를 추가하지 않는다. outlined Card의 surface.background를 계산한다.

| 단계 | 적용 선언 | 결과와 출처 |
|---|---|---|
| base | priority 0, token.surface = white | white, base |
| outlined | priority 10, token.outline-surface = gray | gray, outlined |
| outlined + compact | priority 10, outlined를 refines, token.compact-surface = silver | silver, 명시 refinement |
| 별도 compact rule | priority 10, 위 규칙과 관계 없이 다른 값 | 충돌; 임의 최종값 없음 |
| 충돌 수정 후 허용 instance override | token.custom-surface = ivory | ivory, instance override |
| override reset | instance 선언 제거 | silver, 공통 rule의 현재 결과 |

Theme 변경은 각 token의 계산값과 출처를 바꾸지만 위 우선순서를 바꾸지 않는다. 필수 정책 위반은 계산된 색 위에 진단으로 남으며 높은 priority나 override가 의무를 면제하지 않는다.

## 환경 조건과 타깃 한계

등록 환경 축은 type, 관측 원천, default/unknown 동작, 지원 타깃, preview 제어를 가진다. viewport/container width, 입력 정밀도, hover 가능, direction, text scale, reduced motion 등이 예다. Web 임의 CSS condition은 전문가의 target-only 후보로 다루고 native 대응을 자동 약속하지 않는다.

환경 값이 없으면 false로 몰래 대체하지 않는다. 명시한 fallback 또는 unknown 진단을 적용한다. theme 축과 device condition의 충돌을 resolver 순서로 해결하지 않는다.

## 인스턴스와 검증

override는 원본 값·사용자 값·적용 범위를 표시하고 reset과 공통 디자인 승격을 제공한다. 공유 token 또는 공통 rule 승격은 영향 검토 대상이다. 승격 후 다른 variant·Mobile appearance가 바뀌는지 비교한다.

필수 시험은 동점 충돌, 명시 refinement, 없는 state/Part 참조, unknown 환경, theme 교체, instance reset, target-only 조건, 실제 출력의 계산 결과 일치다. 이 순서 변경은 저장 의미의 breaking change 후보다.

## 결정 추적과 변경 영향

<a id="d19-01"></a>

**D19-01 — 확정 방향:** variant × 외형 부위(slot이라고 표현한 대상) × state의 규칙 조합과 명시적인 결과·출처를 중심으로 설계한다. 콘텐츠 삽입 slot과 외형 부위의 구분을 설명한다.

<a id="d19-02"></a>

**D19-02 — 확정 방향:** 시각적 조건 조합·등록 가능한 환경 축을 제공하고 Web의 임의 CSS 조건도 전문가 기능으로 검토한다. 해당 표현의 타깃 한계는 명시한다.

<a id="d19-03"></a>

**D19-03 — 확정 방향:** override 표시·원본 출처·reset·공통 디자인 승격을 제공

전제 문서: [CMP01 · 컴포넌트 정의 계층과 디자인 범주](definition-and-designs.md) · [CMP04 · 상태 소유권과 요청 수명](state-and-request-lifecycle.md) · [CMP05 · Part·slot·인스턴스·override](parts-slots-and-instances.md) · [CMP09 · 모션·전환·중단 의미](motion-and-transitions.md) · [SYN03 · DSF·토큰·테마·사용자 정책](../syntax/foundation-and-token-semantics.md).

변경 시 함께 검토: [UX02 · Canvas 선택·좌표·직접 조작](../experience/canvas-and-direct-manipulation.md) · [UX03 · 시각적 레이아웃 편집](../experience/layout-authoring.md) · [UX06 · 컴포넌트·동작·접근성·모션 편집 UX](../experience/component-editing-panels.md) · [UX07 · 즉시 preview·검증 화면·프로토타입](../experience/preview-and-prototypes.md) · [DLV01 · 타깃·스타일·동작 기반 지원표](../delivery/target-and-style-profiles.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
