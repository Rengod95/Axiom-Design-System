# AI02 · AI 코드 실현·후보·독립 판정

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: AI 통합 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## AI는 구현 후보를 만들고 검증은 독립 경로에서 한다

이미 검증된 컴포넌트·template·기계적 token 변환을 우선 재사용한다. 새로운 조합이나 custom trait에 AI를 사용한다. 모든 출력 때 처음부터 임의 코드를 다시 만들면 비용과 결과 변동이 커진다.

RealizationJob은 contract/design snapshot, target/style/behavior profile, dependency lock, public API mapping, assets, coding conventions, module boundaries, pinned TestPlan, resource budget을 입력으로 가진다. 출력은 candidate files, provenance, dependency changes, build logs, diagnostics다.

## 정답 기준을 먼저 고정한다

기본 archetype과 trait의 obligations에서 oracle를 구성하고 custom 요구는 사용자가 검토한 뒤 고정한다. 구현 Agent는 후보 코드 경로에만 쓰며 test plan·oracle·검증기·성공 receipt에 쓰지 못한다. 필요 계약 변경은 별도 proposal로 돌아가 새 revision을 승인받는다.

같은 모델을 쓴다는 이유만으로 독립성이 성립하지 않는다. 입력·권한·저장 경로·test oracle 소유·runner identity가 분리되어야 한다. 후보가 test 파일을 삭제하거나 test discovery를 비워 성공 exit code를 내는 경우도 실패다.

## 반복과 채택

1. 검증된 pack과 호환성을 찾아 재사용·정규 변환 가능한 부분을 고정한다.
2. 부족한 구현을 AI에게 좁은 범위로 맡긴다.
3. source·dependency·API diff를 검사하고 허용된 sandbox에서 build한다.
4. frozen requirements의 자동 시험과 필요한 수동 시험을 실행한다.
5. 실패 진단만 구현 후보에 전달해 예산 안에서 수정한다.
6. 정확한 candidate hash의 증거를 모아 검토·채택한다.

시간·토큰·비용·시도 수 중 한도를 넘으면 중단한다. 마지막 검증본을 유지하고 실패 후보, 별도 계약 수정 제안, 명시적 부분 출력 중 선택한다. 부분 출력은 전체 정식 지원 표시를 받지 않는다.

## Card와 Toast의 실패·재시도 예

**Card:** 사용자가 확인한 plain Card의 body slot 안에 독립 Button을 넣은 fixture를 고정한다. 후보 C1이 Card 전체를 button으로 만들어 중첩 조작과 불필요한 tab stop 검사를 실패하면, Agent는 C1의 구조만 콘텐츠 컨테이너로 수정해 C2를 제출한다. 고정된 plain Card 의미·oracle·필수 시험 개수는 유지한다. 선택 가능한 Card가 필요한 경우에는 별도 계약 제안으로 selected owner·selectionRequest·입력/이름 의무와 영향을 제시한다. 사용자가 그 의미 변경을 확인하기 전에는 원래 Card 시험을 지워 C1을 통과시키지 않는다. C2의 정확한 source hash로 검사를 실행해 채택하고, 실패하거나 예산을 소진하면 이전 검증본 V를 유지한다.

**Toast:** controlled open=false 뒤 exit를 시작하고, 재표시된 새 generation에 이전 completion을 전달하는 trace를 고정한다. 후보 T1이 새 Toast까지 제거하면 cleanup-once와 generation isolation 실패다. Agent는 후보의 generation 확인·멱등 cleanup을 고쳐 T2를 재시험한다. callback을 제외하거나 timeout을 무제한으로 늘리는 oracle 변경은 허용하지 않는다. 타깃에서 기존 motion 계약을 만족시킬 수 없다는 증거가 나오면 제한된 대체 motion/지원 범위와 새 계약 revision을 별도 제안한다. 승인 전에는 실패 타깃을 미검증으로 유지하고 마지막 검증 source와 환경을 표시한다.

두 작업 모두 시작 전에 최대 시도·시간·비용 한도와 중단 조건을 고정한다. 재시도는 실패 진단과 같은 pinned contract/TestPlan을 사용하고 새 후보 digest를 만든다. Card가 통과해도 Toast 실패를 묶음 전체 통과로 만들지 않는다. 사용자가 내부 시험용 Card만 선택하면 manifest에 포함 타깃·미완료 Toast·만료된 증거를 표시한다. 이 예의 V/C1/C2/T1/T2는 절차 설명용 기호이며 실제 실행 결과가 아니다.

## 자동 생성 테스트의 한계와 책임

코드에서 기대값을 다시 읽어 같은 값인지 검사하면 구현을 복제한 시험이 된다. contract의 expected event·state·focus·대비·motion lifecycle을 독립 입력 trace로 검사한다. 시각 reference도 후보 screenshot을 자동 정답으로 승격하지 않는다.

미검증 탐색 preview는 편집 UX에 유용하지만 release evidence가 아니다. 계약상 동작이 타깃에 불가능하거나 접근성 대안이 필요하면 어댑터와 의무를 검토하고 지원 상태를 유지한다. AI 사용이 target mapping·runtime integration을 없애지는 않는다.

## 검증

테스트 변경 공격, 빈 테스트·skip·xfail, 새 dependency 삽입, public API drift, business logic 유입, candidate/source hash 불일치, 재시도 비용 중복, last verified 보존을 시험한다. [QAL01 · 검증 요구·oracle·자동/수동 검사](../quality/conformance-and-test-plans.md)과 [QAL02 · 검증 증거·freshness·추적성](../quality/evidence-and-freshness.md)가 최종 증거·배포 판정을 소유한다.

## 결정 추적과 변경 영향

<a id="d12-02"></a>

**D12-02 — 확정 방향:** 미검증 AI 탐색 preview를 허용한다. 정식 구현 후보는 사용자 정의와 검증 요구 revision을 고정한 뒤 독립 검사하며, 구현 Agent가 통과를 위해 기준을 바꾸지 못한다.

<a id="d29-01"></a>

**D29-01 — 확정 방향:** 검증된 구현·템플릿·기계적 변환을 재사용하고 새로운 조합에 AI 사용

<a id="d29-02"></a>

**D29-02 — 확정 방향:** 작업 전 예산·최대 시도·중단 기준을 보여 주고 제한 안에서 자동 재시도

<a id="d29-03"></a>

**D29-03 — 확정 방향:** 마지막 검증본을 유지하고 실패 후보 보기, 별도 계약 수정 제안, 명시적 부분 출력 중 선택한다. 부분 출력은 전체 정식 지원 표시를 받지 않는다.

전제 문서: [AI01 · AI 작성·컨텍스트·공급자 연결](authoring-context-and-providers.md) · [CMP06 · 동작·입력·기반 라이브러리 계약](../components/behavior-and-input-profiles.md) · [CMP08 · 접근성 의미·관계·준수 계약](../components/accessibility-contracts.md) · [CMP09 · 모션·전환·중단 의미](../components/motion-and-transitions.md).

변경 시 함께 검토: [DLV01 · 타깃·스타일·동작 기반 지원표](../delivery/target-and-style-profiles.md) · [QAL01 · 검증 요구·oracle·자동/수동 검사](../quality/conformance-and-test-plans.md) · [QAL03 · 성능·규모·비용 예산](../quality/performance-capacity-and-budgets.md) · [OPS01 · 보안·데이터·비밀정보 관리](../operations/security-and-data-boundaries.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
