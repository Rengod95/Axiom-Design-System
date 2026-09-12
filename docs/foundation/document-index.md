# Foundation 1.0.0 전체 문서 인덱스

상태: 방향·인덱스 확인 완료, 전체 본문과 부록 검토안 작성. 이 묶음의 확인 후 제품 구현으로 진행한다. 본문은 확정 요구를 구체화한 설계이며 실행 완료 증거가 아니다.

각 문서는 문제·사용 흐름, 계약·관계, 오류·복구, 검증과 변경 영향을 설명한다. 문서 ID는 안정적으로 유지하고 제목·파일을 바꿔도 manifest에서 추적한다. 각 원 결정에는 한 책임 문서가 있다.

[읽기 시작](README.md) · [전체 기준선 검토](baseline-review.md) · [기계 판독 manifest](document-manifest.json) · [결정 연결표](decision-coverage.md)

## GOV · 결정·문서 운영

| ID | 문서 | 책임 |
|---|---|---|
| GOV01 | [문서 권위와 변경 승인](governance/authority-and-change-control.md) | 사용자 결정·규범·설계안·증거의 권위, 변경 제안과 승인 단계 |
| GOV02 | [제품·도메인 용어와 이름](governance/glossary-and-naming.md) | Studio/Builder/ADS/DSF, Part·slot·state·condition·theme, 한국어/영어 용어 |
| GOV03 | [버전·호환·deprecated 정책](governance/version-and-compatibility.md) | 안정 판본 지원, 원본 보존·migration, breaking change와 deprecation |

## PRD · 제품 기획

| ID | 문서 | 책임 |
|---|---|---|
| PRD01 | [제품 목적·대상 사용자·핵심 문제](product/purpose-and-users.md) | DS 분산과 동기화, 원칙 유지 비용, Agent 컨텍스트, 첫 사용자 가치 |
| PRD02 | [처음부터 설치까지의 사용자 시나리오](product/journeys-and-acceptance.md) | 토큰 생성→컴포넌트 편집→검증 화면→출력→init/doctor→업그레이드의 인수 조건 |
| PRD03 | [초기 범위·카탈로그·제품 확장 경계](product/scope-catalog-and-roadmap.md) | 고유 component/part/template/family 목록, 초기 필수·후속·제외, Builder/Studio/CMS 경계 |

## BIZ · 사업·마케팅·시장 검증

| ID | 문서 | 책임 |
|---|---|---|
| BIZ01 | [오픈 코어·소스·산출물 권리](business/open-core-and-rights.md) | 공개 코어·Studio·기업 소스·SDK·템플릿·사용자 출력의 권리와 라이선스 선정 조건 |
| BIZ02 | [무료·유료 경계와 운영 원가](business/pricing-entitlements-and-economics.md) | 개인 무료·편집 좌석·유료 자원·AI 원가, 수익 가설·측정·중단 기준 |
| BIZ03 | [포지셔닝·마케팅·출시 메시지](business/positioning-and-go-to-market.md) | 대상별 문제 언어, 비교 대상과 차별점, 채널·소개 메시지·검증 표시 사용 |
| BIZ04 | [사용자 조사·제품 검증·고객 피드백](business/research-and-customer-feedback.md) | 자가 사용 후 목표 사용자 시험, 관찰·지원 피드백의 우선순위 반영 |

## BRD · 브랜드·자산

| ID | 문서 | 책임 |
|---|---|---|
| BRD01 | [Brand Library와 사용 지침](brand/library-and-guidelines.md) | 로고·폰트·이미지·가이드·버전 참조, DS와 분리 관리 후 실제 디자인에서 결합 |
| BRD02 | [자산 저장·출처·권리·배포](brand/assets-and-provenance.md) | 필요 자산의 실제 복사, 전체 라이브러리 선택 복사, hash·권리·버전·경로 |

## SYN · ADS·DSF·표준

| ID | 문서 | 책임 |
|---|---|---|
| SYN01 | [ADS와 토큰 표준 선정 계약](syntax/standard-strategy.md) | DTCG 비교 기준, 내부 ADS 표현 후보, 자체 표준 이점 판정과 fallback |
| SYN02 | [프로젝트 문서·ID·참조·수명](syntax/project-documents-and-identity.md) | 읽기 쉬운 JSON 분할, 이름과 안정 ID, 자산 연결·복사·삭제·deprecated |
| SYN03 | [DSF·토큰·테마·사용자 정책](syntax/foundation-and-token-semantics.md) | 타입·도메인·tier·alias·context·테마·binding·정책 예외·타깃 값 차이 |
| SYN04 | [가져오기·원문 보존·migration](syntax/interchange-and-migration.md) | 부분 오류 초안, 알려지지 않은 정보, 원문과 정규화 출력, 변환·손실 진단 |

## CMP · 컴포넌트 계약

