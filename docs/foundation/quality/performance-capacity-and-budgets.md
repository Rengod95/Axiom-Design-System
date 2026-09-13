# QAL03 · 성능·규모·비용 예산

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 품질 책임자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 성능은 장비·문서·행동을 함께 적어야 한다

“빠른 Canvas”는 검사 가능한 목표가 아니다. token 수·component 수·동시 artboard·참조 깊이·텍스트·이미지와 실제 작업을 고정해 측정한다. 아래 숫자는 최초 비교를 위한 목표안이며 측정 결과나 사용자가 확정한 출시 수치가 아니다.

| dataset | 제안 규모 | 대표 작업 |
|---|---|---|
| S · 작은 팀 | 500 token·30 component·3 artboard | 첫 열기·검색·수정·Undo |
| M · 주요 목표 | 5,000 token·300 component·12 artboard | 영향 분석·theme 변경·state preview |
| L · stress | 20,000 token·1,000 component·50 artboard | degradation·취소·복구 |

M까지 매번 전체 DOM을 펼치는 방식을 요구하지 않는다. 가시 artboard와 선택 범위 중심 렌더·incremental graph·worker·cache를 활용하되 읽기·선택·검색의 정합성을 유지한다.

## 측정 항목과 제안 목표

입력→화면 반영 p95는 S 100ms 이내, 연속 drag의 긴 정지는 100ms 미만을 초기 비교안으로 둔다. warm open S 2초/M 5초, 일반 부분 의미 검사 500ms, 큰 영향 분석은 진행·취소 가능성을 목표안으로 삼는다. native compile·AI 생성은 같은 100ms 기준으로 판단하지 않고 별도 job latency·예산을 측정한다.

장비·OS·브라우저·전원·CPU/memory·디스플레이·network·cold/warm·표본 수·계측 overhead를 기록한다. 하나의 개발자 고성능 Mac 수치로 Windows 보급 장비를 대표하지 않는다. 정확한 지원 하드웨어와 통과 목표는 첫 비교 결과를 검토한 뒤 제품 책임자가 확정한다.

## 자원 예산

메모리·저장 quota·artifact 크기·AI token/비용·실행 시간·최대 재시도·queue 길이를 작업별로 제한한다. 알려지지 않은 값은 무제한이 아니라 미설정 상태로 보고 유료 작업 전 한도를 정한다. 취소 후 자원 해제가 되는지도 측정한다.

월 운영비는 BIZ02의 비용 원장과 연결한다. near-zero 예산에서 managed native farm·무제한 AI를 기본 켜지 않는다. 로컬 실행과 필요 작업만 요청하는 설계로 시작한다.

## 초과 시 대응

우선 지연 원인과 문서 영향 범위를 측정한다. incrementality·lazy rendering·dependency 재사용·캐시 오류를 개선하고, 지원 환경 조정안을 제시한다. 필수 편집 기능이나 native 범위를 조용히 삭제하지 않는다. 지속 초과 시 근거·대안·개발 비용을 보여 주고 scope/목표 변경을 승인받는다.

성능 최적화 뒤에는 수치뿐 아니라 geometry·Undo·진단 freshness·타깃 코드 결과가 유지되는지 확인한다. cache key에 contract·profile·dependency 버전이 빠져 빠르지만 틀린 결과를 내는 경우 실패다.

## 결정 추적과 변경 영향

<a id="d38-01"></a>

**D38-01 — 확정 방향:** 일반 소규모와 수천 토큰·수백 컴포넌트 사례를 포함한 데이터셋·장비·작업별 성능 목표안을 검토한 뒤 확정한다.

<a id="d38-05"></a>

**D38-05 — 확정 방향:** 초기 측정 결과를 보고 현실적인 한도를 함께 확정

전제 문서: [PRD02 · 처음부터 설치까지의 사용자 시나리오](../product/journeys-and-acceptance.md) · [ARC04 · 저장·오프라인 팩·복구](../architecture/storage-offline-and-recovery.md) · [UX07 · 즉시 preview·검증 화면·프로토타입](../experience/preview-and-prototypes.md) · [AI02 · AI 코드 실현·후보·독립 판정](../ai/realization-and-independent-verification.md) · [BIZ02 · 무료·유료 경계와 운영 원가](../business/pricing-entitlements-and-economics.md).

변경 시 함께 검토: [QAL04 · 제품 출시 기준과 전체 지원](release-readiness.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
