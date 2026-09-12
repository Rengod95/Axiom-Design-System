# Foundation 1.0.0 문서 인덱스 상세안

**상태: 인덱스 제안 · 사용자 컨펌 대기. 아래 56개 문서 본문은 아직 작성하지 않았습니다.**

[검토 시작](README.md) · [개발 방향과 관리 방식](development-direction.md) · [결정 연결표](decision-coverage.md) · [기계 판독 인덱스](document-manifest.json)

각 문서는 한 종류의 판단을 책임집니다. 표의 경로는 승인 후 작성할 예정 위치이며, 파일이 존재한다는 표시가 아닙니다. 책임 역할은 1인 개발자가 여러 역할을 겸한다는 뜻이며 별도 인력 채용을 전제하지 않습니다. 선행 문서는 초안의 입력이며, 최종 확인 시 소비 문서에서 발견한 충돌도 원 소유 문서에 환류합니다.

## GOV. 결정·문서 운영 — 3개 문서

주 책임: 제품 책임자. 예정 위치: `docs/foundation/governance/`.

### GOV01 · 문서 권위와 변경 승인

예정 파일: `docs/foundation/governance/authority-and-change-control.md`

**이 문서가 정의할 것:** 사용자 결정·규범·설계안·증거의 권위, 변경 제안과 승인 단계

**책임 경계:** 개별 도메인의 세부 규칙은 해당 문서가 소유

**선행 문서:** 확정 방향과 승인 절차

**주 결정:** D01-01, D01-03

**완료 기준:** 충돌 문서 발견 시 정정·재확인 흐름을 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### GOV02 · 제품·도메인 용어와 이름

예정 파일: `docs/foundation/governance/glossary-and-naming.md`

**이 문서가 정의할 것:** Studio/Builder/ADS/DSF, Part·slot·state·condition·theme, 한국어/영어 용어

**책임 경계:** 사용자 화면의 모든 도움말 카피를 여기서 중복 관리하지 않음

**선행 문서:** GOV01

**주 결정:** D01-02, D36-01

**완료 기준:** 같은 말의 기술 의미·사용자 표현·금지된 혼용을 대조. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### GOV03 · 버전·호환·deprecated 정책

예정 파일: `docs/foundation/governance/version-and-compatibility.md`

**이 문서가 정의할 것:** 안정 판본 지원, 원본 보존·migration, breaking change와 deprecation

**책임 경계:** 파일 변환 절차는 SYN04, 출력 코드 업그레이드는 DLV04

**선행 문서:** GOV01

**주 결정:** D05-01

**완료 기준:** 과거 파일·확장·컴포넌트·소비 라이브러리 버전의 차이를 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## PRD. 제품 기획 — 3개 문서

주 책임: 제품 기획자. 예정 위치: `docs/foundation/product/`.

### PRD01 · 제품 목적·대상 사용자·핵심 문제

예정 파일: `docs/foundation/product/purpose-and-users.md`

**이 문서가 정의할 것:** DS 분산과 동기화, 원칙 유지 비용, Agent 컨텍스트, 첫 사용자 가치

**책임 경계:** 기술 스택이나 가격을 제품 목적에서 확정하지 않음

**선행 문서:** GOV01

**주 결정:** 확정된 제품 목적과 관련 결정에서 파생한 필수 foundation

**완료 기준:** 1인/작은 제품 팀·UX Engineer·코드 친숙 디자이너의 성공 작업을 구별. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### PRD02 · 처음부터 설치까지의 사용자 시나리오

예정 파일: `docs/foundation/product/journeys-and-acceptance.md`

**이 문서가 정의할 것:** 토큰 생성→컴포넌트 편집→검증 화면→출력→init/doctor→업그레이드의 인수 조건

**책임 경계:** 개별 패널의 조작 규칙은 UX 문서

**선행 문서:** PRD01, GOV02

**주 결정:** 확정된 제품 목적과 관련 결정에서 파생한 필수 foundation

**완료 기준:** 정상·실패·오프라인·AI·업그레이드 흐름을 실제 사용 작업으로 표현. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### PRD03 · 초기 범위·카탈로그·제품 확장 경계

예정 파일: `docs/foundation/product/scope-catalog-and-roadmap.md`

**이 문서가 정의할 것:** 고유 component/part/template/family 목록, 초기 필수·후속·제외, Builder/Studio/CMS 경계

**책임 경계:** 목록 노출을 구현·검증 완료로 표시하지 않음

**선행 문서:** PRD01, PRD02

**주 결정:** D02-01, D02-02, D02-03, D02-04

**완료 기준:** 약330개 참조 행을 중복 제거해 검증 가능한 카탈로그로 정의하고 필수 타깃을 보존. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## BIZ. 사업·마케팅·시장 검증 — 4개 문서

주 책임: 사업/마케팅 담당. 예정 위치: `docs/foundation/business/`.

