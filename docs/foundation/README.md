# Axiom Foundation 1.0.0

Axiom Studio의 Design System Builder를 만들기 위한 **12개 분야·56개 본문과 공통 부록**이다. 사용자가 확정한 방향과 문서 인덱스를 바탕으로 전체 본문을 작성했다. 2026-09-13 전수 검토·보완을 거쳐 전체 문서 기준선의 조건부 승인을 충족했다. 제품 코드·실제 플랫폼 검증은 다음 단계다.

Axiom은 사용자가 시각적으로 토큰·테마와 재사용 컴포넌트를 정의하고, GUI·AI·공식 API/MCP가 같은 문법과 검증 경로로 편집하며, 플랫폼별 사용자 소유 UI 라이브러리로 전달하는 제품이다.

## 먼저 읽을 문서

1. [제품 목적과 사용자](product/purpose-and-users.md): 누구의 어떤 유지보수 비용을 줄이는가.
2. [처음부터 설치까지](product/journeys-and-acceptance.md): 토큰 수정→컴포넌트→검증 화면→init·upgrade.
3. [Button·Card·Toast 예시](annexes/component-walkthroughs.md): GUI의 조작이 의미·상태·접근성·코드 계약으로 어떻게 이어지는가.
4. [전체 시스템 구조](architecture/system-and-domain-boundaries.md): 정본·명령·저장·AI·검증·전달의 책임.
5. [문서 기준선 검토](baseline-review.md): 작성 범위·확인 결과·아직 실증이 필요한 선택.

[56개 전체 문서 인덱스](document-index.md) · [129개 결정 연결표](decision-coverage.md) · [지속 개발 방향](development-direction.md)

## 상세 자료

- [330행 카탈로그와 239개 표기 항목](annexes/catalog-and-obligations.md), [38 trait·31 role·36 policy·45 family](annexes/extension-vocabulary.md).
- [57개 필드 계약](annexes/document-contracts.md), [세 컴포넌트·여섯 디자인의 검토 JSON](annexes/examples/review-project.json).
- [공식 query·command·진단 목록](annexes/commands-and-diagnostics.md), [타깃·환경·토큰 표준 전체 지원 기준](annexes/targets-and-environments.md).
- [50개 시험 시나리오](annexes/scenarios-and-evidence.md), [기술 레퍼런스](annexes/technology-and-references.md), [23개 구체 선택 절차](annexes/selection-register.md).
- [권리·출처](annexes/rights-and-provenance.md), [한국어·영어 메시지](annexes/language-and-messages.md).

목록·JSON·필드 표는 설계 자산이다. 카탈로그 이름을 정리한 수를 구현 완료 수로 표시하지 않는다. 정확한 엔진·라이브러리·라이선스·가격·성능 수치는 정한 비교·실증 절차에서 고정한다.

## 승인과 기록

[방향 확인](../decisions/axiom-foundation-direction-approval.md) → [인덱스 확인과 전체 작성 허가](../decisions/axiom-foundation-index-approval.md) → **전체 문서 기준선 확인** → 구현 부트스트랩 ADR → 실제 제품 구현 순서다.

이전 실행 코드는 Git reference로 보존되어 있으며 새 제품의 정본이나 검증 결과로 취급하지 않는다. [레거시 보존 안내](../../reference/pre-studio/README.md)의 고정 commit과 inventory를 통해 확인한다.

[2026-09-13 전수 검토 결과와 22개 문제 보완](audits/completeness-review.md)
