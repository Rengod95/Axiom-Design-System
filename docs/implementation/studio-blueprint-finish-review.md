# Studio blueprint finish review — 2026-09-14

## Capture validity

The initial review opened all 30 supplied captures. For the bounded B1/B2 verdict pass, `dist/evidence/blueprint-confirm-capture.json` reports `PASS` with 31 captures and no browser-console errors. Every replacement PNG was reopened individually and its dimensions checked: 26 desktop captures are 1920 × 1080 and five mobile captures are 390 × 844. None is blank, half loaded or assigned to the wrong surface. The panel-based editor deliberately retains local scroll positions, including the semantic sections, tooltip, selected component and narrow token views.

All paths below are under `dist/evidence/`, with prefix `blueprint-confirm-` and suffix `.png`:

| Group | Captures inspected |
| --- | --- |
| Domain and color | `domains-dark`, `domains-light`, `color-dark`, `color-inspector` |
| Material and dependency | `connections-dark`, `connections-light`, `spacing-dark`, `sizing-dark`, `radius-dark`, `border-dark`, `shadow-dark`, `typography-dark`, `typography-scale` |
| Canvas | `canvas-dark`, `canvas-project-dark`, `dock-tooltip`, `interact-dark` |
| Library | `library-dark`, `library-color`, `library-chart`, `library-calendar`, `library-tree`, `library-input` |
| Created components | `created-calendar`, `created-tree`, `created-donutchart` |
| Mobile | `sidebar-mobile`, `domains-mobile`, `color-mobile`, `inspector-mobile`, `color-mobile-light` |

The earlier contact sheets and baseline captures were not substituted for these final files. A final focused replacement of `canvas-dark`, `canvas-project-dark` and `interact-dark` was subsequently opened again. `blueprint-verdict-capture.json` records those three captures as `PASS`, with no errors and measured Interact-control contrast. Both confirmation stages are valid evidence for this review.

## Direction/quality-bar assessment

This is a new review of the current blueprint increment, evaluated against the current `PRODUCT.md`, `DESIGN.md`, workbench surface contract and the request table plus Library Truth in `docs/implementation/studio-blueprint-workbench.md`. The later Geist/achromatic/fluorescent-green direction supersedes the earlier violet identity. This continuing code-first brief has no approved raster comp, so the review does not invent a pixel-matching target.

The material system now expresses the domains distinctly: one measured drawing per domain, square shade scales, shared ruler origins, corner samples, horizontal border samples, a common shadow plane and authored typography. Primitive and Semantic sections establish a readable hierarchy. The desktop brand scale fits one row; mobile retains local horizontal access while the document stays within its pane. Library specimens now distinguish the sampled color, chart, tree, calendar and input families. The created Calendar has aligned weekday columns and recognizable structure; created Tree and DonutChart preserve their identities and visibly state their structural limitations.

The neutral chrome, restrained panel boundaries, optical corners, mode labels and contextual dock are coherent with the brief. Source and supplied execution evidence support meaningful sidebar, scroll and slider actions. The initial review found two material failures: the preview backdrop falsely extended the apparent authored shape, and the newly suggested green starter produced insufficient text contrast in its light theme. The bounded verdict below assesses those corrections and their direct regressions only.

## Material findings with priority and exact source/capture

| ID | Priority | Status | Finding |
| --- | --- | --- | --- |
| B1 | P2 | resolved | Separate rectangular artboard, authored transparency and readable Interact controls |
| B2 | P2 | resolved | Generated action labels now exceed 4.5:1 in both default themes |

**B1 — initial finding.** In the initial `blueprint-confirm-canvas-dark.png` and `blueprint-confirm-interact-dark.png`, the small green Button appeared attached to a full-width white rounded bar. That bar was introduced by `.frame-content .component-root` at the then-current `apps/studio/src/studio-chrome.css:36`, which applied the project surface and Studio control radius to the un-authored wrapper. `apps/studio/src/preview.tsx:52` contains the separate authored Button within that wrapper. The result communicated a different control silhouette from its actual selected root. The same issue made the transparent Tree root look like a white rounded surface in `blueprint-confirm-created-tree.png`, while the inspector displayed alpha 0.

Required correction: keep the resolved project backdrop on a clearly separate rectangular artboard/preview plane, with sufficient contrast for any preview metadata. Preserve the authored root's transparency, bounds and radius. The verification must show the Button without an attached white bar and the transparent Tree against a visibly separate backdrop; source geometry and project revision must remain unchanged.

**B2 — initial finding.** `apps/studio/src/foundation-starter-panel.tsx:7` suggests `#8DFC52`. In the initially reviewed `modules/ads-core/src/foundation-starters.ts:45`, the light action background aliased `color.brand.600`, which resolves to approximately `#78D646`; line 46 still aliased its foreground to white `color.neutral.0`. The standard sRGB relative-luminance contrast of those displayed colors was 1.825:1, below the craft floor's 4.5:1 for this label. The initial white Korean Button label in the canvas and Interact captures demonstrated the default outcome. This is the application's newly generated starter, rather than an arbitrary user's saved color choice.

Required correction: generate readable action foreground/background pairs for the suggested starter in both light and dark themes, using the resolved background to select an appropriate existing foreground. Preserve existing authored projects and their source. Verify the generated pair's numeric contrast and the visible default Button; do not infer an accessibility pass for every user-authored color.

These are the complete material findings from this pass. Subsequent review should score these two corrections only, with recapture validation, rather than start another general polishing round.