### BIZ01 · 오픈 코어·소스·산출물 권리

예정 파일: `docs/foundation/business/open-core-and-rights.md`

**이 문서가 정의할 것:** 공개 코어·Studio·기업 소스·SDK·템플릿·사용자 출력의 권리와 라이선스 선정 조건

**책임 경계:** 법적 권리와 실행 entitlement는 구별하고 미선정 라이선스를 채택 처리하지 않음

**선행 문서:** GOV01, PRD01

**주 결정:** D03-02, D39-04

**완료 기준:** Studio 보호와 공개 코어 수정 제공 의무, 제3자 라이선스 영향과 공개 전 확인 조건을 비교. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### BIZ02 · 무료·유료 경계와 운영 원가

예정 파일: `docs/foundation/business/pricing-entitlements-and-economics.md`

**이 문서가 정의할 것:** 개인 무료·편집 좌석·유료 자원·AI 원가, 수익 가설·측정·중단 기준

**책임 경계:** 가격·사용량 숫자를 실측 없이 확정하지 않음

**선행 문서:** BIZ01, PRD01

**주 결정:** D39-01, D39-02, D39-03, D39-07

**완료 기준:** 사용권 단위·무료 가치·비용 발생 주체·실험 후 가격 결정 절차를 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### BIZ03 · 포지셔닝·마케팅·출시 메시지

예정 파일: `docs/foundation/business/positioning-and-go-to-market.md`

**이 문서가 정의할 것:** 대상별 문제 언어, 비교 대상과 차별점, 채널·소개 메시지·검증 표시 사용

**책임 경계:** 미구현 기능을 홍보에서 정식 지원이라고 쓰지 않음

**선행 문서:** PRD01, PRD03, BIZ01

**주 결정:** D39-06

**완료 기준:** 메시지 가설별 대상·근거·검증 방법과 공개 주장 심사 기준을 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### BIZ04 · 사용자 조사·제품 검증·고객 피드백

예정 파일: `docs/foundation/business/research-and-customer-feedback.md`

**이 문서가 정의할 것:** 자가 사용 후 목표 사용자 시험, 관찰·지원 피드백의 우선순위 반영

**책임 경계:** 성능 계측 수치는 QAL03, 장애 대응은 OPS02

**선행 문서:** PRD02, BIZ02

**주 결정:** D38-03

**완료 기준:** 첫 성공·반복 사용·출력 적용의 성공/실패를 수집하고 개선 결정을 추적. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## BRD. 브랜드·자산 — 2개 문서

주 책임: 브랜드 담당. 예정 위치: `docs/foundation/brand/`.

### BRD01 · Brand Library와 사용 지침

예정 파일: `docs/foundation/brand/library-and-guidelines.md`

**이 문서가 정의할 것:** 로고·폰트·이미지·가이드·버전 참조, DS와 분리 관리 후 실제 디자인에서 결합

**책임 경계:** 자산 편집기 구현은 UX04, 파일 권리는 BRD02

**선행 문서:** PRD01, GOV03

**주 결정:** D35-01, D35-02

**완료 기준:** 범용 DS 정책과 브랜드 지침의 서로 다른 적용·경고 사례를 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### BRD02 · 자산 저장·출처·권리·배포

예정 파일: `docs/foundation/brand/assets-and-provenance.md`

**이 문서가 정의할 것:** 필요 자산의 실제 복사, 전체 라이브러리 선택 복사, hash·권리·버전·경로

**책임 경계:** 로고 제작·정밀 벡터 편집을 자산 관리 의무로 확대하지 않음

**선행 문서:** BRD01, BIZ01

**주 결정:** D35-03

**완료 기준:** 외부 자산 누락·재연결·중복·폰트 권한·폐쇄망 준비 사례를 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## SYN. ADS·DSF·표준 — 4개 문서

주 책임: 문법/도메인 설계자. 예정 위치: `docs/foundation/syntax/`.

### SYN01 · ADS와 토큰 표준 선정 계약

예정 파일: `docs/foundation/syntax/standard-strategy.md`

**이 문서가 정의할 것:** DTCG 비교 기준, 내부 ADS 표현 후보, 자체 표준 이점 판정과 fallback

**책임 경계:** ADS 컴포넌트 기능을 토큰 규격 대체의 증거로 취급하지 않음

**선행 문서:** GOV02, GOV03, PRD03

**주 결정:** D06-03

**완료 기준:** 기능·보존·편집·렌더링·유지보수 비교 항목, 증거 시점과 재선정 절차를 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### SYN02 · 프로젝트 문서·ID·참조·수명

예정 파일: `docs/foundation/syntax/project-documents-and-identity.md`

**이 문서가 정의할 것:** 읽기 쉬운 JSON 분할, 이름과 안정 ID, 자산 연결·복사·삭제·deprecated

