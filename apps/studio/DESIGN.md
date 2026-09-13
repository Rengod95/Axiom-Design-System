---
name: "Axiom UI"
description: "The shared light and dark interface system for Axiom Studio."
colors:
  surface: "#fff"
  surface-subtle: "#f7f8fa"
  surface-hover: "#eff1f5"
  surface-active: "#e9edf4"
  canvas: "#f0f2f5"
  ink: "#20242d"
  ink-secondary: "#525a68"
  ink-tertiary: "#646e7e"
  line: "#e5e7ec"
  line-strong: "#c9cfd9"
  control-border: "#838c9b"
  accent: "#5b50d6"
  accent-hover: "#4c40c2"
  accent-soft: "#eeecfc"
  accent-ink: "#493eba"
  positive: "#24714c"
  positive-soft: "#e9f5ed"
  warning: "#8c570d"
  warning-soft: "#fff4dd"
  negative: "#b23242"
  negative-soft: "#fff0f1"
  focus: "#6b5ce6"
  selection: "#dcd7ff"
  overlay: "rgb(18 23 35 / 32%)"
  on-accent: "#fff"
  surface-dark: "#191b20"
  surface-subtle-dark: "#1e2026"
  surface-hover-dark: "#292c34"
  surface-active-dark: "#333742"
  canvas-dark: "#121419"
  ink-dark: "#eef0f5"
  ink-secondary-dark: "#b3bac7"
  ink-tertiary-dark: "#9ca5b6"
  line-dark: "#2d3039"
  line-strong-dark: "#454b5a"
  control-border-dark: "#68758b"
  accent-dark: "#9c92ff"
  accent-hover-dark: "#b1a8ff"
  accent-soft-dark: "#302c4c"
  accent-ink-dark: "#b4aaff"
  positive-dark: "#8bdbb0"
  positive-soft-dark: "#213e30"
  warning-dark: "#efc575"
  warning-soft-dark: "#44351c"
  negative-dark: "#ff9aa9"
  negative-soft-dark: "#472a30"
  focus-dark: "#b5aaff"
  selection-dark: "#4a416d"
  overlay-dark: "rgb(0 0 0 / 58%)"
  on-accent-dark: "#16131e"
typography:
  heading:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "24px"
    fontWeight: 650
  title:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "13px"
    fontWeight: 450
    lineHeight: 1.6
  label:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.4
  caption:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "11px"
    lineHeight: 1.6
  section-title:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 650
    lineHeight: 1.5
  button:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.4
    letterSpacing: "0px"
  button-large:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.4
  field-control:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  badge:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "10px"
    fontWeight: 550
    lineHeight: "16px"
  headline:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "23px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  base-title:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  base-body:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  code:
    fontFamily: "ui-monospace,Consolas,monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "5px"
  control: "7px"
  panel: "12px"
  badge: "4px"
  floating: "9px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
  space-10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-dark:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.on-accent-dark}"
  button-primary-dark-hover:
    backgroundColor: "{colors.accent-hover-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
    height: "34px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
    height: "34px"
  button-subtle-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.negative-soft}"
    textColor: "{colors.negative}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
    height: "34px"
  button-sm:
    typography: "{typography.button}"
    padding: "4px 8px"
    height: "28px"
  button-lg:
    typography: "{typography.button-large}"
    padding: "4px 16px"
    height: "40px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "7px"
    width: "32px"
    height: "32px"
  icon-button-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    typography: "{typography.field-control}"
    padding: "7px 12px"
    height: "34px"
  navigation-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "5px 9px"
    height: "30px"
  navigation-item-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  badge:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.badge}"
    rounded: "{rounded.badge}"
    padding: "2px 6px"
  badge-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  badge-success:
    backgroundColor: "{colors.positive-soft}"
    textColor: "{colors.positive}"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
  catalog-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  catalog-card-selected:
    backgroundColor: "{colors.accent-soft}"
  choice-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
    height: "28px"
  choice-chip-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  section-heading:
    typography: "{typography.section-title}"
    padding: "12px 16px"
  section-content:
    padding: "16px"
  relationship-usage:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "8px"
  relationship-usage-hover:
    backgroundColor: "{colors.surface-hover}"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    padding: "11px 0"
  tab-selected:
    textColor: "{colors.ink}"
