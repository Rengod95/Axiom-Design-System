# Structural domain and local-reference evidence

Profile: [ADR-0011](../adr/0011-structural-domain-inspection-and-local-references.md), following the merge of PR #26. This is a continuation of I1, not a complete ADS schema or a completed SEL04 selection.

## Executable contract

The [field catalog](../foundation/annexes/field-catalog.json) supplies all 57 record field names, required flags and documented type expressions. [The generator](../../scripts/generate-ads-validator.mjs) projects known JSON structures into [a portable schema](../../modules/ads-core/schema/catalog-structure.json), standalone code and traversal metadata. Generation is deterministic and checked for drift. The existing pinned build-only Ajv compiles it; no runtime schema compiler or new runtime dependency is introduced.

The profile enforces primitives, closed literal choices, list/map containers and fields of known catalog records. An unknown named type is an explicit preservation boundary. Its value remains JSON, its instance location receives an unverified diagnostic, and its name is listed in the report. Unknown extra fields, metadata and extensions are preserved. Missing `TextDocument.blocks`, a non-array `InlineRun.marks`, or an unknown `TextBlock.kind` therefore fails; unknown InlineMark payload semantics do not become a false pass.

Project, foundation, component, design, screen, scenario, connection and text select their catalog body after envelope inspection. A registry document has no complete catalog body and remains explicitly unverified. Nonempty schemaVersion values still do not certify support for those versions. A valid report means the enforced structural subset passed, with unresolved types and domain semantics reported separately.

## Reviewed authoring

`document.import` with `formatProfile: "ads-structural"` uses the existing draft/review/update modes. A malformed source remains capturable. A repaired or new document must pass enforced constraints before review, then pass again at apply. Candidates bind the policy and source data in the digest. Default-format updates inherit an existing structural policy, and repairs inherit a selected structural draft's policy. Unchanged envelope documents may be promoted through review without inventing a new source revision.

The optional persisted validationProfile is checked on project documents, candidates, drafts and Undo/redo records. Old records stay readable. Source export records the selected profile while retaining the initial original and canonical current JSON separately. `validate` is a read-only CLI query and never silently promotes a document.

## Local identity and references

The local graph indexes document identities and the exact nested paths listed in ADR-0011. It reports the owner document, owning source revision, identity kind, JSON Pointer and resolution status. Only declared catalog Ref fields and the selected local string edges are interpreted; opaque data cannot manufacture entities or references.

Covered failures include duplicate identities, absent or wrong-kind targets, stale owner revision pins, cross-owner local links and Part parent cycles. Prototype navigation cycles are allowed. Unknown external registry/library versions and unvalidated legacy nested targets remain unverified. No network fetch or executable extension registration occurs.

## Verification and remaining work

Evidence is split between independent schema fixtures, local graph tests, command-service structural-authoring tests and CLI process/restart tests. They cover legacy envelope compatibility, policy inheritance, reviewed promotion, atomic rejection, apply-time revalidation, authorizing inspection, unknown data preservation and source export provenance. Existing storage crash and concurrency tests remain required. The PR's current CI commit provides the authoritative combined result.

Remaining I1 work includes unresolved named types and their public types, semantic obligations, token aliases, registry/library locks and version resolution, full native project interchange, registered migration pairs/loss reports, Browser storage and history capacity. The [implementation map](implementation-roadmap.json) preserves I2–I6 and the intended React/RN/Swift/Android initial release scope.