**책임 경계:** 소비 앱 코드 역수입과 프로젝트 설치 진단을 저장 모델에 섞지 않음

**선행 문서:** SYN01, GOV03, BRD02

**주 결정:** D04-01, D04-02, D04-03

**완료 기준:** 이름 변경·참조 분리·삭제 영향·원본 유지·문서 경계와 검토용 예제를 제공. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### SYN03 · DSF·토큰·테마·사용자 정책

예정 파일: `docs/foundation/syntax/foundation-and-token-semantics.md`

**이 문서가 정의할 것:** 타입·도메인·tier·alias·context·테마·binding·정책 예외·타깃 값 차이

**책임 경계:** UI 편집 도구는 UX05, component state는 CMP04

**선행 문서:** SYN01, SYN02

**주 결정:** D07-01, D07-02, D07-03, D08-01, D08-03

**완료 기준:** 타입/참조/테마의 정상·오류 규칙과 확장 가능 범위를 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### SYN04 · 가져오기·원문 보존·migration

예정 파일: `docs/foundation/syntax/interchange-and-migration.md`

**이 문서가 정의할 것:** 부분 오류 초안, 알려지지 않은 정보, 원문과 정규화 출력, 변환·손실 진단

**책임 경계:** 임의 React 소스와 ADS의 반복 동기화를 다시 포함하지 않음

**선행 문서:** SYN01, SYN02, SYN03, GOV03

**주 결정:** D05-02, D06-01, D06-02

**완료 기준:** 원문/편집본/재출력의 차이와 migration 실패 시 복구 예제를 제공. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## CMP. 컴포넌트 계약 — 11개 문서

주 책임: 컴포넌트 설계자. 예정 위치: `docs/foundation/components/`.

### CMP01 · 컴포넌트 정의 계층과 디자인 범주

예정 파일: `docs/foundation/components/definition-and-designs.md`

**이 문서가 정의할 것:** 목적·정의·archetype·공통 계약·Web/Mobile appearance 관계

**책임 경계:** 비즈니스 규칙이나 DOM 트리를 공통 의미와 동일시하지 않음

**선행 문서:** GOV02, PRD03, SYN02, SYN03

**주 결정:** D09-01, D09-02, D09-03

**완료 기준:** Button·Card·Toast를 같은 계층으로 설명하고 별도 Mobile 외형을 표현. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP02 · trait·role·유형과 조합

예정 파일: `docs/foundation/components/traits-roles-and-archetypes.md`

**이 문서가 정의할 것:** 목적 중심 기능 사전, trait 버전 공존, 실제 충돌 판정, 확장/독립 유형

**책임 경계:** 모든 컴포넌트를 하나의 상속 트리에 강제로 넣지 않음

**선행 문서:** CMP01, GOV03

**주 결정:** D05-03, D11-01, D11-02, D11-03

**완료 기준:** 카탈로그 매핑·금지 조합·공유 연결 호환성과 전문가 분기 예제를 제공. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP03 · 값·이벤트·props·UI 표현식

예정 파일: `docs/foundation/components/values-events-and-expressions.md`

**이 문서가 정의할 것:** 타입/record/list/nullable/key, 공개 interface·타깃 API, 제한된 UI 식

**책임 경계:** 앱의 결제·가격·권한 판단이나 임의 JS 실행을 포함하지 않음

**선행 문서:** CMP01, SYN03

**주 결정:** D10-01, D10-02, D10-03

**완료 기준:** 공개 값·요청·상태 차이, 비즈니스 입력 경계와 타입 오류를 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP04 · 상태 소유권과 요청 수명

예정 파일: `docs/foundation/components/state-and-request-lifecycle.md`

**이 문서가 정의할 것:** controlled/uncontrolled, 요청·확정값, 동시 요청·취소·queue profile

**책임 경계:** 모든 컴포넌트에 동일 FIFO 또는 업무 상태를 강제하지 않음

**선행 문서:** CMP02, CMP03

**주 결정:** D14-01, D14-02, D14-03

**완료 기준:** query/selected 분리·외부 제어·빠른 재입력·미응답/취소 시 상태를 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP05 · Part·slot·인스턴스·override

예정 파일: `docs/foundation/components/parts-slots-and-instances.md`

**이 문서가 정의할 것:** 논리 부품, 콘텐츠 슬롯, 교체 가능 부품·공개 override와 원본 연결

**책임 경계:** Part와 DOM/native 노드의 일대일 대응을 강제하지 않음

**선행 문서:** CMP01, CMP02, CMP03

**주 결정:** D13-01, D13-02, D13-03

**완료 기준:** Card 조합·slot 개수/종류·인스턴스 충돌·타깃 대체 노드 사례를 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP06 · 동작·입력·기반 라이브러리 계약

예정 파일: `docs/foundation/components/behavior-and-input-profiles.md`