---

# Design System: Axiom UI

## Overview

**Creative North Star: "The familiar professional editor"**

Axiom UI makes system authoring feel precise and legible. Its neutral surfaces, restrained violet action and selection color, compact SUIT typography, and clear control boundaries follow the owner's pinned Linear, Geist, Figma and Apple references. The work is implemented directly in code and supports both light and dark Studio themes.

Structure carries the identity: related controls align, selected objects remain visible, and contextual properties sit close to their source relationships. Flat panels leave the canvas and authored content prominent; floating tools and dialogs receive purposeful elevation. This document describes the editor's reusable interface, not the design system a person authors inside it.

**Key Characteristics:**

- Neutral layers with one violet action and selection family.
- Compact Korean and English typography with visible control boundaries and keyboard focus.
- Shared primitives across Foundation, library, canvas, inspector and Axiom UI.
- Desktop panels that become separate, usable panels on narrow web viewports.

This is a code-derived specification refreshed for the approved 2026-09-14 correction. The runtime imports [src/styles.css](src/styles.css), then [src/ui-system.css](src/ui-system.css), then [src/foundation-workspace.css](src/foundation-workspace.css), in that order in [src/main.tsx](src/main.tsx). The first file owns the palettes and incumbent geometry; the second adds the shared type, size and spacing roles and overrides matching controls; the last defines connected Foundation workspaces. Later rules do not erase higher-specificity or unmatched literals. The frontmatter records reused roles and identified incumbent values; the v2 [sidecar](.impeccable/design.json) extends it with motion, elevation, responsive/cascade metadata and representative snippets.

The default color names mirror the light-theme CSS roles; the `-dark` companions document dark overrides. The `on-accent` pair names the actual primary-button foreground literals. Documentation keys do not create runtime tokens. Component height entries describe minimum control heights where the source uses `min-height`; IconButton and navigation entries record their explicit desktop geometry.

The durable constraints come from [PRODUCT.md](PRODUCT.md), with composition and the correction contract in the [workbench surface brief](.impeccable/surfaces/workbench.md). The current [finish review](../../docs/implementation/editor-completion-finish-review.md) records ten valid captures, 343 passing tests and 16 recorded browser flows, with a bounded ship verdict resolving R1 only. The captures and detector result were subsequently archived unchanged under `dist/evidence/completion/`, as noted in the review. This documentation pass reads that evidence; it does not rerun the detector or claim an independent execution. The [119-row follow-up ledger](../../docs/implementation/editor-completion-followup.md) retains incomplete Foundation obligations. Web evidence does not establish native execution or whole-product completion.

## Colors

Cool neutral surfaces support a restrained violet-blue accent. Positive, warning and negative colors communicate outcome and attention, with matching soft surfaces.

### Primary

Use `accent` for the primary button, selected canvas frame and native checkbox/radio/range accent. Use `accent-hover` for the primary button's hover state. The quieter `accent-soft` and `accent-ink` pair identifies selected navigation, active icon tools, badges and links. `focus` belongs to keyboard focus, while `selection` belongs to selected text. Primary buttons use the `on-accent` foreground pair so the lighter dark-theme accent receives a dark label.

### Neutral

| Roles | Use |
| --- | --- |
| `surface` | Main panels, controls, dialog bodies and floating tools. |
| `surface-subtle` | Sidebar, segmented-control tray, source-value area and table headings. |
| `surface-hover`, `surface-active` | Hover fills and stronger quiet fills; active selection uses the relevant component state. |
| `canvas` | Receding workspace behind the authored frames. |
| `ink` | Main labels, headings and readable content. |
| `ink-secondary` | Explanatory copy, field labels and unselected navigation. |
| `ink-tertiary` | Supporting IDs, counts and compact status metadata. |
| `line` | Panel separators and ordinary table rules. |
| `line-strong` | Secondary button outlines, canvas-frame outlines, token swatch edges and other stronger non-editable edges. |
| `control-border` | Ordinary editable input, textarea and select boundaries, including sidebar search. |
| `overlay` | Modal backdrop; the two themes retain their actual CSS rgb/alpha formats. |

