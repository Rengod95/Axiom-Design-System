# ADR-0012 — Typed values, content constraints and project source bundles

Status: ACCEPTED for continued I1 implementation

Date: 2026-09-13. Owner: product owner; executor: Codex. The owner requested uninterrupted continuation of the remaining work. This extends ADR-0011 within the existing source roots and approved toolchain. No additional product approval is inferred from historical reference code.

## Authority and compatibility

[CMP03](../foundation/components/values-events-and-expressions.md), [the document contracts](../foundation/annexes/document-contracts.md) and [review examples](../foundation/annexes/examples/review-project.json) supply the value/record semantics. [SYN04](../foundation/syntax/interchange-and-migration.md) and [ARC04](../foundation/architecture/storage-offline-and-recovery.md) supply source preservation and atomic restore. Exact encodings absent from these materials are implementation decisions below, not previously confirmed examples.

`foundation-domain` is an explicit stronger adoption policy selected by import format `ads-domain` / CLI `--domain`. It includes the existing structural and local-reference checks plus the constraints below. Earlier envelope/structural records keep their previous validation meaning. Updates and draft repairs inherit the strongest policy; no caller flag silently downgrades it. Current candidate, apply, deletion and Undo/redo checks include adopted domain constraints. Read-only `validate --domain` inspects without promoting sources. Domain validity is bounded to implemented rules, not complete ADS semantics or schemaVersion support.

## TypeExpr and raw typed values

TypedValue remains the original JSON value governed by a declaration, matching the examples' boolean/string defaults. No `{type,value}` wrapper is introduced. The following closed declarations are executable in this increment:

| kind | Fields in addition to kind | Value contract |
|---|---|---|
| boolean | none | JSON boolean |
| string | none | JSON string |
| number | none | finite JSON number |
| enum | values: nonempty unique list of strings | exact string membership |
| record | fields: map to TypeExpr; required: unique list of declared field names; additionalFields: reject or preserve-opaque | required presence, declared child types, explicit extra-field policy |
| list | items: TypeExpr | array of matching values; order preserved |
| nullable | inner: TypeExpr | explicit null or matching inner value |

The boolean/string/enum/record spellings and raw defaults match existing examples. `number`, `items` and `inner` are new profile encodings. Nullable never implies optional. Empty records use explicit fields/required/additionalFields. Unknown declaration fields and kinds fail instead of silently ignoring a constraint. Tagged unions, opaque keys, reference-valued TypeExpr and UI-domain TypeExpr require further contracts and return explicit unsupported diagnostics in this policy; earlier profiles preserve them. No defaults, coercion, compilation of user-supplied code or expression execution occurs.

Public type/value inspection validates plain JSON at its boundary, bounds bytes/depth/steps and reports precise paths without mutation. Type declarations are inspectable JSON Schema compiled with the existing pinned standalone generator; runtime value checking implements the declared type recursively with bounded work. Own-property checks distinguish absence from null and keep prototype-like record field names as data.

Known catalog TypeExpr positions are inspected. ValuePort.defaultValue is checked only when present against ValuePort.type; EventPort.payloadType is a declaration, not an event execution. TraitDefinition.configurationType is a declaration; PolicyDefinition.default and each allowedChoices value use its configurationType. Request.desired and scenario mock values remain unverified where owner/type resolution is not implemented. Ownership does not forbid a consumer port's default. Preserved additional record fields stay opaque and cannot become expression inputs or references.

## Content and simple domain invariants

VariantAxis.default must belong to options. ThemeAxis.default must belong to contexts when present; this policy does not turn that optional field into a required one. A finite Slot.max must be at least min. Definition defaultContent need not satisfy min because an instance may supply required content.

For SizePolicy, fixed requires value; hug/fill forbid value. This profile defines Dimension as `{value: finite number, unit: nonempty string}`; negative sizes are rejected. Bounds must use the same unit and min must not exceed max; a fixed value must fall within comparable bounds. No implicit unit conversion or output-target unit support is claimed. FreePosition coordinate semantics and full layout solving remain separate.

This profile defines InlineMark as `strong | emphasis | underline | strike | code`, ListMetadata as `{id: StableId, ordered: boolean, start: positive integer, level: nonnegative integer}` and SafeLink as `{href: string, target?: "_self" | "_blank"}`. A list-item requires list metadata; a paragraph does not carry it. These spellings are new bounded encodings. SafeLink accepts absolute http/https URLs, mailto URLs without an authority (the recipient may be omitted) and nonempty same-document fragments; literal controls/whitespace, credentials and unsupported schemes are rejected. No URL is opened. Native navigation handling, rendering, rel policy and full rich-text semantics remain separate. Text source and unknown extension bytes remain preserved even when adoption fails.

## Native project source bundle

The `ads-project-bundle` transfer restores the same project identity into a separately initialized, empty project. Different project IDs and nonempty targets are rejected; this is restoration, not independent copy/retarget. The source project name must match the explicit target name. Source revision is provenance; restoration gets a new local revision through the normal reviewed transaction.

A versioned manifest contains project id/name/revision, canonical profile, hash algorithm, document entries and a bundleDigest over the canonical manifest excluding bundleDigest. Each entry identifies document id/kind/revision, optional validationProfile, original `{file,uri,digest}` and normalized `{file,digest}`. Filenames use fixed numeric slots, never IDs or source URIs. The transport supplies the manifest and a filename-to-UTF-8-text map; file digests and manifest digest are checked, normalized text must be canonical and match the declared identity, and every source/profile/reference is revalidated. Digests detect corruption and do not authenticate an author. Source URIs are inert provenance.

Core export reads one project snapshot. It excludes private drafts, receipts, candidates, approval tokens and Undo/history. Original source can be malformed; it is preserved exactly alongside canonical current JSON. Restore uses `document.import` with formatProfile `ads-project-bundle`, importMode `review` and one sourceRefs entry `{uri, manifest, files}`. Only the validated bundle decoder can create entries from these original files; ordinary source inputs gain no trusted-original bypass. The whole bundle is one candidate and one document commit; no silent chunking is allowed.

Limits: at most 64 documents, 1 MiB per source file, 4 MiB combined original/normalized UTF-8 text, and 8 MiB canonical import payload. Empty projects may also round-trip through a reviewed empty-document bundle. Export checks these same limits before writing. The CLI writes fixed files into one fresh directory and publishes manifest.json last. Import rejects unlisted/duplicate/missing files, path traversal/absolute paths, symlinks and changing files, validates bounded UTF-8 data before the core command, and never fetches source URIs. This does not package assets, registry dependencies or an offline preparation pack.

## Verification and remaining work

Required tests cover type declaration/value failures, missing/null distinction, opaque preservation, resource limits, default consistency, content constraints, policy inheritance and old-store compatibility; plus cross-document bundle references, malformed first originals, file/manifest tampering, same-identity fresh restore, rejected wrong/nonempty targets, stale approval, lost responses, Undo/redo and re-export consistency. Required repository/Windows/Ubuntu checks remain in force. Registry/library resolution, remaining type categories, semantic execution, migration pairs/loss reports, Browser storage and target realization remain explicit subsequent work.
