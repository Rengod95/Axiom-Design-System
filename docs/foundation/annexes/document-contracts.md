# ADS 문서·관계·필드 계약 부록

상태: Foundation 전체 문서 검토안. 아래 자료는 사람이 구현을 검토하기 위한 문서와 예시이며 배포 가능한 JSON Schema·validator 구현이 아니다.

## 공통 표기와 참조

느낌표는 필수, 물음표는 선택 필드다. list가 필수여도 비어 있을 수 있고 nonempty가 있는 경우만 최소 한 개다. Ref의 id는 저장 위치나 표시 이름이 아니며 expectedKind와 실제 대상 종류가 일치해야 한다. library 참조는 version, 프로젝트 snapshot 참조는 revision을 고정한다.

StableId는 프로젝트 범위에서 불변인 문자열이다. 공유 registry는 namespace/id/version으로 식별한다. Digest는 algorithm·formatVersion·value를 포함하는 값이다. Revision은 mutation 결과 identity이며 public semantic version과 다르다. 원본 파일은 bytes hash로 보존하고 정규 의미 digest의 직렬화 규칙은 별도 고정한다.

DocumentEnvelope는 project/foundation/component/design/registry/screen/scenario/connection 등 정본 문서에 적용한다. TextDocument는 소유 문서의 ContentNode가 참조하는 안정 ID 개체이며 별도 문서로 저장하면 kind=text인 같은 envelope를 적용한다. 중첩·독립 저장 모두 Ref.expectedKind=text와 안정 ID를 사용하고 소유 문서 revision을 고정한다. 예시 묶음은 여러 문서와 외부 registry lock을 함께 담으며 그 묶음 자체를 실제 출시 파일 format이라고 주장하지 않는다. 세부 필드 목록은 [field-catalog.json](field-catalog.json)에 같은 내용으로 기록한다.

## 타입·표현식·효과의 닫힌 경계

TypeExpr는 primitive(boolean/string/finite number), enum, record, list, nullable, tagged union, opaque key, reference, UI domain value의 tagged union이다. record는 `fields`의 이름→TypeExpr, `required`의 필수 이름 목록, `additionalFields`의 `reject` 또는 `preserve-opaque`를 명시한다. 필수 이름은 fields의 부분집합이며 빈 payload는 required도 빈 목록이다. preserve-opaque로 남긴 추가 값은 실행·표현식 입력이 아니다. 보존용 opaque JSON은 해석하지 않으며 실행 가능 코드가 아니다. 숫자의 NaN/Infinity, 참조할 수 없는 ID, type을 무시한 문자열 coercion은 거부한다.

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
| slotContents | map&lt;slotId,list&lt;ContentNode&gt;&gt;! |
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
| freePosition | FreePosition? |

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
| version | Version! |

### CommandEnvelope

책임: [ARC03](../architecture/commands-revisions-and-undo.md).

| 필드 | 타입·필수성 |
|---|---|
| commandId | StableId! |
| actorId | StableId! |
| projectId | StableId! |
| baseRevision | Revision / null! |
| operation | OperationId! |
| payload | TypedPayload! |
| idempotencyKey | string! |
| origin | GUI / internalAI / externalAPI! |
| transactionId | StableId! |
| requestedScopes | list&lt;Scope&gt;! |
| protocolVersion | Version! |

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
| runtimeDependencies | list&lt;DependencyLock&gt;! |
| valueMapping | list&lt;Mapping&gt;! |
| publicApiMapping | list&lt;PublicApiMapping&gt;! |
| requiredHosts | list&lt;CapabilityRef&gt;! |
| supportMatrix | SupportMatrix! |

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
| subjectRefs | list&lt;Ref&gt;! |
| fixtureDigest | Digest! |
| timestamps | RunTimestamps! |
| observations | list&lt;Observable&gt;! |
| manualObservation | ManualObservation? |

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
| declaredEnvironment | EnvironmentSnapshot! |
| detectedEnvironment | EnvironmentSnapshot? |
| dependencyLockDigest | Digest? |
| targetRelease | Ref? |
| installationState | none / complete / mixed / failed! |
| lastInstallReceipt | Ref? |

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
| subjectRefs | list&lt;Ref&gt;! |
| testPlanRefs | list&lt;Ref&gt;! |
| publicApiMap | list&lt;PublicApiMapping&gt;! |
| consumerInstructions | list&lt;ArtifactRef&gt;! |

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
| generatedBaselineRefs | map&lt;path,ArtifactRef&gt;! |
| newGeneratedRefs | map&lt;path,ArtifactRef&gt;! |
| deferredActions | list&lt;ActionDescriptor&gt;! |
| dependencyChanges | list&lt;Change&gt;! |
| providerChanges | list&lt;Change&gt;! |
| validationPlanRef | Ref! |

