# UX05 · 토큰·테마·정책 편집 UX

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: UX/UI 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 토큰 표를 넘어 결과를 보게 한다

Foundation editor는 token 목록, 값 편집, alias·사용처 그래프, theme context 비교, 실제 컴포넌트 preview를 연결한다. 사용자는 JSON type 이름부터 이해하지 않아도 색·간격·서체 등의 분류에서 시작할 수 있다. 상세 보기는 원본·정규화 값·type·domain·tier·metadata를 보여 준다.

토큰을 선택하면 기본값·상속·alias 원천·최종 해석값·사용처가 함께 보인다. alias 원천 변경과 alias를 끊고 literal로 바꾸는 행동은 다른 command다. 서로 다른 토큰을 같은 이름으로 잘못 합치지 않는다.

## 즉시 preview와 공유 변경 검토

편집 gesture는 즉시 preview한다. 그러나 모든 공유 token의 정본 변경은 영향과 diff를 검토한다. 이는 즉시 시연과 승인 전 commit을 구별하는 설계다. 사용자는 검토 중에도 값 후보를 바꾸며 결과를 비교할 수 있고 취소하면 원래 revision으로 돌아간다.

예를 들어 brand.accent 후보를 바꾸면 Button·Card·Toast와 theme별 영향이 표시된다. 영향 계산이 아직 끝나지 않았으면 일부 사용처만 전체인 것처럼 보여 주지 않는다. 결과 commit은 하나의 Undo 단위이고 후속 코드 배포는 별도다.

## 편집 control과 오류

기본 control은 색 공간·alpha, 단위 있는 수치, font family/weight, duration/easing, 복합 값의 필드를 지원한다. 선택한 표준 전체를 단순 color picker UI에 맞춰 축소하지 않는다. GUI 표현이 어려운 기능은 구조화 상세 편집과 같은 진단을 제공한다.

새 domain을 만들 때 설명·허용 type·사용 속성 후보를 묻는다. AI가 제안한 binding은 검토 대상이며 renderer 지원 상태를 별도로 표시한다. 오류 원본을 가져온 경우 유효 부분과 실패 위치를 함께 보여 준다.

## theme와 정책

독립 축 조합과 이름 있는 theme set을 선택하고 결과·출처를 비교한다. invalid context·누락 기본값·순환 alias는 오류로, 시스템 밖 사용은 정책에 맞는 warning/error로 보여 준다. Canvas의 경고 표시는 클릭 시 해당 token·rule로 이동한다.

사용자는 literal→기존 token, literal→새 token, alias 교체, 승인 예외 제안을 선택할 수 있다. 예외는 scope와 사유를 명시하고 접근성 필수 의무와 섞지 않는다.

## 검증

첫 사용자에게 색·spacing·typography·theme를 수정하게 하고 원본/최종값을 구별하는지 확인한다. 수천 token 검색·사용처 계산은 [QAL03 · 성능·규모·비용 예산](../quality/performance-capacity-and-budgets.md)의 성능 데이터셋으로 측정한다. source 보존·compound 편집·공유 검토·Undo·theme collision을 시험한다.

## 결정 추적과 변경 영향

<a id="d08-02"></a>

**D08-02 — 확정 방향:** 편집은 즉시 preview하고 사용처 영향·되돌리기를 함께 제공

전제 문서: [SYN03 · DSF·토큰·테마·사용자 정책](../syntax/foundation-and-token-semantics.md) · [SYN04 · 가져오기·원문 보존·migration](../syntax/interchange-and-migration.md) · [UX01 · 작업 공간·온보딩·Inspector·도움말](onboarding-and-inspector.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
