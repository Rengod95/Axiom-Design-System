# BRD02 · 자산 저장·출처·권리·배포

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 브랜드 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 파일을 잃지 않고 다시 사용할 수 있어야 한다

외부 URL 하나를 저장하는 것만으로 오프라인 재사용이나 장기 보존이 성립하지 않는다. 선택 컴포넌트가 직접·간접 참조하는 자산은 권리가 허용하는 범위에서 실제 복사하고 출처를 남긴다. 연결된 Brand Library 전체 복사는 별도 선택으로 제공한다.

AssetRecord는 id, contentHash, mediaType, byteSize, originalName, source, author/license/notice, acquiredAt, variantOf, dimensions/fontMetadata, storageRef, rightsStatus를 가진다. 파일 위치가 바뀌어도 id와 hash가 동일하면 다시 연결할 수 있다. 같은 bytes의 중복 저장은 줄이되 서로 다른 출처·권리 기록을 하나로 지우지 않는다.

contentHash는 저장 blob의 동일성이고 AssetRecord.id는 출처·취득·권리 기록의 동일성이다. 같은 blob에 서로 다른 source/license를 가진 AssetRecord가 공존할 수 있다. 필드 부록의 단일 source/license는 해당 record가 근거로 삼는 권리이며, 사용처와 출력 계획은 그 record의 ID·버전을 고정한다. 중복 제거로 여러 권리를 합쳐 더 넓은 사용 허가를 만들지 않는다. 출력 방식·타깃·배포 범위를 허용하는 검증된 record를 명시적으로 선택하고, 권리 근거가 바뀌면 새 기록과 영향 검토를 남긴다.

## 가져오기와 출력 계약

1. 파일 종류·크기·내용을 검사하고 원본을 content-addressed 저장소에 기록한다.
2. 이미지·폰트 metadata와 표시용 파생본을 만든다. SVG는 실행 가능한 script·외부 참조를 격리/정제한다.
3. 사용 지침과 대체 텍스트의 용도를 연결한다. 하나의 이미지가 장식인지 정보인지는 실제 사용처에서 결정한다.
4. 출력 계획은 필요 자산 closure, 목적 경로, 복사 bytes, 라이선스 고지를 보여 준다.
5. 적용 후 hash·파일 존재·실제 로딩을 검사하고 delivery receipt에 남긴다.

폰트의 웹 embedding 권한이 앱 배포 권한과 같다고 가정하지 않는다. 권리가 확인되지 않으면 해당 전달 방식은 보류하고 대체 폰트를 제안한다. 사용자가 소유한 코드라는 설명으로 외부 asset 조건을 덮어쓰지 않는다.

## 누락·보안·복구

누락 자산은 원본 참조와 layout 자리를 보존하고 placeholder로 표시한다. 정확한 렌더링·출력에 필요한 항목만 제한한다. 재연결 시 같은 파일인지 hash와 metadata를 비교하고, 내용이 다르면 교체로 기록해 관련 시각 증거를 만료시킨다.

원격 가져오기는 허용된 URL과 크기·redirect·timeout 범위를 검사한다. 호스트 내부 주소나 사용자 파일을 원격 URL 기능으로 임의 읽지 않는다. 압축 묶음은 경로 탈출·과도한 압축 해제·중복 경로를 거부한다. 파일명은 표시값이며 저장 경로 권한으로 쓰지 않는다.

## 보관과 삭제

사용 중인 원본은 파생본 정리 과정에서 삭제하지 않는다. 삭제 계획에는 역참조, 보관된 release, 복구 시점이 포함된다. 로컬 원본과 호스팅 사본의 소유·동기화 상태를 구별하고, 선택한 백업을 성공적으로 검증하기 전 이전 사본을 정리하지 않는다.

필수 시험은 해시 일치, 중복 출처 보존, 폰트 누락·재연결, SVG 격리, 의존 자산 closure, offline 준비, 라이선스 고지 누락 탐지다. 실제 third-party 목록은 [권리·출처 부록](../annexes/rights-and-provenance.md)에 버전별로 등록한다.

같은 폰트 bytes에 Web 전용 권리와 native 배포 권리가 따로 있을 때, Web 전용 record를 선택한 native 출력은 보류되어야 한다. 다른 record의 존재만으로 통과하지 않으며, 허용된 record를 선택한 뒤 해당 배포의 notice와 provenance가 그 선택을 가리키는지 확인한다.

## 결정 추적과 변경 영향

<a id="d35-03"></a>

**D35-03 — 확정 방향:** 선택 컴포넌트에 직접·간접 필요한 자산을 실제 복사하고 출처·권리·버전을 보존한다. 연결된 Brand Library 전체 복사는 별도 선택으로 제공한다.

전제 문서: [BRD01 · Brand Library와 사용 지침](library-and-guidelines.md) · [BIZ01 · 오픈 코어·소스·산출물 권리](../business/open-core-and-rights.md).

변경 시 함께 검토: [SYN02 · 프로젝트 문서·ID·참조·수명](../syntax/project-documents-and-identity.md) · [UX04 · 텍스트·폰트·벡터·이미지 편집](../experience/text-and-asset-editing.md) · [ARC04 · 저장·오프라인 팩·복구](../architecture/storage-offline-and-recovery.md) · [DLV02 · 소비 프로젝트 init·doctor](../delivery/project-init-and-doctor.md) · [DLV03 · 사용자 소유 코드·패키지·배포](../delivery/user-owned-library-and-packaging.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
