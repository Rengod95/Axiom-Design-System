# 확정 결정과 본문 연결표

129개 원 결정은 아래 한 책임 문서의 명시 anchor와 연결된다. 14개 보충 방향은 뒤 표에서 관련 문서를 연결한다. 같은 규칙을 여러 문서가 새로 소유하지 않는다. 세부 설계·검증의 실제 정합성은 [기준선 검토](baseline-review.md)에 기록한다.

| 결정 | 책임 문서 · 확정 방향 위치 | 질문 |
|---|---|---|
| D01-01 | [GOV01](governance/authority-and-change-control.md#d01-01) | 결정을 어떤 단위로 확정할까요? |
| D01-02 | [GOV02](governance/glossary-and-naming.md#d01-02) | 제품·문법·저장 문서의 이름을 어떻게 구분할까요? |
| D01-03 | [GOV01](governance/authority-and-change-control.md#d01-03) | 과거 코드·문서의 성공 기록은 새 제품에서 어떤 의미로 표시할까요? |
| D02-01 | [PRD03](product/scope-catalog-and-roadmap.md#d02-01) | 카탈로그의 정식 지원은 무엇을 의미할까요? |
| D02-02 | [PRD03](product/scope-catalog-and-roadmap.md#d02-02) | 라이브러리별 기본 템플릿은 어떻게 제공할까요? |
| D02-03 | [PRD03](product/scope-catalog-and-roadmap.md#d02-03) | 매우 복잡한 커스텀 컴포넌트가 기본 기능을 넘어설 때 어떤 경험을 제공할까요? |
| D02-04 | [PRD03](product/scope-catalog-and-roadmap.md#d02-04) | 1인 개발에서 예상보다 오래 걸릴 때 우선 지킬 원칙은 무엇인가요? |
| D03-01 | [ARC02](architecture/modules-and-dependencies.md#d03-01) | 개발 저장소는 어떤 구성이 좋을까요? |
| D03-02 | [BIZ01](business/open-core-and-rights.md#d03-02) | 무료 공개 코어를 Studio 밖에서 어디까지 사용할 수 있어야 하나요? |
| D03-03 | [ARC07](architecture/public-api-mcp-and-entitlements.md#d03-03) | 타사 확장을 받아들이는 첫 경계는 어디일까요? |
| D04-01 | [SYN02](syntax/project-documents-and-identity.md#d04-01) | 사용자가 보관하는 기본 프로젝트 파일은 어떤 형태가 좋을까요? |
| D04-02 | [SYN02](syntax/project-documents-and-identity.md#d04-02) | 다른 시스템으로 컴포넌트를 복사할 때 기본 연결은 어떻게 할까요? |
| D04-03 | [SYN02](syntax/project-documents-and-identity.md#d04-03) | 사용 중인 토큰·Part·컴포넌트를 삭제할 때 어떻게 처리할까요? |
| D05-01 | [GOV03](governance/version-and-compatibility.md#d05-01) | 이전 프로젝트 형식을 어느 수준까지 지원할까요? |
| D05-02 | [SYN04](syntax/interchange-and-migration.md#d05-02) | 알 수 없는 확장이나 더 최신 기능이 포함된 파일은 어떻게 열까요? |
| D05-03 | [CMP02](components/traits-roles-and-archetypes.md#d05-03) | 서로 다른 라이브러리가 같은 trait의 다른 버전을 사용할 때 어떻게 할까요? |
| D06-01 | [SYN04](syntax/interchange-and-migration.md#d06-01) | 가져온 파일 중 일부 토큰에 오류가 있을 때 어떻게 시작할까요? |
| D06-02 | [SYN04](syntax/interchange-and-migration.md#d06-02) | 원본과 다시 내보낸 DTCG 파일의 동일성은 어디까지 필요할까요? |
| D06-03 | [SYN01](syntax/standard-strategy.md#d06-03) | 표준의 모든 표현을 아직 출력할 수 없는 경우 어떻게 다룰까요? |
| D07-01 | [SYN03](syntax/foundation-and-token-semantics.md#d07-01) | 처음 시스템을 만들 때 분류·규칙은 어떻게 시작할까요? |
| D07-02 | [SYN03](syntax/foundation-and-token-semantics.md#d07-02) | 새 domain을 만들면 사용 가능한 속성을 어떻게 지정할까요? |
| D07-03 | [SYN03](syntax/foundation-and-token-semantics.md#d07-03) | 사용자 정의 정책은 어디에서 얼마나 강하게 적용할까요? |
| D08-01 | [SYN03](syntax/foundation-and-token-semantics.md#d08-01) | 여러 테마 축을 어떻게 조합할까요? |
| D08-02 | [UX05](experience/foundation-editor.md#d08-02) | 여러 사용처가 있는 토큰을 바꿀 때 기본 UX는 무엇일까요? |
| D08-03 | [SYN03](syntax/foundation-and-token-semantics.md#d08-03) | Web·Mobile에서 단위나 색 표현이 완전히 일치하지 않으면 어떻게 할까요? |
| D09-01 | [CMP01](components/definition-and-designs.md#d09-01) | 한 컴포넌트에 디자인을 몇 개까지 관리할 수 있어야 하나요? |
| D09-02 | [CMP01](components/definition-and-designs.md#d09-02) | 공통 계약 변경으로 일부 디자인이 맞지 않게 되면 어떻게 할까요? |
| D09-03 | [CMP01](components/definition-and-designs.md#d09-03) | 논리 Part가 플랫폼마다 다른 모습으로 나타날 때 어떤 자유를 줄까요? |
| D10-01 | [CMP03](components/values-events-and-expressions.md#d10-01) | GUI에서 만들 수 있는 UI 조건식은 어느 깊이가 필요할까요? |
| D10-02 | [CMP03](components/values-events-and-expressions.md#d10-02) | 출력 코드의 값·이벤트 API는 어떤 사용성을 우선할까요? |
| D10-03 | [CMP03](components/values-events-and-expressions.md#d10-03) | 사용자가 복잡한 값 형태를 직접 정의하는 UX는 어떻게 제공할까요? |
| D11-01 | [CMP02](components/traits-roles-and-archetypes.md#d11-01) | 사용자가 기능을 조합할 때 어떤 설명 방식이 좋을까요? |
| D11-02 | [CMP02](components/traits-roles-and-archetypes.md#d11-02) | 두 능력이 같은 키 입력이나 상태를 서로 다르게 사용하면 어떻게 해결할까요? |
| D11-03 | [CMP02](components/traits-roles-and-archetypes.md#d11-03) | 기존 유형을 확장한 커스텀 유형은 어디까지 바꿀 수 있을까요? |
| D12-01 | [CMP11](components/custom-definition-registry.md#d12-01) | 커스텀 정의는 처음 어디에 저장하고 공유할까요? |
| D12-02 | [AI02](ai/realization-and-independent-verification.md#d12-02) | 새 실행 능력이 필요한 커스텀 정의를 어떻게 완성할까요? |
| D12-03 | [CMP11](components/custom-definition-registry.md#d12-03) | 커스텀 설정을 Inspector에 표시하는 방법은 무엇일까요? |
| D13-01 | [CMP05](components/parts-slots-and-instances.md#d13-01) | 컴포넌트 사용자가 바꿀 수 있는 범위를 어떻게 공개할까요? |
| D13-02 | [CMP05](components/parts-slots-and-instances.md#d13-02) | 원본과 연결된 인스턴스를 수정할 때 기본 방식은 무엇일까요? |
| D13-03 | [CMP05](components/parts-slots-and-instances.md#d13-03) | slot에 들어갈 수 있는 콘텐츠는 어떻게 제한할까요? |
| D14-01 | [CMP04](components/state-and-request-lifecycle.md#d14-01) | 상태 소유권을 편집기에서 어떻게 설정할까요? |
| D14-02 | [CMP04](components/state-and-request-lifecycle.md#d14-02) | 요청이 끝나기 전에 새 요청이 들어오면 기본 profile은 어떻게 동작할까요? |
| D14-03 | [CMP04](components/state-and-request-lifecycle.md#d14-03) | 검색어와 확정 선택값을 함께 가진 입력은 어떻게 연결할까요? |
| D15-01 | [CMP06](components/behavior-and-input-profiles.md#d15-01) | 기본 provider를 바꾸는 경험은 어떻게 제공할까요? |
| D15-02 | [CMP06](components/behavior-and-input-profiles.md#d15-02) | 전문가가 기본 키보드·포커스 동작을 바꾸면 어떻게 다룰까요? |
| D15-03 | [UX06](experience/component-editing-panels.md#d15-03) | 사용자 정의 interaction을 어떤 화면으로 작성할까요? |
| D16-01 | [CMP07](components/coordinators-and-hosts.md#d16-01) | 여러 인스턴스가 공유하는 UI 문맥은 누가 만들까요? |
| D16-02 | [CMP07](components/coordinators-and-hosts.md#d16-02) | 초기 조정자에서 반드시 제공할 범위는 무엇인가요? |
| D16-03 | [CMP07](components/coordinators-and-hosts.md#d16-03) | 중첩된 문맥이나 호스트가 없을 때 어떻게 보여 줄까요? |
| D17-01 | [UX06](experience/component-editing-panels.md#d17-01) | 접근성 설정은 어떤 편집 경험으로 제공할까요? |
| D17-02 | [CMP08](components/accessibility-contracts.md#d17-02) | 정식 지원 표시를 위해 수동 보조 기술 검증을 어느 수준으로 요구할까요? |
| D17-03 | [CMP08](components/accessibility-contracts.md#d17-03) | 브랜드 디자인과 필수 접근성 요구가 충돌하면 어떤 UX를 제공할까요? |
| D18-01 | [UX06](experience/component-editing-panels.md#d18-01) | 초기 모션 편집의 세부 범위를 어떻게 묶을까요? |
| D18-02 | [CMP09](components/motion-and-transitions.md#d18-02) | 진행 중 반대 상태로 바뀌면 어떤 정책을 기본으로 할까요? |
| D18-03 | [CMP09](components/motion-and-transitions.md#d18-03) | 모션 감소 환경에서 무엇을 기본 제공할까요? |
| D19-01 | [CMP10](components/appearance-conditions-and-precedence.md#d19-01) | 동시에 맞는 외형 규칙이 충돌하면 어떻게 편집할까요? |
| D19-02 | [CMP10](components/appearance-conditions-and-precedence.md#d19-02) | 반응형·입력·환경 조건은 어디까지 직접 만들 수 있을까요? |
| D19-03 | [CMP10](components/appearance-conditions-and-precedence.md#d19-03) | 인스턴스가 공통 디자인을 덮어쓴 값은 어떻게 다룰까요? |
| D20-01 | [ARC03](architecture/commands-revisions-and-undo.md#d20-01) | Undo의 기본 단위는 무엇일까요? |
| D20-02 | [ARC03](architecture/commands-revisions-and-undo.md#d20-02) | AI 작업 중 사람이 같은 부분을 고쳤다면 어떻게 적용할까요? |
| D20-03 | [ARC03](architecture/commands-revisions-and-undo.md#d20-03) | 한 작업에 성공하는 변경과 실패하는 변경이 섞이면 어떻게 할까요? |
| D21-01 | [ARC04](architecture/storage-offline-and-recovery.md#d21-01) | 첫 저장 경험은 무엇을 기본으로 할까요? |
| D21-02 | [ARC04](architecture/storage-offline-and-recovery.md#d21-02) | 오프라인에서 반드시 보장할 작업 범위는 어디까지인가요? |
| D21-03 | [ARC04](architecture/storage-offline-and-recovery.md#d21-03) | 복구·저장 충돌은 어떤 기본 정책이 좋을까요? |
| D22-01 | [ARC05](architecture/collaboration-readiness.md#d22-01) | 공동 편집에서 우선 보호할 경험은 무엇일까요? |
| D22-02 | [ARC05](architecture/collaboration-readiness.md#d22-02) | 병합 결과가 일시적으로 잘못된 문서를 만들면 어떻게 보여 줄까요? |
| D22-03 | [ARC05](architecture/collaboration-readiness.md#d22-03) | Undo는 공동 편집에서 누구의 작업에 작용할까요? |
| D23-01 | [UX02](experience/canvas-and-direct-manipulation.md#d23-01) | 중첩된 요소 선택은 어떤 방식이 좋을까요? |
| D23-02 | [UX02](experience/canvas-and-direct-manipulation.md#d23-02) | 초기 직접 조작 도구에서 무엇을 기본 노출할까요? |
| D23-03 | [UX02](experience/canvas-and-direct-manipulation.md#d23-03) | 실제 클릭 동작과 편집용 선택은 어떻게 구분할까요? |
| D24-01 | [UX03](experience/layout-authoring.md#d24-01) | 레이아웃 편집의 기본 언어는 무엇일까요? |
| D24-02 | [UX03](experience/layout-authoring.md#d24-02) | 자동 배치 안에서 drag/resize할 때 무엇을 우선할까요? |
| D24-03 | [UX03](experience/layout-authoring.md#d24-03) | 타깃에 없는 레이아웃 표현은 어떻게 다룰까요? |
| D25-01 | [UX04](experience/text-and-asset-editing.md#d25-01) | 텍스트 편집의 초기 깊이는 어느 정도가 필요할까요? |
| D25-02 | [UX04](experience/text-and-asset-editing.md#d25-02) | 벡터·도형 편집에서 초기 제공할 깊이는 무엇인가요? |
| D25-03 | [UX04](experience/text-and-asset-editing.md#d25-03) | 폰트가 설치되지 않았거나 이미지가 빠졌을 때 어떻게 편집할까요? |
| D26-01 | [UX01](experience/onboarding-and-inspector.md#d26-01) | 첫 성공 경험을 어떤 작업으로 안내할까요? |
| D26-02 | [UX01](experience/onboarding-and-inspector.md#d26-02) | role·trait 제안은 언제 보여 줄까요? |
| D26-03 | [UX01](experience/onboarding-and-inspector.md#d26-03) | Inspector의 정보량은 어떻게 조절할까요? |
| D27-01 | [UX07](experience/preview-and-prototypes.md#d27-01) | 디자인은 새 버전이고 구현은 이전 버전일 때 어떻게 표시할까요? |
| D27-02 | [UX07](experience/preview-and-prototypes.md#d27-02) | 새 행동이 아직 구현되지 않았을 때 편집은 어디까지 허용할까요? |
| D27-03 | [UX07](experience/preview-and-prototypes.md#d27-03) | Mobile 실제 확인은 어떤 흐름이 기본인가요? |
| D28-01 | [AI01](ai/authoring-context-and-providers.md#d28-01) | AI가 기본으로 볼 수 있는 디자인 범위는 어디까지인가요? |
| D28-02 | [AI01](ai/authoring-context-and-providers.md#d28-02) | 자동 적용에서 검토로 전환할 중요한 변경은 무엇인가요? |
| D28-03 | [AI01](ai/authoring-context-and-providers.md#d28-03) | AI가 모호한 요청이나 충돌을 만나면 어떻게 진행할까요? |
| D29-01 | [AI02](ai/realization-and-independent-verification.md#d29-01) | 일반적으로 이미 구현된 기능의 출력은 어떻게 만들까요? |
| D29-02 | [AI02](ai/realization-and-independent-verification.md#d29-02) | 실패한 생성의 비용·시간·재시도 기본값은 어떻게 정할까요? |
| D29-03 | [AI02](ai/realization-and-independent-verification.md#d29-03) | 검증 실패 또는 미지원 결과를 어떻게 다룰까요? |
| D30-01 | [DLV01](delivery/target-and-style-profiles.md#d30-01) | 첫 정식 지원 조합을 어떻게 정할까요? |
| D30-02 | [DLV01](delivery/target-and-style-profiles.md#d30-02) | CSS-in-JS 출력의 첫 구체 형태는 무엇을 우선할까요? |
| D30-03 | [DLV01](delivery/target-and-style-profiles.md#d30-03) | RN의 첫 실행 환경은 어느 쪽을 우선 검증할까요? |
| D30-04 | [DLV01](delivery/target-and-style-profiles.md#d30-04) | Swift·Android 네이티브 출력의 초기 위치는 어떻게 둘까요? |
| D31-01 | [QAL01](quality/conformance-and-test-plans.md#d31-01) | 검증된 배포의 기본 기준은 무엇일까요? |
| D31-02 | [QAL01](quality/conformance-and-test-plans.md#d31-02) | 커스텀 요구사항의 정답 기준은 누가 확정할까요? |
| D31-03 | [QAL02](quality/evidence-and-freshness.md#d31-03) | 어떤 변경에서 기존 검증을 다시 해야 할까요? |
| D31-04 | [QAL01](quality/conformance-and-test-plans.md#d31-04) | 모든 자동 검사가 통과해도 수동 항목이 남으면 무엇을 허용할까요? |
| D32-01 | [DLV03](delivery/user-owned-library-and-packaging.md#d32-01) | 기본 전달 단위는 무엇일까요? |
| D32-02 | [DLV02](delivery/project-init-and-doctor.md#d32-02) | Axiom이 생성한 코드의 의존성은 어떤 원칙이 좋을까요? |
| D32-03 | [DLV02](delivery/project-init-and-doctor.md#d32-03) | React 출력의 첫 호환성 기준은 무엇인가요? |
| D32-04 | [DLV02](delivery/project-init-and-doctor.md#d32-04) | 설치가 프로젝트 파일을 바꿀 때 기본 UX는 무엇일까요? |
| D33-01 | [DLV04](delivery/diff-upgrades-and-rollback.md#d33-01) | 새 출력의 반영 단위는 어디까지 제공할까요? |
| D33-02 | [DLV04](delivery/diff-upgrades-and-rollback.md#d33-02) | 이전 생성 baseline이 없을 때 어떻게 비교할까요? |
| D33-03 | [DLV04](delivery/diff-upgrades-and-rollback.md#d33-03) | 여러 소비 프로젝트를 업그레이드할 때 어떻게 진행할까요? |
| D33-04 | [DLV04](delivery/diff-upgrades-and-rollback.md#d33-04) | 파일 이동·삭제·의존성 변경이 사용자 수정과 충돌하면 어떤 기본이 좋을까요? |
| D34-01 | [UX07](experience/preview-and-prototypes.md#d34-01) | 검증 화면에서 사용할 데이터·행동은 어디까지 제공할까요? |
| D34-02 | [UX07](experience/preview-and-prototypes.md#d34-02) | 검증 화면에서만 바꾼 디자인은 어떻게 관리할까요? |
| D34-03 | [UX07](experience/preview-and-prototypes.md#d34-03) | 검증 화면의 공유·산출은 초기 어디까지 필요할까요? |
| D35-01 | [BRD01](brand/library-and-guidelines.md#d35-01) | 브랜드 라이브러리의 첫 관리 단위는 무엇인가요? |
| D35-02 | [BRD01](brand/library-and-guidelines.md#d35-02) | 브랜드 사용 지침을 어느 수준까지 검사할까요? |
| D35-03 | [BRD02](brand/assets-and-provenance.md#d35-03) | 자산을 프로젝트에 연결할 때 기본 보관 방식은 무엇일까요? |
| D36-01 | [GOV02](governance/glossary-and-naming.md#d36-01) | 전문 용어와 API 이름은 어떻게 표시할까요? |
| D36-02 | [UX08](experience/editor-accessibility-and-language.md#d36-02) | Studio 자체의 접근성·입력 지원은 어떤 출시 기준으로 볼까요? |
| D36-03 | [UX01](experience/onboarding-and-inspector.md#d36-03) | 제품 안의 학습·도움말은 어느 형태를 우선할까요? |
| D37-01 | [ARC06](architecture/browser-host-and-execution.md#d37-01) | 로컬 도구 연결은 어떤 사용자 흐름이 좋을까요? |
| D37-02 | [ARC06](architecture/browser-host-and-execution.md#d37-02) | Host가 파일과 명령을 실행할 수 있는 범위는 어떻게 승인할까요? |
| D37-03 | [ARC06](architecture/browser-host-and-execution.md#d37-03) | 초기 운영체제·브라우저 지원은 어떤 순서가 좋을까요? |
| D37-04 | [ARC06](architecture/browser-host-and-execution.md#d37-04) | 기업 자체 호스팅·사내망은 초기 어느 수준까지 검증할까요? |
| D38-01 | [QAL03](quality/performance-capacity-and-budgets.md#d38-01) | 성능 기준을 정할 대표 프로젝트 규모는 무엇인가요? |
| D38-02 | [QAL04](quality/release-readiness.md#d38-02) | 첫 출시 준비를 판단할 최우선 증거는 무엇인가요? |
| D38-03 | [BIZ04](business/research-and-customer-feedback.md#d38-03) | 직접 테스트 이후 외부 검증은 어떻게 진행할까요? |
| D38-04 | [OPS02](operations/hosting-observability-and-support.md#d38-04) | 운영 데이터와 오류 진단은 어떤 수집 원칙이 좋을까요? |
| D38-05 | [QAL03](quality/performance-capacity-and-budgets.md#d38-05) | 시간·운영비가 한도를 넘을 때 어떤 중단 기준을 둘까요? |
| D39-01 | [BIZ02](business/pricing-entitlements-and-economics.md#d39-01) | 1~2인 사용자에게 무료로 보장할 핵심은 무엇인가요? |
| D39-02 | [BIZ02](business/pricing-entitlements-and-economics.md#d39-02) | 3인 이상 팀에서 좌석은 누구를 기준으로 셀까요? |
| D39-03 | [BIZ02](business/pricing-entitlements-and-economics.md#d39-03) | 첫 유료 가치로 무엇을 먼저 검증할까요? |
| D39-04 | [BIZ01](business/open-core-and-rights.md#d39-04) | 오픈 소스 공개 범위는 어떤 원칙을 우선할까요? |
| D39-05 | [AI01](ai/authoring-context-and-providers.md#d39-05) | AI 연동의 초기 제품 약속은 어디까지 할까요? |
| D39-06 | [BIZ03](business/positioning-and-go-to-market.md#d39-06) | 첫 시장 검증과 소개 메시지는 어디에 집중할까요? |
| D39-07 | [BIZ02](business/pricing-entitlements-and-economics.md#d39-07) | Foundation 1.0.0에서 사업 목표를 어떤 수준으로 확정할까요? |

## 보충 방향 14개

| ID | 연결 본문 |
|---|---|
| DQ01 | [CMP02](components/traits-roles-and-archetypes.md) |
| DQ02 | [SYN02](syntax/project-documents-and-identity.md) |
| DQ03 | [CMP06](components/behavior-and-input-profiles.md) · [DLV02](delivery/project-init-and-doctor.md) · [SYN02](syntax/project-documents-and-identity.md) |
| DQ04 | [GOV03](governance/version-and-compatibility.md) |
| DQ05 | [PRD03](product/scope-catalog-and-roadmap.md) · [SYN01](syntax/standard-strategy.md) |
| DQ06 | [SYN03](syntax/foundation-and-token-semantics.md) |
| DQ07 | [CMP07](components/coordinators-and-hosts.md) |
| DQ08 | [UX06](experience/component-editing-panels.md) |
| DQ09 | [AI01](ai/authoring-context-and-providers.md) |
| DQ10 | [DLV01](delivery/target-and-style-profiles.md) · [PRD03](product/scope-catalog-and-roadmap.md) |
| DQ11 | [AI01](ai/authoring-context-and-providers.md) · [ARC04](architecture/storage-offline-and-recovery.md) · [ARC06](architecture/browser-host-and-execution.md) |
| DQ12 | [AI01](ai/authoring-context-and-providers.md) · [ARC07](architecture/public-api-mcp-and-entitlements.md) |
| DQ13 | [BIZ01](business/open-core-and-rights.md) |
| DQ14 | [BIZ01](business/open-core-and-rights.md) · [BIZ02](business/pricing-entitlements-and-economics.md) |

[원 방향 확정 snapshot](../decisions/axiom-foundation-direction-approval.json)은 질문·사용자 원 응답·조합 해석·확정 방향·14개 보충 원문과 검토 문서 원문을 함께 보존한다. 과거 답변을 최신 방향으로 조용히 덮어쓰지 않는다.
