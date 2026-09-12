# Button·Card·Toast로 읽는 전체 설계

이 문서는 먼저 제품을 사용해 보고 그 결과가 어떤 계약으로 남는지 설명한다. 예시 수치·이름·문법은 검토용이며 출시된 API가 아니다. [검토 JSON](examples/review-project.json), [일곱 정의 관점](../components/definition-and-designs.md), [필드 표](document-contracts.md)를 함께 볼 수 있다.

## 먼저 공통 작업대를 생각한다

왼쪽에 토큰과 컴포넌트 목록, 가운데에 실제 디자인, 오른쪽에 선택한 부위의 속성이 있다. 사용자는 기본 DS의 surface·content·gap token을 바꾸고 Button·Card·Toast가 어떻게 달라지는지 본다. 토큰은 한 DSF를 공유하지만 각 컴포넌트의 목적과 구조는 다르다.

Web 디자인과 Mobile 디자인은 같은 component ID를 가리킨다. 그 ID에 담긴 값·이벤트·의무를 함께 쓰면서 layout과 appearance는 다르게 설정할 수 있다. 실제 React·RN·Swift·Android 코드는 이 계약을 지키는 각각의 결과물이다.

~~~mermaid
flowchart TB
  F[공통 DSF · 브랜드 참조] --> B[Button: 명령]
  F --> C[Card: 콘텐츠 표면]
  F --> T[Toast: 일시 공지]
  B --> BW[Web 디자인]
  B --> BM[Mobile 디자인]
  C --> CW[Web 디자인]
  C --> CM[Mobile 디자인]
  T --> TW[Web 디자인]
  T --> TM[Mobile 디자인]
  BW --> R[고정 계약 · 타깃 구현 · 독립 검증]
  BM --> R
  CW --> R
  CM --> R
  TW --> R
  TM --> R
~~~

## 1. Button — 누르면 요청이 한 번 발생한다

### 사용자가 만드는 것

기본 Button을 선택해 label을 “실행”으로 바꾸고 filled/outlined variant를 만든다. icon 부위를 추가하고 Mobile 디자인의 여백을 조정한다. “눌렸을 때”를 선택해 약한 scale·opacity 전환을 지정한다. 접근성 이름은 label과 연결되어 있다.

여기까지는 어떤 업무를 실행하는지 정하지 않았다. 소비 앱은 onActivate를 받아 자기 작업을 수행한다. Axiom Button에 주문 성공, 결제 승인, 재고 판단을 넣지 않는다.

### 뒤에 남는 계약

| 관점 | Button의 정의 |
|---|---|
| 목적 | 한 번의 사용자 UI 활성화를 요청 |
| archetype/family | command |
| trait | activation·naming·availability, 필요한 경우 motion |
| Part | surface/control, label, 선택 decoration |
| 공개 값 | disabled 등 허용된 UI 값 |
| 내부 관측 | pressed·focus-visible·hover, 플랫폼 입력 profile |
| 이벤트 | activate, 한 유효 조작에 한 번 |
| 접근성 | 조작 목적을 알 수 있는 이름·입력 대안·상태 |
| 디자인 | filled/outlined와 Web/Mobile의 크기·배치 |
| 검증 | pointer/keyboard/보조 입력의 중복·취소·이름·focus |

이름, 사용 가능 상태와 activate event를 각 trait의 port에 binding한다. 이는 “activation이 어디에 연결되는가”를 분명히 하는 작업이다. 라이브러리 A의 Button과 B의 Button이 독립적으로 동작하면 trait 버전을 각각 고정할 수 있다.

### 검사되는 사례

| 입력 상황 | 기대 관찰 |
|---|---|
| 정상 pointer 조작 완료 | activate 1회 |
| 눌렀다가 취소 | activate 0회 |
| keyboard activation 뒤 synthetic click | 같은 사용자 의도가 중복 emit되지 않음 |
| disabled 값 전달 | 선택 profile의 입력·focus 규칙 준수 |
| label을 icon으로 교체 | 조작 이름은 유지 |
| Web에서 통과, native는 미실행 | Web 범위 증거만 표시 |

브라우저에서 React Aria나 Base UI를 사용하더라도 Axiom은 같은 의무를 독립 검사한다. SwiftUI·Compose의 자연스러운 입력 API를 사용하면 코드 모양이 달라져도 activate 의미를 지켜야 한다.

## 2. Card — 먼저 내용의 표면으로 시작한다

### 사용자가 만드는 것

