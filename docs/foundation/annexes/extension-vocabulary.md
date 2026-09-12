# 사전 확장 어휘와 조합 계약

상태: 본문 CMP02·CMP11의 검토용 registry. 38 trait·31 role·36 policy·45 family를 일반화한 설계이며 실행 지원 목록이 아니다. 이전 후보의 사업 결과형 해석은 UI 목적·외부 값 표시로 제한했다.

## 조합의 원리

Family는 탐색·시작 템플릿이고 trait는 타입 있는 값·이벤트·의무를 만든다. 같은 입력 scope에서 충돌하는 claim, 같은 value의 두 writer, incompatible role을 허용하지 않는다. 독립 인스턴스의 version 공존은 가능하고 공통 port/context를 연결할 때 호환성을 검사한다.

새 항목은 local namespace에서 시작해 프로젝트·라이브러리로 승격한다. 기존 의무 유지 확장은 재사용하지만 의미 변경은 독립 archetype과 새 oracle를 요구한다. 아래 parameter 목록은 공통 binding 설계이며 실제 target profile에서 필수 role·input claim·oracle를 구체화해야 한다. 빈 configuration 객체로 모든 타입이 실행된다고 취급하지 않는다.

async-status는 busy/progress를 외부에서 받아 표현하는 선택 능력이다. plain Card와 기본 Button의 필수 능력이 아니다. timer는 opt-in이며 Toast의 업무상 고정 8초 규칙이 아니다. validation·file-intake·sequence-flow는 UI 의미를 다루며 업무 검증·업로드·승인을 실행하지 않는다.

## Trait — 어떤 능력을 추가하는가

