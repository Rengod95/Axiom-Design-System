# PRD03 · 초기 범위·카탈로그·제품 확장 경계

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 제품 기획자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 첫 출시에서 지키는 범위

초기 제품은 Design System Builder다. 토큰 생성이 첫 성공의 우선순위지만 컴포넌트 편집을 단순 속성 폼으로 축소하지 않는다. 내부 부품의 직접 조작, slots, variants, 상태·행동·접근성, 모션, 테마, 조건, Web/Mobile 디자인, 검증 화면과 프로토타입 흐름까지 제공한다.

| 구분 | 범위 |
|---|---|
| 초기 필수 | DSF·컴포넌트 제작, GUI·내장 AI·공식 API/MCP Agent 작성, 기본 팩과 선택 팩 |
| 초기 필수 | 로컬/오프라인 준비, init/doctor, 사용자 소유 라이브러리, diff·rollback |
| 초기 필수 | React·RN·Swift·Android, 성립하는 Web 스타일 프로필, 전체 기본 카탈로그의 검증 |
| 설계는 초기·실행은 후속 | 실시간 공동 편집, 기업 설치 제품 패키지 |
| 후속 비교 | 고급 다중 트랙 모션, 정밀 벡터 제작, 별도 CMS |
| 초기 제외 | 임의 외부 React 코드 import·GUI 역반영·반복 동기화 |

외부 Agent 명령 작성과 외부 코드를 분석해 GUI 문서로 역수입하는 것은 별개 기능이다. Agent가 공식 명령으로 새 Card를 만드는 것은 허용된다. 기존 React 파일을 수정하고 이를 Studio가 완전히 이해하는 기능을 약속하지 않는다.

## 카탈로그를 세는 방법

[카탈로그 부록](../annexes/catalog-and-obligations.md)은 이전 공식 카탈로그 조사 330행을 빠짐없이 보존하고, 표기 정규화 항목·provider별 변형·family·종류를 연결한다. 같은 이름이라도 동작 계약이 같다는 의미는 아니다. ButtonGroup과 Button은 별도 목적이며 Portal은 사용자가 그리는 일반 Button과 다른 실행 지원 개체다.

각 항목에는 canonical ID, 원본 행, component/part/template/utility 분류, family, 필요한 trait·role·policy 후보, Web/Mobile 목적, 타깃별 검증 상태가 있어야 한다. 이름만 들어 있다고 지원 완료로 계산하지 않는다. 의미가 다른 provider 변형은 공통 기반 위에 별도 profile을 둔다. 표기 병합만으로 요구를 삭제하지 않는다.

Axiom 기본 팩과 React Aria·Base UI·shadcn 계열의 선택 팩은 유지한다. Mantine 등의 목록은 누락 탐지와 UX 비교 근거이며 제3자 구현 전체를 무조건 복사하겠다는 약속은 아니다. 날짜·차트·서식 편집·일정 같은 복잡한 항목도 목록에서 숨겨 일정 문제를 해결하지 않는다. UI 범용 계약과 소비 업무 데이터의 경계를 명확히 한 뒤 필요한 profile을 검증한다.

## 개발 순서와 출시 조건은 다르다

1인 개발에서는 Button·Card·Toast의 세로 흐름을 비공개 알파에서 먼저 완성하고 Select/Dialog, 목록·입력·복잡 도메인으로 넓힌다. 이는 공개 출시 범위를 세 개로 줄이는 결정이 아니다. 전체 카탈로그와 네이티브 타깃의 필수 검증을 충족하지 못하면 비공개 시험 상태를 유지한다.

일정이 과도해지면 재사용 기반, 실행 환경 수, 자동화 효율을 먼저 조정한다. 필수 기능을 바꾸려면 실패·유지 비용·대안을 보여 주고 범위 변경 승인을 받는다. 개발 시간의 확정 수치를 근거 없이 약속하지 않는다. [QAL04 · 제품 출시 기준과 전체 지원](../quality/release-readiness.md)의 release gate와 [OPS04 · 지속 개발·유지보수·인수인계](../operations/development-and-maintenance.md)의 실행 순서가 이 경계를 유지한다.

## 결정 추적과 변경 영향

<a id="d02-01"></a>

**D02-01 — 확정 방향:** 기본 컴포넌트군 전체의 Web·Mobile 검증 후 정식 출시

<a id="d02-02"></a>

**D02-02 — 확정 방향:** Axiom 기본 세트 + provider별 검증된 선택 팩 + React Aria·Base UI·shadcn 계열을 별도 세트로 모두 제공

<a id="d02-03"></a>

**D02-03 — 확정 방향:** 문법으로 정의·편집은 허용하고 미구현 능력과 출력 가능 범위를 표시

<a id="d02-04"></a>

**D02-04 — 확정 방향:** 전체 흐름을 비공개 알파로 먼저 제공하고 공개 시점에 품질 기준 적용 + 기능은 유지하고 지원 브라우저·운영 환경의 수를 조정

전제 문서: [PRD01 · 제품 목적·대상 사용자·핵심 문제](purpose-and-users.md) · [PRD02 · 처음부터 설치까지의 사용자 시나리오](journeys-and-acceptance.md).

변경 시 함께 검토: [BIZ03 · 포지셔닝·마케팅·출시 메시지](../business/positioning-and-go-to-market.md) · [SYN01 · ADS와 토큰 표준 선정 계약](../syntax/standard-strategy.md) · [CMP01 · 컴포넌트 정의 계층과 디자인 범주](../components/definition-and-designs.md) · [UX01 · 작업 공간·온보딩·Inspector·도움말](../experience/onboarding-and-inspector.md) · [ARC01 · 시스템 문맥·도메인·핵심 흐름](../architecture/system-and-domain-boundaries.md) · [DLV01 · 타깃·스타일·동작 기반 지원표](../delivery/target-and-style-profiles.md) · [QAL04 · 제품 출시 기준과 전체 지원](../quality/release-readiness.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
