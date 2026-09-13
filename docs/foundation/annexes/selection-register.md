# 남아 있는 구체 선택과 실증 절차

사용자가 확정한 것은 목적·필수 범위·선택 원칙이다. 아래 항목은 그 범위를 만족하는 구체 제품/버전/수치를 고정하는 절차다. 빈 “TBD”로 두지 않고 후보·판정 기준·시점·책임·실패 시 방식을 정리했다. 문서 기준선 확인은 이 절차를 승인하는 것이며 실행 결과 없이 후보가 채택됐다고 기록하지 않는다.

초기 추천은 공개 코어와 Studio의 경계를 지킨 modular monolith, DOM/React 편집면, JSON 문서·참조 그래프, 공통 command, 제한 상태/표현식, 재사용+AI 구현과 독립 검증이다. 구체 패키지는 아래 gate의 workload로 결정한다. 각 버전·license·실증 결과를 lock한 ADR이 생겨야 status를 SELECTED로 바꾼다.

## SEL01 · 토큰 의미·표준

- **우선 비교:** DTCG 의미+ADS 내부 그래프(A/B 비교).
- **다른 후보:** 독립 의미 C.
- **판정할 증거:** 전체 기능·보존·GUI·4 target 렌더·개발/유지 비용.
- **결정 시점·책임:** I2 문법 안정화 전 · 문법 책임자→제품 책임자.
- **실패 시 처리:** 이점 미입증이면 DTCG 전체.
- **현재 상태:** 미실증. 책임 문서는 [SYN01](../syntax/standard-strategy.md)이다.

## SEL02 · 편집 렌더·Canvas

- **우선 비교:** React/DOM 실제 UI+SVG 조작 overlay.
- **다른 후보:** Konva/Fabric/CanvasKit; tldraw/PixiJS 최후순위.
- **판정할 증거:** Part 직접 선택·IME·auto layout·motion·대량 장면·비용.
- **결정 시점·책임:** I3 editor 고정 전 · 시스템/UX 책임자.
- **실패 시 처리:** 원인별 혼합 렌더; 핵심 기능 축소는 재승인.
- **현재 상태:** 미실증. 책임 문서는 [ARC02](../architecture/modules-and-dependencies.md)이다.

## SEL03 · 텍스트 엔진

- **우선 비교:** 제한된 schema의 Tiptap/ProseMirror 우선 비교.
- **다른 후보:** Lexical·native contenteditable 제한 구현.
- **판정할 증거:** 한글 IME·selection/history·paste·type binding·무료 범위.
- **결정 시점·책임:** I3 text 작업 전 · UX/시스템 책임자.
- **실패 시 처리:** 기능 충족한 대안 비교, CMS 범위 확대 없음.
- **현재 상태:** 미실증. 책임 문서는 [UX04](../experience/text-and-asset-editing.md)이다.

## SEL04 · 형식 검사와 TS 타입

- **우선 비교:** JSON Schema 2020-12+Ajv precompile 후보.
- **다른 후보:** TypeBox/Zod 중심 표현 후 교환 비교.
- **판정할 증거:** CSP·표현 완전성·schema diff·bundle·동적 확장 제한.
- **결정 시점·책임:** I1 문서 format 고정 전 · 문법 책임자.
- **실패 시 처리:** 공개 교환 schema와 의미 validator 분리 유지.
- **현재 상태:** [ADR-0010](../../adr/0010-source-preserving-draft-authoring.md)에 따른 공통 DocumentEnvelope·Ajv 8.20.0 사전 생성 검사의 [부분 실증](../../implementation/schema-selection-evidence.md)을 확보했다. [ADR-0011 구조 검사 실증](../../implementation/structural-domain-evidence.md)은 카탈로그의 알려진 구조와 일부 로컬 참조까지 확장한다. 미정 타입·전체 도메인 의미·공개 타입 생성·실제 브라우저 측정은 남아 있어 SEL04 전체 선택은 미완료다. 책임 문서는 [SYN02](../syntax/project-documents-and-identity.md)이다.

## SEL05 · 문서 저장·협업 준비