| ID · 이름 | 목적 | 구성 필드 | 값·이벤트 port | 필수 불변식 · 검사 family |
|---|---|---|---|---|
| axiom.trait/naming · 이름 전달 | 무엇을 조작하거나 읽는지 알 수 있다 | target:PartRef; source:NameSource | nameSource:relationship | 아이콘만 있어도 목적을 알 수 있는 이름을 제공 · name-and-purpose |
| axiom.trait/description · 설명 연결 | 필요한 도움말·오류 설명을 연결한다 | target:PartRef; sources:list&lt;DescriptionSource&gt; | descriptionSources:relationship | 이름과 추가 설명을 구분 · description-association |
| axiom.trait/availability · 사용 가능 상태 | 지금 조작할 수 있는지를 일치시킨다 | mode:enum(disabled,readOnly); focusPolicy:enum(profile) | disabled:read&lt;boolean&gt;; readOnly:read&lt;boolean&gt; | 비활성으로 알리면서 실제 명령이 실행되지 않음 · availability-and-input |
| axiom.trait/activation · 명령 활성화 | 사용자 입력을 한 번의 명령으로 인정한다 | inputProfile:ProfileRef | activate:emit&lt;ActivationPayload&gt; | 취소는 0회, 유효한 완료는 1회 · activation-once-and-cancel |
| axiom.trait/destination · 이동 대상 | 다른 위치나 자원으로 이동한다 | allowedSchemes:list&lt;string&gt;; target:enum(same,new) | destination:read&lt;URI&gt;; navigate:emit&lt;NavigationIntent&gt; | 명령 실행과 이동 의미를 혼동하지 않음 · navigation-intent |
| axiom.trait/value · 값의 소유권 | 컴포넌트가 다루는 값을 한 주체가 소유한다 | ownership:enum(local,consumer); type:TypeExpr | value:read&lt;T&gt;; changeRequest:emit&lt;T&gt; | 같은 값을 소비 앱과 컴포넌트가 동시에 정본으로 쓰지 않음 · single-owner-and-commit |
| axiom.trait/text-editing · 문자 편집 | 텍스트와 편집 중인 버퍼를 다룬다 | multiline:boolean; maxLength:nullable&lt;integer&gt; | text:owned-or-controlled&lt;string&gt;; selection:runtime&lt;TextSelection&gt;; edit:emit&lt;TextEdit&gt; | IME 확정 입력이 다른 명령을 겸하지 않음 · ime-selection-undo |
| axiom.trait/selection · 선택 관리 | 어떤 항목을 선택했는지 다룬다 | mode:enum(single,multiple); allowEmpty:boolean | selected:owned-or-controlled&lt;KeyOrKeys&gt;; selectionRequest:emit&lt;KeyOrKeys&gt; | 후보 탐색과 실제 선택을 구별 · selection-identity-and-commit |
| axiom.trait/collection-identity · 목록 항목 식별 | 목록이 바뀌어도 같은 항목을 추적한다 | keyType:OpaqueKeyType | items:read&lt;list<Item&gt;>; keys:derived&lt;list<Key&gt;> | 배열 순서가 바뀌어도 다른 항목으로 선택이 이동하지 않음 · stable-key-and-duplicates |
| axiom.trait/collection-navigation · 목록 탐색 | 후보 사이에서 조작 대상을 이동한다 | orientation:enum(horizontal,vertical,both); wrap:boolean | activeKey:runtime&lt;nullable<Key&gt;>; move:emit&lt;NavigationIntent&gt; | 키 입력 하나를 두 조정자가 중복 처리하지 않음 · focus-versus-selection |
| axiom.trait/disclosure · 열기와 닫기 | 필요할 때 영역을 드러내고 숨긴다 | initialOpen:boolean | open:owned-or-controlled&lt;boolean&gt;; openRequest:emit&lt;boolean&gt; | 열림 의미와 실제 영역의 상태가 일치 · open-close-and-relations |
| axiom.trait/focus-scope · 포커스 조정 | 키보드와 보조기술의 조작 위치를 다룬다 | modal:boolean; restore:enum(trigger,explicit,profile) | entry:read&lt;PartRef&gt;; return:read&lt;PartRef&gt;; focusRequest:emit&lt;FocusIntent&gt; | 닫힌 영역이나 사라진 대상에 포커스를 남기지 않음 · focus-entry-return-and-fallback |
| axiom.trait/presence · 표시 수명 | 열림/닫힘과 등장/퇴장 완료를 구별한다 | initial:enum(mounting,removed) | presence:runtime&lt;Presence&gt;; enter:emit&lt;Lifecycle&gt;; exit:emit&lt;Lifecycle&gt; | 오래된 모션 완료가 새 상태를 덮지 않음 · presence-and-cleanup |
| axiom.trait/motion · 움직임 표현 | 상태 변화를 시각적 움직임으로 전달한다 | interruption:enum(finish-then-next,replace,reverse,snap); reduced:MotionAlternative | motionRequest:emit&lt;MotionIntent&gt;; complete:read&lt;MotionCompletion&gt; | 축소 모션에서도 동작 완료와 의미 유지 · interruption-and-reduced-motion |
| axiom.trait/announcement · 변화 알림 | 화면 변화의 의미를 사용자에게 전달한다 | priority:enum(polite,assertive); deduplication:enum(instance-generation) | content:read&lt;Content&gt;; announce:emit&lt;AnnouncementIntent&gt; | 의미 없는 재렌더가 반복 공지를 만들지 않음 · announcement-order-and-dedup |
| axiom.trait/dismissal · 닫기 요청 | 요청을 받아 종료를 한 번 처리한다 | sources:list&lt;enum(close,escape,outside,timeout,external)&gt; | closeRequest:emit&lt;CloseReason&gt; | 중복 닫기에서 이벤트·제거 중복 없음 · dismiss-order-and-idempotency |
| axiom.trait/timer · 시간 조건 | 표시·상호작용에 필요한 UI 시간 조건을 다룬다 | enabled:boolean; duration:nullable&lt;Duration&gt;; pauseSources:list&lt;string&gt; | elapsed:runtime&lt;Duration&gt;; timeout:emit&lt;TimerIntent&gt; | 중지 이유가 남았는데 타이머를 재개하지 않음 · pause-resume-and-cancel |
| axiom.trait/form-participation · 폼 참여 | 입력값을 폼의 제출·초기화와 연결한다 | name:nullable&lt;string&gt;; submission:enum(native,host) | value:read&lt;T&gt;; reset:read&lt;ResetIntent&gt;; submitRequest:emit&lt;UIIntent&gt; | 보이는 값과 제출 값의 의미를 유지 · form-value-reset |
| axiom.trait/validation · 입력 형식·적합성 결과 표현 | UI 형식 검사와 외부 적합성 결과를 표시한다 | displayTiming:enum(input,blur,submit,external) | validity:read&lt;UIValidity&gt;; message:read&lt;Content&gt; | 검사 결과를 해당 입력 값에 연결하고 업무 적합성은 앱이 판단 · validation-without-business-rules |
| axiom.trait/parsing-formatting · 읽기와 표시 형식 | 입력 문자열과 숫자·날짜 등 실제 값을 변환한다 | parserProfile:ProfileRef; locale:LocaleRef | buffer:runtime&lt;string&gt;; value:owned-or-controlled&lt;T&gt;; parseResult:derived&lt;ParseResult&gt; | 미완성 입력과 확정된 잘못된 값을 구별 · partial-input-and-commit |
| axiom.trait/numeric-domain · 숫자 범위 | 최소·최대·간격을 갖는 수치를 다룬다 | min:nullable&lt;number&gt;; max:nullable&lt;number&gt;; step:number | value:owned-or-controlled&lt;number&gt; | 범위/정밀도 정책을 지키는 값 요청 · numeric-bounds-and-step |
| axiom.trait/range-adjustment · 범위 조절 | 손잡이 하나 이상으로 값을 조정한다 | thumbCount:integer; crossing:enum(allow,forbid); orientation:enum(horizontal,vertical) | values:owned-or-controlled&lt;list<number&gt;>; adjust:emit&lt;RangeIntent&gt; | 드래그 없이도 같은 값을 조작 가능 · range-order-and-alternative-input |
| axiom.trait/temporal-domain · 날짜와 시간 | 달력·날짜·시간 값의 의미를 유지한다 | calendar:CalendarRef; granularity:enum(date,time,datetime); zone:nullable&lt;ZoneRef&gt; | value:owned-or-controlled&lt;TemporalValue&gt; | 날짜만인 값에 시간대를 몰래 추가하지 않음 · calendar-zone-date-only |
| axiom.trait/color-domain · 색상 값 | 색 공간과 채널을 일관되게 다룬다 | space:ColorSpaceRef; alpha:boolean | color:owned-or-controlled&lt;Color&gt;; channels:derived&lt;ColorChannels&gt; | 채널 조작이 서로 다른 색 정본을 만들지 않음 · color-space-and-channel-consistency |
| axiom.trait/file-intake · 파일 받아들이기 | 선택/드롭한 파일을 검토 가능한 값으로 전달한다 | accept:list&lt;MediaType&gt;; multiple:boolean; maxSize:nullable&lt;integer&gt; | files:read&lt;list<FileHandle&gt;>; selectRequest:emit&lt;FileSelection&gt; | 선택 완료를 업로드 성공으로 간주하지 않음 · file-selection-not-upload |
| axiom.trait/drag-drop · 끌어서 옮기기 | 드래그 의도를 명령·변경 요청으로 변환한다 | operation:enum(move,copy); acceptedTypes:list&lt;TypeRef&gt; | payload:read&lt;T&gt;; dropRequest:emit&lt;DropIntent&gt;; cancel:emit&lt;CancelIntent&gt; | 취소와 성공을 구별하고 대체 조작 제공 · drag-keyboard-cancel |
| axiom.trait/async-status · 외부 진행 상태 표현 | 일반적인 외부 busy/progress UI 값을 표시한다 | display:enum(progress,busy); indeterminateAllowed:boolean | busy:read&lt;boolean&gt;; progress:read&lt;nullable<number&gt;> | 업무 결과를 계산하거나 기본 Card에 강제하지 않음 · external-progress-only |
| axiom.trait/layout · 배치 | 공간과 콘텐츠 순서를 정의한다 | layoutProfile:ProfileRef | geometry:derived&lt;Geometry&gt;; constraints:read&lt;LayoutRules&gt; | 시각 재배치가 의미 순서를 무조건 뒤집지 않음 · layout-reading-order |
| axiom.trait/content · 내용 표현 | 텍스트·이미지·자료를 의미 있게 보여준다 | exposure:enum(informative,decorative) | content:read&lt;Content&gt; | 장식과 실제 정보 전달을 구별 · content-meaning-and-slots |
| axiom.trait/image-fallback · 이미지 대체 | 이미지 실패에도 필요한 정보를 보존한다 | strategy:enum(text,icon,placeholder) | source:read&lt;AssetRef&gt;; status:runtime&lt;LoadState&gt;; fallback:read&lt;Content&gt; | 대체로 바뀌어도 필요한 이름 유지 · fallback-name-preservation |
| axiom.trait/hierarchy · 계층 자료 | 부모/자식 자료와 펼침 상태를 연결한다 | keyType:OpaqueKeyType; expansion:enum(local,consumer) | nodes:read&lt;list<TreeNode&gt;>; expanded:owned-or-controlled&lt;list<Key&gt;> | 화면 접힘과 자료 삭제를 혼동하지 않음 · tree-identity-and-expansion |
| axiom.trait/scroll-position · 스크롤 위치 | 사용자가 보던 위치를 추적한다 | follow:enum(manual,at-end,always); anchor:enum(item,offset) | position:runtime&lt;ScrollPosition&gt;; scrollRequest:emit&lt;ScrollIntent&gt; | 새 내용이 와도 이전 내용을 읽는 위치를 무조건 빼앗지 않음 · scroll-anchor-preservation |
| axiom.trait/resizable · 크기 변경 | 영역이나 열의 크기를 조절한다 | min:Dimension; max:nullable&lt;Dimension&gt;; axis:enum(x,y,both) | size:owned-or-controlled&lt;Size&gt;; resizeRequest:emit&lt;Size&gt; | 최소 크기와 대체 조작을 유지 · resize-bounds-and-keyboard |
| axiom.trait/virtual-window · 부분 렌더링 | 많은 항목 중 보이는 부분만 렌더링한다 | overscan:integer; focusStrategy:enum(retain,restore) | items:read&lt;list<Item&gt;>; window:runtime&lt;Window&gt;; activeKey:read&lt;Key&gt; | DOM/native node 교체로 논리 identity가 바뀌지 않음 · virtual-identity-focus |
| axiom.trait/data-visualization · 자료 시각화 | 숫자 자료를 시각적 관계로 표현한다 | encoding:ChartEncoding; alternative:enum(table,summary,both) | data:read&lt;list<Record&gt;>; selectionRequest:emit&lt;ChartSelection&gt; | 그림만 보고 이해할 수 없는 사용자에게 자료 접근 경로 제공 · chart-alternative-and-units |
| axiom.trait/rich-document · 서식 문서 편집 | 문단·서식·선택 범위를 편집한다 | allowedNodes:list&lt;string&gt;; allowedMarks:list&lt;string&gt; | document:owned-or-controlled&lt;TextDocument&gt;; selection:runtime&lt;TextSelection&gt;; editRequest:emit&lt;DocumentEdit&gt; | 명령 적용과 undo가 문서·선택 상태에 일치 · document-structure-ime-history |
| axiom.trait/sequence-flow · UI 단계 탐색 | 여러 UI 단계의 표시와 이동 요청을 조정한다 | navigation:enum(manual,controlled); allowSkip:boolean | current:owned-or-controlled&lt;Key&gt;; canMove:read&lt;boolean&gt;; moveRequest:emit&lt;StepIntent&gt; | 현재 UI 단계와 이동 요청을 구분; 업무 승인·조건 판단은 소비 앱 소유 · ui-step-not-business-approval |
| axiom.trait/context-coordination · 공유 문맥 조정 | 여러 인스턴스가 쓰는 queue·환경·상태를 조정한다 | coordinatorRef:Ref; scope:Ref | registration:emit&lt;ClientRecord&gt;; context:read&lt;ContextRecord&gt; | 인스턴스 재렌더로 공유 상태를 초기화하지 않음 · host-scope-and-disposal |

