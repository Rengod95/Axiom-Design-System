# UX04 · 텍스트·폰트·벡터·이미지 편집

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: UX/UI 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 텍스트와 자산을 컴포넌트 제작에 맞게 다룬다

초기 텍스트는 라벨·문단·줄바꿈·기본 인라인 서식·링크·목록을 다룬다. 한글 IME, 커서·선택, Undo, typography token은 기본 품질이다. CMS의 페이지·표·복잡 문서 편집을 초기 텍스트 엔진 요구로 자동 확장하지 않는다. Rich editor 컴포넌트 카탈로그 항목의 계약과 Studio 자체 텍스트 입력기의 범위도 구별한다.

TextDocument는 block와 inline run, marks, link, token typography refs, locale hints를 가진다. 표시 텍스트와 accessible name의 연결은 별도 의미 계약을 따른다. 임의 HTML을 그대로 정본으로 저장하지 않는다.

저장 필드의 소유권은 이 문서에 있고 공통 표기는 [필드 계약](../annexes/document-contracts.md)에 기록한다. block/run의 stable ID와 허용된 서식은 편집 엔진을 바꿔도 유지한다. 커서·선택과 IME 중간 문자열은 편집 세션 상태이며 확정한 콘텐츠와 구별한다. GUI·AI의 텍스트/slot 내용 편집은 [공식 명령](../annexes/commands-and-diagnostics.md)을 통해 같은 콘텐츠 검사·revision·Undo를 적용한다. 선택한 엔진의 내부 JSON을 ADS 정본으로 자동 채택하지 않는다.

## 입력과 Undo

IME composition 중에는 미완성 문자열을 확정 command로 계속 쌓거나 단축키를 실행하지 않는다. composition 시작·갱신·종료와 선택 상태를 보존한다. 연속 입력은 의미 있는 편집 묶음으로 합치고 selection 이동·서식 변경·paste 등에서 경계를 둔다.

붙여넣기는 허용된 서식만 변환하고 제거된 항목을 필요한 경우 알린다. 링크는 허용 scheme을 검사한다. 시스템 token을 직접 서식 값으로 바꾸면 override 표시와 token 연결 복구를 제공한다. Axiom UI 언어가 바뀌어도 사용자 콘텐츠는 자동 번역하지 않는다.

## 이미지·벡터 편집

외부 디자인 도구에서 만든 자산을 import·보관·표시·재사용하는 흐름에 집중한다. 기본 위치·크기·crop·fit·교체·간단한 외형을 제공하고 pen path·boolean 등 전문 제작 도구는 후속이다. 원본 bytes와 파생 표시를 구별해 crop을 원본 손상으로 저장하지 않는다.

SVG는 렌더링하기 전에 실행·외부 참조를 격리한다. image alt는 사용 맥락에 따라 정보/장식을 선택하고 설명을 연결한다. 원본 asset에 하나의 alt를 영구 강제하지 않는다.

## 누락과 대체

없는 폰트·이미지는 위치·참조를 유지하고 대체 preview와 재연결을 제공한다. font fallback으로 줄바꿈이 달라지면 정확한 시각 검증이 불가능하다는 상태를 표시한다. 영향 없는 token·다른 component 편집은 계속할 수 있다.

재연결이 동일 bytes인지 교체인지 비교하고, 교체이면 해당 디자인·theme·타깃의 증거를 만료시킨다. 실제 필요한 자산 복사와 권리·고지는 [BRD02 · 자산 저장·출처·권리·배포](../brand/assets-and-provenance.md)를 따른다.

## 시험

한글 조합 중 Undo·Enter·이동, 복합 선택·paste·서식 제거, 긴 줄·링크·목록, token 서식과 local override, font 미설치·재연결, image crop 복원, 안전하지 않은 SVG를 시험한다. Tiptap/ProseMirror와 Lexical의 세부 채택은 이 workload와 의존성·라이선스 비교 후 [ARC02 · 모듈·저장소·의존 방향](../architecture/modules-and-dependencies.md)에서 결정한다.

## 결정 추적과 변경 영향

<a id="d25-01"></a>

**D25-01 — 확정 방향:** 위임안 RP03을 확인했다. 라벨·문단·줄바꿈·기본 인라인 서식·링크·목록, 한글 IME·선택/커서·Undo·토큰 typography를 우선한다. CMS 수준의 표·페이지 텍스트 편집은 자동 포함하지 않는다.

<a id="d25-02"></a>

**D25-02 — 확정 방향:** 외부 제작 벡터·이미지를 import·보관·표시·재사용하는 경험에 집중하고 내부 편집은 간단하게 둔다. 원래 1번에 나열된 전체 path/boolean 편집을 초기 필수로 자동 채택하지 않는다.

<a id="d25-03"></a>

**D25-03 — 확정 방향:** 누락 자산의 원본 참조·위치를 보존하고 대체 preview·재연결을 제공한다. 정확한 자산이 필요한 검사·출력만 제한하며 다른 편집은 계속한다.

전제 문서: [BRD02 · 자산 저장·출처·권리·배포](../brand/assets-and-provenance.md) · [UX02 · Canvas 선택·좌표·직접 조작](canvas-and-direct-manipulation.md) · [SYN03 · DSF·토큰·테마·사용자 정책](../syntax/foundation-and-token-semantics.md).

변경 시 함께 검토: [UX08 · Studio 접근성·언어·입력 품질](editor-accessibility-and-language.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