| ID | 문서 | 책임 |
|---|---|---|
| CMP01 | [컴포넌트 정의 계층과 디자인 범주](components/definition-and-designs.md) | 목적·정의·archetype·공통 계약·Web/Mobile appearance 관계 |
| CMP02 | [trait·role·유형과 조합](components/traits-roles-and-archetypes.md) | 목적 중심 기능 사전, trait 버전 공존, 실제 충돌 판정, 확장/독립 유형 |
| CMP03 | [값·이벤트·props·UI 표현식](components/values-events-and-expressions.md) | 타입/record/list/nullable/key, 공개 interface·타깃 API, 제한된 UI 식 |
| CMP04 | [상태 소유권과 요청 수명](components/state-and-request-lifecycle.md) | controlled/uncontrolled, 요청·확정값, 동시 요청·취소·queue profile |
| CMP05 | [Part·slot·인스턴스·override](components/parts-slots-and-instances.md) | 논리 부품, 콘텐츠 슬롯, 교체 가능 부품·공개 override와 원본 연결 |
| CMP06 | [동작·입력·기반 라이브러리 계약](components/behavior-and-input-profiles.md) | interaction 의미, 키보드/포커스/입력 profile, 보호·전문가 모드 |
| CMP07 | [공동 UI 호스트와 조정자](components/coordinators-and-hosts.md) | queue/overlay/focus 등 필요한 scope·연결·중첩·수명 |
| CMP08 | [접근성 의미·관계·준수 계약](components/accessibility-contracts.md) | 명명·역할·관계·읽기/포커스 순서·타깃별 의무·전문가 예외 |
| CMP09 | [모션·전환·중단 의미](components/motion-and-transitions.md) | enter/exit·state 전환·spring/tween·delay/stagger·keyframe, 감소 모션 |
| CMP10 | [외형 규칙·조건·우선순위](components/appearance-conditions-and-precedence.md) | variant×Part×state, theme/condition/override, 결과·출처·충돌 |
| CMP11 | [사용자 확장·등록·승격](components/custom-definition-registry.md) | 로컬→프로젝트→라이브러리의 trait/role/policy·선언형 Inspector 메타데이터 |

## UX · 디자인·UX/UI

| ID | 문서 | 책임 |
|---|---|---|
| UX01 | [작업 공간·온보딩·Inspector·도움말](experience/onboarding-and-inspector.md) | 기본 DS/템플릿으로 첫 성공, 점진 노출·전문가 보기·AI 대화·학습 |
| UX02 | [Canvas 선택·좌표·직접 조작](experience/canvas-and-direct-manipulation.md) | frame/group·중첩 선택·drag/resize/rotate·정렬/snap·lock/hide·편집/실행 전환 |
| UX03 | [시각적 레이아웃 편집](experience/layout-authoring.md) | hug/fill/fixed·자동 배치·크기 규칙·재정렬과 타깃 대체 UX |
| UX04 | [텍스트·폰트·벡터·이미지 편집](experience/text-and-asset-editing.md) | 기본 라벨/문단/서식/링크/목록, IME, 외부 자산 배치·크기/crop/교체 |
| UX05 | [토큰·테마·정책 편집 UX](experience/foundation-editor.md) | 기본 분류 안내, 참조/테마 편집·즉시 preview·영향·경고·되돌리기 |
| UX06 | [컴포넌트·동작·접근성·모션 편집 UX](experience/component-editing-panels.md) | 속성·값/이벤트·state·interaction·의미 관계·모션 keyframe의 시연과 편집 |
| UX07 | [즉시 preview·검증 화면·프로토타입](experience/preview-and-prototypes.md) | 최신 디자인/마지막 실제 구현 비교, 모의 state·화면 이동·공유·실행 예제 |
| UX08 | [Studio 접근성·언어·입력 품질](experience/editor-accessibility-and-language.md) | 영어/한국어 UI, 실제 한글 IME, 키보드/screen reader, 오류·학습 카피 |

## ARC · 시스템 아키텍처

| ID | 문서 | 책임 |
|---|---|---|
| ARC01 | [시스템 문맥·도메인·핵심 흐름](architecture/system-and-domain-boundaries.md) | Builder·DSF·Brand·문서 코어·preview·실현·검증·전달의 책임과 데이터 흐름 |
| ARC02 | [모듈·저장소·의존 방향](architecture/modules-and-dependencies.md) | 1인 모노레포, 공개 코어/비공개 Studio 배포 경계, 빌드·public exports; Canvas/렌더·레이아웃·텍스트·문법 검증 등 기반 기술 선정표와 교체 책임 |
| ARC03 | [명령·트랜잭션·revision·Undo](architecture/commands-revisions-and-undo.md) | GUI/AI 공통 검증 명령, 원자성·idempotency·충돌·연속 편집·재시도 |
| ARC04 | [저장·오프라인 팩·복구](architecture/storage-offline-and-recovery.md) | 브라우저/로컬 폴더 동등 시작, 변경 감지·backup·자산/도구 준비·내부 AI |
| ARC05 | [후속 실시간 협업을 위한 구조](architecture/collaboration-readiness.md) | 문서 identity/변경 이력·충돌 병합·선택 잠금·개인 Undo와 공유 되돌리기 |
| ARC06 | [브라우저·로컬 Host·실행 경계](architecture/browser-host-and-execution.md) | Mac/Windows·Chromium, 폴더/작업 범위·페어링·설치·실행·폐쇄망 준비 |
| ARC07 | [공식 API·MCP·확장·사용권 경계](architecture/public-api-mcp-and-entitlements.md) | versioned API/MCP, 호출 권한·capability·entitlement·확장 인터페이스 |

