# CMP08 · 접근성 의미·관계·준수 계약

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 접근성은 디자인에 붙이는 마지막 체크가 아니다

접근성 계약은 무엇인지, 현재 상태가 무엇인지, 어떻게 조작하고 읽을 수 있는지를 정의한다. 일반 Inspector의 label·description·focus 설정과 전용 관계 패널은 같은 계약을 편집한다. 자동 생성된 ARIA 속성의 개수는 품질 지표가 아니다.

Web의 기준 후보는 WCAG 2.2 AA 관련 요구와 해당 컴포넌트에 적용되는 APG 패턴이다. APG는 구현 지침이며 WCAG 적합성 전체와 동일하지 않다. Native는 플랫폼 의미와 보조 기술의 별도 요구를 가진다. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [APG 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/)

## 계약 필드와 관계

AccessibilityContract는 semantic purpose, name/description sources, value/state exposure, relationships, reading order, focus entry/navigation/return, keyboard/gesture alternatives, announcement, contrast/motion requirements를 가진다. 각 의무는 requirementId, scope, appliesWhen, severity, oracleRef로 연결한다.

| 관계 | 예 | 검사 |
|---|---|---|
| namedBy | Button label·Dialog title | 실제 접근 가능한 이름 존재 |
| describedBy | input 도움말·오류 | 올바른 대상·중복/숨김 처리 |
| controls | trigger→panel | 실제 상태·대상 일치 |
| owns/contains 논리 관계 | list→item | DOM/native 소유와 충돌 없음 |
| focusReturn | Dialog→열었던 조작부 | 대상 유효성·fallback |
| announces | Toast→host 공지 채널 | 우선순위·중복·타이밍 |

Axiom role은 플랫폼 role이 아니며 mapping은 타깃 profile의 책임이다. 기본 Card에는 불필요한 button role·tab stop을 만들지 않는다. 클릭 가능한 Card는 전체 목적과 내부 interactive 내용의 관계를 검토한다.

## 충돌과 사용자 경험

브랜드 색이 필요한 대비를 충족하지 못하면 색·배경·글자·경계의 대안을 제시한다. 전문가가 그대로 보존할 수는 있지만 해당 필수 요구의 미준수 상태를 유지한다. 디자인 정책 예외로 접근성 의무를 지우지 않는다.

미검증 커스텀 유형은 필요한 이름·키보드·읽기·모션 의무를 사용자와 확정한 후 구현한다. 공통 역할을 하나 붙여 “접근성 자동 완료”라고 표시하지 않는다.

## 자동·수동 검증의 분담

자동 검사는 의미 속성·대비 계산이 가능한 범위·키 입력 trace·focus 결과·공지 호출을 검사한다. 수동 검사는 실제 screen reader의 읽기·탐색, touch 탐색, 확대·큰 글자, 예측 가능한 작업 흐름을 확인한다. Playwright와 axe 조합도 모든 접근성 문제를 자동 탐지하지는 못한다. [Playwright 접근성 검사](https://playwright.dev/docs/accessibility-testing)

Release profile에는 OS·브라우저/앱·보조 기술 버전, 입력 장치, 자동·수동 항목, 시험자를 기록한다. 수동 항목이 남으면 내부 시험 출력은 가능하지만 정식 검증 표시는 보류한다. [QAL02 · 검증 증거·freshness·추적성](../quality/evidence-and-freshness.md)는 증거의 범위와 변경 만료를 관리한다.

## 결정 추적과 변경 영향

<a id="d17-02"></a>

**D17-02 — 확정 방향:** profile별 자동 필수 검사 + 대표 환경 수동 확인, 정확한 범위 공개

<a id="d17-03"></a>

**D17-03 — 확정 방향:** 시각 수정·의미 수정 대안을 제시하고 전문가 예외는 미준수 상태로 보존

전제 문서: [CMP05 · Part·slot·인스턴스·override](parts-slots-and-instances.md) · [CMP06 · 동작·입력·기반 라이브러리 계약](behavior-and-input-profiles.md) · [CMP07 · 공동 UI 호스트와 조정자](coordinators-and-hosts.md).

변경 시 함께 검토: [CMP09 · 모션·전환·중단 의미](motion-and-transitions.md) · [CMP11 · 사용자 확장·등록·승격](custom-definition-registry.md) · [UX06 · 컴포넌트·동작·접근성·모션 편집 UX](../experience/component-editing-panels.md) · [AI02 · AI 코드 실현·후보·독립 판정](../ai/realization-and-independent-verification.md) · [QAL01 · 검증 요구·oracle·자동/수동 검사](../quality/conformance-and-test-plans.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