**Bounded verdict — B1 resolved.** Current `studio-chrome.css:36` paints the resolved backdrop on the full rectangular `.canvas-frame`. `canvas.tsx:139` receives both project background and foreground from `app.tsx:122`, and the component wrapper receives no injected background or radius. The replaced `canvas-dark`, `canvas-project-dark` and `created-tree` captures show separate rectangular artboards, the correct Button silhouette, the transparent Tree and readable metadata. The first correction propagated project foreground into Studio Interact controls at `preview.tsx:64`, causing near-black text on dark control surfaces. This direct regression was caught in the bounded pass and corrected at `studio-chrome.css:38`: `.run-controls` now has a paired Studio surface and ink. The final focused `interact-dark` capture shows readable controls within their separate control plane; the two final canvas captures preserve the corrected geometry and theme appearance. `blueprint-verdict-capture.json` records composited contrast of **10.34:1** for the response selector and **14.30:1** for “Show toast”. No listed B1 correction remains.

**Bounded verdict — B2 resolved.** `modules/ads-core/src/foundation-starters.ts:45`–62 now chooses the higher-contrast existing neutral foreground against each actual generated action background. Independent calculation from the generated sRGB channels gives **9.18785499:1 Light** and **13.30563757:1 Dark**. The replacement `canvas-dark` and `canvas-project-dark` captures show the default Korean action label in dark ink. `editor-completion.test.ts:50`, 63 and 83 cover the new default pairs, candidate selection in 532 custom accent/theme contexts, and preservation of existing saved source/overrides. The runtime Studio `--on-accent` is also explicitly paired with the green dock, visible in `dock-tooltip`. This resolves the listed default-starter defect; it does not guarantee contrast for every arbitrary authored accent.

**Remaining scope.** Neither finding remains open or partial. This verdict does not add a new surface review, waive the pending full-run status below, or resolve the separately documented Foundation and native-runtime obligations.

## Bounded checks/evidence limits

- Inspected the current product/design/surface contracts, implementation brief, Impeccable craft floor and finish guidance, the initial 30 captures and all 31 replacement captures, and relevant preview, sidebar, scroll, slider and browser-regression source. No browser was launched by this reviewer and no product source was edited.
- `blueprint-check.log` records the source boundary check passing for 169 files and 20 negative cases; `blueprint-build.log` records 154 build inputs. The current completed `blueprint-unit.log` records 386 tests, 386 passes, no failures or skips, 87082.7781ms; it supersedes the initial 383-test record. The focused contrast record is reported as 8/8 passing, including preservation and 532 candidate-selection contexts. These are supplied execution records, not tests independently rerun by this reviewer.
- `scripts/workbench-foundation-cases.mjs` checks one drawing per domain, the ten square brand stops, selected-theme source edges, shared ruler origins, actual type values, border/shadow structure, reduced motion and unchanged source revision. `scripts/workbench-chrome-cases.mjs` checks real sidebar resize/reload, overlay-scroll pointer/keyboard actions, collapsed/searchable groups, tooltip dismissal and precise/invalid slider review with Undo.
- The initial full workbench run completed with 29 cases at 392354ms. An intermediate correction-batch run failed at 287630ms because the Tree assertion still expected its wrapper to hold the backdrop. That obsolete expectation has been corrected to verify the opaque frame and transparent Tree/Button wrappers. Inspected current focused records: `chrome-controls-debug.json` is `PASSED` at 54439ms, including matching dock button/label/icon foreground; `catalog-creation-debug.json` is `PASSED` at 71632ms, including frame backdrop, transparent wrappers, source-preserving reload and distinct authored renderers. **The fresh full workbench run is still in progress at this verdict; it is not claimed passed.** The stale failed `workbench.json` belongs to the intermediate run until the new run publishes its result. Browser, Studio, targets, Python retirement and Foundation self-tests were also reported passing by the build thread. Final full-run evidence must retain its eventual actual result.
- Inspected the single `blueprint-detector.json` result: 149 findings (22 color, 57 font-size, 67 radius, two overused-font advisories, one side-tab warning). The font warnings are the user-pinned Geist/Geist Mono choice; the side-tab is the consumer Blockquote specimen at `catalog-specimens.css:37`. The literal/geometry advisories span authored specimens and legacy shared recipes; they are not asserted to be mechanically clean or all repaired. Their aggregate count does not establish another material defect in the captures. No second detector is requested.
- The library distinction remains 113 bounded semantic entries versus 96 structural adaptations among 209 component entries, within the larger 239-row catalog. A recognizable specimen or editable structure does not install or execute an upstream provider library, establish all dedicated interactions, or certify target output. The created structural examples appropriately disclose this limitation.
- Physical trackpads, OS-level IME, native compilers/devices, full assistive-technology operation, exhaustive text scaling and all-state accessibility remain outside the evidence. Full Foundation completion is not assessed. The new source and supplied captures establish this scoped increment only.

## Disposition

ship

B1 and B2 are resolved in the bounded visual verdict. The scoped blueprint increment meets the reviewed direction and quality bar on the supplied captures and focused behavior evidence. After the bounded visual verdict, the final full workbench run passed all 29 cases in 350758ms. The current result is recorded in studio-blueprint-verification.json. This does not certify all Foundation, provider-library or native behavior.

Post-verdict execution record: final full workbench PASSED, 29 cases, 350758ms; the earlier in-progress note above records the state when the independent visual verdict was issued. The final source, capture and execution hashes are in studio-blueprint-verification.json.
