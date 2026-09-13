# Studio workbench implementation evidence

Date: 2026-09-13. Baseline: PR #29 merged at `e72dfb11aa29bc051c92c87d52224f98c64c33fa`. Scope authority: [ADR-0015](../adr/0015-studio-workbench-and-catalog-authoring.md). The owner chose direct implementation in code and both light and dark themes.

## Complete audit, bounded implementation

The [audit ledger](editor-completeness-audit.md) preserves the pre-extension status of 119 concrete editor requirements across all 56 Foundation bodies. It covers 239 catalog identities, 330 provider rows and 45 families. Baseline findings are not rewritten as completion percentages. This implementation adds the following observed capabilities:

| Area | Implemented behavior | Boundary |
| --- | --- | --- |
| Foundation | 13 structured token types; 14 color-space channel editors; sRGB hex/picker; units, font lists, easing and compound fields; alias/literal conversion, compatible rebind, metadata, domain/tier CRUD, replacement deletion, duplicate, search/filter/sort and selected-token classification | Partial-value/group inheritance and full DTCG Resolver semantics remain unsupported |
| Themes | Axis/context/named-set creation and management, context copy/rename/delete, explicit overrides, order, comparison, provenance and known usages | Cartesian context validation is capped at 128; exceeding data remains visible for repair |
| Catalog | All 239 identities are browsable with kind/family/provider provenance; all 209 component entries create detached component/Web/Mobile source; create, copy, delete and property edits enter common reviewed changes | Parts/templates/utilities are reference entries; inventory and editable structure are not complete interaction conformance |
| Inspector | Component name/purpose/content, selected Part name/order, layout and seven visual properties, compatible token bindings; catalog Part/value lifecycle, size policies, a11y label/description and motion fields | Existing builtin contracts retain protected semantics; full event/state graph, slot composition, motion timeline and advanced layout authoring remain separate work |
| Canvas | Pointer-centered 10–400% zoom, pan, fit all/selection, percentage input, grid/snap, shift and marquee multi-selection, frame move/resize, keyboard movement and alignment/distribution | Viewport is session UI state; arbitrary scene grouping, locks/hide persistence, clipboard interchange, rulers and advanced nesting are not implemented |
| Axiom UI | SUIT variable font, semantic light/dark roles, reusable controls, source/review/export overlays, command search, Korean/English, reduced motion and separate small-screen panels | Chromium evidence; no screen-reader or OS IME certification |
| Transaction integrity | Mixed document creation/update/deletion, one reviewed apply/Undo, draft Undo/redo, stable-ID rebase, preserved invalid inputs, source draft capture and restart | No hosted collaboration, external AI/provider connection or automatic native installation |

The [Axiom UI specification](../../apps/studio/DESIGN.md), machine-readable sidecar and reference surface describe the editor's own system. Authored Foundation themes remain separate from Studio appearance preferences. Primary design references are [Linear](https://linear.app/), [Geist](https://vercel.com/geist/introduction), [Figma view controls](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options) and [Apple HIG](https://developer.apple.com/design/human-interface-guidelines). Font ownership is recorded in the [dependency notice](studio-dependency-notice.md).

## Source targets and actual consumers

React emits native HTML contracts; React Native uses declared platform controls and typed request APIs. SwiftUI and Compose have bounded platform source emitters. Generated controlled values issue requests and leave adoption to the consumer. The target gate refuses unknown specialized kinds, unimplemented geometry (including Grid/SimpleGrid and radial progress variants), custom parts/ports, unsupported slot/order changes, native internal-part styling/pressed overrides and customized catalog motion. Rejection produces no partial output.

`pnpm test:targets` passes on Windows with React 35 semantic representatives typechecked, SSR/hydration and 14 real Chrome cases including Checkbox, Korean Input, Select keyboard input, Tabs focus/hidden panels and Dialog Escape/focus restoration. React Native 22 representatives typecheck and bundle Android/iOS Hermes in the independent locked Expo fixture. SwiftUI and Compose each generate 18 representative source forms; their compilers and devices have **not run**. These representative counts are neither catalog entry counts nor platform certification.

## Regression and visual evidence

