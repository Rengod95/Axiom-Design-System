# Foundation 이후 지속 개발 방향

방향과 문서 인덱스는 확인받았고 56개 본문·공통 부록을 작성했다. 2026-09-13 전체 문서 전수 검토·보완으로 사용자의 조건부 승인을 충족했다. PR 병합 후 채택된 bootstrap ADR을 연결해 제품 구현으로 진행한다.

## 작업의 순서

[OPS04](operations/development-and-maintenance.md)의 I0~I6을 따른다. ADS·안정 저장·Undo에서 시작해 Foundation editor, Button·Card·Toast의 내부 편집과 시연, React/RN 실제 설치·독립 검증, compound·전체 catalog와 Swift/Android로 확장한다. 공개 출시 범위는 [PRD03](product/scope-catalog-and-roadmap.md)과 [QAL04](quality/release-readiness.md)가 유지한다.

기술 선택은 [23개 선정 기록](annexes/selection-register.md)의 동일 workload로 검증한다. 후보의 이름을 적은 것과 채택, 파일을 만든 것과 실제 사용자 작업 완성을 구별한다. 1인 개발의 진행 단위는 시각 작성부터 소비 프로젝트 적용까지 검증한 세로 흐름이다.

## 변경의 지속성

각 구현 issue는 책임 문서·결정 ID·사용자 시나리오·입출력·오류·복구·tests/evidence·migration을 연결한다. 계약을 바꿀 때 문서·예시·diagnostics·target profile·소비 upgrade를 함께 수정한다. 의무·지원 범위·권리 변화는 문서 권위 규칙으로 승인한다.

공개 core와 Studio·Host·타깃 pack의 책임을 유지하고 실제 배포·권리·팀 분리가 필요할 때 저장소를 분리한다. realtime collaboration은 초기 ID·revision·origin·Undo 설계를 바탕으로 후속 구현한다. 기업 installer·일반 Design Studio/CMS는 독립 제품 과제로 확정한다.

## 과거 자산과 완료 증거

레거시를 복사할 때 새 계약과 출처·라이선스·제거할 결합·새 검증을 기록한다. 과거 test/CI나 현재 문서 QA는 새 제품 runtime pass로 이월하지 않는다.

완료 증거는 현재 후보의 source/contract/profile/toolchain/evidence hash와 실제 사용 과제다. 부분 구현·근사 preview·미검증 custom은 해당 상태를 유지한다. 정확한 가격·성능·운영 수치는 실측 후 결정한다.
