# 한국어·영어 용어와 핵심 메시지

제품 UI는 한국어·영어를 필수로 제공한다. 안정 ID·API 이름과 표시 문자열은 분리하고, 번역은 컴포넌트의 의미나 version을 바꾸지 않는다. 아래는 작업 흐름을 설명하는 핵심 카피 초안이다. 아직 실제 화면에서 사용성 검증된 문구는 아니다.

## 메시지 작성 규칙

일반 사용자는 목적·다음 행동을 먼저 보고 영어 원어를 필요할 때 확인한다. 오류는 대상·원인·복구를 구분하며 “잘못됨” 한 단어로 끝내지 않는다. 경고의 색·아이콘만으로 의미를 전달하지 않는다. 같은 message ID의 parameter 집합은 모든 언어에서 일치해야 한다.

날짜·숫자·복수형은 locale formatter를 사용한다. 콘텐츠 자체와 API는 UI 언어 변경으로 번역하지 않는다. 누락 번역은 명확한 fallback을 사용하며 release 검사에서 누락 목록을 확인한다. 핵심 흐름의 fallback 문자열을 최종 번역 완료로 계산하지 않는다.

## 핵심 카피 목록

| ID | 한국어 | English |
|---|---|---|
| start.storage.browser | 브라우저에 보관 | Keep in this browser |
| start.storage.folder | 로컬 폴더에 보관 | Keep in a local folder |
| start.customize | 기본 시스템 수정하기 | Customize the starter system |
| start.ai | AI와 시작하기 | Start with AI |
| start.practice | 예제로 연습하기 | Learn with an example |
| mode.edit | 편집 모드 | Edit mode |
| mode.run | 실행 모드 | Run mode |
| selection.part | 부위 (Part) | Part |
| selection.slot | 콘텐츠 자리 (Slot) | Content slot |
| variant | 종류 (Variant) | Variant |
| state | 상태 (State) | State |
| condition | 환경 조건 (Condition) | Environment condition |
| theme | 테마 (Theme) | Theme |
| layout.hug | 내용에 맞춤 (Hug) | Hug content |
| layout.fill | 공간 채움 (Fill) | Fill available space |
| layout.fixed | 고정 크기 (Fixed) | Fixed size |
| owner.local | 컴포넌트가 값 관리 | Component manages the value |
| owner.consumer | 앱이 값을 확정 | App controls the value |
| preview.design | 디자인 시연 | Design simulation |
| preview.candidate | 미검증 구현 후보 | Unverified implementation |
| preview.verified | 마지막 검증본 | Last verified implementation |
| preview.stale | 현재 디자인과 다름 | Differs from the current design |
| support.partial | 일부만 지원 | Partial support |
| support.notRun | 아직 실행 검증하지 않음 | Not tested in this environment |
| review.sharedToken | 공유 토큰의 사용처를 확인하세요 | Review where this shared token is used |
| review.diff | 변경 내용 확인 | Review changes |
| review.apply | 선택한 변경 적용 | Apply selected changes |
| review.reject | 변경안 취소 | Discard proposal |
| override.reset | 원본 값으로 되돌리기 | Reset to the original value |
| override.promote | 공통 디자인으로 만들기 | Promote to shared design |
| host.connected | 연결된 호스트: {hostName} | Connected host: {hostName} |
| host.required | 이 작업에는 로컬 도구 연결이 필요합니다 | Connect local tools to run this task |
| asset.missing | 원본 자산을 찾을 수 없어 대체 표시 중입니다 | Showing a placeholder because the original asset is missing |
| source.unknown | 이 변경의 생성 출처를 확인할 수 없습니다 | The origin of this change is unknown |
| undo | 되돌리기 | Undo |
| revert.shared | 공유 문서를 이전 버전으로 되돌리기 | Revert the shared document |
| motion.reduced | 움직임 감소 환경 비교 | Compare reduced motion |
| doctor.plan | 설치할 파일·의존성 확인 | Review files and dependencies to install |
| storage.unsaved | 아직 저장하지 못한 변경이 있습니다 | Some changes have not been saved |
| ai.context | AI가 참고하는 범위 | Context available to AI |
| ai.budget | 작업 한도: {budget} | Task budget: {budget} |
| output.local | 소스 폴더로 내보내기 | Export a source folder |
| output.copy | 앱에 직접 복사 | Copy into an app |
| output.npm | 내 UI 패키지로 만들기 | Create my UI package |
| output.git | Git UI 라이브러리로 관리 | Manage a Git UI library |

## 진단 메시지 구성 예시

REVISION_STALE은 “다른 변경이 먼저 적용되었습니다. 현재 값과 제안값을 비교한 뒤 적용하세요.” / “Other changes were applied first. Compare the current and proposed values before applying.”로 표현한다. 기술 code는 상세 정보에서 복사할 수 있다.

SLOT_CONTRACT는 “이 자리에는 텍스트 또는 허용된 컴포넌트를 넣을 수 있습니다.” / “This slot accepts text or a compatible component.”처럼 실제 허용 종류와 개수를 parameters로 채운다. HOST_UNRESOLVED는 연결된/후보 host 경로와 지정·생성 행동을 제공한다.