The original Studio Chromium suite retains reviewed edits, rejection, named themes, browser composition, source recovery/capture, runtime interactions, all four ZIP downloads and process restart. The new `scripts/verify-workbench.mjs` uses an isolated browser profile and covers typed invalid input retention, aliases, bulk classification, themes/overrides/Undo, library creation, zoom/pan without a revision, frame review/Undo, dirty-form management guards, hex editing, bundle contents and normal-shutdown preference/data persistence. Missing required browsers fail instead of being silently skipped.

The visual batch covers 1440px light/dark canvas and Foundation, 1090px dark Foundation and three 390px panel states. SUIT loads locally and no document overflow was observed. An independent reviewer read all seven screenshots. Its three concrete control-boundary/metadata-layout issues were repaired in one batch and confirmed. See the [finish review](workbench-finish-review.md). The manual Impeccable detector and separately reviewed Inspector returned no findings.

The final local product suite passes 332 tests. Reproducible commands remain the complete [repository checks](../../AGENTS.md): both retirement checks, Foundation self-test, strict/module/schema checks, product tests, build, browser storage, original Studio, expanded workbench and target consumers. Generated evidence lives in `dist/evidence/` and `dist/target-verification/evidence.json`; Windows and Ubuntu CI retain those artifacts.

## Repeated-edit performance and integrity

The expanded browser workload exposed repeated semantic decoding of every historical browser journal snapshot on every operation. The store now caches only the validated identity associated with a state digest, with at most 1,024 entries and 1,024 identity characters per entry. Larger compatible identities simply skip the optimization. Every read still checks each record's shape, sequence, lineage, metadata digest and full source digest. The latest returned state is freshly decoded and detached. There is no cached mutable project snapshot or trusted-head shortcut.

An allocation-free core UTF-8 preflight precedes hashing: it rejects oversized text and lone UTF-16 surrogates, preventing TextEncoder replacement from making malformed text share a digest with U+FFFD. Warm/cold malformed-ancestor, rehashed invalid-state, oversized-input, caller mutation, corruption, concurrent transaction, abort and restart regressions pass. The physical format and stored bytes are unchanged.

The identical expanded workload measured 178.3 seconds before the cache, 100.2 seconds with the initial cache and 82.75 seconds in the final preflight-protected run, including 20+ review/history operations and browser restart. Those measurements are local whole-scenario timings, not interaction p95 or a cross-platform performance guarantee; the final run also adds actual catalog Checkbox simulation and cross-panel dirty guards. Larger histories, cold opening and full workload benchmarks remain tracked by the audit.

## 2026-09-14 editor completion correction

The owner-reported property input deadlock now has a named recovery path. Valid buffered forms enter shared review directly; invalid lexical input remains intact until repaired or reset, and same-value component edits do not create history. The [follow-up ledger](editor-completion-followup.md) preserves all 119 requirements and verifies unchanged hashes for all 56 Foundation bodies.

The curated kit adds 153 tokens across 11 domains and 13 types. New projects connect the original nine sample identities to it; existing projects adopt missing tokens without overwriting prior values. Domain pages, primitive/semantic relationships, named-theme management, optional advanced settings and suggested value chips use the same projection. Custom Part nesting/text/order/slot declarations and typed typography/shadow/gradient/border/transition rules have source edits. React custom layouts emit nested escaped content; unsupported native effects/slots remain explicit rejections.

Motion tracks support bounded tween/spring timing, duration/easing tokens, keyframes, delay, interruption and reduced alternatives. The actual browser player offers play/pause/scrub/step/reset. Behavior graph triggers, stagger, completion effects and target runtime output remain open. The preview uses [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate); opaque authored color-pair diagnostics use the [WCAG contrast calculation](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), without claiming a full accessibility pass.

Current local product tests: 343, zero failures/skips. The expanded workbench has 16 real Chrome flows including full onboarding, direct review of pending bindings, invalid Inspector reset/review recovery, SVG specimens, anchored Ctrl-wheel without page-scale/revision change and actual animation handles. The correction-verdict run completed in 103.10 seconds. It also verifies readable design/property usage labels and Mobile/Part navigation without revision changes. This is a scenario timing, not an interaction latency guarantee. Ten screenshots cover 1440, actual 1312 and mobile 390 widths in both themes. Physical trackpad hardware, native compilers/devices and manual AT remain unverified.
