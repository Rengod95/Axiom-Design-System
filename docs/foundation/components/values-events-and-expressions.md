# CMP03 · 값·이벤트·props·UI 표현식

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 소비 앱과 컴포넌트 사이의 약속

값은 현재 무엇을 표현하는지, 이벤트는 사용자가 어떤 UI 요청을 했는지를 전달한다. Button의 onActivate는 업무 성공을 뜻하지 않는다. Select의 selectedKey는 현재 확정값이며 query는 편집 중 문자열이다. 두 값을 합치면 검색어를 입력할 때마다 선택이 바뀌는 오류가 생긴다.

PublicContract에는 values, events, variants, exposedSlots, replaceableParts, allowedOverrides와 타깃별 API name mapping을 둔다. UI에서 바꾼 이름과 공개 API 이름을 구별하고 예약어·중복·breaking change를 검사한다.

VariantAxis는 안정 ID·공개 이름·허용 option·기본값을 가진다. 상태와 달리 소비자가 선택하는 외형 API다. 내부 구현용 value/event port는 visibility=internal로 표시해 실제 public API에 노출하지 않는다.

## 타입 설계

| Type | 사용 예 | 검증 |
|---|---|---|
| boolean·string·finite number | disabled·label·progress | 값 범위·길이 |
| enum·tagged union | orientation·닫기 이유 | 모든 case 처리 |
| record | 범위 값 start/end | 필드 필수·추가 필드 정책 |
| list·nullable | 다중 선택·선택 없음 | item type·개수·null 의미 |
| opaque key | selectedKey·itemKey | 내용과 identity 분리 |
| reference | asset·token·component | 대상 kind·version |
| UI domain value | 날짜·색·단위 있는 수치 | 의미·단위·타깃 변환 |

undefined와 null, 누락과 기본값을 같은 것으로 처리하지 않는다. record TypeExpr는 `fields`의 이름→타입 목록, `required`의 필수 이름 목록, `additionalFields`의 `reject` 또는 `preserve-opaque` 정책을 명시한다. `required`는 `fields`의 부분집합이고 빈 payload도 `required: []`를 쓴다. 추가 필드 원형 보존은 그 필드를 표현식이나 실행 명령으로 읽을 권한이 아니다. 이 정책이 빠진 record를 구현자가 임의 기본값으로 해석하지 않는다.

예를 들어 activation payload의 source가 필수 enum이면 source 누락과 선언되지 않은 paymentResult는 거부한다. nullable 필드는 명시적 null을 허용할 뿐 required 목록에서 자동 제외되지 않는다. 사용자 필드 편집기는 간단한 타입부터 record/list/nullable까지 확장해 보여 준다. opaque key의 payload를 GUI 조건에서 임의 해석하지 않는다.

## 제한 UI 표현식

Expr는 literal, read(value/state/context), compare, and/or/not, if, 유한한 산술·문자열·집합 연산으로 이루어진 타입 있는 AST다. 필드 경로·연산자·인자 타입을 검사하고 평가 step/depth를 제한한다. 저장 규격에 임의 JavaScript, eval, 네트워크, 파일 접근, 시간·랜덤 side effect를 넣지 않는다.

예: disabled이면 opacity token을 선택하거나, 선택 개수가 0이면 clear 조작을 비활성화할 수 있다. 고객 등급을 조회해 할인을 계산하는 것은 소비 앱의 책임이다. 일반 값이라고 해서 비즈니스 계산까지 허용하는 것은 아니다. 텍스트 편집은 같은 AST의 다른 입력 방식이며 무제한 코드 편집기가 아니다.

## 이벤트와 타깃 API

EventDefinition은 id, payloadType, phase(intent/committed/notification), cancellable, source scope, ordering policy를 가진다. 구현의 DOM event 객체를 공통 payload로 저장하지 않는다. 필요한 pointer/keyboard 의미만 정규화하고 타깃-specific detail은 명시적 확장으로 분리한다.

React는 onValueChange 같은 callback, Swift·Kotlin은 해당 언어의 함수·binding 패턴으로 실현할 수 있다. 이름이 달라도 request와 committed의 의미는 같아야 한다. mapping과 타입 검사, nullable·union 대응을 release profile에 기록한다.

## 검증과 오류

필드 참조 오타, 숫자/문자열 암묵 변환, enum 누락, 잘못된 key, 표현식 순환, 무제한 평가, target reserved word를 진단한다. 사용자 API 변경 시 소비 코드 타입 fixture와 GUI 데이터 편집기를 함께 갱신한다. 표현식 예시는 [문서 계약](../annexes/document-contracts.md)에서 확인한다.

## 결정 추적과 변경 영향

<a id="d10-01"></a>

**D10-01 — 확정 방향:** 타입 안전한 제한 UI 표현식을 시각 편집과 내장 텍스트 편집으로 제공한다. 비즈니스 로직·임의 JS·외부 코드 역수입 허용으로 확대하지 않는다.

<a id="d10-02"></a>

**D10-02 — 확정 방향:** 공통 계약을 유지하면서 타깃에 자연스러운 API를 만들고 사용자 지정 API 이름·구조의 호환성을 검사한다.

<a id="d10-03"></a>

**D10-03 — 확정 방향:** 간단한 필드 편집부터 시작하고 record·list·nullable·opaque key를 확장 + 시각적 데이터 타입 편집기를 초기부터 제공

전제 문서: [CMP01 · 컴포넌트 정의 계층과 디자인 범주](definition-and-designs.md) · [SYN03 · DSF·토큰·테마·사용자 정책](../syntax/foundation-and-token-semantics.md).

변경 시 함께 검토: [CMP04 · 상태 소유권과 요청 수명](state-and-request-lifecycle.md) · [CMP05 · Part·slot·인스턴스·override](parts-slots-and-instances.md) · [CMP06 · 동작·입력·기반 라이브러리 계약](behavior-and-input-profiles.md) · [CMP11 · 사용자 확장·등록·승격](custom-definition-registry.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
