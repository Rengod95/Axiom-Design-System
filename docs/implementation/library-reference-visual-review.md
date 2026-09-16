# Library reference visual review

Final disposition: **ship — scoped to the two scored visual fixes and the requested Chart layout check**. Initial disposition: **fix**. Review date: 2026-09-15. Independent reviewer: `/root/reference_visual_review`.

This is a bounded visual finish review of the Library reference work, not a complete product audit or runtime certification. A fresh in-app browser tab inspected the built app at `http://127.0.0.1:4318/?database=axiom-studio-test-reference-catalog` using the existing disposable **Reference QA** fixture. Desktop captures use 1440 × 1000; mobile captures use 390 × 844.

The reviewer made no application-source edits and did not create, add, delete, or edit project content. An initial attempt to create a separately named disposable project was rejected by automatic approval review; the review continued by navigating the existing populated fixture supplied by the parent. Search, selection, pane navigation, zoom-to-selection, and appearance/preview-theme changes were used for inspection. The existing inserted Checkbox was inspected instead of independently testing insertion. No real user project or external browser tab was changed.

## Persistence

`apps/studio/PRODUCT.md`, `apps/studio/DESIGN.md`, and `apps/studio/.impeccable/surfaces/workbench.md` were read. This extends the established code-first workbench, so no image comp or replacement design system applies. The Impeccable context command was not repeated. No detector was rerun by this reviewer; deterministic checks belong to the parent/test agents.

The incumbent Studio palette, typography, optical corners, compact controls, and pane layout remain the design authority. Provider references are separately rendered examples, not new Studio design tokens. `DESIGN.md` and `.impeccable/design.json` were preserved.

## Fidelity

| Area | Result | Observed evidence |
| --- | --- | --- |
| Library preference and deduplication | Match in sampled results | Sidebar shows 225 entries and component filter shows 196. Checkbox search returns one shadcn Checkbox and the distinct React Aria CheckboxGroup; Accordion has one result. Button and Card each have one canonical same-name result plus distinct related controls. |
| Original structure | Match in sampled examples | Checkbox contains the four official examples; Card is the login form; Accordion contains shipping/returns/support sections; Button contains the default button and submit icon; Mantine ActionIcon shows its settings icon. |
| Provider colors | Match | shadcn light checked control is black and dark checked control is pale neutral; Mantine ActionIcon remains blue. Studio green appears in navigation, actions, and the canvas selection outline. It does not recolor the reference default controls. |
| Type | Match for Studio; detail defect below | Studio retains compact Geist/SUIT text. Provider type remains distinct. The initial 280px detail iframe squeezed the Card to roughly 154px usable content. |
| Material and ground | Match | Studio remains neutral flat glass. Reference frames are opaque provider light/dark surfaces. No faux texture or ornamental replacement was introduced. The canvas outer backdrop follows project theme independently. |
| Library detail layout | Contradicted in initial build | Desktop Card wraps its title and description into one or two words per line; Password and Forgot-password text overlap. Checkbox begins with a clipped first row in both themes. |
| Thumbnail composition | Contradicted in initial build | shadcn Button occupies about 30px in a roughly 210px tile while Mantine CopyButton occupies about 150px. ActionIcon and CloseButton are enlarged and visibly soft. Card and Accordion remain recognizable but their text is very small. |
| Inserted canvas | Match for existing Checkbox | At 100% zoom its 640 × 520 artboard contains a 616px-wide reference iframe and all four examples, without clipping. Source attribution is visible. |
| Canvas preview theme | Match | Light preview uses `theme=light` while Studio is dark; selecting Dark changes the iframe to `theme=dark`. The reference retains neutral control colors in both. |
| Responsive access | Match in sampled path | At 390 × 844, Browse / Workspace / Inspect pane navigation remains available, search and two result tiles fit, and the full-width Checkbox detail is readable. `document.documentElement.scrollWidth` equals 390. |
| Editing boundary | Explicit | Existing Checkbox inspector states that text, appearance, and layout are editable; public values, variants, behavior, and target output require separate mapping. Runtime/native export was not certified by this visual review. |

## Ceiling

The sampled canvas and mobile pane composition meet the workbench's existing visual direction. The initial desktop detail presentation and inconsistent thumbnail occupancy weaken recognition of the original examples. These are the bounded correction list; no additional visual redesign is called for.

## Material fixes

1. **P1 — Give original examples a viable preview width.** The initial desktop detail iframe clips Checkbox and collapses Card into overlapping labels. Preserve upstream component styles while providing a larger preview presentation or a safe intrinsic viewport. Evidence: `desktop-checkbox-dark.jpg`, `desktop-checkbox-light.jpg`, and `desktop-card-dark.jpg`.
2. **P2 — Normalize thumbnail occupancy without enlarging tiny captures.** shadcn Button is nearly invisible while small Mantine controls become oversized and soft. Capture actual content with bounded padding and sufficient resolution, using consistent visual occupancy. Evidence: `desktop-button-dark.jpg`, `desktop-mantine-dark.jpg`, and `desktop-mantine-light.jpg`.

The parent accepted both findings. The correction build provides an 820px original-example modal, a mobile fit-to-width view that preserves the intrinsic provider viewport, an optional 100% view with local scrolling, `scale-down` thumbnails, and shadcn captures of actual demo bounds. Chart 72's provider host layout was also corrected.

