# DLV02 · 소비 프로젝트 init·doctor

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 플랫폼 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 코드 파일을 복사한 뒤 실제로 쓸 수 있어야 한다

Project Connection은 framework/toolchain, package manager, project root, source/component/token/style directories, import aliases, theme/locale providers, allowed behavior bases, dependency lock, installed Axiom release를 관리한다. 선언된 설정과 실제 탐지 상태를 비교해 추적한다.

Doctor는 단순 “파일 존재” 검사를 넘어 token/theme 공급, CSS 로딩 순서, alias 해석, public API import, dependency version, 필요한 host 설치, 실제 소비 build·화면을 확인한다.

## init과 doctor 흐름

1. 허용된 프로젝트 폴더를 읽고 후보 framework·폴더·alias를 탐지한다.
2. 사용자가 원하는 전달 방식과 동작 기반·style profile을 확인한다.
3. 파일 변경·dependency·명령·provider 위치·위험 충돌·복구 계획을 보여 준다.
4. 선택한 계획만 적용하고 적용 중 실제 파일 hash를 재확인한다.
5. install/build/test·예제 페이지 실행 결과와 receipt를 저장한다.
6. 이후 doctor가 예상/실제 drift와 upgrade 필요를 보여 준다.

임의 React 코드 import를 구현하지 않고도 package manifests·설정 파일·Axiom provenance를 읽어 설치 상태를 확인할 수 있다. 복잡한 설정을 모르면 추측한 alias를 확정하지 않고 수동 매핑 UI를 제공한다.

## 기반·의존성 제한

프로젝트/패키지 allowedBehaviorBases가 Base UI만 허용하면 React Aria 기반 출력은 바로 설치하지 않는다. 허용 목록 확장·검증된 대체·custom 구현 중 선택한다. 서로 독립인 컴포넌트의 기반 공존과 한 compound 내부 Part 혼합의 호환성을 구분한다.

full-custom은 제작 방법 선택이다. 사용한 runtime·아이콘·폰트·animation dependency를 숨겨도 된다는 뜻이 아니다. 실제 필요한 패키지와 version/provenance를 lock하고 변경 계획에 노출한다.

## 오류·복구

alias 충돌, CSS 중복, 두 theme root, 불일치 peer dependency, 수정된 생성 파일, install 실패를 진단 코드로 구별한다. 부분 설치 후에는 완료된 효과를 기록하고 backup/compensating plan으로 복구한다. package manager script가 실행한 외부 효과까지 완전 Undo라고 과장하지 않는다.

여러 프로젝트는 각각 connection ID와 검증 상태를 가진다. A앱에서 성공해도 B앱의 SSR·routing·dependency 차이는 다시 확인한다. 대표 React 호환 환경과 실제 버전은 선정 gate에서 확정하고 지원 범위를 공개한다.

## 검증

깨끗한 앱 init, 기존 앱 통합, alias 수동 수정, 잘못된 provider, dependency 금지·허용 확장, 반복 init 멱등성, 파일 drift, 네트워크 차단·부분 설치·rollback, React/RN 실제 페이지를 시험한다. Native 설치·실행도 profile별 동일 provenance 원칙을 적용한다.

## 결정 추적과 변경 영향

<a id="d32-02"></a>

**D32-02 — 확정 방향:** 사용자가 선택한 동작 기반·runtime 의존성을 명시하고 고정·갱신한다. 프로젝트/패키지 허용 기반 목록과 diff 검토를 적용한다.

<a id="d32-03"></a>

**D32-03 — 확정 방향:** 대표 React 소비 프로젝트를 선정하고 실제 적용 기준으로 호환성 범위를 확정한다. 특정 framework·SSR/RSC 범위는 아직 선택되지 않았다.

<a id="d32-04"></a>

**D32-04 — 확정 방향:** 변경 파일·의존성·명령을 보여 주고 선택 적용·복구 제공

전제 문서: [DLV01 · 타깃·스타일·동작 기반 지원표](target-and-style-profiles.md) · [ARC06 · 브라우저·로컬 Host·실행 경계](../architecture/browser-host-and-execution.md) · [BRD02 · 자산 저장·출처·권리·배포](../brand/assets-and-provenance.md).

변경 시 함께 검토: [DLV03 · 사용자 소유 코드·패키지·배포](user-owned-library-and-packaging.md) · [DLV04 · 사용자 수정 diff·업그레이드·rollback](diff-upgrades-and-rollback.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
