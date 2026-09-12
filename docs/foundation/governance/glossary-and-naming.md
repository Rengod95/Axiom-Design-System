# GOV02 · 제품·도메인 용어와 이름

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 제품 책임자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 사용자에게 보이는 이름과 내부 의미

사용자는 “디자인 시스템을 만들고 이 프로젝트에 설치한다”고 이해할 수 있어야 한다. 저장 문법, 편집 제품, 결과물의 이름을 모두 Foundation이라 부르면 무엇의 버전을 바꾸는지 알 수 없어진다.

| 용어 | 의미와 쉬운 설명 | 혼동하지 않을 것 |
|---|---|---|
| Axiom Studio | Axiom의 시각·AI 작성 제품군 | 단일 Canvas 라이브러리 |
| Design System Builder | DSF와 재사용 컴포넌트를 제작·관리하는 첫 제품 영역 | CMS와 일반 페이지 제작기 |
| Axiom Design Syntax, ADS | 토큰·컴포넌트·관계·프로젝트를 표현하는 일관된 문법 | 컴포넌트만 표현하는 트리 |
| Design Syntax Tree | ADS를 읽은 구조화 표현을 설명하는 이름 | 모든 참조가 트리라는 주장 |
| Design System Foundation, DSF | 토큰·테마·정책·의미 연결로 만든 시스템 기초 결과물 | 이 56개 제품 문서 묶음 |
| Foundation 1.0.0 | 제품·사업·문법·UX·구현 방향의 기준선 목표 버전 | ADS 파일 버전이나 UI 라이브러리 버전 |
| ComponentDefinition | 사용 목적·공개 값·이벤트·부품·의무의 공통 정의 | 특정 React 함수 |
| Design | 공통 정의를 나타내는 Web/Mobile별 외형·배치 | 논리 계약의 복제 |
| Realization | 고정한 계약을 실제 타깃 코드로 구현한 후보·검증본 | Canvas 근사 그림 |

ADS의 구조적 자식 관계는 트리지만 토큰 alias, 컴포넌트 참조, 호스트 연결은 그래프다. 따라서 제품 설명에는 문법을, 저장·검증 설계에는 “문서와 참조 그래프”를 사용한다.

## 컴포넌트 편집에서 꼭 구분할 말

| 사용자 표현 | 기술 의미 | Card 예 |
|---|---|---|
| 부위, Part | 책임을 가진 논리 부품 | surface, heading, body |
| 콘텐츠 자리, Slot | 사용자가 넣을 내용과 허용 계약 | body에 텍스트·다른 컴포넌트 |
| 종류, Variant | 제작자가 공개한 선택 가능한 외형 축 | outlined / filled |
| 상태, State | UI 동작의 현재 논리 값 | 선택 기능을 추가한 Card의 selected |
| 환경 조건, Condition | 화면·입력·플랫폼 환경의 관측값 | 좁은 폭, 큰 글자, hover 가능 |
| 테마, Theme | 토큰 값을 결정하는 문맥 | light/dark와 brand 축 |
| 역할, Role | 부품이 하는 의미상 일 | heading, action |
| 능력, Trait | 값·이벤트·의무를 묶은 재사용 계약 | 선택하기 |
| 정책, Policy | 허용 범위에서 행동을 고르는 규칙 | 선택을 내부에서 확정할지 요청할지 |

Axiom role은 HTML role 속성 문자열이 아니다. surface에 role을 붙였다는 이유만으로 role="button"을 생성하지 않는다.

## provider를 다섯 가지로 부른다

동작 기반은 React Aria·Base UI처럼 입력·접근성 구현에 쓰는 라이브러리다. 환경 공급자는 앱 루트의 테마·locale 설정이다. 내부 문맥은 Select의 trigger와 item이 공유하는 상태다. UI 호스트는 Toast queue나 overlay가 연결되는 명시적 범위다. AI 공급자는 모델 실행 서비스·로컬 도구다. 설정 이름과 오류 메시지에도 이 구분을 유지한다.

## 이름과 번역 계약

ID는 불변이고 사용자 표시 이름과 파일명은 변경 가능하다. 등록 항목은 소유 namespace와 버전으로 식별한다. 영어 API 이름은 유효한 타깃 식별자로 검사하되 화면 번역으로 바꾸지 않는다. 예를 들어 “선택됨”을 영어 UI로 바꿔도 selectedKey의 저장 의미는 유지한다.

한국어 설명에는 처음 등장할 때 영어 원어와 구체 예를 함께 둔다. 오류는 코드·대상·원인·할 수 있는 조작을 분리해 번역한다. 이름 변경 시험은 참조·번역·출력 alias가 유지되는지 확인하고, 용어 변경은 전체 검색으로 동의어의 의미 충돌을 검사한다. 주요 카피는 [언어·메시지 부록](../annexes/language-and-messages.md)이 관리한다.

## 결정 추적과 변경 영향

<a id="d01-02"></a>

**D01-02 — 확정 방향:** Axiom Studio / Design System Builder / Axiom Design Syntax(ADS) / DSF로 구분

<a id="d36-01"></a>

**D36-01 — 확정 방향:** 한국어 설명과 영어 원어를 함께 제공하고 안정적인 API/ID는 공통으로 유지한다. 영어 UI에서는 영어 기술 용어를 기본으로 설명한다.

전제 문서: [GOV01 · 문서 권위와 변경 승인](authority-and-change-control.md).

변경 시 함께 검토: [PRD02 · 처음부터 설치까지의 사용자 시나리오](../product/journeys-and-acceptance.md) · [SYN01 · ADS와 토큰 표준 선정 계약](../syntax/standard-strategy.md) · [CMP01 · 컴포넌트 정의 계층과 디자인 범주](../components/definition-and-designs.md) · [UX01 · 작업 공간·온보딩·Inspector·도움말](../experience/onboarding-and-inspector.md) · [UX08 · Studio 접근성·언어·입력 품질](../experience/editor-accessibility-and-language.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