**이 문서가 정의할 것:** interaction 의미, 키보드/포커스/입력 profile, 보호·전문가 모드

**책임 경계:** 라이브러리 이름을 모든 플랫폼에서 직접 쓸 수 있다고 보지 않음

**선행 문서:** CMP02, CMP03, CMP04, CMP05

**주 결정:** D15-01, D15-02

**완료 기준:** 기반 교체·의무 변경·금지 부품 혼합·독립 유형의 판정 규칙을 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP07 · 공동 UI 호스트와 조정자

예정 파일: `docs/foundation/components/coordinators-and-hosts.md`

**이 문서가 정의할 것:** queue/overlay/focus 등 필요한 scope·연결·중첩·수명

**책임 경계:** 앱 루트 Provider·부품 Context·AI 공급자를 같은 개념으로 합치지 않음

**선행 문서:** CMP04, CMP05, CMP06

**주 결정:** D16-01, D16-02, D16-03

**완료 기준:** 호스트 자동 제안·수동 연결·실제 경로·누락·모호함을 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP08 · 접근성 의미·관계·준수 계약

예정 파일: `docs/foundation/components/accessibility-contracts.md`

**이 문서가 정의할 것:** 명명·역할·관계·읽기/포커스 순서·타깃별 의무·전문가 예외

**책임 경계:** 자동 검사만으로 모든 보조기술 준수를 보장하지 않음

**선행 문서:** CMP05, CMP06, CMP07

**주 결정:** D17-02, D17-03

**완료 기준:** 의무와 수동 확인 대상·확인 환경, 브랜드 충돌의 판정과 표시를 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP09 · 모션·전환·중단 의미

예정 파일: `docs/foundation/components/motion-and-transitions.md`

**이 문서가 정의할 것:** enter/exit·state 전환·spring/tween·delay/stagger·keyframe, 감소 모션

**책임 경계:** 논리 상태·focus·cleanup 전체를 애니메이션 완료에 종속시키지 않음

**선행 문서:** CMP04, CMP06, CMP08, SYN03

**주 결정:** D18-02, D18-03

**완료 기준:** finish-then-next 기본·다른 중단 policy·퇴장 후 제거·reduced motion을 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP10 · 외형 규칙·조건·우선순위

예정 파일: `docs/foundation/components/appearance-conditions-and-precedence.md`

**이 문서가 정의할 것:** variant×Part×state, theme/condition/override, 결과·출처·충돌

**책임 경계:** 콘텐츠 slot을 외형 부위의 이름으로 혼용하지 않음

**선행 문서:** CMP01, CMP04, CMP05, CMP09, SYN03

**주 결정:** D19-01, D19-02, D19-03

**완료 기준:** 한 속성의 최종값 계산과 타깃 제약·reset·공통 승격을 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### CMP11 · 사용자 확장·등록·승격

예정 파일: `docs/foundation/components/custom-definition-registry.md`

**이 문서가 정의할 것:** 로컬→프로젝트→라이브러리의 trait/role/policy·선언형 Inspector 메타데이터

**책임 경계:** 사용자 확장으로 코어 schema/검증기/권한을 덮어쓰게 하지 않음

**선행 문서:** CMP02, CMP03, CMP05, CMP08

**주 결정:** D12-01, D12-03

**완료 기준:** 미지 확장·충돌·버전 고정·승격·미검증 실행 능력의 표시를 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## UX. 디자인·UX/UI — 8개 문서

주 책임: UX/UI 설계자. 예정 위치: `docs/foundation/experience/`.

### UX01 · 작업 공간·온보딩·Inspector·도움말

예정 파일: `docs/foundation/experience/onboarding-and-inspector.md`

**이 문서가 정의할 것:** 기본 DS/템플릿으로 첫 성공, 점진 노출·전문가 보기·AI 대화·학습

**책임 경계:** 일반 사용자 화면에서 내부 구현 세부를 강요하지 않음

**선행 문서:** PRD02, PRD03, GOV02, CMP11

**주 결정:** D26-01, D26-02, D26-03, D36-03

**완료 기준:** 토큰 변경→Card 편집→preview→출력의 첫 실행 동선과 빈/오류 상태를 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### UX02 · Canvas 선택·좌표·직접 조작

예정 파일: `docs/foundation/experience/canvas-and-direct-manipulation.md`

**이 문서가 정의할 것:** frame/group·중첩 선택·drag/resize/rotate·정렬/snap·lock/hide·편집/실행 전환

**책임 경계:** Canvas 엔진의 자료구조를 ADS 저장 의미로 고정하지 않음

**선행 문서:** CMP05, CMP10

**주 결정:** D23-01, D23-02, D23-03

**완료 기준:** 선택 깊이·다중 조작·좌표 변환·키보드 조작·Undo 묶음을 예시. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### UX03 · 시각적 레이아웃 편집

