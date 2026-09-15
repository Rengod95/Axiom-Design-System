# Workbench independent finish review

Reviewed 2026-09-13 against `apps/studio/PRODUCT.md`, the workbench surface brief, and Impeccable 4.3.1 `reference/craft-floor.md`. This is the independent review of the first screenshot batch; no UI code was changed by this reviewer.

## Verdict

**Direction accepted; finish pending the bounded repair and confirmation pass.** The neutral editor shell, SUIT typography, restrained violet selection, object navigation, contextual inspector, and distinct Studio/project themes fit the owner-pinned Linear/Geist/Figma/Apple direction. This Operate surface does not need a different visual concept. No independently verified P1 was found in this review. Three concrete P2 findings are below.

## Findings

1. **P2 — Give editable fields a sufficiently visible boundary in both themes.** `apps/studio/src/styles.css` uses `--line-strong` for the input, textarea, and select borders: `#c9cfd9` against light `#ffffff` is **1.57:1**; `#454b5a` against dark `#191b20` is **1.97:1**. In the Foundation description textarea and inspector inputs, inside and outside share the same surface, leaving this border as the primary visual indication of the control. Provide a dedicated control-border role that reaches 3:1 against its adjacent surfaces, and apply it to editable controls without strengthening ordinary separators. The reviewed text-role pairs meet 4.5:1; this is a control-boundary issue. **Status: sent to implementer; pending repair and confirmation.**

2. **P2 — Keep the alias filter checkbox next to its label.** The Foundation screenshots at 1440px, 1090px, and 390px show a conspicuous gap between the checkbox and “참조만,” weakening their visual association and consuming a separate row at narrow sizes. `.foundation-filters input { flex: 1; min-width: 180px }` also matches the checkbox. Scope the flexible search-field rule to the text input and keep the checkbox at its intrinsic size. **Status: implementer reports repaired in the single repair batch; confirmation pending.**

3. **P2 — Separate token identity from its relationship and classification metadata.** The Foundation table renders `action.background참조 · brand.accent` as a run-on string, and unassigned domain/tier values as `——`. The nested `small` elements remain inline. Stack or explicitly separate the alias hint and the two classification values so authors can scan identity, alias target, domain, and tier independently. This matters directly to the brief's requirement to expose source relationships at the point of editing. **Status: implementer reports repaired in the single repair batch; confirmation pending.**

The flush-to-edge editing-scope field was also visible in the Foundation inspector and mobile inspector; the implementer reports its padding repaired with the same batch.

## Evidence and limits

All seven PNGs were opened with `view_image`: `workbench-desktop-light`, `workbench-desktop-dark`, `workbench-foundation-light`, `workbench-foundation-dark-1090`, `workbench-mobile-foundation`, `workbench-mobile-inspector`, and `workbench-mobile-canvas`, under `dist/evidence/`. The associated `workbench-visual.json` reports loaded SUIT and no horizontal document overflow for all captures. Visual inspection confirms that mobile uses separate navigation, workspace, and inspector panels; the Foundation table retains local horizontal scrolling rather than squeezing every column into 390px.

The desktop canvas screenshots show 24% zoom and tiny artwork. The implementer established that the capture changed viewport dimensions after initial fit; the app intentionally preserves its viewport on window resizing. This is recorded as a **capture-state artifact**, not a product defect. The single confirmation batch should call Fit after setting each capture viewport so named frames, selected content, and inspector relationships are assessable.

This review inspected the real screenshots and relevant source, including shared controls, canvas geometry/interaction wiring, Foundation table, and inspector. It did not mutate the browser database, run a detector, generate an image, or perform an additional screenshot pass. Functional regression results, the separately reported Undo selection repair, native output, and OS-level assistive-technology/IME execution remain separate evidence; they are not certified by this visual verdict.

## Parent confirmation — 2026-09-13

The single repair batch separated alias metadata and domain/tier lines, removed the broad checkbox width rule, padded scope fields, isolated consumer preview styling, and introduced dedicated control borders (`#838c9b` light, `#68758b` dark). The confirmation capture explicitly fits the canvas after viewport setup, removing the screenshot setup artifact. All seven required viewport/theme images were regenerated together; the parent inspected the desktop canvas, 1090px dark Foundation and 390px Foundation confirmation images. No document overflow or missing SUIT font was observed. The remaining images share the same repaired primitives and their metrics are recorded in `dist/evidence/workbench-visual.json`.

Manual Impeccable detector on the remaining changed UI files returned `[]`; the separately reviewed Inspector also returned no findings. This closes the three identified finish issues for the bounded workbench. It does not certify screen readers, all catalog-specific behavior or native platforms.