### Status

Use `positive` with `positive-soft` for successful outcomes, `warning` with `warning-soft` for pending or attention states, and `negative` with `negative-soft` for errors and destructive actions. Pair the color with an explicit message or meaningful control label. A green or amber dot supports saved/pending text; it does not replace it.

**The Separate themes Rule.** Studio appearance uses the root data-theme attribute and the axiom.ui.theme preference. Authored ADS theme sets select the values shown in previews and edited in Foundation; changing one must not silently change the other.

**The Boundaries have jobs Rule.** Use line for structural separators, line-strong for stronger non-editable edges and secondary-button outlines, and control-border for ordinary editable inputs, textareas and selects. Keep validation and focus visible as distinct states.

The dedicated control border is the repaired field-boundary role. Global keyboard focus is a solid 2px outline with a 3px offset; standard fields use a 1px offset, and the canvas uses an inset offset of -3px. Focus does not replace the rest-state field border. Validation changes invalid field borders to `negative`. Toolbar theme selection, borderless zoom input and alignment controls have deliberate compact exceptions in the current CSS; the general field rule does not describe every toolbar control. Native checkbox, radio, range and color inputs retain their native or specific treatments.

## Typography

**Interface font:** SUIT Variable, followed by Geist, Apple/system UI, Segoe UI and sans-serif fallbacks, exactly as recorded in the frontmatter. **Code font:** the platform monospace stack with Consolas.

SUIT supplies the same calm voice for Korean and English. The locally bundled `@sun-typeface/suit` dependency is pinned to 2.0.5 and includes the SIL Open Font License 1.1. The variable WOFF2 face supports weights 100–900 and uses `font-display: swap`; it does not require a remote font service. Keep the package's license and reserved font-name obligations with redistributed font assets.

| Role | Application |
| --- | --- |
| `heading` | Shared heading role, demonstrated by the Axiom UI specimen. |
| `title` | Foundation section and manager headings. |
| `body` | Shared body role and Axiom UI specimen; scoped fields and Foundation descriptions use its size. |
| `label` | Field names, action labels and compact Foundation controls. |
| `caption` | Field hints, help text and relationship metadata; weight is inherited where no local rule sets it. |
| `section-title` | Inspector disclosure headings retain their own line height. |
| `button` | Medium action labels; large buttons use the body size while retaining medium weight and label leading. |
| `button-large` | Large action labels retain medium weight and label leading at the body size. |
| `field-control` | Scoped native field typography keeps the inherited regular weight at the shared body size. |
| `badge` | Existing compact status tags. |
| `headline`, `base-title`, `base-body` | Incumbent h1, h2 and root/body values retained by the cascade. These are documented literals, not replacements for the shared roles. |
| `code` | Source values and JSON with a monospace rhythm. |

The shared size ladder is caption / label / body / title / heading, with regular, medium and strong weight variables (450 / 550 / 650). The role values live in the frontmatter and are identical across Studio themes. There is no proportional type-scale formula. The Axiom UI surface demonstrates the heading, title, body and label roles; its specimen is evidence of those role combinations, not a global reset.

**The Scope shared roles Rule.** Use the shared type and size variables for Studio controls, and inspect the actual selector cascade before claiming a whole screen follows them. Authored component typography belongs to the user's Foundation and design properties.

The root still sets 14px with the browser's regular weight (400), h1 remains 23px, and h2 remains 17px unless a local rule overrides it. The onboarding headline retains 36px, then 29px at 900px and 28px at 720px. Existing badges use 10px, catalog footer badges 9px, navigation labels 12px, and selected navigation/tab labels weight 600. Token summaries and counts retain 10px; catalog labels retain 13px/600. These literal residuals are recorded, not silently normalized. The new field selectors win over the older 14px mobile field size, so scoped Studio fields use the shared body size even on narrow screens. Property values and counts use tabular numerals where alignment matters; IDs wrap while navigation names truncate.

