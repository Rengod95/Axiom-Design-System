# ARC04 · 저장·오프라인 팩·복구

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 시스템 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 같은 문서를 두 가지 저장 방식으로 시작한다

브라우저 보관과 로컬 폴더 보관은 동등한 시작 선택지다. Browser adapter는 IndexedDB/OPFS 같은 후보를 검토하고, Folder adapter는 허용된 파일 API 또는 Host를 사용한다. 브라우저 저장 데이터는 사용자가 선택한 폴더 파일과 다르며 quota·삭제·권한 철회 가능성이 있다. [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)

StoragePort는 readSnapshot, listDocuments, stageTransaction, commitIfRevision, loadJournal, recover, exportBundle, watchExternalChanges를 제공한다. Browser/Folder/향후 cloud가 같은 의미 계약을 구현하되 물리 원자성의 차이는 숨기지 않는다.

## 저장·복구 절차

변경 묶음은 새 blob/snapshot과 transaction journal에 준비하고, 검증 후 project manifest의 활성 revision을 전환한다. 여러 파일을 원자 rename할 수 없는 환경에서는 prepare→commit marker→recovery 절차를 둔다. 중단 후 마지막 완전 commit을 선택하고 임시 후보는 복구 가능 상태로 남긴다.

파일을 쓸 때 마지막으로 읽은 hash와 실제 파일 hash를 비교한다. 외부 변경이 있으면 current/proposed를 비교하고 덮어쓰기·복사·병합을 선택한다. 외부 JSON 변경은 자동 신뢰하지 않고 format/semantic validation을 다시 거친다. 외부 React 코드 편집과는 별개의 ADS 파일 보호다.

자동 이력은 중요한 commit과 복구 point를 유지한다. 크기 제한·정리 시점은 실측 후 정하지만 active revision·사용자 지정 checkpoint·보존 원본·출시 manifest가 참조한 blob을 임의 삭제하지 않는다. export 검증 후 정리하는 경로를 제공한다.

## 오프라인 준비 팩

PreparationPack은 project snapshot, registry/token 표준 자료, asset/font, 선택 target templates/runtime, 검사 도구·dependency cache, provider connection manifest, integrity list를 가진다. 준비 가능 여부는 실제 toolchain·권리·OS에 따라 다르다.

초기 완료 시험은 네트워크 차단 후 재시작해 편집·준비된 검사·출력과 내부 AI 연결을 확인하는 것이다. 외부 AI의 완전 오프라인 실행이나 준비하지 않은 compiler 설치를 보장하지 않는다. AI 연결 실패에도 로컬 GUI 편집과 기존 문서 읽기는 유지한다.

## 실패와 검사

quota 초과는 저장된 것으로 표시하지 않고 임시 메모리 상태·내보내기·공간 확보를 안내한다. 권한 철회는 재연결·다른 위치 보관으로 복구한다. 손상된 manifest는 이전 checkpoint와 원본을 비교해 복구하며 조용히 빈 프로젝트로 초기화하지 않는다.

Browser 탭 충돌, process kill의 각 journal 단계, 디스크 부족, external file change, cache 누락, bundle 복원·hash, offline 재시작을 시험한다. [ARC05 · 후속 실시간 협업을 위한 구조](collaboration-readiness.md)의 협업 readiness는 이 안정 저장 의미 위에 추가한다.

## 결정 추적과 변경 영향

<a id="d21-01"></a>

**D21-01 — 확정 방향:** 브라우저 보관과 로컬 폴더 보관을 동등한 시작 선택지로 제공한다.

<a id="d21-02"></a>

**D21-02 — 확정 방향:** 프로젝트별 준비 팩은 선택 가능하다. 준비 팩의 로컬 편집·검증·출력과 내부 AI 연결을 실제 시험하는 것이 초기 완료 기준이다. 기업용 설치 패키지는 후속이다. 준비되지 않은 도구나 외부 AI의 완전 오프라인 실행까지 보장하지 않는다.

<a id="d21-03"></a>

**D21-03 — 확정 방향:** 자동 복구 이력 + 파일 외부 변경 감지 + 비교 후 저장

전제 문서: [SYN02 · 프로젝트 문서·ID·참조·수명](../syntax/project-documents-and-identity.md) · [SYN04 · 가져오기·원문 보존·migration](../syntax/interchange-and-migration.md) · [ARC03 · 명령·트랜잭션·revision·Undo](commands-revisions-and-undo.md) · [BRD02 · 자산 저장·출처·권리·배포](../brand/assets-and-provenance.md).

변경 시 함께 검토: [ARC05 · 후속 실시간 협업을 위한 구조](collaboration-readiness.md) · [ARC06 · 브라우저·로컬 Host·실행 경계](browser-host-and-execution.md) · [QAL03 · 성능·규모·비용 예산](../quality/performance-capacity-and-budgets.md) · [OPS02 · 호스팅·운영·진단·장애·지원](../operations/hosting-observability-and-support.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
