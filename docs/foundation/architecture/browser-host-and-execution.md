# ARC06 · 브라우저·로컬 Host·실행 경계

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 시스템 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 브라우저만으로 가능한 일과 Host가 맡는 일

브라우저는 문서 편집·검증·디자인 시연·준비된 출력과 파일 export를 수행한다. Host는 허용한 프로젝트 폴더의 설치·파일 비교·toolchain 실행·native simulator·로컬 AI 연결을 담당한다. 사용자는 처음부터 Host를 선택하거나 필요할 때 연결할 수 있다.

초기 필수 환경은 macOS·Windows와 Chromium 계열이다. Apple native build·simulator는 적합한 macOS 도구 환경이 필요하므로 Windows 연결 상태를 Swift 검증 가능으로 표시하지 않는다. SDK·라이선스·장치 준비 상태는 capability로 확인한다.

## 연결과 capability 계약

Connection은 hostId, principal, origin, pairedAt, project roots, allowed job kinds, protocol version, toolchain inventory, lease 상태를 가진다. 최초 연결에서 폴더와 작업 종류를 정하고 범위 확장은 검토한다. origin/session binding과 일회 pairing challenge로 임의 사이트의 Host 호출을 막는다.

Capability는 선언만 보지 않고 탐지 시각·검증 결과·환경 버전을 가진다. “npm 설치됨”과 “선택한 React 프로젝트 설치 성공”, “simulator 있음”과 “현재 후보 실행 성공”을 분리한다. 실제 연결 host와 작업 경로를 UI에 표시한다.

## 실행 계약

JobPlan은 고정 snapshot, tool identity·version, working root, argument array, input/output allowlist, network policy, timeout·budget, expected effects, rollback plan을 가진다. 사용자 문자열을 shell command로 이어 붙이지 않는다. 승인 범위를 넘는 dependency 설치·파일 삭제·네트워크 접근은 새 계획으로 다룬다.

실행은 별도 작업 디렉터리·제한 권한에서 수행한다. 일반 subprocess가 악의적인 코드에 대한 충분한 격리라고 주장하지 않는다. Node/native build 도구의 sandbox 보장과 실제 OS 기능은 구현 단계에서 검증한다. 격리 불충분 시 해당 미검증 실행을 제한하고 검증 가능한 경로로 안내한다.

## 내부망과 연결 실패

준비 팩의 로컬 편집·검증·출력·내부 AI endpoint 연결은 초기 실제 시험 조건이다. 기업용 설치 패키지, 중앙 배포·자동 업그레이드·관리 콘솔은 후속이다. 오프라인에서 외부 모델을 계속 사용할 수 있다고 약속하지 않는다.

연결 끊김은 jobId로 상태를 재조회하고 중복 실행을 막는다. 중단할 수 없는 외부 효과는 미확인으로 표시해 실제 파일·패키지 상태를 doctor가 다시 확인한다. “취소 버튼 클릭”만으로 설치가 원복됐다고 기록하지 않는다.

## 검증

origin 위조·권한 확장·경로 탈출·symlink·명령 주입·stale approval·job 중복·timeout·부분 설치·disconnect를 시험한다. target 실행 증거에는 host·OS·toolchain과 실제 source hash를 남긴다. 설치의 사용자 경험은 [DLV02 · 소비 프로젝트 init·doctor](../delivery/project-init-and-doctor.md)가 정의한다.

## 결정 추적과 변경 영향

<a id="d37-01"></a>

**D37-01 — 확정 방향:** 브라우저 단독과 Host 연결을 동등하게 선택하되 브라우저에서 시작한 사용자는 설치·검증이 필요할 때 연결할 수 있게 한다.

<a id="d37-02"></a>

**D37-02 — 확정 방향:** 프로젝트 폴더·작업 종류를 최초 연결 때 지정하고 범위 확장은 확인

<a id="d37-03"></a>

**D37-03 — 확정 방향:** macOS·Windows와 Chromium 계열을 초기 필수로 두고 실제 사용자의 개발 환경을 추가로 반영한다. Windows에 Apple native 도구가 있다고 가정하지 않는다.

<a id="d37-04"></a>

**D37-04 — 확정 방향:** 준비 팩의 로컬 편집·검증·출력과 내부 AI 연결을 실제 시험하는 것이 초기 완료 기준이다. 기업용 설치 패키지는 후속이다. 준비되지 않은 도구나 외부 AI의 완전 오프라인 실행까지 보장하지 않는다.

전제 문서: [ARC01 · 시스템 문맥·도메인·핵심 흐름](system-and-domain-boundaries.md) · [ARC03 · 명령·트랜잭션·revision·Undo](commands-revisions-and-undo.md) · [ARC04 · 저장·오프라인 팩·복구](storage-offline-and-recovery.md).

변경 시 함께 검토: [ARC07 · 공식 API·MCP·확장·사용권 경계](public-api-mcp-and-entitlements.md) · [DLV02 · 소비 프로젝트 init·doctor](../delivery/project-init-and-doctor.md) · [OPS01 · 보안·데이터·비밀정보 관리](../operations/security-and-data-boundaries.md) · [OPS02 · 호스팅·운영·진단·장애·지원](../operations/hosting-observability-and-support.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
