# Foundation interoperability finish review

## 1. Disposition

**ship — R1 resolved.** The same reviewer scored the single requested navigation correction resolved in the first fix-list verdict pass. This closes the material fix list from the initial review of the new Foundation interoperability UI increment. It is not a fresh whole-surface audit and does not assess completion of the 119 Foundation requirements, full DTCG conformance, or native execution.

All nine refreshed required captures were opened and are valid evidence for their named states. Both 390px captures now show the complete selected Files label and underline. The initial disposition was **fix** for R1; the initial assessment and finding are retained below with the final score and evidence.

## 2. Brief alignment

The increment follows the established Operate editor contract in `apps/studio/PRODUCT.md`, `apps/studio/DESIGN.md`, `apps/studio/.impeccable/design.json`, and `apps/studio/.impeccable/surfaces/workbench.md`. The SUIT hierarchy, neutral panel surfaces, restrained violet actions, shared field boundaries, disclosure sections, and measured spacing remain coherent across the light and dark captures.

Files presents a readable source → preview → apply flow, with conflict choices next to the proposed change and a secondary prefix disclosure. The Resolver source files and context chips are visibly tied to the import. Property bindings expose source-token and source-property controls; lifecycle guidance remains close to the binding. Export distinguishes selected-theme output, reference/resolved choices, and preserved originals. Its scope copy directs whole-system preservation to project source. These are appropriate extensions of the incumbent editor rather than a new visual identity.

The continuation document retains the boundary between the implemented interchange profile and outstanding Resolver/conformance work. No approved raster comp exists; the established design artifacts are the visual authority.

## 3. Craft-floor assessment

- **Hierarchy and spacing:** Source, preview, and action groups are clear at 1600px and remain readable at the supplied 1312px width. The narrow panel flow stacks the import into a usable single column. The new CSS uses the shared type, spacing, color, and control roles.
- **Surfaces and typography:** Both palettes are consistent with the contract. Code typography is confined to token data and expression/source editing. This addition does not introduce decorative cards, shadows, kickers, gradients, or illustration substitutes.
- **Controls and state:** Native file inputs, selects, textareas, checkboxes, and shared buttons provide appropriate editing affordances. The source provides empty, disabled, import-error, apply-status, invalid-expression, reset, and download-error states. The supplied isolated browser record exercises invalid-expression reset and import/conflict recovery. Their appearance is not fully captured.
- **Keyboard and browser details:** Shared focus, selection, caret, and theme rules are present; context/conflict choices use pressed-button state. TabBar retains roving tabIndex and Arrow/Home/End handling. The initial selected-tab visibility defect is resolved by R1's correction, scored below. No live keyboard or assistive-technology execution was performed by this reviewer.
- **Motion and constraints:** The restrained shared interaction transitions and reduced-motion override fit the Operate brief. No new entrance animation obscures the captures. The detector has no primary findings; its one advisory concerns the pre-existing 18px authored typography specimen and is not a new UI text role.

## 4. Actionable material findings

### Final fix-list verdict — first correction round

| ID | Score | Evidence and judgment |
| --- | --- | --- |
| R1 | **resolved** | The refreshed `mobile-dark.png` shows the whole Files label and underline inside the strip immediately after resizing; `mobile.png` shows it fully visible after the keyboard sequence. `apps/studio/src/ui.tsx:42` now observes the strip and selected item, reveals selection on value/layout changes, and skips zero-width strips until visible. It changes only the strip's `scrollLeft`; keyboard focus uses `preventScroll: true`. The final `dist/evidence/workbench.json` records `selectedTabVisibleOnResizeAndKeys: true` and `tabKeysPreserveParentScroll: true`. The reviewed assertions in `scripts/workbench-completion-cases.mjs:150` check selected-tab bounds after resize and Home/End/Arrow Left/Arrow Right, compare ancestor vertical scroll positions, and verify no horizontal document overflow. This satisfies the bounded correction. |