- **우선 비교:** snapshot+journal storage port, Yjs 비교.
- **다른 후보:** Automerge·server sequencer.
- **판정할 증거:** atomic save·delete/edit·cycle·origin Undo·offline merge·cost.
- **결정 시점·책임:** I1 저장 모델 전·협업 도입 전 재검증 · 시스템 책임자.
- **실패 시 처리:** 로컬 안정 저장 유지, realtime 출시 후속.
- **현재 상태:** [ADR-0013](../../adr/0013-browser-transactional-storage.md)에 따른 IndexedDB snapshot+journal의 [부분 실증](../../implementation/browser-storage-evidence.md)을 확보했다. 실제 Chromium 두 탭의 리비전 충돌·트랜잭션 취소·완료 응답 유실·재시작 복구를 검증했다. 다른 브라우저·eviction·이력 압축·오프라인 병합·협업 Undo와 대안 비교는 남아 있어 SEL05 전체 선택은 미완료다. 책임 문서는 [ARC05](../architecture/collaboration-readiness.md)이다.

## SEL06 · 상태·표현식 실행

- **우선 비교:** 제한 ADS interpreter·profile binding.
- **다른 후보:** XState 연결·target native state.
- **판정할 증거:** ownership·cancel·bounded evaluation·serialization·native mapping.
- **결정 시점·책임:** I3 behavior 구현 전 · 컴포넌트 책임자.
- **실패 시 처리:** DSL 의미를 외부 runtime object에 고정하지 않음.
- **현재 상태:** 미실증. 책임 문서는 [CMP04](../components/state-and-request-lifecycle.md)이다.

## SEL07 · 모션 runtime

- **우선 비교:** Web Motion 후보+native별 mapping.
- **다른 후보:** Web Animation/CSS·native 기본 animation.
- **판정할 증거:** enter/exit·spring/keyframe·중단·cleanup·reduced·licensing.
- **결정 시점·책임:** I3 motion 전·I5 native 전 · 컴포넌트/타깃 책임자.
- **실패 시 처리:** 의미 대체 승인 또는 미지원; 무시 금지.
- **현재 상태:** 미실증. 책임 문서는 [CMP09](../components/motion-and-transitions.md)이다.

## SEL08 · React 소비 환경

- **우선 비교:** 대표 Vite 앱·SSR/RSC 사례 비교.
- **다른 후보:** Next 등 framework별 profiles.
- **판정할 증거:** 실제 types/import/style/provider/build/hydration.
- **결정 시점·책임:** I4 첫 init 전 · 타깃 책임자.
- **실패 시 처리:** 검증된 범위 공개, 전체 React 호환 주장 금지.
- **현재 상태:** 미실증. 책임 문서는 [DLV02](../delivery/project-init-and-doctor.md)이다.

## SEL09 · CSS-in-JS 구체 라이브러리

- **우선 비교:** Emotion·styled-components·compile-time 후보 비교.
- **다른 후보:** 소비 환경 감지 후 명시된 연결.
- **판정할 증거:** SSR/RSC·RN 분리·runtime/빌드 비용·types·유지.
- **결정 시점·책임:** I4 style profile 고정 전 · 타깃 책임자.
- **실패 시 처리:** 검증된 한정 목록; CSS-in-JS 범주 누락은 범위 재승인.
- **현재 상태:** 미실증. 책임 문서는 [DLV01](../delivery/target-and-style-profiles.md)이다.

## SEL10 · Swift/Android toolkit

- **우선 비교:** SwiftUI·Jetpack Compose 우선 비교.
- **다른 후보:** UIKit/View 기반 보완 profile.
- **판정할 증거:** 전체 catalog·a11y·motion·types·resource·toolchain.
- **결정 시점·책임:** I5 native pack 고정 전 · 타깃 책임자.
- **실패 시 처리:** 보완 구현·다른 toolkit 비교, 타깃 삭제 금지.
- **현재 상태:** 미실증. 책임 문서는 [DLV01](../delivery/target-and-style-profiles.md)이다.

## SEL11 · 카탈로그 구체 profile

- **우선 비교:** 239 표기 항목·330 provider 변형 보존.
- **다른 후보:** 의미 증명 후 alias/동일 목적 결합.
- **판정할 증거:** UI 목적·Part/template/utility·obligation·4 target 대응.
- **결정 시점·책임:** I3~I5 각 family 구현 전 · 제품/컴포넌트 책임자.
- **실패 시 처리:** 변형 분리·범위 변경은 owner 승인.
- **현재 상태:** 미실증. 책임 문서는 [PRD03](../product/scope-catalog-and-roadmap.md)이다.

