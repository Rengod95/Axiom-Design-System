# Initial kernel self-review and continuation

Date: 2026-09-13. Basis: the owner's request to improve the initial implementation and continue from the approved Foundation/specs/architecture. [ADR-0010](../adr/0010-source-preserving-draft-authoring.md) defines the next source-authoring contract before its implementation.

## Reproduced defects and repairs

| Finding | Reproduction and consequence | Repair and evidence owner |
|---|---|---|
| Current approval authority on replay | An applied request's receipt could replay after `review.apply` was revoked | Check current apply authority before receipt lookup; core authorization regression |
| Rejected reducer revision | Late identity failure could return a revision from rolled-back work | Report the persisted snapshot revision; atomic rollback regression |
| Unresolved library version | A Ref.version was accepted with no version resolver or specific diagnostic | Preserve the pin and report unresolved version capability; reference tests |
| Query identity mutation | A caller could change principal.id while a draft query awaited storage, exposing another actor's drafts | Snapshot the authorized actor before awaiting; independent race regression |
| CLI preflight | Import read large files before limits; invalid CLI combinations could open/create storage | Check usage first; bounded regular-file reads and batch limits before source loading |
| Recovering an approved candidate | Losing the printed review token made `apply --approve` re-review an already approved candidate and fail | Use the same principal's stored approval through ordinary guarded apply; restart/stale tests |
| Reopen memory | Forty-eight 1 MiB historical payloads exhausted a constrained process because recovery retained all parsed states | Validate history sequentially and retain only the selected head; constrained child-process test still detects old corruption |
| Shared graph expansion | Small acyclic shared object graphs expanded exponentially before byte limits during canonical/state encoding | Measure encoded size/depth with memoized subtrees before emission; bounded child-process regressions |
| Original UTF-8 text | A direct API string with an unpaired UTF-16 surrogate changed when encoded as UTF-8 | Reject transport text that cannot preserve its exact UTF-8 representation; draft originals remain exact |
| Numeric source loss | Underflow and excess precision could silently change a number during parse/normalized export | Detect lossy numeric conversion before adoption; erroneous source remains capturable as a draft |
| Evidence wording | Initial evidence incorrectly said all future schemaVersion strings were rejected, while code intentionally preserved them unverified | Correct scope wording; schema tests exercise future-version preservation explicitly |

These changes preserve the persisted `0.1.0` state format and earlier immutable records. New optional draft/current-source records are validated when present. Fresh queries re-check current source diagnostics without retroactively rewriting historical receipts or original text.

## Implemented continuation

The common DocumentEnvelope now has an inspectable JSON Schema and deterministic standalone validator. Strict raw JSON parsing precedes schema checks. Invalid source capture, same-ID reviewed update, source-draft repair binding, diagnostic queries and paired original/normalized export extend the existing command-service/storage flow. Field paths and before/after values make updates reviewable; kind/schema-version changes require a separate supported migration.

The tests include real FileStore response loss, exact draft/update receipt replay, stale revisions, source preservation across restart and Undo/redo, and no-overwrite export. [Schema evidence](schema-selection-evidence.md), [quickstart](kernel-quickstart.md) and the [implementation map](implementation-roadmap.json) keep source contracts, evidence and pending capabilities separate. The PR's exact CI commit is authoritative for the combined test result.

## Remaining implementation order

1. Finish I1 domain schemas, registry/ref resolution and partial-draft domain editing, then select an approved old/new schema pair and implement reversible or source-restoring migration candidates with loss reports. Complete native multi-document project interchange and Browser storage conformance.
2. I2 implements token/theme editing after the SEL01 standard comparison, including aliases, contexts, cycles, original/opaque preservation and usage preview.
3. I3 implements Button/Card/Toast definition, editing and preview with Parts, behavior, accessibility, motion and distinct Web/Mobile appearances.
4. I4 proves React/RN project init, user-owned output, upgrade diff/rollback and independently verified AI candidates.
5. I5 expands the complete catalog and Swift/Android profiles; I6 provides private-user, offline, rights, operations, performance and release evidence.

This follows [OPS04](../foundation/operations/development-and-maintenance.md). A source CLI and passing common-envelope tests do not establish complete I1, Studio readiness or release support for the four target platforms.