No further correction is owed for R1. Only this listed fix was scored; no new defect hunt or detector run was performed.

### Initial finding retained for traceability

The following row describes the original, superseded capture state and the acceptance criteria used for the final verdict.

| ID | Severity | Finding and source | Bounded correction | Acceptance evidence |
| --- | --- | --- | --- | --- |
| R1 | P2 | In both `.impeccable/review/mobile.png` and `mobile-dark.png` at 390×844, the active **Files** tab is clipped against the right edge while its content is open. This hides part of the current location and its selected underline. `apps/studio/src/ui.tsx:42` renders TabBar without keeping the active tab visible after layout changes; `apps/studio/src/ui-system.css:59` makes the strip horizontally scrollable, and `apps/studio/src/foundation-panel.tsx:44` now places Files near its far end. | Keep the selected tab fully visible when selection or tab-strip size changes, including desktop-to-mobile resize and a previously hidden panel becoming visible. Limit scrolling to the tab strip so independent vertical panel positions remain intact. Preserve the current roving-tab and keyboard behavior. | Recapture the same required files after the batch. Both 390px captures must show the complete selected Files label and underline inside the strip. Add a focused browser assertion for selected-tab bounds after resizing and Arrow/Home/End navigation; confirm the document does not gain horizontal overflow and the parent panel does not jump vertically. |

R1 was the complete material fix batch from the initial review. The same reviewer has now scored it resolved against the recaptured evidence; this fix-list verdict is not a new whole-surface audit.

## 5. Evidence coverage and limitations

| Required capture | Reviewed coverage |
| --- | --- |
| `desktop.png` | 1600×1080 light import, native source file, populated preview, conflict choices, apply action |
| `mobile.png` | 390×844 light Workspace panel, source flow, complete selected Files tab after keyboard navigation |
| `mobile-dark.png` | 390×844 dark counterpart, complete selected Files tab after resizing |
| `user-1312.png` | 1312×958 dark import/prefix state with property binding and lifecycle inspector |
| `property-binding-light.png` | Selected property-bound token, source/property fields, preserved metadata, lifecycle section, apply action |
| `property-binding-dark.png` | Dark counterpart with readable selected token state |
| `resolver-dark.png` | Resolver file, supplied source, context chips, import preview and lifecycle controls |
| `export-light.png` | Resolved-value output choice, selected-theme scope copy, preserved-source disclosure |
| `export-dark.png` | Reference-preserving output choice and dark counterpart |

The reviewer opened the captures under `.impeccable/review/`. After the verdict, the builder verified identical file hashes and archived them under `dist/evidence/interop/`; the temporary review copies were removed. Property captures intentionally focus the selected token; other panes retain independent scroll. These are valid task-state captures, not malformed document-top captures.

`dist/evidence/interop-isolated.json` records the initial PASSED Chromium execution for reviewed import/Undo/Redo, live property/composite behavior, metadata preservation, deprecation, invalid-expression reset, supplied-file Resolver/context import, export control modes, invalid-source recovery, prefix/conflict recovery, both themes, and the listed viewport widths. The final `dist/evidence/workbench.json` was independently read in the verdict pass and records PASSED execution of all 18 workbench cases, including both interchange cases and the new R1 assertions. `scripts/workbench-completion-cases.mjs` was read to verify the focused assertion coverage. The reviewer did not rerun the suite. The builder separately reports passing check/build/studio commands and 358 unit tests; those results were not independently rerun or used to broaden the fix-list verdict.

No screenshot displays all error/disabled/empty states, an expanded preserved-source download list, the mobile import preview below the fold, or a mobile inspector. Those states are supported by source and the bounded browser evidence where noted, not independently visual-certified here. No screenshot or isolated browser record establishes full DTCG conformance, all 119 requirements, physical trackpad/IME behavior, screen-reader usability, or native target execution. No product code was edited during this review.
