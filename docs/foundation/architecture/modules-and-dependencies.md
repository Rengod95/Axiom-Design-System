# ARC02 · 모듈·저장소·의존 방향

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 시스템 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 초기 구조와 기술 선택의 위치

초기에는 하나의 저장소에서 공개 코어, Studio, Host, target packs, verification의 의존 방향을 지킨다. 배포·권리·팀 소유 경계가 실제로 달라질 때 저장소를 분리한다. 디렉터리 이름을 많이 만드는 것이 낮은 결합을 보장하지 않는다.

| 논리 모듈 | 제공 계약 | 허용 의존 방향 |
|---|---|---|
| syntax-model | 문서 타입·참조·버전 | 외부 UI/DB/AI 없음 |
| semantic-core | 의미·trait·policy·진단 | syntax-model |
| command-core | patch·revision·transaction | semantic-core·storage port |
| foundation-engine | token 해석·교환·출력 계획 | syntax·검증 계약 |
| component-engine | 의무·상태·표현식·test plan | syntax·semantic-core |
| studio | Canvas·Inspector·대화·preview | 공개 command/query 계약 |
| host | filesystem·toolchain·sandbox | capability·job 계약 |
| target-packs | 코드·mapping·dependency manifests | 고정 contract snapshot |
| verification | test oracle·runner·receipt | 고정 요구·sandbox port |
| services | 계정·권리·공유·metering | 공개 application ports |

이것은 논리 경계 설계안이며 현재 product package가 생성되었다는 뜻이 아니다. package 분리는 독립 빌드·배포·licensing 필요가 생긴 경계부터 적용한다.

## 우선 검증할 구성

권고 검토안은 TypeScript 기반 core/Studio/Host, React와 DOM의 실제 Web 편집면, SVG overlay의 선택·가이드, worker의 무거운 검사, JSON Schema와 별도 의미 검사다. 텍스트는 검증된 편집 엔진을 제한 기능으로 연결한다. native는 플랫폼 toolchain의 별도 job으로 둔다.

Builder의 iframe·등록 컴포넌트·patch 연결, UXPin의 코드 컴포넌트 기반 편집, Plasmic의 prop/slot metadata는 preview bridge와 Inspector 설계에 참고한다. pen.dev는 사람이 읽는 문서와 Agent 조작, slot UX의 참고 대상이다. 이 근거가 Axiom의 임의 코드 역수입을 초기 필수로 되돌리지는 않는다. [기술 근거와 비용 비교](../annexes/technology-and-references.md)

## Canvas·layout·text를 하나의 엔진으로 고르지 않는다

DOM은 실제 Web text·CSS·accessibility와 근접한 대신 zoom·geometry·많은 artboard·iframe·selection을 직접 설계해야 한다. Yoga는 Flexbox layout 계산에 유용하지만 브라우저 전체 CSS·text shaping·scene graph·편집 history를 제공하는 전체 Canvas가 아니다.

Konva/Fabric은 도형·transform 재사용 후보, CanvasKit/Skia는 더 넓은 렌더 제어 후보지만 텍스트 편집·접근성·실제 Web 코드와의 대응 비용이 있다. tldraw/PixiJS는 사용자 결정에 따라 최후순위이며 DOM 경로로 해결되지 않는 필수 요구의 증거가 있을 때 비교한다. 단순 사각형/대량 sprite demo로 선택하지 않는다.

## 선택 게이트와 유지보수

### 교체 가능한 port와 배포 경계 검사

| 경계 | 입력 → 출력 | 금지되는 결합 · 교체 시험 |
|---|---|---|
| syntax/semantic | 문서 bytes·registry lock → 문서·진단 | DOM·filesystem·AI SDK를 import하지 않는다. 같은 fixture를 Node와 브라우저에서 해석해 같은 의미 진단을 얻는다. |
| command/storage | authenticated context·명령·expected revision → durable receipt | 코어가 특정 DB 객체를 받지 않는다. 메모리·Folder adapter에 같은 원자성·경쟁·복구 conformance suite를 적용한다. |
| preview/Studio | 고정 snapshot·transient buffer → geometry·시연 | renderer 객체가 저장 문서에 유입되지 않는다. preview를 교체해도 저장 hash와 Undo 의미가 유지된다. |
| realization/verification | 고정 계약·test plan → 후보 / 독립 evidence | 후보 작성자가 oracle이나 기대 시험 목록을 교체하지 못한다. 실패 후보의 oracle 수정 시도를 거절한다. |
| public core/Studio/Host | 공개 export allowlist → 배포 artifact | 공개 artifact에 Studio 비공개 자원·Host 자격증명·내부 service 코드가 transitive import, source map, asset 경로로 포함되지 않는지 검사한다. |

I0의 구현 profile은 실제 source ownership·public export 목록과 검사 명령을 고정한다. CI는 import graph의 금지 간선과 실제 pack/archive의 파일 목록을 모두 검사한다. 타입 전용 import도 공개 declaration을 통해 내부 계약을 유출할 수 있으므로 검사에 포함한다. 아직 분리 배포하지 않은 모듈에 배포 완료를 주장하지 않는다. port 구현을 바꿀 때 소유 모듈 담당자는 동일 fixture·진단·복구 결과와 달라진 capability를 기록한다.

[선정 기록](../annexes/selection-register.md)은 engine, text, storage/CRDT, schema, state, motion, style, native toolkits의 후보·기준·책임·실증 시점·fallback을 관리한다. JSON Schema 2020-12와 Ajv의 사전 컴파일은 검토 후보이며 실제 버전·CSP·성능을 확인한다. [JSON Schema](https://json-schema.org/draft/2020-12), [Ajv](https://ajv.js.org/guide/managing-schemas.html)

채택 시험은 Button 내부 선택·Card auto layout·Toast motion·Select popup·IME·Undo·대량 문서·native 근사 차이를 공통 workload로 비교한다. 기술 선택이 확정되기 전 문법을 특정 renderer object에 묶지 않는다. 실제 승인 후 bootstrap ADR에서 버전 lock·license·build/test profile을 고정한다.

## 결정 추적과 변경 영향

<a id="d03-01"></a>

**D03-01 — 확정 방향:** 초기에는 하나의 저장소에서 경계를 지키고 필요할 때 제품별 분리

전제 문서: [ARC01 · 시스템 문맥·도메인·핵심 흐름](system-and-domain-boundaries.md) · [BIZ01 · 오픈 코어·소스·산출물 권리](../business/open-core-and-rights.md).

변경 시 함께 검토: [OPS03 · 릴리스·배포·의존성 공급망](../operations/release-and-supply-chain.md) · [OPS04 · 지속 개발·유지보수·인수인계](../operations/development-and-maintenance.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
