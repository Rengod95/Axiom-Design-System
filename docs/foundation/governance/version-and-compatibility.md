# GOV03 · 버전·호환·deprecated 정책

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 제품 책임자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 서로 다른 네 가지 버전

ADS 문법 버전은 파일을 읽는 방법이다. trait·컴포넌트 버전은 약속하는 기능이다. 프로젝트 revision은 한 편집 결과의 식별자다. 배포된 UI 라이브러리 버전은 소비 앱이 고정하는 산출물이다. Card의 색을 수정할 때 이 네 가지가 한꺼번에 major로 바뀌지 않는다.

설계안은 공개 계약 버전에 semantic versioning을 사용한다. 문서의 Foundation 버전과 구현 패키지의 실제 첫 버전은 따로 승인한다. 아직 출시하지 않은 예시의 1.0.0은 제품이 출시됐다는 표시가 아니다.

## 호환성을 판정하는 기준

| 변화 | 기본 분류 | 추가 확인 |
|---|---|---|
| 표시 설명·오탈자 정정 | patch 후보 | 실행 의미 변화가 없는가 |
| 선택적 prop·trait 설정 추가 | minor 후보 | 기존 기본값·필수 의무가 그대로인가 |
| 이벤트 payload 축소·필수 값 추가 | major 후보 | 소비 앱 수정 및 migration 필요 |
| focus·키보드 기본 행동 변경 | 잠재적 breaking | 타입이 같아도 사용자 기대가 달라지는가 |
| 토큰 값 변경 | 시각 영향 변경 | theme 대비·레이아웃·소비 화면 검증 |
| 버그 수정 | patch 후보 | 기존 사용자가 의존한 동작의 영향 공지 |

숫자 규칙만으로 호환성을 판정하지 않는다. Machine-readable compatibility record는 변경 계약 ID, before/after revision, 분류 이유, 영향 경로, migration, required tests를 가진다.

## 과거 문서를 계속 쓸 수 있게 한다

공개한 안정 형식은 원본 bytes와 출처를 보존하고 현재 문법으로 migration해 편집한다. 여러 단계가 필요하면 각 변환의 입력·출력 hash와 진단을 남긴다. 원본을 변환 결과로 덮어쓰지 않는다. 변환이 불가능한 영역은 보존한 채 해당 출력만 제한한다.

새 버전의 알려지지 않은 extension을 열면 “보존됨”과 “이해하고 편집 가능함”을 따로 표시한다. 익숙한 JSON처럼 보인다고 삭제하거나 기본값으로 대체하지 않는다. 모든 과거 실행기를 Studio 안에 영구 탑재하는 의무는 없다.

## 사용 중단과 삭제

Deprecated는 사용 중단 권고와 대체 경로를 표시하는 상태다. 삭제와 동의어가 아니다. introducedIn, deprecatedIn, replacementRef, rationale, migrationAvailability를 기록하고 역참조 목록에 영향을 보여 준다. 실제 삭제는 사용처 대체·사용처 제거·미해결 초안 보존 중 선택한다. 마지막 방식은 정식 배포를 보장하지 않는다.

다른 trait 버전은 독립 컴포넌트에서 공존할 수 있다. 같은 Select의 공통 selected 값이나 키보드 처리를 나눠 맡는 연결은 값·이벤트·의무의 버전 호환성을 통과해야 한다. 단지 같은 namespace라는 이유로 혼합하지 않는다.

## 검증과 변경 책임

최초 공개 전 현재 안정 형식 corpus와 migration 역추적을 준비한다. 매 변경은 기존 corpus 읽기, 원본 보존, 손실 진단, 소비 API 타입, 주요 행동 regression을 확인한다. 지원 종료 기간의 정확한 숫자는 첫 공개 cadence가 정해질 때 제품 책임자가 확정한다. 그 전에는 임의의 지원 종료일을 발표하지 않고 공개 안정 원본 보존 원칙을 유지한다. 출력 업데이트의 파일 비교·rollback은 [DLV04 · 사용자 수정 diff·업그레이드·rollback](../delivery/diff-upgrades-and-rollback.md)가 소유한다.

## 결정 추적과 변경 영향

<a id="d05-01"></a>

**D05-01 — 확정 방향:** 위임에 따라 1번을 선택한다. 공개 안정 버전의 원본을 보존하고 최신 문법으로 migration해 계속 편집한다. 과거 실행기를 모두 영구 내장하지 않는다. 변환 불가·손실은 진단하고 원본을 유지한다.

전제 문서: [GOV01 · 문서 권위와 변경 승인](authority-and-change-control.md).

변경 시 함께 검토: [BRD01 · Brand Library와 사용 지침](../brand/library-and-guidelines.md) · [SYN01 · ADS와 토큰 표준 선정 계약](../syntax/standard-strategy.md) · [SYN02 · 프로젝트 문서·ID·참조·수명](../syntax/project-documents-and-identity.md) · [SYN04 · 가져오기·원문 보존·migration](../syntax/interchange-and-migration.md) · [CMP02 · trait·role·유형과 조합](../components/traits-roles-and-archetypes.md) · [DLV04 · 사용자 수정 diff·업그레이드·rollback](../delivery/diff-upgrades-and-rollback.md) · [QAL02 · 검증 증거·freshness·추적성](../quality/evidence-and-freshness.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