예정 파일: `docs/foundation/experience/layout-authoring.md`

**이 문서가 정의할 것:** hug/fill/fixed·자동 배치·크기 규칙·재정렬과 타깃 대체 UX

**책임 경계:** 브라우저 근사를 native 레이아웃 보장으로 표시하지 않음

**선행 문서:** CMP05, CMP10, UX02

**주 결정:** D24-01, D24-02, D24-03

**완료 기준:** 부모 규칙 안의 drag/resize와 불가능한 타깃 표현을 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### UX04 · 텍스트·폰트·벡터·이미지 편집

예정 파일: `docs/foundation/experience/text-and-asset-editing.md`

**이 문서가 정의할 것:** 기본 라벨/문단/서식/링크/목록, IME, 외부 자산 배치·크기/crop/교체

**책임 경계:** 고급 벡터 제작·CMS 페이지 텍스트 엔진을 초기 범위에 추가하지 않음

**선행 문서:** BRD02, UX02, SYN03

**주 결정:** D25-01, D25-02, D25-03

**완료 기준:** 커서/선택/Undo와 폰트·이미지 누락 시 제한·대체·복구 흐름을 예시. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### UX05 · 토큰·테마·정책 편집 UX

예정 파일: `docs/foundation/experience/foundation-editor.md`

**이 문서가 정의할 것:** 기본 분류 안내, 참조/테마 편집·즉시 preview·영향·경고·되돌리기

**책임 경계:** 토큰 의미와 validation 규칙은 SYN03/SYN04에서 가져옴

**선행 문서:** SYN03, SYN04, UX01

**주 결정:** D08-02

**완료 기준:** JSON을 직접 쓰는 것보다 쉬운 생성·리네임·대량 수정 흐름을 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### UX06 · 컴포넌트·동작·접근성·모션 편집 UX

예정 파일: `docs/foundation/experience/component-editing-panels.md`

**이 문서가 정의할 것:** 속성·값/이벤트·state·interaction·의미 관계·모션 keyframe의 시연과 편집

**책임 경계:** 범용 Card에 업무 맥락 상태를 자동 추가하지 않음

**선행 문서:** CMP06, CMP07, CMP08, CMP09, CMP10, CMP11, UX01

**주 결정:** D15-03, D17-01, D18-01

**완료 기준:** Card/Toast의 보호·전문가 모드와 preset/AI/직접 편집을 연결. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### UX07 · 즉시 preview·검증 화면·프로토타입

예정 파일: `docs/foundation/experience/preview-and-prototypes.md`

**이 문서가 정의할 것:** 최신 디자인/마지막 실제 구현 비교, 모의 state·화면 이동·공유·실행 예제

**책임 경계:** CMS 운영 기능과 실데이터 업무 로직을 초기 Builder 범위로 확장하지 않음

**선행 문서:** PRD02, CMP04, CMP10, UX03, UX06

**주 결정:** D27-01, D27-02, D27-03, D34-01, D34-02, D34-03

**완료 기준:** 미구현 동작과 native 근사/실제 실행을 표시하고 prototype 전환을 예시. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### UX08 · Studio 접근성·언어·입력 품질

예정 파일: `docs/foundation/experience/editor-accessibility-and-language.md`

**이 문서가 정의할 것:** 영어/한국어 UI, 실제 한글 IME, 키보드/screen reader, 오류·학습 카피

**책임 경계:** 출력 컴포넌트 준수와 편집기 자체 준수를 같은 결과로 합치지 않음

**선행 문서:** GOV02, UX01, UX02, UX04, UX06

**주 결정:** D36-02

**완료 기준:** 주요 작업 전체의 입력·포커스·읽기 흐름과 확인 환경을 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## ARC. 시스템 아키텍처 — 7개 문서

주 책임: 시스템 설계자. 예정 위치: `docs/foundation/architecture/`.

### ARC01 · 시스템 문맥·도메인·핵심 흐름

예정 파일: `docs/foundation/architecture/system-and-domain-boundaries.md`

**이 문서가 정의할 것:** Builder·DSF·Brand·문서 코어·preview·실현·검증·전달의 책임과 데이터 흐름

**책임 경계:** 계층 수를 늘리기 위해 네트워크 서비스를 분리하지 않음

**선행 문서:** PRD02, PRD03, SYN02, CMP01, BIZ01

**주 결정:** 확정된 제품 목적과 관련 결정에서 파생한 필수 foundation

**완료 기준:** 정상/실패 흐름과 모든 I/O·권한·소유 경계를 하나의 시스템 지도로 연결. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### ARC02 · 모듈·저장소·의존 방향

예정 파일: `docs/foundation/architecture/modules-and-dependencies.md`

**이 문서가 정의할 것:** 1인 모노레포, 공개 코어/비공개 Studio 배포 경계, 빌드·public exports; Canvas/렌더·레이아웃·텍스트·문법 검증 등 기반 기술 선정표와 교체 책임

