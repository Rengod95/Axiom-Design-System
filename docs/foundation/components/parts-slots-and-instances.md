# CMP05 · Part·slot·인스턴스·override

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## Part, Slot, 렌더 노드를 구별한다

Card의 header는 논리 Part이고 그 안의 title 자리는 콘텐츠 Slot일 수 있다. title이 Web의 h2와 span으로 표현되더라도 Part가 두 개로 늘어나는 것은 아니다. 제작자는 부품 책임과 사용자가 교체할 수 있는 내용·외형의 범위를 각각 선언한다.

PartDefinition에는 id, roleRefs, logicalParent, cardinality, required, bindings, relationships가 있다. SlotDefinition에는 id, ownerPartRef, contentKinds, min/max, defaultContent, allowedContractRefs가 있다. replaceablePart는 구현 교체 권한이며 단순 콘텐츠 주입과 별도다.

## 공개 편집 범위

| 변경 | 제작자의 공개 계약 | 검사 |
|---|---|---|
| prop 변경 | value의 type·범위 | 값 타입·소유권 |
| 콘텐츠 삽입 | slot 종류·개수·필수 여부 | 필수 내용·중첩 의미 |
| 부품 교체 | 요구 role·port·의무 | 대체 구현의 호환성 |
| 외형 override | 허용 Part·속성·규칙 범위 | token 정책·a11y |
| 구조 변경 | definition 편집 권한 | 전체 디자인·인스턴스 영향 |

본문 slot에 버튼을 넣는 것은 가능하지만 전체 Card를 button으로 실현하면서 그 안에 독립 button을 중첩하는 경우에는 입력·접근성 관계를 검사하고 구조 대안을 제안한다. “아무 React children 가능”이라는 말로 모든 조합을 정식 지원하지 않는다.

## 인스턴스와 원본

Instance는 componentRef와 designRef의 고정 버전, prop values, slot contents, 허용 overrides, 원본 provenance를 가진다. 원본을 복제해 모든 필드를 저장하지 않는다. 결과는 원본＋override로 계산하며 각 값의 출처와 reset을 제공한다.

원본 Part가 삭제되거나 override 속성이 닫히면 충돌을 표시한다. 사라진 원본에 맞춰 사용자 내용을 자동 삭제하지 않는다. 대체·override 제거·독립 컴포넌트로 분리·미해결 초안 중 선택한다. 공통 variant로 승격할 때 다른 인스턴스의 영향도 검토한다.

## 구조와 collection

Part parent는 acyclic이어야 한다. 같은 인스턴스의 실제 node 배치는 타깃 디자인이 결정한다. 반복 item은 stable key로 식별하며 배열 index를 영구 identity로 사용하지 않는다. slot 내용의 소유 문서와 참조된 component 정의의 소유권도 별도다.

Select의 trigger/list/item은 역할과 공유 selection context를 연결한다. 그중 한 Part만 다른 라이브러리 구현으로 교체할 때 값·이벤트·context 호환성을 요구한다. 반면 Card body 안에 독립 Select 인스턴스를 넣는 것은 다른 연결 범위다.

## 검증과 변경 영향

필수 slot 누락, cardinality 초과, 허용되지 않은 kind, 구조 순환, 중첩 interactive 요소, 모호한 owner, 삭제된 Part override, version mismatch를 시험한다. 부품/slot 공개 변경은 API·Inspector·Canvas 선택·디자인·타깃 코드·소비 인스턴스에 모두 전파한다.

## 결정 추적과 변경 영향

<a id="d13-01"></a>

**D13-01 — 확정 방향:** 제작자가 props·콘텐츠 slot·교체 가능한 부품·외형 override를 각각 지정

<a id="d13-02"></a>

**D13-02 — 확정 방향:** 허용 override만 기록하고 원본 변경과 충돌하면 비교

<a id="d13-03"></a>

**D13-03 — 확정 방향:** 종류·개수·필수 여부·기본값을 제작자가 설정하고 호환성 검사

전제 문서: [CMP01 · 컴포넌트 정의 계층과 디자인 범주](definition-and-designs.md) · [CMP02 · trait·role·유형과 조합](traits-roles-and-archetypes.md) · [CMP03 · 값·이벤트·props·UI 표현식](values-events-and-expressions.md).

변경 시 함께 검토: [CMP06 · 동작·입력·기반 라이브러리 계약](behavior-and-input-profiles.md) · [CMP07 · 공동 UI 호스트와 조정자](coordinators-and-hosts.md) · [CMP08 · 접근성 의미·관계·준수 계약](accessibility-contracts.md) · [CMP10 · 외형 규칙·조건·우선순위](appearance-conditions-and-precedence.md) · [CMP11 · 사용자 확장·등록·승격](custom-definition-registry.md) · [UX02 · Canvas 선택·좌표·직접 조작](../experience/canvas-and-direct-manipulation.md) · [UX03 · 시각적 레이아웃 편집](../experience/layout-authoring.md) · [ARC05 · 후속 실시간 협업을 위한 구조](../architecture/collaboration-readiness.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
