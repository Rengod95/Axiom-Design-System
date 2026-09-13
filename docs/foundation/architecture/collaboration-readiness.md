# ARC05 · 후속 실시간 협업을 위한 구조

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 시스템 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 실시간 협업을 나중에 추가할 수 있는 초기 구조

초기에는 realtime 공동 편집을 출시하지 않지만 stable ID, 작은 변경 단위, origin, revision, 참조 검증, 개인 Undo의 경계를 지금 만든다. 이것이 이후 협업 개발 비용을 없애지는 않는다. convergence와 사용자 의도 보존, 권한, 의미 유효성은 서로 다른 문제다.

초기 저장은 snapshot+journal과 StoragePort로 시작할 수 있다. Yjs/Automerge 또는 서버 sequencer 채택은 같은 업무로 비교한다. Yjs의 shared types와 Undo 기능은 후보 근거이며 ADS의 의미 유효성을 자동 보장하지 않는다. [Yjs 공식 저장소](https://github.com/yjs/yjs)

## 병합 정책

비충돌 편집은 함께 진행하고 필요하면 컴포넌트 단위 exclusive lock을 선택한다. lock은 owner, scope, lease, revision, renewal/release 상태를 가진다. 만료·네트워크 단절·권한 회수 후의 재접속을 다룬다. 잠금이 없는 작업에서 데이터 손실을 허용하는 것은 아니다.

같은 필드의 상충 값, 삭제와 편집, reparent 순환, 동시에 바뀐 trait ownership은 의도와 revision을 보존해 비교한다. 데이터 구조가 합쳐졌더라도 의미 검사가 실패하면 문제 초안을 보존하고 마지막 유효 preview와 차이를 표시한다.

## 공동 편집 데이터 경계

문서 작업, cursor·selection presence, 사용자별 panel/camera, AI job 상태, artifact binaries는 다른 동기화 수명이다. cursor가 이동할 때 project release revision을 만들지 않는다. 크기가 큰 자산은 hash 참조로 연결하고 별도 전송한다.

offline 작업은 연결 후 권한과 base를 다시 확인한다. 과거 권한으로 만든 operation이 현재 서버에서 무조건 수용되지는 않는다. 거부된 local work는 복사·export·권한 요청 경로로 보존한다.

## 개인 Undo와 공유 revert

개인 Undo는 자신의 작업 origin과 아직 유효한 대상에 작용한다. 다른 사람이 같은 Part를 수정한 뒤 이전 snapshot을 덮어쓰는 방식은 금지한다. 공유 revert는 모든 참여자가 보는 변경이며 영향·권한·diff를 명시한다.

AI는 별도 actor/job origin을 갖고 사용자가 적용한 transaction의 승인·Undo 관계를 남긴다. “AI가 썼으니 내가 되돌릴 수 없다”는 UX를 만들지 않는다.

## 구현 전 시험

두 클라이언트의 독립 필드 수정, 같은 필드 충돌, delete/edit, 순환 reparent, 연결 끊김·재전송·순서 변경·중복, lock 만료, 개인 Undo·공유 revert를 테스트한 뒤 기술을 채택한다. 초기에는 이 계약과 저장 adapter 경계를 유지하고 실제 네트워크 협업 완료로 표시하지 않는다. 협업 도입은 [OPS04 · 지속 개발·유지보수·인수인계](../operations/development-and-maintenance.md)의 별도 단계다.

## 결정 추적과 변경 영향

<a id="d22-01"></a>

**D22-01 — 확정 방향:** 비충돌 공동 편집을 기본으로 설계하고 선택적 컴포넌트 단위 독점 잠금을 제공한다. 충돌의 의도와 revision을 보존해 비교하며 실제 공동 편집 구현은 후속이다.

<a id="d22-02"></a>

**D22-02 — 확정 방향:** 문제 있는 초안을 보존하고 마지막 유효 preview와 차이를 표시

<a id="d22-03"></a>

**D22-03 — 확정 방향:** 개인 Undo와 명시적 공유 되돌리기를 별도로 제공

전제 문서: [ARC03 · 명령·트랜잭션·revision·Undo](commands-revisions-and-undo.md) · [ARC04 · 저장·오프라인 팩·복구](storage-offline-and-recovery.md) · [CMP05 · Part·slot·인스턴스·override](../components/parts-slots-and-instances.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
