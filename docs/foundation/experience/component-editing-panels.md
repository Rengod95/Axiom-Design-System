# UX06 · 컴포넌트·동작·접근성·모션 편집 UX

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: UX/UI 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 한 컴포넌트를 여러 관점에서 편집한다

기본 패널은 사용자의 질문에 답해야 한다. “어떻게 배치할까”, “누르면 무엇을 요청할까”, “현재 상태가 무엇일까”, “무엇이라고 읽힐까”, “어떻게 나타나고 사라질까”를 중심으로 구성한다. 전문가에게는 같은 설정의 typed 계약과 출처를 제공한다.

| 패널 | 기본 조작 | 상세 조작 |
|---|---|---|
| 구조·내용 | Part·slot·필수 내용 | role 관계·교체 의무 |
| 외형 | variant·부위·상태별 값 | 조건 rule·priority·출처 |
| 값·상태 | 내부 관리/외부 제어 | type·요청 큐·전이 |
| 행동 | trigger→조건→UI action 목록 | 그래프·event port·AI 제안 |
| 접근성 | 이름·설명·순서·focus | 관계 그래프·타깃 의미 |
| 모션 | enter/exit·preset·play | keyframe·spring·중단 정책 |

## 행동을 쉽게 작성한다

Card에 action을 추가하면 클릭 handler 코드를 입력시키기보다 “활성화 요청”, “열기/닫기”, “선택 요청”, “검증 화면 이동”을 문맥에 맞게 제안한다. 화면 이동은 prototype 영역의 기능이며 범용 Card 계약에 앱 route를 고정하지 않는다.

목록과 그래프는 동일한 typed transition을 편집한다. preset도 제공하고 AI 작성도 제공한다. preset으로 표현하지 못하는 계약을 작성하는 경로를 없애지 않는다. 실제 충돌은 관계와 입력을 설명하고 조합을 수정하도록 한다.

## 상태·접근성 시연

Controlled value는 preview 외부 응답 panel에서 즉시 승인·거절·지연·다른 값 전달을 모의 조작한다. hovered/pressed 같은 관측 상태를 강제로 시연할 수 있지만 저장된 기본 상태로 오인하지 않게 한다.

접근성 패널은 namedBy·controls·focusReturn 관계와 읽기 순서를 Canvas에 겹쳐 보여 준다. 일반 Inspector에서 설정한 label이 관계 패널에도 즉시 반영된다. 보호 모드에서 허용되지 않는 변경은 독립 유형으로 분기하는 이유를 설명한다.

## 모션 편집 UX

상태 간 전환을 선택하고 대상 부위·속성·from/to·duration/easing 또는 spring을 편집한다. keyframe은 간단한 시간 막대와 값 목록으로 제공한다. play/pause, 재시작, scrub, 한 단계 진행, reduced motion 비교를 기본으로 둔다.

enter 중 exit를 요청하는 단추처럼 중단 사례를 쉽게 시연한다. “현재 전환 후 다음” 기본값과 대안의 차이를 눈으로 확인하게 한다. 실제 native 미지원 속성은 지원 제한과 대체 제안을 같은 위치에 표시한다.

## 검증

같은 편집을 목록·그래프·AI로 수행했을 때 같은 command/문서 의미를 만드는지 확인한다. state×variant×Part 조합의 탐색, 키보드 조작, 설명 이해, 미구현 행동 표시, 새 타입 편집, Undo 복구를 시험한다. UI가 편하다는 이유로 state·theme·business context를 한 필드에 섞지 않는다.

## 결정 추적과 변경 영향

<a id="d15-03"></a>

**D15-03 — 확정 방향:** 트리거/조건/UI 동작의 목록·그래프와 AI 작성, preset을 함께 제공한다. 선택지 3의 'preset만'은 사용자가 명시적으로 'preset도'로 수정했다.

<a id="d17-01"></a>

**D17-01 — 확정 방향:** 일반 Inspector에 의미 편집을 통합하고 전용 접근성 관계·읽기 순서 패널도 제공한다.

<a id="d18-01"></a>

**D18-01 — 확정 방향:** enter/exit·상태 전환·tween/spring·delay·stagger와 keyframe 편집을 초기 필수로 한다. 그 밖의 고급 기능은 편집 난도·구현 비용 비교 후 정한다. 1번의 keyframe 후속 문구는 2번 필수 선택으로 대체되며, 다중 트랙을 초기 필수로 자동 추가하지 않는다.

전제 문서: [CMP06 · 동작·입력·기반 라이브러리 계약](../components/behavior-and-input-profiles.md) · [CMP07 · 공동 UI 호스트와 조정자](../components/coordinators-and-hosts.md) · [CMP08 · 접근성 의미·관계·준수 계약](../components/accessibility-contracts.md) · [CMP09 · 모션·전환·중단 의미](../components/motion-and-transitions.md) · [CMP10 · 외형 규칙·조건·우선순위](../components/appearance-conditions-and-precedence.md) · [CMP11 · 사용자 확장·등록·승격](../components/custom-definition-registry.md) · [UX01 · 작업 공간·온보딩·Inspector·도움말](onboarding-and-inspector.md).

변경 시 함께 검토: [UX07 · 즉시 preview·검증 화면·프로토타입](preview-and-prototypes.md) · [UX08 · Studio 접근성·언어·입력 품질](editor-accessibility-and-language.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
