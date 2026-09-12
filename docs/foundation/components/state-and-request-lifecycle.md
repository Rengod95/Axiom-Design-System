# CMP04 · 상태 소유권과 요청 수명

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 요청과 확정된 값은 다르다

Controlled state는 소비 앱이 값을 확정하고 컴포넌트는 변경 요청을 보내는 패턴이다. Uncontrolled state는 초기값 이후 컴포넌트가 UI 값을 관리한다. 한 값에는 한 owner만 둔다. 소비 앱의 응답이 느리다고 몰래 owner를 바꾸지 않는다.

| 구분 | 내부 관리 | 외부 제어 |
|---|---|---|
| 초기값 | defaultValue로 초기화 | value 입력 |
| 사용자 조작 | 정책 검사 후 내부 commit | changeRequest 전달 |
| 최종 표시값 | 내부 committed value | 외부가 전달한 value |
| preview | 조작하며 내부 값 관찰 | 외부 응답 mock으로 지연·거절·변경 시험 |

Runtime 관측 상태(hover, focus-visible, pressed), 공개 UI 값(selected/open), 표시 수명(presence), 임시 편집 버퍼(query)를 따로 둔다. variant나 theme를 상태 머신에 모두 집어넣지 않는다.

## 요청 수명 계약

Request에는 id, owner value, desired value/action, source, base value revision, status, cancellation reason이 있다. status는 proposed→pending→accepted/rejected/cancelled/superseded로 흐를 수 있다. terminal request는 다시 accepted로 바뀌지 않는다. timeout은 거절·재시도 안내 등의 UI 정책이지 업무 실패 판정이 아니다.

Controlled Select에서 Arrow 이동은 activeKey만 바꾸고 명시적 선택이 selectedKey 변경을 요청한다. query가 바뀌어 이전 검색 결과가 늦게 도착하면 request identity와 query revision을 비교해 stale 결과가 새 선택을 덮지 못하게 한다.

## 중복·큐·취소

Profile별로 reject-new, latest-wins, FIFO, coalesce를 명시한다. 기본 권고는 연속 query에는 최신 의도, 순서가 의미 있는 Toast queue에는 FIFO, 한 번의 activation에는 중복 억제다. 전역 FIFO는 모든 UI에 강제하지 않는다. 큐 길이·취소·overflow·terminal 처리는 profile 필드로 고정한다.

Motion의 finish-current-then-next 기본값은 시각 전환 규칙이다. open이 false가 되면 입력·포커스 정책은 논리 닫힘에 맞게 진행하고, 시각 요소의 exit가 끝나야 하는 경우에만 표시 제거를 지연한다.

## Toast와 Card 사례

Toast는 mounting에서 표시 준비, presenting에서 사용자에게 표시, exiting에서 종료 표현, removed에서 자원 해제를 한다. closeRequest는 한 번만 terminal 효과를 만들고 host는 이미 제거된 항목의 늦은 animation callback을 무시한다. 재표시가 허용되면 새 generation 또는 새 instance ID로 구분한다.

Plain Card는 이 수명 머신이나 selected 값을 필수로 갖지 않는다. 일반 렌더 node의 mount/unmount와 컴포넌트가 공개한 presence 계약도 구별한다. 선택 Card로 확장했을 때만 선택값 소유권을 설정한다.

## 검증

모든 상태 edge에 trigger, guard, state effect, emitted event, focus effect, motion request, cleanup을 연결한다. 도달 불가 상태·두 owner·terminal 중복·늦은 응답·중간 unmount·외부 값 강제 변경을 시험한다. 상태 그래프 편집은 이 계약을 설명하고 변경하는 UX이며 전이선을 그렸다는 사실만으로 runtime 구현이 완료되지는 않는다.

## 결정 추적과 변경 영향

<a id="d14-01"></a>

**D14-01 — 확정 방향:** 내부 관리/외부 제어를 명시하고 preview에서 외부 값을 모의 조작

<a id="d14-02"></a>

**D14-02 — 확정 방향:** 큐 처리를 지원하고 profile별 권고 기본값을 둔다. 모든 UI 요청에 전역 FIFO를 강제한 것으로 해석하지 않는다.

<a id="d14-03"></a>

**D14-03 — 확정 방향:** query와 selected를 독립 값으로 두고 명시적 profile로 연결

전제 문서: [CMP02 · trait·role·유형과 조합](traits-roles-and-archetypes.md) · [CMP03 · 값·이벤트·props·UI 표현식](values-events-and-expressions.md).

변경 시 함께 검토: [CMP06 · 동작·입력·기반 라이브러리 계약](behavior-and-input-profiles.md) · [CMP07 · 공동 UI 호스트와 조정자](coordinators-and-hosts.md) · [CMP09 · 모션·전환·중단 의미](motion-and-transitions.md) · [CMP10 · 외형 규칙·조건·우선순위](appearance-conditions-and-precedence.md) · [UX07 · 즉시 preview·검증 화면·프로토타입](../experience/preview-and-prototypes.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
