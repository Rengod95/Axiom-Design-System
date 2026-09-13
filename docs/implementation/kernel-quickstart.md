# Run the ADS document kernel

This is the first I1 implementation under [ADR-0009](../adr/0009-ads-kernel-implementation-bootstrap.md). It creates a local project, preserves imported UTF-8 ADS document envelopes, stages and approves changes, protects recognized document references, and persists Undo/redo across processes.

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

Each invocation starts a new process and opens the same store. `show` returns the original source text beside the parsed envelope. Unknown extensions stay opaque and are never executed. A malformed envelope, invalid UTF-8 or invalid JSON rejects the complete import batch. The I1 JSON profile rejects a leading BOM instead of silently changing the original text.

Without `--approve`, `import` and `delete` return `reviewRequired` and a `candidateId`; the active document revision does not change. Inspect that ID with `candidate <id>`, approve it with `review <id> --approve`, and use its returned token with `apply <id> --token <token>`. `review <id> --reject` discards the proposal. `apply <id> --approve` is the shorter explicit decision: it prints the exact proposed diff, calls the ordinary review command, then applies that approval. It does not bypass stale-revision or reference checks.

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

Standard output is JSON; explicit review diffs go to standard error. When capturing JSON through pnpm, use `pnpm --silent axiom ...`, or invoke the Node entry directly. Exit codes are `0` for success or a staged review, `1` for rejected input or I/O failure, `2` for CLI usage, and `3` for a revision conflict or active writer lock. Diagnostics carry stable codes, including `CLI_USAGE`, `CLI_UTF8`, `CLI_NOT_FOUND` and the store/core codes.

The adapter uses an exclusive writer lock and complete commit records to recover interrupted processes. If a dead writer leaves a lock, inspect the failure and explicitly run:

```powershell
pnpm axiom --store "$demoRoot/store" recover-lock
pnpm axiom --store "$demoRoot/store" show
```

Recovery refuses a live or unverifiable lock owner. Do not delete lock or commit files to force a write. Corrupt committed data and ambiguous recovery stop with diagnostics; incomplete preparation is not a successful document revision. Tests cover process interruption, while sudden power loss and arbitrary external file edits have only the guarantees recorded by the local-store implementation.

The local principal represents the user already permitted to run this process and access the folder. This adapter does not implement network authentication or multi-user authorization. API/Host authentication and Browser storage remain separate implementation work.
