# Studio accumulated-history save performance

This follow-up fixes a delay exposed by the blueprint increment's remote quality gate. It changes storage read cost and the editor's public snapshot query, with no visual changes, journal pruning, timeout increase, format migration or reduction in validation scope.

## Failure and reproduction

The blueprint implementation at `81b276217a9d91f7591a990d424184cdb9dea808` passed its local 29-case workbench run, then failed the expanded workbench step on both Windows and Ubuntu in [quality-gate run 88](https://github.com/Rengod95/Axiom-Design-System/actions/runs/34846796638). Later catalog saves exceeded the existing 30-second condition while their review dialog still displayed Saving. The earlier local evidence remains historical evidence for that commit, not a claim that its remote gate passed.

A disposable Chromium fixture reproduced the problem with 2× CPU throttling and the original editor-completion → chrome → catalog sequence. Before catalog creation, the journal contained 21 commits and a 7,670,130-character latest snapshot, including retained candidates, receipts and undo records. Checkbox saved in 24,163 ms, TextInput in 28,851 ms, and Card exceeded 30,361 ms. Card was already durable at journal sequence 32; the final editor refresh was still reading. Roughly 29,900 ms was spent in main-thread long tasks, with negligible layout time. No user database was changed by this fixture.

## Correction and guarantees

Every journal read still checks every retained commit's UTF-8 bound and well-formed Unicode, content hash, metadata hash, sequence, parent linkage and advisory head. A cold snapshot still undergoes complete canonical and kernel-shape validation. The existing bounded validation cache now also avoids repeating that semantic decode for an identical latest snapshot. Its identities are immutable, privately minted and bound to the exact validated digest; caller-supplied or transplanted identities cannot authorize the shortcut. The latest state is freshly parsed, so callers never receive a shared cached object. All history remains stored.

`CommandService.getAuthoringSnapshot` authenticates before I/O, captures the actor identity, and returns isolated project documents and actor-scoped authoring metadata from one store read. It excludes other actors' candidates, private approval tokens and inapplicable undo/redo handles. Existing public queries remain available. Studio uses this combined query instead of two complete journal reads and a revision-mismatch retry loop after every save or refresh.

The snapshot is coherent at its read point. Another tab may commit after that point; the next refresh adopts its revision, and authoritative writes continue to reject a stale expected revision. A refresh that finishes after a new local edit or adopted revision cannot overwrite it. This is not a promise of a permanently current cross-tab view.

## Verification

The synthetic storage benchmark uses a 29,383,709-byte state with 40 retained candidates and 40 complete undo records. Warm reads changed from 1,349/1,322/1,326 ms to 287/310/280 ms. This isolates repeat decoding cost; it is not an end-to-end save estimate or a bound for unlimited journal growth.

Targeted storage and codec checks passed 34/34, including corruption, forged cache identities, caller isolation, crash boundaries, exact receipt replay, cross-connection conflicts, undo/redo and cold reopening. The combined authoring/controller checks passed 26/26, including authentication before I/O, actor capture, private metadata, detached source/history results, pending refresh races and stale-base recovery.

The identical accumulated fixture at 2× CPU throttling now saves Checkbox in 17,785 ms (26.4% faster), TextInput in 21,669 ms (24.9% faster) and Card in 26,357 ms. It still exceeds the original 30-second condition at Calendar (31,753 ms); the diagnostic read then observes the dialog closed, no active transaction, and the durable 35-commit/16,470,562-character journal. Tree, DonutChart and reload are not reached in this throttled run. This is a measured remaining stress limit, not a passing end-to-end 2× result. Neither fixture history nor waits were changed.

Final local checks passed: 390 unit tests without failures or skips; strict schema/TypeScript/module boundaries (169 source files, 20 negative cases); 154-input build; real Chromium storage and Studio; and all 29 unthrottled workbench cases in 278,397 ms. The previous implementation's local full run was 350,758 ms. The full run includes later catalog entries and reload, unlike the separately reported throttled stress run. Representative Web and React Native consumer checks also passed. Frozen-reference checks preserved 442 files and rejected 10 negative cases; Foundation integrity verified 56 documents, 2,423 checks and 17 negative cases. No canonical test waits or fixture history were changed.

Remote per-commit results are recorded on [PR 30](https://github.com/Rengod95/Axiom-Design-System/pull/30), separately from these local and historical blueprint results. The independent blueprint visual verdict remains scoped to the unchanged visual implementation. React Native checks cover type and Hermes bundles; SwiftUI/Compose device compilation, complete Foundation and provider-runtime certification remain outside this evidence.

## Fresh-write proof reuse — 2026-09-15

The later component-editing gate again exposed accumulated save latency on the Windows runner. In run34929111812, the DonutChart Apply wait crossed its deadline, while the already-performed diagnostic read reported Saved in this browser, no review strip, no invalid input and no operation error. This did not establish a retained form-draft defect. The diagnostic read now samples the same completion predicate once more and accepts only if it is true; no additional delay or enlarged timeout is introduced. A still-incomplete or erroneous save continues to fail.

`createBrowserCommit` now records the private digest-bound identity after the complete encode canonical/shape proof succeeds. Its first subsequent read can reuse that proof, just as later warm reads already do. Validity is cached, not adoption: a failed IndexedDB transaction remains rolled back. Every stored byte, Unicode/size bound and lineage is still checked, cold connections still perform full validation, and every returned state remains freshly parsed and isolated.

All 29 browser-store tests passed, including a first-read versus cold-connection structural-walk comparison, input/output isolation, changed bytes with and without rewritten digests, aborted writes and existing forged/transplanted identity and fault cases. Strict TypeScript and the 177-input build passed. The same full 37-case Windows workbench passed before and after the cache change: 459,635 ms versus 434,549 ms (5.46% faster). Its six-component catalog phase changed from 142,762 ms to 135,669 ms (4.97% faster). The subsequent real Chromium storage/restart regression passed in 3,170 ms. This is an incremental improvement; hashing all retained history remains a measured cost. The full product run preceded the final diagnostic-predicate sample, whose pass condition is unchanged.