## Layout

The workbench fills `100dvh` and keeps overflow inside the relevant panel. The center uses `minmax(0,1fr)`; sidebar and inspector have fixed role widths. No centered marketing-page maximum width constrains the editor.

| Viewport | Effective columns | Rows and adjustments |
| --- | --- | --- |
| Above 1200px | 224px navigation / fluid workspace / 320px inspector | 52px header / flexible work area / 28px status bar. |
| 1101–1200px | 200px / fluid / 320px | Earlier 1200px toolbar, header and catalog adjustments remain; the later shared inspector width supersedes 280px. |
| 721–1100px | 200px / fluid / 292px | The later 1100px width rule supersedes the earlier 900px 184px/264px pair. At 900px, the remaining metadata and stacked review-strip rules still apply. |
| At most 720px | One fluid column | 48px header / 40px panel switcher / flexible selected panel / 28px status bar. Browse, Workspace and Inspect remain individually accessible. |

The frontmatter spacing scale extends the established 4px rhythm with 20px and 40px steps. Shared fields use an 8px gap, section content uses 16px padding and gap, section summaries use 12px by 16px padding, and form actions use a 12px gap with 16px top padding. Two-column forms use a 20px gap. Property groups use 8px gaps and vertical padding; consecutive groups receive a separator and 16px top padding. The later inspector-section rule removes the old outer section padding at every breakpoint; it does not remove independent inspector-header or editing-scope padding. The Foundation scope field still has its specific 12px by 18px inset. Existing 6px, 10px and 18px gaps/padding remain in unmatched legacy rows and headers.

Shared Button sizes are small, medium and large, with minimum heights recorded in the frontmatter. The default is medium. Padding grows from the small to the large variant, and the large label uses the body size. Desktop IconButton still has a literal 32px width and height, with contextual 24–28px dimensions; its radius now follows the shared control radius. These icons do not expose Button's size API. Sidebar object rows remain 30px, workspace rows 34px and Part rows 28px; regular narrow navigation grows to 36px.

At 720px, ordinary medium buttons and icon actions acquire the large minimum height, and app field inputs/selects acquire the same minimum height. More-specific small-button selectors retain 28px; choice chips become 34px, topbar actions retain their 28px minimum, and review-strip actions retain 34px. Icon widths remain compact even when the minimum height grows. Scoped app field textareas keep a 76px minimum height. Onboarding fields retain the medium minimum because the mobile app selector does not target onboarding. Do not claim every shipped control becomes one touch-target size.

Foundation uses domain workspaces, a curated 11-domain starter choice, primitive-to-semantic relationships, and named theme management with collapsed advanced axis/context controls. Workspace and manager padding is 24px; domain, starter and relationship panels reduce to 16px at 1100px. Domain directory rows have an 82px minimum height with a 64px by 44px specimen. Manager forms use two columns with a 16px gap and become one at 720px. The onboarding domain choice grid changes from three columns to two on narrow screens.

The token table remains internally scrollable with sticky column headings. Identity, alias target and classification are separate lines; only the direct filter search input flexes. Inspector actions remain sticky at the bottom. Catalog cards use an auto-fill grid with a 170px minimum on full desktop and 150px under the compact rule, with the new 16px gap. Static SVG specimens occupy a 112px-high band above labels; they communicate component structure. Filters wrap on narrow screens, and shared tab strips scroll horizontally inside their panel.

The canvas is an unbounded document workspace with named frames. Its viewport clips and pans artwork while the surrounding editor remains stable; selection, frame labels and tools stay contextual. Desktop/mobile preview categories describe authored designs, independently of the browser's responsive panel arrangement.

## Elevation & Depth

