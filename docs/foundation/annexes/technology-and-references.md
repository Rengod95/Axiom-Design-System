# 기술 레퍼런스와 Axiom에 적용할 부분

확인일: 2026-09-12. 아래는 공식 문서·공개 소스의 구조 설명과 Axiom 설계자의 판단을 구분한 기록이다. 실제 Axiom prototype 성능이나 상용 제품 내부 전체 구현을 검증한 결과가 아니다. 과거 연구 실험은 새 profile에서 재검증한다.

## Builder.io — 등록 계약과 preview bridge

공식 기술 문서는 blocks에 component 이름·options를 저장하고 SDK가 렌더링하며, 편집기는 앱을 iframe에 열어 JSON과 patch를 교환한다고 설명한다. 등록된 input metadata를 사용하는 방식도 공개한다. [공식 구조](https://www.builder.io/c/docs/how-builder-works-technical)

Axiom에는 typed metadata→Inspector, document revision→preview patch, component/Part identity→geometry bridge를 참고한다. 그대로 구현할 대상은 사용자의 임의 앱 import가 아니라 Axiom이 관리하는 계약과 후보 preview다. message schema·origin·revision을 확인하고 편집용 내부 기능과 소비 코드 runtime을 구분한다. 이 적용 방식은 Axiom의 설계 판단이다.

## UXPin Merge — 실제 코드의 사용감

UXPin은 브라우저 렌더링 기반 설계와 코드 component를 분석·번들해 library에서 사용하는 경로를 설명한다. 이는 실제 구현을 디자인 공간에서 다루는 근거다. 문서의 webpack 등 구체 통합 정보는 게시 시점의 맥락을 가지며 최신 권장 버전으로 자동 채택하지 않는다. [Merge 기술 설명](https://www.uxpin.com/docs/merge/what-is-uxpin-merge/)

Axiom은 “실제 구현을 시연하고 props·slot·행동을 확인한다”는 목적을 참고한다. 계약 제작과 source export가 초기 중심이며 임의 외부 React의 완전 왕복은 제외한다. 공통 의미와 타깃별 code realization이 같은 것인지 검증해야 한다.

## Plasmic — props·slot·state metadata와 코드 구성

공식 API는 code component 등록, prop control, slot 및 노출 상태를 설명한다. 커스텀 React component와 기존 라이브러리를 사용할 수 있는 통로도 제공한다. [등록 API](https://docs.plasmic.app/learn/code-components-ref/), [code components](https://docs.plasmic.app/learn/code-components/)

Axiom에서는 타입과 설명으로 Inspector를 만들고, slot 내용 계약과 state owner를 명시하는 방식을 참고한다. Plasmic 전체를 CMS라고만 규정하지 않는다. 복잡한 외부 code component를 등록할 수 있음과 내부 부위를 모두 의미적으로 수정할 수 있음은 별도 능력이다.

공개 react-web package는 React Aria 관련 의존성을 확인할 소스다. 이 경로는 접근성 기반 재사용의 참고이며 Axiom 카탈로그 전부가 자동으로 해결된다는 증거는 아니다. [공개 package](https://github.com/plasmicapp/plasmic/blob/master/packages/react-web/package.json). 소스 편입 전 파일별 라이선스와 commit을 다시 고정한다. 이번 문서에서는 상용/공개 editor 코드를 복사하지 않았다.

## pen.dev — 문서와 Agent, slot UX

pen.dev는 design-as-code를 설명하며 slot 안에 콘텐츠를 넣고 추천 컴포넌트를 표시하는 흐름을 문서화한다. 추천은 강제 제한과 다르다. [Design as Code](https://docs.pen.dev/core-concepts/design-as-code), [Slots](https://docs.pen.dev/core-concepts/slots)

Axiom은 slot의 가시 표시·drag 대상·추천과 강제 계약을 나눠 사용한다. AI도 같은 metadata로 적절한 내용을 제안할 수 있다. pen.dev의 모든 렌더러 내부 기술이나 모든 platform 코드 출력 품질을 이 문서로 확인한 것은 아니다. 소개 문구만으로 내부 엔진을 추정하지 않는다.

## Figma·Framer·Webflow에서 참고할 경계

Figma의 2015년 글은 C++/Emscripten과 자체 WebGL 렌더러·텍스트 엔진을 설명하고, 2017년 글은 WebAssembly 도입을 설명한다. 역사적 기술 선택의 근거이며 현재 전체 스택을 동결한 목록은 아니다. [초기 렌더 구조](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/), [WebAssembly](https://www.figma.com/blog/webassembly-cut-figmas-load-time-by-3x/)

Framer와 Webflow의 공식 code component 문서는 React component를 제품에 연결하는 경로의 참고다. 게시 결과가 React라고 해서 editor canvas 전체가 동일 기술이라고 추론하지 않는다. [Framer](https://www.framer.com/developers/components-introduction), [Webflow](https://developers.webflow.com/code-components/introduction)

Axiom은 전문 drawing renderer 전체를 재구축하는 투자보다 실제 UI semantics·편집 UX·전달 계약을 우선한다. Figma 수준의 자체 렌더러를 1인 개발의 시작 전제로 삼지 않는 것은 이 제품 범위에 따른 판단이다.

## 기반 기술 비교 — 무엇을 맡길 것인가

| 후보 | 제공/검토할 역할 | Axiom에서 남는 개발 | 1인 개발 판단 |
|---|---|---|---|
| React/DOM + SVG overlay | 실제 Web text/style/interaction과 조작 가이드 | geometry·zoom·hit test·Part bridge·virtualization | 우선 검증 |
| Yoga | Flexbox 중심 box size/position | draw·text shaping·selection·전체 CSS·semantic 계약 | 필요 영역만 채택 후보 |
| [Konva](https://konvajs.org/docs/overview.html)/[Fabric](https://fabricjs.com/docs/) | 도형·변형·Canvas 기반 조작 후보 | 실제 UI·text/IME·a11y·ADS 연결 | DOM 경로 결함에 한해 비교 |
| [CanvasKit/Skia](https://skia.org/docs/user/modules/canvaskit/) | 독립 렌더 제어 후보 | text editing·a11y·runtime 일치·WASM 운영 | 고비용 재검토 후보 |
| [tldraw](https://tldraw.dev/sdk-features/license-key) | workspace/shape 편집 SDK 후보 | 내부 component·auto layout·계약·라이선스 적합성 | 최후순위 유지 |
| [PixiJS Layout](https://layout.pixijs.io/) | GPU scene rendering 후보 | 편집 도구·text·a11y·layout·계약 | 최후순위 유지 |
| [Tiptap](https://tiptap.dev/docs/editor/getting-started/overview)·[Lexical](https://lexical.dev/) | 구조화 text 편집 후보 | 허용 schema·IME·Undo/command 연결 | 실제 입력 시험 후 선택 |
| JSON Schema/Ajv | 형태·타입 validation 후보 | 참조·owner·trait·의무·capability 의미 검사 | 정적/동적 schema 경계 시험 |
| [Yjs](https://github.com/yjs/yjs)/[Automerge](https://automerge.org/) | 문서 동기화·merge 후보 | 의미 유효성·권한·approval·개인 Undo 정책 | storage port 뒤에서 비교 |
| Motion·native animation | 전환 실행 후보 | ADS motion mapping·cleanup·reduced·타깃 의무 | target별 선택 |

Yoga 공식 설명은 drawing이 아닌 box 배치와 CSS의 주로 Flexbox subset이라고 명시한다. 따라서 이를 채택해도 Canvas 전체가 완성되지는 않는다. [Yoga](https://www.yogalayout.dev/docs/about-yoga)

Ajv는 schema compile 재사용과 standalone validation 경로를 설명한다. Axiom은 이를 형식 검사 후보로 쓰고 semantic graph 검사를 별도로 둔다. [Ajv](https://ajv.js.org/guide/managing-schemas.html). Yjs는 공유 데이터 타입을 제공하지만 Axiom의 의미 충돌 판정은 별도다. [Yjs](https://github.com/yjs/yjs)

## 비교 workload와 실패 문턱

모든 후보는 같은 Button·Card·Toast와 Select/Dialog의 내부 선택, auto layout, popup geometry, IME·cursor·Undo, motion 중단, theme/token 변경, 대량 문서, keyboard 대체를 수행한다. 필요한 추가 코드·우회 지점·메모리·latency·license·업그레이드 난도를 기록한다. 성공한 demo 하나가 full component editor를 증명하지 않는다.

정확한 라이브러리·버전·라이선스와 주입할 adapter를 [선정 기록](selection-register.md)에 고정한다. 무거운 engine이 필요하면 해당 workload 실패 근거로 범위를 좁혀 평가한다. 사용자가 요구한 편집 기능 자체를 엔진 제약 때문에 조용히 빼지 않는다.
