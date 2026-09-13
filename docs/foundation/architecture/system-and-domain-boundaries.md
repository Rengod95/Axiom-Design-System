# ARC01 · 시스템 문맥·도메인·핵심 흐름

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 시스템 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 시스템의 중심은 검증 가능한 문서 변경이다

GUI, 내장 AI, 외부 Agent는 같은 ADS 문서에 대한 typed command를 만든다. 코어는 문법·참조·의무를 검사하고 revision과 diff를 만든다. Studio의 시연과 타깃 코드 생성은 이 문서의 서로 다른 소비자다. renderer의 내부 객체나 AI가 임의로 만든 파일이 정본이 되지 않는다.

~~~mermaid
flowchart LR
  G[GUI] --> C[Command service]
  A[내장 AI] --> C
  M[공식 API / MCP Agent] --> C
  C --> V[형식 · 의미 · 권한 · 영향 검사]
  V --> R[검토 · 원자 commit · revision]
  R --> S[ADS 문서 저장]
  S --> P[디자인 시연]
  S --> T[고정 계약 · 독립 test plan]
  T --> I[재사용 / 기계 변환 / AI 구현 후보]
  I --> E[타깃 실행 · 독립 검증]
  E --> D[사용자 소유 소스 · 설치 · upgrade]
~~~

## 도메인과 소유 데이터

| 도메인 | 책임 | 소유하지 않는 것 |
|---|---|---|
| Foundation | token·theme·분류·policy | 컴포넌트 업무 로직 |
| Component | 의미·구조·행동·a11y·motion | 구독·billing |
| Brand | asset·사용 지침·출처 | UI 상태 owner |
| Authoring | command·revision·diff·undo | 임의 코드 해석 |
| Preview | 시연·geometry·sandbox bridge | 정본 직접 수정 |
| Realization | 타깃 후보·dependency·build | test oracle 변경 |
| Verification | 요구·증거·freshness | 자기 판단으로 계약 약화 |
| Delivery | 설치·doctor·사용자 diff | GUI 코드 역수입 |
| Service | 계정·협업·entitlement·호스팅 | 로컬 문서의 의미 |

도메인 사이에는 ID/ref·immutable snapshot·진단·capability를 전달한다. 복잡한 공통 객체 하나에 renderer/DB/AI SDK를 모두 넣지 않는다. UI 상태와 시스템 의미를 구분하고 저장 adapter는 코어 타입을 브라우저나 SaaS DB에 종속시키지 않는다.

## 대표 runtime 흐름

Card gap 변경은 선택 Part→typed patch→정책/참조 검사→임시 preview→검토 여부 판정→commit→영향 projection 갱신이다. 일반 로컬 변경은 정한 규칙에서 바로 commit될 수 있고 공유 토큰은 검토한다. 애니메이션 frame마다 영구 revision을 만들지 않는다.

출력은 snapshot·profile·dependency lock·test plan을 고정하고 후보 파일을 격리 영역에 생성한다. 검증 결과는 정확한 source hash에 묶는다. 설치 후 소비 프로젝트 수정은 새 파일 provenance에 남기고 다음 출력과 비교한다. 사용자 수정 코드를 ADS로 역해석하지 않는다.

## 분리의 비용과 이점

분리된 계약·저장 port·검증 경로를 처음 만드는 비용은 있다. 대신 engine·AI·target 교체가 문법 전체를 흔들지 않고, 오프라인·외부 Agent·협업에서 같은 오류와 Undo를 사용할 수 있다. 모든 것을 microservice로 쪼개지는 않는다. 1인 개발의 초기 실행 단위는 modular monolith와 로컬 Host다.

장애는 마지막 유효 snapshot·검증본과 현재 후보를 구분해 복구한다. 외부 tool 실패가 사용자 문서 손실로 이어지지 않게 한다. 모듈 경계와 선택 후보는 [ARC02 · 모듈·저장소·의존 방향](modules-and-dependencies.md), 명령 흐름은 [ARC03 · 명령·트랜잭션·revision·Undo](commands-revisions-and-undo.md), 실행 권한은 [ARC06 · 브라우저·로컬 Host·실행 경계](browser-host-and-execution.md)에서 상세화한다.

## 결정 추적과 변경 영향

사용자 목적과 확정된 방향을 세부 설계로 연결하는 문서다. 새로운 범위 변경은 GOV01 절차로 승인한다.

전제 문서: [PRD02 · 처음부터 설치까지의 사용자 시나리오](../product/journeys-and-acceptance.md) · [PRD03 · 초기 범위·카탈로그·제품 확장 경계](../product/scope-catalog-and-roadmap.md) · [SYN02 · 프로젝트 문서·ID·참조·수명](../syntax/project-documents-and-identity.md) · [CMP01 · 컴포넌트 정의 계층과 디자인 범주](../components/definition-and-designs.md) · [BIZ01 · 오픈 코어·소스·산출물 권리](../business/open-core-and-rights.md).

변경 시 함께 검토: [ARC02 · 모듈·저장소·의존 방향](modules-and-dependencies.md) · [ARC03 · 명령·트랜잭션·revision·Undo](commands-revisions-and-undo.md) · [ARC06 · 브라우저·로컬 Host·실행 경계](browser-host-and-execution.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
