# ADR-0010 — Source-preserving draft authoring and envelope schemas

Status: ACCEPTED for the next bounded I1 implementation

Date: 2026-09-13. Owner: product owner; executor: Codex. The owner requested self-improvement of the initial implementation and continued implementation from the Foundation, specs and architecture. This extends ADR-0009 within its existing three source roots; it does not reduce the full release scope.

## Authority and outcome

[SYN02](../foundation/syntax/project-documents-and-identity.md) separates identity, source revision and unknown extensions. [SYN04](../foundation/syntax/interchange-and-migration.md) requires erroneous original sources to remain available beside repairable drafts and normalized results. [ARC03](../foundation/architecture/commands-revisions-and-undo.md) owns review, revision, receipts and Undo. This slice makes that source-to-repair-to-reviewed-update workflow executable.

## Concrete import modes

The existing `document.import` command retains `sourceRefs`, `formatProfile: "ads-envelope"` and `importMode`. Its current `review` mode remains an atomic new-identity import. Two explicit modes are added:

- `draft`: preserve each bounded UTF-8 source text, including empty/malformed JSON, invalid envelopes or unknown kinds, as an immutable principal-owned SourceDraft with a generated ID, source URI, digest and diagnostics. Return draft refs/original hashes. This creates no active ADS document or project revision. The batch and receipt persist atomically. Oversized or structurally invalid transport inputs are rejected; no unbounded source is saved.
- `update`: replace only an existing same-ID/same-kind/same-schemaVersion document. Every source must supply its exact `expectedRevision`; a new source revision is required when parsed document content changes. Formatting, key-order or source-URI-only changes may form a reviewed provenance change with the same source revision and an empty semantic field diff. Never infer identity from name/path. Create a review candidate, revalidate references at apply and use ordinary receipt/Undo/redo semantics. Schema-version changes require a registered migration and are rejected by this mode.

A `review`/`update` source may name a same-principal `draftId`. The draft remains immutable; the submitted content is a repair candidate. For new identities the document's original text/URI come from that preserved draft. For updates the first imported original text/URI remain unchanged; the current edited source text/URI are stored separately. Immutable store history retains intermediate adopted edits. Candidate diffs include field paths and before/after JSON values for updates so review can see changes, including opaque fields. No arbitrary JSON-path command is exposed.

New query methods `listDrafts`, `getDraft`, `getDiagnostics` and `exportDocument` run through the authenticated command-service boundary. They implement bounded local projections of the existing document/diagnostic contracts. Export returns the first original source and current normalized JSON, each with a digest, plus validation limits. The CLI can write these to a fresh, explicitly selected directory with fixed filenames and a manifest; it never overwrites an existing export. This source export is not a target delivery/release package.

## Schema and validation profile

Select JSON Schema 2020-12 with Ajv `8.20.0` (MIT) as a pinned development-only compiler for the common DocumentEnvelope. Ajv generates a standalone ESM validator; no Ajv runtime, dynamic Function construction, remote schema loading, coercion, defaults or property removal is permitted in the core. The generated TypeScript file contains generator/schema digests and is reproduced by `pnpm check`. Its generated JavaScript body has an explicit compiler-check exception; strict handwritten wrapper types, differential schema tests and a runtime with string/wasm code generation disabled verify the boundary.

The alternative was extending the bespoke envelope checker; a schema becomes a portable inspectable source for the same fields. Runtime Ajv compilation would add code generation and initialization to the future browser path. Standalone compilation keeps that work in the build. Evidence must prove deterministic output, no runtime imports/evaluation and no data mutation before this profile is considered validated. [Ajv standalone](https://ajv.js.org/standalone.html), [JSON Schema 2020-12](https://json-schema.org/draft/2020-12).

The schema checks required header fields and object-valued metadata/extensions; unknown other fields are preserved. Unknown kinds fail the envelope but can be captured as drafts. Any nonempty schemaVersion remains preserved and explicitly semantically unverified; this does not certify support for that version. Canonicalization profile is sorted UTF-16 object keys, JSON number/string serialization, array order preserved, UTF-8 and SHA-256, version `1.0.0`. Raw source digests cover exact UTF-8 text, not normalized JSON.

Numeric parsing compares normalized decimal coefficient/exponent before and after IEEE-754 conversion. Finite values that would underflow or lose source precision fail with `JSON_NUMBER`; `1.0`, `1e3` and `0.1` remain valid, and numeric negative zero normalizes to zero. The original can still be captured as an erroneous draft. Raw transport strings with unpaired UTF-16 surrogates are rejected because UTF-8 encoding cannot preserve them; JSON escape sequences remain literal source bytes. Canonical encoding preflights expanded size/depth before allocation. Old adopted sources are re-inspected for diagnostics without rewriting their history.

This is the first tested portion of SEL04, not a completed public ADS type-generation or domain-schema selection. Token standards, Part/alias cycles, accessibility/behavior semantics, public domain types and full schema conformance remain distinct work. No historical-to-current migration transformer is invented: there is no approved old/new schema pair yet. Unsupported migration stays explicit instead of relabeling normalization as migration.

## Compatibility and verification

Additive optional fields on the private `0.1.0` persisted state preserve existing stores and receipts without rewriting history: drafts are absent-or-array, and current text/URI fall back to the existing original fields. The current profile must validate these optional records before use. Existing snapshots and failed-operation receipts must retain their meaning.

Required evidence: original bytes/digests after repair/update/restart/Undo; malformed and unknown-kind draft capture; actor isolation; atomic batch failures; exact draft/update receipt replay; changed-source revision conflicts; kind/schema changes rejected; field-level reviewed diff; stale approval; reference-safe update; no overwrite on source export; bounded input before reads; and unchanged existing crash/concurrency protections. The implementation record maps completed behavior and remaining I1–I6 work to its owning Foundation contracts.
