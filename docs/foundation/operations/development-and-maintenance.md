# OPS04 · 지속 개발·유지보수·인수인계

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 개발/운영 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 1인 개발의 순서

문서 기준선 확인 후 첫 구현은 작은 기능을 완제품처럼 끝내는 세로 흐름으로 진행한다. 여러 package의 빈 interface만 한꺼번에 만드는 방식으로 진척을 계산하지 않는다. 공개 출시 필수 범위와 구현 순서를 구분한다.

| 단계 | 완성할 작업 | 다음 단계 조건 |
|---|---|---|
| I0 · bootstrap | 문서 승인·구현 ADR·tool/version/license lock | 문서 phase guard의 승인된 전환 |
| I1 · ADS·저장 | 읽기·검사·ID·transaction·Undo·복구 | 원본/partial draft/negative fixture |
| I2 · Foundation | 전체 표준 비교·token/theme editor | 표준 선택 증거·사용처 preview |
| I3 · component 흐름 | Button·Card·Toast 정의·편집·시연 | 공통/플랫폼·host·a11y·motion |
| I4 · delivery | React/RN 실제 프로젝트·AI 후보·독립 검사 | init·실행·diff·rollback |
| I5 · 확대 | compound·전체 catalog·Swift/Android | profile별 전체 증거 |
| I6 · 출시 | private 사용자·offline·권리·운영·성능 | QAL release review |
| 이후 | realtime 협업·기업 installer·별도 Studio/CMS | 독립 범위 확인 |

I4는 React/RN부터 검증하는 순서일 뿐 I5의 native 필수 범위를 지우지 않는다. 각 단계의 시간은 실측·재사용 가능성 확인 후 추정하고 고정 일정을 임의 약속하지 않는다.

## 작업 단위와 완료 정의

구현 issue는 사용자 과제, 책임 문서/결정, 입력·출력 계약, 실패·복구, target scope, test/evidence, migration, 운영·권리 영향을 포함한다. “파일을 만들었다”보다 사용자가 실제 끝낼 수 있는 작업을 완료 단위로 삼는다.

변경은 source·관련 문서·예시·diagnostics·tests를 함께 검토한다. 공개 계약/필수 범위 변화는 GOV01 승인 경로를 따른다. 중요 규칙을 설명 없이 코드에만 넣지 않는다. 의미 없는 구현 복제 테스트 대신 실제 실패를 잡는 negative·integration 검사를 우선한다.

## 레거시 재사용

이전 코드는 1b7bd6843ac638fac89da424637afa755d076144의 Git reference에 보존돼 있다. 필요한 알고리즘·fixture를 선택할 때 새 계약 책임자, 라이선스·출처, 제거할 CSS/상태 결합, 이월 가능한 의미, 새 테스트를 기록한다. 이전 테스트 통과를 새 증거로 가져오지 않는다.

신규 제품의 directory/package·generator·schema·CI는 승인된 architecture에서 생성한다. 오래된 imports·manifest·generated destination을 일부 되살려 숨은 결합을 만들지 않는다.

## 지속 유지보수

의존성 업데이트는 profile lock→영향→새 후보→전체 release 검사→사용자 upgrade 순서다. 기술 부채는 영향 사용자 작업, 위험, 수정 비용, owner, 검토 시점을 기록하고 영구 TODO 목록으로만 두지 않는다. 문서 index와 example refs의 정합성도 변경 PR에서 확인한다.

우선순위는 데이터 보존·권한·계약 정확성→핵심 제작/설치 UX→반복 작업 효율→확장이다. 규모가 작아도 이 순서는 지키고, 자동화 투자로 반복 검증 비용을 줄인다. 전체 기능 축소나 유료 기술 도입이 필요하면 구체 비교 결과로 결정한다.

## 결정 추적과 변경 영향

사용자 목적과 확정된 방향을 세부 설계로 연결하는 문서다. 새로운 범위 변경은 GOV01 절차로 승인한다.

전제 문서: [GOV01 · 문서 권위와 변경 승인](../governance/authority-and-change-control.md) · [ARC02 · 모듈·저장소·의존 방향](../architecture/modules-and-dependencies.md) · [QAL04 · 제품 출시 기준과 전체 지원](../quality/release-readiness.md) · [OPS03 · 릴리스·배포·의존성 공급망](release-and-supply-chain.md) · [BIZ04 · 사용자 조사·제품 검증·고객 피드백](../business/research-and-customer-feedback.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
