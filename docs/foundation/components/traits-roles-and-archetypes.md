# CMP02 · trait·role·유형과 조합

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 분류는 탐색을 돕고 trait는 실제 의무를 만든다

“Button→인터랙션→사용자 행동 개체”는 카탈로그 탐색에 유용하다. 그러나 Checkbox도 행동을 받고 값을 가지며 설명과 폼 참여가 필요하다. 모든 컴포넌트를 한 줄의 상속으로만 정의하면 공통 특성이 여러 가지일 때 중복과 예외가 생긴다.

Family는 탐색 분류, archetype은 시작 계약, trait는 재사용 능력, role은 부품 책임, policy는 허용 범위에서 고르는 행동 규칙이다. 이 구분으로 기본 템플릿을 쉽게 쓰면서 커스텀 조합도 표현한다.

## 등록 계약

TraitDefinition은 namespaced id/version, 목적, configurationType, requires/provides, value/event ports, state ownership, input claims, role requirements, obligations, incompatible bindings, inspector metadata를 가진다. RoleDefinition은 허용 Part 종류·cardinality·관계·의미 의무를 가진다. PolicyDefinition은 적용 trait, config type, 기본값, 허용 선택, 보존해야 할 invariant, 검증 요구를 가진다.

예를 들어 activation은 activate 이벤트와 중복 활성화 금지 의무를 제공한다. control role에 binding하고 이름·사용 가능 상태를 연결한다. Card에 selection을 추가하면 selected 값의 owner, selectionRequest 이벤트, 선택 의미 전달 의무가 필요해진다. action role이 있다고 selection이 자동 생기지는 않는다.

등록은 capability의 명세다. runtime 지원은 별도의 realization profile에서 연결한다. 사용자 namespace의 trait 이름을 등록하는 것만으로 네 타깃 구현이 생기지 않는다.

## 조합과 충돌

조합 검사 순서는 버전 잠금→구성 타입→필요 port/role 존재→단일 상태 owner→입력/효과 충돌→필수 의무 합집합→지원 상태다. 두 trait가 동일 control의 Enter를 상충하는 명령으로 소비하거나 selected를 서로 다른 타입으로 소유하면 거부한다.

명시적 입력 profile이 상황을 구분해 충돌을 없앨 수는 있다. 실제 충돌을 단순히 “나중에 추가한 trait 우선”으로 숨길 수 없다. Dialog 안 Button처럼 서로 다른 scope의 Enter는 동일 claim으로 취급하지 않고 대상·phase·guard의 중첩을 검사한다.

## 확장과 라이브러리 예

새 policy 값이나 설명을 추가하되 기존 의무를 유지하면 compatible extension 후보가 된다. Button에서 키보드 activation을 제거하려면 원래 Button 준수 주장을 유지하지 않고 독립 archetype으로 분기한다. 전문가 모드는 경고를 감추는 스위치가 아니다.

라이브러리 A의 독립 Button이 activation 1을, B의 독립 Button이 activation 2를 고정해 쓰는 것은 가능하다. 두 라이브러리의 Select trigger와 list가 하나의 selected/event/context를 공유하려면 공통 연결 계약의 호환성을 증명해야 한다. 버전 숫자가 같거나 함수 이름이 비슷하다는 것만으로 결합하지 않는다.

## 사전 어휘와 검증

[확장 어휘 부록](../annexes/extension-vocabulary.md)은 이전 38 trait·31 role·36 policy·45 family 후보를 보존·정규화해 330개 참조 행과 연결한다. 현재 구현 완료 목록이 아니다. 각 항목의 binding·의무·테스트 family가 실제로 닫히는지 검사한 후 안정 registry로 배포한다.

필수 시험은 기본 Card의 불필요 상태 부재, 선택 Card의 의무 생성, 키 충돌 거부, 별도 scope 허용, 버전 혼합 연결 실패, 사용자 확장의 의무 보존이다. vocabulary 변경은 카탈로그·GUI 제안·oracle·타깃 팩 전체에 영향을 준다.

## 결정 추적과 변경 영향

<a id="d05-03"></a>

**D05-03 — 확정 방향:** 독립 컴포넌트는 서로 다른 trait 버전을 고정해 공존할 수 있다. 값·이벤트·상태 소유권을 공유하는 연결에서 호환성을 검사한다.

<a id="d11-01"></a>

**D11-01 — 확정 방향:** ‘펼치기·선택하기’ 같은 목적 중심 설정과 전문가 trait 보기를 함께 제공

<a id="d11-02"></a>

**D11-02 — 확정 방향:** 실제 충돌하는 능력의 조합은 허용하지 않는다. 자동 우선순위로 충돌 의무를 숨기는 방식을 기본으로 두지 않는다.

<a id="d11-03"></a>

**D11-03 — 확정 방향:** 기존 의무를 유지한 확장과 의무를 바꾸는 독립 유형을 구분

전제 문서: [CMP01 · 컴포넌트 정의 계층과 디자인 범주](definition-and-designs.md) · [GOV03 · 버전·호환·deprecated 정책](../governance/version-and-compatibility.md).

변경 시 함께 검토: [CMP04 · 상태 소유권과 요청 수명](state-and-request-lifecycle.md) · [CMP05 · Part·slot·인스턴스·override](parts-slots-and-instances.md) · [CMP06 · 동작·입력·기반 라이브러리 계약](behavior-and-input-profiles.md) · [CMP11 · 사용자 확장·등록·승격](custom-definition-registry.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
