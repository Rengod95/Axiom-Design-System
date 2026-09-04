# Guidebook Comprehension Revision

**Status:** complete
**Date:** 2026-09-04
**Branch:** `codex/add-repository-guidebook`
**Stable learning document:** [`docs/guidebook.md`](../guidebook.md)

## 1. 한 문장 목표

처음 읽는 TypeScript 개발자가 Axiom의 package 이름을 외우기 전에 전체 입력·규칙·변환·결과를 이해하고, Token 참조와 Domain, CSS serializer, Webref pin이 실제 값에 어떤 변화를 만드는지 자신의 말로 설명할 수 있도록 Guidebook을 고친다.

## 2. 수정 전 문제

문서에는 용어 정의가 있었지만 독자가 바로 다음 행동을 재현하기에는 관계 설명이 부족했다. 특히 “참조를 따른다”, “Domain이 serializer를 결정한다”, “policy를 합쳐 registry를 만든다”처럼 주어와 동사는 있어도 다음 정보가 한곳에 모이지 않았다.

- 참조가 메모리 주소인지 문자열 ID인지
- 어떤 자료구조에서 무엇을 key로 조회하는지
- Domain이 Token ID와 resolved entry 어디에 표현되는지
- serializer가 언제 선택되고 어떤 값이 문자열로 바뀌는지
- 그 문자열이 검사에만 쓰이는지 최종 CSS로 저장되는지
- Webref의 사실과 Axiom의 허용 정책 중 어느 쪽이 무엇을 결정하는지

또한 milestone 번호와 package 목록이 독자의 질문보다 먼저 보였고, directory 표 일부는 이름을 다시 풀어 쓸 뿐 분리 이유와 데이터 방향을 설명하지 못했다. 개별 정의를 더 붙이는 방식으로는 같은 문제가 다른 문장에서 반복될 수 있었다.

## 3. 바꾼 구조와 이유

Part I의 초반을 “문제 → package 없는 전체 구조 → 하나의 Button 값 → 구현 위치” 순서로 재배치했다. 첫 시스템 지도는 다음 네 층만 사용한다.

1. 사람이 Token과 Button style 의도를 작성한다.
2. ADR·SSOT·`spec/`이 허용 규칙을 보관한다.
3. resolver와 validator가 값을 찾고 규칙을 대조한다.
4. resolved manifest, receipt, Appearance IR, collision trace가 결과와 근거를 남긴다.

각 화살표에는 들어오는 실제 값, 수행하는 조회나 변환, 나가는 실제 값을 표로 붙였다. 그 뒤에야 책임을 package와 directory에 연결했다. 저장소 지도는 “무엇이 있는가” 대신 “왜 분리했는가, 무엇을 받아 무엇을 내는가, 언제 직접 수정하는가”에 답하도록 바꿨다.

세부 제목도 milestone 번호보다 독자의 질문을 먼저 사용한다. N24는 현재 구현 범위를 증명할 때만 남기고, 개념 탐색 순서를 결정하는 장 번호로 사용하지 않는다.

## 4. 명확해진 개념

Token 참조는 `{color.semantic.fill.brand.default}`처럼 중괄호 안에 대상 Token ID를 적은 문자열이다. resolver는 모든 Token을 `Map<Token ID, Token record>`로 만든 뒤 그 ID를 key로 반복 조회한다. 실제 색 object에 도착하면 멈추고, 대상 누락과 순환은 diagnostic으로 남긴다.

Token Domain은 결제·배송 같은 business domain이 아니라 값 범주다. Token ID의 첫 segment인 `color`가 parser를 거쳐 `domain: "color"`로 보존된다. Domain registry는 허용 DTCG type과 사용할 수 있는 serializer ID를 선언할 뿐, 등록만으로 함수를 실행하지 않는다.

CSS serializer는 Recipe의 Token binding을 검증할 때 선택된다. `color` Domain의 resolved entry가 `css.color.v1`에 들어가면 현재 Button 검증에서는 `#444ce7` 문자열이 나온다. 이 문자열은 `background-color`의 `<color>` 문법과 맞는지 검사하는 데만 쓰인다. 현재 구현은 그 문자열을 CSS 파일, class name, DOM에 내보내지 않고 Appearance IR에 Token 참조를 보존한다.

