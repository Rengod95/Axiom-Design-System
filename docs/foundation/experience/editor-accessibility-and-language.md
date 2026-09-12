# UX08 · Studio 접근성·언어·입력 품질

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: UX/UI 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## Studio를 조작하는 사람도 접근성을 필요로 한다

Axiom은 접근성 있는 컴포넌트를 만들 뿐 아니라 편집기 자체도 키보드·screen reader·한글 IME로 핵심 전체 흐름을 완료할 수 있어야 한다. Canvas의 작은 handle을 드래그할 수 있다는 것만으로 편집 접근성이 성립하지 않는다.

웹 에디터의 접근성 목표안은 관련 WCAG 2.2 AA 요구이며 실제 핵심 작업별 검증을 수행한다. Canvas 조작의 대체 경로와 보조 기술을 함께 시험한다. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## 조작 계약

선택·내부 진입·이동·크기·순서 변경·속성 수정·실행·검토·Undo·오류 복구·export를 키보드로 수행할 수 있게 한다. 레이어 트리는 Canvas와 같은 selected ID를 공유하고 focus를 잃지 않는다. 다중 선택 상태와 현재 모드, 변경 결과는 필요한 수준으로 공지한다.

패널·dialog를 열면 예측 가능한 focus 위치와 복귀를 제공한다. drag 대체 명령과 정밀 수치 입력을 둔다. 색만으로 오류·원본/override·지원 상태를 구별하지 않는다. 확대·좁은 화면에서는 패널이 가려져 필수 적용 버튼을 잃지 않아야 한다.

## 언어·입력

한국어·영어 UI는 첫 출시 필수다. API/ID는 공통으로 유지하고 설명·검증 메시지·도움말·온보딩은 번역한다. 표시 문자열을 condition key로 저장하지 않는다. 오류 code와 parameters로 메시지를 렌더링하고 사용자가 작성한 콘텐츠를 자동 번역하지 않는다.

IME composition 중 Canvas 단축키·Enter 적용이 실행되지 않도록 입력 context를 우선한다. 조합 완료 전 validation은 방해하지 않는 임시 상태로 다루고 최종 commit 이후 정확한 오류를 표시한다. RTL·다른 언어 확대는 구조적으로 가능하게 하되 초기 검증 언어를 과장하지 않는다.

## 검증 환경과 기록

macOS/Windows Chromium 초기 환경을 기준으로 실제 한글 IME와 keyboard, 가능한 해당 환경의 screen reader를 시험한다. VoiceOver의 주된 Safari 검증이 필요하면 Studio 보장 브라우저와 출력 component의 AT 검증 환경을 구분해 기록한다. NVDA·VoiceOver·TalkBack 이름만 나열해 통과로 처리하지 않는다.

시험은 J01~J08 중 사용 가능한 전체 경로의 focus trace, 조작 성공, 읽기 결과, 도움 필요 여부를 기록한다. 기능/패널 추가는 번역 누락·tab order·공지 중복·key conflict·IME regression을 확인한다. [언어·메시지 부록](../annexes/language-and-messages.md)이 핵심 카피와 번역 규칙을 관리한다.

## 결정 추적과 변경 영향

<a id="d36-02"></a>

**D36-02 — 확정 방향:** 주요 전체 흐름의 키보드·screen reader·실제 한글 IME 검증

전제 문서: [GOV02 · 제품·도메인 용어와 이름](../governance/glossary-and-naming.md) · [UX01 · 작업 공간·온보딩·Inspector·도움말](onboarding-and-inspector.md) · [UX02 · Canvas 선택·좌표·직접 조작](canvas-and-direct-manipulation.md) · [UX04 · 텍스트·폰트·벡터·이미지 편집](text-and-asset-editing.md) · [UX06 · 컴포넌트·동작·접근성·모션 편집 UX](component-editing-panels.md).

변경 시 함께 검토: [QAL04 · 제품 출시 기준과 전체 지원](../quality/release-readiness.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