## AI · AI 작성·실현

| ID | 문서 | 책임 |
|---|---|---|
| AI01 | [AI 작성·컨텍스트·공급자 연결](ai/authoring-context-and-providers.md) | 내장/외부 Agent의 선택 범위·필요 참조·변경 검토·BYOK·지원 연결 |
| AI02 | [AI 코드 실현·후보·독립 판정](ai/realization-and-independent-verification.md) | 템플릿/기계적 변환 재사용, AI 후보·고정 oracle·예산·재시도·부분 출력 |

## DLV · 플랫폼 출력·설치

| ID | 문서 | 책임 |
|---|---|---|
| DLV01 | [타깃·스타일·동작 기반 지원표](delivery/target-and-style-profiles.md) | React/RN/Swift/Android, CSS/SCSS/Tailwind/CSS-in-JS의 성립하는 조합과 대응 |
| DLV02 | [소비 프로젝트 init·doctor](delivery/project-init-and-doctor.md) | 환경·디렉터리·alias·토큰/테마·기반/peer deps·설치 변경과 복구 |
| DLV03 | [사용자 소유 코드·패키지·배포](delivery/user-owned-library-and-packaging.md) | 소스 폴더·직접 복사·사용자 npm·Git UI 패키지의 동등 전달과 provenance |
| DLV04 | [사용자 수정 diff·업그레이드·rollback](delivery/diff-upgrades-and-rollback.md) | 새 출력/현재 파일 비교·구간 선택·기준 없음·다중 프로젝트 버전 고정 |

## QAL · 품질·검증·출시

| ID | 문서 | 책임 |
|---|---|---|
| QAL01 | [검증 요구·oracle·자동/수동 검사](quality/conformance-and-test-plans.md) | 공통 계약과 target profile의 정상/오류/경계 테스트·수동 확인 요구 |
| QAL02 | [검증 증거·freshness·추적성](quality/evidence-and-freshness.md) | 문서/계약/코드/의존성/환경 hash, 증거 수명·영향·재검증 |
| QAL03 | [성능·규모·비용 예산](quality/performance-capacity-and-budgets.md) | 작은/큰 DS 데이터셋·기준 장비·편집 지연·회복·생성 비용·중단 한도 |
| QAL04 | [제품 출시 기준과 전체 지원](quality/release-readiness.md) | 기능/카탈로그/타깃/환경 전체범위와 독립 증거에 따른 출시 판정 |

## OPS · 개발·보안·운영

| ID | 문서 | 책임 |
|---|---|---|
| OPS01 | [보안·데이터·비밀정보 관리](operations/security-and-data-boundaries.md) | 명령/Host/Agent 경계 위협, 자격 증명·출력 실행 격리·데이터 보존/삭제 |
| OPS02 | [호스팅·운영·진단·장애·지원](operations/hosting-observability-and-support.md) | 로컬 진단 기본, 선택 오류 보고, SaaS/self-host 업그레이드·backup·지원 |
| OPS03 | [릴리스·배포·의존성 공급망](operations/release-and-supply-chain.md) | 재현 빌드·패키지/앱 배포·의존성 고정·자산 고지·변경 이력·rollback |
| OPS04 | [지속 개발·유지보수·인수인계](operations/development-and-maintenance.md) | 1인 개발 작업 단위, 요구→문서→계약→구현→검증→배포 변경 절차 |

## 공통 부록

- [카탈로그와 타깃별 의무](annexes/catalog-and-obligations.md)
- [공식 명령·API·MCP·진단 부록](annexes/commands-and-diagnostics.md)
- [Button·Card·Toast로 읽는 전체 설계](annexes/component-walkthroughs.md)
- [ADS 문서·관계·필드 계약 부록](annexes/document-contracts.md)
- [사전 확장 어휘와 조합 계약](annexes/extension-vocabulary.md)
- [한국어·영어 용어와 핵심 메시지](annexes/language-and-messages.md)
- [소스·자산 권리와 고지 관리](annexes/rights-and-provenance.md)
- [시험 시나리오와 증거 요구](annexes/scenarios-and-evidence.md)
- [남아 있는 구체 선택과 실증 절차](annexes/selection-register.md)
- [타깃·의존성·검증 환경 부록](annexes/targets-and-environments.md)
- [기술 레퍼런스와 Axiom에 적용할 부분](annexes/technology-and-references.md)

부록의 JSON은 설계 데이터·카탈로그·예시이며 실행 schema/제품 package 구현이 아니다. 실제 source/fixture/validator는 전체 문서 기준선 확인 후 해당 책임 문서에 따라 구축한다.