**책임 경계:** 과거 10개 패키지 구조를 재사용한다는 이유로 복원하지 않음

**선행 문서:** ARC01, BIZ01

**주 결정:** D03-01

**완료 기준:** 각 모듈의 입력/출력·금지 의존성·교체 지점과 공개 유출 검사를 정의. 기존 Builder.io/UXPin/Plasmic/pen.dev 및 Canvas·Yoga 조사 근거를 현재 요구와 대조. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### ARC03 · 명령·트랜잭션·revision·Undo

예정 파일: `docs/foundation/architecture/commands-revisions-and-undo.md`

**이 문서가 정의할 것:** GUI/AI 공통 검증 명령, 원자성·idempotency·충돌·연속 편집·재시도

**책임 경계:** 도구별 별도 데이터 수정 경로를 만들지 않음

**선행 문서:** SYN02, CMP11, ARC01

**주 결정:** D20-01, D20-02, D20-03

**완료 기준:** 동시 AI/사람 편집·부분 충돌·작업 취소·재전송을 단계별 예시. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### ARC04 · 저장·오프라인 팩·복구

예정 파일: `docs/foundation/architecture/storage-offline-and-recovery.md`

**이 문서가 정의할 것:** 브라우저/로컬 폴더 동등 시작, 변경 감지·backup·자산/도구 준비·내부 AI

**책임 경계:** 준비되지 않은 의존성이나 외부 AI의 무조건적 offline 실행을 약속하지 않음

**선행 문서:** SYN02, SYN04, ARC03, BRD02

**주 결정:** D21-01, D21-02, D21-03

**완료 기준:** 끊김·파일 충돌·브라우저 보관 실패·준비 팩 누락·복구 시나리오를 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### ARC05 · 후속 실시간 협업을 위한 구조

예정 파일: `docs/foundation/architecture/collaboration-readiness.md`

**이 문서가 정의할 것:** 문서 identity/변경 이력·충돌 병합·선택 잠금·개인 Undo와 공유 되돌리기

**책임 경계:** 실제 공동 편집 서비스 구현을 초기 필수로 변경하지 않음

**선행 문서:** ARC03, ARC04, CMP05

**주 결정:** D22-01, D22-02, D22-03

**완료 기준:** 비충돌·같은 속성 충돌·일시 invalid·삭제 경쟁에 대한 기록 모델을 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### ARC06 · 브라우저·로컬 Host·실행 경계

예정 파일: `docs/foundation/architecture/browser-host-and-execution.md`

**이 문서가 정의할 것:** Mac/Windows·Chromium, 폴더/작업 범위·페어링·설치·실행·폐쇄망 준비

**책임 경계:** Windows에서 Apple native 도구 사용이 가능하다고 가정하지 않음

**선행 문서:** ARC01, ARC03, ARC04

**주 결정:** D37-01, D37-02, D37-03, D37-04

**완료 기준:** 브라우저 단독→Host 연결·권한 확장·내부 AI·native 실행 경로를 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### ARC07 · 공식 API·MCP·확장·사용권 경계

예정 파일: `docs/foundation/architecture/public-api-mcp-and-entitlements.md`

**이 문서가 정의할 것:** versioned API/MCP, 호출 권한·capability·entitlement·확장 인터페이스

**책임 경계:** 외부 Agent의 호출권을 코어 API/검증기/권한 구현 수정권으로 확대하지 않음

**선행 문서:** ARC03, ARC06, BIZ01, BIZ02

**주 결정:** D03-03

**완료 기준:** HTTP/로컬 호출·권한 부족·버전 불일치·사용자 컴포넌트 API 변경을 예시. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## AI. AI 작성·실현 — 2개 문서

주 책임: AI 통합 담당. 예정 위치: `docs/foundation/ai/`.

### AI01 · AI 작성·컨텍스트·공급자 연결

예정 파일: `docs/foundation/ai/authoring-context-and-providers.md`

**이 문서가 정의할 것:** 내장/외부 Agent의 선택 범위·필요 참조·변경 검토·BYOK·지원 연결

**책임 경계:** 특정 계정의 범용 API 사용권이나 무료 실행을 검증 없이 약속하지 않음

**선행 문서:** ARC07, UX01, SYN02, CMP11

**주 결정:** D28-01, D28-02, D28-03, D39-05

**완료 기준:** 컨텍스트 계산·공유 토큰 검토·국소 편집·모호한 지시와 연결 실패를 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### AI02 · AI 코드 실현·후보·독립 판정

예정 파일: `docs/foundation/ai/realization-and-independent-verification.md`

**이 문서가 정의할 것:** 템플릿/기계적 변환 재사용, AI 후보·고정 oracle·예산·재시도·부분 출력

