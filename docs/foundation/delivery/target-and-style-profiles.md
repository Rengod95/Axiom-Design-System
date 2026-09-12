# DLV01 · 타깃·스타일·동작 기반 지원표

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 플랫폼 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 디자인 범주와 출력 기술은 다른 축이다

Web·Mobile은 사용 환경에 따른 디자인 범주다. React·React Native·Swift·Android는 출력 기술이다. Mobile appearance를 한 번 정의해도 플랫폼 관습과 실제 API 차이에 따라 여러 realization profile이 필요하다.

초기 필수는 React·RN·Swift·Android와 전체 카탈로그다. Swift·Android를 “가능하면”이나 후속으로 되돌리지 않는다. 구체 toolkit·버전·style library는 실증 비교 후 고정한다.

| profile 축 | 값·선택 방향 | 성립하지 않는 조합 |
|---|---|---|
| Web target | React 소비 프로젝트 | RN/Swift에 DOM 속성 직접 적용 |
| Web style | CSS·SCSS·Tailwind·CSS-in-JS | 모든 CSS 기능이 native에 동일 |
| Web behavior | React Aria·Base UI·검증 팩·custom | 다른 compound Part 무검사 혼합 |
| Mobile RN | Expo 중심, bare RN 별도 검증 | 브라우저 근사를 native 실행으로 계산 |
| Mobile Swift | SwiftUI 우선 비교, 대안 별도 | Windows에 Apple toolchain 가정 |
| Mobile Android | Compose 우선 비교, 대안 별도 | Web style pack 직접 출력 |

SwiftUI와 Compose는 각 플랫폼의 선언형 UI toolkit 후보이다. 실제 채택 버전과 전체 카탈로그 적합성은 구현 단계의 비교 대상이다. [SwiftUI](https://developer.apple.com/swiftui/), [Compose](https://developer.android.com/compose)

## TargetProfile 계약

id/version, category, language/framework/toolchain, runtime dependencies, style strategy, behavior mapping, unit/color/font mapping, public API mapping, layout/motion/a11y capabilities, required hosts, test environments, support matrix를 고정한다. target capability의 declared·implemented·verified는 따로 기록한다.

임의의 모든 축의 곱을 지원하지 않는다. 성립하는 조합별로 명시된 profile을 만들어 coverage를 계산한다. 지원하지 않는 조합은 생성 전 설명하고 검증된 대안을 제안한다. CSS-in-JS라는 범주만 지원한다고 쓰지 않고 실제 library/version을 선정한다.

## 의미 유지와 차이

Button의 activate, Select의 value ownership, Toast의 lifecycle과 공지는 공유한다. 외형·node 수·focus 방식·입력 gesture·motion 실행 API는 달라질 수 있다. RN의 platform-specific code도 명시된 profile 경계로 관리한다. [React Native 플랫폼 코드](https://reactnative.dev/docs/platform-specific-code)

수치 단위·font weight·color gamut·shadow·gradient·layout·spring의 변환과 허용오차는 결과를 보며 고정한다. 지원되지 않은 속성을 빼거나 generic view로 대체하고 원래 의무를 통과했다고 계산하지 않는다.

## 선택과 검증

React 대표 소비 앱·SSR/RSC 경계, CSS-in-JS 초기 후보, React Aria/Base UI 및 custom 조합, SwiftUI/Compose 범위는 [선정 기록](../annexes/selection-register.md)의 gate에서 결정한다. 후보별 전체 catalog coverage·수동 a11y·패키징·유지 비용을 비교한다.

각 정식 release는 해당 profile 전체 시험을 재실행한다. 같은 의미를 공유해도 한 플랫폼 통과를 다른 플랫폼 증거로 복사하지 않는다. [타깃·환경 부록](../annexes/targets-and-environments.md)이 필수 조합과 아직 미실증인 부분을 추적한다.

## 결정 추적과 변경 영향

<a id="d30-01"></a>

**D30-01 — 확정 방향:** 타깃 대응 기반, full-custom, 검증된 묶음, 성립하는 조합별 출력의 비용·품질·유지보수 비교 후 구체 구현 방식을 확정한다. 필수 타깃 요구를 임의 축소하지 않는다.

<a id="d30-02"></a>

**D30-02 — 확정 방향:** 소비 프로젝트의 스타일 방식을 감지하고 지원된 연결을 제안한다. 정확한 지원 라이브러리·버전 목록은 아직 선택되지 않았다.

<a id="d30-03"></a>

**D30-03 — 확정 방향:** Expo 중심으로 시작하며 bare RN 연결도 명시적으로 검증한다.

<a id="d30-04"></a>

**D30-04 — 확정 방향:** 전체 카탈로그의 Swift·Android 네이티브 출력까지 초기 필수로 요구했다. 과거 '가능하면/후속 검토'에서 범위가 강화됐으며 임의로 React/RN 범위로 되돌리지 않는다.

전제 문서: [PRD03 · 초기 범위·카탈로그·제품 확장 경계](../product/scope-catalog-and-roadmap.md) · [CMP06 · 동작·입력·기반 라이브러리 계약](../components/behavior-and-input-profiles.md) · [CMP10 · 외형 규칙·조건·우선순위](../components/appearance-conditions-and-precedence.md) · [SYN03 · DSF·토큰·테마·사용자 정책](../syntax/foundation-and-token-semantics.md) · [AI02 · AI 코드 실현·후보·독립 판정](../ai/realization-and-independent-verification.md).

변경 시 함께 검토: [DLV02 · 소비 프로젝트 init·doctor](project-init-and-doctor.md) · [DLV03 · 사용자 소유 코드·패키지·배포](user-owned-library-and-packaging.md) · [QAL01 · 검증 요구·oracle·자동/수동 검사](../quality/conformance-and-test-plans.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
