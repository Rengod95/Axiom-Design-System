# ADR-0011 — Structural domain inspection and local references

Status: ACCEPTED for the next bounded I1 implementation

Date: 2026-09-13. Owner: product owner; executor: Codex. The owner requested merging PR #26 and continuing the remaining implementation. PR #26 merged as `891eab59002f6cf9dfa4ad1e14687e90d1250db4` after its Windows/Ubuntu Quality Gate passed. This extends ADR-0009 and ADR-0010 within the same source roots.

## Authority and scope

[SYN02](../foundation/syntax/project-documents-and-identity.md), the [document contracts](../foundation/annexes/document-contracts.md) and [field catalog](../foundation/annexes/field-catalog.json) distinguish field structure from identity/reference semantics and opaque data. This increment makes their known structures inspectable and adds selected local identity/reference checks. It does not invent the missing RegistryEntry, DependencyLock, token standard, complete TypeExpr or output contracts.

## Structural profile

The explicit `foundation-structural` profile projects all 57 catalog records into reproducible JSON Schema 2020-12 definitions and generated standalone validators using the existing pinned Ajv compiler. It enforces known required fields, JSON primitives, literal enums, list/map containers and references to defined records. Unknown named types remain opaque JSON, with their type name and instance path reported as unverified. Unknown additional fields, metadata and extensions remain preserved. A successful structural report means these bounded constraints passed; it never certifies whole-domain semantics or arbitrary schemaVersion support.

Document inspection combines the common envelope with the catalog body for project, foundation, component, design, screen, scenario, connection and text. Registry has no complete catalog body and remains explicitly unverified. The ADS Project body is a document with a list of Refs, distinct from the private kernel project snapshot map. Ref.expectedKind is an open identity kind, not the closed document-kind enum. Version and revision are independent optional pins; no exclusive-or rule is invented.

Reports identify the profile, validity of enforced constraints, checked records, diagnostics and unresolved type names. Diagnostics carry JSON Pointer paths and have a bounded count with explicit truncation evidence. Unsupported types must not be counted as validated records. No coercion, property removal, remote loading, dynamic runtime compilation or expression execution is introduced.

## Adoption and compatibility

The existing `ads-envelope` import retains its behavior. `document.import` additionally accepts `formatProfile: "ads-structural"` with the same draft/review/update modes. Draft capture preserves invalid sources and adds structural diagnostics. Ordinary structural import/update rejects known structure or covered local-graph errors atomically before creating a candidate. Unknown semantics remain warnings and preserved data.

Structural adoption stores an optional `validationProfile: "foundation-structural"` on each DocumentEntry, bound by the candidate digest and persisted with receipts and Undo/redo. A structural SourceDraft retains the same optional policy; a repair bound to that draft inherits it. An update inherits an existing structural profile even when the caller uses the default envelope format, so it cannot silently remove validation. Applying a candidate, deleting dependencies and restoring history recheck the covered constraints. Earlier records without this field remain readable without history rewriting. Promoting an unchanged envelope document to the structural profile is a reviewed provenance change and may retain its source revision.

## Local reference boundary

Index only document identities and explicitly owned nested entities at agreed catalog paths; never discover entities by recursively scanning arbitrary `id` properties. Check duplicate identities, covered typed-ref kind/revision mismatches, missing covered targets and Part parent ownership/cycles. Nested references pin their owning document revision. Live kernel project scope has no source revision or public library version. External registry/library version resolution remains unverified and never triggers a network request. Prototype navigation cycles remain allowed; token-alias semantics and other unspecified edge encodings remain pending.

Only declared structural fields participate in the new graph traversal. Metadata, extensions, unknown fields and unresolved named-type payloads are opaque. Existing envelope-only reference protection retains its previous bounded behavior. A reference to an unvalidated nested entity cannot claim successful semantic resolution.

A version pin alone does not identify an external reference. Missing targets of covered local kinds remain errors even with a version pin; otherwise deleting a formerly local dependency could silently downgrade a broken reference to an external-library warning. Unknown registry kinds and the public-version capability remain unverified until explicit library addressing and locks are implemented.

This profile fixes the following exact nested kind names and owner paths: component `parts` → `part`, `slots` → `slot`, `publicContract.values/events/variants` → `value`/`event`/`variant`; foundation `tokens/themeAxes/themeSets` → `token`/`themeAxis`/`themeSet`; text `blocks` → `textBlock` and `blocks[].inlines` → `inlineRun`. These are profile spellings, not guessed aliases. Covered local string edges are Part.parent, Slot.ownerPartRef, PublicContract.exposedSlots/replaceableParts, ValuePort.requestEventRef, TraitBinding.targetParts and MotionDefinition.targetPartRef. Other named reference encodings remain unverified. Known nested entities in earlier envelope documents can be reported, but remain unverified resolution targets until those documents adopt the structural profile.

## Adapter and evidence

An authorized `CommandService.inspectStructure` query reports the project revision, per-document structural reports and the local reference report without mutation. CLI `validate` prints that report and fails for enforced errors; `import/update --structural` selects the additional format profile. Original source export retains profile provenance alongside its existing source pair.

Required evidence covers generated/catalog drift, independent positive and negative schema fixtures, unknown-field/type preservation, Ref openness, all document-body mappings, structural draft repair, inherited update validation, failed-batch atomicity, reviewed promotion, current apply revalidation, duplicate/missing/wrong-kind/pinned nested references, Part cycles and allowed navigation cycles, old-store compatibility, restart and Undo/redo. Structural checks do not establish I1 completion, SEL04 completion, Studio readiness or a release target.
