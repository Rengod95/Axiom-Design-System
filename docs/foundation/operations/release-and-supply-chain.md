# OPS03 · 릴리스·배포·의존성 공급망

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 개발/운영 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 버전을 고정한 산출물을 반복해서 만들 수 있어야 한다

ReleaseManifest는 product/core/ADS·registry·template·target profile·dependency·toolchain 버전과 source tree, asset hashes, oracle/test plan, artifact 목록을 연결한다. 저장 의미, 코드 구현, 검증 도구가 같은 숫자의 버전을 가진다고 가정하지 않는다.

초기 문서 단계의 CI는 reference 보존과 문서 정합성만 확인한다. 제품 구현 확인 후 bootstrap ADR에서 lint/type/build/unit/integration/target/manual gate를 새로 정의한다. 이전 pnpm workspace와 CI를 조용히 복원하지 않는다.

## 공급망과 패키지 공개

직접·전이 dependency의 version·integrity·license·provenance를 기록한다. 설치 script·binary download·native tooling은 network/권한·재현 조건을 검토한다. 레퍼런스 코드의 라이선스와 실제 복사한 코드의 권리를 다르게 취급하지 않는다.

Release candidate 생성→전체 profile 검사→권리/파일 목록 검사→검토→서명/attestation 후보→게시→설치 smoke→기록 순서다. 서명은 source와 결과 연결의 도구이며 잘못된 계약을 올바르게 만들지는 않는다.

Registry publish·Git tag·호스팅 배포는 목적지·version·권한·실제 변경을 검토하고 수행한다. 일부 타깃만 게시된 경우 partial release로 기록하고 전체 성공으로 표시하지 않는다. package version 충돌은 기존 artifact 덮어쓰기보다 새 후보/버전 정책을 따른다.

## 재현성과 AI

기계적 출력은 동일 입력·tool version에서 동일한 정규화 파일을 목표로 한다. AI 생성은 비결정적일 수 있으므로 prompt/context/model connection metadata와 candidate source를 보존한다. 같은 source를 재빌드·재검증할 수 있는지와 AI에게 같은 source를 다시 생성시키는 능력은 다르다.

AI 모델 업데이트가 기존 라이브러리를 자동 재작성하지 않는다. 새 구현 후보를 만들고 diff·검증·승인한다. 사용자 키·모델별 secret은 provenance에 포함하지 않는다.

## rollback·deprecation·시험

문제 release는 affected profile과 known issue를 공개하고 이전 검증 artifact 또는 수정 버전으로 돌아간다. 사용자 source를 강제로 원격 변경하지 않는다. dependency 취약점은 실제 포함 범위·도달성·대체·검증을 기록한다.

재현 build, artifact manifest 완전성, publish 실패·재시도, 설치 smoke, notice 누락, secret/불필요 파일 포함, dependency lock drift, backup 복원을 시험한다. 정확한 signing·SBOM 형식과 release 도구는 선정 기록에서 버전별로 확정한다.

## 결정 추적과 변경 영향

사용자 목적과 확정된 방향을 세부 설계로 연결하는 문서다. 새로운 범위 변경은 GOV01 절차로 승인한다.

전제 문서: [ARC02 · 모듈·저장소·의존 방향](../architecture/modules-and-dependencies.md) · [DLV03 · 사용자 소유 코드·패키지·배포](../delivery/user-owned-library-and-packaging.md) · [DLV04 · 사용자 수정 diff·업그레이드·rollback](../delivery/diff-upgrades-and-rollback.md) · [QAL02 · 검증 증거·freshness·추적성](../quality/evidence-and-freshness.md) · [BIZ01 · 오픈 코어·소스·산출물 권리](../business/open-core-and-rights.md).

변경 시 함께 검토: [OPS04 · 지속 개발·유지보수·인수인계](development-and-maintenance.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