**책임 경계:** 구현 Agent가 테스트 기준·코어 검증기·성공 기록을 바꾸지 못함

**선행 문서:** AI01, CMP06, CMP08, CMP09

**주 결정:** D12-02, D29-01, D29-02, D29-03

**완료 기준:** Card와 Toast의 생성 실패·계약 변경 제안·검증본 유지와 재시도를 예시. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## DLV. 플랫폼 출력·설치 — 4개 문서

주 책임: 플랫폼 담당. 예정 위치: `docs/foundation/delivery/`.

### DLV01 · 타깃·스타일·동작 기반 지원표

예정 파일: `docs/foundation/delivery/target-and-style-profiles.md`

**이 문서가 정의할 것:** React/RN/Swift/Android, CSS/SCSS/Tailwind/CSS-in-JS의 성립하는 조합과 대응

**책임 경계:** 미완성을 N/A로 숨기거나 Mobile=RN으로 축소하지 않음

**선행 문서:** PRD03, CMP06, CMP10, SYN03, AI02

**주 결정:** D30-01, D30-02, D30-03, D30-04

**완료 기준:** Expo/bare와 native toolkit 후보, 버전·차이·검증 의무·대응 의존성을 표로 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### DLV02 · 소비 프로젝트 init·doctor

예정 파일: `docs/foundation/delivery/project-init-and-doctor.md`

**이 문서가 정의할 것:** 환경·디렉터리·alias·토큰/테마·기반/peer deps·설치 변경과 복구

**책임 경계:** 앱 전체 소스를 ADS로 복원하는 기능으로 확대하지 않음

**선행 문서:** DLV01, ARC06, BRD02

**주 결정:** D32-02, D32-03, D32-04

**완료 기준:** 프로젝트 허용 기반 목록·목록 확장 diff·설정 drift·누락/충돌 진단을 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### DLV03 · 사용자 소유 코드·패키지·배포

예정 파일: `docs/foundation/delivery/user-owned-library-and-packaging.md`

**이 문서가 정의할 것:** 소스 폴더·직접 복사·사용자 npm·Git UI 패키지의 동등 전달과 provenance

**책임 경계:** Studio 구독 종료로 이미 내보낸 사용자 코드를 사용 불가로 만들지 않음

**선행 문서:** DLV01, DLV02, BIZ01, BRD02

**주 결정:** D32-01

**완료 기준:** 출력 manifest·공개 타입·license notice·의존성·네 경로 설치 검증을 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### DLV04 · 사용자 수정 diff·업그레이드·rollback

예정 파일: `docs/foundation/delivery/diff-upgrades-and-rollback.md`

**이 문서가 정의할 것:** 새 출력/현재 파일 비교·구간 선택·기준 없음·다중 프로젝트 버전 고정

**책임 경계:** 반복 React 역수입이나 사용자 수정의 무조건적 자동 병합을 약속하지 않음

**선행 문서:** GOV03, DLV02, DLV03, ARC03

**주 결정:** D33-01, D33-02, D33-03, D33-04

**완료 기준:** 이동/삭제/의존성 충돌·시험 적용·개별 rollback·AI 해결안 검토를 예시. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## QAL. 품질·검증·출시 — 4개 문서

주 책임: 품질 책임자. 예정 위치: `docs/foundation/quality/`.

### QAL01 · 검증 요구·oracle·자동/수동 검사

예정 파일: `docs/foundation/quality/conformance-and-test-plans.md`

**이 문서가 정의할 것:** 공통 계약과 target profile의 정상/오류/경계 테스트·수동 확인 요구

**책임 경계:** 검사 0개·skip·근사 preview·AI self-report를 완전 준수로 세지 않음

**선행 문서:** CMP08, CMP09, DLV01, AI02

**주 결정:** D31-01, D31-02, D31-04

**완료 기준:** 대표 유형과 전체 카탈로그의 커버리지·접근성 수동 검사 범위를 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### QAL02 · 검증 증거·freshness·추적성

예정 파일: `docs/foundation/quality/evidence-and-freshness.md`

**이 문서가 정의할 것:** 문서/계약/코드/의존성/환경 hash, 증거 수명·영향·재검증

**책임 경계:** 전체 profile 재실행과 필수 요구에 따른 배포 판정을 혼동하지 않음

**선행 문서:** QAL01, GOV03, DLV03

**주 결정:** D31-03

**완료 기준:** 디자인 변경·코드 수정·의존성 업데이트 후 기존 성공 결과가 무효화되는 조건을 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### QAL03 · 성능·규모·비용 예산

예정 파일: `docs/foundation/quality/performance-capacity-and-budgets.md`

**이 문서가 정의할 것:** 작은/큰 DS 데이터셋·기준 장비·편집 지연·회복·생성 비용·중단 한도

**책임 경계:** 실측 전 성능 수치나 개발 일정을 확정된 성과로 표기하지 않음