## SEL12 · 사용자 AI 연결

- **우선 비교:** 공식 지원 가능한 BYOK·로컬 tool·내부 endpoint.
- **다른 후보:** 향후 Axiom 관리형 AI.
- **판정할 증거:** 인증·권한·budget·offline·secret·실제 command 호출.
- **결정 시점·책임:** I4 AI 공개 연결 전 · AI/보안 책임자.
- **실패 시 처리:** 검증된 연결 목록만 표시, 구독=API 가정 금지.
- **현재 상태:** 미실증. 책임 문서는 [AI01](../ai/authoring-context-and-providers.md)이다.

## SEL13 · 오픈 코어 라이선스

- **우선 비교:** MPL 후보+Studio 보호+출력 별도 허용 조건.
- **다른 후보:** AGPL·허용적 OSS·기업 계약 조합.
- **판정할 증거:** 파일 출처·배포/link·고객 의무·공개 수정 제공·복제 억제 비용.
- **결정 시점·책임:** 공개 코어/유료 계약 공개 전 · 제품/법무 책임자.
- **실패 시 처리:** 기존 LICENSE 유지·정확한 법적 조건 검토.
- **현재 상태:** 미실증. 책임 문서는 [BIZ01](../business/open-core-and-rights.md)이다.

## SEL14 · 가격·무료 한도

- **우선 비교:** 개인 로컬 무료·편집 좌석+자원 과금 가설.
- **다른 후보:** 자원 중심·팀 묶음·기업 중심.
- **판정할 증거:** 성공 DS당 원가·지불 의사·반복 사용·지원 비용.
- **결정 시점·책임:** 첫 유료 판매 전 · 사업 책임자.
- **실패 시 처리:** 실측될 때까지 확정 금액 약속 없음.
- **현재 상태:** 미실증. 책임 문서는 [BIZ02](../business/pricing-entitlements-and-economics.md)이다.

## SEL15 · 성능·비용 수치

- **우선 비교:** S/M/L 데이터셋과 p95 목표안.
- **다른 후보:** 장비/profile별 조정.
- **판정할 증거:** 첫 열기·입력·memory·AI/build·월 직접원가.
- **결정 시점·책임:** I3 첫 실측 후·G5 전 · 품질/제품 책임자.
- **실패 시 처리:** 최적화·환경 조정·필수 범위 변경 재승인.
- **현재 상태:** 미실증. 책임 문서는 [QAL03](../quality/performance-capacity-and-budgets.md)이다.

## SEL16 · AT·브라우저·장치 matrix

- **우선 비교:** macOS/Windows Chromium editor+target별 AT.
- **다른 후보:** 추가 browser/실기기 OS 범위.
- **판정할 증거:** 실제 keyboard/IME·VoiceOver/NVDA/TalkBack·읽기·focus.
- **결정 시점·책임:** 각 profile 검증 전 · 품질 책임자.
- **실패 시 처리:** 정확한 검증 범위 공개·필수 미완료는 G5 보류.
- **현재 상태:** 미실증. 책임 문서는 [QAL01](../quality/conformance-and-test-plans.md)이다.

## SEL17 · 호스팅·DB·지역·보관

- **우선 비교:** 정적 editor+필요 최소 서비스.
- **다른 후보:** 자체서버·managed DB/storage.
- **판정할 증거:** 거의 0 예산·백업복원·데이터 지역·삭제·quota.
- **결정 시점·책임:** 호스팅 서비스 공개 전 · 운영/제품 책임자.
- **실패 시 처리:** 로컬 기능 유지·무제한 서비스 제공 안 함.
- **현재 상태:** 미실증. 책임 문서는 [OPS02](../operations/hosting-observability-and-support.md)이다.

## SEL18 · 테스트 runner 조합

- **우선 비교:** Web Playwright/axe·언어 type/build·native 도구.
- **다른 후보:** 프로필별 unit/model/snapshot 도구.
- **판정할 증거:** 고정 oracle·빈 test 탐지·실제 AT·독립권한.
- **결정 시점·책임:** I1 test bootstrap·I5 native 전 · 품질 책임자.
- **실패 시 처리:** 시험 수·수동 요구 보존, 실패를 skip으로 대체 금지.
- **현재 상태:** 미실증. 책임 문서는 [QAL01](../quality/conformance-and-test-plans.md)이다.

