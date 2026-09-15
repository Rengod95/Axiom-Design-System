# Editor completion follow-up — 2026-09-14

The owner’s six reported problems are addressed by the scoped corrections below. The Foundation remains incomplete. This follow-up retains all 119 requirement IDs, validates the unchanged hashes of all 56 authority documents, and pins current implementation source hashes in [the machine-readable ledger](editor-completion-followup.json). The [original audit](editor-completeness-audit.md) stays a fixed historical baseline.

## Delivered scope

| User report | Implemented correction | Verification |
| --- | --- | --- |
| Review blocked by property input | Valid pending forms enter common review; invalid input has a named focus/reset path; same-value edits are no-ops | Registry/controller and actual invalid→reset→review browser flow |
| Weak token onboarding and management | 11 domains / 13 types / 153 suggested tokens, primitive-semantic aliases, linked sample components, two themes, additive adoption, per-domain workspace, relationship tree and value chips | Type/domain/alias/theme checks, idempotence and conflict rejection, browser onboarding/filters/graph |
| Custom authoring | Blank layout entry, Part text/nesting/order, slots and variant defaults, typed conditional paint rules | Cycle/dependency/duplicate tests, nested React SSR, explicit native rejection |
| Library identification | Locally authored static SVG specimens | Real catalog browser and captures; no semantic/runtime certification from thumbnails |
| Trackpad zoom | Normalized Ctrl/Meta wheel, native gesture and two-touch handlers, anchored camera | Geometry tests and actual CDP Ctrl-wheel; physical device unverified |
| Motion and accessibility | Typed tween/spring tracks, keyframes and token timing, player controls/reduced alternatives; opaque-pair contrast and reading-order navigation | Source negatives, reference protection/duplicate, animation queue/reset tests and browser player |
| Studio design system | Shared type/spacing/weight/size/variant roles, lighter forms and named themes first, dual themes and responsive panels | Axiom UI reference, Impeccable detector/review and width/theme browser matrix |

## Outstanding implementation queues

1. Foundation interoperability: full DTCG group/property aliases and Resolver, GUI file interchange, token deprecation and policy/exception workflows (FT03/08/11/12/14).
2. Component composition: true instances/slot content, multiple named designs, trait registry, arbitrary variant/public event editing and behavior graph (CP03–12).
3. Layout/text/assets: four-edge spacing, grid/flow/free and rotated geometry, rich text/IME, asset ingestion and BrandLibrary (CV02–10, TX01–06).
4. Motion/accessibility: actual event/completion bindings, stagger, target timelines, relationship-based naming/focus/announcements and manual AT (CP14–17).
5. Native/delivery/host: remaining catalog/provider realizations, native compiler/device work, actual folder/host connection and delivery/AI/API workflows (TG, DL, HC, AP).

None of these obligations is closed merely because its source schema is preserved or an unrelated thumbnail is visible. All 119 rows, including operational and later-scope rows, remain in the ledger.

## Complete requirement ledger

B = implemented within stated limits; P = partial; M = missing; D = explicit later scope; N = operational/business selection.

