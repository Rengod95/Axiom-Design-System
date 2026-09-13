# UX03 · 시각적 레이아웃 편집

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: UX/UI 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 사용자 언어와 실제 배치 규칙을 연결한다

Hug는 내용에 맞추기, Fill은 가능한 공간 채우기, Fixed는 지정 크기다. 사용자에게 이 세 가지를 쉽게 보여 주되 뒤에서는 축별 intrinsic sizing, constraints, distribution, alignment와 연결한다. 모든 경우를 CSS width 숫자 하나로 저장하지 않는다.

저장 단위는 [필드 계약](../annexes/document-contracts.md)의 LayoutRule이며 DesignDefinition.layout에 모인다. LayoutRule은 mode(flow/stack/grid/free), axis, gap, padding, alignment, distribution, 축별 size policy와 min/max, wrap, overflow, positioning, child order를 가진다. Grid는 Web 지원과 Mobile 대응 여부를 별도로 기록한다. 설계 문법에서 정의 가능하다는 것과 각 타깃 실행 지원은 구분한다.

## 편집 흐름

Card body를 늘릴 때 부모가 hug이면 전체 Card가 커진다. fixed이면 overflow 정책이 작동한다. fill child가 hug parent의 크기를 결정하려 하면 순환 제약을 진단하고 최소·최대 또는 다른 size policy를 제안한다.

자동 배치 안 drag는 순서·gap·크기 규칙을 우선 수정한다. absolute/free 배치로 바꾸려면 예상 결과와 읽기 순서 영향을 보여 준다. 다중 선택에서는 값이 다른 항목을 mixed로 표시하고 수정할 속성만 동일하게 적용한다.

## 논리 순서와 플랫폼

시각 순서와 읽기·focus 순서는 관련되지만 완전히 동일한 필드는 아니다. 재배치가 접근성 순서를 예상과 다르게 만들면 연결 패널에서 확인한다. RTL, 긴 영어 단어, 한글 줄바꿈, 큰 글자, 최소 폭을 기본 preview 조건으로 제공한다.

Yoga는 Flexbox 중심 레이아웃 계산기이므로 브라우저의 모든 CSS layout이나 텍스트 shaping을 대체하지 않는다. ADS 공통 layout을 Yoga subset으로 무조건 축소하지 않는다. browser layout은 Web의 실제 결과를, native 실행은 해당 타깃의 결과를 확인하는 경로다. [Yoga 범위](https://www.yogalayout.dev/docs/about-yoga)

## 타깃 대체

Mobile에 동일 기능이 없거나 구조가 부적절하면 같은 목적을 유지하는 다른 디자인을 제안한다. 예를 들어 가로 정보 줄을 세로 stack으로 바꾸고 공통 값·event·Part 의미는 유지한다. 자동 생성 제안은 사용자가 preview·diff를 확인하고 실제 타깃 검사 후 채택한다.

명시한 target-only rule을 다른 타깃에 조용히 무시하지 않는다. 대체값·원본 규칙·영향 타깃을 provenance로 기록한다.

## 시험

hug/fill 순환, nested constraints, overflow, text intrinsic size, resize 중 wrap, RTL, 키보드 reordering, native 대체, unknown font를 검사한다. 정밀 수치 허용오차와 텍스트 측정 버전은 release profile에 고정한다. layout 변경은 해당 디자인의 시각·읽기 순서·출력 증거를 다시 요구한다.

## 결정 추적과 변경 영향

<a id="d24-01"></a>

**D24-01 — 확정 방향:** hug/fill/fixed·자동 배치 같은 쉬운 용어와 CSS 개념을 함께 표시

<a id="d24-02"></a>

**D24-02 — 확정 방향:** 부모 레이아웃을 유지하며 순서·크기 규칙 변경을 preview

<a id="d24-03"></a>

**D24-03 — 확정 방향:** 타깃별 제약과 대체안을 표시하며 동일 목적의 대체 레이아웃 생성안을 확인받는다. 자동 생성만으로 타깃 일치를 확정하지 않는다.

전제 문서: [CMP05 · Part·slot·인스턴스·override](../components/parts-slots-and-instances.md) · [CMP10 · 외형 규칙·조건·우선순위](../components/appearance-conditions-and-precedence.md) · [UX02 · Canvas 선택·좌표·직접 조작](canvas-and-direct-manipulation.md).

변경 시 함께 검토: [UX07 · 즉시 preview·검증 화면·프로토타입](preview-and-prototypes.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
