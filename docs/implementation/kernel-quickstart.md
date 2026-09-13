# Run the ADS document kernel

This is a bounded I1 implementation under [ADR-0009](../adr/0009-ads-kernel-implementation-bootstrap.md) and [ADR-0010](../adr/0010-source-preserving-draft-authoring.md). It creates a local project, captures original sources, stages repaired imports and existing-document updates, protects recognized document references, and persists Undo/redo across processes.

Every JSON result reports `validation: "envelope-only"` and `semantics: "unverified"`. Component behavior, tokens, accessibility, rendering, Studio, Browser storage, AI and output platforms are later work. A successful import does not certify those contracts.

## Prepare

Use the versions pinned in [the implementation profile](ads-kernel-profile.json): Node 24.19.0 and pnpm 11.19.0. From the repository:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm axiom help
```

The CLI has no runtime dependencies. `pnpm axiom` runs Node's TypeScript stripping; `pnpm check` performs the separate strict type check. After a build, the emitted entry is `node dist/apps/cli/src/main.js` with the same arguments.

## Create, import and reopen

The following PowerShell example chooses a fresh directory outside the checkout. Reusing an existing project ID does not overwrite its store.

```powershell
$demoRoot = Join-Path $env:TEMP ('axiom-kernel-demo-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $demoRoot | Out-Null
$demoDocument = @'
{
  "id": "component.card",
  "kind": "component",
  "schemaVersion": "1.0.0",
  "revision": "source-r1",
  "name": "내 Card 초안",
  "extensions": { "example.vendor": { "futureData": "preserved" } }
}
'@
[IO.File]::WriteAllText((Join-Path $demoRoot 'card.json'), $demoDocument, [Text.UTF8Encoding]::new($false))

pnpm axiom --store "$demoRoot/store" init --project demo --name "Axiom demo"
pnpm axiom --store "$demoRoot/store" import "$demoRoot/card.json" --approve
pnpm axiom --store "$demoRoot/store" show component.card
pnpm axiom --store "$demoRoot/store" history
```

Each invocation starts a new process and opens the same store. `show` returns the original source text beside the parsed envelope. Unknown extensions stay opaque and are never executed. A malformed envelope, invalid UTF-8 or invalid JSON rejects the complete ordinary import batch. `import --draft` can preserve invalid JSON and envelopes as source drafts. The I1 JSON profile rejects a leading BOM as an active document instead of silently changing the original text.

Source loading accepts regular UTF-8 files only, at most 64 files, 1 MiB per file and 8 MiB per batch. These limits apply before unbounded file allocation; a source that changes during the read is rejected. Directories and invalid UTF-8 are not draft captures.

Without `--approve`, ordinary `import`, `update` and `delete` return `reviewRequired` and a `candidateId`; the active document revision does not change. Inspect that ID with `candidate <id>`, approve it with `review <id> --approve`, and use its returned token with `apply <id> --token <token>`. `review <id> --reject` marks the stored proposal rejected. `apply <id> --approve` prints the proposed diff, reviews it and applies that approval. If this local principal already approved it but lost the printed token, this command resumes that stored approval through the same guarded apply operation. Stale revisions and invalid references still fail.

## Capture, repair and update

A source draft has its own generated identity. Capturing malformed JSON or an unknown envelope kind does not adopt an ADS document or advance the project revision. The immutable draft retains its original text, SHA-256 digest and diagnostics.

```powershell
$draftFile = Join-Path $demoRoot 'draft.json'
[IO.File]::WriteAllText($draftFile, '{ broken: 원본', [Text.UTF8Encoding]::new($false))
$capture = node apps/cli/src/main.ts --store "$demoRoot/store" import $draftFile --draft | ConvertFrom-Json
$draftId = $capture.draftRefs[0]
pnpm axiom --store "$demoRoot/store" drafts
pnpm axiom --store "$demoRoot/store" draft $draftId

$repairedDocument = @'
{
  "id": "component.repaired",
  "kind": "component",
  "schemaVersion": "1.0.0",
  "revision": "source-r1",
  "name": "Repaired Card",
  "extensions": { "example.vendor": { "futureData": "preserved" } }
}
'@
[IO.File]::WriteAllText($draftFile, $repairedDocument, [Text.UTF8Encoding]::new($false))
pnpm axiom --store "$demoRoot/store" import $draftFile --draft-id $draftId --approve

$editedDocument = $repairedDocument.Replace('"source-r1"', '"source-r2"').Replace('Repaired Card', 'Updated Card')
[IO.File]::WriteAllText($draftFile, $editedDocument, [Text.UTF8Encoding]::new($false))
pnpm axiom --store "$demoRoot/store" update $draftFile --approve
pnpm axiom --store "$demoRoot/store" diagnostics
pnpm axiom --store "$demoRoot/store" export component.repaired --out "$demoRoot/repaired-export"
```

`--draft-id` binds exactly one import/update file to a captured source owned by this principal. The capture remains unchanged. For a repaired new document, its first original text comes from that draft. Updates preserve that first original and store the current submitted text separately. `drafts` lists source summaries; `draft <id>` returns the complete original text. `diagnostics` includes both active-document findings and captured-source findings, so an immutable invalid original still has its original error after a repair is adopted.

`update` requires an existing stable document ID, the same kind and schema version, and a new source `revision` when parsed JSON content changes. Formatting, object-key order or source-URI-only changes can be reviewed and adopted with the same source revision and an empty semantic field diff; the current source text/URI are still recorded. The CLI reads the current source revision and supplies it with the current project revision; the core rejects stale revisions. Review shows field paths and before/after values. A schema version string is preserved without certifying that version's domain semantics. Changing versions requires a registered migration; this slice has no migration transformer.

Export writes `original.json`, `normalized.json` and `manifest.json` into one fresh directory whose parent already exists. `original.json` contains the exact first source text and may be malformed JSON; `normalized.json` contains canonical current document JSON. The manifest records both SHA-256 digests and the canonicalization profile. Existing destinations, parent traversal and symlink ancestors are refused, and existing files are never overwritten. The manifest is written last; an I/O failure can leave partial output without a completed manifest. This is a source pair, not a target delivery or release package. These filesystem operations assume the same local folder authority as the store; they do not defend against a hostile process replacing parent directories during the operation.

## Inspect and adopt structural validation

[ADR-0011](../adr/0011-structural-domain-inspection-and-local-references.md) adds a selectable check of known Foundation fields and local references. Existing envelope-only files remain readable. `validate` inspects the current project without changing its revision or adoption policy; an enforced error returns exit code 1. The separate `structure` result lists checked records, unresolved types and graph findings. Its success still leaves full domain semantics and schema-version support unverified.

```powershell
$textFile = Join-Path $demoRoot 'text.json'
$textSource = '{"id":"text.welcome","kind":"text","schemaVersion":"1.0.0","revision":"source-r1","name":"Welcome","blocks":[{"id":"block.welcome","kind":"paragraph","inlines":[{"id":"run.welcome","text":"안녕하세요","marks":[]}]}],"localeHints":{}}'
[IO.File]::WriteAllText($textFile, $textSource, [Text.UTF8Encoding]::new($false))
pnpm axiom --store "$demoRoot/store" import $textFile --structural --approve
pnpm axiom --store "$demoRoot/store" validate
```

Earlier Card envelopes in this guide deliberately lack complete component bodies; `validate` reports their missing structural fields. A fresh project containing only the complete Text example passes the implemented structural subset. Unknown InlineMark or SafeLink details remain preservation boundaries with warnings, so passing this check is not a rendering, accessibility or link-safety certification.

`import --draft --structural` captures erroneous sources with structural diagnostics. Repairs linked to those drafts inherit the profile. An adopted structural document also keeps its policy when later `update` commands omit `--structural`. Missing required fields, duplicate covered identities, covered broken references and Part-parent cycles are rejected before adoption. To promote a complete envelope-only document, use `update <file> --structural --approve`; an otherwise unchanged source may retain its source revision. Undo restores the earlier policy and source snapshot together. Export includes the adopted validationProfile in its manifest.

## Adopt typed and content constraints

[ADR-0012](../adr/0012-typed-values-and-project-bundles.md) defines the explicit `foundation-domain` profile. `import` and `update` accept `--domain`; `import --draft --domain` preserves source diagnostics. `validate --domain` reads the current project and reports the implemented rules without changing any stored policy. Choose one of `--domain` and `--structural` when adopting. A repaired draft or updated document inherits its strongest previous profile even if the flag is omitted.

This profile implements boolean, string, number, enum, record, list and nullable TypeExpr declarations, raw typed defaults, Variant/Theme default membership, Slot cardinality bounds, SizePolicy/Dimension constraints and the bounded InlineMark/ListMetadata/SafeLink encodings in ADR-0012. Nullable means a value may be null; optional record fields are separately declared. Unsupported TypeExpr declarations fail explicit domain adoption rather than silently accepting unimplemented constraints. Request/scenario value resolution, full registry semantics and all target rendering remain outside this profile.

```powershell
# Promote the complete Text source from the preceding example.
pnpm axiom --store "$demoRoot/store" update $textFile --domain --approve
pnpm axiom --store "$demoRoot/store" validate --domain
```

`validate --domain` still reports missing fields in the intentionally incomplete Card examples. It does not imply that every document in an older project can be promoted unchanged.

## Export and restore a project bundle

A native project bundle carries every active document's exact first original and canonical current JSON, with individual digests and a versioned manifest. It does not carry private drafts, approvals, receipts or Undo/history. The target must be an explicitly initialized empty project with the same ID and name; the source revision is provenance and restore creates a new local revision.

```powershell
pnpm axiom --store "$demoRoot/store" export-bundle --out "$demoRoot/project-bundle"
pnpm axiom --store "$demoRoot/restored-store" init --project demo --name "Axiom demo"
pnpm axiom --store "$demoRoot/restored-store" import-bundle "$demoRoot/project-bundle/manifest.json" --approve
pnpm axiom --store "$demoRoot/restored-store" show
pnpm axiom --store "$demoRoot/restored-store" undo
pnpm axiom --store "$demoRoot/restored-store" redo
```

Without `--approve`, `import-bundle` stages one candidate for the entire bundle. The existing `candidate`, `review` and `apply` commands work with it. Stale approvals and nonempty/wrong-identity targets fail without replacing current documents. This operation restores the same project identity; creating an independent copy with rewritten internal IDs remains separate work.

Bundles allow 64 documents, 1 MiB per file, 4 MiB combined original/normalized text and an 8 MiB canonical command payload. Export checks importability before disk writes. The destination must be fresh, its parent must exist, and `manifest.json` is written last. Numeric filenames avoid using IDs or source URIs as paths. Reading refuses missing, unlisted, duplicate JSON-key, changed, non-UTF-8 or symlink inputs and rejects file/manifest digest mismatches. Digests detect corruption; they do not authenticate an author. No referenced URI is fetched. The directory's local authority and partial-output behavior match the source-pair export above. Assets, registry dependency packages and offline preparation packs are not included.

## Delete, Undo and redo

```powershell
pnpm axiom --store "$demoRoot/store" delete component.card --approve
pnpm axiom --store "$demoRoot/store" undo
pnpm axiom --store "$demoRoot/store" show component.card
pnpm axiom --store "$demoRoot/store" redo
pnpm axiom --store "$demoRoot/store" show
```

The optional Undo/redo handle selects an explicit applicable history entry. Intervening changes and stale approval tokens fail instead of overwriting newer work. Deletion scans recognized local typed references outside opaque metadata/extensions; this limited check does not certify future ADS semantics. There is no force-delete bypass.

## Failure and recovery

Standard output is JSON; explicit review diffs go to standard error. When capturing JSON through pnpm, use `pnpm --silent axiom ...`, or invoke the Node entry directly. Exit codes are `0` for success, a captured source or a staged review, `1` for rejected input or I/O failure, `2` for CLI usage, and `3` for a revision conflict or active writer lock. Diagnostics carry stable codes and phases, including `CLI_USAGE`, `CLI_UTF8`, `CLI_IMPORT_LIMIT`, `CLI_SOURCE_TYPE`, `CLI_EXPORT_PATH`, `CLI_NOT_FOUND` and the store/core codes. Usage is checked before opening the store.

The adapter uses an exclusive writer lock and complete commit records to recover interrupted processes. If a dead writer leaves a lock, inspect the failure and explicitly run:

```powershell
pnpm axiom --store "$demoRoot/store" recover-lock
pnpm axiom --store "$demoRoot/store" show
```

Recovery refuses a live or unverifiable lock owner. Do not delete lock or commit files to force a write. Corrupt committed data and ambiguous recovery stop with diagnostics; incomplete preparation is not a successful document revision. Tests cover process interruption, while sudden power loss and arbitrary external file edits have only the guarantees recorded by the local-store implementation.

The local principal represents the user already permitted to run this process and access the folder. This adapter does not implement network authentication or multi-user authorization. API/Host authentication and Browser storage remain separate implementation work.
