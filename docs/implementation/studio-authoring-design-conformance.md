# Studio authoring design conformance

Source comparison recorded 2026-09-15 for the existing Operate workbench. This is an ordinary extension of the Blueprint workbench, not a new visual direction. [PRODUCT.md](../../apps/studio/PRODUCT.md), [DESIGN.md](../../apps/studio/DESIGN.md), the [design sidecar](../../apps/studio/.impeccable/design.json) and [workbench contract](../../apps/studio/.impeccable/surfaces/workbench.md) remain authoritative and unchanged by this documentation pass. No new reusable Studio color, typography, material or radius family requires a contract update.

## Ownership and comparison

ADS documents own authored values and component structure. Core planners own proposed source changes; Studio controls present and edit those proposals through the existing controller. Local selection, template preview theme and composer preview state do not establish a saved source revision.

| Reviewed surface | Existing design contract and source evidence |
| --- | --- |
| Component creation | [component-composer.tsx](../../apps/studio/src/component-composer.tsx) reuses `Button`, `Field`, `CatalogPreview` and the owning `WorkbenchDialog`. Blank frame, Content stack, Article, Button, Text field and Card previews use `planStudioComponentCreate` and `inspectStudioProject`; the explicit create action enters the controller path. [component-authoring.css](../../apps/studio/src/component-authoring.css) retains neutral selected fills, compact copy, optical control/surface corners and a single-column narrow layout. |
| Token architectures and domain checkbox cards | [foundation-starter-panel.tsx](../../apps/studio/src/foundation-starter-panel.tsx) reuses `Button`, `Field`, `Select`, `Icon`, filled segmented controls and native labeled inputs. Architecture radios select one structure; domain checkboxes independently include bundles. The [local styles](../../apps/studio/src/foundation-starters.css) use `--surface-subtle`, `--surface-active`, `--surface-hover`, `--ink-secondary`, `--focus`, `--space-1` through `--space-4`, shared type/weight roles and `--radius-control`. Architecture references identify editable Axiom adaptations, not complete upstream libraries. |
| Elements and Content area | [component-inspector.tsx](../../apps/studio/src/component-inspector.tsx) retains `Section`, `Field`, `TextInput`, `Select`, `Button` and `StudioSlider`. Source parts supply the element list; selected elements use one neutral active fill. Child, order, parent, HTML element and slot changes use the existing component edit path and draft handling. Content area explicitly describes slot cardinality and states that instance content insertion is unavailable. |
| Precision sliders | [studio-slider.tsx](../../apps/studio/src/studio-slider.tsx) and [studio-slider.css](../../apps/studio/src/studio-slider.css) preserve the thin neutral track, white thumb, Geist precision text, unit, focus, invalid and disabled treatments. A 72px precision column stacks below the range at container widths of 175px or less. Native range travel and the painted thumb share an 18px interaction geometry with 9px insets. Exact text remains owned by the form, including incomplete input, out-of-window values and composition. |

Studio chrome continues to inherit Geist with SUIT fallback, Geist Mono for code, the dark/light neutral roles and fluorescent green `#8DFC52`. The existing 8/12/16px optical hierarchy is expressed through `--radius-sm`/nested fallback, `--radius-control` and `--radius-panel`. This extension does not change the flat glass materials or introduce structural bevels.

## Intentional geometry and authored previews

Slider rail capsules, circular value/gradient thumbs and the ruler's circular marker are functional geometry. They do not add a general rounded-surface token. The underlying range and precision field retain native inputs; the painted geometry is hidden from accessibility semantics. Source keyboard and composition handlers are implementation evidence, not assistive-technology certification.

The composer places its source projection inside a separate preview plane. Its backdrop uses resolved project `token.surface`, with an explicit light/dark fallback inferred from projected foreground when that token is absent; it is not the Studio theme. The plane's surrounding padding and radius belong to the editor presentation, not the authored root. `CatalogPreview` supplies the actual projected component styles.

The template specimen resolves its proposed aliases and dark overrides. Its Light/Dark switch is local preview state. Authored colors, typeface, font size, radius and spacing therefore may differ from Studio chrome. Bounded specimen radius/padding and CSS fallbacks are display accommodations, not rewritten token values. Default Studio suggestions remain Geist and `#8dfc52`.

## Existing discrepancies and evidence limits

Two pre-existing discrepancies were checked against `HEAD` and left unchanged: the DESIGN.md and sidecar load-order summaries omit `catalog-specimens.css`, already imported before the slider stylesheet; and `studio-chrome.css` includes a 5% accent ambient gradient while the design prose calls the ambient ground neutral. Neither becomes a new design rule here. The existing lower-level selector cascade also remains subject to the specificity caveat already recorded in the contract.

The sidecar's Precision slider is a styling specimen, not a synchronized copy of production markup; it still depicts the previous 60px precision arrangement. The current source files own the local sizing and painted-travel implementation described above.

[Quickstart](studio-quickstart.md) already covers composer, templates, Elements, Content area and contextual Token usage; no additional steps were needed. This report reviews source against the incumbent contract and runs no new tests. Capture validity, temporal behavior and the independent verdict belong to the [authoring finish review](studio-authoring-finish-review.md). This document makes no full Foundation completion, native execution or assistive-technology conformance claim.
