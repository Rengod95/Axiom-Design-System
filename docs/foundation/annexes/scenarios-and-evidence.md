# 시험 시나리오와 증거 요구

아래 50개는 구현 단계의 필수 시나리오 설계다. 실행한 테스트나 통과 결과가 아니다. 실제 카탈로그의 각 provider variant·타깃별로 obligation을 구체화하고 TestPlan에 연결한다. 표를 구현 테스트 함수 50개와 동일시하지 않는다.

## 시나리오 계약

각 plan은 준비 상태·입력 trace·관찰할 값/이벤트/focus/시각·불변식·timeout·필수/권장·oracle version·fixture hash·환경을 고정한다. both는 자동 검사와 수동 확인을 모두 필요로 하고 automatic-later는 후속 realtime 구현의 gate다. 실제 필수 적용 범위는 명시된 release profile에 기록한다.

| ID | 영역 | 실행할 입력·상황 | 기대 관찰 | 방식 · 책임 |
|---|---|---|---|---|
| SC01 | Foundation | 오류가 섞인 토큰 묶음 import | 유효 부분·오류 원본·경로를 보존 | automatic · SYN04 |
| SC02 | Foundation | alias 순환·잘못된 type·누락 target | 참조 경로 진단·오류 영역 출력 제한 | automatic · SYN03 |
| SC03 | Foundation | 모든 선언 type·색 공간·resolver context 편집/출력 | 각 단계의 의미·출처·실제 렌더 비교 | both · SYN01 |
| SC04 | Foundation | 공유 token drag preview 후 취소·승인·Undo | 즉시 시연과 review commit 분리·한 번 복구 | both · UX05 |
| SC05 | Foundation | 이름 변경·독립 복사·같은 이름 재import | 불변 ID·원본 출처·복사 refMap 유지 | automatic · SYN02 |
| SC06 | Component | Button 유효 pointer/keyboard activation | 한 사용자 의도당 emit 1회 | both · CMP06 |
| SC07 | Component | Button press 취소·disabled·synthetic click | 취소 0회·중복 억제·profile focus 준수 | automatic · CMP06 |
| SC08 | Component | plain Card 렌더·body 주입 | 필수 slot·읽기 순서·불필요 selected/업무 상태 없음 | both · CMP05 |
| SC09 | Component | 선택 Card controlled 요청 지연·거절 | 단일 owner·요청/확정 구별·stale 응답 무시 | automatic · CMP04 |
| SC10 | Component | Card 내부 action·중첩 interactive 구조 | 올바른 독립 목적 또는 구조 진단 | both · CMP08 |
| SC11 | Component | Toast 초기 open false·반복 close | 공지 생략/종료·cleanup 1회 | automatic · CMP04 |
| SC12 | Component | Toast enter 중 exit·reopen·늦은 callback | 정의한 generation·중단 정책·stale 무시 | automatic · CMP09 |
| SC13 | Component | Toast timeout pause·reduced motion | 의미 유지·읽기·bounded cleanup | both · CMP09 |
| SC14 | Component | Toast host 누락·중첩·수동 연결 | 실제 연결 경로·모호함 진단 | automatic · CMP07 |
| SC15 | Component | Select query/active/selected·IME | 독립 값·명시 commit·탐색 의미 유지 | both · CMP04 |
| SC16 | Component | 다른 provider의 Select trigger/item 결합 | port/context/의무 호환 검사·무검사 혼합 거부 | automatic · CMP02 |
| SC17 | Component | 중첩 Dialog 열고 닫기·trigger 제거 | stack·배경·focus 복귀·fallback | both · CMP07 |
| SC18 | Component | 같은 input claim·두 state writer 등록 | 실제 충돌 거부·scope 분리의 정상 조합 허용 | automatic · CMP02 |
| SC19 | Component | custom trait local→library 승격·버전 혼합 | ID·의무·사용처·호환 기록 | automatic · CMP11 |
| SC20 | Component | 의무를 바꾸는 전문가 설정 | 독립 유형 분기·기존 준수 주장 제거 | both · CMP06 |
| SC21 | Appearance | 같은 우선순위 rule·refinement·instance override | 충돌 진단·출처·reset·승격 영향 | automatic · CMP10 |
| SC22 | Editor | nested Part 선택·zoom/rotation·reparent | geometry identity·좌표·순환 거부 | both · UX02 |
| SC23 | Editor | auto layout drag·hug/fill 순환·RTL | 순서/크기 제약·대안·읽기 순서 | both · UX03 |
| SC24 | Editor | 한글 composition·paste·selection·Undo | 미완성 입력 보존·허용 서식·history | both · UX04 |
| SC25 | Editor | font/image 누락·재연결·SVG 입력 | 참조/자리 보존·부분 제한·안전 렌더 | both · BRD02 |
| SC26 | Editor | keyboard·screen reader로 핵심 여정 | 선택·편집·검토·설치·복구 성공 | manual · UX08 |
| SC27 | Preview | design r20·code r18 비교·native 근사 | 각 revision·정확도·실행 증거 구분 | both · UX07 |
| SC28 | Preview | 프로토타입 이동·mock 거절·자동 loop | 시나리오 분리·step budget·예제 소스 | both · UX07 |
| SC29 | Command | idempotent 재전송·응답 유실 | 동일 receipt·중복 commit 없음 | automatic · ARC03 |
| SC30 | Command | AI stale patch·공유 token·stale approval | 의미 충돌·검토·원자 commit | automatic · ARC03 |
| SC31 | Storage | journal 단계별 강제 종료·quota 초과 | 마지막 complete revision·후보 복구 | automatic · ARC04 |
| SC32 | Storage | 외부 ADS 파일 수정·파일 권한 회수 | hash 비교·재연결·덮어쓰기 방지 | automatic · ARC04 |
| SC33 | Offline | 팩 준비→네트워크 차단→재시작 | 편집·검사·출력·내부 AI 실제 연결 | both · ARC04 |
| SC34 | Security | origin/actor 위조·경로 탈출·secret 요청 | scope·root·secret 격리·진단 | automatic · OPS01 |
| SC35 | AI | metadata의 지시·core API 변경 명령 | 데이터로 처리·불허 operation 거부 | automatic · ARC07 |
| SC36 | AI | candidate가 oracle/receipt 수정·test 삭제 | 독립 권한·discovery count·실패 처리 | automatic · AI02 |
| SC37 | AI | provider 실패·budget 초과·재시도 | 후보·last verified 보존·제한된 비용 | automatic · AI01 |
| SC38 | Delivery | 새 React/RN 앱 init·실제 페이지 실행 | provider·alias·types·style·dependency 일치 | both · DLV02 |
| SC39 | Delivery | native 전체 catalog 선택 profile 실행 | Swift/Android 실제 source·의무·AT 결과 | both · DLV01 |
| SC40 | Delivery | 4 delivery mode export·restore·설치 | 파일·types·asset·notice·provenance 완전 | both · DLV03 |
| SC41 | Delivery | baseline/current/new conflict·baseline 없음 | 출처 한계·사용자 수정 보존·선택 diff | both · DLV04 |
| SC42 | Delivery | rename/delete·dependency 설치 부분 실패 | 효과 receipt·복구·stale 파일 비교 | automatic · DLV04 |
| SC43 | Delivery | 여러 소비 앱 upgrade·개별 rollback | 앱별 version 고정·시험·상태 분리 | both · DLV04 |
| SC44 | Evidence | source/oracle/profile 변경 후 badge | stale 판정·전체 release 재실행 | automatic · QAL02 |
| SC45 | Evidence | 수동 미완료·skip/xfail·0 tests | full support 보류·부분 결과 표시 | automatic · QAL01 |
| SC46 | Collaboration | 동시 edit/delete·순서 변경·개인 Undo | 의미 초안 보존·공유 revert 구별 | automatic-later · ARC05 |
| SC47 | Performance | S/M/L cold/warm 작업·취소 | p95·memory·정확성·resource 기록 | automatic · QAL03 |
| SC48 | Operations | license/asset rights 미확인·publish 실패 | 해당 배포 보류·notice·재시도 기록 | automatic · OPS03 |
| SC49 | Operations | 선택 오류 보고·복원·계정/키 회수 | 비식별·사용자 자료 보존·권한 차단 | both · OPS02 |
| SC50 | Business | 첫 사용자 토큰→Card→설치 관찰 | 첫 성공·포기·도움·비용 기록 | manual · BIZ04 |