## SEL19 · 출시 attestation·SBOM 형식

- **우선 비교:** artifact hash manifest와 provenance.
- **다른 후보:** SPDX/CycloneDX·서명 체계 비교.
- **판정할 증거:** dependency 추적·비용·offline 검증·소비자 사용성.
- **결정 시점·책임:** 첫 package 공개 전 · 운영 책임자.
- **실패 시 처리:** 출처/notice 최소 의무 유지.
- **현재 상태:** 미실증. 책임 문서는 [OPS03](../operations/release-and-supply-chain.md)이다.

## SEL20 · 실행 격리 기술

- **우선 비교:** 별도 root·origin·OS 권한 제한과 검증된 sandbox.
- **다른 후보:** container/VM/플랫폼 sandbox.
- **판정할 증거:** malicious build·network·filesystem·secret·자원격리.
- **결정 시점·책임:** 미검증 candidate 실제 실행 전 · 보안/시스템 책임자.
- **실패 시 처리:** 격리 불충분 실행 제한, 안전 경로 제공.
- **현재 상태:** 미실증. 책임 문서는 [ARC06](../architecture/browser-host-and-execution.md)이다.

## SEL21 · 전문가 Web 조건식

- **우선 비교:** typed 환경 축 우선·Web-only 조건 선언.
- **다른 후보:** 허용 CSS condition 파서.
- **판정할 증거:** 보존·표현식 안전·native한계·UX.
- **결정 시점·책임:** 조건 editor 안정화 전 · 문법/UX 책임자.
- **실패 시 처리:** 지원 제한 노출; 임의 JS 금지.
- **현재 상태:** 미실증. 책임 문서는 [CMP10](../components/appearance-conditions-and-precedence.md)이다.

## SEL22 · 고급 모션·패널 범위

- **우선 비교:** 초기 keyframe 필수·전문 기능 비교.
- **다른 후보:** 다중 track·복잡 timeline·panel 구성.
- **판정할 증거:** 디자이너 작업 개선·학습·개발/유지 비용.
- **결정 시점·책임:** I3 편집 UX 검증 후 · UX/제품 책임자.
- **실패 시 처리:** enter/exit·tween/spring·delay/stagger·keyframe 유지.
- **현재 상태:** 미실증. 책임 문서는 [UX06](../experience/component-editing-panels.md)이다.

## SEL23 · 자산 권리·포함 방식

- **우선 비교:** 필요 closure 실제 복사·고지.
- **다른 후보:** 전체 Brand Library 선택 복사.
- **판정할 증거:** font embedding·native 재배포·권리·hash·offline.
- **결정 시점·책임:** 각 자산 pack 배포 전 · 브랜드/사업 책임자.
- **실패 시 처리:** 권리 불명 자산 보류·대체.
- **현재 상태:** 미실증. 책임 문서는 [BRD02](../brand/assets-and-provenance.md)이다.

## 선택 결과 양식

SEL04는 [공통 문서 envelope의 첫 실증](../../implementation/schema-selection-evidence.md)을 확보했다. ADR-0010의 Ajv 8.20.0 사전 생성 검사에 한정하며, [ADR-0011 구조 검사 실증](../../implementation/structural-domain-evidence.md)은 카탈로그의 알려진 구조와 일부 로컬 참조까지 확장한다. 미정 타입·전체 도메인 의미·공개 타입 생성·실제 브라우저 측정은 남아 있다. 전체 선택 완료로 표시하지 않는다.

각 결과는 후보 version·license·설치 조건, 동일 입력 corpus·장비, 구현 추가량·회피 코드, 성능·정확성·접근성·복구 결과, 비용, 잔여 제한, 선택 이유·기각 이유, 승인자, source/evidence hashes를 포함한다. 실패한 후보의 측정값을 삭제하지 않는다.

재검토 trigger는 필수 workload 실패, 공급자/라이선스 변경, 유지 중단, 보안·운영 비용 초과, 새로운 필수 플랫폼 요구다. 단순 유행이나 패키지 별점으로 전체 core를 교체하지 않는다. 비교·실증은 전체 문서 확인 후 구현 단계에서 실행한다.
