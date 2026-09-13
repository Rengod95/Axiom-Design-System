# 편집기 완결성 전수 감사

검토일: 2026-09-13. 구현 기준점: `e72dfb11aa29bc051c92c87d52224f98c64c33fa` (PR #29 이후, 이번 확장 작업 이전). 상태: **요구사항 감사 완료, 제품 구현·출시 완료 아님**. 이후 작업 중인 파일은 이 기준점의 완료 수에 포함하지 않는다. [기계 판독 원장](editor-completeness-audit.json)에 문서·근거 파일 hash, 모든 카탈로그 항목과 연결을 보존한다.

Foundation 본문 56개를 모두 읽고 각 본문의 소유 계약·실패 사례·완료 조건을 검토했다. 부록의 문서 필드 57개, 명령 52개/조회 10개, 시나리오 50개, 카탈로그 239개/원본 330행, 확장 어휘와 타깃 표도 대조했다. 읽기 완료를 구현 완료로 표시하지 않는다. 이 감사는 코드와 기존 시험의 범위 확인이다. 새 수동 AT 검사, 실제 OS 한글 입력기 사용성 조사, 모든 네이티브 실행, 성능 측정이나 외부 제공자 최신 버전 재조사는 수행하지 않았다.

현재 제품은 저장·검토·Undo가 연결된 **Button/Card/Toast의 제한된 세로 구현**이다. Foundation의 전체 내부 편집기, 전체 카탈로그, 토큰 표준 전체, 네 타깃의 실제 실행·접근성 완료와는 거리가 있다. raw JSON으로 값을 보존하거나 schema가 필드를 읽는 능력은 해당 기능의 시각 편집·실행 지원을 대신하지 않는다.

## 판정과 근거

`B`는 적힌 한정 범위에 실제 구현이 있는 상태, `P`는 일부만 구현, `M`은 현재 실행/조작 경로 없음, `D`는 Foundation이 명시적으로 후속 범위로 둔 기능, `N`은 편집기 화면 밖의 사업·운영 또는 미확정 선택이다. B도 모든 플랫폼 검증을 의미하지 않는다. `F`는 Foundation 요구, `U`는 이번 사용자 명시 요구, `E`는 일반 편집기 사용성 제안이다. F의 미완료를 E로 낮추거나 D로 임의 연기하지 않는다.

| 근거 ID | 읽은 구현·시험 | 확인한 범위 |
| --- | --- | --- |
| UI | [app.tsx](../../apps/studio/src/app.tsx), [inspector.tsx](../../apps/studio/src/inspector.tsx), [preview.tsx](../../apps/studio/src/preview.tsx), [dialogs.tsx](../../apps/studio/src/dialogs.tsx) | 실제 노출된 조작, 선택, 편집/실행, review, ZIP |
| CTRL | [controller.ts](../../apps/studio/src/controller.ts), [main.tsx](../../apps/studio/src/main.tsx) | IndexedDB 한 작업 공간, transient 계획, 공식 command 경로, source buffer |
| VIS | [styles.css](../../apps/studio/src/styles.css), [locales.ts](../../apps/studio/src/locales.ts), [icons.tsx](../../apps/studio/src/icons.tsx) | 현 Axiom 자체 화면 스타일·KO/EN·공통 UI 요소 |
| ST | [studio-contracts.ts](../../modules/ads-core/src/studio-contracts.ts), [studio-constants.ts](../../modules/ads-core/src/studio-constants.ts), [studio-validation.ts](../../modules/ads-core/src/studio-validation.ts), [studio-projection.ts](../../modules/ads-core/src/studio-projection.ts), [studio-presentation.ts](../../modules/ads-core/src/studio-presentation.ts), [studio-template.ts](../../modules/ads-core/src/studio-template.ts) | 3 archetype, Web/Mobile, 7 외형 속성, 고정 조합, 제한된 편집 계획 |
| FDN | [foundation-validation.ts](../../modules/ads-core/src/foundation-validation.ts), [foundation-values.ts](../../modules/ads-core/src/foundation-values.ts), [foundation-resolution.ts](../../modules/ads-core/src/foundation-resolution.ts), [foundation-interchange.ts](../../modules/ads-core/src/foundation-interchange.ts) | 13 DTCG literal 타입, 14 색 공간 값 검사, 전체 토큰 alias, 명시 순서 context, flat 교환 |
| KRN | [command-service.ts](../../modules/ads-core/src/command-service.ts), [source-import.ts](../../modules/ads-core/src/source-import.ts), [validation-profile.ts](../../modules/ads-core/src/validation-profile.ts), [constants.ts](../../modules/ads-core/src/constants.ts) | 7 operation, 원문/초안/검토/동일 receipt/원자 batch/강한 profile 상속 |
| SCH | [structural-validation.ts](../../modules/ads-core/src/structural-validation.ts), [type-validation.ts](../../modules/ads-core/src/type-validation.ts), [domain-validation.ts](../../modules/ads-core/src/domain-validation.ts), [content-validation.ts](../../modules/ads-core/src/content-validation.ts), [local-references.ts](../../modules/ads-core/src/local-references.ts) | 구조 57 record, 7종 TypeExpr, 제한된 text/layout 의미, 로컬 참조. 전체 실행 아님 |
| STORE | [IndexedDbStore](../../modules/browser-store/src/indexed-db-store.ts), [FileStore](../../modules/local-store/src/index.ts), [kernel-state-codec.ts](../../modules/ads-core/src/kernel-state-codec.ts) | 독립 브라우저/Node 저장 adapter와 응답 유실·복구. GUI 폴더 Host 연결은 없음 |
| TGT | [target-packs](../../modules/target-packs/src/index.ts), [대상 실증](studio-delivery-evidence.md) | React CSS/RN Expo/SwiftUI/Compose의 3 archetype 소스. 실제 실행 범위 분리 |
| DLV | [delivery](../../apps/delivery/src/index.ts), [CLI](../../apps/cli/src/cli.ts) | 로컬 소스 전달, 전체 파일 3-way, hash 고정·충돌·복구·rollback. 설치/원격 게시 없음 |
| TEST | [core authoring](../../modules/ads-core/test/studio-authoring.test.ts), [browser authoring](../../modules/browser-store/test/studio-authoring.test.ts), [Studio runner](../../scripts/verify-studio.mjs), [target runner](../../scripts/verify-targets.mjs) | 기존 실행 가능 회귀와 [보고된 실증](studio-delivery-evidence.md). 시험 개수만으로 50 시나리오를 충족시키지 않음 |

ADR-0006/0007의 문서 권위·기준선, ADR-0009~0014의 점진적 실행 profile을 적용했다. Foundation의 역사적 `NOT_IMPLEMENTED` 표를 현재 구현 상태로 그대로 복사하지 않는다. 반대로 ADR-0014의 작은 실행 profile을 전체 Foundation 범위 변경으로 해석하지 않는다. Product/Design brief의 부재는 이번 감사의 관찰이며, 새 디자인 결정은 부모 작업이 소유한다.

## 구체 기능 원장

각 행의 마지막 칸은 구현을 닫기 위해 관찰해야 할 행동이다. 실패·취소·Undo·접근성은 별도 장식이 아니라 해당 기능의 완료 조건이다. 공통 source/review/저장 기반이 있다고 모든 작성 명령이 구현된 것은 아니다.

### 시작·탐색·선택

| ID | 근거·분류 | 기능 | 상태·현재 근거 | 남은 작업과 완료 관찰 |
| --- | --- | --- | --- | --- |
| ED01 | UX01, PRD02 · F | 기본 DS로 처음 시작 | B · UI/CTRL: 프로젝트명→9 token/3 component/6 design | 이 한정 starter의 성공/실패 이름 보존·재시작 지속을 유지. 범용 template 선택과 동일시 금지 |
| ED02 | UX01, ARC04/06 · F | 브라우저/로컬 폴더 동등한 시작 | P · STORE 양 adapter, UI는 IndexedDB 하나 | 시작에서 위치 선택→권한 취소/재연결→같은 편집/review/export. 폴더 보관 도움말은 실행 경로 아님 |
| ED03 | UX01, AI01 · F | 직접/AI/예제 학습 시작 | P · 직접 starter만 | 같은 기능 권한으로 세 진입; 학습이 실제 token→Card→설치까지 연결; AI 제공자 실패에도 GUI 유지 |
| ED04 | UX01, UX05, PRD03 · F | 생성·검색·필터·목록 탐색 | M · UI 고정 token/component 목록 | 이름/type/domain/tier/theme/family/provider/kind 필터, 빈 결과 초기화와 생성, 239목록 keyboard 탐색 |
| ED05 | UX01 · F | 선택 없음의 작업대 | M · UI 첫 token 자동 선택 | 빈 selection에서 시스템 요약·생성·검색 표시, 이전 개체 속성 편집 금지, Escape 해제 및 상태 공지 |
| ED06 | UX01/02/06 · F,U | 선택 개체별 Inspector | P · UI Part 선택은 공유되나 sampleContent는 component 전체 | 선택 label/body/actions의 관련 content/layout/appearance만 우선 표시; component/Part/Slot/instance 경계·읽기 전용 이유 명확 |
| ED07 | UX02 · F | 깊은 선택·부모 이동·겹친 대상 | P · UI closest data-part-id와 평면 layer 버튼 | 기본 parent 선택, deep modifier, 부모/자식 keyboard, breadcrumb 이동, 겹친 목록 선택; native 근사도 같은 stable ID |
| ED08 | UX02, ARC05 · F | 다중 선택·혼합값 | M | 범위/추가/영역 선택, mixed indicator, 공통 허용 속성만 원자 변경, 잠긴 항목 설명, 취소/Undo 한 번 |
| ED09 | UX02/08 · F | 편집/실행 모드 | P · UI 명시 toggle와 일부 run controls | 누르는 동안 임시 실행, 복귀 selection/focus, 중첩 control 이벤트 소유, 미완료 gesture 취소; shortcut이 IME를 방해하지 않음 |
| ED10 | GOV02, UX01 · F | 이름·ID·API 표시 구분 | P · UI 이름/ID, ST token rename helper | rename은 stable ID 유지; public name 변경 영향·충돌/예약명 안내; 사용자 표시명은 언어 전환으로 변하지 않음 |
| ED11 | UX01/08, GOV02 · F | 오류에서 대상·원인·복구 | P · UI 12개 잘라 표시, code/path/상세 message | 전체 개수/한도 안내, KO/EN 원인·복구 action, 대상 클릭 이동, 오류가 있는 원본·마지막 유효 preview 양쪽 접근 |
| ED12 | UX01 · F | 맥락 도움말·즐겨찾기·전문 옵션 | M | novice 설명→정확한 계약 용어, 같은 작업의 고급 설정, 반복 속성 즐겨찾기; 기능을 몰래 숨기거나 권한을 낮추지 않음 |

### Canvas와 배치

| ID | 근거·분류 | 기능 | 상태·현재 근거 | 남은 작업과 완료 관찰 |
| --- | --- | --- | --- | --- |
| CV01 | UX02, SC22 · F,U | zoom·camera·pan | M · UI는 overflow scroll과 artboard 폭 전환 | pointer 고정 zoom, pan, 범위 제한, 초기화/맞춤; transform 후 같은 Part hit. camera는 ADS 정본·Undo 기록 밖 |
| CV02 | UX02, ARC02 · F | geometry bridge | M · UI DOM closest 선택만 | screen→camera→artboard→parent→node 역변환, scroll/rotation/iframe 반영, revision과 stable ID 검증, stale geometry 작업 보류 |
| CV03 | UX02 · F | move/resize/rotate | M | 손잡이·키보드 동등 경로, 실제 ADS layout 변경, preview만 변하는 가짜 drag 금지; start/transient/commit/cancel 한 의도 |
| CV04 | UX02/03 · F | auto-layout drag·reparent | M | auto layout은 childOrder, free는 부모 기준 위치. 순환·잠금·slot/type·읽기 순서 검사, invalid drop/cancel 원형 유지 |
| CV05 | UX02 · F | align/distribute/snap | M | 선택 범위·기준점·허용 속성 명시, 변환된 좌표 동일 결과, snap 해제와 keyboard 대체, 하나의 review/Undo |
| CV06 | UX02 · F | lock/hide/frame/group | M | 편집 잠금과 runtime availability 구분, 표시 숨김과 문서 삭제 구분, 그룹 ID/관계 유지, 해제·복구 가능 |
| CV07 | UX03 · F | hug/fill/fixed, min/max | P · SCH SizePolicy 의미 검사, ST minHeight만 | 축별 control, intrinsic/fill cycle, 단위 비교, 부모/자식 제한 진단; Web/Mobile 동일 의미와 차이 표시 |
| CV08 | UX03 · F | flow/stack/grid/free | P · ST 제한 stack/축·padding/gap | 전체 모드와 grid/flow/free model, wrap/alignment/distribution/overflow/anchor; 미지원 native mapping 숨김 금지 |
| CV09 | UX03 · F | 네 변 padding·크기·순서 | P · UI scalar padding/gap/minHeight, ST axis helper | 연결/분리 edge, 실제 width/height, 자동/고정 표시, childOrder editing; literal/token provenance와 단위 유지 |
| CV10 | UX03, CMP08 · F | 반응형 배치와 의미 순서 | M | 긴 한/영, RTL, font scale, narrow bounds; 시각 order와 reading/focus order 차이 진단, 주요 조작 소실 금지 |
| CV11 | UX02, ARC03 · F | gesture 취소·history 묶음 | P · CTRL field transient→review 한 batch | pointercancel/Escape/selection 삭제/panel 전환으로 미완료 drag 취소, preview frame마다 저장 안 함, rollback 한 번 |
| CV12 | QAL03, SEL02 · F | 실제 편집 workload·성능 | M · 현재 resource caps는 안전 경계 | S/M/L 제안 dataset 실제 hit/edit/zoom/text/layout 측정, p95/memory/hardware 기록, cancel/lazy/worker 적용 판단. 목표 수치 미승인을 pass gate로 발명 금지 |

### Foundation token·theme

| ID | 근거·분류 | 기능 | 상태·현재 근거 | 남은 작업과 완료 관찰 |
| --- | --- | --- | --- | --- |
| FT01 | SYN03, UX05 · F,U | token 생성 | P · ST token-create helper, UI 생성 없음 | type/domain/tier/name/value/alias 선택→유효성→공유 영향→review. 생성 ID 충돌·취소·Undo와 목록 즉시 반영 |
| FT02 | SYN03, UX05 · F,U | 분류 생성·관리 | P · FDN domains/tiers 보존·ID 참조 검사 | domain과 tier를 type/폴더와 구분, 이름·설명·허용 타입·binding·지원 정보 CRUD; 사용 중 삭제는 replacement/미해결 경로 |
| FT03 | UX05, SYN02 · F | token rename·copy·delete·deprecate | P · ST rename, KRN 제한 delete | stable ID rename, 복사 새 ID/refMap와 Foundation link 선택, 공유 usage replacement, deprecation 이유/후속 대상. 동일 이름 import가 overwrite하지 않음 |
| FT04 | UX05 · F | 검색·filter·대량 편집 | M | type/domain/tier/theme 검색, 다중 row before/proposed/진단, 오류 제외 재선택 시 closure/digest 재계산, atomic apply/Undo |
| FT05 | SYN01/03 · F | 13 literal 타입 의미 검사 | B · FDN 검사 corpus | color/dimension/fontFamily/fontWeight/duration/cubicBezier/number/strokeStyle/border/transition/shadow/gradient/typography의 검사 범위. 모든 GUI·렌더·표준 resolver 완료로 확대 금지 |
| FT06 | UX05, SYN01 · F | 타입별 시각 editor | P · UI sRGB hex/alpha + JSON | 14 color space 채널/alpha, unit 수치, font fallback/weight, duration/easing, 복합 border/shadow/gradient/typography 구조 editor. 유효값 손실 없이 preview/Undo |
| FT07 | SYN03 · F | 전체 token alias·usage·provenance | P · FDN resolve/cycle/type, UI alias 해제/출처 텍스트 | 호환 alias picker/rebind, 그래프 탐색·usage 클릭·순환 경로, 어떤 context/source에서 왔는지 이동 가능하게 표시 |
| FT08 | SYN01/03, SEL01 · F | 부분 alias·group/type 상속·DTCG Resolver | M · FDN 명시 unsupported | 공식 판본 corpus로 group inheritance/property reference/set/modifier/context/default/order·오류 의미; raw 보존을 interpret/GUI/output 합산 금지 |
| FT09 | SYN03, UX05 · F | theme axes·sets CRUD | P · FDN explicit-order, UI 기존 named set 선택/override | brand/scheme/density 축·context/default/scope/order 생성·편집·삭제, named 조합 저장, 충돌·미지 context 진단 |
| FT10 | UX05 · F | theme 비교·동시 preview | P · UI 하나씩 set 전환 | 같은 token/part의 여러 context를 나란히 비교, inherited/override 구분, diff·contrast·영향, 변경 전후 선택 유지 |
| FT11 | SYN03, UX05 · F | 정책·예외 | M · FDN nonempty policy 실행 거절 | predicate/scope/severity/rationale와 token domain 정책, literal→기존/신규 token/예외 action; 예외 대상/이유/기간/승인자 추적, 기본 a11y 의무 면제 금지 |
| FT12 | SYN01/04 · F | DTCG import/export | P · FDN flat importer와 원문 export, GUI 미연결 | 실제 파일선택→원본·유효/오류·unsupported path→매핑 review; authored/original 선택. group/theme/classification 손실을 조용히 flatten하지 않음 |
| FT13 | SYN01, DLV01 · F | 타입·색의 실제 target 사용 | P · TGT sRGB/px 등 제한 mapping | gradient는 채움, typography는 text, transition은 motion 등 실제 사용처/색 변환을 4target 비교, 불가 항목 fail/명시 loss 선택 |
| FT14 | SYN01, SEL01 · F | 표준 선택 실증 | P · ADR14 literal/flat exchange 실증 | DTCG A/B/C 비용·완전성 비교, read/preserve/interpret/edit/preview/output/runtime 개별 표. 이점 미입증이면 전체 DTCG 요구 유지 |

### Component·contract·콘텐츠

| ID | 근거·분류 | 기능 | 상태·현재 근거 | 남은 작업과 완료 관찰 |
| --- | --- | --- | --- | --- |
| CP01 | PRD03, SEL11 · F,U | 전체 catalog 탐색·적용 | M · UI/ST 3 archetype | 239 ID/330 provider 원본 유지, 4 kind별 적절한 생성/연결 UX. 이름만 바꾼 동일 Card/버튼으로 실행 지원 위장 금지 |
| CP02 | CMP01, UX06 · F | 새 component·목적 정의 | M · ST starter 고정 | 목적→archetype/traits/public contract/parts/designs/의무; 정의 생성 자체 review, 사용자 저장 template 재사용 |
| CP03 | CMP01 · F | 여러 named Design | P · ST 정확히 Web/Mobile 하나씩 | 같은 common contract의 복수 이름 Design, 독립 variant/state/theme, 공통 변경이 모든 Design/instance에 미치는 영향 |
| CP04 | CMP02/11 · F | trait/role/policy 조합 | M · registry 구조만 SCH, ST builtin 정확한 계약 | configuration/port 타입, value writer, input claim, 필수 role/의무, version/context 호환 검사; 맞는 독립 조합은 허용 |
| CP05 | CMP03, UX06 · F | public value/event/variant type editor | P · SCH 7 TypeExpr 검사와 ST 고정 ports | 시각 primitive/enum/record/list/nullable/taggedunion/opaquekey + 미지원 reference/UI domain의 ADR 결정, default absent/null, 공개 API diff/예약명 |
| CP06 | CMP03 · F | 제한 Expr와 UIEffect | M · 구조 unknown 보존 | declared path만 read, typed operators/0나눗셈/overflow/step bound, emit/request/owned commit/focus/host/motion/cleanup. 임의 JS·업무 실행 불허 |
| CP07 | CMP04, UX06 · F | ownership·state domain·Request | P · builtin disabled/open/closeRequest | local/consumer/runtime·presence/query/active/selected 분리, proposed~terminal lifecycle, stale generation, bounded queue, 중복 writer 거부 |
| CP08 | CMP05, UX02/06 · F | Part CRUD·내부 구조 | P · UI 고정 root/direct parts 선택 | 임의 허용 깊이·역할·부모 이동/복사/삭제, 필수 role 삭제 차단/새유형, render node와논리Part 별도 mapping |
| CP09 | CMP05 · F | slot 계약·내용 주입 | P · starter Card body 선언, sample 문자열 | owner/type/min/max/default/allowed contract editor, 실제 text/component/asset 내용 주입·중첩, 빈필수·중첩interactive 검사 |
| CP10 | CMP05, UX07 · F | instance 생성·override | M · SCH record와일부참조만 | component/design pin, public props/slot contents/allowed overrides, provenance, reset/promote, 원본삭제 시 내용보존·replace/detach/미해결 |
| CP11 | CMP06 · F | behavior base 선택·fork | M · TGT custom builtin | React Aria/Base UI/shadcn 팩의 허용 목록/정확 버전, 교체 diff; 의무 변경은 독립 유형·새 oracle, 무검사 provider mix 금지 |
| CP12 | CMP06, UX06 · F | behavior list/graph/preset/AI editor | M | 상태·전이·guard/effect 시각 편집, 같은 의미의 목록/graph, preset 후 내부 편집; arbitrary code fallback 금지 |
| CP13 | CMP07 · F | host/coordinator authoring | P · builtin Toast target host | 8 coordinator family의명시scope/parent/lifetime/client·queue, nearestcompatible 제안+수동선택·실제경로·missing/ambiguous 복구 |
| CP14 | CMP08, UX06 · F | 접근성 관계 editor | P · builtin names/reading order 검사 | namedBy/describedBy/controls/owns/focusReturn/announces 동일 Part 선택 overlay와Inspector, 이름/상태/focus/announcement 실제 target observation |
| CP15 | CMP08, UX05 · F | contrast·터치·motion 도움 | P · starter 색 계산과44pxclose fixture | 사용자 모든 관련색/상태 contrast 및 근거, 대안 token/예외정책, 비시각접근 대체; 자동검사와수동AT 분리 |
| CP16 | CMP09, UX06 · F | 기본 motion authoring | P · 고정160ms와reduced0ms/cleanup | enter/exit/state tween/spring/delay/stagger/keyframes, unique0..1offset+typed property, reducedalternative, interruption/cleanup 계약 |
| CP17 | CMP09, UX06 · F | timeline·시연 controls | M | play/pause/scrub/step, 중간 enter/exit/재입력/반응거절, logical state와motionprogress 분리, 한 motion edit Undo |
| CP18 | CMP09, SEL22 · D | 전문 다중 track·scroll motion | D | 초기 keyframe/tween/spring을 완료한 뒤 선택. 기본 motion editor를 이 후속 범위에 함께 넣지 않음 |
| CP19 | CMP10 · F | variant×Part×state appearance | P · ST 6 fixed조합/7props, UI editor 없음 | 값의출처/priority/refines/동점충돌, variant/state 생성·편집·대응사항 검사; opacity만 전체appearance로 세지 않음 |
| CP20 | CMP10 · F | environment condition | M · arbitrary condition 미지원 | viewport/container/input/hover/direction/textScale/reducedmotion typed 축, unknown fallback, Web expert조건 격리와native한계 |
| CP21 | CMP10, UX06 · F | override reset/promote | M | local↔shared scope와영향, 사용자 허용 override만, 조건/토큰/읽기순서 재검증 후review; 복구 provenance |
| CP22 | CMP11 · F | registry 관리·Inspector hints | P · SCH 선언구조 | local→project→library promotion/ID/version/refMap, 동적 control metadata·required/enum/bounds/visibility, unsupported types 보존·한계 안내 |
| CP23 | GOV03, CMP02/11 · F | version 호환·protected customization | M | 독립 trait version 공존과연결port 호환 구분, breaking diff/migration/deprecation, 유형의무 제거 시 기존badge 무효 |
| CP24 | PRD03, catalog · F | dates/charts/editor/schedule 등 복잡군 | M | 도메인별 type/input/a11y/dataalternative/시간대/IME·history·요청 의미 계약 및4targetprofile; 일반 텍스트 placeholder로완료 금지 |

### Text·asset·brand

| ID | 근거·분류 | 기능 | 상태·현재 근거 | 남은 작업과 완료 관찰 |
| --- | --- | --- | --- | --- |
| TX01 | UX04, CMP05 · F | 내부 text 직접 편집 | P · UI Inspector plain input/textarea | canvas text 진입/선택/커서, label/paragraph/linebreak/inline mark/link/list, stable block/run ID·typography 참조 |
| TX02 | UX04/08, SEL03 · F | IME·paste·selection·Undo | P · UI composition handlers와실제CDP imeSetComposition | Tiptap/대안 workload, 실제 Windows/macOS 입력기·한/영혼합·조합중Enter/Escape/shortcut·paste sanitize·range/history 관찰 |
| TX03 | UX04, SYN01 · F | typography·locale·font | P · FDN literal유효성·ST fontSize | fontFamily fallback/fontWeight/lineHeight/letterSpacing/token binding, missingfont진단, locale힌트, 실제줄바꿈/대체/문자배율 |
| TX04 | BRD02, UX04 · F | 실제 asset import·reuse | M · record 구조보존뿐 | bytes저장/hash/크기/MIME/preview; 이미지·아이콘·SVG import reuse/crop/fit/replace/작은border 편집, undo파생출처 |
| TX05 | BRD02, OPS01 · F | asset security·rights·relink | M | SVG/URL/archive격리, id/version권리record≠blobhash, use별alt·web/native embedding·missingplaceholder·hash재연결·권리만료 |
| TX06 | BRD01 · F | 독립 BrandLibrary·guideline | M | versioned logos/font/image/icon·usage guide, optionalclearspace/minsize수치검사, libraryupdate 영향; 주관적brand적합성 자동pass 금지 |
| TX07 | UX04, PRD03 · D | 전문 vector/완전 CMS | D | 전체pathboolean·고급drawing·CMS는 후속/범위밖. 기본SVG안전import와richtext는현재필수 |

### Preview·검토·저장·연결

| ID | 근거·분류 | 기능 | 상태·현재 근거 | 남은 작업과 완료 관찰 |
| --- | --- | --- | --- | --- |
| PV01 | UX07, QAL02 · F | design/candidate/lastverified 구별 | P · UI designsimulation/미실행ZIP badge | 별도 source/revision/hash/environment/freshness, AI탐색후보/실제후보/lastverified 동시 비교, 실패후마지막유효본 보존 |
| PV02 | UX07, OPS01 · F | preview sandbox·geometry channel | M · 현재 trusted Reactpreview 같은앱 | origin/revision/schema검사bridge, 후보code/asset격리, secret/권한노출 없음; stale geometry/preview 실패 recovery |
| PV03 | UX07, CMP04 · F | forced state·외부응답 mock | P · Buttondisabled/Toastaccept/decline·count | delay/다른확정값/observedstate강제/clock controls, mock임을표시, 계약값의실제owner침범없음 |
| PV04 | UX07 · F | Screen·Scenario authoring | P · SCH필드/로컬참조만 | inlineinstances와theme/asset/layout Screen, 별도Scenario초기값/event/mock/trace/expectation, prototype links·sharedstepbudget |
| PV05 | UX07 · F | native 실제preview 연결 | M · Mobile폭근사와native소스 | QR/devclient/Host simulator/device, 실제environment receipt, 근사/실행 정확도 표시·전환, unsupported연결 명시 |
| PV06 | UX07 · F | share·예제app pack | M | revision고정 previewlink권한/만료/회수, example sources/assets/mock/routes 소유권과export; 사용자업무API 포함금지 |
| RV01 | ARC03, UX01/05 · F | transient→review→원자apply | B · CTRL/KRN/TEST | 현재 편집범위의 base/digest/auth 고정·오류전체거절·1Undo 유지. gesture/bulk/새도메인명령도같은경로여야 함 |
| RV02 | ARC03 · F | 동일 요청 재생·lost reply | B · KRN/STORE/TEST | 동일principal/project/key/request는원receipt, stale후에도추가revision/예산/외부효과없음; 미확정다른시도자동발급금지 |
| RV03 | ARC03, UX01, DLV04 · F | 충돌 비교·선택 적용 | P · 전체stale거절/rebase·전체후보approve | before/current/proposed 시각diff, 안전항목선택 시새closure/digest/review; 현재wholecandidate를partialhunk지원으로표시금지 |
| RV04 | ARC03, UX08 · F | Undo/redo·history | P · localdurableundo/redo·shortcut | historytimeline/origin/labels, source·draft·gesture별일관성. realtime개인Undo와sharedrevert는후속별도 |
| RV05 | SYN04 · F | source 오류초안·왕복 | B · source tab/KRN 원문capture/export | valid원본·오류·unknown영역 보존의현재경로유지; 목록에서모든draft다시열기/원본비교/실패candidate복구 UX는추가 필요 |
| RV06 | SYN02/04 · F | 프로젝트 import/copy/bundle | P · KRNbundle/API·UI다운로드만 | GUI파일/bundle열기·identitycopy/refMap/update선택·복수workspace관리; 같은이름자동overwrite금지 |
| RV07 | SYN04, GOV03 · F | 등록된 migration pair/lossreport | M · 채택된실제old/newpair없음 | 실제pair가생길때source/digest/precondition/ops/inverse/loss/target/userchoice포함해review. 빈framework를완료로계산금지 |
| SV01 | ARC04 · F | durablebrowser/Node store | B · STORE와fault/concurrency시험 | process-crash/IndexedDBcomplete 범위유지. power-loss·eviction·모든browser를확대claim하지않음 |
| SV02 | ARC04 · F | 공간부족·권한회수·내보내기복구 | P · codederrors·retry·pending후보 | quota/blocked/권한회수 시 unsaved/마지막유효본·경로이동·export·재시작복구를GUI에서실제완료 |
| SV03 | ARC04 · F | 외부ADS파일 watch·merge | M · Nodejournal≠사용자ADS폴더watch | filehash관찰→before/current/proposed→review, rename/delete/권한회수·reconnect·실제폴더원문보존 |
| SV04 | ARC04, PRD02 · F | prepared offline/internalAI | M · localcore가능은pack실증아님 | assets/font/deps/tools/registry/endpoint준비manifest→network차단→restart→편집/검사/출력/internalAI동작 |
| SV05 | ARC05 · D | realtime 협업·presence·개인Undo | D · stableID/revision/충돌기반만 | 실제sync/conflict/lease/privatecamera/sharedrevert 실증. 현재local동시연결시험을협업완료로확대하지않음 |
| SV06 | ARC04, SEL05 · F | 이력정리·복구한계 | P · finitejournal/canonicalcaps | checkpoint/export/compaction·보존refs정책, hardcap도달예고·자료유실없는정리. 안전cap을제품capacity약속으로사용금지 |
| HC01 | ARC06, OPS01 · F | Browser↔Host 연결 | M | originchallenge/승인root/toolinventory/version/lease·job범위, disconnect후jobstatus·receipt복구; 바탕화면앱이곧제품Host는아님 |
| HC02 | ARC06, OPS01 · F | 격리된 실행 job | M | 승인jobplan/allowlist/network/timeout/budget/candidatearea/effects/rollback, sandbox없으면실행불가, 임의buildersecret접근금지 |

### AI·공식 API·타깃·전달·품질

| ID | 근거·분류 | 기능 | 상태·현재 근거 | 남은 작업과 완료 관찰 |
| --- | --- | --- | --- | --- |
| AP01 | ARC07 · F | 공식 API/MCP 전체표면 | P · corepublicAPI/CLI7commands | catalog52command/10query transport와version/auth/pagination/parity, token/Part/behavior등typedoperation. document.import범용탈출로52구현합산금지 |
| AP02 | AI01, ARC07 · F | ContextBundle·AI 제공자 | M | selection+refclosure+pinnedrevision+capabilities+allowedoperations+budget, officialBYOK/local/internalendpoint·secretstore·오류/비용UI |
| AP03 | AI02 · F | 구현후보·독립oracle·한도 | M · deterministictemplate와고정test분리기반만 | immutablecontract/TestPlan/discovery/oracle vsAI권한, attemptbudget·cancel·lastverified·실패후보보존, test삭제/skip/expectation변경차단 |
| AP04 | BIZ02, ARC07 · N,F | hosted entitlement·과금receipt | N · 유료서비스현재없음 | 가격/무료한도owner결정, 원자budgetreservation·effectreceipt, unknownpaidoutcome후자동새chargedattempt금지; localread/export유지 |
| TG01 | DLV01 · F | React/CSS 3종 출력 | B · TGT/TEST | 실제React소비types/SSR/hydration/pointer/keyboard/customToasthost 범위. 다른archetype/provider/AT/RSC는포함안됨 |
| TG02 | DLV01 · F | RN Expo 3종 출력 | P · TGT실제TS/HermesAndroid+iOSbundle | emulator/devicecontrols/IME/VoiceOver/TalkBack·host수명실행, bundle완료를native조작성pass로합산금지 |
| TG03 | DLV01 · F | SwiftUI·Compose 출력 | P · TGT실제source/package | Apple/Androidcompiler+simulator/device/AT·resources·cleanup, 도구없는환경은notRun/blocked. 생성파일존재만pass금지 |
| TG04 | DLV01, annex target · F | 전체8target/style profile | P · 4sourcegenerator | ReactSCSS/Tailwind/선정CSS-in-JS, bareRN 추가, 정확version/deps/SSR/RSC/scan등각환경검사; 전체cartesian조합약속아님 |
| TG05 | PRD03, DLV01 · F | Axiom+선택제공자pack | M · custombuiltin만 | ReactAria/BaseUI/shadcn 차이/권리/behavior/style/deps manifest와실제oracle, native대응 목적명시 |
| TG06 | DLV01, QAL01 · F | 전체카탈로그×적용profile 의무 | M · 아래239inventory참조 | 매provider변형의목적/Part/ports/state/input/a11y/motion/API/loss/실제evidence, 복잡군·utility도N/A로삭제금지 |
| DL01 | DLV02 · F | init·환경감지·실제doctor | P · DLV파일hash계획/doctor | framework/dirs/aliases/provider/depslock감지+수동mapping→installplan→실제build/sample. generatedRelease와installedRelease분리 |
| DL02 | DLV03 · F | 4deliverymode | P · UI4targetZIP, DLV소스폴더 | sourcefolder/directappcopy/usernpm/Gitlibrary 각각검토·복원·설치흐름. 네타깃버튼은네전달방식이아님 |
| DL03 | DLV03, BRD02 · F | 완결artifact·rights·ownership | P · TGTownedsource/manifest/notices | 실제dependency·assetclosure와선택권리record고지, 공개artifactimport폐쇄, 구독종료후사용·noSaaSruntime유지 |
| DL04 | DLV04 · F | 사용자수정3-way upgrade | B · DLV전체파일현재baseline/hash/충돌 | whole-file한정보존·stale·apply/rollback/recovery유지, GUI연결/선택hunk/이름변경·dependency/provider분리review는추가 |
| DL05 | DLV04 · F | partialhunk·여러connection·rollback | P · DLVconnectionreceipt/whole-file | hunk부분baseline보류정보, app별version/mixed상태·시험·후속upgrade, rollback후새사용자수정보존·환경snapshot |
| DL06 | DLV03, OPS03 · F | 실제publish·supplychain | P · sourceexport만 | npm/Git게시별명시범위·권리·version·artifact검증/실패receipt; 정본문서Undo가외부publish를취소한다고표시금지 |
| QA01 | QAL01/02 · F | 요구→oracle→evidence 탐색 | P · staticfixture+실증문서 | component/trait/target/requirement UI, setup/stimulus/expected·환경/fixture/oraclehash·timestamps·observations, codehash에연결된freshness |
| QA02 | QAL01/02/04 · F | release 판단·manual gate | P · 시험runnerzero-skip·notRunbadge | both자동/수동분리, missing/discoveryempty/waived/stale인경우전체pass금지; 전체profile다시실행, exactartifact와검증본연결 |
| QA03 | UX08, QAL01 · F | Studio keyboard·AT·KO/EN | P · UIshortcuts/dialog/tab·locale/CDP | deepselect/move/resize/reorder/tokencreate/bulk/설치까지keyboard, macOS/Windows실제IME·AT, longstrings/textscale/narrow, 모든진단번역 |
| QA04 | QAL03, OPS02 · F | 성능·관측·support | P · regression/logs·bound | 실제workload p95/memory/coldwarm/cancel·resource, optindiagnosticbundle/최소repro·복원runbook, redaction·보관지역/기간선정 |
| QA05 | BIZ03/04, PRD02 · N,F | 실제사용자여정·출시주장 | N · 구현회귀는고객조사아님 | consent/revision/environment/time/help/포기/repro 실제관찰. 문구·가격·성공률·native완료를연구가설에서사실로올리지않음 |

### 이번 디자인 재설계와 추가 사용성 기대

아래는 Foundation의 명시 계약과 이번 사용자 요청을 분리한 제품 결정 목록이다. 새로운 색·서체·spacing 값을 Foundation이 이미 승인한 값인 것처럼 적지 않는다. 기능 공백을 화면 미관 교체만으로 닫지 않는다.

| ID | 근거·분류 | 기능 | 상태·현재 근거 | 남은 작업과 완료 관찰 |
| --- | --- | --- | --- | --- |
| DS01 | 이번 사용자 · U | Axiom 자체 DS 전면 재설계 | M · VIS기존greenpalette·CSSvariables+직접값 | 제품용역할색/spacing/type/radius/border/motion/focus/상태 token 정의, 공통button/field/dialog/tab/tree/table/toolbar/empty/error primitives, 실제화면일괄적용 |
| DS02 | UX01/08 · F + E | 도구 중심 정보위계·가독성 | P · 3column기반, 9~12px설명다수 | canvas/선택/Inspector우선, 기술ID는필요시상세, 충분한대비·읽기크기·터치target. 실제zoom/200%/긴KOEN검사, 측정없는a11y점수금지 |
| DS03 | 일반 편집기 · E | panel resize/collapse·layout 기억 | M | keyboard등가separator와min/max, 좁은화면에서핵심명령/선택탐색유지; 선호layout은세션설정, 도메인정본에저장안함 |
| DS04 | 일반 편집기 · E | zoom preset/fit selection·손도구 안내 | M | CV01필수camera위에서100%/fit/all/selection, shortcuthelp/발견성. 모든일반툴shortcut이기존Foundation고정명세인것은아님 |
| DS05 | 일반 편집기 · E | command palette·최근/즐겨찾기 | M | 전역command검색, recentobjects, 명확한범위와disabled이유. metadata모든필드를검색노출하여secret경계를넓히지않음 |
| DS06 | UX08 · F + E | narrow/mobile에서동등작업 | P · VIS재배치하나일부nav/export숨김 | 850px의projectexport·560px의Part목록숨김에동등접근경로, inspectordrawer/tab등선택안전, reviewapply/취소항상접근 |
| DS07 | 일반 편집기 · E | 진행·취소·오류의 일관된 피드백 | P · CTRLbusy/dirty/retry | 무거운검사/preview/export진행·취소, 저장실패와검사실패구분, empty/loading/error/staleoffline계층과복구동작통일 |
| DS08 | OPS04, BIZ04 · F + U | 자체 DS 실제 사용 검증 | M · 별도brief/primitive계약없음 | Axiom자체화면을새DS의실제소비자로전환, componentstate inventory·contrast/keyboard/반응형회귀, 사용자선택편집여정실제관찰 |

## 즉시 구현 순서와 완료 경계

1. **탐색과 선택 기반:** ED04~08, CV01~02, DS01/02/06. 카탈로그 탐색·객체 selection·context Inspector·camera를 같은 stable ID와 세션 상태에 연결한다. 사용자가 body를 선택했는데 component 전체 문자열만 바꾸는 현 UX를 먼저 해소한다.
2. **Foundation 관리 완결 흐름:** FT01~04/06/07/09/10. token/type/domain/tier/theme CRUD와 검색/bulk/usage를 기존 review/apply/Undo/store에 연결한다. 타입별 지원표를 유지하며 DTCG 전체 미지원은 그대로 추적한다.
3. **실제 내부 작성 모델:** CP02/03/08~10/19, CV03~11, TX01~03. 구조·slot·instance·layout·appearance를 source와 4target의 같은 검증 경로에 연결한다. 이름만 많은 template 카드로 대체하지 않는다.
4. **카탈로그 family별 의미 확장:** CP04~07/11~17/20~24와 TG05/06. command/binary/field/collection/overlay부터 공통 oracle를 재사용하되 239항목과330variant의 고유 의무를 잃지 않는다. dates/chart/rich-editor/schedule/utility는 별도 계약과 일정으로 남긴다.
5. **저장·연결·전달/실행:** ED02, SV02~04, HC01/02, PV02/04~06, AP01~03, TG02~04, DL01~06. 기존 Node CLI가 GUI Host·offline·doctor를 대체하지 않는다. 네이티브 compile/device/AT가 없으면 미완료 상태 유지.
6. **전체 release gate:** QA01~05. 실제 환경·접근성·IME·성능·사용자 과제와 모든 필수 profile 결과를 결합한 뒤 G5를 판단한다.

이 순서는 범위 축소나 새 대기 승인 요구가 아니다. 이번 사용자는 확장을 지시했다. 구현자는 안전한 encoding/세부설계를 ADR에 고정하며 진행할 수 있고, Foundation의 명시 후속 기능·미정 사업 조건과 필수 미완료를 구별해야 한다.

**용량 선결 조건:** 현재 Studio 64 component/32 ThemeSet/128 appearance rule, source 1MiB/문서, 64문서/8MiB batch, projection 8MiB 경계가 있다. 239항목 전부를 독립 component+Web/Mobile로 한 번에 만들면 Foundation 포함 718문서가 되어 현재 batch 한도를 넘는다. part/template/utility를 component로 오분류하는 문제도 생긴다. 카탈로그는 지연 탐색·필요시실체화·분할된원자생성/지원profile로 설계해야 하며, 원자성·오류경계 확인 없이 cap만 늘리는 것은 해결이 아니다. S/M/L 수치는 제안 상태여도 실제 239카탈로그 탐색과 주요 편집이 가능한 제품 용량은 입증해야 한다.

## 전체 문서 검토 원장

아래 표는 본문을 모두 읽었다는 원장이다. 상태는 `READ_COMPLETE`이며 오른쪽은 구현 공백을 추적할 기능 ID다. 본문 완료 조건은 문서 설명의 완결성 조건이므로 제품 기능 pass와 다르다.

| ID · 본문 | 검토 | 확인한 계약 | 기능 원장 |
| --- | --- | --- | --- |
| [GOV01 · 문서 권위와 변경 승인](../foundation/governance/authority-and-change-control.md) | READ_COMPLETE | 규범 소유·사용자 결정·범위별 증거, 구현과 검증의 구분 | RV01, RV02, QA02 |
| [GOV02 · 제품·도메인 용어와 이름](../foundation/governance/glossary-and-naming.md) | READ_COMPLETE | Studio/ADS/DSF, Part/Slot/variant/state/condition, 5 provider 의미와 KO/EN | ED06, ED10, ED11, QA03 |
| [GOV03 · 버전·호환·deprecated 정책](../foundation/governance/version-and-compatibility.md) | READ_COMPLETE | schema/public API/project/registry/delivery 버전, breaking/deprecation/migration | CP23, RV07, DL05 |
| [PRD01 · 제품 목적·대상 사용자·핵심 문제](../foundation/product/purpose-and-users.md) | READ_COMPLETE | 소규모 팀의 내부 DS 작성에서 사용자 소유 코드 설치·반복 업그레이드까지 | ED01, ED02, CP01, DL01, DL02 |
| [PRD02 · 처음부터 설치까지의 사용자 시나리오](../foundation/product/journeys-and-acceptance.md) | READ_COMPLETE | J01~J08 전체 여정: token/Card/AI/설치/upgrade/offline/stale/native근사 | ED01, ED03, FT01, CP09, AP02, SV04, DL01, DL04, QA05 |
| [PRD03 · 초기 범위·카탈로그·제품 확장 경계](../foundation/product/scope-catalog-and-roadmap.md) | READ_COMPLETE | 239 전체 항목·4 기술·적용 style/선택 팩 필수, 3종은 private alpha 시작점 | CP01, CP24, TG04, TG05, TG06, TX07, SV05 |
| [BIZ01 · 오픈 코어·소스·산출물 권리](../foundation/business/open-core-and-rights.md) | READ_COMPLETE | 공개 core/비공개 Studio/출력 권리, 구독 종료 뒤 사용자 source 권리 | DL03, AP04, QA05 |
| [BIZ02 · 무료·유료 경계와 운영 원가](../foundation/business/pricing-entitlements-and-economics.md) | READ_COMPLETE | 가격·좌석 가설과 실제 자원 원가, paid attempt/operation receipt 및 unknown outcome | AP04, AP02, QA04 |
| [BIZ03 · 포지셔닝·마케팅·출시 메시지](../foundation/business/positioning-and-go-to-market.md) | READ_COMPLETE | 근거 있는 포지셔닝·튜토리얼·설치 사례, 역수입/픽셀동일/미실행 native 과장 금지 | QA05, TG02, TG03 |
| [BIZ04 · 사용자 조사·제품 검증·고객 피드백](../foundation/business/research-and-customer-feedback.md) | READ_COMPLETE | 동의한 실제 연구 세션·성공/포기/도움·환경/revision·관찰, 가짜 metric 금지 | QA05, DS08 |
| [BRD01 · Brand Library와 사용 지침](../foundation/brand/library-and-guidelines.md) | READ_COMPLETE | 독립 versioned BrandLibrary·guide·선택 수치 규칙과 사용 영향 | TX06, DL03 |
| [BRD02 · 자산 저장·출처·권리·배포](../foundation/brand/assets-and-provenance.md) | READ_COMPLETE | 실제 blob과 immutable source/license record 분리, rights/alt/closure/relink/security | TX04, TX05, DL03 |
| [SYN01 · ADS와 토큰 표준 선정 계약](../foundation/syntax/standard-strategy.md) | READ_COMPLETE | DTCG A/B/C 전 기능·각 단계·4 target·비용 비교, 원문 보존만으로 지원 주장 금지 | FT05, FT06, FT08, FT12, FT13, FT14 |
| [SYN02 · 프로젝트 문서·ID·참조·수명](../foundation/syntax/project-documents-and-identity.md) | READ_COMPLETE | 다문서 identity/ref/pins·복사/삭제·세션 분리·unknown registry 보존 | ED10, CP10, CP22, CP23, RV06, SV03 |
| [SYN03 · DSF·토큰·테마·사용자 정책](../foundation/syntax/foundation-and-token-semantics.md) | READ_COMPLETE | type/domain/tier 분리, alias/context/provenance, 실제 정책·예외 | FT01, FT02, FT05, FT07, FT09, FT11 |
| [SYN04 · 가져오기·원문 보존·migration](../foundation/syntax/interchange-and-migration.md) | READ_COMPLETE | 원본/오류/opaque/해석 분리, duplicate import mapping, actual migration/loss/inverse | FT12, RV05, RV06, RV07 |
| [CMP01 · 컴포넌트 정의 계층과 디자인 범주](../foundation/components/definition-and-designs.md) | READ_COMPLETE | 목적/trait/public/structure/behavior-a11y-motion/design/evidence 일곱 관점 | CP02, CP03, CP19, QA01 |
| [CMP02 · trait·role·유형과 조합](../foundation/components/traits-roles-and-archetypes.md) | READ_COMPLETE | family≠archetype/trait/role/policy, typed ports/writer/input/의무/version 조합 | CP04, CP07, CP11, CP23 |
| [CMP03 · 값·이벤트·props·UI 표현식](../foundation/components/values-events-and-expressions.md) | READ_COMPLETE | TypeExpr와 default absent/null, 제한 Expr/UIEffect, public name/API 및 event phase | CP05, CP06, ED10 |
| [CMP04 · 상태 소유권과 요청 수명](../foundation/components/state-and-request-lifecycle.md) | READ_COMPLETE | local/consumer/runtime owner, request lifecycle, presence/query/selection, bounded queue/generation | CP07, PV03, CP16 |
| [CMP05 · Part·slot·인스턴스·override](../foundation/components/parts-slots-and-instances.md) | READ_COMPLETE | Part/node/Slot/replaceablePart, cardinality/contents/instances/override와 원본 삭제 | CP08, CP09, CP10, TX01 |
| [CMP06 · 동작·입력·기반 라이브러리 계약](../foundation/components/behavior-and-input-profiles.md) | READ_COMPLETE | behavior base/profile, raw input→semantic event, input claim, protected customization/fork | CP11, CP12, CP04 |
| [CMP07 · 공동 UI 호스트와 조정자](../foundation/components/coordinators-and-hosts.md) | READ_COMPLETE | 8 coordinator 종류, explicit host scope/lifetime/path/queue/cleanup·누락과 모호함 | CP13, PV03, HC01 |
| [CMP08 · 접근성 의미·관계·준수 계약](../foundation/components/accessibility-contracts.md) | READ_COMPLETE | 이름·관계·읽기/focus·입력·공지·대비·실제 AT, 정책으로 의무 삭제 불가 | CP14, CP15, CV10, QA03 |
| [CMP09 · 모션·전환·중단 의미](../foundation/components/motion-and-transitions.md) | READ_COMPLETE | 기본 motion/keyframe/spring/interruption/reduced/cleanup은 필수, 고급 track은 후속 | CP16, CP17, CP18 |
| [CMP10 · 외형 규칙·조건·우선순위](../foundation/components/appearance-conditions-and-precedence.md) | READ_COMPLETE | variant×Part×state, priority/refines/동점, environment unknown, provenance/reset/promote | CP19, CP20, CP21, FT10 |
| [CMP11 · 사용자 확장·등록·승격](../foundation/components/custom-definition-registry.md) | READ_COMPLETE | registry local→project→library, custom 4수준·declarative Inspector, 지원 단계 분리 | CP22, CP23, CP04 |
| [UX01 · 작업 공간·온보딩·Inspector·도움말](../foundation/experience/onboarding-and-inspector.md) | READ_COMPLETE | 동등 시작·빈 selection·맥락 Inspector·학습·review·출력 연결의 전체 UX | ED01, ED02, ED03, ED04, ED05, ED06, ED11, ED12, RV03 |
| [UX02 · Canvas 선택·좌표·직접 조작](../foundation/experience/canvas-and-direct-manipulation.md) | READ_COMPLETE | 선택/좌표/zoom/회전/이동/resize/다중/스냅/잠금/그룹과 gesture transaction | ED07, ED08, ED09, CV01, CV02, CV03, CV04, CV05, CV06, CV11 |
| [UX03 · 시각적 레이아웃 편집](../foundation/experience/layout-authoring.md) | READ_COMPLETE | hug/fill/fixed, flow/stack/grid/free, 제약·자동 순서·대체 입력·의미 순서 | CV07, CV08, CV09, CV10, CV04 |
| [UX04 · 텍스트·폰트·벡터·이미지 편집](../foundation/experience/text-and-asset-editing.md) | READ_COMPLETE | 기본 rich text/IME/history/paste/font·실제 asset 최소 편집, 전문 vector 후속 | TX01, TX02, TX03, TX04, TX05, TX07 |
| [UX05 · 토큰·테마·정책 편집 UX](../foundation/experience/foundation-editor.md) | READ_COMPLETE | token CRUD/분류/typed editor/alias·usage/theme 비교·bulk 재선택·원자 Undo | FT01, FT02, FT03, FT04, FT06, FT07, FT09, FT10, FT11 |
| [UX06 · 컴포넌트·동작·접근성·모션 편집 UX](../foundation/experience/component-editing-panels.md) | READ_COMPLETE | 내부 structure/appearance/value/state/behavior/a11y/motion panels·실제 내부 편집 | ED06, CP05, CP07, CP08, CP12, CP14, CP16, CP17, CP19 |
| [UX07 · 즉시 preview·검증 화면·프로토타입](../foundation/experience/preview-and-prototypes.md) | READ_COMPLETE | design/후보/검증본·sandbox/native·Screen/Scenario·mock/prototype/share/source pack | CP10, PV01, PV02, PV03, PV04, PV05, PV06 |
| [UX08 · Studio 접근성·언어·입력 품질](../foundation/experience/editor-accessibility-and-language.md) | READ_COMPLETE | keyboard/AT 동등 여정·모드/selection 공지·dialog focus·KO/EN/실제IME·narrow | ED09, ED11, TX02, QA03, DS02, DS06 |
| [ARC01 · 시스템 문맥·도메인·핵심 흐름](../foundation/architecture/system-and-domain-boundaries.md) | READ_COMPLETE | 중립 core·같은 command·source snapshot과 session/preview/runtime/검증/전달 분리 | RV01, AP01, PV02, DL03 |
| [ARC02 · 모듈·저장소·의존 방향](../foundation/architecture/modules-and-dependencies.md) | READ_COMPLETE | 공개 seam/import 경계, DOM/SVG/worker/text/storage/schema 실제 workload | CV02, CV12, TX02, AP01, DL03 |
| [ARC03 · 명령·트랜잭션·revision·Undo](../foundation/architecture/commands-revisions-and-undo.md) | READ_COMPLETE | 52 typed command, scope/digest/revision/receipt/원자성/Undo·외부 효과 별도 | RV01, RV02, RV03, RV04, AP01 |
| [ARC04 · 저장·오프라인 팩·복구](../foundation/architecture/storage-offline-and-recovery.md) | READ_COMPLETE | browser/folder 저장·journal/watch/recover/quota/checkpoint/offline preparation | ED02, SV01, SV02, SV03, SV04, SV06 |
| [ARC05 · 후속 실시간 협업을 위한 구조](../foundation/architecture/collaboration-readiness.md) | READ_COMPLETE | stable ID/revision/privatecamera 준비, 실제 realtime·sharedrevert/개인Undo는 후속 | SV05, RV04, ED08 |
| [ARC06 · 브라우저·로컬 Host·실행 경계](../foundation/architecture/browser-host-and-execution.md) | READ_COMPLETE | Browser/Host 동등 선택, pairing/root/tool/job/effect/격리·offline·macOS 도구 | ED02, HC01, HC02, PV05, SV04 |
| [ARC07 · 공식 API·MCP·확장·사용권 경계](../foundation/architecture/public-api-mcp-and-entitlements.md) | READ_COMPLETE | 공식 API/MCP/version/auth/capability/query limits·core 권한 변조 금지 | AP01, AP02, AP04, RV01 |
| [AI01 · AI 작성·컨텍스트·공급자 연결](../foundation/ai/authoring-context-and-providers.md) | READ_COMPLETE | 선택 closure/고정 context/budget·official BYOK/local/internal provider·secrets/failure | AP02, AP04, SV04 |
| [AI02 · AI 코드 실현·후보·독립 판정](../foundation/ai/realization-and-independent-verification.md) | READ_COMPLETE | AI candidate 제한, 독립 contract/TestPlan/oracle/discovery, budget/lastverified/actual evidence | AP03, PV01, QA01, QA02 |
| [DLV01 · 타깃·스타일·동작 기반 지원표](../foundation/delivery/target-and-style-profiles.md) | READ_COMPLETE | 4 기술·8 applicable profile family·자연스러운 API와 단위/색/font/motion/a11y | TG01, TG02, TG03, TG04, TG05, TG06, FT13 |
| [DLV02 · 소비 프로젝트 init·doctor](../foundation/delivery/project-init-and-doctor.md) | READ_COMPLETE | 실제 환경감지/수동 mapping/설치계획/build/sample doctor와 installed/mixed 구분 | DL01, HC01, DL05 |
| [DLV03 · 사용자 소유 코드·패키지·배포](../foundation/delivery/user-owned-library-and-packaging.md) | READ_COMPLETE | 소스폴더/직접복사/npm/Git·native package·closure/notices/API/소유권/clean consumer | DL02, DL03, DL06 |
| [DLV04 · 사용자 수정 diff·업그레이드·rollback](../foundation/delivery/diff-upgrades-and-rollback.md) | READ_COMPLETE | immutable gen baseline/current/new, selected hunk/partial·consumer별 상태·rollback | DL04, DL05, RV03 |
| [QAL01 · 검증 요구·oracle·자동/수동 검사](../foundation/quality/conformance-and-test-plans.md) | READ_COMPLETE | 독립 requirement/setup/trace/oracle·모든 적용 의무·자동/수동·zero-skip/negative fixtures | QA01, QA02, QA03, TG06 |
| [QAL02 · 검증 증거·freshness·추적성](../foundation/quality/evidence-and-freshness.md) | READ_COMPLETE | closure/source/deps/fixture/oracle/profile/environment/time/observations·계산된 freshness | QA01, QA02, PV01 |
| [QAL03 · 성능·규모·비용 예산](../foundation/quality/performance-capacity-and-budgets.md) | READ_COMPLETE | S/M/L와p95 목표는 제안, 실제 cold/warm/memory/cancel/자원 비용·최적화 | CV12, QA04, SV06 |
| [QAL04 · 제품 출시 기준과 전체 지원](../foundation/quality/release-readiness.md) | READ_COMPLETE | G0~G5: 문서 baseline·private alpha가 전체 editor/catalog/native/AI/offline 출시 아님 | QA02, QA03, QA05, TG06, SV04 |
| [OPS01 · 보안·데이터·비밀정보 관리](../foundation/operations/security-and-data-boundaries.md) | READ_COMPLETE | origin/root/auth/JSON/preview/SVG/URL/archive/secret·사고회수·출처 검사 | HC01, HC02, PV02, TX05, AP02 |
| [OPS02 · 호스팅·운영·진단·장애·지원](../foundation/operations/hosting-observability-and-support.md) | READ_COMPLETE | 계정 없는 local core·최소 서비스/비식별 opt-in 관측·지원/복원·보관/지역 미정 | QA04, AP04, SV02 |
| [OPS03 · 릴리스·배포·의존성 공급망](../foundation/operations/release-and-supply-chain.md) | READ_COMPLETE | dependency/template/asset license+hash·install scripts/clean artifact·부분게시와 provenance | DL03, DL06, QA02 |
| [OPS04 · 지속 개발·유지보수·인수인계](../foundation/operations/development-and-maintenance.md) | READ_COMPLETE | 사용자 가치 vertical로 진행하되 전체 필수 catalog/native 유지·fake completion 금지 | DS08, QA05, QA04, CP01 |

## 카탈로그 전체 범위와 의미

원본은 [component-catalog.json](../foundation/annexes/component-catalog.json)과 [catalog-and-obligations.md](../foundation/annexes/catalog-and-obligations.md)이다. 원본조사일은 2026-09-11이며 최신 제공자 전체 실행 감사가 아니다. 330 원본 행을 공백·구분자·대소문자만 정규화한 239 ID이고, 서로 다른 이름의 의미 유사성을 근거 없이 합치지 않았다. `providerVariants`의 계약 차이를 유지한다.

- **Component 209:** 독립 UI 목적. 같은 family라도 checked/mixed/pressed, command/navigation, query/selection, table/grid 등의 의미는 별도다.
- **Part 6:** compound 부품/보조 control. 단독 완제품과 같은 contract나 생성 UI를 강제하지 않는다.
- **Template 16:** 여러 목적의 구성. 하위 부품·상태·layout·자료입력 연결의 계약이 필요하다.
- **Utility 8:** 환경·실행 지원. 일반 시각 component의 screenshot으로 인증하지 않고 scope/host/lifetime/동등native목적을 확인한다.

기준점의 `catalog.button`, `catalog.card`, `catalog.toast`는 **Axiom builtin 한정 부분 구현**이다. 같은 이름의 React Aria/Base UI/shadcn/Mantine variant를 구현한 것으로 인정하지 않는다. 다른 236항목은 baseline에서 실행 가능한 Studio profile이 없다. 이것은 3/239=제품완료율을 뜻하지 않는다. 각 항목의 복잡도·타깃/의무가 다르고 세 항목에도 미완료가 있다.

각 행 완료에는 목적/타입·public API/trait·role·slot/owner·input·host/a11y·motion/layout·appearance/실제targetmapping/독립oracle와evidence가 필요하다. Utility의 native 대응을 N/A로 지워 범위를 줄이지 않는다. 카탈로그의 raw `NOT_IMPLEMENTED` 필드는 역사적 문서 상태이며 아래 `baseline` 판정과 구분한다.

### 45 family의 구체화 조건

family는 탐색과 oracle 재사용의 시작점이다. registry의 `traitCandidates`는 모든 멤버의 필수 trait가 아니다. plain Card에는 업무 상태나 activation을 강제하지 않고 timer/async-status는 목적이 있을 때만 opt-in한다.

| family | 의미·시작점 | 서로 합치면 안 되는 구체화 조건 | 항목 연결 수 |
| --- | --- | --- | --- |
| command · 명령 버튼 | 무엇인가 실행한다 | 순수 명령과 클립보드·파일 선택 같은 외부 효과를 분리 | 5 |
| binary-choice · 켜짐·선택 상태 | 두 상태 또는 허용된 중간 상태를 바꾼다 | checked·mixed·on/off·pressed 의미가 달라 구체 archetype은 구별 | 6 |
| choice-group · 선택 그룹 | 여럿 중 하나 또는 여러 개를 고른다 | 단일/복수 값 타입과 선택-포커스 결합 정책 고정 | 5 |
| text-field · 문자 입력 | 문자를 입력하고 수정한다 | OTP·mask·JSON·password는 별도 편집/형식 profile 필요 | 11 |
| number-field · 숫자 입력 | 문자로 숫자를 넣거나 증감한다 | 미완성 숫자 문자열과 확정 수치 분리 | 2 |
| range-control · 연속 값 조절 | 손잡이·별점·원형 조작으로 수치를 고른다 | 단일/다중 thumb·별점·각도는 동일 semantic role로 합치지 않음 | 4 |
| color-control · 색 입력과 선택 | 색상과 채널을 조작한다 | 2차원·원형 채널 조작의 타깃별 대안과 색 공간 필요 | 9 |
| temporal · 날짜·시간 입력 | 날짜·시간·기간을 고른다 | 표시 전용 달력/입력/기간·popup 유무·시간대는 구체 profile | 19 |
| file-intake · 파일 선택 | 파일을 선택하거나 떨어뜨린다 | 파일 선택·표시 UI와 외부 요청 연결만 포함. 실제 업로드·업무 검사는 소비 앱 소유 | 4 |
| list-choice · 목록에서 선택 | 후보 목록에서 값을 고른다 | native select·popup list·상시 목록은 타깃/profile 구별 | 4 |
| query-choice · 검색하며 선택 | 문자를 입력해 후보를 좁힌다 | 자유 입력 허용·선택값 결합·검색만 제공하는 도구인지 판정 | 2 |
| token-choice · 복수 값과 토큰 | 여러 선택값을 토큰으로 표시·삭제한다 | TagGroup처럼 입력 없는 변형, freeform 값 생성 허용 분리 | 6 |
| hierarchical-choice · 계층에서 선택 | 부모/자식 후보에서 값을 고른다 | 상위/하위 선택 전파와 query 결과의 경로 표현 필요 | 2 |
| field-container · 입력의 이름·설명 묶음 | 입력과 이름·오류를 연결한다 | 부품만 제공하는 Label과 완성된 필드를 구분 | 5 |
| form-flow · 폼과 단계 작업 | 여러 입력을 검토하고 제출한다 | 폼 제출과 다단계/조건 분기를 구체화 | 2 |
| disclosure · 접기와 펼치기 | 화면 일부를 드러내거나 접는다 | 단일 영역/그룹·여러 개 열기·잘린 텍스트 펼치기 구분 | 6 |
| floating-surface · 떠 있는 작업 영역 | 기존 화면 위에 추가 영역을 놓는다 | 외형명으로 modal 여부를 추정하지 않고 목적·타깃 profile 선택 | 6 |
| modal-task · 집중 작업 창 | 배경 작업을 잠시 멈추고 처리한다 | 일반 modal과 응답이 필요한 alert dialog의 의무 구별 | 2 |
| context-help · 문맥 도움말과 미리보기 | 다른 요소의 설명·미리보기를 제공한다 | 설명 전용과 interactive preview는 서로 다른 archetype | 4 |
| command-menu · 명령 목록 | 명령 중 하나를 실행한다 | 선택값 목록과 명령 목록 구별; submenu·context trigger profile | 4 |
| search-command · 명령 검색 | 찾은 명령을 실행한다 | 값 선택용 combobox와 command 실행을 구별 | 2 |
| navigation · 위치 이동 | 위치·페이지·문서 경로를 이동한다 | 링크 이동·로컬 pagination·진행 표시만 하는 Stepper를 구별 | 11 |
| tabs · 연결된 패널 전환 | 탭과 해당 내용을 연결한다 | 자동 활성화와 명시 활성화는 지연/환경에 따라 판정 | 1 |
| control-group · 명령부 묶음 | 관련 조작을 묶어서 제공한다 | 단순 시각 그룹과 toolbar의 키보드 조정을 구별 | 3 |
| tabular · 표와 조작 가능한 격자 | 행·열의 자료를 읽고 필요하면 조작한다 | 정적 table과 interactive grid를 구분; 정렬/편집/선택 별도 | 2 |
| tree · 계층 목록 | 계층 자료를 펼치고 탐색한다 | 읽기/선택/이동 목적과 노드별 상태를 분리 | 2 |
| content · 내용과 서체 | 글·숫자·내용을 표현한다 | 숫자/코드 포맷·내용 의미·장식의 subtype 필요 | 15 |
| surface · 콘텐츠 표면 | 자료와 작은 조작을 한 덩어리로 묶는다 | 기본 Card는 콘텐츠 컨테이너. 선택·접기·action은 해당 UI 목적 추가 시 별도 profile; 업무 역할·상태 제외 | 5 |
| layout · 배치 도구 | 크기·간격·배치를 정한다 | layout grid는 interactive grid가 아님; landmark는 별도 선언 | 12 |
| image · 이미지와 정체성 표현 | 사진·아이콘·프로필·색 견본을 표현한다 | 정보/장식·색 견본의 선택 가능 여부 구별 | 5 |
| status-message · 상태 메시지 | 상태나 결과를 읽을 수 있게 보인다 | 시각적 status와 live announcement를 동일시하지 않음 | 3 |
| toast-system · 일시 알림과 관리자 | 알림을 순서·시간·공지와 함께 관리한다 | 개별 Toast와 queue manager는 다른 개체 | 2 |
| progress · 작업 진행 | 완료되지 않은 일의 진행을 표현한다 | 외부 진행 수치·불확정 진행의 표현 계약 필요. 실제 업무 실행·상태 판단은 소비 앱 소유 | 5 |
| measurement · 수치 측정 표시 | 범위 안의 측정값을 읽는다 | 진행률과 측정값의 의미를 구별 | 1 |
| loading · 로딩 표현 | 준비 중임을 알리거나 자리를 잡는다 | 장식 placeholder·loading 의미·입력 차단은 별도 선언 | 4 |
| carousel · 순차 콘텐츠 보기 | 여러 화면·이미지를 순서대로 본다 | autoplay·정지·modal lightbox와 일반 carousel의 focus 차이를 구체화 | 2 |
| scroll · 스크롤 보기 | 스크롤 창과 따라가기 동작을 제공한다 | 일반 스크롤·새 메시지 follow·자동 marquee는 별도 profile | 4 |
| resize · 크기 조절 영역 | 영역의 경계를 움직여 크기를 바꾼다 | 정적 separator와 조절 가능한 splitter 구분 | 2 |
| separator · 구분선 | 내용 사이의 경계를 표시한다 | 조절 가능하면 resize 계열로 전환 | 2 |
| chart · 자료 그림 | 다양한 관계를 그림으로 표현한다 | 각 chart의 encoding·상호작용·대체 자료는 추가 계약 필요 | 23 |
| schedule · 일정과 자원 보기 | 시간·자원에 배치된 일정을 다룬다 | 날짜·시간대 표현, 항목 배치·탐색·이동 요청은 UI 계약. 예약 충돌·권한·업무 반복 규칙은 소비 앱 소유 | 11 |
| rich-editor · 서식 문서 편집 | 서식 있는 문서를 작성한다 | 문서 모델·붙여넣기·history·플랫폼 editor 엔진 필요 | 1 |
| messaging · 대화 메시지 구성 | 메시지·첨부·읽는 위치를 조합한다 | 메시지·첨부·외부 상태와 읽는 위치의 표현 계약. 전송·수신 확인·업무 결과 판단은 소비 앱 소유 | 4 |
| environment · 실행 환경과 서비스 | 방향·focus·portal·transition·manager를 제공한다 | 여러 capability 후보 중 기능별 선택; 일반 시각 컴포넌트로 인증하지 않음 | 8 |
| virtualization · 큰 목록 부분 렌더링 | 전체 자료 중 필요한 부분을 그린다 | OverflowList의 접힘과 window virtualization 차이를 profile로 구분 | 2 |

### 239 항목의 실제 목록

아래 번호는 원본 순서가 아니라 감사 inventory 번호다. stable catalog ID와 원본 provider 행은 JSON 원장에서 보존한다. `P3`는 위 세 builtin의 제한된 부분 구현, `M`은 실행 profile 없음이다. family가 둘인 Group은 한 ID이며 두 family 연결을 그대로 보존한다.

| # | stable ID · 이름 | 종류 | family | provider 원본행 | baseline |
| --- | --- | --- | --- | --- | --- |
| 1 | catalog.accordion · Accordion | component | disclosure | shadcn/ui #58; Mantine Core #204; Base UI #294 | M |
| 2 | catalog.actionbar · ActionBar | component | control-group | Mantine Core #190 | M |
| 3 | catalog.actionicon · ActionIcon | component | command | Mantine Core #167 | M |
| 4 | catalog.affix · Affix | component | layout | Mantine Core #191 | M |
| 5 | catalog.agendaview · AgendaView | template | schedule | Mantine Schedule #44 | M |
| 6 | catalog.alert · Alert | component | status-message | shadcn/ui #59; Mantine Core #182 | M |
| 7 | catalog.alertdialog · Alert Dialog | component | modal-task | shadcn/ui #60; Base UI #295 | M |
| 8 | catalog.alphaslider · AlphaSlider | component | color-control | Mantine Core #133 | M |
| 9 | catalog.anchor · Anchor | component | navigation | Mantine Core #173 | M |
| 10 | catalog.angleslider · AngleSlider | component | range-control | Mantine Core #134 | M |
| 11 | catalog.appshell · AppShell | template | layout | Mantine Core #122 | M |
| 12 | catalog.areachart · AreaChart | component | chart | Mantine Charts #16 | M |
| 13 | catalog.aspectratio · Aspect Ratio | component | layout | shadcn/ui #61; Mantine Core #123 | M |
| 14 | catalog.attachment · Attachment | component | messaging | shadcn/ui #62 | M |
| 15 | catalog.autocomplete · Autocomplete | component | query-choice | Mantine Core #157; React Aria #240; Base UI #296 | M |
| 16 | catalog.avatar · Avatar | component | image | shadcn/ui #63; Mantine Core #205; Base UI #297 | M |
| 17 | catalog.backgroundimage · BackgroundImage | component | image | Mantine Core #206 | M |
| 18 | catalog.badge · Badge | component | content | shadcn/ui #64; Mantine Core #207 | M |
| 19 | catalog.barchart · BarChart | component | chart | Mantine Charts #17 | M |
| 20 | catalog.barslist · BarsList | component | chart | Mantine Charts #30 | M |
| 21 | catalog.blockquote · Blockquote | component | content | Mantine Core #220 | M |
| 22 | catalog.box · Box | component | layout | Mantine Core #229 | M |
| 23 | catalog.breadcrumb · Breadcrumb | component | navigation | shadcn/ui #65 | M |
| 24 | catalog.breadcrumbs · Breadcrumbs | component | navigation | Mantine Core #174; React Aria #241 | M |
| 25 | catalog.bubble · Bubble | component | messaging | shadcn/ui #66 | M |
| 26 | catalog.bubblechart · BubbleChart | component | chart | Mantine Charts #26 | M |
| 27 | catalog.bulletchart · BulletChart | component | chart | Mantine Charts #31 | M |
| 28 | catalog.burger · Burger | component | navigation | Mantine Core #175 | M |
| 29 | catalog.button · Button | component | command | shadcn/ui #67; Mantine Core #168; React Aria #242; Base UI #298 | P3 |
| 30 | catalog.buttongroup · Button Group | component | control-group | shadcn/ui #68 | M |
| 31 | catalog.calendar · Calendar | component | temporal | Mantine Dates #15; shadcn/ui #69; React Aria #243 | M |
| 32 | catalog.candlestickchart · CandlestickChart | component | chart | Mantine Charts #20 | M |
| 33 | catalog.card · Card | component | surface | shadcn/ui #70; Mantine Core #208 | P3 |
| 34 | catalog.carousel · Carousel | component | carousel | Mantine Other Extensions #52; shadcn/ui #71 | M |
| 35 | catalog.cascader · Cascader | component | hierarchical-choice | Mantine Core #158 | M |
| 36 | catalog.center · Center | component | layout | Mantine Core #124 | M |
| 37 | catalog.chart · Chart | component | chart | shadcn/ui #72 | M |
| 38 | catalog.checkbox · Checkbox | component | binary-choice | shadcn/ui #73; Mantine Core #135; React Aria #244; Base UI #299 | M |
| 39 | catalog.checkboxgroup · CheckboxGroup | component | choice-group | React Aria #245; Base UI #300 | M |
| 40 | catalog.chip · Chip | component | binary-choice | Mantine Core #136 | M |
| 41 | catalog.closebutton · CloseButton | component | command | Mantine Core #169 | M |
| 42 | catalog.code · Code | component | content | Mantine Core #221 | M |
| 43 | catalog.codehighlight · CodeHighlight | component | content | Mantine Other Extensions #49 | M |
| 44 | catalog.collapse · Collapse | component | disclosure | Mantine Core #230 | M |
| 45 | catalog.collapsible · Collapsible | component | disclosure | shadcn/ui #74; Base UI #301 | M |
| 46 | catalog.colorarea · ColorArea | component | color-control | React Aria #246 | M |
| 47 | catalog.colorfield · ColorField | component | color-control | React Aria #247 | M |
| 48 | catalog.colorinput · ColorInput | component | color-control | Mantine Core #137 | M |
| 49 | catalog.colorpicker · ColorPicker | component | color-control | Mantine Core #138; React Aria #248 | M |
| 50 | catalog.colorslider · ColorSlider | component | color-control | React Aria #249 | M |
| 51 | catalog.colorswatch · ColorSwatch | component | image | Mantine Core #209; React Aria #250 | M |
| 52 | catalog.colorswatchpicker · ColorSwatchPicker | component | color-control | React Aria #251 | M |
| 53 | catalog.colorwheel · ColorWheel | component | color-control | React Aria #252 | M |
| 54 | catalog.combobox · Combobox | component | query-choice | shadcn/ui #75; Mantine Core #159; React Aria #253; Base UI #302 | M |
| 55 | catalog.comboboxpopover · ComboboxPopover | part | floating-surface | Mantine Core #160 | M |
| 56 | catalog.command · Command | component | search-command | shadcn/ui #76 | M |
| 57 | catalog.compositechart · CompositeChart | component | chart | Mantine Charts #19 | M |
| 58 | catalog.container · Container | component | layout | Mantine Core #125 | M |
| 59 | catalog.contextmenu · Context Menu | component | command-menu | shadcn/ui #77; Base UI #303 | M |
| 60 | catalog.copybutton · CopyButton | component | command | Mantine Core #170 | M |
| 61 | catalog.datalist · DataList | component | content | Mantine Core #210 | M |
| 62 | catalog.datatable · Data Table | component | tabular | shadcn/ui #78 | M |
| 63 | catalog.datefield · DateField | component | temporal | React Aria #254 | M |
| 64 | catalog.dateinput · DateInput | component | temporal | Mantine Dates #5 | M |
| 65 | catalog.datepicker · DatePicker | component | temporal | Mantine Dates #1; shadcn/ui #79; React Aria #255 | M |
| 66 | catalog.datepickerinput · DatePickerInput | component | temporal | Mantine Dates #2 | M |
| 67 | catalog.daterangepicker · DateRangePicker | component | temporal | React Aria #256 | M |
| 68 | catalog.datetimepicker · DateTimePicker | component | temporal | Mantine Dates #3 | M |
| 69 | catalog.dayview · DayView | template | schedule | Mantine Schedule #39 | M |
| 70 | catalog.dialog · Dialog | component | floating-surface | shadcn/ui #80; Mantine Core #192; Base UI #304 | M |
| 71 | catalog.direction · Direction | utility | environment | shadcn/ui #81 | M |
| 72 | catalog.disclosure · Disclosure | component | disclosure | React Aria #257 | M |
| 73 | catalog.disclosuregroup · DisclosureGroup | component | disclosure | React Aria #258 | M |
| 74 | catalog.divider · Divider | component | separator | Mantine Core #231 | M |
| 75 | catalog.donutchart · DonutChart | component | chart | Mantine Charts #21 | M |
| 76 | catalog.drawer · Drawer | component | floating-surface | shadcn/ui #82; Mantine Core #193; Base UI #305 | M |
| 77 | catalog.dropdownmenu · Dropdown Menu | component | command-menu | shadcn/ui #83 | M |
| 78 | catalog.dropzone · Dropzone | component | file-intake | Mantine Other Extensions #54; React Aria #259 | M |
| 79 | catalog.empty · Empty | component | surface | shadcn/ui #84 | M |
| 80 | catalog.emptystate · EmptyState | component | surface | Mantine Core #183 | M |
| 81 | catalog.field · Field | component | field-container | shadcn/ui #85; Base UI #306 | M |
| 82 | catalog.fieldset · Fieldset | component | field-container | Mantine Core #139; Base UI #307 | M |
| 83 | catalog.filebutton · FileButton | part | file-intake | Mantine Core #171 | M |
| 84 | catalog.fileinput · FileInput | component | file-intake | Mantine Core #140 | M |
| 85 | catalog.filetrigger · FileTrigger | part | file-intake | React Aria #260 | M |
| 86 | catalog.flex · Flex | component | layout | Mantine Core #126 | M |
| 87 | catalog.floatingindicator · FloatingIndicator | component | environment | Mantine Core #194 | M |
| 88 | catalog.floatingwindow · FloatingWindow | component | floating-surface | Mantine Core #195 | M |
| 89 | catalog.focustrap · FocusTrap | utility | environment | Mantine Core #232 | M |
| 90 | catalog.form · Form | component | form-flow | React Aria #261; Base UI #308 | M |
| 91 | catalog.funnelchart · FunnelChart | component | chart | Mantine Charts #23 | M |
| 92 | catalog.gaugechart · GaugeChart | component | chart | Mantine Charts #32 | M |
| 93 | catalog.grid · Grid | component | layout | Mantine Core #127 | M |
| 94 | catalog.gridlist · GridList | component | list-choice | React Aria #262 | M |
| 95 | catalog.group · Group | component | field-container, layout | Mantine Core #128; React Aria #263 | M |
| 96 | catalog.heatmap · Heatmap | component | chart | Mantine Charts #29 | M |
| 97 | catalog.highlight · Highlight | component | content | Mantine Core #222 | M |
| 98 | catalog.hovercard · Hover Card | component | context-help | shadcn/ui #86; Mantine Core #196 | M |
| 99 | catalog.hueslider · HueSlider | component | color-control | Mantine Core #141 | M |
| 100 | catalog.image · Image | component | image | Mantine Core #211 | M |
| 101 | catalog.indicator · Indicator | component | status-message | Mantine Core #212 | M |
| 102 | catalog.inlinedatetimepicker · InlineDateTimePicker | component | temporal | Mantine Dates #4 | M |
| 103 | catalog.input · Input | component | text-field | shadcn/ui #87; Mantine Core #142; Base UI #309 | M |
| 104 | catalog.inputgroup · Input Group | component | field-container | shadcn/ui #88 | M |
| 105 | catalog.inputotp · Input OTP | component | text-field | shadcn/ui #89 | M |
| 106 | catalog.item · Item | part | surface | shadcn/ui #90 | M |
| 107 | catalog.jsoninput · JsonInput | component | text-field | Mantine Core #143 | M |
| 108 | catalog.kbd · Kbd | component | content | shadcn/ui #91; Mantine Core #213 | M |
| 109 | catalog.label · Label | part | field-container | shadcn/ui #92 | M |
| 110 | catalog.lightbox · Lightbox | component | carousel | Mantine Other Extensions #53 | M |
| 111 | catalog.linechart · LineChart | component | chart | Mantine Charts #18 | M |
| 112 | catalog.link · Link | component | navigation | React Aria #264 | M |
| 113 | catalog.list · List | component | content | Mantine Core #223 | M |
| 114 | catalog.listbox · ListBox | component | list-choice | React Aria #265 | M |
| 115 | catalog.loader · Loader | component | loading | Mantine Core #184 | M |
| 116 | catalog.loadingoverlay · LoadingOverlay | component | loading | Mantine Core #197 | M |
| 117 | catalog.mark · Mark | component | content | Mantine Core #224 | M |
| 118 | catalog.marker · Marker | component | messaging | shadcn/ui #93 | M |
| 119 | catalog.marquee · Marquee | component | scroll | Mantine Core #233 | M |
| 120 | catalog.maskinput · MaskInput | component | text-field | Mantine Core #144 | M |
| 121 | catalog.matrixchart · MatrixChart | component | chart | Mantine Charts #37 | M |
| 122 | catalog.menu · Menu | component | command-menu | Mantine Core #198; React Aria #266; Base UI #310 | M |
| 123 | catalog.menubar · Menubar | component | command-menu | shadcn/ui #94; Mantine Core #199; Base UI #311 | M |
| 124 | catalog.message · Message | component | messaging | shadcn/ui #95 | M |
| 125 | catalog.messagescroller · Message Scroller | template | scroll | shadcn/ui #96 | M |
| 126 | catalog.meter · Meter | component | measurement | React Aria #267; Base UI #312 | M |
| 127 | catalog.minicalendar · MiniCalendar | component | temporal | Mantine Dates #14 | M |
| 128 | catalog.mobilemonthview · MobileMonthView | template | schedule | Mantine Schedule #43 | M |
| 129 | catalog.modal · Modal | component | modal-task | Mantine Core #200; React Aria #268 | M |
| 130 | catalog.modalsmanager · Modals manager | utility | environment | Mantine Other Extensions #56 | M |
| 131 | catalog.monthpicker · MonthPicker | component | temporal | Mantine Dates #6 | M |
| 132 | catalog.monthpickerinput · MonthPickerInput | component | temporal | Mantine Dates #7 | M |
| 133 | catalog.monthview · MonthView | template | schedule | Mantine Schedule #40 | M |
| 134 | catalog.multiselect · MultiSelect | component | token-choice | Mantine Core #161 | M |
| 135 | catalog.nativeselect · Native Select | component | list-choice | shadcn/ui #97; Mantine Core #145 | M |
| 136 | catalog.navigationmenu · Navigation Menu | component | navigation | shadcn/ui #98; Base UI #313 | M |
| 137 | catalog.navigationprogress · NavigationProgress | component | progress | Mantine Other Extensions #55 | M |
| 138 | catalog.navigationtree · NavigationTree | component | tree | React Aria #269 | M |
| 139 | catalog.navlink · NavLink | component | navigation | Mantine Core #176 | M |
| 140 | catalog.notification · Notification | component | status-message | Mantine Core #185 | M |
| 141 | catalog.notificationssystem · Notifications system | utility | toast-system | Mantine Other Extensions #50 | M |
| 142 | catalog.numberfield · NumberField | component | number-field | React Aria #270; Base UI #314 | M |
| 143 | catalog.numberformatter · NumberFormatter | component | content | Mantine Core #214 | M |
| 144 | catalog.numberinput · NumberInput | component | number-field | Mantine Core #146 | M |
| 145 | catalog.otpfield · OTP Field | component | text-field | Base UI #315 | M |
| 146 | catalog.overflowlist · OverflowList | component | virtualization | Mantine Core #215 | M |
| 147 | catalog.overlay · Overlay | component | environment | Mantine Core #201 | M |
| 148 | catalog.pagination · Pagination | component | navigation | shadcn/ui #99; Mantine Core #177 | M |
| 149 | catalog.paper · Paper | component | surface | Mantine Core #234 | M |
| 150 | catalog.passwordinput · PasswordInput | component | text-field | Mantine Core #147 | M |
| 151 | catalog.piechart · PieChart | component | chart | Mantine Charts #22 | M |
| 152 | catalog.pill · Pill | component | token-choice | Mantine Core #162 | M |
| 153 | catalog.pillsinput · PillsInput | component | token-choice | Mantine Core #163 | M |
| 154 | catalog.pininput · PinInput | component | text-field | Mantine Core #148 | M |
| 155 | catalog.popover · Popover | component | floating-surface | shadcn/ui #100; Mantine Core #202; React Aria #271; Base UI #316 | M |
| 156 | catalog.portal · Portal | utility | environment | Mantine Core #235 | M |
| 157 | catalog.previewcard · Preview Card | component | context-help | Base UI #317 | M |
| 158 | catalog.previewtrigger · PreviewTrigger | part | context-help | React Aria #272 | M |
| 159 | catalog.progress · Progress | component | progress | shadcn/ui #101; Mantine Core #186; Base UI #318 | M |
| 160 | catalog.progressbar · ProgressBar | component | progress | React Aria #273 | M |
| 161 | catalog.questionnaire · Questionnaire | template | form-flow | shadcn/ui #102 | M |
| 162 | catalog.radarchart · RadarChart | component | chart | Mantine Charts #24 | M |
| 163 | catalog.radialbarchart · RadialBarChart | component | chart | Mantine Charts #27 | M |
| 164 | catalog.radio · Radio | component | binary-choice | Mantine Core #149; Base UI #319 | M |
| 165 | catalog.radiogroup · Radio Group | component | choice-group | shadcn/ui #103; React Aria #274 | M |
| 166 | catalog.rangecalendar · RangeCalendar | component | temporal | React Aria #275 | M |
| 167 | catalog.rangeslider · RangeSlider | component | range-control | Mantine Core #150 | M |
| 168 | catalog.rating · Rating | component | range-control | Mantine Core #151 | M |
| 169 | catalog.resizable · Resizable | component | resize | shadcn/ui #104 | M |
| 170 | catalog.resourcesdayview · ResourcesDayView | template | schedule | Mantine Schedule #45 | M |
| 171 | catalog.resourcesmonthview · ResourcesMonthView | template | schedule | Mantine Schedule #47 | M |
| 172 | catalog.resourcesschedule · ResourcesSchedule | template | schedule | Mantine Schedule #48 | M |
| 173 | catalog.resourcesweekview · ResourcesWeekView | template | schedule | Mantine Schedule #46 | M |
| 174 | catalog.richtexteditor · Rich text editor | component | rich-editor | Mantine Other Extensions #57 | M |
| 175 | catalog.ringprogress · RingProgress | component | progress | Mantine Core #187 | M |
| 176 | catalog.rollingnumber · RollingNumber | component | content | Mantine Core #216 | M |
| 177 | catalog.sankeychart · SankeyChart | component | chart | Mantine Charts #36 | M |
| 178 | catalog.scatterchart · ScatterChart | component | chart | Mantine Charts #25 | M |
| 179 | catalog.schedule · Schedule | template | schedule | Mantine Schedule #38 | M |
| 180 | catalog.scrollarea · Scroll Area | component | scroll | shadcn/ui #105; Mantine Core #236; Base UI #320 | M |
| 181 | catalog.scroller · Scroller | component | scroll | Mantine Core #237 | M |
| 182 | catalog.searchfield · SearchField | component | text-field | React Aria #276 | M |
| 183 | catalog.segmentedcontrol · SegmentedControl | component | choice-group | Mantine Core #152 | M |
| 184 | catalog.select · Select | component | list-choice | shadcn/ui #106; Mantine Core #164; React Aria #277; Base UI #321 | M |
| 185 | catalog.semicircleprogress · SemiCircleProgress | component | progress | Mantine Core #188 | M |
| 186 | catalog.separator · Separator | component | separator | shadcn/ui #107; React Aria #278; Base UI #322 | M |
| 187 | catalog.sheet · Sheet | component | floating-surface | shadcn/ui #108 | M |
| 188 | catalog.sidebar · Sidebar | template | navigation | shadcn/ui #109 | M |
| 189 | catalog.simplegrid · SimpleGrid | component | layout | Mantine Core #129 | M |
| 190 | catalog.skeleton · Skeleton | component | loading | shadcn/ui #110; Mantine Core #189 | M |
| 191 | catalog.slider · Slider | component | range-control | shadcn/ui #111; Mantine Core #153; React Aria #279; Base UI #323 | M |
| 192 | catalog.space · Space | component | layout | Mantine Core #130 | M |
| 193 | catalog.sparkline · Sparkline | component | chart | Mantine Charts #28 | M |
| 194 | catalog.spinner · Spinner | component | loading | shadcn/ui #112 | M |
| 195 | catalog.splitter · Splitter | component | resize | Mantine Core #131 | M |
| 196 | catalog.spoiler · Spoiler | component | disclosure | Mantine Core #217 | M |
| 197 | catalog.spotlight · Spotlight | component | search-command | Mantine Other Extensions #51 | M |
| 198 | catalog.stack · Stack | component | layout | Mantine Core #132 | M |
| 199 | catalog.stepper · Stepper | component | navigation | Mantine Core #178 | M |
| 200 | catalog.sunburstchart · SunburstChart | component | chart | Mantine Charts #35 | M |
| 201 | catalog.switch · Switch | component | binary-choice | shadcn/ui #113; Mantine Core #154; React Aria #280; Base UI #324 | M |
| 202 | catalog.table · Table | component | tabular | shadcn/ui #114; Mantine Core #225; React Aria #281 | M |
| 203 | catalog.tableofcontents · TableOfContents | component | navigation | Mantine Core #179 | M |
| 204 | catalog.tabs · Tabs | component | tabs | shadcn/ui #115; Mantine Core #180; React Aria #282; Base UI #325 | M |
| 205 | catalog.taggroup · TagGroup | component | token-choice | React Aria #283 | M |
| 206 | catalog.tagsinput · TagsInput | component | token-choice | Mantine Core #165 | M |
| 207 | catalog.text · Text | component | content | Mantine Core #226 | M |
| 208 | catalog.textarea · Textarea | component | text-field | shadcn/ui #116; Mantine Core #155 | M |
| 209 | catalog.textfield · TextField | component | text-field | React Aria #284 | M |
| 210 | catalog.textinput · TextInput | component | text-field | Mantine Core #156 | M |
| 211 | catalog.themeicon · ThemeIcon | component | image | Mantine Core #218 | M |
| 212 | catalog.timefield · TimeField | component | temporal | React Aria #285 | M |
| 213 | catalog.timegrid · TimeGrid | template | temporal | Mantine Dates #12 | M |
| 214 | catalog.timeinput · TimeInput | component | temporal | Mantine Dates #10 | M |
| 215 | catalog.timeline · Timeline | component | content | Mantine Core #219 | M |
| 216 | catalog.timepicker · TimePicker | component | temporal | Mantine Dates #11 | M |
| 217 | catalog.timevalue · TimeValue | component | temporal | Mantine Dates #13 | M |
| 218 | catalog.title · Title | component | content | Mantine Core #227 | M |
| 219 | catalog.toast · Toast | component | toast-system | shadcn/ui #117; React Aria #286; Base UI #326 | P3 |
| 220 | catalog.toggle · Toggle | component | binary-choice | shadcn/ui #118; Base UI #327 | M |
| 221 | catalog.togglebutton · ToggleButton | component | binary-choice | React Aria #287 | M |
| 222 | catalog.togglebuttongroup · ToggleButtonGroup | component | choice-group | React Aria #288 | M |
| 223 | catalog.togglegroup · Toggle Group | component | choice-group | shadcn/ui #119; Base UI #328 | M |
| 224 | catalog.tokenfield · TokenField | component | token-choice | React Aria #289 | M |
| 225 | catalog.toolbar · Toolbar | component | control-group | React Aria #290; Base UI #329 | M |
| 226 | catalog.tooltip · Tooltip | component | context-help | shadcn/ui #120; Mantine Core #203; React Aria #291; Base UI #330 | M |
| 227 | catalog.transition · Transition | utility | environment | Mantine Core #238 | M |
| 228 | catalog.tree · Tree | component | tree | Mantine Core #181; React Aria #292 | M |
| 229 | catalog.treemap · Treemap | component | chart | Mantine Charts #34 | M |
| 230 | catalog.treeselect · TreeSelect | component | hierarchical-choice | Mantine Core #166 | M |
| 231 | catalog.typography · Typography | component | content | shadcn/ui #121; Mantine Core #228 | M |
| 232 | catalog.unstyledbutton · UnstyledButton | component | command | Mantine Core #172 | M |
| 233 | catalog.virtualizer · Virtualizer | utility | virtualization | React Aria #293 | M |
| 234 | catalog.visuallyhidden · VisuallyHidden | utility | environment | Mantine Core #239 | M |
| 235 | catalog.wafflechart · WaffleChart | component | chart | Mantine Charts #33 | M |
| 236 | catalog.weekview · WeekView | template | schedule | Mantine Schedule #41 | M |
| 237 | catalog.yearpicker · YearPicker | component | temporal | Mantine Dates #8 | M |
| 238 | catalog.yearpickerinput · YearPickerInput | component | temporal | Mantine Dates #9 | M |
| 239 | catalog.yearview · YearView | template | schedule | Mantine Schedule #42 | M |

## 기계 표의 검토와 추적

57 field record 모두 생성된 구조 검사에 투영되어 있지만, `TypeExpr`의 7종·Text/SizePolicy 등의 opt-in 의미검사와 Studio builtin만 추가 실행된다. `Registry`, `PolicyRule`, `Domain`, `Tier`, 일반 `Expr`, `UIEffect`, `Host`, `Requirement` 등 이름이 있거나 JSON이 보존되는 것만으로 편집/해석을 완료했다고 판단하지 않았다. 전체 field 이름·owner·required/type와 현 적용 한계는 JSON 원장에 포함한다.

52 command 중 실행하는 core operation은 `project.create`, `document.import`, `entity.delete`, `transaction.review`, `transaction.apply`, `transaction.undo`, `transaction.redo`다. `planStudioEdit`의 token/layout/appearance helper와 외부 delivery CLI의 비슷한 명령은 catalog의 공식 operation 구현과 따로 표시한다. 10 query도 일부 public helper와 대응할 뿐 공식 transport 전체 구현이 아니다. JSON 원장에서 모두 열거한다.

50 scenario는 각각 setup/trace/expected/oracle/environment가 필요한 의무다. SC29/30/31의 좁은 회귀와 SC06/07 일부 React 결과처럼 실제 겹치는 시험이 있어도, SC03 전체표준·SC22 geometry·SC24 실제IME/text·SC26 수동AT·SC33 offline·SC39 전체nativecatalog·SC40 네전달방식은 별도로 미완료다. 시나리오별 기준점 판정을 JSON 원장에 기록한다.

23 selection 항목은 채택된 ADR의 한정 실증과 구별한다. React/DOM·Ajv standalone·IndexedDB·3builtin/4sourcegenerator가 있다고 Canvas/textengine/전체DTCG/native/모든runner/AT/AI/license/pricing/hosting 선택이 모두 완료된 것은 아니다. 알려지지 않은 encoding이나 사업 수치를 이 감사에서 새로 확정하지 않았다.

## 감사 검증과 유지

원장은 문서 56개 고유 ID, 카탈로그 239개 고유 ID/330 provider 행, 45 family, 57 record, 52 command/10 query, 50 scenario를 원본과 대조한다. 각 문서와 근거는 SHA-256으로 고정한다. 추후 기능을 닫을 때 구현 파일만 추가하지 말고 해당 기능 행에 실제 실패/정상 시험과 정확한 target/environment scope를 연결한다. 전체 목록을 렌더했다는 결과와 각 항목이 실제 편집·실행된다는 결과를 분리한다.

미완료 목록은 새 UI/컴포넌트 확장 작업을 막는 승인 gate가 아니다. 사용자 요청대로 계속 구현하기 위한 작업 원장이며, 이 문서의 작성으로 미구현 기능이나 출시 gate가 통과되지는 않는다.
