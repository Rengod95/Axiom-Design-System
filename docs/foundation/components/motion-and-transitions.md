# CMP09 · 모션·전환·중단 의미

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 모션을 의미 있는 UI 전환으로 표현한다

초기 편집은 enter/exit, 상태별 전환, tween/spring, delay/stagger, keyframe을 제공한다. 고급 다중 트랙·페이지 scroll 연동은 별도 비교 영역이다. Motion을 CSS 문자열로만 저장하면 native 출력과 reduced motion, 상태 연결을 설명하기 어렵다.

MotionDefinition은 trigger, target Part/property, from/to 또는 keyframes, timing, delay/stagger, interruption policy, reduced alternative, completion effect를 가진다. typed property는 opacity, transform, 색, 크기 등이며 타깃별 지원이 다르다. spring의 stiffness·damping·mass와 tween duration/easing을 같은 숫자로 뭉개지 않는다.

## 시간·상태·제거의 관계

기본 시각 중단 정책은 현재 전환을 끝낸 뒤 다음 전환을 실행하는 것이다. 사용자에게 finish-then-next, replace-from-current, reverse-if-supported, snap을 선택할 수 있게 하고 허용 여부를 profile에 표시한다. 큐 길이와 오래된 목적 상태의 coalesce도 명시한다.

논리 상태, focus, 입력 차단, cleanup은 모션의 하위가 아니다. Toast close가 확정되면 상호작용을 종료하되 화면 node의 exit 표현을 기다릴 수 있다. 실행이 중단되거나 completion이 오지 않는 경우 bounded cleanup이 필요하다. removed 상태는 시각 callback이 무조건 한 번 온다는 가정에 의존하지 않는다.

## 편집 모델

Keyframe은 offset, typed value, segment easing으로 정의하고 offset 범위·정렬·중복 규칙을 검사한다. 기본 설계안은 0..1 offset의 오름차순을 요구하고 같은 property에서 중복 offset은 거부한다. 다른 property track은 독립적으로 표현하되 초기 UI를 전문 영상 타임라인으로 만들지 않는다.

Stagger는 stable 대상 순서와 간격을 가진다. 렌더 배열 index 변경으로 엉뚱한 부품이 지연되지 않게 한다. token 참조 duration/easing은 DSF에서 해석하되 transition token이 interaction event나 focus 정책을 소유하지 않는다.

## 플랫폼 차이와 감소 모션

Web preview의 Motion for React는 편집·시연 후보이고 저장 문법 자체는 해당 API에 묶지 않는다. 타깃 구현은 허용된 변환·spring 근사·layout 전략을 선언하고 검사한다. [Motion animation API](https://motion.dev/docs/react-animation)

Reduced motion 환경에는 의미를 유지한 짧거나 즉시인 대안을 기본 제안한다. 자동 축소가 내용 소실·focus 이동 지연을 만들지 않게 한다. 시간을 움직이지 않고도 상태를 관찰할 수 있는 scrub·일시 정지·한 단계 진행을 preview에 제공한다.

## 검증

enter 중 close, exit 중 reopen, 반복 activation, 다른 frame rate, unmount, host 해제, missing completion, reduced motion, unsupported property를 시험한다. 시간 허용오차는 target profile과 장비에 고정하고 우연한 screenshot 한 장으로 전환 품질을 확정하지 않는다. motion 설정 변경은 관련 lifecycle·시각·접근성 증거를 만료시킨다.

## 결정 추적과 변경 영향

<a id="d18-02"></a>

**D18-02 — 확정 방향:** 진행 중 모션을 마친 뒤 다음 전환을 실행하는 방식을 기본으로 하고 다른 정책도 선택할 수 있게 한다. 논리 상태·focus·cleanup까지 모션 큐에 종속시키는 요구는 아니다.

<a id="d18-03"></a>

**D18-03 — 확정 방향:** 의미를 유지한 짧은 전환·즉시 전환 대안을 자동 제안하고 수정 가능

전제 문서: [CMP04 · 상태 소유권과 요청 수명](state-and-request-lifecycle.md) · [CMP06 · 동작·입력·기반 라이브러리 계약](behavior-and-input-profiles.md) · [CMP08 · 접근성 의미·관계·준수 계약](accessibility-contracts.md) · [SYN03 · DSF·토큰·테마·사용자 정책](../syntax/foundation-and-token-semantics.md).

변경 시 함께 검토: [CMP10 · 외형 규칙·조건·우선순위](appearance-conditions-and-precedence.md) · [UX06 · 컴포넌트·동작·접근성·모션 편집 UX](../experience/component-editing-panels.md) · [AI02 · AI 코드 실현·후보·독립 판정](../ai/realization-and-independent-verification.md) · [QAL01 · 검증 요구·oracle·자동/수동 검사](../quality/conformance-and-test-plans.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