## Role — 부품이 무슨 일을 하는가

Axiom role을 HTML ARIA role 문자열로 직접 출력하지 않는다. 관계·카디널리티·target semantics를 함께 실현한다.

| ID · 이름 | 허용 종류 | 책임·관계 의무 |
|---|---|---|
| axiom.role/surface · 전체 영역 | container | 컴포넌트의 표현 경계; 전체 역할은 archetype이 정함 |
| axiom.role/control · 조작부 | control | 사용자가 값을 바꾸거나 명령을 내리는 위치; 이름·상태·입력 의미 필요 |
| axiom.role/label · 이름 | text, content | 무엇인지 알려주는 내용; 이름을 줄 대상 연결 |
| axiom.role/description · 설명 | text, content | 이름 외의 도움말·오류; 이름과 설명 관계 구분 |
| axiom.role/content · 본문 | container, text, visual | 사용자에게 전달하는 실제 내용; 장식 여부 별도 선언 |
| axiom.role/decoration · 장식 | visual | 아이콘·배경 등 보조 표현; 필수 의미를 장식에만 두지 않음 |
| axiom.role/trigger · 여는 조작부 | control | 다른 영역 표시를 제어; controls 대상·open 연결 |
| axiom.role/popup · 떠 있는 영역 | container | 별도 위치에 표시되는 내용; modal 여부는 role 이름으로 고정하지 않음 |
| axiom.role/list · 목록 | container, logical | 항목들의 논리 집합; item identity·탐색 규칙 |
| axiom.role/item · 반복 항목 | repeated | 목록에서 하나의 자료를 표현; stable key |
| axiom.role/input · 입력부 | control | 편집 문자열/값을 받음; 편집 버퍼·값 구분 |
| axiom.role/value-display · 값 표시 | text, visual | 현재 값을 읽을 수 있게 표시; 표시 형식과 값의 의미 유지 |
| axiom.role/indicator · 상태 표시 | visual, text | 선택·진행 등 부품 상태; 필요한 상태는 비시각적 경로로도 전달 |
| axiom.role/track · 조절 기준선 | visual, container | 손잡이가 이동하는 기준; 값 범위·좌표 변환 |
| axiom.role/thumb · 조절 손잡이 | control | 범위 값 하나를 조정; 각 손잡이 이름·값·입력 대안 |
| axiom.role/header · 표 머리 | container, text | 열/행 의미의 이름; 해당 cell과 관계 |
| axiom.role/row · 행 | repeated | 같은 항목의 cell 집합; 행 identity |
| axiom.role/cell · 칸 | text, container, control | 표의 한 값 또는 편집 지점; 행·열·편집 상태 |
| axiom.role/action · 부가 명령 | control | 본문에 관련된 독립 명령; 본체와 다른 activation 적용 가능 |
| axiom.role/close · 닫기 조작부 | control | 닫기 요청을 발생; 닫기 이름·중복 처리 |
| axiom.role/backdrop · 배경 차단면 | visual, container | 떠 있는 영역의 배경 표현/입력 경계; 모달 정책의 일부일 때만 차단 |
| axiom.role/viewport · 보이는 창 | container | 스크롤/가상화의 표시 범위; 논리 목록과 구분 |
| axiom.role/panel · 연결된 내용 영역 | container | 탭·접기·단계의 내용; trigger/tab과 관계 |
| axiom.role/coordinator · 논리 조정자 | logical | 여러 부품의 입력·상태를 결합; 독립 렌더 노드 불필요 |
| axiom.role/anchor · 기준 위치 | control, container, logical | 팝업 위치·focus 복귀 기준; geometry 기준과 의미 대상 구분 |
| axiom.role/status-channel · 공지 통로 | logical | 문맥이 공지를 전달하는 연결점; context가 실제 채널 소유 |
| axiom.role/calendar.cell · 달력 칸 | repeated, control | 날짜 단위 표현/선택; 기간·달력·선택 의미는 profile |
| axiom.role/chart.plot · 자료 그림 | visual, container | 자료를 그림으로 표현; 자료 대체 표현 연결 |
| axiom.role/chart.legend · 자료 범례 | text, container, control | 표시 부호 설명 또는 series 제어; 표시와 조작의 경우 구분 |
| axiom.role/schedule.event · 일정 항목 | repeated, control | 시간·자원과 연결한 일정; 일정 이동/변경 권한 별도 |
| axiom.role/document.editor · 문서 편집면 | control, container | 서식 문서 조작; selection·history 계약 |

