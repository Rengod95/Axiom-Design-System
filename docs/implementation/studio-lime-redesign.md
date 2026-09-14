# Studio material workbench — 2026-09-14

## Direction contract

THESIS: A dark material workbench makes the actual token value the primary browsing surface. Fluorescent lime identifies selection and action; neutral planes carry editing.

OWN-WORLD: The user's navigation reference supplies the brand color, sampled from the original PNG as RGB 185/255/70 (#B9FF46). Rounded outline icons, dark pill navigation and vertically generous controls belong to Studio, independently of the user's authored design tokens. Existing explicit light preferences remain valid; first-run appearance becomes dark.

STORY: Domains lead to material specimens; a selected specimen leads to contextual value controls and visible bindings, then to the existing reviewed change. Lists remain available for comparison and bulk management.

FIRST VIEWPORT: Stable workspace rail, restrained header, grouped material sheets and a quiet inspector. The token itself is the visual anchor. No promotional hero or decorative dashboard chart competes with authoring.

FORM: Direction seed `0b6cfbbd`, Operate slot 7, with user-pinned form priority. SUIT; caption 12/18, label 13/18, body 14/22, title 18/26, heading 24/32; weights 450/550/650. Control heights 32/40/48. Related fields share rows, groups use 20–24px spacing. Shadows describe depth, glass belongs to floating tools, and lime glow belongs to active navigation. Motion explains selection, disclosure and value changes, with reduced-motion support.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Brief and references

The existing PRODUCT.md was refreshed from the user's explicit brief. Code-first implementation and both theme support were already selected. Shape is applied directly because the user asked for implementation. Direction seed `0b6cfbbd`, Operate slot 7, was resolved after one network retry. The user-pinned material-workbench direction takes priority over unrelated challenger worlds; measurement and clear wayfinding fit the brief, while record sleeves and volumetric landscapes do not. No shipping raster imagery is needed.

- User images: fluorescent pill navigation; neutral dark forms; grouped editor property controls.
- [Figma auto layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout): group direction, sizing, gap and padding; keep secondary properties progressive.
- [Webflow variables](https://developers.webflow.com/designer/reference/variables-detail-overview): typed reusable values and linked properties.
- [transitions.dev](https://transitions.dev/skill.html) and its [semantic motion tokens](https://github.com/Jakubantalik/transitions.dev/blob/main/skills/transitions-dev/_root.css): adapt smooth-out easing, short selection/disclosure transitions and reduced-motion guards. This is a source reference, not a newly installed dependency.

Read-only type and layout assessments found inconsistent compact text/control roles, stacked labels, metadata preceding actual values, and a draft-focus path that did not reveal nested closed sections. These findings guide the migration. Native selects, mounted section children, IME/invalid drafts and reviewed controller commands are retained.

## Verification

The [independent finish review](studio-lime-finish-review.md) scored its four material fixes resolved/ship: practical color/shadow controls, readable composite captions, direction-seed persistence and shared neutral control outlines. Its verdict is limited to that fix list. Static captures do not establish temporal visual approval; List rendering was not part of the visual packet.

All 19 named screenshots were validated at 1440×1000, the user's 1312×958 Korean viewport, and 390×844 in both themes. The exact screenshot manifest and final source hashes are recorded in the [verification record](studio-lime-verification.json). Local PNGs and raw logs are archived under ignored dist/evidence. No raster image ships with this redesign; specimens and icons are generated from code/SVG. The SUIT asset is the existing packaged font.

The final detector had 45 old-DESIGN advisory mismatches and one primary height-transition warning. The warning was mechanically removed; the stale design authority is refreshed by the separate documenter. No second detector was run, and this is not a claim of a clean re-scan.

This visual redesign does not establish complete Foundation, DTCG Resolver or native target coverage. The existing 119-requirement inventory and earlier evidence stay historical and unchanged.

## Seed execution note

This is a human-readable record of observed command results, not a reconstructed raw log. The first attempt in the repository root reported missing PRODUCT.md. Running in apps/studio produced degraded key `0b6cfbbd`, assigned slot 7. One network retry with `concept-seed --scope direction --mode operate --from 0b6cfbbd --candidate-count 7` succeeded with source `api`, pool `c3b204a1eed6`, assigned slot 7. The tool output was not saved separately. The explicit user brief took priority over unrelated challenger forms.


## Implemented behavior

- Domain directory and token atlas reuse the current Foundation projection. All 13 literal types receive actual-value specimens: colors/gradients, dimensions for spacing/sizing/radius, typography, strokes/borders, shadows, opacity/layer numbers and motion curves/timelines. Numeric token names sort naturally. Existing list, filters, alias selection and bulk management remain available.
- Specimen captions expose source measurements, while the display geometry is bounded to the available surface. Rem previews use a 16px reference; motion playback caps duration at 10 seconds and delay at 3 seconds. This does not rewrite authored values or establish target support. Missing color channels use the Foundation `none` value; alpha and wide-gamut spaces are retained.
- The inspector places value and useful geometry before metadata. Color uses picker/Hex/alpha with progressive space/channels; shadows expose independent X/Y/blur/spread units and inset. Component layout uses direction choices and paired dimension controls. Source, lifecycle, accessibility and advanced authoring remain available in mounted disclosure sections.
- Draft recovery opens closed ancestor sections and focuses the invalid input after disclosure becomes focusable, without stealing focus if the user has moved elsewhere. Existing review/save/Undo boundaries are preserved.
- Studio's identity uses #B9FF46, default dark appearance and preserved explicit theme preference, SUIT roles, rounded outline icons, 32/40/48 controls and generous vertical groups. Axiom UI exposes live component examples. Selection, disclosure and dialog motion use semantic timing with reduced-motion guards; glass is confined to floating canvas tools.

## Regression results

Final local product verification passed 361 unit tests with zero failures/skips, 21 workbench flows, strict TypeScript/schema/module checks, build, browser storage, Studio and target consumers. The three new workbench flows verify all-type specimens and selection continuity, token-driven motion/reduced-motion cancellation, and collapsed invalid-draft recovery. Existing file import, expression/deprecation editing, Resolver adoption, source bundles, IME events and restart flows also pass with the new layout.

Browser evidence uses dedicated profiles/databases. OS trackpad/IME hardware, manual assistive technology, native compilation/device execution and full target coverage are not established by these tests. Repository integrity results are recorded separately in the verification JSON.


The first remote Quality Gate (#83) passed on Ubuntu but found an environment-dependent motion assertion on Windows: the test observed no active 300ms animation without controlling document time or the inherited motion preference. The follow-up test explicitly sets each motion preference and uses the [Chrome DevTools document animation clock](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Animation.pdl) to inspect the real duration, seek visible movement, cancel on preference change and prevent reduced-motion replay. It restores the clock and media override afterward. This corrects the test fixture; product source and the reviewed visuals are unchanged.


Windows runner follow-up: Quality Gate #84 encountered two existing browser-harness failures in separate attempts: an ordinary shutdown exceeded its 10-second window, and Chromium temporarily locked DevToolsActivePort during startup. The browser-store harness now uses the same bounded transient-file retry set as the common browser driver. The workbench allows up to 30 seconds for actual ordinary process exit and records its duration; no forced kill is counted as a passing restart. These changes affect verification only.
