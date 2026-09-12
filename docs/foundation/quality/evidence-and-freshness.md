# QAL02 · 검증 증거·freshness·추적성

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 품질 책임자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 초록색 표시가 무엇을 증명하는지 추적한다

EvidenceRecord는 evidenceId, requirementIds, contract/design/standard/registry revisions, source hash, dependency lock digest, target profile version, environment, runner identity, fixture/oracle digest, observed result, timestamps, artifacts를 가진다. 수동 결과에는 수행자와 실제 절차·관찰도 필요하다.

진행 상태는 notRun/running/pass/fail/blocked/waived/stale를 구별한다. waived는 특정 승인 가능한 정책 예외이며 다른 필수 접근성 의무의 pass로 바뀌지 않는다. 지원 badge는 계산된 파생값이고 사용자가 문서 필드를 수정해 직접 pass로 만들 수 없다.

## freshness 규칙

편집 중에는 영향 graph에 따른 부분 검사를 사용한다. token/theme/asset 변경은 관련 시각·대비·layout 증거를, behavior/trait/state 변경은 event·focus·lifecycle 증거를, dependency/toolchain 변경은 해당 target 전체 증거를 만료시킨다. 연관성을 모르면 보수적으로 stale로 처리한다.

정식 배포 때는 release profile에 정의된 검증을 전체 재실행한다. 배포 통과는 그중 필수 요구 충족으로 판단한다. “일부 검사는 권장”이라는 사실이 profile의 실행 누락을 허용한다는 뜻은 아니다. 수동 항목도 해당 후보에 대해 다시 확인하고 환경·절차를 기록한다.

## 후보와 마지막 검증본

현재 디자인이 r20이고 마지막 구현이 r18이면 두 상태를 동시에 표시한다. r18 증거를 r20 지원으로 옮기지 않는다. 동일 bytes를 재사용할 때도 정식 release의 전체 실행 원칙과 candidate manifest pin을 유지한다.

candidate를 바꾸면 source hash가 바뀐다. 시험 중 파일 변경·dependency 변동이 있으면 결과를 해당 snapshot에 묶거나 invalid로 처리한다. 사용자 배포 이후 임의 코드를 수정하면 Axiom 원본 artifact의 증거와 사용자 수정본의 증거는 다르다.

## 증거 신뢰 경계

Runner는 검증 대상 source를 읽고 고정 oracle를 실행하지만 implementation agent가 쓸 수 없는 결과 경로에 기록한다. attestation·서명·hash는 내용과 출처 추적을 돕지만 부족한 테스트의 품질까지 증명하지 않는다.

공식 외부 라이브러리의 설명, 과거 27개 연구 실험, legacy CI 성공, 330개 이름 목록은 배경 근거다. 현재 Studio end-to-end, RN 실제 실행, native a11y 검증의 대체물이 아니다.

## 확인할 실패

stale badge, source swap, 변경된 oracle, 가짜 환경 label, 누락 artifact, unknown test count, 중복 receipt, 수동 범위 누락, 부분 출력의 전체 지원 주장을 검사한다. Evidence 보관·export는 source manifest와 함께 이동 가능해야 하며 저장 경로가 사라지면 확인 불가 상태를 표시한다.

## 결정 추적과 변경 영향

<a id="d31-03"></a>

**D31-03 — 확정 방향:** 편집 중에는 부분 검사하고, 정식 배포 시에는 해당 release profile에 정의된 검증을 전체 재실행한다. 배포 통과 여부는 profile의 필수 요구를 기준으로 판정한다.

전제 문서: [QAL01 · 검증 요구·oracle·자동/수동 검사](conformance-and-test-plans.md) · [GOV03 · 버전·호환·deprecated 정책](../governance/version-and-compatibility.md) · [DLV03 · 사용자 소유 코드·패키지·배포](../delivery/user-owned-library-and-packaging.md).

변경 시 함께 검토: [QAL04 · 제품 출시 기준과 전체 지원](release-readiness.md) · [OPS03 · 릴리스·배포·의존성 공급망](../operations/release-and-supply-chain.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