## Policy — 허용 범위에서 어떻게 동작할까

기본값은 적용하는 archetype/profile이 고정한다. 아래 선택지가 모든 조합에 허용되는 것은 아니다. 예를 들어 modal-isolation의 allow는 modal 의무를 만족하지 못하면 동일 모달 유형으로 채택할 수 없다.

| ID · 이름 | 구성 필드 | 보존 의무 |
|---|---|---|
| axiom.policy/activation-completion · 언제 누른 것으로 볼까 | completion:enum(profile,pointer-up,key-complete); deduplicate:boolean | 한 입력→한 명령; 취소→0 |
| axiom.policy/value-ownership · 값을 누가 확정할까 | owner:enum(local,consumer) | owner는 하나; 요청과 확정 구별 |
| axiom.policy/selection-commit · 언제 선택을 확정할까 | mode:enum(explicit,profile-auto) | focus 이동을 선택과 혼동하지 않음 |
| axiom.policy/selection-count · 몇 개까지 고를까 | min:integer; max:integer | 값 타입·최소/최대 개수 일치 |
| axiom.policy/query-edit · 검색어를 어떻게 다룰까 | ime:enum(commit-after-composition); selectionLink:enum(independent,clear-on-edit) | 조합 확정 중복·명령 오인 방지 |
| axiom.policy/focus-navigation · 다음 조작 대상으로 어떻게 갈까 | orientation:enum(horizontal,vertical,both); wrap:boolean; disabledItems:enum(skip,profile) | 타깃별 입력 소유권과 대체 경로 |
| axiom.policy/surface-dismiss · 어떤 입력으로 닫을까 | sources:list&lt;enum(close,escape,outside,external)&gt; | 모달/비모달·중첩 우선순위 유지 |
| axiom.policy/focus-entry-return · 열고 닫을 때 어디를 조작할까 | entry:PartRef; return:PartRef; fallback:ProfileRef | 사라진 대상 복귀·도착 focus 탈취 방지 |
| axiom.policy/modal-isolation · 배경 조작을 막을까 | modal:boolean; outsideInput:enum(block,allow) | 선택한 접근성 의미와 실제 차단 일치 |
| axiom.policy/presence-removal · 언제 화면에서 제거할까 | deadline:Duration; completion:enum(animation-or-deadline,immediate) | 오래된 완료·이중 제거 차단 |
| axiom.policy/motion-interruption · 움직이는 중 다시 바뀌면 | mode:enum(finish-then-next,replace,reverse,snap); queueLimit:integer | 필수 완료 신호 유실 방지 |
| axiom.policy/reduced-motion · 움직임을 줄이면 어떻게 보일까 | alternative:enum(snap,shorten,custom); definition:MotionAlternative | 의미와 완료 보존 |
| axiom.policy/announcement-priority · 언제 어떤 변화를 알릴까 | priority:enum(polite,assertive); deduplicate:boolean | 재렌더를 새 사건으로 오인하지 않음 |
| axiom.policy/notification-timeout · 자동으로 사라져도 될까 | enabled:boolean; duration:nullable&lt;Duration&gt;; pauseSources:list&lt;string&gt; | 행동 기회/내용 접근권을 보존 |
| axiom.policy/validation-timing · 언제 오류를 보여줄까 | when:enum(input,blur,submit,external) | 오류 설명과 해당 입력 값의 연결 유지; 업무 판정은 소비 앱 소유 |
| axiom.policy/parse-commit · 미완성 입력을 언제 값으로 볼까 | when:enum(blur,explicit,valid-input); invalid:enum(retain-buffer,revert) | '-' 등 부분 입력을 유효 숫자로 위장하지 않음 |
| axiom.policy/range-bounds · 범위를 벗어나면 | min:number; max:number; step:number; crossing:enum(allow,forbid) | 값 순서·정밀도·입력 대안 유지 |
| axiom.policy/locale-calendar · 달력과 시간을 어떻게 읽을까 | locale:LocaleRef; calendar:CalendarRef; zone:nullable&lt;ZoneRef&gt; | date-only/time/instant 의미 보존 |
| axiom.policy/file-acceptance · 어떤 파일을 받을까 | types:list&lt;MediaType&gt;; maxSize:nullable&lt;integer&gt;; multiple:boolean | 선택/업로드/검증 완료 구분 |
| axiom.policy/gesture-alternative · 드래그가 어려우면 | keyboard:ProfileRef; explicitControls:list&lt;PartRef&gt; | 동일 목적을 다른 입력으로 완료 |
| axiom.policy/image-fallback · 이미지가 없으면 | mode:enum(text,icon,placeholder); content:Content | 이름 중복·의미 소실 방지 |
| axiom.policy/responsive-layout · 공간이 달라지면 | conditions:list&lt;ConditionRef&gt;; unknown:enum(fallback,error) | 반응형에서 조작부·내용 손실 방지 |
| axiom.policy/scroll-follow · 새 내용이 오면 어디를 볼까 | mode:enum(manual,at-end,always); anchor:enum(item,offset) | 과거 내용을 읽는 위치 보존 |
| axiom.policy/resize-bounds · 얼마나 크게 바꿀까 | min:Dimension; max:nullable&lt;Dimension&gt;; step:Dimension | 숨겨진 필수 내용·조작 불가 방지 |
| axiom.policy/virtual-identity · 안 보이는 항목을 어떻게 다룰까 | key:FieldRef; focus:enum(retain,restore) | 재활용 node가 다른 항목으로 오인되지 않음 |
| axiom.policy/data-alternative · 그림 외에 자료를 어떻게 볼까 | mode:enum(table,summary,both); units:list&lt;string&gt; | 데이터 해석에 필요한 정보 보존 |
| axiom.policy/document-editing · 서식과 되돌리기를 어떻게 다룰까 | nodes:list&lt;string&gt;; marks:list&lt;string&gt;; paste:enum(sanitize,plain) | 붙여넣기/undo 의미 일치 |
| axiom.policy/step-progression · 다음 단계로 갈 수 있나 | request:EventRef; allowMoveValue:ValueRef | UI의 이동 요청과 외부가 제공한 이동 가능 값을 연결한다. 업무 승인 조건을 계산하지 않는다. |
| axiom.policy/context-queue · 여러 개가 동시에 오면 | mode:enum(fifo,latest,coalesce,reject-new); limit:integer; overflow:enum(reject,drop-oldest) | 다른 instance의 상태 침범 방지 |
| axiom.policy/navigation-commit · 어떤 위치로 이동할까 | destination:ValueRef; request:EventRef | 현재 위치와 이동 의미 일치 |
| axiom.policy/form-submit · 제출과 초기화는 어떻게 할까 | request:EventRef; nativeParticipation:boolean | 보이는 값과 전달 의미 일치; 서버 검증·저장은 소비 앱 책임 |
| axiom.policy/content-exposure · 정보인가 장식인가 | mode:enum(informative,decorative); nameSource:nullable&lt;NameSource&gt; | 필수 내용 소실·중복 전달 방지 |
| axiom.policy/external-effect · 바깥에 UI 요청을 어떻게 전달할까 | request:EventRef; response:nullable&lt;ValueRef&gt; | 컴포넌트가 업무 실행·성공·실패를 결정하지 않음 |
| axiom.policy/hierarchy-expansion · 접힌 하위 항목은 어떻게 다룰까 | owner:enum(local,consumer); preserveChildren:boolean | 부모 상태·하위 자료 identity 유지 |
| axiom.policy/color-conversion · 색 채널이 달라지면 | source:ColorSpaceRef; target:ColorSpaceRef; strategy:ProfileRef | 하나의 색 정본 유지 |
| axiom.policy/autoplay-rotation · 자동으로 다음 내용을 보여줄까 | enabled:boolean; duration:Duration; pauseOnFocus:boolean; pauseControl:PartRef | 사용자 정지 의사를 보존하고 움직임/읽기 기회를 통제 |

