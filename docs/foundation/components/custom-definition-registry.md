# CMP11 · 사용자 확장·등록·승격

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 컴포넌트 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 누구나 새 유형을 만들되 지원 상태를 정확히 보여 준다

커스텀은 기존 능력의 조합, 허용 policy 설정, 새로운 선언형 계약, 새로운 실행 능력의 네 수준으로 나뉜다. 처음 두 수준은 검증된 profile 재사용 가능성이 크다. 마지막 수준은 명세를 저장하는 것과 runtime을 구현하는 일이 분리된다.

초기 저장 범위는 컴포넌트 로컬이다. 여러 곳에서 재사용할 때 project registry, library registry로 승격한다. 승격 시 namespace·안정 ID·버전·의존성·의무·migration을 고정하고 사용처를 새 ref로 전환한다.

## 등록·확장 계약

RegistryEntry는 kind, namespace/id/version, owner scope, description, configurationType, dependencies, ports, roles, obligations, incompatibilities, inspectorHints, examples, realization capabilities를 가진다. 실행 가능 코드를 임의 metadata에 넣어 validator가 수행하게 하지 않는다. 설명 문구와 예시는 명령 실행 권한이 없다.

호환 확장은 기존 필수 의무와 port 의미를 유지해야 한다. 기존 의미를 바꾸면 독립 유형으로 분기하고 provenance를 남긴다. 알 수 없는 버전은 보존하고 지원하는 연결만 편집한다. 같은 이름의 다른 namespace를 자동으로 동일 유형으로 취급하지 않는다.

## Inspector 생성

타입 기반 기본 control을 제공하고 label, help, group, order, enum labels, min/max, visibility expression을 선언할 수 있다. 기본 UI가 record/list/nullable를 편집할 수 있어야 한다. 사용자가 제공한 HTML·script를 설명 렌더링 과정에서 실행하지 않는다.

예를 들어 selectable Card 설정은 “선택할 수 있음”을 켜면 선택 방식·값 소유권·의미 전달을 묻는다. 전문가 보기는 trait binding·obligation IDs를 펼친다. 편집 UI가 없는 타입도 원형 보존·설명·지원 진단을 보여 준다.

## 새 실행 능력의 완성

AI 탐색 preview는 미검증임을 표시해 빠르게 실험한다. 정식 후보 생성은 사용자가 확인한 계약 revision과 test plan을 고정한다. 구현 Agent가 실패를 해결하려고 oracle나 entitlement를 수정할 수 없다. 계약 변경이 필요하면 별도 proposal로 돌아간다.

배포 가능한 registry package는 설명·타입·의무·예시·target capability·출처·버전 lock을 포함한다. 선언이 읽히는 상태, GUI 편집 상태, 실제 구현 상태, 검증 상태를 따로 표시한다.

## 시험과 유지보수

로컬→프로젝트→라이브러리 승격, ID 충돌, 의무 약화 거부, 독립 분기, 알 수 없는 버전 보존, Inspector 데이터 입력, malicious metadata 격리, 구현 없는 capability 표시를 검사한다. registry 버전 변경은 참조 카탈로그·AI context·검증 계획·배포 의존성에 전파한다.

## 결정 추적과 변경 영향

<a id="d12-01"></a>

**D12-01 — 확정 방향:** 컴포넌트 로컬에서 시작해 프로젝트·라이브러리로 승격

<a id="d12-03"></a>

**D12-03 — 확정 방향:** 타입 기반 기본 편집 UI + 선언형 설명·범위·그룹 설정

전제 문서: [CMP02 · trait·role·유형과 조합](traits-roles-and-archetypes.md) · [CMP03 · 값·이벤트·props·UI 표현식](values-events-and-expressions.md) · [CMP05 · Part·slot·인스턴스·override](parts-slots-and-instances.md) · [CMP08 · 접근성 의미·관계·준수 계약](accessibility-contracts.md).

변경 시 함께 검토: [UX01 · 작업 공간·온보딩·Inspector·도움말](../experience/onboarding-and-inspector.md) · [UX06 · 컴포넌트·동작·접근성·모션 편집 UX](../experience/component-editing-panels.md) · [ARC03 · 명령·트랜잭션·revision·Undo](../architecture/commands-revisions-and-undo.md) · [AI01 · AI 작성·컨텍스트·공급자 연결](../ai/authoring-context-and-providers.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