### VariantAxis

책임: [CMP10](../components/appearance-conditions-and-precedence.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| name | string! |
| options | nonempty list&lt;string&gt;! |
| default | string! |

### RecordTypeExpr

책임: [CMP03](../components/values-events-and-expressions.md).

| 필드 | 타입·필수성 |
|---|---|
| kind | record! |
| fields | map&lt;fieldName,TypeExpr&gt;! |
| required | list&lt;fieldName&gt;! |
| additionalFields | reject / preserve-opaque! |

### ArchetypeDefinition

책임: [CMP02](../components/traits-roles-and-archetypes.md).

| 필드 | 타입·필수성 |
|---|---|
| id | NamespacedId! |
| version | Version! |
| familyRef | Ref! |
| purpose | string! |
| requiredTraitRefs | list&lt;Ref&gt;! |
| requiredRoleRefs | list&lt;Ref&gt;! |
| requirements | list&lt;RequirementRef&gt;! |

### TextDocument

책임: [UX04](../experience/text-and-asset-editing.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| blocks | list&lt;TextBlock&gt;! |
| localeHints | map&lt;scope,LocaleTag&gt;! |

### TextBlock

책임: [UX04](../experience/text-and-asset-editing.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| kind | paragraph / list-item! |
| inlines | list&lt;InlineRun&gt;! |
| list | ListMetadata? |
| typographyRef | Ref? |

### InlineRun

책임: [UX04](../experience/text-and-asset-editing.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| text | string! |
| marks | list&lt;InlineMark&gt;! |
| link | SafeLink? |
| typographyRef | Ref? |

### SizePolicy

책임: [UX03](../experience/layout-authoring.md).

| 필드 | 타입·필수성 |
|---|---|
| mode | hug / fill / fixed! |
| value | Dimension? |
| min | Dimension? |
| max | Dimension? |

### FreePosition

책임: [UX03](../experience/layout-authoring.md).

| 필드 | 타입·필수성 |
|---|---|
| relativeTo | parent-content-box! |
| x | Dimension! |
| y | Dimension! |
| anchors | map&lt;edge,Dimension&gt;! |

### Screen

책임: [UX07](../experience/preview-and-prototypes.md).

| 필드 | 타입·필수성 |
|---|---|
| instances | list&lt;Instance&gt;! |
| themeSetRef | Ref! |
| brandAssetRefs | list&lt;Ref&gt;! |
| layout | list&lt;InstanceLayoutRule&gt;! |

### Scenario

책임: [UX07](../experience/preview-and-prototypes.md).

| 필드 | 타입·필수성 |
|---|---|
| screenRef | Ref! |
| initialMockValues | map&lt;valueId,TypedValue&gt;! |
| initialMockStates | map&lt;stateId,TypedValue&gt;! |
| eventBindings | list&lt;ScenarioEventBinding&gt;! |
| prototypeLinks | list&lt;PrototypeLink&gt;! |
| inputTrace | InputTrace! |
| expectations | list&lt;Observable&gt;! |
| stepBudget | positive integer! |
| clock | VirtualClockPolicy! |

### ScenarioEventBinding

책임: [UX07](../experience/preview-and-prototypes.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| eventRef | Ref! |
| mockAction | MockAction! |
| response | accept / reject / delay! |
| delay | Duration? |

### PrototypeLink

책임: [UX07](../experience/preview-and-prototypes.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| fromScreenRef | Ref! |
| eventRef | Ref! |
| toScreenRef | Ref! |
| guard | Expr? |

### EnvironmentSnapshot

책임: [DLV02](../delivery/project-init-and-doctor.md).

| 필드 | 타입·필수성 |
|---|---|
| framework | VersionedTool! |
| toolchain | ToolchainLock! |
| packageManager | VersionedTool! |
| dependencyLockDigest | Digest? |
| configurationDigest | Digest! |
| observedAt | Timestamp? |
| diagnostics | list&lt;Diagnostic&gt;! |

### InstalledFileRecord

책임: [DLV04](../delivery/diff-upgrades-and-rollback.md).

| 필드 | 타입·필수성 |
|---|---|
| path | AuthorizedRelativePath! |
| generatedBaselineRef | ArtifactRef? |
| generatedBaselineDigest | Digest? |
| generatedReleaseRef | Ref? |
| newGeneratedRef | ArtifactRef? |
| installedHash | Digest? |
| appliedActions | list&lt;ActionDescriptor&gt;! |
| deferredActions | list&lt;ActionDescriptor&gt;! |
| status | accepted / preserved / partial / deleted / unresolved! |
| provenance | SourceRecord! |

### UpgradeReceipt

책임: [DLV04](../delivery/diff-upgrades-and-rollback.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| planRef | Ref! |
| connectionRef | Ref! |
| targetReleaseRef | Ref! |
| files | list&lt;InstalledFileRecord&gt;! |
| installationState | complete / mixed / failed! |
| validationEvidenceRefs | list&lt;Ref&gt;! |
| rollbackRefs | list&lt;Ref&gt;! |
| createdAt | Timestamp! |
| environmentBeforeRef | ArtifactRef! |
| environmentAfterRef | ArtifactRef! |

### TransactionReceipt

책임: [ARC03](../architecture/commands-revisions-and-undo.md).

| 필드 | 타입·필수성 |
|---|---|
| id | StableId! |
| projectId | StableId! |
| transactionId | StableId! |
| authenticatedPrincipalId | StableId! |
| idempotencyKey | string! |
| requestDigest | Digest! |
| protocolVersion | Version! |
| result | CommandResult! |
| createdAt | Timestamp! |

### StorageCommitRecord

책임: [ARC04](../architecture/storage-offline-and-recovery.md).

| 필드 | 타입·필수성 |
|---|---|
| projectId | StableId! |
| revision | Revision! |
| parentRevision | Revision / null! |
| snapshotDigest | Digest! |
| fileManifestDigest | Digest! |
| transactionReceiptRef | Ref! |
| undoStateRef | StorageRef! |
| redoStateRef | StorageRef! |
| storageFormatVersion | Version! |
| committedAt | Timestamp! |

## 필드의 조건과 해석

공개 variant는 안정 ID, 표시/API name, 비어 있지 않은 options, options에 포함된 default를 가진다. Design appearance rule이 참조한 axis와 option은 선언되어야 한다. 공개 prop으로 변환할 이름·기본값은 target API mapping과 함께 검증한다. 값/event port의 visibility가 internal이면 public code API에 노출하지 않는다.

**분류와 시작 계약:** ArchetypeDefinition은 family 분류와 구별한 ID/version으로 필수 trait·role·requirement를 고정한 시작 계약이다. familyRef가 가리키는 registry의 `families` 항목은 분류이며 그 안의 kind(component/presentation 등)는 카탈로그 성격이다. 그것을 expectedKind=archetype으로 해석하지 않는다. 검토 JSON의 세 archetype은 명시적 예제 계약이고, 실제 stable registry/target specialization의 완료 주장은 아니다.

**텍스트와 크기:** TextDocument의 block/run ID는 이동·서식 편집에도 유지한다. paragraph와 list-item이 기본 block이며 list-item의 ListMetadata에는 목록 ID, ordered 여부, 양의 시작 번호와 중첩 수준을 기록한다. InlineMark는 선언한 기본 서식 enum이고 SafeLink는 허용 scheme의 href와 선택 target이다. run의 명시적 줄바꿈은 보존한다. 입력 중 cursor/selection/IME composition은 세션 상태이며 저장한 콘텐츠 revision과 혼동하지 않는다. SizePolicy의 fixed에는 value가 필수이고 hug/fill에는 fixed value를 넣지 않는다. min/max는 같은 의미의 단위로 비교 가능해야 하고 min≤max여야 한다. FreePosition은 부모 content box 기준 x/y와 선택 anchor를 쓰며 서로 만족할 수 없는 고정 위치·양끝 anchor·크기 조합은 constraint 오류다. freePosition은 free 배치 범위에만 적용한다.

**화면과 시험 조건:** Screen의 인스턴스는 component/design revision과 theme/asset의 고정 참조를 사용한다. Screen layout의 InstanceLayoutRule은 LayoutRule과 같은 배치 필드이되 targetPartRef 대신 targetInstanceRef를 쓰고 childOrder도 인스턴스 ID를 참조한다. 컴포넌트 Part ID와 화면 instance ID를 혼용하지 않는다. Scenario는 별도 envelope와 revision을 가지며 screenRef를 고정한다. initialMockValues/states는 존재하는 값/상태와 타입을 검사하고 prototype 실행에서만 적용한다. MockAction은 외부 UI 값 응답 모의·상태 토글·event 연결의 tagged union이며 임의 JS·외부 API·업무 실행을 포함하지 않는다. delay 응답에는 유한한 delay가 필수다. VirtualClockPolicy는 시작 시각과 수동/자동 진행·재현 seed를 고정하며 prototype link의 screen cycle도 전체 stepBudget을 공유한다. callback·재입력·화면 이동이 예산을 초기화해서는 안 된다. inputTrace와 expectations는 관찰할 값·event·focus를 선언하며 실행 결과는 별도 evidence다.

**타깃과 설치:** TargetProfile.supportMatrix는 읽기/보존/해석/편집/preview/output/runtime/verified 축과 각 capability의 상태·제한을 기록한다. capabilities에는 layout/motion/a11y를 포함한 구체 범위를 적으며 valueMapping은 단위·색 공간·폰트 대응과 손실 진단을 포함한다. PublicApiMapping은 source의 public value/event/variant ID, target profileRef, 타깃 API path와 타입 대응을 연결한다. EnvironmentSnapshot은 선언한 framework/toolchain/package manager와 실제 관측을 구별하며 VersionedTool은 tool ID와 version을 가진다. 미관측 환경을 빈 값으로 정상 설치 판정하지 않는다. connection의 installedRelease는 마지막 전체 검증 설치를 뜻하고 targetRelease와 mixed 상태는 부분 적용을 표시한다.

**전달과 증거:** DeliveryManifest.subjectRefs와 EvidenceRecord.subjectRefs는 contract/design/standard/registry/profile의 version 또는 revision을 고정한다. snapshotDigest가 가리키는 closure에도 이 목록과 실제 내용이 포함되어야 한다. testPlanRefs·publicApiMap·consumerInstructions는 실제 배포 profile의 요구를 충족해야 하며 빈 목록으로 완료를 주장하지 않는다. instructions는 배포물에 포함된 설치·의존성·provider·자산 연결 안내의 ArtifactRef다. RunTimestamps는 createdAt, 선택 startedAt/completedAt이고 running에는 startedAt, terminal 결과에는 completedAt이 필요하다. ManualObservation은 performer identity, procedureRef/version, 실제 observations와 observedAt을 가진다. 수동 요구 결과에 이 기록이 없으면 pass로 판정하지 않는다. fixtureDigest·oracleDigest·observations는 후보가 바꿀 수 없는 runner 결과에 연결한다.

**업그레이드 출처:** generatedBaselineRefs와 newGeneratedRefs는 각각 이전과 새 generator의 불변 원본 bytes를 가리킨다. baselineHashes는 그 원본의 digest이고 currentHashes/InstalledFileRecord.installedHash는 사용자 수정·병합을 포함한 실제 설치 bytes다. 전체 파일의 새 출력 변경을 수락하면 baseline은 정확한 새 generator bytes로 전진할 수 있지만 실제 병합 bytes와는 계속 분리한다. 부분 hunk만 수락하면 해당 파일의 이전 generated baseline을 유지하고 새 출력 ref·적용/보류 action·partial 상태를 기록한다. 다음 비교에서 그 보류를 잃지 않고 필요하면 다시 충돌 검토한다. baseline이 없거나 파일이 삭제된 경우의 optional ref/hash는 명시적 status·diagnostics로 설명한다. mixed connection에는 새 release 전체 설치 증거를 붙이지 않는다. UpgradeReceipt.environmentBeforeRef/environmentAfterRef는 적용 전후 dependency lock·provider configuration snapshot을 고정하고 files는 파일 상태를 기록한다. rollbackRefs는 복원 가능한 이전 파일·환경 snapshot을 가리키며 별도 외부 효과의 결과와 원복 가능성도 추적한다.

**자산 권리:** AssetRecord.id/version은 출처·취득·권리 기록을 식별하고 contentHash는 bytes blob만 식별한다. 같은 blob을 여러 AssetRecord가 가리킬 수 있다. 사용처와 출력은 선택한 record를 고정하며 중복 bytes를 합쳐 source/license 권한까지 합치지 않는다. Web 전용 font record의 native 사용을 다른 취득 기록의 권리로 자동 허용하지 않는다.

**명령과 durable commit:** CommandEnvelope.baseRevision의 null은 새로운 예약 projectId의 project.create에서만 허용한다. protocolVersion은 decode와 request digest의 일부다. TransactionReceipt는 인증된 principal·project·idempotencyKey 범위에서 그 digest와 원 결과를 보존한다. 구현자가 actorId 문자열만으로 다른 principal의 receipt를 조회할 수 없다. 문서 mutation의 accepted 결과와 undo/redo 상태는 StorageCommitRecord의 동일 원자 commit에 속한다. parentRevision=null은 최초 commit뿐이고 snapshot/fileManifest/receipt/undo/redo 참조의 digest와 parent chain이 유효해야 활성 revision으로 선택한다. 계획/외부 작업 receipt는 문서 commit record를 대신하지 않는다. adapter의 물리 내구성·복구·receipt 보존 정책은 별도 실행 증거로 확인한다.

## 검증 단계와 진단 위치

Parser는 bytes→정본 문서/opaque 영역을 만들고 schema 검사는 필드 구조, semantic 검사는 ID·참조·type·owner·의무·조합을 검사한다. Capability resolver는 target별 실행 가능성을, Release judge는 실제 evidence의 충족과 freshness를 검사한다. 위 단계를 하나의 schema validation pass로 합치지 않는다.

필수 오류는 duplicate ID, missing/invalid-kind ref, structural cycle, type mismatch, ambiguous ownership, input claim conflict, missing required role/slot, unresolved host, unknown extension, unsupported mapping, stale evidence다. 관련 문서/Part/토큰의 위치와 수정 행동을 전달한다.

## 예시 자료와 읽기

[검토용 프로젝트 JSON](examples/review-project.json)은 Button·plain Card·Toast의 공통 계약과 Web/Mobile 디자인, shared foundation, host, typed requirement를 연결한다. registry lock은 어휘 부록의 선언을 참조하며 실제 배포 registry나 구현 팩이 아니다. [세 컴포넌트 설명](component-walkthroughs.md)에서 사람의 조작이 어떤 값으로 남는지 읽을 수 있다.

필드·이름·관계를 수정할 때 본문, field catalog, review JSON, command schema 설계와 test requirements를 함께 검토한다. 이 단계의 예시 JSON parsing/참조 검사는 실제 renderer·타깃 코드 적합성 시험이 아니다.