## Family — 시작점과 구체화 조건

| ID · 이름 | 예시 | 구체 profile에서 닫을 조건 |
|---|---|---|
| axiom.family/command · 명령 버튼 | Button / IconButton / CopyButton / FileTrigger의 명령부 | 순수 명령과 클립보드·파일 선택 같은 외부 효과를 분리 |
| axiom.family/binary-choice · 켜짐·선택 상태 | Checkbox / Switch / ToggleButton / Radio item | checked·mixed·on/off·pressed 의미가 달라 구체 archetype은 구별 |
| axiom.family/choice-group · 선택 그룹 | RadioGroup / CheckboxGroup / ToggleGroup / SegmentedControl | 단일/복수 값 타입과 선택-포커스 결합 정책 고정 |
| axiom.family/text-field · 문자 입력 | TextInput / TextArea / SearchField / Password / OTP / MaskInput | OTP·mask·JSON·password는 별도 편집/형식 profile 필요 |
| axiom.family/number-field · 숫자 입력 | NumberInput / NumberField | 미완성 숫자 문자열과 확정 수치 분리 |
| axiom.family/range-control · 연속 값 조절 | Slider / RangeSlider / Rating / AngleSlider | 단일/다중 thumb·별점·각도는 동일 semantic role로 합치지 않음 |
| axiom.family/color-control · 색 입력과 선택 | ColorArea / ColorPicker / ColorInput / HueSlider / ColorWheel | 2차원·원형 채널 조작의 타깃별 대안과 색 공간 필요 |
| axiom.family/temporal · 날짜·시간 입력 | Calendar / DatePicker / TimeField / MonthPicker | 표시 전용 달력/입력/기간·popup 유무·시간대는 구체 profile |
| axiom.family/file-intake · 파일 선택 | FileInput / FileButton / DropZone / Attachment | 파일 선택·표시 UI와 외부 요청 연결만 포함. 실제 업로드·업무 검사는 소비 앱 소유 |
| axiom.family/list-choice · 목록에서 선택 | Select / NativeSelect / ListBox / GridList | native select·popup list·상시 목록은 타깃/profile 구별 |
| axiom.family/query-choice · 검색하며 선택 | ComboBox / Autocomplete / searchable Select | 자유 입력 허용·선택값 결합·검색만 제공하는 도구인지 판정 |
| axiom.family/token-choice · 복수 값과 토큰 | MultiSelect / TagsInput / TokenField / TagGroup | TagGroup처럼 입력 없는 변형, freeform 값 생성 허용 분리 |
| axiom.family/hierarchical-choice · 계층에서 선택 | TreeSelect / Cascader | 상위/하위 선택 전파와 query 결과의 경로 표현 필요 |
| axiom.family/field-container · 입력의 이름·설명 묶음 | Field / Fieldset / Label / InputGroup / Group | 부품만 제공하는 Label과 완성된 필드를 구분 |
| axiom.family/form-flow · 폼과 단계 작업 | Form / Questionnaire | 폼 제출과 다단계/조건 분기를 구체화 |
| axiom.family/disclosure · 접기와 펼치기 | Accordion / Disclosure / Collapsible / Spoiler | 단일 영역/그룹·여러 개 열기·잘린 텍스트 펼치기 구분 |
| axiom.family/floating-surface · 떠 있는 작업 영역 | Popover / Drawer / Sheet / FloatingWindow / Dialog | 외형명으로 modal 여부를 추정하지 않고 목적·타깃 profile 선택 |
| axiom.family/modal-task · 집중 작업 창 | Modal / AlertDialog | 일반 modal과 응답이 필요한 alert dialog의 의무 구별 |
| axiom.family/context-help · 문맥 도움말과 미리보기 | Tooltip / HoverCard / PreviewCard / PreviewTrigger | 설명 전용과 interactive preview는 서로 다른 archetype |
| axiom.family/command-menu · 명령 목록 | Menu / Menubar / ContextMenu / DropdownMenu | 선택값 목록과 명령 목록 구별; submenu·context trigger profile |
| axiom.family/search-command · 명령 검색 | Command / Spotlight / CommandPalette | 값 선택용 combobox와 command 실행을 구별 |
| axiom.family/navigation · 위치 이동 | Link / Breadcrumb / Pagination / NavigationMenu / Stepper | 링크 이동·로컬 pagination·진행 표시만 하는 Stepper를 구별 |
| axiom.family/tabs · 연결된 패널 전환 | Tabs | 자동 활성화와 명시 활성화는 지연/환경에 따라 판정 |
| axiom.family/control-group · 명령부 묶음 | ButtonGroup / Toolbar / ActionBar | 단순 시각 그룹과 toolbar의 키보드 조정을 구별 |
| axiom.family/tabular · 표와 조작 가능한 격자 | Table / DataTable / interactive Grid | 정적 table과 interactive grid를 구분; 정렬/편집/선택 별도 |
| axiom.family/tree · 계층 목록 | Tree / NavigationTree | 읽기/선택/이동 목적과 노드별 상태를 분리 |
| axiom.family/content · 내용과 서체 | Text / Typography / Code / Badge / Kbd / List / DataList | 숫자/코드 포맷·내용 의미·장식의 subtype 필요 |
| axiom.family/surface · 콘텐츠 표면 | Card / Paper / Item / EmptyState | 기본 Card는 콘텐츠 컨테이너. 선택·접기·action은 해당 UI 목적 추가 시 별도 profile; 업무 역할·상태 제외 |
| axiom.family/layout · 배치 도구 | Stack / Flex / Grid / Container / AppShell / AspectRatio | layout grid는 interactive grid가 아님; landmark는 별도 선언 |
| axiom.family/image · 이미지와 정체성 표현 | Avatar / Image / ThemeIcon / BackgroundImage / ColorSwatch | 정보/장식·색 견본의 선택 가능 여부 구별 |
| axiom.family/status-message · 상태 메시지 | Alert / Notification / Indicator | 시각적 status와 live announcement를 동일시하지 않음 |
| axiom.family/toast-system · 일시 알림과 관리자 | Toast / Notifications system | 개별 Toast와 queue manager는 다른 개체 |
| axiom.family/progress · 작업 진행 | Progress / ProgressBar / RingProgress / NavigationProgress | 외부 진행 수치·불확정 진행의 표현 계약 필요. 실제 업무 실행·상태 판단은 소비 앱 소유 |
| axiom.family/measurement · 수치 측정 표시 | Meter / Gauge-style measure | 진행률과 측정값의 의미를 구별 |
| axiom.family/loading · 로딩 표현 | Skeleton / Loader / Spinner / LoadingOverlay | 장식 placeholder·loading 의미·입력 차단은 별도 선언 |
| axiom.family/carousel · 순차 콘텐츠 보기 | Carousel / Lightbox | autoplay·정지·modal lightbox와 일반 carousel의 focus 차이를 구체화 |
| axiom.family/scroll · 스크롤 보기 | ScrollArea / Scroller / MessageScroller / Marquee | 일반 스크롤·새 메시지 follow·자동 marquee는 별도 profile |
| axiom.family/resize · 크기 조절 영역 | Splitter / Resizable / adjustable Separator | 정적 separator와 조절 가능한 splitter 구분 |
| axiom.family/separator · 구분선 | Separator / Divider | 조절 가능하면 resize 계열로 전환 |
| axiom.family/chart · 자료 그림 | 22 chart kinds / Chart | 각 chart의 encoding·상호작용·대체 자료는 추가 계약 필요 |
| axiom.family/schedule · 일정과 자원 보기 | Schedule / DayView / ResourcesWeekView 등 | 날짜·시간대 표현, 항목 배치·탐색·이동 요청은 UI 계약. 예약 충돌·권한·업무 반복 규칙은 소비 앱 소유 |
| axiom.family/rich-editor · 서식 문서 편집 | Rich text editor | 문서 모델·붙여넣기·history·플랫폼 editor 엔진 필요 |
| axiom.family/messaging · 대화 메시지 구성 | Message / Bubble / Marker / Attachment | 메시지·첨부·외부 상태와 읽는 위치의 표현 계약. 전송·수신 확인·업무 결과 판단은 소비 앱 소유 |
| axiom.family/environment · 실행 환경과 서비스 | Direction / FocusTrap / Portal / Transition / VisuallyHidden / Modals manager | 여러 capability 후보 중 기능별 선택; 일반 시각 컴포넌트로 인증하지 않음 |
| axiom.family/virtualization · 큰 목록 부분 렌더링 | Virtualizer / OverflowList | OverflowList의 접힘과 window virtualization 차이를 profile로 구분 |

