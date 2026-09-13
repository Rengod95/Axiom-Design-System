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
  headline:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "23px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  section-title:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 650
    lineHeight: 1.5
  body:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "11px"
    fontWeight: 500
  button:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "18px"
    letterSpacing: "0px"
  badge:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "10px"
    fontWeight: 550
    lineHeight: "16px"
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
  icon: "6px"
  floating: "9px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "6px 11px"
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
    padding: "6px 11px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "6px 11px"
  button-subtle-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.negative-soft}"
    textColor: "{colors.negative}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "6px 11px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.icon}"
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
    padding: "7px 9px"
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
    rounded: "{rounded.floating}"
  catalog-card-selected:
    backgroundColor: "{colors.accent-soft}"
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

This is a code-derived specification. The frontmatter records reused values in [src/styles.css](src/styles.css); the v2 [sidecar](.impeccable/design.json) extends it with motion, elevation, breakpoints and representative component snippets. The default color key names mirror the light-theme CSS roles; the `-dark` companion keys document the dark overrides. The `on-accent` pair names the two actual primary-button foreground literals. No new runtime token is implied by a documentation key.

The durable constraints come from [PRODUCT.md](PRODUCT.md), with composition and task strategy retained in the [workbench surface brief](.impeccable/surfaces/workbench.md). The reviewed screenshots and font/overflow measurements are recorded in the generated `dist/evidence/workbench-visual.json` artifact; the independent [finish review](../../docs/implementation/workbench-finish-review.md) records its scope. That evidence concerns the web workbench, not native output execution.

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
| `headline` | Foundation and content-page heading. |
| `title` | Secondary headings. |
| `section-title` | Inspector disclosure headings. |
| `body` | Base interface type and paragraph rhythm; the CSS default weight is 400. |
| `body-small` | Help text and concise supporting explanations. |
| `label` | Field names and compact metadata. |
| `button` | Standard action labels with stable line height. |
| `badge` | Compact state and classification tags. |
| `code` | Source values and JSON with a monospace rhythm. |

There is no proportional type-scale formula. The Axiom UI specimen intentionally demonstrates 14px and 12px at weight 450; this does not change the body's actual CSS default. Property values and counts use tabular numerals where alignment matters. IDs may wrap anywhere; navigation names truncate within their row. Supporting field hints use 11px type, and the densest counts/source summaries use 10px. Do not promote these sizes into normal body copy. Narrow inspector fields increase to 14px and labels to 12px.

## Layout

The workbench fills `100dvh` and keeps overflow inside the relevant panel. The center uses `minmax(0,1fr)`; sidebar and inspector have fixed role widths. No centered marketing-page maximum width constrains the editor.

| Viewport | Columns | Rows and adjustments |
| --- | --- | --- |
| Above 1200px | 224px navigation / fluid workspace / 304px inspector | 52px header / flexible work area / 28px status bar. |
| At most 1200px | 200px / fluid / 280px | Compact header and toolbar; save text and project source-export shortcut hide, while the primary export remains. |
| At most 900px | 184px / fluid / 264px | Further metadata reduction; the review strip stacks its content and actions. |
| At most 720px | One fluid column | 48px header / 40px panel switcher / flexible selected panel / 28px status bar. Navigation, workspace and inspector remain individually accessible. |

The canonical spacing rhythm is the six-step frontmatter scale. Actual control geometry includes optical offsets: standard buttons use 6px by 11px padding, fields 7px by 9px, inspector sections 16px by 18px, and Foundation filter gaps 8px. These are observed geometry, not additions to a fabricated universal spacing scale. Inspector sections adapt to 15px padding at the compact desktop breakpoint and 18px by 20px on narrow screens. The editing-scope field in the Foundation inspector uses 12px by 18px padding.

Standard controls are dense: buttons have a 32px minimum height and icons a 32px square. The sidebar contains 30px object rows, 34px workspace rows and 28px Part rows; narrow regular navigation grows to 36px. Inspector form controls have a 38px minimum height on narrow screens. Smaller 24–28px contextual icon controls are existing compact exceptions; do not describe every shipped target as a 44px touch target.

Foundation retains an internally scrollable table with sticky column headings. Identity, alias target and classification are separate lines; the alias checkbox stays beside its label because only the direct search input flexes. Inspector actions remain in a sticky bottom area. Catalog cards use an auto-fill grid with a 170px minimum card width on full desktop and a 150px minimum under the compact-desktop rule. Filters wrap on narrow screens instead of overflowing the document.

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

Small, gently rounded controls sit inside rectangular working panels. The named radius tokens cover small navigation, standard controls and modal panels; the documented badge, icon and floating radii capture reused literal CSS values. Catalog cards share the floating radius. Canvas frames remain square so authored corner geometry is visible. Swatches retain a clear edge even when their color matches the surrounding surface. Do not round the entire application shell or wrap every inspector group in another card.

## Components

### Buttons and icon actions

