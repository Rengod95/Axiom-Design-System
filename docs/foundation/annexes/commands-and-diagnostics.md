# 공식 명령·API·MCP·진단 부록

이 목록은 제품의 공개 작성 표면 설계이며 지금 호출 가능한 Axiom 서버가 있다는 뜻은 아니다. transport별 endpoint·MCP tool name은 구현 profile에서 고정하고 동일 command service로 연결한다. 입력 type은 [필드 계약](document-contracts.md)과 operation payload의 도메인 타입을 따른다.

## 공통 호출·응답

Mutation은 CommandEnvelope를 사용하고 authenticated principal에서 권한을 결정한다. baseRevision과 patch digest를 고정한 검토 토큰은 다른 입력에 재사용할 수 없다. 모든 command는 idempotency와 transaction 정책을 가지며 같은 key·같은 입력은 같은 receipt를 돌려준다.

Query도 일관된 snapshot을 지정하고 pagination·context size를 제한한다. 응답의 다음 페이지·참조를 가져오는 동안 revision이 바뀌면 고정 snapshot 또는 갱신 안내를 사용한다. 데이터가 partial이면 incomplete 이유를 준다.

문서 원자성은 외부 install/publish의 원복과 다르다. 외부 효과가 있는 job은 별도 계획·권한·effect receipt·보상 작업을 가진다. API를 직접 호출해 GUI의 중요 변경 판정을 우회하지 않는다.

## Query 목록

| operation | 입력 | 결과 | scope |
|---|---|---|---|
| project.describe | projectId | manifest,revision,capabilities | project.read |
| document.get | documentRef,revision | document,opaqueRegions,diagnostics | project.read |
| registry.describe | entryRef,version | type,ports,obligations,capabilities | registry.read |
| context.resolve | selectedRefs,revision,targetProfile,limits | ContextBundle,closure,incompleteReasons | project.read |
| diagnostics.list | refs,revision,targetProfile,cursor | diagnostics,nextCursor | project.read |
| impact.preview | baseRevision,typedOperations | affectedRefs,reviewClass,invalidatedEvidence | project.read |
| target.capabilities | targetProfileRef,contractRef | declared,implemented,verified,limitations | profile.read |
| job.status | jobId | stage,receipts,diagnostics,resourceUse | job.read |
| history.list | projectId,cursor | revisions,origins,transactions | project.read |
| connection.describe | connectionId | authorizedRoots,tools,doctorState | connection.read |

## Command 목록

