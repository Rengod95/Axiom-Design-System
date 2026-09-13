# CMP06 · 동작·입력·기반 라이브러리 계약

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 동작 기반은 컴포넌트 구현을 돕는 선택이다

Axiom의 trait는 의미 계약이고 React Aria·Base UI는 Web에서 그 계약을 실현할 때 쓰는 동작 기반 후보다. 기반 라이브러리의 props를 ADS 정본으로 삼으면 라이브러리 교체가 문법 전체의 교체가 된다. 공통 계약과 mapping을 분리해 이를 피한다.

React Aria는 접근성과 interaction을 포함한 커스텀 구성 경로를, Base UI는 비스타일 컴포넌트 기반을 제공한다. 실제 조합별 품질은 Axiom의 별도 검증 대상이다. [React Aria customization](https://react-aria.adobe.com/customization), [Base UI 소개](https://base-ui.com/react/overview/about)

## BehaviorProfile 계약

Profile은 id/version, target, base dependency lock, supported archetypes/traits, input mappings, state/value mappings, focus strategy, required host, emitted events, unsupported combinations, requirements를 가진다. 프로젝트/패키지의 allowedBehaviorBases 목록을 통과해야 선택할 수 있다.

동작 기반 변경은 영향 props, DOM/native 구조, 의존성·provider 설치, 스타일 hook, test plan을 비교한다. 같은 Button 이름을 제공한다고 무검사 교환하지 않는다. full-custom도 요구·검증을 직접 만족해야 하며 “의존성 없음”이 자동 조건은 아니다.

## 입력을 의미로 바꾼다

입력 경로는 raw input→대상·scope 탐색→gesture/keyboard profile→의미 event→요청/상태 처리다. pointer, keyboard, touch, assistive activation의 중복 전달을 하나의 UI 의도로 정규화한다. preventDefault/stopPropagation 같은 Web 구현 detail을 공통 의무와 구분한다.

InputClaim은 scope, target role, phase, event kind, key/gesture, guard, consumption을 가진다. 충돌 검사는 실제로 겹치는 입력·guard·scope를 대조한다. Button에서 Space를 누른 채 밖으로 나가 취소한 경우 activation이 나오는지, Enter와 synthetic click이 이중 발생하는지를 검사한다.

## 보호 모드와 전문가 모드

보호 모드는 기존 archetype의 의무를 유지하면서 노출된 설정을 바꾼다. 전문가가 필수 키·focus·의미를 바꾸면 새 독립 유형으로 분기하고 변경 이유·상속하지 못하는 준수 주장을 표시한다. 단순 스타일 변경이나 허용된 policy 선택까지 매번 독립 유형으로 만들지 않는다.

예를 들어 Dialog의 초기 focus 후보를 허용 범위 안에서 바꾸는 것은 설정이다. 모달이라고 주장하면서 배경 조작과 focus 격리 의무를 제거하는 것은 의미 변경이다. 기존 Dialog 검증을 그대로 붙일 수 없다.

## 검증과 유지보수

선택한 dependency version으로 동일 입력 trace, 상태/이벤트, focus, 취소, native 의미, 설치가 재현되는지 검사한다. provider 자체 문서의 지원 설명은 Axiom의 증거를 대체하지 않는다. 변경 시 [DLV02 · 소비 프로젝트 init·doctor](../delivery/project-init-and-doctor.md)의 설치 진단, [QAL01 · 검증 요구·oracle·자동/수동 검사](../quality/conformance-and-test-plans.md)의 oracle, [CMP10 · 외형 규칙·조건·우선순위](appearance-conditions-and-precedence.md)의 스타일 연결을 함께 검토한다.

## 결정 추적과 변경 영향

<a id="d15-01"></a>

**D15-01 — 확정 방향:** provider는 이 문항에서 동작 구현 기반을 뜻한다. 컴포넌트별 기반 선택·변경 비교를 지원하며 프로젝트/패키지 허용 목록으로 제한한다. 앱 환경 공급자·Select 내부 문맥·UI 호스트·AI 공급자와 구분한다.

<a id="d15-02"></a>

**D15-02 — 확정 방향:** 기본 동작·의무를 바꾸는 전문가 변경은 독립 유형으로 분기한 뒤 자유롭게 수정한다. 원래 유형의 준수 주장은 새 검증 없이 유지하지 않는다.

전제 문서: [CMP02 · trait·role·유형과 조합](traits-roles-and-archetypes.md) · [CMP03 · 값·이벤트·props·UI 표현식](values-events-and-expressions.md) · [CMP04 · 상태 소유권과 요청 수명](state-and-request-lifecycle.md) · [CMP05 · Part·slot·인스턴스·override](parts-slots-and-instances.md).

변경 시 함께 검토: [CMP07 · 공동 UI 호스트와 조정자](coordinators-and-hosts.md) · [CMP08 · 접근성 의미·관계·준수 계약](accessibility-contracts.md) · [CMP09 · 모션·전환·중단 의미](motion-and-transitions.md) · [UX06 · 컴포넌트·동작·접근성·모션 편집 UX](../experience/component-editing-panels.md) · [AI02 · AI 코드 실현·후보·독립 판정](../ai/realization-and-independent-verification.md) · [DLV01 · 타깃·스타일·동작 기반 지원표](../delivery/target-and-style-profiles.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
