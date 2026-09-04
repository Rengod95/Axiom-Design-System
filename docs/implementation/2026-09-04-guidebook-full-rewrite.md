# Guidebook Full Rewrite

**Status:** complete  
**Date:** 2026-09-04  
**Branch:** `codex/add-repository-guidebook`  
**Stable guide:** `docs/guidebook.md`

## 1. 목표

기존 Guidebook의 문장과 전개를 재사용하지 않고, 현재 N24 source와 authority에서 독자 여정을
다시 도출한다. 기본 TypeScript를 아는 기여자가 package 목록을 외우기 전에 Axiom의 전체
경계와 Button 값 하나의 변화를 이해하는 것이 완료 기준이다.

## 2. 재작성 전 문제

이전 문서는 95개 module coverage와 용어 정의를 갖췄지만, 독자가 먼저 가져야 할 관계를
용어 자체보다 충분히 앞에 배치하지 못했다. 특히 다음 질문이 하나의 실행 순서로 고정되어야
했다.

- Token reference 문자열에서 어떤 ID를 꺼내 어떤 `Map`을 조회하는가?
- Domain, DTCG type, tier는 어느 record에 있고 서로 무엇을 결정하는가?
- Domain registry의 serializer ID와 실제 실행 함수는 언제 연결되는가?
- serializer 출력은 CSS emission인가, grammar validation용 임시 값인가?
- Webref, sparse policy, binding catalog는 한 effective property row에 각각 무엇을 보태는가?
- Component Token Foundation 경로와 N24 Button fixture의 direct Semantic Token 사용은 어떻게
  동시에 사실인가?

국소 문장만 늘리면 같은 선행 관계가 다음 개념에서 다시 끊어진다. 따라서 문서 전체를
새로 작성했다.

## 3. 새 독자 경로

Guidebook은 다음 순서로 재구성했다.

1. 현재 Axiom이 UI가 아니라 검증된 Foundation artifact를 만든다는 경계
2. package 이름을 제거한 두 입력 흐름과 각 화살표의 input/operation/output/failure
3. Component → Semantic → Primitive Token과 N24 Semantic Token 소비를 구분한 Button 사례
4. parser/adapter/normalizer/resolver와 Domain/serializer/property policy의 실제 연결
5. 현재 Appearance IR까지의 결과와 N29 CSS emission의 planned 경계
6. 그 뒤에만 10개 package와 95개 module reference

Part II는 edit source와 generated artifact를 구분하고, Part III는 Part I에서 이미 본
Button 값으로 architecture 명사를 다시 설명한다. Part IV는 lookup reference로만 둔다.

## 4. 실제 값 경로

Foundation view:

`color.component.button.root.background.default`
→ `color.semantic.fill.brand.default`
→ `color.primitive.brand.600`
→ light/dark `resolvedValue.hex: "#444ce7"`

N24 consumer view:

`fixtures/button/appearance.ts#/variants/tone/brand/root/backgroundColor`
→ direct `color` Domain binding
→ `css.color.v1`의 context별 grammar-validation string
→ frozen Token binding receipt
→ canonical `background-color`와 preserved Token reference를 가진 Appearance IR

두 view는 같은 resolved authority를 사용하지만 fixture가 Component Token을 직접 소비한다고
표현하지 않았다.

## 5. 채택하지 않은 방식

- 기존 Guidebook을 부분 수정하지 않았다. 사용자가 전면 폐기를 요청했고 문제도 구조적이었다.
- 첫 흐름에 10개 package를 넣지 않았다. 책임 이름보다 값 이동을 먼저 이해하게 했다.
- serializer를 하나의 일반 정의로 합치지 않았다. manifest JSON serializer, CSS validation
  serializer port, Appearance IR serializer의 입출력과 시점을 분리했다.
- final CSS 예시를 만들지 않았다. N24 current boundary를 넘어 N29 planned behavior를
  발명하게 되기 때문이다.
- module reference를 없애지 않았다. 학습 경로와 분리해 유지보수 lookup과 95-marker
  repository contract를 보존했다.

## 6. 검증 방법

자동 검증은 다음을 사용한다.

- `pnpm guidebook:check`: module marker missing/stale/duplicate
- `pnpm check`: source standard, boundary, guidebook, TypeScript, Token/CSS/spec/contract drift
- `pnpm test`: positive/negative and unit/conformance evidence
- `pnpm build`: workspace build
- Markdown relative-link 검사와 unfinished text 검색
- `git diff --check`와 changed-path scope 검사

검증 결과:

- Guidebook coverage: 95/95 module markers
- repository check: pass
- test: 35 files, 348 tests pass
- build: pass
- Token artifacts: 635 Tokens, 2 contexts, current
- CSS profile: 818 properties, current
- specification: 37 schemas, 14 registries, 44 positive fixtures, 87 negative fixtures
- relative Markdown links, unfinished text scan, `git diff --check`: pass

## 7. 남은 불확실성

Guidebook은 이 branch의 N24 baseline을 설명한다. N25–N28 conformance와 reconciliation,
N29 Web compiler가 merge되면 current boundary, fixture coverage, serializer의 downstream
소비 설명을 다시 확인해야 한다.

이번 범위에서 current code, ADR/SSOT, machine-readable contract 사이의 미해결 충돌은
발견하지 않았다. reader assumption은 기본 TypeScript syntax에는 익숙하지만 Token/compiler
architecture는 처음일 수 있고, 전체 지도 뒤 실제 값 하나를 따라갈 때 이해하기 쉽다는
문서 요구로만 유지했다.
