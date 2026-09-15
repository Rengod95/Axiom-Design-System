# ADR-0017 — Foundation interchange and live expressions

Status: ACCEPTED for the owner's request to continue the remaining implementation.

Date: 2026-09-14. Owner: product owner; executor: Codex.

This extends ADR-0016. The owner requested continued implementation against the Foundation, including token management and usable editing. The previous follow-up retains the complete 119-requirement inventory; this amendment implements a bounded interoperability increment and does not retire the remaining obligations.

## Decisions

- `modules/ads-core` owns grouped DTCG Format 2025.10 import, inherited `$type` and `$deprecated`, explicit `$root`, local `$extends`, whole-token aliases and references into token `$value` properties. Group expansion is normalized during adoption; original bytes and group metadata are preserved. Token replacements are atomic during group and source merging.
- The editable ADS value union adds `{ composite: JsonValue }`; its reference leaves use `{ ref: { id, expectedKind: "token", path? } }`. An optional RFC 6901 `path` selects a property of the resolved target token. These tags are Axiom's authored representation, not new DTCG syntax. Only value expressions are interpreted; descriptions, extensions and preserved source metadata remain opaque.
- Dependencies participate in every-context validation, type checking, cycle rejection, source provenance, usage/deletion impact and replacement. Base or theme changes propagate through property and composite references. Shared input, traversal and output limits still apply. Cycles are checked at token granularity: same-token property references are currently rejected, even when a finer property graph might be acyclic.
- A token may carry `deprecated: boolean | string`. Existing uses continue to resolve. Studio exposes the status and migration guidance; setting it is a reviewed authoring edit, not permission to delete or silently migrate users.
- The bounded Resolver composer accepts version 2025.10, supplied local JSON documents, sets, modifiers, contexts, defaults and explicit resolution order. Later token definitions replace earlier definitions as whole records. Aliases are interpreted after composition by the Format importer. Unknown inputs, forbidden modifier/order references, missing supplied resources, cycles and invalid context choices reject adoption. No networking or ambient file access occurs in the core.
- Resolver GUI adoption imports one explicitly selected permutation as editable base tokens. It preserves the original definition, supplied source strings, inputs and order alongside the normalized token source. It does not convert the Resolver graph into a fully editable ADS axis graph or claim complete Resolver conformance.
- `dtcg-import` uses explicit keep/update/reject conflict policy and optional name prefix. Matching names retain stable identities. Updates retain classifications and theme overrides, rebind incoming references and preserve source captures. Mixed-type conflicts reject the complete proposal. Apply, review, save, Undo, Redo and rebase use the existing controller transaction boundary.
- The Files workspace has an isolated staging buffer. Selecting or pasting a file does not edit the project and does not block review of unrelated project changes. Applying is explicit; staging text remains while navigating Foundation subtabs. The property inspector preserves expression bindings during metadata edits and offers source-token/property controls plus an optional JSON editor with recovery.
- Selected-context export explicitly chooses live references or resolved literals and warns that theme definitions, groups, classifications and Axiom policy data are omitted. Full-system preservation remains the ADS project bundle. Exact imported sources remain separately downloadable. The stricter authored exporter still rejects unrepresentable ADS data.

## Scope and verification

Primary references are [DTCG Format 2025.10](https://www.designtokens.org/tr/2025.10/format/) and [Resolver 2025.10](https://www.designtokens.org/tr/2025.10/resolver/). These tests establish supported behavior, not certification against an official complete corpus. Non-value document references, property-level self dependency graphs, arbitrary external resolution, fully editable Resolver graphs, policy/exception workflows and all-platform realization remain open. A failing or unsupported source is never silently reduced to a successful partial import.

New TypeScript files stay in existing approved source/test roots. Browser regressions extend the existing workbench test helper. CSS uses the incumbent Axiom UI token system; no additional package, asset root or maintenance script is introduced. All repository, unit, browser, Studio, workbench and target gates remain required.
