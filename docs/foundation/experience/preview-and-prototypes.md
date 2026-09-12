# UX07 · 즉시 preview·검증 화면·프로토타입

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: UX/UI 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## preview에는 서로 다른 정확도가 있다

디자인 시연, 마지막 실제 구현, 현재 후보 실행을 나눠 보여 준다. 디자인을 수정하면 즉시 시연이 바뀌지만 이전 구현은 오래된 revision으로 표시한다. 사용자가 비교할 수 있는 대상은 디자인 revision, 구현 source hash, target/runtime, evidence 상태다.

| 표시 | 의미 |
|---|---|
| 디자인 시연 | ADS에서 계산한 현재 외형·시뮬레이션 |
| 탐색 후보 | AI가 만든 미검증 실행 |
| 실제 구현 후보 | 고정 계약에 대한 검증 중 코드 |
| 마지막 검증본 | 기록된 환경에서 통과한 이전/현재 source |
| 부분 지원 | 일부 기능·타깃만 실현, 제한 명시 |

미구현 행동도 계약·상태·외형을 편집하고 시뮬레이션할 수 있다. simulation을 실제 runtime 지원 증거로 기록하지 않는다.

## Web과 Mobile 확인

Web은 격리 preview에서 실제 React 후보를 실행하고 편집 geometry를 교환한다. 같은 출처의 권한 있는 Studio DOM 안에서 미검증 코드를 실행하지 않는다. source origin·session·revision을 확인한다.

Mobile은 브라우저 근사 비교, 가능한 QR/개발 클라이언트 연결, Host를 통한 simulator 안내, 소비 프로젝트에서 직접 실행을 조합한다. QR 연결만으로 기기 실행 성공을 주장하지 않는다. RN·Swift·Android의 실제 환경과 코드 hash를 받아 증거를 연결한다. Web/Mobile은 디자인 범주이며 출력 기술은 별도 선택이다.

## 시스템 검증 화면

검증 화면은 고정 component version의 인스턴스·brand asset·theme를 배치하고 mock data, 상태 토글, event 연결, 화면 이동, 반복·지연·거절 시나리오를 제공한다. 화면 구성과 시험 시나리오를 별도 문서로 저장해 같은 화면을 여러 조건에서 시험한다.

화면 전용 override는 표시하고 공통 variant·component로 승격할 수 있다. 승격은 공유 영향 검토를 거친다. Screen A→B→A 같은 프로토타입 cycle은 허용하지만 무한 자동 event loop는 step budget으로 중단한다.

## 공유·산출

공유할 preview는 소유자가 선택한 snapshot·접근 범위·만료/철회를 가지며 미검증 badge를 유지한다. 사용자 소유 실행 예제 소스에는 필요한 component·token·asset·mock·route wiring을 제공한다. 외부 업무 API·실제 결제·사용자 개인정보를 기본 샘플에 넣지 않는다.

오프라인 예제는 필요한 runtime·font·asset을 준비한 범위에서 동작한다. 현재 연결한 개발 host가 끊기면 마지막 화면과 연결 상태를 보여 주고 실행 성공을 이어서 표시하지 않는다.

## 시험

최신 디자인과 오래된 코드 비교, stale message 거부, sandbox crash, native 연결 중단·재연결, mock 지연·거절, 순환 prototype, 공유 철회, 예제 소스 실제 실행을 검사한다. 실제 플랫폼 검증은 [QAL01 · 검증 요구·oracle·자동/수동 검사](../quality/conformance-and-test-plans.md)을 따른다.

## 결정 추적과 변경 영향

<a id="d27-01"></a>

**D27-01 — 확정 방향:** 최신 디자인 preview와 마지막 실제 구현을 함께 비교하고 차이 표시

<a id="d27-02"></a>

**D27-02 — 확정 방향:** 미구현 행동도 계약·상태·외형 편집과 시뮬레이션이 가능하다. AI가 행동 연결·구현안을 제안하고 실제 미구현 상태를 명시한다.

<a id="d27-03"></a>

**D27-03 — 확정 방향:** 가능한 환경에서 QR/개발 클라이언트와 Host 기반 simulator 안내를 조합한다. 브라우저 근사 preview를 기본 비교 경로로 두고 소비 프로젝트에서 실제 확인하는 방법도 대안으로 제공한다.

<a id="d34-01"></a>

**D34-01 — 확정 방향:** 위 기능을 모두 제공하되 검증 시나리오와 화면 구성을 구분

<a id="d34-02"></a>

**D34-02 — 확정 방향:** 일회성 override로 표시하고 공통 variant·컴포넌트로 승격 가능

<a id="d34-03"></a>

**D34-03 — 확정 방향:** 위 기능과 사용자 소유 실행 예제 소스 제공

전제 문서: [PRD02 · 처음부터 설치까지의 사용자 시나리오](../product/journeys-and-acceptance.md) · [CMP04 · 상태 소유권과 요청 수명](../components/state-and-request-lifecycle.md) · [CMP10 · 외형 규칙·조건·우선순위](../components/appearance-conditions-and-precedence.md) · [UX03 · 시각적 레이아웃 편집](layout-authoring.md) · [UX06 · 컴포넌트·동작·접근성·모션 편집 UX](component-editing-panels.md).

변경 시 함께 검토: [QAL03 · 성능·규모·비용 예산](../quality/performance-capacity-and-budgets.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
