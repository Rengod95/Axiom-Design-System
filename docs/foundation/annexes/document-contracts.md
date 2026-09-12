# ADS 문서·관계·필드 계약 부록

상태: Foundation 전체 문서 검토안. 아래 자료는 사람이 구현을 검토하기 위한 문서와 예시이며 배포 가능한 JSON Schema·validator 구현이 아니다.

## 공통 표기와 참조

느낌표는 필수, 물음표는 선택 필드다. list가 필수여도 비어 있을 수 있고 nonempty가 있는 경우만 최소 한 개다. Ref의 id는 저장 위치나 표시 이름이 아니며 expectedKind와 실제 대상 종류가 일치해야 한다. library 참조는 version, 프로젝트 snapshot 참조는 revision을 고정한다.

StableId는 프로젝트 범위에서 불변인 문자열이다. 공유 registry는 namespace/id/version으로 식별한다. Digest는 algorithm·formatVersion·value를 포함하는 값이다. Revision은 mutation 결과 identity이며 public semantic version과 다르다. 원본 파일은 bytes hash로 보존하고 정규 의미 digest의 직렬화 규칙은 별도 고정한다.

DocumentEnvelope는 project/foundation/component/design/registry/screen/scenario/connection 등 정본 문서에 적용한다. 예시 묶음은 여러 문서와 외부 registry lock을 함께 담으며 그 묶음 자체를 실제 출시 파일 format이라고 주장하지 않는다. 세부 필드 목록은 [field-catalog.json](field-catalog.json)에 같은 내용으로 기록한다.

## 타입·표현식·효과의 닫힌 경계

TypeExpr는 primitive(boolean/string/finite number), enum, record, list, nullable, tagged union, opaque key, reference, UI domain value의 tagged union이다. record는 필수 필드와 additional-field 정책을 명시한다. 보존용 opaque JSON은 해석하지 않으며 실행 가능 코드가 아니다. 숫자의 NaN/Infinity, 참조할 수 없는 ID, type을 무시한 문자열 coercion은 거부한다.

Expr의 기본 형태는 literal/read/compare/and/or/not/if/arithmetic/string/set-operation이다. read는 선언한 value/state/environment 경로만 허용한다. 비교는 동등 type에만 적용하고 나눗셈 0·overflow·평가 step 초과는 Diagnostic이다. UIEffect는 emit event, request value, commit owned value, focus request, host command, motion request, lifecycle cleanup으로 제한한다. 네트워크·결제·임의 JS·파일 쓰기를 추가하지 않는다.

예를 들어 다음은 disabled UI 값에 따라 semantic opacity를 고르는 읽기 전용 표현식이다.

~~~json
{"op":"if","condition":{"op":"read","scope":"value","id":"value.button.disabled"},"then":{"op":"literal","type":"number","value":0.5},"else":{"op":"literal","type":"number","value":1}}
~~~

이 숫자는 문법 예시다. 실제 시스템의 opacity는 사용자 토큰과 정책으로 정의한다.

## identity와 소유권 불변식

- Part parent, token alias, component definition inclusion은 각 규칙의 구조 cycle을 금지한다. prototype 화면 전환 cycle은 허용하되 자동 실행 loop는 step budget으로 중단한다.
- 같은 state/value의 writer는 하나다. read binding은 여러 개일 수 있다. consumer-controlled value는 request를 emit하고 외부 commit을 기다린다.
- 필수 role/slot/obligation은 디자인마다 유지한다. render node 수는 바뀔 수 있지만 의미 담당 부품을 잃을 수 없다.
- policy 설정은 base invariant를 지울 수 없다. 의무 변경은 독립 유형과 새 검증이다.
- public values/events의 name 변경은 target API mapping·version 영향 검사 대상이다. 화면의 번역 이름은 안정 ID를 바꾸지 않는다.
- 원형 보존한 최신 extension은 unknown capability다. 읽었다는 이유만으로 편집·preview·output 지원을 부여하지 않는다.

## 전체 필드 표

### DocumentEnvelope

