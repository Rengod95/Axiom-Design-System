# QAL04 · 제품 출시 기준과 전체 지원

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 품질 책임자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 문서 확인과 제품 출시는 별도의 gate다

현재 목표는 Foundation 1.0.0의 전체 문서 기준선 검토다. 문서가 완성되어도 Studio 실행·접근성·출력 지원이 완료된 것은 아니다. 전체 문서 확인 후 구현 부트스트랩과 비공개 알파를 진행하고, 아래 출시 기준을 충족해야 정식 지원을 공개한다.

| gate | 필요한 결과 | 통과 증거 |
|---|---|---|
| G0 · 방향 | 129 원 결정·14 보충 방향 | 확정 기록 |
| G1 · 인덱스 | 56 문서 구조·개발 방향 | 전체 문서 작성 요청 |
| G2 · 전체 문서 | 본문·관계·예시·미확정 선택 절차 | 사용자의 기준선 확인 |
| G3 · 기반 실증 | token/engine/storage/profile 선택 | 비교 workload·ADR·버전 lock |
| G4 · 비공개 알파 | 핵심 제작→설치→upgrade 흐름 | 자가 사용·목표 사용자 시험 |
| G5 · 정식 출시 | 전체 필수 범위·품질·운영 | release profile 전체 결과 |

## 정식 출시 필수 묶음

선택한 토큰 표준의 선언한 전체 기능·렌더링, 전체 기본 카탈로그의 Web/Mobile, React/RN/Swift/Android, 성립하는 Web style profiles를 검증한다. 정의·저장 가능한 것과 실제 타깃 실행은 별도 증거가 필요하다.

GUI 내부 편집·상태·행동·a11y·모션, 공식 API/MCP·내장 AI, 브라우저/폴더 보관·준비 팩 offline, init/doctor·네 전달 방식·사용자 수정 diff·rollback, 영어/한국어·keyboard/screen reader/IME가 필수 사용자 흐름이다. 준비 팩 내부 AI 연결도 실제 시험한다.

품질은 유효 필수 정책과 자동·수동 요구 충족, 데이터 손실·권한 우회·치명적 계약 위반 미해결 없음, 복구·배포 재현·license/notices·운영 절차 준비를 포함한다. 숫자 성능·사용량·가격은 실측 후 고정한 기준으로 판단한다.

## 권장 항목과 제외를 공개한다

고급 panel 구성, 추가 browser/OS, 전문 vector·고급 timeline, realtime 협업 실행, 기업 installer, CMS는 각각 합의한 후속 경계를 따른다. 권장 항목이 없어도 필수 gate를 만족하면 공개할 수 있지만, 필수 항목을 권장으로 바꾸려면 owner scope 변경이 필요하다.

자동 검사가 모두 pass여도 수동 미완료는 full badge를 보류한다. 임시·부분 출력은 사용자가 내부 시험할 수 있도록 한계를 manifest에 적는다. 현재 카탈로그와 target table의 notRun을 감추지 않는다.

## 판정·예외·복구

Release Review는 candidate hash, scope manifest, evidence summary, open defects, required/optional 분류, 운영·권리 조건, rollback point를 한 묶음으로 검토한다. 책임자가 승인한 특정 정책 예외만 유효하며 자동으로 모든 의무를 면제하지 않는다.

출시 후 결함은 영향 release/profile을 표시하고 문제가 있는 새 출력의 사용을 중단·이전 검증본 복귀·수정 릴리스로 처리한다. 사용자 소유 소스 사용권을 회수하거나 이미 수정한 코드를 원격에서 덮어쓰는 방식으로 해결하지 않는다.

## 결정 추적과 변경 영향

<a id="d38-02"></a>

**D38-02 — 확정 방향:** 위 항목의 필수·권장 기준을 나누어 함께 적용

전제 문서: [PRD03 · 초기 범위·카탈로그·제품 확장 경계](../product/scope-catalog-and-roadmap.md) · [QAL01 · 검증 요구·oracle·자동/수동 검사](conformance-and-test-plans.md) · [QAL02 · 검증 증거·freshness·추적성](evidence-and-freshness.md) · [QAL03 · 성능·규모·비용 예산](performance-capacity-and-budgets.md) · [BIZ01 · 오픈 코어·소스·산출물 권리](../business/open-core-and-rights.md) · [UX08 · Studio 접근성·언어·입력 품질](../experience/editor-accessibility-and-language.md).

변경 시 함께 검토: [OPS04 · 지속 개발·유지보수·인수인계](../operations/development-and-maintenance.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