| operation | payload | 결과 | scope · review class |
|---|---|---|---|
| project.create | name,storageChoice,templateRef | projectId,revision | project.write · new-project |
| document.import | sourceRefs,formatProfile,importMode | draftRefs,originalHashes,diagnostics | project.write · dependency-impact |
| document.copy | refs,destination,identityMode,foundationLink | copyPlan,refMap | project.write · shared-impact |
| document.migrate | sourceRefs,migrationProfile | migrationCandidate,lossReport | project.write · meaning-change |
| entity.delete | refs,replacementPlan,draftPolicy | impact,changes | project.write · deletion |
| entity.deprecate | refs,replacementRef,reason | changes | project.write · shared-impact |
| token.create | foundationRef,tokenDefinition | tokenRef | foundation.write · shared-token |
| token.update | tokenRef,typedChanges | changes,usageImpact | foundation.write · shared-token |
| token.rebind | tokenRef,newTargetRef | changes,aliasClosure | foundation.write · shared-token |
| theme.update | foundationRef,axesOrSets | resolvedImpact | foundation.write · shared-token |
| policy.update | scopeRef,ruleOrException | effectiveRules,impact | contract.write · obligation-change |
| component.define | definition,designs | componentRef,diagnostics | component.write · contract-change |
| component.contract.update | componentRef,values,events,exposure | apiDiff,impact | contract.write · public-api |
| trait.bind | componentRef,traitRef,configuration,portBindings | binding,obligations,conflicts | contract.write · behavior-change |
| part.create | componentRef,parent,roleRefs | partRef | component.write · meaning-impact |
| part.move | partRef,parent,position | structureDiff | component.write · meaning-impact |
| part.update | partRef,relationships,configuration | changes | component.write · meaning-impact |
| slot.update | slotRef,contentKinds,cardinality,exposure | slotDiff,instanceImpact | contract.write · public-api |
| instance.create | componentRef,designRef,parent,values,contents | instanceRef | component.write · local |
| instance.override | instanceRef,allowedProperties | overrideDiff | component.write · local-or-shared |
| instance.contents.update | instanceRef,slotId,contentNodes | contentDiff,slotDiagnostics | component.write · local-or-shared |
| text.create | documentId,blocks,typographyRefs | textRef,diagnostics | component.write · meaning-impact |
| text.update | textRef,edits,typographyRefs | textDiff,diagnostics | component.write · local-or-shared |
| screen.create | documentId,name,instances,themeSetRef,brandAssetRefs,layout | screenRef,diagnostics | scenario.write · new-screen |
| screen.update | screenRef,typedChanges | screenDiff,diagnostics | scenario.write · local-or-shared |
| appearance.update | designRef,partRef,rules | computedValues,provenance | design.write · local-or-shared |
| layout.update | designRef,partRef,rules | layoutDiff,diagnostics | design.write · local-or-shared |
| motion.update | componentRef,definitions | motionDiff,invalidations | contract.write · behavior-change |
| behavior.update | componentRef,states,transitions,profile | obligationDiff,conflicts | contract.write · behavior-change |
| accessibility.update | componentRef,relationships,requirements | a11yDiff,diagnostics | contract.write · obligation-change |
| registry.register | scope,entry | entryRef,unsupportedCapabilities | registry.write · extension |
| registry.promote | entryRef,destinationScope,version | newRef,migrationPlan | registry.write · shared-impact |
| host.bind | clientRef,hostRef,searchRule | resolvedPath,diagnostics | component.write · behavior-change |
| asset.import | sourceRef,rights,storageScope | assetRef,integrity,limitations | asset.write · external-data |
| asset.reconnect | assetRef,candidateSource | identityOrReplacementDiff | asset.write · shared-impact |
| scenario.update | screenRef,scenario,prototypeLinks | scenarioDiff,loopDiagnostics | scenario.write · local-or-shared |
| transaction.review | candidateId,patchDigest,decision | boundApprovalOrRejection | review.apply · review |
| transaction.apply | candidateId,approvalToken,expectedRevision | CommandResult | project.write · checked-at-commit |
| transaction.undo | undoHandle,expectedRevision | inverseCandidate,conflicts | project.write · current-impact |
| transaction.redo | redoHandle,expectedRevision | redoCandidate,conflicts | project.write · current-impact |
| project.revert | targetRevision,expectedRevision | sharedRevertCandidate | project.write · shared-impact |
| generation.plan | snapshotRef,targetProfile,budget | RealizationJobPlan,expectedCost | generation.plan · job-plan |
| generation.start | planId,planDigest,approval | jobId | generation.execute · execution |
| job.cancel | jobId | cancelRequested,knownEffects | job.cancel · execution |
| doctor.plan | connectionRef,deliveryRef | diagnosticAndInstallPlan | connection.read · read-only-plan |
| doctor.apply | planRef,selectedActions,approval | installationReceipt,diagnostics | connection.execute · filesystem-dependency |
| delivery.plan | releaseRefs,deliveryMode,destination | manifestCandidate,filePlan | delivery.plan · read-only-plan |
| delivery.export | planRef,approval | artifactRefs,hashes,limitations | delivery.write · artifact-write |
| delivery.publish | planRef,version,destination,approval | publicationReceipt | delivery.publish · external-publication |
| upgrade.plan | connectionRef,newReleaseRef | threeWayDiff,conflicts,rollbackPlan | connection.read · read-only-plan |
| upgrade.apply | planRef,selectedActions,approval | consumerReceipt | connection.execute · filesystem-dependency |
| upgrade.rollback | receiptRef,expectedFileHashes,approval | rollbackReceipt,conflicts | connection.execute · filesystem-dependency |

## 불허하는 표면

`text.create/update`는 TextDocument의 안정 block/run ID와 typed range 편집을 사용한다. `text.create`와 `screen.create`의 documentId는 새 문서 envelope의 id이며 포함 문서 참조가 아니다. IME composition은 transient로 유지하고 확정된 한 의도를 한 transaction으로 저장한다. `screen.create/update`는 독립 Screen 문서를 만들고 수정한다. Screen 생성 payload는 필드 계약의 inline instances, themeSetRef, brandAssetRefs, layout과 동일하다. `scenario.update`는 screenRef에 연결된 안정 ID의 Scenario를 생성 또는 변경하며 mock binding·prototype link·step budget을 typed payload로 검증한다. 생성 시 ID 충돌은 덮어쓰지 않는다. `instance.contents.update`는 Slot 계약의 허용 content kind·개수·참조를 검사하며 appearance override에 콘텐츠를 숨겨 넣지 않는다.

공개 operation 목록의 문서 mutation은 ARC03의 원자 snapshot/receipt 계약을 사용한다. generation/doctor/delivery/upgrade/job operation의 plan·외부 효과는 별도 receipt이며 문서 mutation인 것처럼 ADS revision·Undo를 발급하지 않는다. 같은 요청의 receipt 재생은 새 과금·설치·publish를 시작하지 않는다.

core.api.update, validator.replace, entitlement.override, oracle.markPassed 같은 자기 권한·정답 변경 기능을 사용자 작성 API로 제공하지 않는다. 사용자 registry entry는 타입·의무·설명 데이터로 등록하고 자유 실행 코드를 도메인 validation에 주입하지 않는다.