**선행 문서:** PRD02, ARC04, UX07, AI02, BIZ02

**주 결정:** D38-01, D38-05

**완료 기준:** 측정 계획·표본/장비·percentile·허용 한도 설정과 초과 시 대안을 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### QAL04 · 제품 출시 기준과 전체 지원

예정 파일: `docs/foundation/quality/release-readiness.md`

**이 문서가 정의할 것:** 기능/카탈로그/타깃/환경 전체범위와 독립 증거에 따른 출시 판정

**책임 경계:** 문서 1.0.0 완료를 제품 출시 완료로 취급하지 않음

**선행 문서:** PRD03, QAL01, QAL02, QAL03, BIZ01, UX08

**주 결정:** D38-02

**완료 기준:** 필수 항목 미완료·수동 미확인·지원 차이 공개·출시 보류 조건을 명시. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## OPS. 개발·보안·운영 — 4개 문서

주 책임: 개발/운영 담당. 예정 위치: `docs/foundation/operations/`.

### OPS01 · 보안·데이터·비밀정보 관리

예정 파일: `docs/foundation/operations/security-and-data-boundaries.md`

**이 문서가 정의할 것:** 명령/Host/Agent 경계 위협, 자격 증명·출력 실행 격리·데이터 보존/삭제

**책임 경계:** UI에서 도구 숨기기를 권한 강제로 대신하지 않음

**선행 문서:** ARC06, ARC07, AI02, BIZ01

**주 결정:** 확정된 제품 목적과 관련 결정에서 파생한 필수 foundation

**완료 기준:** 외부 입력·의존성 실행·키 유출·검증 위조·폐쇄망 경계별 대응과 확인 계획을 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### OPS02 · 호스팅·운영·진단·장애·지원

예정 파일: `docs/foundation/operations/hosting-observability-and-support.md`

**이 문서가 정의할 것:** 로컬 진단 기본, 선택 오류 보고, SaaS/self-host 업그레이드·backup·지원

**책임 경계:** 미정 enterprise installer를 초기 제공 완료로 표시하지 않음

**선행 문서:** ARC04, ARC06, OPS01, BIZ02

**주 결정:** D38-04

**완료 기준:** 장애·복구·자원 한도·지원 요청·사용권 연결 실패 runbook의 필수 항목을 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### OPS03 · 릴리스·배포·의존성 공급망

예정 파일: `docs/foundation/operations/release-and-supply-chain.md`

**이 문서가 정의할 것:** 재현 빌드·패키지/앱 배포·의존성 고정·자산 고지·변경 이력·rollback

**책임 경계:** 공개 코어 권리와 기업용 소스 제공 조건을 임의 변경하지 않음

**선행 문서:** ARC02, DLV03, DLV04, QAL02, BIZ01

**주 결정:** 확정된 제품 목적과 관련 결정에서 파생한 필수 foundation

**완료 기준:** 배포 채널별 버전·출처·검증·사용자 수정 보존·폐기 절차를 설명. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

### OPS04 · 지속 개발·유지보수·인수인계

예정 파일: `docs/foundation/operations/development-and-maintenance.md`

**이 문서가 정의할 것:** 1인 개발 작업 단위, 요구→문서→계약→구현→검증→배포 변경 절차

**책임 경계:** 후속 개발자의 편의로 사용자 승인 범위를 자동 확대하지 않음

**선행 문서:** GOV01, ARC02, QAL04, OPS03, BIZ04

**주 결정:** 확정된 제품 목적과 관련 결정에서 파생한 필수 foundation

**완료 기준:** 변경 사례별 영향 문서·코드·검사·승인 범위와 다음 작업 선택 규칙을 정의. 설명·사례·오류·변경 영향·검증 책임까지 연결한다.

## 함께 관리할 부록

부록은 문서별 규칙을 다시 쓰는 별도 규격이 아니라, 원 소유 문서의 ID와 연결된 목록·예제·표입니다. 커질 때 파일로 분리하고 인덱스에 등록합니다. 단순한 빈 파일을 만들어 문서 완료로 세지 않습니다.

- stable catalog of unique components and target obligations
- definition vocabulary/traits/roles/policies and compatibility tables
- schema field tables and illustrative JSON
- command/API/MCP and diagnostics catalog
- target/dependency/test/environment matrix
- test scenario and evidence requirement register
- license/asset provenance and package notice list
- terminology/translation/copy inventory

기반 기술 선정 부록에는 Canvas/렌더·레이아웃·텍스트·문법 검증·runtime 후보의 근거·비용·권리·교체 경계를 기록합니다.

실행 schema·validator·자동 테스트와 생성기는 문서 확정 후 구현 단계의 산출물입니다. 문서화 단계에서는 필드표·규칙·검토용 JSON·정상/오류 사례로 설계를 구체화합니다.