빈 Card에서 header, body, actions 부위를 만들고 body를 필수 콘텐츠 자리로 공개한다. 다른 사용자는 그 slot에 텍스트나 허용된 컴포넌트를 넣는다. 제작자는 outlined variant를 추가하고 Web은 정보가 가로로, Mobile은 세로로 배치되도록 만든다.

이 Card는 아직 클릭·선택·로딩·성공 상태를 갖지 않는다. 많은 제품 화면에서 카드처럼 생긴 영역이 선택되지만 그 사실을 모든 Card에 강제하지 않는다.

### 뒤에 남는 계약

| 관점 | plain Card | 선택 기능을 추가한 Card |
|---|---|---|
| 공통 목적 | 관련 내용을 묶어 표현 | 관련 내용의 선택 가능한 표현 |
| trait | content·layout | 기존＋selection·필요한 naming/input |
| 공개 값 | 내용·노출된 외형 선택 | selected/selectedKey와 owner 추가 |
| 이벤트 | 필수 action 없음 | selectionRequest |
| Part/Slot | header/body/actions, 허용 콘텐츠 | 조작 대상·선택 의미 관계 추가 |
| 접근성 | 읽기 순서·정보/장식·중첩 구조 | 선택 상태·키보드·조작 이름 추가 |
| motion | 필요할 때 선택 | selected 전환 등 명시적 연결 |

사용자가 “선택할 수 있음”을 추가하면 Inspector가 단일/다중, 내부 관리/외부 제어, 어떤 부위가 조작 대상인지 질문한다. 이것은 비즈니스 조건에서 특성을 추론하는 과정이 아니라 UI 목적을 분명히 하는 과정이다.

### Part와 Slot을 눈으로 구별한다

body Part는 내용이 놓이는 논리 부위다. body Slot은 사용자가 무엇을 넣을 수 있는지에 대한 계약이다. Web에 div 두 개를 만들거나 native view 하나로 표현해도 body Part ID는 유지된다.

actions라는 영역 안에 독립 Button을 넣었다고 Card 전체가 Button이 되는 것은 아니다. 전체 Card를 버튼처럼 실현하고 내부에도 별도 버튼이 있으면 중첩 조작·읽기 문제를 진단하고 독립 action 또는 적절한 구조를 제안한다. 예시 JSON의 actions 영역은 콘텐츠 컨테이너이며 실제 action은 주입된 컴포넌트가 맡는다.

### 값이 어디에서 왔는가

outlined×surface×selected 조합 규칙을 새로 만들면 base→variant/state 조합→허용 instance override의 결과와 출처를 표시한다. 같은 우선순위의 충돌 규칙은 작성 순서로 숨기지 않고 비교한다. dark theme는 token 값을 바꾸며 selected state를 대신하지 않는다.

Instance에서 gap을 바꾸면 override로 표시되고 reset 또는 공통 variant 승격을 선택한다. 공통으로 승격하면 다른 Card와 Mobile 디자인의 영향도 검토한다.

### 검사되는 사례

필수 body 누락, slot 종류·개수 위반, plain Card의 불필요 tab stop, 읽기 순서, 긴 한글·영문 콘텐츠, font fallback, selected owner 중복, 원본 Part 삭제와 instance override 충돌, nested interactive 구조를 시험한다. “카드처럼 보임”만으로 같은 검사 묶음을 통과시키지 않는다.

## 3. Toast — 수명·공지·호스트가 함께 동작한다

### 사용자가 만드는 것

Toast 템플릿을 선택해 content와 close 부위를 바꾸고 enter/exit 모션을 시연한다. 연결된 notification host와 queue를 볼 수 있다. “자동 닫기”는 선택 기능이며 기본 예시는 비활성이다. 사용자는 시간을 설정할 수 있지만 Axiom이 업무상 8초를 강제하지 않는다.

표시할 메시지와 open 값은 소비 앱이 전달할 수 있다. Toast는 업무 완료를 판단하지 않고 표시·공지·닫기 요청이라는 일반 UI 의무를 수행한다.

### 함께 움직이지만 서로 다른 값

| 개념 | owner | 뜻 |
|---|---|---|
| open | 소비 앱 또는 명시한 local owner | 표시를 원하는 현재 확정값 |
| closeRequest | Toast가 emit | 사용자가 닫고 싶다는 요청 |
| presence | runtime | mounting/presenting/exiting/removed |
| animation progress | motion runtime | 시각 전환 진행 |
| queue/order | notification host | 여러 Toast의 표시·공지 순서 |
| timeout | opt-in UI policy | 시간 경과의 닫기 요청 |

Controlled mode에서 닫기 버튼을 눌렀다고 즉시 외부 open을 false로 덮어쓰지 않는다. preview의 외부 응답을 “거절/지연”으로 바꾸면 요청과 확정값의 차이를 볼 수 있다.

