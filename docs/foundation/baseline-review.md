# Foundation 1.0.0 전체 문서 기준선 검토

상태: 전체 본문 작성·문서 정합성 검사 완료. 전체 기준선은 사용자의 확인 전까지 승인 완료가 아니다.

## 작성 범위

12개 분야의 56개 본문, 11개 설명 부록, 관련 JSON 카탈로그·예시를 작성했다. 제품·사업·브랜드·문법·컴포넌트·UX·아키텍처·AI·전달·품질·운영을 연결한다. 각 본문에는 사용자 문제·작업, 계약·관계, 오류·복구·검증과 결정 추적이 있다.

원 결정 129개와 보충 방향 14개를 연결했다. 330행 카탈로그는 239개 표기 항목으로 정규화하고 provider 변형을 보존했다. 38 trait·31 role·36 policy·45 family, 41개 필드 계약, Button·Card·Toast와 Web/Mobile 여섯 디자인, query 10·command 46·진단 30, 핵심 UI/진단의 ko/en 메시지, 시험 시나리오 50개, 선택 절차 23개가 연결된다.

## 먼저 확인할 부분

[제품의 첫 사용자 흐름](product/journeys-and-acceptance.md)과 [세 컴포넌트 사례](annexes/component-walkthroughs.md)를 읽고, [전체 아키텍처](architecture/system-and-domain-boundaries.md)·[인덱스](document-index.md)로 세부 계약을 확인할 수 있다. [선정 기록](annexes/selection-register.md)은 실제 증거로 고정할 기술·버전·가격·수치와 그 시점·책임을 담는다.

## 유지한 최신 결정

외부 Agent는 공식 API/MCP를 사용하고 코어·권한·검증기는 수정하지 못한다. 외부 React import·역반영·반복 동기화 제외는 유지한다. 컴포넌트 목적에 비즈니스 로직을 넣지 않고, plain Card의 선택·busy 상태와 Toast timer는 자동 필수가 아니다.

Web/Mobile 공통 의미와 다른 appearance를 허용하고 React/RN/Swift/Android 초기 필수를 유지한다. 자체 토큰 의미는 이점과 전체 기능·렌더링을 증명한 경우에만 선택하고 아니면 DTCG 전체를 기준으로 한다. 공유 token은 즉시 preview하되 commit 전에 영향을 검토한다.

사용자 소유 산출물, 네 전달 방식, project init/doctor·version pin·3-way diff·rollback, 로컬/오프라인·내부 AI 준비 팩, 초기 협업 설계와 후속 실행 경계를 유지한다.

## 문서 검사 결과

[문서 QA 기록](documentation-qa.json)에 검증 범위·검사 항목·대상 파일의 hash를 남겼다. 56개 본문과 로컬 작업본의 일치, 129개 결정의 원문·연결 위치, 14개 보충 방향, 문서 의존 관계의 순환 여부, 로컬 링크·표·JSON 구문, 카탈로그와 예시의 참조 정합성을 확인했다.

리포지터리의 `python3 scripts/verify-retirement.py`와 `python3 scripts/verify-retirement.py --self-test`도 통과했다. 고정 snapshot 442개 파일의 복원·일치, 기존 경로 432개 제거, LICENSE·.gitignore 보존을 확인했다. 손상된 snapshot, 제거한 패키지의 부활, 깨진 문서 링크, 승인 전 제품 소스 추가를 각각 거부하는 네 사례도 확인했다.

## 증거의 범위

이번 검사는 문서·데이터·참조·결정 추적과 기존 Git reference 보존에 대한 것이다. Studio·렌더러·어댑터·API 서버·schema validator·실제 target tests를 새로 구현하거나 실행한 결과가 아니다. 239개 항목이나 50개 시나리오는 구현·통과 건수가 아니다.

정확한 엔진·라이선스·가격·성능 수치는 23개 선정 절차에서 실제 증거로 고정한다. 본문에 제시한 workload·수치·후보는 검토안으로 표시했다. 과거 승인 기록은 원문·hash를 유지한다.

## 다음 단계

이 전체 본문과 부록의 기준선을 확인받은 뒤 구현 부트스트랩 ADR·버전/검사 profile을 정하고 I0~I6 순서로 실제 제품을 구현한다. 현재 문서 기준선 확인을 제품 출시 승인이나 현재 runtime 지원 증거로 기록하지 않는다.
