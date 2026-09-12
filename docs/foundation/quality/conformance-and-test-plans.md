# QAL01 · 검증 요구·oracle·자동/수동 검사

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 품질 책임자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 계약에서 검사 요구를 만든다

Conformance는 특정 컴포넌트·타깃이 선언한 의무를 실제로 만족하는 상태다. TestPlan은 기본 archetype, trait/role/policy, 사용자 추가 요구, 디자인 규칙, target profile에서 requirement를 모아 만든다. 구현 코드를 읽어 그 코드와 같은 기대값을 만들지 않는다.

Requirement는 id/version, owner contract ref, appliesWhen, setup, stimulus, expected observable, severity, oracleRef, automation/manual mode, target/environment scope를 가진다. plan에는 전체 요구 목록과 적용 제외 이유, 예상 test count, fixture hash를 고정한다.

## 검사 층과 관찰

| 층 | 확인하는 것 | 대표 실패 |
|---|---|---|
| 형식·의미 | 타입·참조·trait 조합·단일 owner | selected 두 owner |
| 공개 API | 출력 언어 타입·값·event payload | nullable 손실 |
| 행동 | 입력 trace→state/event/focus | 한 번 눌러 두 번 emit |
| 접근성 | 의미·키보드·읽기·공지 | 이름·focus 복귀 누락 |
| 외형·모션 | 계산값·layout·전환·cleanup | exit 후 ghost node |
| 패키징·설치 | 실제 dependency·provider·consumer | alias 오류 |
| 복구·권한 | Undo·stale patch·범위·자원 | core mutation 허용 |

자동·수동 요구를 함께 release profile에 넣는다. 자동 전부 통과해도 필수 수동 항목이 남으면 내부 시험 출력만 허용하고 정식 표시를 보류한다.

## 조합 폭발을 다루는 방식

variant×Part×state의 모든 정의 rule을 직접 검사하고, reachable state transitions와 공통 의무의 모든 적용 경우를 추적한다. 그 외 환경 조합은 위험 기반·pairwise·대표 fixture로 줄일 수 있으나 필수 조합 누락을 숨기지 않는다. 표본 전략·제외 이유를 plan에 기록한다.

전체 카탈로그의 각 항목·provider 변형·target profile은 obligation family에 연결한다. generic snapshot 하나로 모든 Button·Select·Toast를 통과시킬 수 없다. extension 의무가 늘면 그에 대응하는 oracle와 fixture가 필요하다.

## 커스텀과 독립성

기존 유형의 요구는 상속하고 AI가 제안한 추가 requirement는 사용자 검토 후 고정한다. 구현 Agent는 candidate 영역만 수정한다. test runner·expected values·발견 목록·성공 receipt는 별도 권한이다. 빈 테스트, skip, xfail, discovery failure, test 삭제, timeout은 통과로 세지 않는다.

수동 evidence는 시험자·환경·절차·관찰·artifact를 기록한다. 체크박스를 클릭한 사실만으로 무엇을 시험했는지 알 수 없는 기록을 허용하지 않는다. [QAL02 · 검증 증거·freshness·추적성](evidence-and-freshness.md)의 hash·freshness를 적용한다.

## 검증 계획의 검증

test generator 자체에는 golden plan, 잘못된 구현을 반드시 잡는 negative/mutation fixture, target별 oracle 차이를 검토한다. 한 코드 생성기가 코드와 검사의 정답을 함께 만들고 자체 승인하지 못하게 한다. [시나리오 부록](../annexes/scenarios-and-evidence.md)은 Button·Card·Toast·Select/Dialog와 전체 흐름의 최소 검사 목록이다.

## 결정 추적과 변경 영향

<a id="d31-01"></a>

**D31-01 — 확정 방향:** 선택한 release profile의 필수 자동·수동 요구를 충족

<a id="d31-02"></a>

**D31-02 — 확정 방향:** 기본 oracle와 기존 유형의 요구를 상속하고, AI가 제안한 커스텀 요구는 사용자 검토 후 고정한다.

<a id="d31-04"></a>

**D31-04 — 확정 방향:** 초안·내부 시험 출력은 허용하고 정식 검증 표시는 보류

전제 문서: [CMP08 · 접근성 의미·관계·준수 계약](../components/accessibility-contracts.md) · [CMP09 · 모션·전환·중단 의미](../components/motion-and-transitions.md) · [DLV01 · 타깃·스타일·동작 기반 지원표](../delivery/target-and-style-profiles.md) · [AI02 · AI 코드 실현·후보·독립 판정](../ai/realization-and-independent-verification.md).

변경 시 함께 검토: [QAL02 · 검증 증거·freshness·추적성](evidence-and-freshness.md) · [QAL04 · 제품 출시 기준과 전체 지원](release-readiness.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
