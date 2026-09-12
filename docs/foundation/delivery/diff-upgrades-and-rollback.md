# DLV04 · 사용자 수정 diff·업그레이드·rollback

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 플랫폼 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 사용자 수정본을 보존하며 새 출력을 적용한다

Studio 밖에서 사용자가 코드를 수정할 수 있다. Axiom은 그 코드를 ADS로 역해석하지 않지만 이전 생성 baseline, 현재 사용자 파일, 새 출력의 차이를 비교할 수 있다. 이 세 가지가 3-way upgrade의 입력이다.

UpgradePlan은 consumer connection, old/new release, baseline hashes, current hashes, file moves/deletes, dependency/provider changes, hunks, conflicts, selected actions, validation plan, rollback refs를 가진다.

## 비교 규칙

| 상황 | 처리 |
|---|---|
| current가 baseline과 같음 | 새 출력으로 대체 가능한 후보 |
| current만 바뀜 | 사용자 수정 보존 |
| new만 바뀜 | 선택 적용 |
| current와 new가 같은 곳을 다르게 바꿈 | conflict 비교 |
| baseline 없음 | current/new 비교, 변경 출처 판단 불가 표시 |
| 파일 이동·삭제에 사용자 수정 존재 | 보존·이동 매핑·수동 해결 |
| dependency/provider 변경 | 파일 diff와 별도 중요 검토 |

단순 텍스트 비중첩도 의미 충돌이 있을 수 있다. API·import·context·style scope가 바뀌면 build·contract 검사로 확인한다. 파일·컴포넌트 기본 단위와 안전한 text hunk 선택을 제공하되 부분 선택으로 깨진 코드를 성공 처리하지 않는다.

## AI 병합과 적용

AI는 conflict 해결 후보를 만들 수 있지만 사용자 수정의 출처와 새 계약을 함께 읽고 patch를 별도 검토받는다. 실패한 검사를 없애거나 public API를 임의로 바꿔 병합을 통과시키지 않는다.

적용 직전 current file hashes를 다시 확인해 계획 이후 수정이 있으면 재비교한다. backup→staging→검사→선택 적용→receipt 순서로 진행한다. 설치·외부 효과의 원복 가능성과 파일 복원은 구별한다.

## 여러 프로젝트의 버전

소비 프로젝트는 시스템 version을 고정한다. release가 생겼다고 자동으로 모든 앱을 바꾸지 않는다. 프로젝트마다 diff, 시험, 선택 적용, rollback 상태를 관리하고 전체 진행표에 노출한다. 한 앱에서 실패해도 이미 승인된 다른 앱의 기록을 잃지 않는다.

Rollback은 해당 프로젝트의 직전 file/dependency/provider 상태를 복원하고 실제 build를 확인한다. 되돌림 대상 이후 사용자 수정이 있으면 다시 충돌 비교를 한다. 원래 상태로 돌아간다는 문구에는 실제 검사 결과가 필요하다.

## 검증

baseline 없음·손상, rename/delete conflict, 사용자 import 수정, hunk 조합 실패, stale plan, 일부 프로젝트 실패, AI 병합 검토, rollback 후 재업그레이드, dependency drift를 시험한다. 결과 파일 hash와 사용한 contract·profile·검증 결과를 receipt로 남겨 다음 비교의 출처로 쓴다.

## 결정 추적과 변경 영향

<a id="d33-01"></a>

**D33-01 — 확정 방향:** 파일·컴포넌트 단위 기본 + 안전한 텍스트 구간 선택

<a id="d33-02"></a>

**D33-02 — 확정 방향:** 현재 파일/새 파일을 비교하고 변경 출처 판단 불가를 표시

<a id="d33-03"></a>

**D33-03 — 확정 방향:** 프로젝트별 시험·검사·선택 적용·개별 rollback과 전체 진행표

<a id="d33-04"></a>

**D33-04 — 확정 방향:** 사용자 수정을 보존하며 충돌을 비교한다. AI 해결안은 적용 전에 별도로 검토한다.

전제 문서: [GOV03 · 버전·호환·deprecated 정책](../governance/version-and-compatibility.md) · [DLV02 · 소비 프로젝트 init·doctor](project-init-and-doctor.md) · [DLV03 · 사용자 소유 코드·패키지·배포](user-owned-library-and-packaging.md) · [ARC03 · 명령·트랜잭션·revision·Undo](../architecture/commands-revisions-and-undo.md).

변경 시 함께 검토: [OPS03 · 릴리스·배포·의존성 공급망](../operations/release-and-supply-chain.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
