# ARC07 · 공식 API·MCP·확장·사용권 경계

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 시스템 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 외부 Agent는 공식 작성 통로를 사용한다

GUI·내장 AI·외부 Agent 모두 공개된 query와 typed command를 사용한다. 외부 Agent는 사용자 문서의 props/events·허용된 확장 계약을 편집할 수 있다. Axiom 서비스 API/MCP 구현, validator, 권한·entitlement, test oracle를 임의 수정하는 제품 명령은 제공하지 않는다.

MCP는 tool 발견·호출을 위한 프로토콜이고 도메인 권한·원자성·Undo를 대신하지 않는다. [MCP Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools). 실제 지원 프로토콜 판본과 transport는 integration profile로 고정한다.

## 공개 API의 표면

Query는 project.describe, registry.describe, context.resolve, document.get, diagnostics.list, impact.preview, target.capabilities, job.status다. Command는 문서 생성/수정/복사, component·Part·slot·trait·rule 편집, 검토 적용, Undo, 출력·doctor 계획 요청 등이다. 구체 목록은 [명령 부록](../annexes/commands-and-diagnostics.md)에 있다.

각 operation은 schema version, description/examples, input/output type, permission scope, review class, idempotency, side effects, diagnostic codes를 가진다. 한 번에 전체 프로젝트를 읽게 하지 않고 선택 범위와 필요한 참조 closure를 가져오는 query를 제공한다. pagination과 revision pin을 유지한다.

## 권한과 entitlement의 분리

Authorization은 어떤 사용자가 어떤 프로젝트를 읽고 바꿀 수 있는지다. Entitlement는 어떤 서비스 기능·자원 사용권이 있는지다. 두 결과가 모두 허용되어야 서비스 작업을 수행한다. 기본 역할안은 owner/editor/reviewer/viewer/service actor이며 구체 권한은 capability로 분해한다.

Plan 문자열을 domain rule 곳곳에서 비교하지 않고 EntitlementPort가 기능·자원 허용을 판단한다. 로컬 공개 코어의 의미 검사는 호스팅 구독에 종속시키지 않는다. 기업 코드 접근 권리와 런타임 API 권한도 구별한다.

## 검토와 audit

공유 token, 공개 API·행동·의무·dependency·삭제·공유 영향은 actor 종류와 무관하게 같은 review classification을 적용한다. Computer use로 같은 버튼을 누른다고 다른 권한 경로를 타지 않는다.

AuditRecord는 authenticated actor, operation, target refs, base/result revision, patch digest, approval, outcome, timestamp를 가진다. secret payload·개인 콘텐츠 전체를 로그에 남기지 않는다. rate·depth·operation size 한도로 무제한 context·작업 호출을 제어한다.

## 오류·호환·검증

인증 실패, scope 부족, entitlement 부족, stale revision, review required, invalid contract, unsupported target, budget exceeded를 구별한다. 서버 API를 변경하는 명령처럼 보이는 알 수 없는 operation은 거부한다. 오류를 “AI가 잘못함” 한 문장으로 숨기지 않는다.

프로토콜 버전 협상, unknown fields 보존 정책, schema digest, idempotency와 권한 회수, cross-project ref, core mutation 시도, GUI/AI/API 결과 동등성을 시험한다. 공개 API 변경은 문법 version과 별도로 compatibility를 검토한다.

## 결정 추적과 변경 영향

<a id="d03-03"></a>

**D03-03 — 확정 방향:** GUI·내장 AI와 함께 외부 Agent의 정식 API/MCP 명령 사용을 초기 작성 범위에 포함한다. Agent는 사용자 문서·컴포넌트의 props/events와 허용된 확장 계약을 명령으로 편집할 수 있으나 서비스 API/MCP 구현·코어 검증기·권한 체계는 수정할 수 없다. 1번의 외부 작성 제외 문구는 이번 명시적 서술로 대체한다. 외부 React 코드 import·역반영·반복 동기화 제외는 유지한다.

전제 문서: [ARC03 · 명령·트랜잭션·revision·Undo](commands-revisions-and-undo.md) · [ARC06 · 브라우저·로컬 Host·실행 경계](browser-host-and-execution.md) · [BIZ01 · 오픈 코어·소스·산출물 권리](../business/open-core-and-rights.md) · [BIZ02 · 무료·유료 경계와 운영 원가](../business/pricing-entitlements-and-economics.md).

변경 시 함께 검토: [AI01 · AI 작성·컨텍스트·공급자 연결](../ai/authoring-context-and-providers.md) · [OPS01 · 보안·데이터·비밀정보 관리](../operations/security-and-data-boundaries.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
