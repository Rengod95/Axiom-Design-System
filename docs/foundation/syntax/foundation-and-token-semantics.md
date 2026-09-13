# SYN03 · DSF·토큰·테마·사용자 정책

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 문법/도메인 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 토큰을 쉽게 만들면서 의미를 잃지 않는다

토큰은 재사용 값이고 domain은 사용 목적의 분류이며 type은 값의 형태다. “spacing” domain을 추가했다고 새로운 수치 엔진이 생기지는 않는다. primitive·semantic 같은 tier는 기본 작성 가이드로 제공하되 사용자 정책으로 확장한다. 표준 파일이 반드시 Axiom의 이름 규칙을 써야 하는 것은 아니다.

TokenDefinition은 id, name/path, typeRef, literal 또는 reference, description, domain/tier, metadata/extensions를 가진다. resolved value는 원본이 아니라 특정 context에서 계산한 파생 결과다. 같은 token ID가 테마마다 달라도 사용처는 의미 참조를 유지한다.

## 타입·alias·사용 위치

타입 registry는 값 구조와 허용 단위, 비교·변환, GUI 편집기, binding 가능 속성, 검증 요구를 나누어 관리한다. 사용자 domain 등록에는 label·설명·허용 type을 먼저 입력한다. AI가 binding을 제안해도 실제 렌더러와 타깃 검사가 없으면 “정의 가능·출력 미검증”으로 남는다.

참조는 문자열 치환으로 끝내지 않고 type을 검사한다. color alias가 dimension을 가리키거나 순환하면 경로와 수정 지점을 진단한다. 복합 토큰의 부분 참조와 값 구조는 선택한 표준 의미를 따른다. 폰트 이름을 파일과 동일시하지 않고 실제 font asset availability를 검사한다.

## 테마와 최종 값의 출처

ThemeAxis는 id, 허용 context, 기본값, 적용 범위를 가진다. brand, scheme, density 같은 독립 축과 이름 있는 완성 ThemeSet을 제공한다. 선택 context→참조 자료→해석 순서→최종 token value의 provenance를 볼 수 있어야 한다. 사용자는 “왜 이 Card만 다른 배경인가”를 값의 출처로 확인한다.

DTCG Resolver를 사용하는 경우 set·modifier의 규칙과 순서는 해당 판본을 그대로 적용한다. Axiom의 일반 정책 우선순위로 바꾸지 않는다. 같은 축의 상충 선택·잘못된 context는 오류로 처리한다. 가능한 조합과 의미 없는 조합을 프로필에 명시한다. [Resolver 기준](https://www.designtokens.org/TR/2025.10/resolver/)

## 시스템 정책과 예외

PolicyRule은 ruleId, scope, predicate, severity, rationale, exceptionRef를 가진다. 예를 들어 “컴포넌트 간격은 semantic spacing을 사용”은 DS 정책이다. 문구 대비와 키보드 접근 같은 컴포넌트 필수 의무와 구별한다. 승인된 예외의 대상·이유·기간·승인자를 기록하고 유효 필수 규칙을 계산한다.

규칙 밖 값을 쓰면 Canvas 표시와 Inspector 진단을 연결하고 “토큰으로 바꾸기”, “토큰 만들기”, “예외 제안”을 제공한다. 초안 편집은 계속할 수 있지만 정식 배포는 유효 필수 규칙을 통과해야 한다.

## 타깃 차이와 검사

dimension 변환은 단위의 의미·기준 밀도·사용 위치를 명시한다. 모든 숫자를 Web px나 Mobile dp로 치환하지 않는다. 색 변환은 원래 색 공간과 변환 결과를 함께 유지한다. [DLV01 · 타깃·스타일·동작 기반 지원표](../delivery/target-and-style-profiles.md)의 프로필별 정책을 적용하고 결과 차이를 노출한다.

토큰 변경은 alias closure, theme 조합, 사용처 layout·대비·자산, 출력의 관련 증거를 만료시킨다. 정상·오류 파일, 복합 값, 각 context의 출처, 범위 밖 값, 승인 예외, 단위·색 변환을 시험한다. 토큰 편집 UX는 [UX05 · 토큰·테마·정책 편집 UX](../experience/foundation-editor.md)를 따른다.

## 결정 추적과 변경 영향

<a id="d07-01"></a>

**D07-01 — 확정 방향:** 기본 분류와 설명을 제공하고 언제든 수정·추가

<a id="d07-02"></a>

**D07-02 — 확정 방향:** 타입·설명을 통해 분류를 쉽게 등록한다. AI가 binding·검증안을 제안하고, 실행 지원 여부는 별도 검증한 뒤 부여한다.

<a id="d07-03"></a>

**D07-03 — 확정 방향:** 공통 엄격도와 명시적으로 승인된 예외를 반영한 유효 필수 규칙 전체를 통과하면 배포한다. 다른 필수 접근성·행동 의무까지 면제된 것으로 처리하지 않는다.

<a id="d08-01"></a>

**D08-01 — 확정 방향:** 독립 축 조합과 완성 테마 세트를 선택 가능하게 제공하며 최종 값·출처를 확인한다.

<a id="d08-03"></a>

**D08-03 — 확정 방향:** 공통 의미를 유지하고 타깃별 변환·차이를 표시

전제 문서: [SYN01 · ADS와 토큰 표준 선정 계약](standard-strategy.md) · [SYN02 · 프로젝트 문서·ID·참조·수명](project-documents-and-identity.md).

변경 시 함께 검토: [SYN04 · 가져오기·원문 보존·migration](interchange-and-migration.md) · [CMP01 · 컴포넌트 정의 계층과 디자인 범주](../components/definition-and-designs.md) · [CMP03 · 값·이벤트·props·UI 표현식](../components/values-events-and-expressions.md) · [CMP09 · 모션·전환·중단 의미](../components/motion-and-transitions.md) · [CMP10 · 외형 규칙·조건·우선순위](../components/appearance-conditions-and-precedence.md) · [UX04 · 텍스트·폰트·벡터·이미지 편집](../experience/text-and-asset-editing.md) · [UX05 · 토큰·테마·정책 편집 UX](../experience/foundation-editor.md) · [DLV01 · 타깃·스타일·동작 기반 지원표](../delivery/target-and-style-profiles.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
