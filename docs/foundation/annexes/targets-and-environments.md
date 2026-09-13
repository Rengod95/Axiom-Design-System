# 타깃·의존성·검증 환경 부록

초기 필수 기술은 React·React Native·Swift·Android다. Mobile은 상위 디자인 범주이고 출력 기술과 동의어가 아니다. 아래 행은 required profile family이며 실제 library/toolchain 버전을 정한 release profile은 구현 실증 후 고정한다. 현재 모두 미구현·미검증이다.

## 성립하는 조합

| profile | 범주 | 출력·스타일 | 동작 기반 | 환경·추가 검사 |
|---|---|---|---|---|
| target.web.react.css | Web | React · CSS | 동작 기반 선택 팩 또는 custom | 대표 React 소비 앱·브라우저·SSR/RSC 경계 선정 |
| target.web.react.scss | Web | React · SCSS | 검증된 Web behavior profile | Sass build·공개 변수·asset 경로 |
| target.web.react.tailwind | Web | React · Tailwind | 검증된 Web behavior profile | 정확한 major·build scan·theme 연결 |
| target.web.react.css-in-js | Web | React · CSS-in-JS | 구체 library/version 미선정 | runtime/compile-time·SSR/RSC·style injection |
| target.mobile.rn.expo | Mobile | React Native · native style | RN 대응 또는 custom | Expo toolchain·실기기/개발 client |
| target.mobile.rn.bare | Mobile | React Native · native style | RN 대응 또는 custom | bare install·provider·native module |
| target.mobile.swift | Mobile | Swift · native | SwiftUI 우선 비교·보완 profile | macOS Xcode·simulator·실기기 범위 |
| target.mobile.android | Mobile | Kotlin/Android · native | Compose 우선 비교·보완 profile | Android toolchain·emulator·실기기 범위 |

Axiom 기본 세트와 React Aria·Base UI·shadcn 계열의 선택 팩을 제공하되 Web 기반을 native runtime이라고 표시하지 않는다. shadcn은 소스·템플릿 전달 관점도 있으므로 style/behavior/dependency를 pack manifest에서 따로 고정한다. Mantine 등의 전체 목록은 coverage의 원본으로 보존하고 필요한 native 대응을 별도 구현한다.

## 환경 행의 최소 필드

environmentId, OS/version, hardware, browser/runtime/version, compiler/SDK, package manager, dependency lock, input device, language/IME, text scale, direction, color/viewport 조건, assistive technology/version, network mode, tester/runner, source digest를 기록한다.

Studio는 macOS·Windows Chromium의 한글·영어·keyboard/AT 흐름을 시험한다. Web output은 선택한 browser/AT 조합, RN/Swift는 iOS VoiceOver 등 실제 타깃 환경, Android는 TalkBack 등 실제 환경을 고정한다. 추가 Safari·실기기 조합은 대표 AT 환경 선택에서 scope를 명시한다. OS 이름 하나로 모든 버전을 보장하지 않는다.

## 공통 목적의 플랫폼별 시험

| 목적 | Web 관찰 | Mobile 관찰 |
|---|---|---|
| activation | keyboard/pointer/assistive event·focus | touch/assistive·필요 keyboard·native semantics |
| 선택·목록 | active vs selected·key·label·탐색 | native 탐색·읽기·값 요청/확정 |
| overlay | stacking·focus entry/return·배경 | platform 표현·modal·focus/읽기 |
| Toast | host queue·공지·exit cleanup | 실제 공지·touch 탐색·lifecycle |
| layout/text | CSS 계산·IME·줄바꿈·RTL | density·font scaling·native text/IME |
| motion | enter/exit·중단·reduced | native 전환·제거·감소 설정 |
| 자산 | URL/path·font 로딩·권리 | bundle resource·embedding·권리 |

공통 semantics를 검사하고 타깃별 동등한 관찰과 허용오차를 profile에 둔다. renderer가 그럴듯하게 보인다는 이유로 같은 focus·announcement를 가졌다고 판단하지 않는다. 해당 profile의 native tool이 없는 환경에서는 blocked/notRun이고 pass가 아니다.

## 토큰 표준 전체 지원의 비교 목록

DTCG 비교 판본은 2025.10 Format·Resolver·Color다. type 목록에는 color, dimension, fontFamily, fontWeight, duration, cubicBezier, number와 strokeStyle, border, transition, shadow, gradient, typography가 포함된다. 정확한 각 필드·오류 의미는 고정한 공식 판본을 따른다. [Format](https://www.designtokens.org/TR/2025.10/format/)

원본 metadata·확장·group/type 상속·alias/부분 참조·순환/누락/잘못된 type, resolver set/modifier/context/default/order, 선언 색 공간·alpha·색 변환을 각 fixture로 다룬다. [Resolver](https://www.designtokens.org/TR/2025.10/resolver/), [Color](https://www.designtokens.org/TR/2025.10/color/)

모든 기능은 read/preserve/interpret/edit/preview/output/runtime 칸을 따로 가진다. 각 토큰은 적용 속성과 대표 컴포넌트 사용처가 필요하다. 예를 들어 gradient는 실제 채움, typography는 텍스트 배치, transition은 timing 연결을 검사한다. 편집 못 하는 기능을 raw JSON 보존으로 전체 지원이라고 합산하지 않는다.

자체 의미 C를 선택하려면 같은 목록 이상의 기능과 더 적은 전체 비용을 증명한다. 증명하지 못하면 DTCG 전체가 기준이다. [선정 기록 SEL01](selection-register.md)에 채택 결과를 남긴다.

## 타깃 지원 데이터와 판정

[기계 판독 profile 목록](target-matrix.json)과 [카탈로그](component-catalog.json)의 모든 provider variant를 연결한다. 전체 타입·카탈로그를 지원한다고 발표하려면 해당 연결의 필수 test plan·실제 evidence가 있어야 한다. native utility 대응도 목적·의무를 명시하고, 단순 N/A로 전체 범위를 줄이지 않는다.

설치·dependency·style·toolchain version이 바뀌면 release profile 전체 검사를 재실행한다. 정식 pass 기준은 필수 요구이며 권장 결과도 함께 공개한다.
