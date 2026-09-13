# SYN02 · 프로젝트 문서·ID·참조·수명

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 문법/도메인 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 사용자가 보관할 프로젝트

기본 결과물은 읽기 쉬운 여러 JSON 문서와 자산 폴더다. 묶음 export는 이 구조를 이동하기 위한 전달 방식이다. 파일 하나의 거대한 배열과 화면상의 모든 조작 상태를 정본으로 만들지 않는다.

| 문서 kind | 소유하는 내용 | 대표 참조 |
|---|---|---|
| project | 문서 목록·버전·라이브러리 lock·지원 프로필 | foundation, components, brand |
| foundation | 토큰·테마·분류·정책 | token ID·asset ID |
| component | 공통 의미·값·이벤트·부품·의무 | trait/role/policy lock |
| design | Web/Mobile 외형·배치·조건·모션 연결 | component ID·Part ID |
| registry | 확장 계약과 namespace·버전 | dependencies·requirements |
| screen/scenario | 검증 인스턴스·가짜 데이터·흐름 | component release·override |
| connection | 소비 프로젝트 설정·허용 기반 | host/path alias·delivery receipt |

API 키·계정 토큰·호스팅 청구 정보는 프로젝트 문서에 저장하지 않는다. 선택 상태·카메라 위치·임시 drag·현재 실행 중인 Toast는 의미 문서와 다른 세션 상태다.

## ID·참조·revision

모든 정본 개체는 불변 id를 가진다. name과 path는 이동·번역 가능하다. Ref는 id, 필요한 경우 version/revision, expectedKind를 가진다. 프로젝트 안에서 ID 중복, 잘못된 kind, 존재하지 않는 필수 참조, 구조적 순환을 진단한다. 참조 그래프의 종류별로 허용 순환을 구별한다. token alias와 Part parent는 순환 금지이고 사용자 프로토타입 화면 이동은 순환 가능하다.

Commit revision은 변경 묶음의 결과를 식별한다. 설계안의 snapshot digest는 정렬 규칙·숫자/문자열 규칙·hash algorithm 버전과 함께 계산한다. 객체 키 순서와 파일 경로 변경을 의미 변화로 오인하지 않되, 원본 bytes는 별도 보존한다. schemaVersion, document revision, component public version은 분리한다.

## 복사·연결·삭제

독립 복사는 새 ID를 부여하고 내부 참조를 새 ID로 다시 연결한다. 외부 foundation 연결을 유지할지는 사용자가 선택한다. 복사 계획은 토큰·테마·자산·확장·동작 기반의 의존 closure와 충돌을 먼저 보여 준다. React 코드 import가 아니라 ADS 문서 간 복사다.

소비 프로젝트 연결은 폴더·alias·토큰·환경 공급자·허용 동작 기반 목록을 doctor가 검사한다. 프로젝트/패키지가 허용하지 않은 기반은 import 계획에 넣지 않고 목록 확장 diff를 검토하게 한다. full-custom 선택도 필요한 의존성을 숨길 권한은 아니다.

삭제는 역참조 확인 후 대체·사용처 제거·미해결 초안 중 선택한다. deprecated는 별도 metadata다. 필수 Part가 사라진 디자인은 수정 필요가 되며 마지막 유효 preview를 유지할 수 있다.

## 검증과 확장

형식 검사는 필드 타입·필수 항목을, 의미 검사는 ID·관계·의무·소유권·출력 능력을 확인한다. 새 kind는 해석기 registry에서 버전별로 등록한다. 처음 보는 extension은 opaque 영역으로 보존한다. 알 수 없는 필드를 허용한다는 이유로 실행 코드·명령까지 신뢰하지 않는다.

파일 이동, 독립 복사, 참조 보존, 삭제 복구, 외부 변경 충돌, multi-document 원자 저장을 시험한다. [문서 계약 부록](../annexes/document-contracts.md)은 필드·identity·예시를 함께 정의하고 실제 JSON Schema 구현은 전체 문서 확인 후 진행한다.

## 결정 추적과 변경 영향

<a id="d04-01"></a>

**D04-01 — 확정 방향:** 읽기 쉬운 여러 JSON 문서와 자산 폴더 + 한 번에 묶는 내보내기

<a id="d04-02"></a>

**D04-02 — 확정 방향:** 프로젝트별 init/doctor가 토큰·테마·동작 기반·디렉터리·alias·의존성·설치 상태를 추적한다. 다른 Axiom 시스템에서는 독립 복사가 기본이며 Foundation 연결은 선택한다. 허용 동작 기반은 프로젝트/패키지 단위 목록으로 검사하고 확장은 diff 검토한다.

<a id="d04-03"></a>

**D04-03 — 확정 방향:** 영향 확인 후 대체·사용처 제거·미해결 초안 중 선택하고, 물리 삭제 전후의 별도 deprecated 상태도 지원한다.

전제 문서: [SYN01 · ADS와 토큰 표준 선정 계약](standard-strategy.md) · [GOV03 · 버전·호환·deprecated 정책](../governance/version-and-compatibility.md) · [BRD02 · 자산 저장·출처·권리·배포](../brand/assets-and-provenance.md).

변경 시 함께 검토: [SYN03 · DSF·토큰·테마·사용자 정책](foundation-and-token-semantics.md) · [SYN04 · 가져오기·원문 보존·migration](interchange-and-migration.md) · [CMP01 · 컴포넌트 정의 계층과 디자인 범주](../components/definition-and-designs.md) · [ARC01 · 시스템 문맥·도메인·핵심 흐름](../architecture/system-and-domain-boundaries.md) · [ARC03 · 명령·트랜잭션·revision·Undo](../architecture/commands-revisions-and-undo.md) · [ARC04 · 저장·오프라인 팩·복구](../architecture/storage-offline-and-recovery.md) · [AI01 · AI 작성·컨텍스트·공급자 연결](../ai/authoring-context-and-providers.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
