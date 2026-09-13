# CMP07 · 공동 UI 호스트와 조정자

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 여러 인스턴스가 함께 지켜야 할 UI 규칙

Toast 여러 개의 순서와 공지, Dialog의 겹침과 focus 복귀, Select 항목의 선택을 개별 컴포넌트가 독립 처리하면 충돌한다. Coordinator는 공유 UI 규칙을 소유하고 Host는 그 규칙의 명시적 연결·표현 범위다. 모든 coordinator가 화면 node를 갖는 것은 아니다.

앱의 theme provider, Select 내부 context, Toast 화면 host, AI 공급자는 다른 개념이다. 연결 화면은 현재 host ID와 문서·범위를 보여 준다.

## 초기 조정자 유형과 역산

| 조정자 | 필요한 카탈로그 | 소유 상태·의무 |
|---|---|---|
| collection/selection | Select·ListBox·Tabs·Tree | item identity·active/selected·탐색 |
| overlay/focus | Dialog·Popover·Menu·Tooltip | overlay stack·dismiss 순서·focus 복귀 |
| notification | Toast·Notifications | queue·표시 수·공지 순서·제거 |
| form/field | Field·Form·입력 | label/description·등록·UI 검증 표시 |
| group/roving | Toolbar·RadioGroup | 그룹 내 조작 지점·선택 |
| view/virtualization | Table·Tree·Virtualizer | 가시 범위와 논리 identity |
| environment | theme·locale·direction | scope별 환경 값 |
| prototype | 검증 화면·이동 | 모의 값·현재 화면·시나리오 시간 |

표의 목적은 실제 카탈로그로 필요한 호스트를 역산하는 것이다. 전부 하나의 거대한 전역 store로 구현하지 않는다. 단일 컴포넌트 안의 로컬 context와 여러 root에서 공유하는 context는 scope와 수명이 다르다.

## 연결 계약

HostDefinition은 id, coordinatorRef/version, scope, configuration, accepted clients, lifetime, parentHostRef를 가진다. ClientBinding은 required capability, explicitHostRef 또는 search rule, actualResolvedHostRef와 diagnostics를 가진다.

기본 UX는 가장 가까운 호환 명시적 host를 제안·연결한다. 수동 선택과 profile별 검색 규칙도 허용한다. 후보가 여러 개거나 없으면 실제 경로와 이유를 보여 주고 생성·지정하도록 한다. 문서에 보이지 않는 host를 조용히 추가해 다른 화면의 Toast queue와 합치지 않는다.

## 수명·중첩·복구

등록/해제는 instanceId와 generation으로 멱등 처리한다. unmount된 항목의 늦은 callback이 새 항목을 제거하지 못한다. 중첩 Dialog를 닫을 때 바로 뒤의 유효 조작 대상으로 복귀하고, 대상이 사라졌으면 profile의 fallback을 따른다.

Notification queue는 UI 순서·overflow·pause/resume을 관리한다. 주문 우선순위나 고객 등급으로 알림 순서를 계산하는 업무 규칙을 내장하지 않는다. 외부가 전달한 공지 중요도의 UI 의미만 처리한다.

필수 시험은 host 누락·다중 후보·수동 지정·중첩 scope·중복 등록·해제·재연결·overflow·부적합 version이다. Host의 위치·버전 변경은 연결 client와 설치 provider, 검증 화면, 타깃 실제 실행을 다시 검사하게 한다.

## 결정 추적과 변경 영향

<a id="d16-01"></a>

**D16-01 — 확정 방향:** 필요한 조정자를 제안하고 명시적 호스트를 생성·확인

<a id="d16-02"></a>

**D16-02 — 확정 방향:** 카탈로그에 실제 필요한 조정자를 역산해 정식 목록 확정

<a id="d16-03"></a>

**D16-03 — 확정 방향:** profile별 호스트 연결 규칙과 수동 지정을 지원한다. 기본값은 가장 가까운 호환 명시적 호스트의 제안·연결이다. 실제 경로를 표시하고 누락·모호함을 진단한다.

전제 문서: [CMP04 · 상태 소유권과 요청 수명](state-and-request-lifecycle.md) · [CMP05 · Part·slot·인스턴스·override](parts-slots-and-instances.md) · [CMP06 · 동작·입력·기반 라이브러리 계약](behavior-and-input-profiles.md).

변경 시 함께 검토: [CMP08 · 접근성 의미·관계·준수 계약](accessibility-contracts.md) · [UX06 · 컴포넌트·동작·접근성·모션 편집 UX](../experience/component-editing-panels.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
