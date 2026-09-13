# UX05 · 토큰·테마·정책 편집 UX

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: UX/UI 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 토큰 표를 넘어 결과를 보게 한다

Foundation editor는 token 목록, 값 편집, alias·사용처 그래프, theme context 비교, 실제 컴포넌트 preview를 연결한다. 사용자는 JSON type 이름부터 이해하지 않아도 색·간격·서체 등의 분류에서 시작할 수 있다. 상세 보기는 원본·정규화 값·type·domain·tier·metadata를 보여 준다.

토큰을 선택하면 기본값·상속·alias 원천·최종 해석값·사용처가 함께 보인다. alias 원천 변경과 alias를 끊고 literal로 바꾸는 행동은 다른 command다. 서로 다른 토큰을 같은 이름으로 잘못 합치지 않는다.

## 생성·이름 변경·대량 편집

새 토큰은 분류 선택→이름·type에 맞는 값 또는 alias 선택→theme별 결과·사용처 영향 확인→검토 적용으로 만든다. 같은 scope의 이름 충돌과 type 불일치는 입력 위치에서 설명하고, 초안을 고쳐 적용할 때까지 기존 토큰을 바꾸지 않는다. 복사는 새 ID와 참조 mapping을 제안하며 기존 토큰의 이름 변경과 구별한다.

이름 변경은 선택한 토큰의 stable ID를 유지한다. 이름으로 표시된 사용처와 외부 출력 경로/API에 미치는 영향을 나눠 보여 주고 [SYN02](../syntax/project-documents-and-identity.md)의 identity 규칙을 적용한다. 예를 들어 brand.accent를 brand.primary로 바꿔도 내부 alias는 같은 ID를 가리킨다. 가져오기 원본의 이름과 bytes는 출처에 보존하며 공개 출력 이름이 달라지면 호환성 영향을 함께 검토한다.

대량 편집은 검색·분류·theme로 좁힌 행을 명시적으로 선택한 뒤 바꿀 필드와 대상 수를 보여 준다. 행마다 현재값·제안값·진단을 비교하고 전체 선택의 alias/type/theme 충돌을 검사한다. 오류가 있으면 선택 전체를 적용하지 않는다. 사용자가 유효한 일부만 선택하면 그 집합에 대해 참조 closure와 영향·검토 토큰을 다시 계산한다. 최종 선택은 여러 token command를 한 transaction·한 Undo로 적용하며 검토 중 대상 revision이 바뀌면 재비교한다. 실행 중 일부 행만 성공한 상태를 완전 적용으로 보고하지 않는다.

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

첫 사용자에게 색·spacing·typography·theme를 수정하게 하고 원본/최종값을 구별하는지 확인한다. 수천 token 검색·사용처 계산은 [QAL03 · 성능·규모·비용 예산](../quality/performance-capacity-and-budgets.md)의 성능 데이터셋으로 측정한다. 생성·이름 충돌·공개 이름 변경·대량 편집의 오류/부분 재선택·stale 검토·한 번 Undo, source 보존·compound 편집·공유 검토·theme collision을 시험한다.

## 결정 추적과 변경 영향

<a id="d08-02"></a>

**D08-02 — 확정 방향:** 편집은 즉시 preview하고 사용처 영향·되돌리기를 함께 제공

전제 문서: [SYN03 · DSF·토큰·테마·사용자 정책](../syntax/foundation-and-token-semantics.md) · [SYN04 · 가져오기·원문 보존·migration](../syntax/interchange-and-migration.md) · [UX01 · 작업 공간·온보딩·Inspector·도움말](onboarding-and-inspector.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