30개 진단 code 전체의 의미와 복구 행동은 [명령·진단 catalog](commands-and-diagnostics.md)가 소유한다. 실제 구현에서는 각 code의 localized template·parameters·검증 fixture를 같은 ID로 등록한다. 오류의 의미를 이 문서에서 다른 규칙으로 재정의하지 않는다.

## 검증

ko/en key 집합과 parameter 일치, 긴 문자열 layout, screen reader 이름·공지, 잘림 없는 적용 버튼, 한글 IME 중 단축키, 입력 언어와 UI 언어 차이를 검사한다. 사용자 수준별 온보딩은 같은 기능을 다른 설명으로 소개하고 기능 권한을 낮추지 않는다.

[메시지 JSON](message-catalog.json) · [공통 용어](../governance/glossary-and-naming.md) · [Studio 접근성](../experience/editor-accessibility-and-language.md)

## 전체 진단 메시지 초안

| code | 한국어 | English |
|---|---|---|
| AUTH_SCOPE | 권한 범위 부족. 연결·역할의 허용 범위를 확인. | You do not have permission for this action. |
| ENTITLEMENT_LIMIT | 서비스 사용권/자원 한도. 허용한 자원·로컬 대안 확인. | This action exceeds the available service allowance. |
| REVISION_STALE | 기준 revision이 바뀜. 현재/제안 diff 재계획. | The document changed. Compare the current and proposed values. |
| IDEMPOTENCY_CONFLICT | 같은 key에 다른 입력. 새 의도로 새 key 생성. | This request key was already used with different input. |
| REVIEW_REQUIRED | 중요 변경 검토 필요. 영향·patch 검토. | Review the changes and their impact before applying. |
| APPROVAL_STALE | 승인한 patch/base와 다름. 새 변경안 확인. | The approved changes no longer match the current proposal. |
| REF_MISSING | 참조 대상 없음. 대체·재연결·미해결 초안. | The referenced item could not be found. |
| REF_KIND | 참조 종류 불일치. 올바른 대상 선택. | The referenced item has an incompatible kind. |
| ID_DUPLICATE | 불변 ID 중복. 독립 복사·ID mapping. | This stable ID is already in use. |
| STRUCTURE_CYCLE | 금지된 구조 순환. 관계 경로 수정. | This relationship would create a prohibited cycle. |
| TYPE_MISMATCH | 값·port 타입 불일치. type 또는 binding 수정. | The value or binding has an incompatible type. |
| OWNER_CONFLICT | 값 확정 주체 중복. owner 하나 선택. | More than one owner would control this value. |
| INPUT_CLAIM_CONFLICT | 동일 입력 의무 충돌. scope/profile/유형 조합 수정. | These behaviors require conflicting handling of the same input. |
| REQUIRED_ROLE_MISSING | 필수 부품 의미 누락. 역할·관계 복구. | A required part role or relationship is missing. |
| SLOT_CONTRACT | 콘텐츠 종류·개수 불일치. slot 내용/계약 비교. | The content does not meet this slot contract. |
| RULE_AMBIGUOUS | 외형 규칙 동점 충돌. 명시 priority/refinement. | Multiple appearance rules have conflicting precedence. |
| HOST_UNRESOLVED | 호스트 누락·모호함. 실제 경로 확인·지정·생성. | A compatible host is missing or ambiguous. |
| STANDARD_UNSUPPORTED | 표준 의미 미지원. 원형 보존·지원 제한 확인. | This standard feature is preserved but not supported here. |
| TARGET_UNSUPPORTED | 선택 타깃 mapping 없음. 대안/별도 구현/부분 출력. | This feature has no supported mapping for the selected target. |
| ASSET_MISSING | 파일·폰트 누락. 대체 preview·재연결. | The required asset or font could not be found. |
| RIGHTS_UNVERIFIED | 자산/코드 권리 미확인. 해당 배포 보류·대체. | The rights for this asset or code have not been verified. |
| STORAGE_FULL | 저장 용량 부족. export·위치 변경·공간 확보. | The changes could not be saved because storage is full. |
| FILE_DRIFT | 외부 파일 변경. 현재/제안/기준 비교. | The file changed outside Axiom. Compare it before applying. |
| BUDGET_EXCEEDED | 실행 예산 초과. 중단·후보 보존·재계획. | The task reached its resource budget. |
| EVIDENCE_STALE | 현재 후보의 증거 아님. 해당 profile 재검증. | The evidence does not apply to the current candidate. |
| TEST_DISCOVERY_EMPTY | 기대 시험 누락. oracle/발견 범위 복구. | Expected tests were not discovered. |
| SANDBOX_UNAVAILABLE | 필요 격리 보장 없음. 해당 실행 제한·안전 경로. | The required execution isolation is unavailable. |
| HOST_DISCONNECTED | 연결 끊김. job 재조회·재연결. | The connected host is unavailable. |
| JOB_PARTIAL_EFFECT | 일부 외부 효과 발생. receipt 확인·보상/복구. | Some external changes were applied. Review the effect receipt. |
| EXPRESSION_LIMIT | 표현식 타입/평가 한도. 식 단순화·오류 수정. | The expression is invalid or exceeds its evaluation limit. |