Webref는 CSS property 이름과 문법 같은 웹 표준 자료를 제공한다. sparse policy는 대부분에 공통인 기본 규칙에서 달라지는 예외만 적고, Token binding catalog는 어떤 property에 어떤 Domain Token을 direct 또는 template 방식으로 연결할지 적는다. profile generator가 세 입력을 합쳐 실제 검사에 쓰는 effective registry를 만든다.

pin은 검토한 `@webref/css` version과 파일 경로를 고정하는 일이고, digest는 실제 `css.json` byte가 같은지 확인하는 SHA-256 지문이다. version이 다르면 파일을 읽기 전에 실패하고, version이 같아도 byte가 바뀌면 digest 비교에서 실패한다.

## 5. 실제 코드 경로

running example은 다음 권한과 실행 경로를 사용한다.

```text
tokens/base.tokens.json#/color/component/button/root/background/default
→ color.semantic.fill.brand.default
→ color.primitive.brand.600
→ packages/tokens/src/resolution/context-resolver.ts
→ spec/token/foundation-resolved-token-manifest.json
→ spec/css/token-binding-catalog.json#color-paint
→ packages/appearance-authoring/src/token-validation.ts
→ packages/appearance-normalizer/src/normalizer.ts
```

이 경로에서 context resolver는 Token 값을 결정하고, profile generator는 property 규칙표를 만든다. authoring validator는 두 결과를 만나게 해 호환성을 검사한다. normalizer는 통과한 Recipe를 Appearance IR로 낮추되 Token 참조를 보존한다. 각 module reference에는 이 호출 순서와 하지 않는 일을 함께 적었다.

## 6. 채택하지 않은 대안

- 용어집만 늘리지 않았다. 첫 사용 지점에서 값과 관계를 이해하지 못하면 뒤의 정의는 읽기 흐름을 복구하지 못한다.
- 모든 세부사항을 하나의 거대한 pipeline 그림에 넣지 않았다. 현재 이해해야 할 데이터 흐름과 package 의존성은 서로 다른 질문이므로 두 단계로 나눴다.
- Domain을 단순히 “영역”, serializer를 단순히 “직렬화 도구”라고 번역하지 않았다. Axiom에서의 좁은 역할과 실제 입력·출력을 함께 설명했다.
- Webref를 Axiom policy owner처럼 표현하지 않았다. 외부 표준 사실과 저장소의 허용 결정을 분리했다.
- N24를 학습 장의 주제로 사용하지 않았다. milestone은 구현 상태를 추적하는 이름이지 독자의 선행 개념이 아니다.

## 7. 검증과 읽는 방법

문서 검수는 단어 존재 여부보다 다음 질문을 통과하는지 본다.

- 영문 용어를 가려도 한국어 설명만으로 동작을 말할 수 있는가?
- 첫 그림의 각 화살표를 입력·연산·출력·실패로 다시 말할 수 있는가?
- 새 개념이 그 시점에 필요한 이유가 앞 문장에서 생겼는가?
- 현재 layer의 결과와 다음 layer의 책임을 섞지 않았는가?
- Button 값 하나를 source에서 현재 구현 경계까지 다시 추적할 수 있는가?

자동 검증은 Guidebook marker coverage, Markdown local link와 heading anchor, code fence, repository 전체 check·test·build를 포함한다. 이 기록은 실행 결과를 설명하는 journal이며, 규칙 authority를 새로 만들지 않는다.

## 8. Guidebook에 승격한 내용

Guidebook의 안정적인 학습 경로에는 package 없는 전체 시스템 지도, Token ID lookup 표, Domain registry 예제, context 합성 순서, Webref·sparse policy·binding catalog 구분, serializer 실행 순서, pin/digest 실패 예제, 책임 중심 directory/package 지도를 반영했다. 일회성 검토 사유와 대안은 이 journal에만 남겼다.

## 9. 남은 불확실성과 다음 단계

현재 문서는 N24 구현과 95개 checker 대상 경로를 기준으로 한다. N25 이후 component fixture와 N29 이후 compiler/runtime이 구현되면 “현재 마지막 출력”과 serializer의 역할이 달라질 수 있으므로, 그때 동일한 running example을 실제 새 경계까지 다시 추적해야 한다.

독자 검토에서는 용어를 아는지 묻기보다 특정 화살표를 실제 값으로 설명해 보게 해야 한다. 설명하지 못하는 지점이 나오면 그 문장만 늘리기 전에 선행 구조, 값의 표현, producer와 consumer, 현재 경계를 함께 재검토한다.
