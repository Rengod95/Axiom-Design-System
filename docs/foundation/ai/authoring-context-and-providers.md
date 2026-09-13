# AI01 · AI 작성·컨텍스트·공급자 연결

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: AI 통합 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## AI가 읽는 컨텍스트도 제품의 계약이다

내장 대화와 외부 Agent는 사용자의 선택 범위와 필요한 참조를 바탕으로 작업한다. ContextBundle에는 selected refs, pinned revision, 관련 토큰·테마·trait·Part·의무, 허용 command 목록, target capabilities, 기존 진단, 예산을 포함한다. 전체 저장소·개인 파일을 무조건 전달하지 않는다.

컨텍스트 화면은 현재 포함된 범위와 확장 이유를 보여 준다. 사용자 원문, 문서 설명·asset metadata·외부 reference는 작업 데이터다. 그 안의 문장이 Axiom 권한을 높이거나 검증기를 바꾸는 지시로 실행되지 않는다.

## 작성 흐름

요청 이해→필요 query→작업 계획→typed command 후보→영향·검토 판정→적용·Undo→진단 확인의 순서다. 단순한 로컬 디자인 변경은 정한 정책 안에서 적용할 수 있고, 공유 token을 포함한 중요 변경은 사용자 검토를 거친다. 같은 규칙이 GUI에도 적용된다.

모호한 요청에서는 독립적이고 되돌릴 수 있는 부분부터 진행한다. 선택을 알아야 하는 UI 의미나 계약 변경만 질문한다. 대화가 길어지면 pinned refs와 결정·미해결 항목을 구조화해 유지하고, 오래된 context는 적용 전에 revision을 다시 확인한다.

## 공급자와 비용

ProviderConnection은 provider kind, endpoint/tool identity, auth method, supported operations, model capability, budget, locality, secret reference, last verification을 가진다. API key와 공식적으로 지원 가능한 사용자 로컬 도구 연결을 기본 방향으로 삼고 내부 AI endpoint도 시험한다.

사용자 Codex 계정 활용 선호는 지원 가능한 공식 연결 방식으로 검증해야 한다. ChatGPT/Codex 구독이 곧 임의 서비스의 API credential이라는 가정은 하지 않는다. API 연결·로컬 tool 연결·향후 Axiom 관리형 AI는 서로 다른 profile이며 검증되지 않은 auth 기능을 약속하지 않는다. 키는 문서에 넣지 않고 OS/브라우저 보안 저장과 Host 연결의 검증된 경로를 사용한다.

초기엔 사용자 키·로컬 도구 중심이다. 향후 Axiom AI는 비용을 감싼 유료 서비스로 별도 제공할 수 있다. 작성 전에 예상 사용량·최대 시도·timeout·중단 조건을 보여 주고 제한 내에서 재시도한다.

## 실패·복구와 검증

잘못된 JSON은 command decode 오류, 잘못된 의미는 contract diagnostic, 지원 불가는 capability 제한으로 구별한다. 일반 응답 텍스트를 실행 명령으로 추정하지 않는다. provider 장애는 적용 전 patch를 보존하고 재시도·다른 provider·GUI 계속 편집을 제공한다.

시험은 context 최소 범위·참조 완전성, 긴 대화 revision, malicious metadata, 허용 scope, core mutation 시도, budget 소진, API key 노출 방지, provider 교체, 한글·영문 요청의 동일 계약 결과다. 현재 provider 연결 성공 실적은 별도 실행 전까지 없다.

## 결정 추적과 변경 영향

<a id="d28-01"></a>

**D28-01 — 확정 방향:** 선택 영역과 필요한 참조·계약·토큰의 컨텍스트를 표시한다. 외부 Agent도 같은 공식 명령 API/MCP 경로를 사용하며 코어 API·검증기·권한 체계 수정 권한은 제공하지 않는다.

<a id="d28-02"></a>

**D28-02 — 확정 방향:** 중요 API·계약·행동·의존성·삭제·공유 영향과 모든 공유 토큰 변경을 검토한다. GUI·내장 AI·외부 Agent가 같은 변경 판정을 거친다.

<a id="d28-03"></a>

**D28-03 — 확정 방향:** 안전한 독립 작업부터 진행하고 필요한 부분만 질문

<a id="d39-05"></a>

**D39-05 — 확정 방향:** 공식 지원 가능한 사용자 키·로컬 도구 연결 목록을 실제 검증한다. 초기 준비 팩에서는 내부 AI 연결도 시험하고 기업용 설치 패키지는 후속으로 둔다.

전제 문서: [ARC07 · 공식 API·MCP·확장·사용권 경계](../architecture/public-api-mcp-and-entitlements.md) · [UX01 · 작업 공간·온보딩·Inspector·도움말](../experience/onboarding-and-inspector.md) · [SYN02 · 프로젝트 문서·ID·참조·수명](../syntax/project-documents-and-identity.md) · [CMP11 · 사용자 확장·등록·승격](../components/custom-definition-registry.md).

변경 시 함께 검토: [AI02 · AI 코드 실현·후보·독립 판정](realization-and-independent-verification.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
