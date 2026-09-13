# DLV03 · 사용자 소유 코드·패키지·배포

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 플랫폼 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 네 전달 방식은 동등한 선택이다

사용자는 로컬 소스 폴더, 앱에 직접 복사, 사용자 소유 npm UI 패키지, Git 공유 UI 라이브러리를 선택한다. 하나를 기본으로 강제하지 않고 팀의 배포·소유 방식에 맞춰 제안한다. Native 소스는 Swift package/Android module 같은 해당 생태계 묶음 후보로 별도 제공하고 npm 패키지를 native의 유일 배포 단위로 삼지 않는다.

| 전달 방식 | 사용 경험 | Axiom이 남길 정보 |
|---|---|---|
| 소스 폴더 | 결과를 받고 원하는 앱에 연결 | 파일 manifest·설치 안내·검증 상태 |
| 앱 직접 복사 | 선택 프로젝트에 init/apply | 경로·alias·baseline·receipt |
| 사용자 npm 패키지 | 여러 Web/RN 앱이 버전 고정 | exports/types·peer deps·assets·license |
| Git UI 라이브러리 | PR·tag로 공동 관리 | source provenance·release manifest·diff |

## 산출물 계약

DeliveryManifest는 releaseId/version, contract/design/standard versions, target profiles, dependency lock, files(path/hash/kind), assets/notices, test plan/evidence refs, limitations, public API map, consumer instructions를 가진다. Studio 로그인 없이 사용 가능한 코드와 필요한 명시적 runtime을 제공한다.

생성 파일에는 provenance를 기록하되 machine-specific 절대 경로·secret·사용자 개인 정보는 넣지 않는다. user-owned code를 불필요한 Axiom SaaS runtime 호출에 의존시키지 않는다. runtime이 필요하면 역할과 라이선스·업데이트 정책을 공개한다.

## 패키지 품질

TypeScript는 실제 public declaration과 소비 type fixture를 검사한다. CSS/SCSS/Tailwind/CSS-in-JS asset과 configuration entry를 profile별로 제공한다. package exports·side effects·peer deps·tree shaking·SSR/RSC의 지원 여부는 실제 선택 profile로 검증한다. 정확한 지원이 미정인 항목을 모든 환경 호환으로 표시하지 않는다.

Swift·Android는 toolchain·module manifest·resource/font·public API·sample app을 해당 플랫폼 기준으로 검증한다. 같은 ADS 계약이더라도 배포 메타데이터는 플랫폼별로 필요하다.

## 배포와 권리

파일 export와 실제 registry publish·Git push는 다른 효과다. 제품은 publish 계획·목적지·권한·버전 충돌을 확인하고 승인된 범위에서 수행한다. 구독 종료가 사용자의 기존 소스·문서를 사용할 권리를 없애지 않는다. 제3자 asset·template·dependency 고지는 유지한다.

검증 안 된 후보도 내부 시험용으로 받을 수 있지만 한계·미완료 요구를 manifest에 보존한다. public release badge는 QAL gate를 통과한 정확한 artifact에만 붙인다.

## 검증

네 전달 방식의 완전성·복원·install 안내·types·dependency·asset closure·hash·notice를 검사하고 실제 새 소비 앱에서 실행한다. npm tarball에 test secret이나 제외 파일이 들어가지 않는지, Git 경로 이동이 provenance를 깨지 않는지 확인한다. 반복 배포·충돌·부분 실패는 [DLV04 · 사용자 수정 diff·업그레이드·rollback](diff-upgrades-and-rollback.md)와 연결한다.

## 결정 추적과 변경 영향

<a id="d32-01"></a>

**D32-01 — 확정 방향:** 소스 폴더·앱 직접 복사·사용자 npm 패키지·Git 공유 UI 패키지를 동등하게 선택할 수 있게 한다.

전제 문서: [DLV01 · 타깃·스타일·동작 기반 지원표](target-and-style-profiles.md) · [DLV02 · 소비 프로젝트 init·doctor](project-init-and-doctor.md) · [BIZ01 · 오픈 코어·소스·산출물 권리](../business/open-core-and-rights.md) · [BRD02 · 자산 저장·출처·권리·배포](../brand/assets-and-provenance.md).

변경 시 함께 검토: [DLV04 · 사용자 수정 diff·업그레이드·rollback](diff-upgrades-and-rollback.md) · [QAL02 · 검증 증거·freshness·추적성](../quality/evidence-and-freshness.md) · [OPS03 · 릴리스·배포·의존성 공급망](../operations/release-and-supply-chain.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
