# CMP01 · 컴포넌트 정의 계층과 디자인 범주

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 컴포넌트를 일곱 관점으로 정의한다

컴포넌트는 사용자에게 어떤 UI 일을 제공하는 재사용 개체다. 모양이 비슷하다는 이유만으로 같은 유형이 되는 것도, 클래스 상속 한 줄에 모든 의미가 결정되는 것도 아니다. 아래 계층은 엄격한 상속 사슬이 아니라 책임별 정의 관점이다.

| 관점 | 정의하는 내용 | Button / Card / Toast |
|---|---|---|
| 1 · 목적·유형 | 범용 UI 목적, archetype | 명령 / 콘텐츠 표면 / 일시 공지 |
| 2 · 능력·의미 | trait·role·policy, 필수 의무 | activation / content / presence·announcement |
| 3 · 공개 계약 | 값·이벤트·타입·소유권 | onActivate / body slot / open·closeRequest |
| 4 · 구조·연결 | Part·Slot·instance·host | label / header·body / content·close·host |
| 5 · 경험 계약 | 상태·입력·a11y·motion | press / 읽기 순서 / enter·exit·공지 |
| 6 · 디자인 | Web/Mobile, variant×부위×state, layout | 버튼 외형 / 카드 배치 / 알림 위치·크기 |
| 7 · 실현·증거 | 타깃 코드·의존성·검증 결과 | React/RN/Swift/Android별 후보·검증본 |

컴포넌트 안에 가격 계산·업무 성공·권한 판단을 넣지 않는다. 소비 앱이 UI에 필요한 값과 콘텐츠를 전달하고 이벤트를 받아 업무를 처리한다. Card에 “구매 가능” 대신 필요한 경우 disabled 같은 UI 값이 전달될 수 있지만 Card가 이를 계산하지 않는다.

## 공통 정의와 여러 디자인의 관계

ComponentDefinition은 id/version, purpose, archetypeRef, traitBindings, publicContract, parts, slots, behavior, accessibility, motion, requirements를 가진다. DesignDefinition은 componentRef, category(Web/Mobile), name, structure realization, appearance rules, layout, targetOverrides를 가진다.

공통 계약은 같은 목적·값·이벤트·브랜드 의미를 지킨다. Mobile 디자인은 더 큰 조작 영역, 다른 팝업 표현, 다른 node 수를 가질 수 있다. 같은 Part가 Web에서 세 DOM 노드, Mobile에서 하나의 native view로 실현되어도 의무가 유지되면 허용한다. 없는 Part를 단순히 숨겨 필수 이름·조작을 제거할 수는 없다.

## 변경과 예시

Card의 공통 body slot을 필수로 바꾸면 모든 디자인과 인스턴스를 영향 대상으로 계산한다. 미충족 디자인을 수정 필요로 표시하고 초안 작업은 유지한다. Web만 고쳤다고 Mobile의 이전 검증 결과를 새 계약에 붙이지 않는다.

Button의 filled/outlined는 보통 variant다. Web/Mobile은 디자인 범주다. pressed는 동작 상태이고 dark는 토큰 context다. 네 가지를 컴포넌트 복제로 만들면 조합과 버전이 폭증하므로 각각 독립 축으로 유지한다.

Toast의 mounting→presenting→exiting→removed는 일반 UI 수명 설계다. 자동 닫기 시간은 선택 policy·외부 UI 설정이고 모든 Toast에 8초를 박아 넣지 않는다. 상세 세 예시는 [끝까지 읽는 사례](../annexes/component-walkthroughs.md)에 있다.

## 검증 책임

목적 적합성, trait 조합, 값/상태 단일 소유, Part 관계, 필수 접근성, motion cleanup, 디자인별 의무 실현을 순서대로 검사한다. 상태를 정의할 수 있음과 실제 타깃에서 실행됨은 별도다. 불변 ID·의무 변경은 모든 디자인·출력·test plan의 의존 정보를 갱신한다.

## 결정 추적과 변경 영향

<a id="d09-01"></a>

**D09-01 — 확정 방향:** Web/Mobile 범주 및 이름 있는 추가 디자인을 폭넓게 지원한다. variant와 platform을 우선 고려하되 variant가 독립 컴포넌트 복제라는 뜻으로 바꾸지 않는다.

<a id="d09-02"></a>

**D09-02 — 확정 방향:** 영향받은 디자인을 수정 필요로 표시하고 초안 작업은 허용

<a id="d09-03"></a>

**D09-03 — 확정 방향:** 공통 의무를 만족하면 표현 노드 수·배치·대체 표현을 허용

전제 문서: [GOV02 · 제품·도메인 용어와 이름](../governance/glossary-and-naming.md) · [PRD03 · 초기 범위·카탈로그·제품 확장 경계](../product/scope-catalog-and-roadmap.md) · [SYN02 · 프로젝트 문서·ID·참조·수명](../syntax/project-documents-and-identity.md) · [SYN03 · DSF·토큰·테마·사용자 정책](../syntax/foundation-and-token-semantics.md).

변경 시 함께 검토: [CMP02 · trait·role·유형과 조합](traits-roles-and-archetypes.md) · [CMP03 · 값·이벤트·props·UI 표현식](values-events-and-expressions.md) · [CMP05 · Part·slot·인스턴스·override](parts-slots-and-instances.md) · [CMP10 · 외형 규칙·조건·우선순위](appearance-conditions-and-precedence.md) · [ARC01 · 시스템 문맥·도메인·핵심 흐름](../architecture/system-and-domain-boundaries.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
