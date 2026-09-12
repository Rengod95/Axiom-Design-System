# OPS02 · 호스팅·운영·진단·장애·지원

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 개발/운영 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 초기 운영은 로컬 중심으로 작게 시작한다

브라우저 editor의 정적 배포, 선택적인 계정/호스팅 서비스, artifact 저장, job coordination을 구분한다. 개인 로컬 작업을 위해 상시 서버와 계정을 필수로 만들지 않는다. 실제 배포 provider와 데이터베이스는 운영비·region·복구 요구를 비교해 선택한다.

초기 사업 예산이 거의 없으므로 무제한 생성 서버·모바일 build farm·24시간 SLA를 약속하지 않는다. 기업 자체 호스팅의 준비 팩 시험과 나중의 installer/관리 제품은 다른 완료 조건이다.

## 관측 가능한 상태

진단은 operation/job ID, stage, outcome, duration, resource count, target profile, error code, redacted environment를 기록한다. 파일 내용·API key·사용자 asset bytes는 기본 로그에 포함하지 않는다. 로컬 report를 보고 사용자가 선택해 비식별 오류 보고를 보낼 수 있다.

제품 화면에는 저장 실패, 미완료 검사, host 연결, candidate/last verified, provider quota를 구별한다. 로그에서 “성공”은 무엇이 성공했는지 stage가 있어야 한다. compile 성공을 release 성공으로 합치지 않는다.

## 장애·지원 흐름

문의는 제품 revision·작업·오류 code·선택된 진단으로 재현한다. 사용자가 전체 repository를 제공해야만 지원할 수 있는 구조를 기본으로 삼지 않는다. 재현용 최소 ADS 묶음을 만들 때 secret·asset 권리를 검사한다.

저장 장애는 export·복구 point 안내, AI 장애는 GUI 계속 사용·후보 보존, host 장애는 재연결·job 조회, 배포 장애는 이전 검증본·rollback으로 대응한다. 유료 서비스 제한과 데이터 접근·소스 사용권을 혼동하지 않는다.

## 보관과 복구 운영

Hosted artifact·metadata는 복구 우선순위와 보존 정책을 갖고 backup 복원 시험을 한다. 사용자 삭제 요청은 ownership·공유 참조·legal 보존 조건을 확인하고 실제 삭제 범위와 남는 기록을 설명한다. 정확한 보관 기간과 지역은 출시 전 운영 profile에 고정한다.

서비스 변경은 read-only 상태·호환 upgrade·rollback 경로를 준비한다. 사용자가 고정한 DS release와 이미 내보낸 코드에 영향을 주지 않도록 API version과 artifact integrity를 유지한다.

## 시험과 지표

오류 보고 선택·비식별화, 데이터 export·복원, provider/host 단절, storage quota, job 재시도 중복, 부분 장애, background cache refresh를 시험한다. 측정값은 성공 작업 비율·복구 시간·지원 시간·직접 원가다. 실제 검증 없이 가동률·평균 복구 시간을 채워 넣지 않는다.

## 결정 추적과 변경 영향

<a id="d38-04"></a>

**D38-04 — 확정 방향:** 로컬 진단이 기본이고 사용자가 선택한 비식별 오류 보고

전제 문서: [ARC04 · 저장·오프라인 팩·복구](../architecture/storage-offline-and-recovery.md) · [ARC06 · 브라우저·로컬 Host·실행 경계](../architecture/browser-host-and-execution.md) · [OPS01 · 보안·데이터·비밀정보 관리](security-and-data-boundaries.md) · [BIZ02 · 무료·유료 경계와 운영 원가](../business/pricing-entitlements-and-economics.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
