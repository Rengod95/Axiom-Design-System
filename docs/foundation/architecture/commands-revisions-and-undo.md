# ARC03 · 명령·트랜잭션·revision·Undo

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 시스템 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 모든 작성 경로가 같은 규칙을 거친다

CommandEnvelope는 commandId, actorId, projectId, baseRevision, operation, typed payload, idempotencyKey, origin(GUI/AI/API), transactionId, requestedScopes를 가진다. 권한은 서버/Host가 인증한 principal에서 결정하고 payload의 actor 주장만 신뢰하지 않는다.

처리는 decode→권한·entitlement→revision 확인→형식/의미 검증→영향·검토 판정→transaction commit→receipt·projection 갱신 순서다. 검토가 필요한 경우 후보 patch와 approval token을 만들고 원본은 유지한다. 승인 토큰은 patch digest·base revision·권한 범위에 묶인다.

## 명령과 저장의 원자성

Command는 token.create/update, component.define, part.move, value.configure, rule.update, registry.promote 같은 도메인 의도를 가진다. low-level JSON patch는 내부 적용 표현이 될 수 있지만 공개 경로에서 임의 path를 써 검증기·권한 문서를 수정하게 하지 않는다.

한 사용자의 drag 또는 AI 적용 묶음은 하나의 transaction이다. 전체를 검사해 모두 commit하거나 원본을 유지한다. 일부만 가능한 경우 독립 작업으로 새 계획을 만들어 선택 재시도한다. 원자 묶음의 반만 성공했는데 성공 receipt를 만들지 않는다.

## 오래된 revision과 중복 요청

동일 idempotencyKey·동일 payload 재시도는 동일 결과를 반환한다. 같은 key로 다른 payload면 오류다. commit 전에 실패한 작업과 commit 후 응답만 유실된 작업을 receipt 조회로 구분한다.

AI가 r10을 읽은 동안 사용자가 r11에서 다른 Part를 수정했다면 read/write set과 의미 의존성을 검사한다. 비충돌 변화만 새 base로 재계획할 수 있다. 같은 token 또는 의존 guard가 바뀌면 단순 path 비중첩만으로 안전하다고 보지 않는다. 충돌 항목·before/current/proposed를 비교한다.

## Undo와 transient 편집

pointer move·color scrub·text composition은 transient buffer에서 시연한다. 완료 시 의미 있는 command로 묶고 inverse 또는 before snapshot을 기록한다. Undo는 무조건 옛 bytes로 되돌리기보다 현재 참조·권한·후속 변경을 검사한 역작업이다. redo도 같은 검사를 거친다.

공동 편집에서는 개인의 아직 유효한 작업을 되돌리는 personal Undo와 공유 문서 과거 revision으로 명시적으로 되돌리는 revert를 구별한다. 네트워크 메시지·파일 설치 같은 외부 효과는 문서 Undo만으로 취소되지 않으므로 별도 보상 작업을 안내한다.

## 진단과 검증

Result는 accepted/reviewRequired/conflict/rejected, revision, diff, diagnostics, undoHandle, affectedRefs를 가진다. 진단은 stable code, severity, source/related refs, explanation, suggested actions, target scope를 포함한다.

필수 시험은 중복 전송·응답 유실, stale approval, 실패 혼합, 의미상 충돌, 연속 drag Undo, 외부 효과 보상, 권한 회수 중 commit이다. [명령·진단 부록](../annexes/commands-and-diagnostics.md)에 공개 명령 가족과 응답을 정리한다.

## 결정 추적과 변경 영향

<a id="d20-01"></a>

**D20-01 — 확정 방향:** 한 번의 사용자 의도·드래그·AI 적용 묶음을 한 단위로 처리

<a id="d20-02"></a>

**D20-02 — 확정 방향:** 겹치지 않는 부분만 적용 가능하게 하고 충돌 부분은 비교

<a id="d20-03"></a>

**D20-03 — 확정 방향:** 명령 묶음은 원자적으로 처리하고 독립 작업만 선택 재시도

전제 문서: [SYN02 · 프로젝트 문서·ID·참조·수명](../syntax/project-documents-and-identity.md) · [CMP11 · 사용자 확장·등록·승격](../components/custom-definition-registry.md) · [ARC01 · 시스템 문맥·도메인·핵심 흐름](system-and-domain-boundaries.md).

변경 시 함께 검토: [ARC04 · 저장·오프라인 팩·복구](storage-offline-and-recovery.md) · [ARC05 · 후속 실시간 협업을 위한 구조](collaboration-readiness.md) · [ARC06 · 브라우저·로컬 Host·실행 경계](browser-host-and-execution.md) · [ARC07 · 공식 API·MCP·확장·사용권 경계](public-api-mcp-and-entitlements.md) · [DLV04 · 사용자 수정 diff·업그레이드·rollback](../delivery/diff-upgrades-and-rollback.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