| ID | Requirement | Current | Remaining acceptance |
| --- | --- | --- | --- |
| ED01 | 기본 DS로 처음 시작 | B | Broader reusable user templates and AI/tutorial onboarding remain ED03/CP02. |
| ED02 | 브라우저/로컬 폴더 동등한 시작 | P | 시작에서 위치 선택→권한 취소/재연결→같은 편집/review/export. 폴더 보관 도움말은 실행 경로 아님 |
| ED03 | 직접/AI/예제 학습 시작 | P | 같은 기능 권한으로 세 진입; 학습이 실제 token→Card→설치까지 연결; AI 제공자 실패에도 GUI 유지 |
| ED04 | 생성·검색·필터·목록 탐색 | P | Theme/provider search and exhaustive keyboard discovery remain. |
| ED05 | 선택 없음의 작업대 | B | Bounded empty-selection flow; no whole-workspace completion claim. |
| ED06 | 선택 개체별 Inspector | P | Instance inspector and complete slot injection remain CP09/CP10. |
| ED07 | 깊은 선택·부모 이동·겹친 대상 | P | 기본 parent 선택, deep modifier, 부모/자식 keyboard, breadcrumb 이동, 겹친 목록 선택; native 근사도 같은 stable ID |
| ED08 | 다중 선택·혼합값 | P | Mixed-value property editing across heterogeneous objects remains. |
| ED09 | 편집/실행 모드 | P | 누르는 동안 임시 실행, 복귀 selection/focus, 중첩 control 이벤트 소유, 미완료 gesture 취소; shortcut이 IME를 방해하지 않음 |
| ED10 | 이름·ID·API 표시 구분 | P | rename은 stable ID 유지; public name 변경 영향·충돌/예약명 안내; 사용자 표시명은 언어 전환으로 변하지 않음 |
| ED11 | 오류에서 대상·원인·복구 | P | All diagnostics localization and complete source/geometry deep links remain. |
| ED12 | 맥락 도움말·즐겨찾기·전문 옵션 | P | Per-user favorites remain. |
| CV01 | zoom·camera·pan | B | CDP Ctrl-wheel and pure geometry verified; physical trackpad/Safari hardware unverified. |
| CV02 | geometry bridge | P | Rotated geometry, iframe bridge and stale geometry receipts remain. |
| CV03 | move/resize/rotate | P | Part-level move/resize and rotate remain. |
| CV04 | auto-layout drag·reparent | P | Pointer auto-layout drop/reparent, free layout and locked/instance slot constraints remain. |
| CV05 | align/distribute/snap | P | Full Part-level alignment/distribution and transformed geometry remain. |
| CV06 | lock/hide/frame/group | M | 편집 잠금과 runtime availability 구분, 표시 숨김과 문서 삭제 구분, 그룹 ID/관계 유지, 해제·복구 가능 |
| CV07 | hug/fill/fixed, min/max | P | Min/max intrinsic cycles and cross-platform parity remain. |
| CV08 | flow/stack/grid/free | P | 전체 모드와 grid/flow/free model, wrap/alignment/distribution/overflow/anchor; 미지원 native mapping 숨김 금지 |
| CV09 | 네 변 padding·크기·순서 | P | Independent four-edge spacing remains. |
| CV10 | 반응형 배치와 의미 순서 | M | 긴 한/영, RTL, font scale, narrow bounds; 시각 order와 reading/focus order 차이 진단, 주요 조작 소실 금지 |
| CV11 | gesture 취소·history 묶음 | P | pointercancel/Escape/selection 삭제/panel 전환으로 미완료 drag 취소, preview frame마다 저장 안 함, rollback 한 번 |
| CV12 | 실제 편집 workload·성능 | M | S/M/L 제안 dataset 실제 hit/edit/zoom/text/layout 측정, p95/memory/hardware 기록, cancel/lazy/worker 적용 판단. 목표 수치 미승인을 pass gate로 발명 금지 |
| FT01 | token 생성 | B | Within the explicit Studio literal/whole-alias profile. |
| FT02 | 분류 생성·관리 | P | General policy binding and complete domain support declarations remain. |
| FT03 | token rename·copy·delete·deprecate | P | Deprecation lifecycle and reasons remain. |
| FT04 | 검색·filter·대량 편집 | P | Per-hunk selective application and theme filter remain. |
| FT05 | 13 literal 타입 의미 검사 | B | color/dimension/fontFamily/fontWeight/duration/cubicBezier/number/strokeStyle/border/transition/shadow/gradient/typography의 검사 범위. 모든 GUI·렌더·표준 resolver 완료로 확대 금지 |
| FT06 | 타입별 시각 editor | B | Only the documented literal profile; not full DTCG Resolver or all-space paint conversion. |
| FT07 | 전체 token alias·usage·provenance | P | Property-level aliases and graph mutation/complete theme-only edge navigation remain. |
| FT08 | 부분 alias·group/type 상속·DTCG Resolver | M | 공식 판본 corpus로 group inheritance/property reference/set/modifier/context/default/order·오류 의미; raw 보존을 interpret/GUI/output 합산 금지 |
| FT09 | theme axes·sets CRUD | B | Within one Foundation and explicit resolution order; arbitrary scoped resolver remains FT08. |
| FT10 | theme 비교·동시 preview | P | Simultaneous component artboards, detailed context diff/contrast remain. |
| FT11 | 정책·예외 | M | predicate/scope/severity/rationale와 token domain 정책, literal→기존/신규 token/예외 action; 예외 대상/이유/기간/승인자 추적, 기본 a11y 의무 면제 금지 |
| FT12 | DTCG import/export | P | 실제 파일선택→원본·유효/오류·unsupported path→매핑 review; authored/original 선택. group/theme/classification 손실을 조용히 flatten하지 않음 |
| FT13 | 타입·색의 실제 target 사용 | P | All color-space conversion, native extended paint and full 4-target conformance remain. |
| FT14 | 표준 선택 실증 | P | DTCG A/B/C 비용·완전성 비교, read/preserve/interpret/edit/preview/output/runtime 개별 표. 이점 미입증이면 전체 DTCG 요구 유지 |
| CP01 | 전체 catalog 탐색·적용 | P | 30 non-component rows and specialized semantic runtimes are not independent runnable components. |
| CP02 | 새 component·목적 정의 | P | Arbitrary archetype/trait composition and reusable user component templates remain. |
| CP03 | 여러 named Design | P | 같은 common contract의 복수 이름 Design, 독립 variant/state/theme, 공통 변경이 모든 Design/instance에 미치는 영향 |
| CP04 | trait/role/policy 조합 | M | configuration/port 타입, value writer, input claim, 필수 role/의무, version/context 호환 검사; 맞는 독립 조합은 허용 |
| CP05 | public value/event/variant type editor | P | Full visual TypeExpr/enum axes/event editing and API migration remain. |
| CP06 | 제한 Expr와 UIEffect | M | declared path만 read, typed operators/0나눗셈/overflow/step bound, emit/request/owned commit/focus/host/motion/cleanup. 임의 JS·업무 실행 불허 |
| CP07 | ownership·state domain·Request | P | local/consumer/runtime·presence/query/active/selected 분리, proposed~terminal lifecycle, stale generation, bounded queue, 중복 writer 거부 |
| CP08 | Part CRUD·내부 구조 | P | General role registry, arbitrary render-node mapping and copy individual Part remain. |
| CP09 | slot 계약·내용 주입 | P | Actual instance/component/asset slot injection and allowed-contract editor remain. |
| CP10 | instance 생성·override | M | component/design pin, public props/slot contents/allowed overrides, provenance, reset/promote, 원본삭제 시 내용보존·replace/detach/미해결 |
| CP11 | behavior base 선택·fork | M | React Aria/Base UI/shadcn 팩의 허용 목록/정확 버전, 교체 diff; 의무 변경은 독립 유형·새 oracle, 무검사 provider mix 금지 |
| CP12 | behavior list/graph/preset/AI editor | M | 상태·전이·guard/effect 시각 편집, 같은 의미의 목록/graph, preset 후 내부 편집; arbitrary code fallback 금지 |
| CP13 | host/coordinator authoring | P | 8 coordinator family의명시scope/parent/lifetime/client·queue, nearestcompatible 제안+수동선택·실제경로·missing/ambiguous 복구 |
| CP14 | 접근성 관계 editor | P | namedBy/describedBy/controls/owns/focusReturn/announces authoring and AT observation remain. |
| CP15 | contrast·터치·motion 도움 | P | Composite/state contrast, touch diagnostics, policy alternatives and manual AT remain. |
| CP16 | 기본 motion authoring | P | Behavior trigger binding, stagger/completion effects, target runtime mappings remain. |
| CP17 | timeline·시연 controls | P | Behavior rejection/enter-exit lifecycle oracle and native timeline runtime remain. |
| CP18 | 전문 다중 track·scroll motion | D | 초기 keyframe/tween/spring을 완료한 뒤 선택. 기본 motion editor를 이 후속 범위에 함께 넣지 않음 |
| CP19 | variant×Part×state appearance | P | 값의출처/priority/refines/동점충돌, variant/state 생성·편집·대응사항 검사; opacity만 전체appearance로 세지 않음 |
| CP20 | environment condition | M | viewport/container/input/hover/direction/textScale/reducedmotion typed 축, unknown fallback, Web expert조건 격리와native한계 |
| CP21 | override reset/promote | M | local↔shared scope와영향, 사용자 허용 override만, 조건/토큰/읽기순서 재검증 후review; 복구 provenance |
| CP22 | registry 관리·Inspector hints | P | local→project→library promotion/ID/version/refMap, 동적 control metadata·required/enum/bounds/visibility, unsupported types 보존·한계 안내 |
| CP23 | version 호환·protected customization | M | 독립 trait version 공존과연결port 호환 구분, breaking diff/migration/deprecation, 유형의무 제거 시 기존badge 무효 |
| CP24 | dates/charts/editor/schedule 등 복잡군 | M | 도메인별 type/input/a11y/dataalternative/시간대/IME·history·요청 의미 계약 및4targetprofile; 일반 텍스트 placeholder로완료 금지 |
| TX01 | 내부 text 직접 편집 | P | Canvas caret, rich text runs/blocks/marks remain. |
| TX02 | IME·paste·selection·Undo | P | Tiptap/대안 workload, 실제 Windows/macOS 입력기·한/영혼합·조합중Enter/Escape/shortcut·paste sanitize·range/history 관찰 |
| TX03 | typography·locale·font | P | Missing font diagnostics, locale-aware shaping and text scaling matrix remain. |
| TX04 | 실제 asset import·reuse | M | bytes저장/hash/크기/MIME/preview; 이미지·아이콘·SVG import reuse/crop/fit/replace/작은border 편집, undo파생출처 |
| TX05 | asset security·rights·relink | M | SVG/URL/archive격리, id/version권리record≠blobhash, use별alt·web/native embedding·missingplaceholder·hash재연결·권리만료 |
| TX06 | 독립 BrandLibrary·guideline | M | versioned logos/font/image/icon·usage guide, optionalclearspace/minsize수치검사, libraryupdate 영향; 주관적brand적합성 자동pass 금지 |
| TX07 | 전문 vector/완전 CMS | D | 전체pathboolean·고급drawing·CMS는 후속/범위밖. 기본SVG안전import와richtext는현재필수 |
| PV01 | design/candidate/lastverified 구별 | P | 별도 source/revision/hash/environment/freshness, AI탐색후보/실제후보/lastverified 동시 비교, 실패후마지막유효본 보존 |
| PV02 | preview sandbox·geometry channel | M | origin/revision/schema검사bridge, 후보code/asset격리, secret/권한노출 없음; stale geometry/preview 실패 recovery |
| PV03 | forced state·외부응답 mock | P | delay/다른확정값/observedstate강제/clock controls, mock임을표시, 계약값의실제owner침범없음 |
| PV04 | Screen·Scenario authoring | P | inlineinstances와theme/asset/layout Screen, 별도Scenario초기값/event/mock/trace/expectation, prototype links·sharedstepbudget |
| PV05 | native 실제preview 연결 | M | QR/devclient/Host simulator/device, 실제environment receipt, 근사/실행 정확도 표시·전환, unsupported연결 명시 |
| PV06 | share·예제app pack | M | revision고정 previewlink권한/만료/회수, example sources/assets/mock/routes 소유권과export; 사용자업무API 포함금지 |
| RV01 | transient→review→원자apply | B | Same authenticated whole-proposal transaction boundary; not arbitrary hunk selection. |
| RV02 | 동일 요청 재생·lost reply | B | 동일principal/project/key/request는원receipt, stale후에도추가revision/예산/외부효과없음; 미확정다른시도자동발급금지 |
| RV03 | 충돌 비교·선택 적용 | P | before/current/proposed 시각diff, 안전항목선택 시새closure/digest/review; 현재wholecandidate를partialhunk지원으로표시금지 |
| RV04 | Undo/redo·history | P | historytimeline/origin/labels, source·draft·gesture별일관성. realtime개인Undo와sharedrevert는후속별도 |
| RV05 | source 오류초안·왕복 | B | valid원본·오류·unknown영역 보존의현재경로유지; 목록에서모든draft다시열기/원본비교/실패candidate복구 UX는추가 필요 |
| RV06 | 프로젝트 import/copy/bundle | P | GUI파일/bundle열기·identitycopy/refMap/update선택·복수workspace관리; 같은이름자동overwrite금지 |
| RV07 | 등록된 migration pair/lossreport | M | 실제pair가생길때source/digest/precondition/ops/inverse/loss/target/userchoice포함해review. 빈framework를완료로계산금지 |
| SV01 | durablebrowser/Node store | B | process-crash/IndexedDBcomplete 범위유지. power-loss·eviction·모든browser를확대claim하지않음 |
| SV02 | 공간부족·권한회수·내보내기복구 | P | quota/blocked/권한회수 시 unsaved/마지막유효본·경로이동·export·재시작복구를GUI에서실제완료 |
| SV03 | 외부ADS파일 watch·merge | M | filehash관찰→before/current/proposed→review, rename/delete/권한회수·reconnect·실제폴더원문보존 |
| SV04 | prepared offline/internalAI | M | assets/font/deps/tools/registry/endpoint준비manifest→network차단→restart→편집/검사/출력/internalAI동작 |
| SV05 | realtime 협업·presence·개인Undo | D | 실제sync/conflict/lease/privatecamera/sharedrevert 실증. 현재local동시연결시험을협업완료로확대하지않음 |
| SV06 | 이력정리·복구한계 | P | checkpoint/export/compaction·보존refs정책, hardcap도달예고·자료유실없는정리. 안전cap을제품capacity약속으로사용금지 |
| HC01 | Browser↔Host 연결 | M | originchallenge/승인root/toolinventory/version/lease·job범위, disconnect후jobstatus·receipt복구; 바탕화면앱이곧제품Host는아님 |
| HC02 | 격리된 실행 job | M | 승인jobplan/allowlist/network/timeout/budget/candidatearea/effects/rollback, sandbox없으면실행불가, 임의buildersecret접근금지 |
| AP01 | 공식 API/MCP 전체표면 | P | catalog52command/10query transport와version/auth/pagination/parity, token/Part/behavior등typedoperation. document.import범용탈출로52구현합산금지 |
| AP02 | ContextBundle·AI 제공자 | M | selection+refclosure+pinnedrevision+capabilities+allowedoperations+budget, officialBYOK/local/internalendpoint·secretstore·오류/비용UI |
| AP03 | 구현후보·독립oracle·한도 | M | immutablecontract/TestPlan/discovery/oracle vsAI권한, attemptbudget·cancel·lastverified·실패후보보존, test삭제/skip/expectation변경차단 |
| AP04 | hosted entitlement·과금receipt | N | 가격/무료한도owner결정, 원자budgetreservation·effectreceipt, unknownpaidoutcome후자동새chargedattempt금지; localread/export유지 |
| TG01 | React/CSS 3종 출력 | B | Not all catalog semantics, providers or AT certification. |
| TG02 | RN Expo 3종 출력 | P | emulator/devicecontrols/IME/VoiceOver/TalkBack·host수명실행, bundle완료를native조작성pass로합산금지 |
| TG03 | SwiftUI·Compose 출력 | P | Apple/Androidcompiler+simulator/device/AT·resources·cleanup, 도구없는환경은notRun/blocked. 생성파일존재만pass금지 |
| TG04 | 전체8target/style profile | P | ReactSCSS/Tailwind/선정CSS-in-JS, bareRN 추가, 정확version/deps/SSR/RSC/scan등각환경검사; 전체cartesian조합약속아님 |
| TG05 | Axiom+선택제공자pack | M | ReactAria/BaseUI/shadcn 차이/권리/behavior/style/deps manifest와실제oracle, native대응 목적명시 |
| TG06 | 전체카탈로그×적용profile 의무 | P | Complete catalog/provider/profile matrix remains. |
| DL01 | init·환경감지·실제doctor | P | framework/dirs/aliases/provider/depslock감지+수동mapping→installplan→실제build/sample. generatedRelease와installedRelease분리 |
| DL02 | 4deliverymode | P | sourcefolder/directappcopy/usernpm/Gitlibrary 각각검토·복원·설치흐름. 네타깃버튼은네전달방식이아님 |
| DL03 | 완결artifact·rights·ownership | P | 실제dependency·assetclosure와선택권리record고지, 공개artifactimport폐쇄, 구독종료후사용·noSaaSruntime유지 |
| DL04 | 사용자수정3-way upgrade | B | whole-file한정보존·stale·apply/rollback/recovery유지, GUI연결/선택hunk/이름변경·dependency/provider분리review는추가 |
| DL05 | partialhunk·여러connection·rollback | P | hunk부분baseline보류정보, app별version/mixed상태·시험·후속upgrade, rollback후새사용자수정보존·환경snapshot |
| DL06 | 실제publish·supplychain | P | npm/Git게시별명시범위·권리·version·artifact검증/실패receipt; 정본문서Undo가외부publish를취소한다고표시금지 |
| QA01 | 요구→oracle→evidence 탐색 | P | component/trait/target/requirement UI, setup/stimulus/expected·환경/fixture/oraclehash·timestamps·observations, codehash에연결된freshness |
| QA02 | release 판단·manual gate | P | both자동/수동분리, missing/discoveryempty/waived/stale인경우전체pass금지; 전체profile다시실행, exactartifact와검증본연결 |
| QA03 | Studio keyboard·AT·KO/EN | P | deepselect/move/resize/reorder/tokencreate/bulk/설치까지keyboard, macOS/Windows실제IME·AT, longstrings/textscale/narrow, 모든진단번역 |
| QA04 | 성능·관측·support | P | 실제workload p95/memory/coldwarm/cancel·resource, optindiagnosticbundle/최소repro·복원runbook, redaction·보관지역/기간선정 |
| QA05 | 실제사용자여정·출시주장 | N | consent/revision/environment/time/help/포기/repro 실제관찰. 문구·가격·성공률·native완료를연구가설에서사실로올리지않음 |
| DS01 | Axiom 자체 DS 전면 재설계 | P | Product-wide state inventory and independently verified all-state accessibility still required. |
| DS02 | 도구 중심 정보위계·가독성 | P | 200% text scale and full diagnostic/deep selection accessibility remain. |
| DS03 | panel resize/collapse·layout 기억 | M | keyboard등가separator와min/max, 좁은화면에서핵심명령/선택탐색유지; 선호layout은세션설정, 도메인정본에저장안함 |
| DS04 | zoom preset/fit selection·손도구 안내 | B | Physical platform gesture verification remains explicitly unverified. |
| DS05 | command palette·최근/즐겨찾기 | P | Recent objects and favorites remain. |
| DS06 | narrow/mobile에서동등작업 | P | Full mobile gesture/keyboard parity remains. |
| DS07 | 진행·취소·오류의 일관된 피드백 | P | Cancellation/progress for all long jobs remains. |
| DS08 | 자체 DS 실제 사용 검증 | P | Independent finish review and broader real-user/AT evidence do not imply Foundation completion. |
