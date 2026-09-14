# Foundation interchange continuation — 2026-09-14

Parent implementation: `7a424b68ae099658830a7a1e18743afbe128efc1`, PR #30. Authority: [ADR-0017](../adr/0017-foundation-interchange-and-live-expressions.md). The [previous 119-row follow-up](editor-completion-followup.md) is a historical baseline; its other obligations remain open at their recorded status.

## Implemented increment

| Requirement | This increment | Remaining boundary |
| --- | --- | --- |
| FT03 | Token deprecation and migration guidance; metadata edits retain stable expression bindings; existing usage continues | Complete only within the current token authoring profile; cross-project migration is separate |
| FT07 | Property/composite dependencies join validation, rename/export, usage, delete/replacement and the base relationship tree | Full selected-theme graph mutation/navigation remains |
| FT08 | Nested groups, inherited type/deprecation, explicit root, normalized local group inheritance; whole and token-value property references; supplied-file Resolver composition with set/modifier/context/default/order and atomic token replacement | Non-value document pointers, property-granularity self references, editable Resolver graphs and official full-corpus conformance remain |
| FT12 | Native JSON file selection/paste, deterministic preview, conflict choices, prefixes, reviewed import and preserved sources; selected-context reference/resolved export | Complete multi-context Resolver export and lossless authoring of all DTCG constructs remain; full ADS export preserves the authored system |

No changes in this increment mark FT11 policies/exceptions, FT14 full standard comparison, custom instance/slot injection, trait/behavior graphs, four-edge layout, native motion, or complete target realization as implemented.

## User flow

Open **Foundation → Files → Import**. Choose a JSON file or paste it. Preview is read-only. Choose **Keep existing**, **Update values**, or **Reject conflicts**. An optional prefix avoids naming/type conflicts. Apply import adds one proposal; the existing review flow saves it and supports Undo/Redo. Existing identities, classifications and theme overrides survive value updates.

For a Resolver file, supply its referenced JSON files and choose context chips. Only the selected permutation becomes editable base tokens. The definition and supplied strings are preserved alongside the normalized token source. Nothing fetches external URLs. A missing source or unsupported construct rejects adoption and leaves the project unchanged.

Property-bound and composite tokens expose source-token and source-property controls. Their optional expression editor uses Axiom stable IDs, so a token rename does not break a binding. A name/description/lifecycle change preserves the expression. Invalid input remains recoverable through the common draft reset. The Files staging buffer is separate from project edits and does not block unrelated review.

**Export** produces the selected theme with either live references or resolved values. This export explicitly omits other theme definitions, groups, classifications and policy data. The top-bar project source bundle preserves the whole ADS system. Preserved originals are downloadable separately and are not represented as exports of subsequent edits.

## Evidence and limits

The new core regression suite exercises inheritance and explicit roots, metadata/deprecation, live property/composite propagation across contexts, reference paths and rename export, atomic conflicts and identity retention, deletion/replacement, Resolver order/default/invalid inputs, supplied sources, forbidden references, cycles and work limits. The existing unsupported-input tests retain negative cases for genuinely unsupported/malformed constructs and gain positive cases for newly supported groups and dotted names.

Browser evidence uses disposable databases and real file inputs. It covers import preview without project mutation, reviewed save/Undo/Redo, metadata edits that preserve expressions, live source updates, deprecation, invalid expression/reset, Resolver file/context adoption, conflict/prefix recovery, export controls and both themes at desktop/mobile sizes. It does not inspect or overwrite the owner's stored project. Synthetic browser gestures remain distinct from physical trackpad evidence.

Execution results, screenshot review and final source hashes are recorded in the adjacent continuation JSON after verification. The earlier follow-up hashes are deliberately not rewritten.

Final local execution passed 358 unit tests, all 18 workbench flows, browser storage, Studio, build, strict source/schema checks, target consumers and the repository integrity/negative gates. The [independent finish review](foundation-interchange-finish-review.md) scored its sole mobile-tab correction R1 resolved/ship. The [design agreement check](foundation-interchange-design-check.md) records the reused primitives and preserved cascade exceptions. This scoped evidence does not close the remaining Foundation inventory.

Primary specifications: [DTCG Format 2025.10](https://www.designtokens.org/tr/2025.10/format/) and [Resolver 2025.10](https://www.designtokens.org/tr/2025.10/resolver/). Local positive/negative fixtures are authored from these contracts; they are not an official certification corpus. Read/preserve, interpretation, editing, preview and target runtime remain separate claims.