Most hierarchy comes from tone and 1px separators. Structural panels do not float. Canvas tools use the theme's floating shadow; modal review/export and workbench dialogs use the deeper dialog shadow and backdrop. The active segment has a small inset-context lift. Exact shadow values live in the sidecar, since the frontmatter schema has no shadow field.

| Shadow role | Application |
| --- | --- |
| `floating-shadow` / dark companion | Canvas tool, zoom and alignment trays. |
| `dialog-shadow` / dark companion | Modal dialogs. |
| `segment-active` | Selected segmented option, using the same small shadow in both themes. |
| `catalog-selection` | One additional accent outline outside the catalog card border. |

**The Elevate by role Rule.** Keep the workbench's structural panels flat. Use floating-shadow for canvas tools and dialog-shadow for modal surfaces; a selected catalog card's accent outline indicates selection rather than height.

## Shapes

Small, gently rounded controls sit inside rectangular working panels. The named radius tokens cover small navigation, standard controls and modal panels; the documented badge and floating radii capture reused literal CSS values. Icon buttons now use the control radius, and catalog cards use the panel radius. Canvas frames remain square so authored corner geometry is visible. Swatches retain a clear edge even when their color matches the surrounding surface. Do not round the entire application shell or wrap every inspector group in another card.

## Components

### Buttons and icon actions

`Button` exposes primary, secondary, subtle and danger tones plus sm, md and lg sizes; md is the default. Primary uses the accent pair, secondary uses the surface with a stronger neutral outline, subtle remains transparent until hover, and danger uses negative text on its soft fill. Medium actions share the frontmatter typography, radius and padding; size and tone are independent. Primary, secondary and subtle have distinct hover fills; danger currently has no additional hover fill. Pressed non-primary buttons and icon actions use surface-active; pressed primary buttons use accent-hover. A busy button receives a progress cursor. Disabled buttons use 0.46 opacity and a not-allowed cursor. They retain native disabled semantics.

`IconButton` uses a 15px inline SVG by default in a 32px target, an accessible label and a native title. SVGs use a 20-unit viewBox, currentColor, a 1.35-unit stroke, and rounded ends and joins. Hover uses the quiet hover surface; pressed tools use the accent-soft/accent-ink pair. Existing contextual sizes are described in Layout.

Button background and text transitions use 160ms with `cubic-bezier(.16,1,.3,1)`. Icon background transitions use 160ms with the CSS default ease. State changes do not animate position. Under `prefers-reduced-motion: reduce`, transitions and animations are removed, scroll behavior becomes auto, and the canvas drops its `will-change` hint. There is no page-load choreography.

### Fields, structured values and errors

`Field` arranges the visible field name, control and optional hint; its visible span does not label a control by itself. Keep a real label association or the control's aria-label. `TextInput` maintains a local draft and defers commits during composition until composition ends. `NumberInput` retains a draft, commits finite in-range values, exposes invalid state and restores the last valid value on blur.

Native input, textarea and select elements share the control border and surface. Shared field labels use the label role and weight-medium, with a caption hint. Scoped Studio fields use a medium minimum height, body size, label leading and 12px horizontal padding; text inputs retain 7px vertical padding, while select retains its 4px important vertical padding. The more specific app field textarea rule uses a 76px minimum and 8px vertical padding; unmatched native textareas retain the earlier 72px minimum. Textareas resize vertically. Field hints remain beneath the control; errors use negative text with readable line height. Native checkboxes are 15px squares with an 8px label gap in checkbox rows. Do not let broad flexible-search rules resize or separate the checkbox.

### Navigation and tabs

Object navigation uses a quiet default label, a neutral hover fill and an accent selected fill. Names truncate; counts stay right-aligned and use tabular figures. Part indentation expresses structure, and contextual row actions appear on hover or focus within the row.

`TabBar` is a real tablist with aria-selected, roving tabIndex and Arrow Left/Right, Home and End handling. A selected tab uses primary ink, weight 600 and a 2px ink underline. The mobile panel switcher uses its own pressed-button state and accent underline. Segmented Web/Mobile and Edit/Run controls are pressed-button groups with a surface-filled active option.

### Badges and containers