Reviewer 권한은 어떤 revision의 어떤 patch를 승인하는지로 제한한다. “관리자” 문자열을 payload에 넣거나 Computer use로 화면을 조작하는 것이 인증을 대신하지 않는다.

## 진단 code와 복구

진단은 code·severity·sourceRef·relatedRefs·parameters·suggestedActions·targetScope를 가진다. 같은 code의 한국어·영어 메시지는 번역 카탈로그에서 렌더한다. 오류를 pass로 바꾸는 액션은 제공하지 않는다.

| code | 의미 | 복구 |
|---|---|---|
| AUTH_SCOPE | 권한 범위 부족 | 연결·역할의 허용 범위를 확인 |
| ENTITLEMENT_LIMIT | 서비스 사용권/자원 한도 | 허용한 자원·로컬 대안 확인 |
| REVISION_STALE | 기준 revision이 바뀜 | 현재/제안 diff 재계획 |
| IDEMPOTENCY_CONFLICT | 같은 key에 다른 입력 | 새 의도로 새 key 생성 |
| REVIEW_REQUIRED | 중요 변경 검토 필요 | 영향·patch 검토 |
| APPROVAL_STALE | 승인한 patch/base와 다름 | 새 변경안 확인 |
| REF_MISSING | 참조 대상 없음 | 대체·재연결·미해결 초안 |
| REF_KIND | 참조 종류 불일치 | 올바른 대상 선택 |
| ID_DUPLICATE | 불변 ID 중복 | 독립 복사·ID mapping |
| STRUCTURE_CYCLE | 금지된 구조 순환 | 관계 경로 수정 |
| TYPE_MISMATCH | 값·port 타입 불일치 | type 또는 binding 수정 |
| OWNER_CONFLICT | 값 확정 주체 중복 | owner 하나 선택 |
| INPUT_CLAIM_CONFLICT | 동일 입력 의무 충돌 | scope/profile/유형 조합 수정 |
| REQUIRED_ROLE_MISSING | 필수 부품 의미 누락 | 역할·관계 복구 |
| SLOT_CONTRACT | 콘텐츠 종류·개수 불일치 | slot 내용/계약 비교 |
| RULE_AMBIGUOUS | 외형 규칙 동점 충돌 | 명시 priority/refinement |
| HOST_UNRESOLVED | 호스트 누락·모호함 | 실제 경로 확인·지정·생성 |
| STANDARD_UNSUPPORTED | 표준 의미 미지원 | 원형 보존·지원 제한 확인 |
| TARGET_UNSUPPORTED | 선택 타깃 mapping 없음 | 대안/별도 구현/부분 출력 |
| ASSET_MISSING | 파일·폰트 누락 | 대체 preview·재연결 |
| RIGHTS_UNVERIFIED | 자산/코드 권리 미확인 | 해당 배포 보류·대체 |
| STORAGE_FULL | 저장 용량 부족 | export·위치 변경·공간 확보 |
| FILE_DRIFT | 외부 파일 변경 | 현재/제안/기준 비교 |
| BUDGET_EXCEEDED | 실행 예산 초과 | 중단·후보 보존·재계획 |
| EVIDENCE_STALE | 현재 후보의 증거 아님 | 해당 profile 재검증 |
| TEST_DISCOVERY_EMPTY | 기대 시험 누락 | oracle/발견 범위 복구 |
| SANDBOX_UNAVAILABLE | 필요 격리 보장 없음 | 해당 실행 제한·안전 경로 |
| HOST_DISCONNECTED | 연결 끊김 | job 재조회·재연결 |
| JOB_PARTIAL_EFFECT | 일부 외부 효과 발생 | receipt 확인·보상/복구 |
| EXPRESSION_LIMIT | 표현식 타입/평가 한도 | 식 단순화·오류 수정 |

## 예시 흐름

Agent가 context.resolve로 선택 Card와 참조 token을 r10에 고정해 읽는다. appearance.update가 local Part의 허용 속성만 바꾸면 검증 후 적용 가능하다. token.update로 공유 token을 바꾸면 reviewRequired와 영향 목록을 반환한다. 검토 중 사람이 r11을 만들면 승인 당시 read/write·의미 의존을 다시 확인하고 충돌을 비교한다.

응답 유실 후 같은 idempotencyKey로 재시도하면 commit receipt를 다시 받는다. 적용과 동시에 생성·설치를 자동 이어서 실행하지 않고 별도 plan과 허용 범위를 확인한다. 전체 소스·API key를 context에 붙일 필요는 없다.

[기계 판독 목록](command-catalog.json)과 본문 ARC03·ARC07을 함께 변경한다. 실제 validation code와 protocol compatibility tests는 전체 문서 확인 후 구현한다.