`Button` exposes primary, secondary, subtle and danger tones. Primary uses the accent pair, secondary uses the surface with a stronger neutral outline, subtle remains transparent until hover, and danger uses negative text on its soft fill. Standard actions share the frontmatter typography, radius and padding. Primary, secondary and subtle have distinct hover fills; danger currently has no additional hover fill. Disabled buttons use 0.46 opacity and a not-allowed cursor. They retain native disabled semantics.

`IconButton` uses a 15px inline SVG by default in a 32px target, an accessible label and a native title. SVGs use a 20-unit viewBox, currentColor, a 1.35-unit stroke, and rounded ends and joins. Hover uses the quiet hover surface; pressed tools use the accent-soft/accent-ink pair. Existing contextual sizes are described in Layout.

Button background and text transitions use 160ms with `cubic-bezier(.16,1,.3,1)`. Icon background transitions use 160ms with the CSS default ease. State changes do not animate position. Under `prefers-reduced-motion: reduce`, transitions and animations are removed, scroll behavior becomes auto, and the canvas drops its `will-change` hint. There is no page-load choreography.

### Fields, structured values and errors

`Field` arranges the visible field name, control and optional hint; its visible span does not label a control by itself. Keep a real label association or the control's aria-label. `TextInput` maintains a local draft and defers commits during composition until composition ends. `NumberInput` retains a draft, commits finite in-range values, exposes invalid state and restores the last valid value on blur.

Native input, textarea and select elements share the control border and surface. Textareas resize vertically and have a 72px minimum height. Field hints remain beneath the control; errors use negative text with readable line height. Native checkboxes are 15px squares with an 8px label gap in checkbox rows. Do not let broad flexible-search rules resize or separate the checkbox.

### Navigation and tabs

Object navigation uses a quiet default label, a neutral hover fill and an accent selected fill. Names truncate; counts stay right-aligned and use tabular figures. Part indentation expresses structure, and contextual row actions appear on hover or focus within the row.

`TabBar` is a real tablist with aria-selected, roving tabIndex and Arrow Left/Right, Home and End handling. A selected tab uses primary ink, weight 600 and a 2px ink underline. The mobile panel switcher uses its own pressed-button state and accent underline. Segmented Web/Mobile and Edit/Run controls are pressed-button groups with a surface-filled active option.

### Badges and containers

Badges convey classification or status using neutral, accent, positive and warning pairs. They are compact text annotations, not standalone buttons. The catalog card contains a separate selection button and contextual add action. Hover strengthens its edge and quiet fill; selection adds the accent fill, border and outer outline. Inspectors use disclosure sections with summary headings and separators, not a stack of floating cards.

### Foundation and canvas relationships

A Foundation row aligns the name, alias hint, structured value, classification and usage count. The selected row gets the soft accent fill; editing takes place in the related inspector. Use wrapping hints for relationships, with a 4px separation below token identity. A native table, local scrolling and sticky headings preserve readable columns.

Canvas frame selection uses a 1.5px accent outline; a selected Part uses a 1px outline, with a dashed hover indication in Edit mode. Resize handles are 8px squares with a surface fill and accent edge. These direct-manipulation affordances describe authored objects and must remain distinct from the global 2px keyboard focus ring.

### Review, dialogs and empty states

The review strip preserves the relationship between pending edits and the action that applies them. Its text remains visible when the action row stacks. Workbench dialogs use native dialog behavior, restore focus on close, and separate header from scrollable content. The standard workbench modal is at most 560px wide and 80dvh high; review/export dialogs use their existing larger 720px geometry and viewport constraints. Empty states use an icon, clear title, concise explanation and a relevant recovery action when available.

The sidecar's tonal ramps are supplemental OKLCH swatch visualizations derived from each color's hue and chroma; they are not additional runtime palette tokens. The exact runtime values remain in the frontmatter.

The ten sidecar snippets are representative static HTML/CSS previews of these implemented primitives. The React components and controller remain authoritative for commits, keyboard interaction, selection and modal behavior.

## Do's and Don'ts

### Do:

- Do reuse the semantic CSS roles and shared controls in src/ui.tsx before adding another local variant.
- Do update both Studio palettes and these artifacts whenever a reused visual token changes.
- Do preserve the 4px spacing rhythm while retaining the observed optical padding and compact-control exceptions.
- Do label icon actions, keep keyboard focus visible, and retain the existing tab keyboard and input composition behavior.
- Do keep alias targets and classification metadata on separate readable lines, and show the token's source relationships beside editing.
- Do retain review, error, pending and saved states as explicit text and control behavior as well as color.
- Do check light and dark desktop views and the narrow panel flow when changing shared layout or controls.

### Don't:

- Don't couple the Studio appearance switch to an authored ADS theme or use Studio tokens as authored token values.
- Don't substitute the faint structural separator for the ordinary editable-control boundary.
- Don't give every panel a card, shadow or large radius; keep hierarchy in surface tone, separators and alignment.
- Don't squeeze navigation, workspace and inspector into three columns at narrow widths.
- Don't introduce page-load choreography or retain nonessential transitions under reduced motion.
- Don't treat a catalog inventory, web preview or generated native source as proof of native interaction, accessibility or device execution.