Choice chips are real Button controls with line-strong outlines and an accent fill/ink/border when aria-pressed is true. They use the small minimum height on desktop and medium on narrow screens. Badges convey classification or status using neutral, accent, positive and warning pairs. They are compact text annotations, not standalone buttons. The catalog card contains a separate selection button and contextual add action. Hover strengthens its edge and quiet fill; selection adds the accent fill, border and outer outline. Inspectors use native details/summary sections with an inner section-content wrapper and shared spacing. The summary chevron changes with disclosure state; the optional section action retains its separate 12px top inset.

### Foundation and canvas relationships

A Foundation row aligns the name, alias hint, structured value, classification and usage count. The selected row gets the soft accent fill; editing takes place in the related inspector. Use wrapping hints for relationships, with a 4px separation below token identity. A native table, local scrolling and sticky headings preserve readable columns.

The Connections tree indents nested lists with a 16px margin, 20px inset and neutral vertical rule. Token nodes place names above caption metadata. Component usage rows are full-width native buttons with 8px padding, a small radius and quiet hover fill. Their first line identifies the component and Part; a second line distinguishes the design category, property and rule/variant context. A trailing arrow communicates navigation, and the full source location remains in the title. Activation selects the component, Part and category through the shared draft-safe path without changing project revision. This is the R1 behavior verified by the current finish review.

Named themes precede collapsed axis/context controls. Structured typography/effects bindings, nested Part actions and reviewed motion-track playback reuse the same field, section, choice and review conventions. Studio appearance remains separate from authored theme values and from the selected Web/Mobile design category. The motion player is a bounded preview, with behavior graphs and native mappings still in the implementation ledger.

Canvas frame selection uses a 1.5px accent outline; a selected Part uses a 1px outline, with a dashed hover indication in Edit mode. Resize handles are 8px squares with a surface fill and accent edge. These direct-manipulation affordances describe authored objects and must remain distinct from the global 2px keyboard focus ring.

### Review, dialogs and empty states

Valid buffered forms enter the shared review directly; invalid values remain visible with an explicit reset. The review strip preserves the relationship between pending edits and the action that applies them. Its text remains visible when the action row stacks. Workbench dialogs use native dialog behavior, restore focus on close, and separate header from scrollable content. The standard workbench modal is at most 560px wide and 80dvh high; review/export dialogs use their existing larger 720px geometry and viewport constraints. Empty states use an icon, clear title, concise explanation and a relevant recovery action when available.

The sidecar's tonal ramps are supplemental OKLCH swatch visualizations derived from each color's hue and chroma; they are not additional runtime palette tokens. The exact runtime values remain in the frontmatter.

The eleven sidecar snippets are representative static HTML/CSS previews of these implemented primitives. The React components and controller remain authoritative for commits, keyboard interaction, selection and modal behavior.

## Do's and Don'ts

### Do:

- Do reuse the semantic CSS roles and shared controls in src/ui.tsx before adding another local variant.
- Do update both Studio palettes and these artifacts whenever a reused visual token changes.
- Do use the shared type, spacing and Button size roles while retaining documented cascade and compact-control exceptions.
- Do label icon actions, keep keyboard focus visible, and retain the existing tab keyboard and input composition behavior.
- Do keep alias targets, classification and usage context on readable lines, and connect usage actions to the correct component, Part and design category.
- Do retain review, error, pending and saved states as explicit text and control behavior as well as color.
- Do check light and dark desktop views and the narrow panel flow when changing shared layout or controls.

### Don't:

- Don't couple the Studio appearance switch to an authored ADS theme or use Studio tokens as authored token values.
- Don't substitute the faint structural separator for the ordinary editable-control boundary.
- Don't give every panel a card, shadow or large radius; keep hierarchy in surface tone, separators and alignment.
- Don't squeeze navigation, workspace and inspector into three columns at narrow widths.
- Don't introduce page-load choreography or retain nonessential transitions under reduced motion.
- Don't treat a catalog inventory, web preview or generated native source as proof of native interaction, accessibility or device execution.