### Final verdict

On the resumed review turn, the in-app browser was unavailable to the reviewer. A fresh surface inventory and one runtime reset exposed Chrome only, which does not contain the populated review fixture. The reviewer did not create another project or move the fixture. The parent therefore captured the seven final images below from its active in-app browser and the same disposable fixture. The reviewer opened and visually scored those actual files independently, verified their dimensions, and did not claim independent browser actions in this final round. The parent reported closing the dialog and restoring its viewport.

| Scored item | Verdict | Visible evidence |
| --- | --- | --- |
| P1 — Original-example preview width | Resolved | Desktop Card has separated Password/Forgot-password labels and all form actions; Checkbox shows all four rows. Mobile default-fit captures show each complete example with no initial right-edge loss. The optional 100% Card view visibly provides local horizontal scrolling for inspection. |
| P2 — Thumbnail occupancy and unnecessary enlargement | Resolved | Button, Button Group, Toggle and Toggle Group are recognizable at useful size. Mantine CloseButton stays small and sharp; CopyButton retains a proportionate control size rather than filling its tile. The severe provider scale disparity from the first pass is gone. |
| Requested Chart 72 host-layout check | Resolved | The desktop Chart modal shows its title, both totals, the full bar plot and date labels from Apr 3 through Apr 30. The plot is neither collapsed nor cropped. |

No regression was observed within this correction list. **Remaining: clear for these scored items.** This verdict does not certify all 225 entries, keyboard/assistive-technology behavior, public-value mappings, insertion transactions, exported targets, or later source changes outside the reviewed presentation.

## Keep

Keep shadcn-first canonical entries, provider attribution, opaque style isolation, the distinction between Studio appearance and project preview theme, and the explicit unmapped runtime/export boundary.

## Screenshot evidence

All paths below are relative to the repository root and contain actual browser captures. Captures are local verification artifacts under ignored `dist/evidence/`; the phase inventory permits Markdown/JSON in `docs/` and therefore excludes these raster files from the active tree. Paths are recorded as code rather than repository links because fresh clones do not contain local evidence. A transient first capture immediately after the mobile viewport resize was replaced with a valid 390 × 844 capture after geometry verification.

| Capture | Evidence |
| --- | --- |
| Desktop Checkbox, dark — `dist/evidence/library-reference-review/desktop-checkbox-dark.jpg` | Two distinct search results; initial clipped detail |
| Desktop Checkbox, light — `dist/evidence/library-reference-review/desktop-checkbox-light.jpg` | Original neutral checked control; same detail defect |
| Desktop Button, dark — `dist/evidence/library-reference-review/desktop-button-dark.jpg` | Canonical Button and related controls; occupancy disparity |
| Desktop Card, dark — `dist/evidence/library-reference-review/desktop-card-dark.jpg` | Original login form; initial overlapping labels |
| Desktop Accordion, dark — `dist/evidence/library-reference-review/desktop-accordion-dark.jpg` | Single canonical entry and recognizable official structure |
| Desktop Mantine, dark — `dist/evidence/library-reference-review/desktop-mantine-dark.jpg` | Blue ActionIcon remains independent from green Studio |
| Desktop Mantine, light — `dist/evidence/library-reference-review/desktop-mantine-light.jpg` | Provider light theme and enlarged thumbnail |
| Mobile Library, light — `dist/evidence/library-reference-review/mobile-library-light.jpg` | Pane navigation, fitting filters, and two result tiles |
| Mobile Checkbox, light — `dist/evidence/library-reference-review/mobile-checkbox-light.jpg` | Readable full-width detail |
| Mobile Checkbox, dark — `dist/evidence/library-reference-review/mobile-checkbox-dark.jpg` | Provider dark theme and readable full-width detail |
| Canvas Checkbox, light — `dist/evidence/library-reference-review/desktop-canvas-checkbox-light.jpg` | Existing 640 × 520 reference with no default green recoloring |
| Canvas Checkbox, dark — `dist/evidence/library-reference-review/desktop-canvas-checkbox-dark.jpg` | Project preview theme reaches the isolated provider iframe |
| Final desktop Card — `dist/evidence/library-reference-review/final-desktop-card.jpg` | Parent capture, 1440 × 1000; wide modal resolves form-label overlap |
| Final desktop Checkbox — `dist/evidence/library-reference-review/final-desktop-checkbox.jpg` | Parent capture, 1440 × 1000; all four examples visible |
| Final desktop Chart — `dist/evidence/library-reference-review/final-desktop-chart.jpg` | Parent capture, 1440 × 1000; full bar plot and date labels |
| Final desktop Button search — `dist/evidence/library-reference-review/final-desktop-buttons.jpg` | Parent capture, 1440 × 1000; shadcn/Mantine thumbnail size balance |
| Final mobile Card — `dist/evidence/library-reference-review/final-mobile-card.jpg` | Parent capture, 390 × 844; complete default-fit example |
| Final mobile Checkbox — `dist/evidence/library-reference-review/final-mobile-checkbox.jpg` | Parent capture, 390 × 844; complete default-fit example |
| Final mobile Card at 100% — `dist/evidence/library-reference-review/final-mobile-card-actual-size.jpg` | Parent capture, 390 × 844; local horizontal scrolling for actual-size inspection |