## 대표 호환·충돌 표

| 조합 | 판정 | 이유 |
|---|---|---|
| plain Card + content/layout | 허용 설계 | 불필요한 value/activation 없음 |
| Card + selection + naming | 조건부 허용 | selected owner·요청·선택 의미·입력 profile 필요 |
| Button + activation + destination | profile 검토 | link 목적과 command 목적 명시; 중복 activation 금지 |
| Select + query + selection | 허용 설계 | query와 selected 독립, 연결 policy 명시 |
| 하나의 selected 값에 local owner 2개 | 거부 | 확정 주체 모호 |
| 동일 control·guard의 Enter가 두 상충 action 수행 | 거부 | 입력 의무 충돌 |
| 독립 Button들의 activation v1/v2 | 공존 | 공유 port 없는 독립 계약 |
| 서로 다른 Select trigger/item version 혼합 | 호환 증명 전 거부 | context·event·state 공동 소유 |
| Dialog 내부 독립 Button | 허용 설계 | 대상·scope·입력 routing 구별 |
| Toast + timer | opt-in | timeout 설정과 pause·공지·제거 의무 필요 |

[기계 판독용 어휘](extension-registry.json) · [전체 카탈로그 연결](catalog-and-obligations.md) · [문서 필드 계약](document-contracts.md)

어휘 등록·참조의 구조 검사는 문서 QA에서 수행한다. 실행 요구·오라클·타깃별 fixture 완성은 구현 단계의 필수 과제이며 이 표를 근거로 준수 badge를 부여하지 않는다.