## 카탈로그·어휘에서 추가되는 검사

38 trait의 obligationFamily는 재사용 oracle의 출발점이다. 예를 들어 temporal-domain은 date-only에 임의 timezone이 추가되지 않는지, virtual-window는 node 재활용 후 key/focus가 유지되는지, file-intake는 파일 선택을 upload 성공으로 오인하지 않는지 검사한다. 구체 입력값·기대값은 해당 component profile과 독립 fixture로 고정한다.

각 family의 모든 required slot/role, reachable state edge, input claim, policy 선택, style rule의 충돌/우선순위를 검사한다. 환경 조합의 표본 전략과 제외 이유를 남긴다. 전체 화면 snapshot만으로 모든 의무가 검증됐다고 하지 않는다.

## 증거 양식

EvidenceRecord에는 requirement IDs, 문서·source·dependency·oracle hashes, target profile version, OS/toolchain/AT 환경, 수행자/runner, 시각·로그·상태/event trace, 결과·제한을 기록한다. manual case는 실제 절차·관찰이 필요하다. pass/fail/blocked/notRun/stale를 구분한다.

정식 release는 profile 전체 검사를 다시 수행하고 필수 automatic/manual을 모두 충족해야 한다. 후보가 test discovery를 비우거나 skip/xfail로 바꿔도 성공으로 처리하지 않는다. 잘못된 구현을 잡는 negative/mutation fixture로 oracle 자체를 검토한다.

[시나리오 JSON](scenario-catalog.json) · [타깃 환경](targets-and-environments.md) · [카탈로그 의무](catalog-and-obligations.md)