책임: [SYN02](../syntax/project-documents-and-identity.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| kind | DocumentKind! |
| schemaVersion | Version! |
| revision | Revision! |
| name | string! |
| metadata | record? |
| extensions | OpaqueExtensionMap? |

### Ref

책임: [SYN02](../syntax/project-documents-and-identity.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| expectedKind | Kind! |
| version | Version? |
| revision | Revision? |

### Project

책임: [SYN02](../syntax/project-documents-and-identity.md).

| 필드 | 타입·필수성 |
|---|---|
| documents | list&lt;Ref&gt;! |
| libraries | list&lt;DependencyLock&gt;! |
| targetProfiles | list&lt;Ref&gt;! |
| brandLibraries | list&lt;Ref&gt;! |
| connections | list&lt;Ref&gt;! |

### Foundation

책임: [SYN03](../syntax/foundation-and-token-semantics.md).

| 필드 | 타입·필수성 |
|---|---|
| tokens | list&lt;Token&gt;! |
| domains | list&lt;Domain&gt;! |
| tiers | list&lt;Tier&gt;! |
| themeAxes | list&lt;ThemeAxis&gt;! |
| themeSets | list&lt;ThemeSet&gt;! |
| policies | list&lt;PolicyRule&gt;! |
| originalSources | list&lt;SourceRecord&gt;! |

### Token

책임: [SYN03](../syntax/foundation-and-token-semantics.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| name | string! |
| typeRef | TypeRef! |
| value | Literal / TokenRef! |
| domain | StableId? |
| tier | StableId? |
| description | string? |
| metadata | record? |
| extensions | OpaqueExtensionMap? |

### ThemeAxis

책임: [SYN03](../syntax/foundation-and-token-semantics.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| contexts | nonempty list&lt;string&gt;! |
| default | string? |
| scope | Ref! |

### ThemeSet

책임: [SYN03](../syntax/foundation-and-token-semantics.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| contexts | map&lt;axisId,context&gt;! |
| resolutionProfile | Ref! |

### ComponentDefinition

책임: [CMP01](../components/definition-and-designs.md).

| 필드 | 타입·필수성 |
|---|---|
| purpose | string! |
| archetypeRef | Ref! |
| traitBindings | list&lt;TraitBinding&gt;! |
| publicContract | PublicContract! |
| parts | list&lt;Part&gt;! |
| slots | list&lt;Slot&gt;! |
| behavior | BehaviorContract! |
| accessibility | AccessibilityContract! |
| motion | list&lt;MotionDefinition&gt;! |
| requirements | list&lt;RequirementRef&gt;! |

### PublicContract

책임: [CMP03](../components/values-events-and-expressions.md).

| 필드 | 타입·필수성 |
|---|---|
| values | list&lt;ValuePort&gt;! |
| events | list&lt;EventPort&gt;! |
| exposedSlots | list&lt;StableId&gt;! |
| replaceableParts | list&lt;StableId&gt;! |
| allowedOverrides | list&lt;OverridePermission&gt;! |
| variants | list&lt;VariantAxis&gt;! |

### ValuePort

책임: [CMP04](../components/state-and-request-lifecycle.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| name | string! |
| type | TypeExpr! |
| ownership | local / consumer / runtime! |
| defaultValue | TypedValue? |
| requestEventRef | StableId? |
| visibility | public / internal! |

### EventPort

책임: [CMP03](../components/values-events-and-expressions.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| name | string! |
| payloadType | TypeExpr! |
| phase | intent / committed / notification! |
| cancellable | boolean! |
| queuePolicy | PolicyBinding? |
| visibility | public / internal! |

### TraitBinding

책임: [CMP02](../components/traits-roles-and-archetypes.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| traitRef | Ref! |
| targetParts | list&lt;StableId&gt;! |
| configuration | record! |
| portBindings | map&lt;portName,StableId&gt;! |
| policyBindings | list&lt;PolicyBinding&gt;! |

### Part

책임: [CMP05](../components/parts-slots-and-instances.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| parent | StableId / null! |
| roleRefs | list&lt;Ref&gt;! |
| required | boolean! |
| cardinality | Cardinality! |
| relationships | list&lt;Relationship&gt;! |

### Slot

책임: [CMP05](../components/parts-slots-and-instances.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| ownerPartRef | StableId! |
| contentKinds | nonempty list&lt;ContentKind&gt;! |
| min | nonnegative integer! |
| max | nonnegative integer / unbounded! |
| defaultContent | list&lt;ContentNode&gt;! |
| allowedContractRefs | list&lt;Ref&gt;! |

### Instance

책임: [CMP05](../components/parts-slots-and-instances.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| componentRef | Ref! |
| designRef | Ref! |
| values | record! |
| slotContents | map&lt;slotId,list<ContentNode&gt;>! |
| overrides | list&lt;Override&gt;! |
| provenance | SourceRecord! |

### BehaviorContract

책임: [CMP06](../components/behavior-and-input-profiles.md).

| 필드 | 타입·필수성 |
|---|---|
| states | list&lt;StateDomain&gt;! |
| transitions | list&lt;Transition&gt;! |
| inputProfileRef | Ref? |
| hostBindings | list&lt;HostBinding&gt;! |

### Transition

책임: [CMP04](../components/state-and-request-lifecycle.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| domain | StableId! |
| from | StateSelector! |
| to | StateValue! |
| trigger | EventRef! |
| guard | Expr? |
| effects | list&lt;UIEffect&gt;! |
| requirements | list&lt;RequirementRef&gt;! |

### Request

책임: [CMP04](../components/state-and-request-lifecycle.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| ownerValueRef | StableId! |
| desired | TypedValue! |
| baseValueRevision | Revision! |
| status | proposed / pending / accepted / rejected / cancelled / superseded! |
| reason | string? |

### AccessibilityContract

책임: [CMP08](../components/accessibility-contracts.md).

| 필드 | 타입·필수성 |
|---|---|
| purpose | string! |
| nameSources | list&lt;Relationship&gt;! |
| descriptionSources | list&lt;Relationship&gt;! |
| stateExposure | list&lt;StateExposure&gt;! |
| readingOrder | list&lt;StableId&gt;! |
| focus | FocusContract! |
| announcements | list&lt;AnnouncementContract&gt;! |
| requirements | list&lt;RequirementRef&gt;! |

### MotionDefinition

책임: [CMP09](../components/motion-and-transitions.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| trigger | EventOrTransitionRef! |
| targetPartRef | StableId! |
| property | TypedVisualProperty! |
| keyframes | list&lt;Keyframe&gt;! |
| timing | Tween / Spring! |
| delay | Duration? |
| stagger | Stagger? |
| interruption | MotionPolicy! |
| reducedAlternative | MotionAlternative! |
| completionEffect | UIEffect? |

### DesignDefinition

책임: [CMP01](../components/definition-and-designs.md).

| 필드 | 타입·필수성 |
|---|---|
| componentRef | Ref! |
| category | Web / Mobile! |
| name | string! |
| nodeMappings | list&lt;PartNodeMapping&gt;! |
| layout | list&lt;LayoutRule&gt;! |
| appearance | list&lt;AppearanceRule&gt;! |
| targetOverrides | list&lt;TargetOverride&gt;! |

### AppearanceRule

책임: [CMP10](../components/appearance-conditions-and-precedence.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| targetPartRef | StableId! |
| variants | record! |
| states | record! |
| environment | Expr? |
| declarations | map&lt;property,TypedValueOrRef&gt;! |
| explicitPriority | integer! |
| refines | list&lt;StableId&gt;! |

### LayoutRule

책임: [UX03](../experience/layout-authoring.md).

| 필드 | 타입·필수성 |
|---|---|
| targetPartRef | StableId! |
| mode | flow / stack / grid / free! |
| axis | horizontal / vertical? |
| size | map&lt;axis,SizePolicy&gt;! |
| gap | DimensionOrRef? |
| padding | Edges? |
| alignment | Alignment? |
| distribution | Distribution? |
| wrap | WrapPolicy? |
| overflow | OverflowPolicy? |
| childOrder | list&lt;StableId&gt;! |

### TraitDefinition

책임: [CMP02](../components/traits-roles-and-archetypes.md).

| 필드 | 타입·필수성 |
|---|---|
| id | NamespacedId! |
| version | Version! |
| purpose | string! |
| configurationType | TypeExpr! |
| requires | list&lt;CapabilityRef&gt;! |
| provides | list&lt;CapabilityRef&gt;! |
| ports | list&lt;Port&gt;! |
| roleRequirements | list&lt;RoleRequirement&gt;! |
| inputClaims | list&lt;InputClaim&gt;! |
| obligations | list&lt;RequirementRef&gt;! |
| incompatibleBindings | list&lt;ConflictRule&gt;! |
| inspectorHints | InspectorHints! |

### RoleDefinition

책임: [CMP02](../components/traits-roles-and-archetypes.md).

| 필드 | 타입·필수성 |
|---|---|
| id | NamespacedId! |
| version | Version! |
| allowedKinds | list&lt;PartKind&gt;! |
| relations | list&lt;RelationshipRequirement&gt;! |
| cardinality | Cardinality! |
| obligations | list&lt;RequirementRef&gt;! |

### PolicyDefinition

책임: [CMP02](../components/traits-roles-and-archetypes.md).

| 필드 | 타입·필수성 |
|---|---|
| id | NamespacedId! |
| version | Version! |
| appliesTo | list&lt;CapabilityRef&gt;! |
| configurationType | TypeExpr! |
| default | TypedValue? |
| invariants | list&lt;RequirementRef&gt;! |
| allowedChoices | list&lt;TypedValue&gt;! |

### HostDefinition

책임: [CMP07](../components/coordinators-and-hosts.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| coordinatorRef | Ref! |
| scope | Ref! |
| configuration | record! |
| acceptedClients | list&lt;CapabilityRef&gt;! |
| lifetime | Lifetime! |
| parentHostRef | StableId? |

### HostBinding

책임: [CMP07](../components/coordinators-and-hosts.md).

| 필드 | 타입·필수성 |
|---|---|
| requiredCapability | CapabilityRef! |
| searchRule | nearest-compatible-explicit / explicit-only / profile-rule! |
| explicitHostRef | StableId? |
| actualResolvedHostRef | StableId? |
| diagnostics | list&lt;Diagnostic&gt;! |

### AssetRecord

책임: [BRD02](../brand/assets-and-provenance.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| contentHash | Digest! |
| mediaType | string! |
| byteSize | nonnegative integer! |
| source | SourceRecord! |
| license | LicenseRecord! |
| variantOf | StableId? |
| storageRef | StorageRef! |
| rightsStatus | verified / unknown / restricted! |

### CommandEnvelope

책임: [ARC03](../architecture/commands-revisions-and-undo.md).

| 필드 | 타입·필수성 |
|---|---|
| commandId | StableId! |
| actorId | StableId! |
| projectId | StableId! |
| baseRevision | Revision! |
| operation | OperationId! |
| payload | TypedPayload! |
| idempotencyKey | string! |
| origin | GUI / internalAI / externalAPI! |
| transactionId | StableId! |
| requestedScopes | list&lt;Scope&gt;! |

### CommandResult

책임: [ARC03](../architecture/commands-revisions-and-undo.md).

| 필드 | 타입·필수성 |
|---|---|
| status | accepted / reviewRequired / conflict / rejected! |
| revision | Revision? |
| diff | list&lt;Change&gt;! |
| diagnostics | list&lt;Diagnostic&gt;! |
| undoHandle | StableId? |
| affectedRefs | list&lt;Ref&gt;! |
| reviewToken | OpaqueToken? |

### Diagnostic

책임: [ARC03](../architecture/commands-revisions-and-undo.md).

| 필드 | 타입·필수성 |
|---|---|
| code | DiagnosticCode! |
| severity | info / warning / error! |
| sourceRef | Ref! |
| relatedRefs | list&lt;Ref&gt;! |
| parameters | record! |
| suggestedActions | list&lt;ActionDescriptor&gt;! |
| targetScope | list&lt;Ref&gt;! |

### ContextBundle

책임: [AI01](../ai/authoring-context-and-providers.md).

| 필드 | 타입·필수성 |
|---|---|
| selectedRefs | list&lt;Ref&gt;! |
| revision | Revision! |
| referencedContracts | list&lt;Ref&gt;! |
| requirements | list&lt;RequirementRef&gt;! |
| allowedOperations | list&lt;OperationId&gt;! |
| capabilities | list&lt;Capability&gt;! |
| budget | ResourceBudget! |

### RealizationJob

책임: [AI02](../ai/realization-and-independent-verification.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| snapshotDigest | Digest! |
| targetProfileRef | Ref! |
| dependencyLockDigest | Digest! |
| testPlanRef | Ref! |
| candidateArea | StorageRef! |
| budget | ResourceBudget! |
| status | queued / running / blocked / failed / ready! |

### TargetProfile

책임: [DLV01](../delivery/target-and-style-profiles.md).

| 필드 | 타입·필수성 |
|---|---|
| id | NamespacedId! |
| version | Version! |
| category | Web / Mobile! |
| toolchain | ToolchainLock! |
| styleStrategy | Ref! |
| behaviorMapping | Ref! |
| typeMapping | list&lt;Mapping&gt;! |
| capabilities | list&lt;Capability&gt;! |
| testEnvironments | list&lt;EnvironmentRef&gt;! |

### Requirement

책임: [QAL01](../quality/conformance-and-test-plans.md).

| 필드 | 타입·필수성 |
|---|---|
| id | NamespacedId! |
| version | Version! |
| ownerRef | Ref! |
| appliesWhen | Expr! |
| setup | TestSetup! |
| stimulus | InputTrace! |
| expected | Observable! |
| severity | required / recommended! |
| oracleRef | Ref! |
| mode | automatic / manual! |
| scope | list&lt;Ref&gt;! |

### EvidenceRecord

책임: [QAL02](../quality/evidence-and-freshness.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| requirementIds | list&lt;Ref&gt;! |
| snapshotDigest | Digest! |
| sourceDigest | Digest! |
| dependencyLockDigest | Digest! |
| profileRef | Ref! |
| environment | EnvironmentLock! |
| runnerIdentity | string! |
| oracleDigest | Digest! |
| result | notRun / running / pass / fail / blocked / waived / stale! |
| artifacts | list&lt;ArtifactRef&gt;! |

### ProjectConnection

책임: [DLV02](../delivery/project-init-and-doctor.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| hostRef | StableId? |
| projectRoot | AuthorizedPath! |
| directories | DirectoryMap! |
| aliases | AliasMap! |
| providers | list&lt;ProviderBinding&gt;! |
| allowedBehaviorBases | list&lt;Ref&gt;! |
| installedRelease | Ref? |
| lastDoctorReceipt | Ref? |

### DeliveryManifest

책임: [DLV03](../delivery/user-owned-library-and-packaging.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| version | Version! |
| snapshotDigest | Digest! |
| profiles | list&lt;Ref&gt;! |
| dependencyLockDigest | Digest! |
| files | list&lt;FileDigest&gt;! |
| assets | list&lt;Ref&gt;! |
| notices | list&lt;LicenseRecord&gt;! |
| evidenceRefs | list&lt;Ref&gt;! |
| limitations | list&lt;Diagnostic&gt;! |

### UpgradePlan

책임: [DLV04](../delivery/diff-upgrades-and-rollback.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| connectionRef | Ref! |
| oldRelease | Ref? |
| newRelease | Ref! |
| baselineHashes | map&lt;path,Digest&gt;! |
| currentHashes | map&lt;path,Digest&gt;! |
| changes | list&lt;FileChange&gt;! |
| conflicts | list&lt;Conflict&gt;! |
| selectedActions | list&lt;ActionDescriptor&gt;! |
| rollbackRefs | list&lt;Ref&gt;! |

## VariantAxis

공개 variant는 안정 ID, 표시/API name, 비어 있지 않은 options, options에 포함된 default를 가진다. Design appearance rule이 참조한 axis와 option은 선언되어야 한다. 공개 prop으로 변환할 이름·기본값은 target API mapping과 함께 검증한다. 값/event port의 visibility가 internal이면 public code API에 노출하지 않는다.

## 검증 단계와 진단 위치

Parser는 bytes→정본 문서/opaque 영역을 만들고 schema 검사는 필드 구조, semantic 검사는 ID·참조·type·owner·의무·조합을 검사한다. Capability resolver는 target별 실행 가능성을, Release judge는 실제 evidence의 충족과 freshness를 검사한다. 위 단계를 하나의 schema validation pass로 합치지 않는다.

필수 오류는 duplicate ID, missing/invalid-kind ref, structural cycle, type mismatch, ambiguous ownership, input claim conflict, missing required role/slot, unresolved host, unknown extension, unsupported mapping, stale evidence다. 관련 문서/Part/토큰의 위치와 수정 행동을 전달한다.

## 예시 자료와 읽기

[검토용 프로젝트 JSON](examples/review-project.json)은 Button·plain Card·Toast의 공통 계약과 Web/Mobile 디자인, shared foundation, host, typed requirement를 연결한다. registry lock은 어휘 부록의 선언을 참조하며 실제 배포 registry나 구현 팩이 아니다. [세 컴포넌트 설명](component-walkthroughs.md)에서 사람의 조작이 어떤 값으로 남는지 읽을 수 있다.

필드·이름·관계를 수정할 때 본문, field catalog, review JSON, command schema 설계와 test requirements를 함께 검토한다. 이 단계의 예시 JSON parsing/참조 검사는 실제 renderer·타깃 코드 적합성 시험이 아니다.
