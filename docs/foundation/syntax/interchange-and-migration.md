# SYN04 · 가져오기·원문 보존·migration

상태: 승인된 Foundation 1.0.0 설계 기준선 · 검토 2026-09-13

책임 역할: 문법/도메인 설계자. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 교환의 목표는 원본 보존과 편집 결과의 이해다

가져온 파일에 오류가 있어도 유효한 부분을 수정할 수 있어야 한다. ImportResult는 원본 파일 bytes·hash, 발견한 표준 판본, 해석된 문서, opaque 영역, diagnostics, 적용 가능한 migration을 분리한다. 원본 보존본과 편집 결과의 정규화본을 함께 내보낼 수 있다.

형식만 통과한 문서와 의미까지 해석한 문서를 같은 상태로 표시하지 않는다. 표준의 metadata·확장·alias·context를 조용히 삭제하지 않는다. 알 수 없는 최신 기능은 원형 보존하면서 영향을 받는 편집·출력만 제한한다.

## 가져오기 파이프라인

1. 파일·묶음 목록과 허용 크기를 검사한다. 원본을 먼저 보존한다.
2. 판본을 탐지하되 모호하면 사용자가 비교 가능한 후보와 진단을 본다.
3. 형식을 검증하고 유효 부분을 해석한다. identity 매핑은 원본 path와 ADS ID 사이에 기록한다.
4. alias·resolver·자산 등 의존 경로를 검사한다. 원격 참조를 허가 없이 네트워크에서 실행·가져오지 않는다.
5. preview·내보내기·타깃 지원 상태를 계산한다. 오류가 남은 영역을 명확히 표시한다.

같은 파일을 두 번 가져오면 신규 복사와 기존 ID에 대한 업데이트를 구별한다. 단지 name이 같다고 기존 토큰을 덮어쓰지 않는다. 수동 매핑이나 출처 ID가 확인된 업데이트만 diff로 적용한다.

## 정규화와 migration 계약

정규화는 포맷·정렬·안정적인 직렬화를 위한 변환이고 표준 의미를 임의로 단순화하는 과정이 아니다. 손실이 있는 내보내기는 LossReport의 경로·이전 의미·출력 표현·영향 타깃·사용자 선택을 요구한다.

MigrationPlan은 from/to schemaVersion, transform identity·version, preconditions, operations, loss/diagnostic list, input/output digest, inverse 가능 여부를 가진다. 실행은 원본 보존→별도 후보 작성→검증→선택 채택이다. 역변환이 의미상 불가능하면 undo가 가능한 것처럼 표시하지 않고 보존된 원본 복원으로 안내한다.

## migration 실패와 복구 예

예를 들어 schema A의 두 토큰과 opaque extension을 schema B로 옮기는 후보를 만든다. 변환 뒤 alias가 삭제된 ID를 가리키고 extension과 연결된 의미를 보존할 수 없으면 후보 검증은 실패다. 원본 bytes/hash와 A의 마지막 채택 revision은 그대로 유지하고, 실패한 B 후보·변환기 version·문제 경로·LossReport를 별도로 보관한다. 유효한 다른 문서를 이 후보의 성공 결과로 덮어쓰지 않는다.

사용자는 alias mapping을 고친 새 후보를 검사하거나, 지원이 준비될 때까지 A의 원본/마지막 유효본으로 계속 작업한다. 손실을 검토해 제한된 출력만 선택한 경우에도 B의 전체 호환 migration 성공으로 표시하지 않는다. 채택 후 복구가 필요하고 역변환이 불가능하면 보존된 A snapshot에서 새 복구 revision을 만든다. 그 사이 편집이 있으면 먼저 diff를 비교하며, 복원은 현재 변경을 무조건 지우는 작업이 아니다. 문법 책임자는 원본 hash 불변, 실패 후보 비채택, 재시도 입력 digest와 복구 후 참조를 확인한다.

## 제외와 오류 사례

외부 React 코드 import·역반영·반복 동기화는 초기 지원 대상이 아니다. DTCG·ADS·자산 가져오기와 생성된 코드의 diff는 유지한다. JSX가 토큰 이름을 포함한다고 이를 자동 DS 문서로 인식하지 않는다.

예: 두 토큰 중 하나가 잘못된 dimension이면 유효 토큰과 오류 원본을 함께 열고 해당 경로를 수정하게 한다. 예: 새 extension의 payload를 알지 못하면 무관한 설명은 편집하되 payload를 변경·실행하지 않는다. 원형보존이 어려운 연관 편집은 이유를 보여 주고 제한한다.

## 검증과 유지보수

필수 corpus는 정상·부분 오류·순환·최신 extension·다중 context·복합 참조·파일 이동·동일명 다른 ID·손실 export다. 원본 bytes, 정규화 의미 동등성, 진단 위치와 지원 제한을 따로 비교한다. 기준은 [SYN01 · ADS와 토큰 표준 선정 계약](standard-strategy.md)에서 고정한 판본이며 변경 시 migration corpus와 편집기 안내를 함께 갱신한다.

## 결정 추적과 변경 영향

<a id="d05-02"></a>

**D05-02 — 확정 방향:** 알려진 부분은 편집하고 모르는 부분은 원형 보존하며 관련 출력 제한

<a id="d06-01"></a>

**D06-01 — 확정 방향:** 유효한 부분과 오류 원본을 함께 초안으로 열고 수정 안내

<a id="d06-02"></a>

**D06-02 — 확정 방향:** 원본 보존 파일과 편집 결과의 정규화 파일을 함께 제공

전제 문서: [SYN01 · ADS와 토큰 표준 선정 계약](standard-strategy.md) · [SYN02 · 프로젝트 문서·ID·참조·수명](project-documents-and-identity.md) · [SYN03 · DSF·토큰·테마·사용자 정책](foundation-and-token-semantics.md) · [GOV03 · 버전·호환·deprecated 정책](../governance/version-and-compatibility.md).

변경 시 함께 검토: [UX05 · 토큰·테마·정책 편집 UX](../experience/foundation-editor.md) · [ARC04 · 저장·오프라인 팩·복구](../architecture/storage-offline-and-recovery.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
