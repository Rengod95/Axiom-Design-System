# OPS01 · 보안·데이터·비밀정보 관리

상태: 전체 문서 기준선 검토안 · 목표 Foundation 1.0.0 · 2026-09-12

책임 역할: 개발/운영 담당. 이 문서의 설계는 아직 제품 구현·실행 검증 완료를 뜻하지 않는다.

## 보호할 경계와 데이터

Axiom이 다루는 것은 사용자 DS 문서·브랜드 자산·소스·API 키·호스트 프로젝트·생성 후보·검증 결과다. 핵심 실패는 무단 파일 변경, 비밀 유출, 악성 후보 실행, 잘못된 준수 표시, 다른 workspace 데이터 접근이다. 일반 디자인 파일을 열었다는 이유로 실행 권한을 부여하지 않는다.

| 경계 | 기본 통제 |
|---|---|
| 브라우저↔Host | origin·pairing·session·허용 root·job kind |
| Studio↔preview | 격리 origin·schema message·revision pin |
| 사용자 문서↔core | typed parse·참조/권한·실행 금지 metadata |
| AI↔실현·검증 | candidate 쓰기만, oracle/receipt 별도 |
| 사용자↔workspace | authenticated principal·scope·객체별 검사 |
| 자산↔렌더러 | SVG/HTML·URL·크기·압축 해제 제한 |

## secret과 사용자 데이터

API key·oauth credential은 project JSON·export·로그·AI context·generated source에 넣지 않는다. secret reference와 실제 보관소를 분리하고 교체·회수·접속 실패를 처리한다. 사용자의 연결 선택으로 필요한 AI 요청을 수행하되, 원치 않는 전체 프로젝트 전송을 막도록 context를 필요한 범위로 구성한다.

사용자 콘텐츠·source·브랜드 자산을 analytics에 기본 업로드하지 않는다. 로컬 진단과 사용자가 선택한 비식별 report를 제공한다. Hosted 서비스는 최소 필요한 계정·entitlement·metering·artifact metadata를 보관하고 보존·삭제 정책을 출시 전에 공개한다.

## 실행과 공급망

설치 명령은 tool allowlist와 argument array, root 경로 검사, symlink·path traversal 방어를 사용한다. 미검증 코드 실행은 network/filesystem/secret 접근을 제한한 격리 환경을 요구한다. origin만 나누거나 subprocess를 쓰는 것만으로 OS sandbox가 완성됐다고 주장하지 않는다.

Dependency와 template은 version·integrity·license·source provenance를 고정한다. AI가 제안한 새 dependency는 중요 검토 대상이다. 테스트 성공 receipt를 후보 파일이 직접 써넣지 못하게 한다.

## 사고 대응과 시험

권한 우회·키 노출·악성 preview·교차 프로젝트 접근은 실행/연결 중단, credential 회수, 영향 version·artifact 추적, 사용자에게 필요한 조치 안내, 수정·회귀검사 순으로 처리한다. 보관된 사용자 문서를 무작정 삭제해 증거를 잃지 않는다.

필수 시험은 prompt injection in metadata, forged actor·origin, cross-project ref, path escape·symlink, malicious SVG, candidate oracle overwrite, secret log leak, resource exhaustion, revoked scope 재시도다. 취약점 접수·보안 고지 채널과 응답 책임은 공개 전에 정한다.

## 결정 추적과 변경 영향

사용자 목적과 확정된 방향을 세부 설계로 연결하는 문서다. 새로운 범위 변경은 GOV01 절차로 승인한다.

전제 문서: [ARC06 · 브라우저·로컬 Host·실행 경계](../architecture/browser-host-and-execution.md) · [ARC07 · 공식 API·MCP·확장·사용권 경계](../architecture/public-api-mcp-and-entitlements.md) · [AI02 · AI 코드 실현·후보·독립 판정](../ai/realization-and-independent-verification.md) · [BIZ01 · 오픈 코어·소스·산출물 권리](../business/open-core-and-rights.md).

변경 시 함께 검토: [OPS02 · 호스팅·운영·진단·장애·지원](hosting-observability-and-support.md).

[전체 인덱스](../document-index.md) · [문서 기준선 검토](../baseline-review.md)