### 전이와 중단을 구체화한다

| 출발 | 조건/입력 | 논리 결과 | 시각·정리 결과 |
|---|---|---|---|
| mounting | 표시 준비 완료, open=true | presenting | enter 시작 |
| mounting | 외부 open=false | removed | 공지 생략·등록 정리 |
| presenting | closeRequest만 발생 | owner 응답 대기 | 기존 표시, 중복 요청 정책 적용 |
| presenting | open=false 확정 | exiting | 조작·focus 정책 적용, exit 요청 |
| exiting | exit 완료 또는 cleanup deadline | removed | node·timer·host 등록 정리 1회 |
| exiting | open=true가 새로 확정 | profile의 재표시 정책 | 기본 예시는 현재 instance 종료 후 새 generation |
| 임의 단계 | host/instance 해제 | terminal 정리 | 늦은 callback 무시 |
| removed | 같은 ID의 늦은 callback | 변화 없음 | 새 generation에 영향 없음 |

기본 motion은 현재 전환 후 다음 전환을 실행한다. 하지만 논리 open·focus·정리까지 animation queue에 무작정 종속시키지 않는다. exit callback이 누락되면 profile의 제한된 cleanup 정책이 필요하다.

### 호스트와 접근성

가장 가까운 호환 명시적 host를 기본 제안하고 사용자는 다른 host를 지정할 수 있다. 호스트가 없거나 모호하면 경로·생성·선택을 안내한다. queue·공지 channel을 서로 다른 컴포넌트가 중복 소유하지 않는다.

공지는 메시지 목적·중요도에 맞는 profile을 사용하고 같은 내용의 렌더 반복으로 중복 공지하지 않는다. 공지·시간·읽기·focus의 실제 품질은 platform AT로 확인한다. timeout을 켜면 pause/resume·읽을 수 있는 시간·다른 접근 경로의 검토가 필요하다. 자동 timer 하나로 접근성 완료를 주장하지 않는다.

### 검사되는 사례

연속 닫기, enter 중 close, exit 중 재표시, host 해제, stale generation callback, timeout pause, reduced motion, 연결 누락, 여러 Toast 공지 순서, 실제 native 공지·조작을 시험한다. browser simulation과 native 결과를 별도 표시한다.

## 4. 더 복잡한 컴포넌트에서도 모델이 버티는가

Select는 query/activeKey/selectedKey를 분리한다. Arrow 탐색은 activeKey이고 Enter 선택은 selectedKey 변경 요청이다. 다른 기반의 trigger와 list를 섞으려면 공통 context·port 호환성이 필요하다. 독립 Card slot 안에 다른 라이브러리 Select를 넣는 것과 다르다.

Dialog는 open·overlay/focus host·trigger·title·content·dismiss를 연결한다. 배경 격리와 focus 복귀를 바꾸는 것은 단순 opacity 수정과 다른 중요 계약 변경이다. 전문가가 의무를 제거하면 독립 유형으로 분기한다.

Calendar·Chart·Rich editor도 family 하나를 붙여 끝나지 않는다. date-only/timezone, 숫자 단위/대체 자료, IME/document history 같은 domain profile의 추가 의무를 갖는다. 소비 앱의 일정 업무·데이터 계산은 공통 UI 계약에 들어가지 않는다.

## 5. 정의가 실제 코드와 사용자 수정본으로 이어진다

세 컴포넌트의 snapshot과 target profile을 고정해 구현 후보를 만든다. 검증된 template·기계 변환을 재사용하고 AI는 필요한 차이를 구현한다. 독립 test plan을 바꾸지 못하며 실패하면 마지막 검증본을 유지한다.

출력은 소스 폴더·앱 복사·사용자 npm·Git UI 라이브러리로 전달한다. doctor는 실제 토큰·provider·alias·dependency를 검사한다. 사용자가 코드를 바꾼 뒤 새 출력이 생기면 baseline/current/new를 비교해 보존·선택 적용·rollback한다. 이는 외부 코드를 GUI 문법으로 역수입하는 기능과 별개다.

## 검토 시 확인할 핵심

목적에 없는 상태가 추가되지 않는지, 새 능력을 추가할 때 의무가 자연스럽게 따라오는지, 공통 계약을 지키며 플랫폼 외형을 달리할 수 있는지, 시뮬레이션·실제 구현·검증본을 구별하는지 확인하면 된다. 자세한 문법 표기나 기술 버전은 같은 원칙을 보존하는지 기준으로 검토한다.
