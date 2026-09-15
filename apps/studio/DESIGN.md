---
name: "Axiom UI"
description: "A blueprint workbench with flat neutral glass, optical corners and purpose-built material specimens."
colors:
  brand: "#8dfc52"
  accent: "#8dfc52"
  accent-hover: "#7ce641"
  accent-soft: "#e2f7dc"
  accent-ink: "#296214"
  surface: "#fafafa"
  surface-subtle: "#f2f2f2"
  surface-hover: "#e8e8e8"
  surface-active: "#dedede"
  canvas: "#ededed"
  canvas-dot: "#d1d1d1"
  ink: "#202020"
  ink-secondary: "#595959"
  ink-tertiary: "#707070"
  line: "#d2d2d2"
  line-strong: "#cccccc"
  control-border: "#d5d5d5"
  positive: "#24714c"
  positive-soft: "#e9f5ed"
  warning: "#8c570d"
  warning-soft: "#fff4dd"
  negative: "#b23242"
  negative-soft: "#fff0f1"
  focus: "#348023"
  selection: "#ccf5bd"
  glass-panel: "rgb(250 250 250 / 54%)"
  glass-header: "rgb(250 250 250 / 58%)"
  glass-raised: "rgb(250 250 250 / 80%)"
  dark-accent-hover: "#a6ff77"
  dark-accent-soft: "#23331e"
  dark-accent-ink: "#8dfc52"
  dark-surface: "#171717"
  dark-surface-subtle: "#202020"
  dark-surface-hover: "#2b2b2b"
  dark-surface-active: "#353535"
  dark-canvas: "#101010"
  dark-canvas-dot: "#262626"
  dark-ink: "#f0f0f0"
  dark-ink-secondary: "#b8b8b8"
  dark-ink-tertiary: "#969696"
  dark-line: "#272727"
  dark-line-strong: "#3c3c3c"
  dark-control-border: "#383838"
  dark-positive: "#8bdbb0"
  dark-positive-soft: "#213e30"
  dark-warning: "#efc575"
  dark-warning-soft: "#44351c"
  dark-negative: "#ff9aa9"
  dark-negative-soft: "#472a30"
  dark-focus: "#8dfc52"
  dark-selection: "#305025"
  dark-glass-panel: "rgb(23 23 23 / 54%)"
  dark-glass-header: "rgb(23 23 23 / 58%)"
  dark-glass-raised: "rgb(32 32 32 / 80%)"
  on-accent: "#152009"
  slider-track: "#cdcdcd"
  slider-fill: "#656565"
  slider-thumb: "#ffffff"
  slider-thumb-edge: "#c7c7c7"
  dark-slider-track: "#454545"
  dark-slider-fill: "#a5a5a5"
  dark-slider-surface: "#242424"
typography:
  heading:
    fontFamily: "Geist,SUIT,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-.025em"
  title:
    fontFamily: "Geist,SUIT,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "-.015em"
  body:
    fontFamily: "Geist,SUIT,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "normal"
  label:
    fontFamily: "Geist,SUIT,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "18px"
    letterSpacing: "normal"
  caption:
    fontFamily: "Geist,SUIT,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "normal"
  material-code:
    fontFamily: "'Geist Mono',ui-monospace,Consolas,monospace"
    fontSize: "10px"
    lineHeight: "16px"
rounded:
  nested: "8px"
  control: "12px"
  surface: "16px"
  checkbox: "4px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "5px 9px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "5px 9px"
    height: "32px"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "5px 9px"
    height: "32px"
  button-danger:
    backgroundColor: "{colors.negative-soft}"
    textColor: "{colors.negative}"
    rounded: "{rounded.control}"
    padding: "5px 9px"
    height: "32px"
  button-small:
    padding: "3px 8px"
    height: "28px"
    rounded: "{rounded.nested}"
  button-large:
    padding: "7px 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "5px 8px"
    height: "32px"
  select:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.nested}"
    padding: "6px 8px 6px 10px"
    height: "28px"
  navigation:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "7px 10px"
    height: "36px"
  navigation-selected:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-accent}"
  choice-chip:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.nested}"
    height: "28px"
  choice-chip-selected:
    backgroundColor: "{colors.surface-active}"
    textColor: "{colors.ink}"
  material-card:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0"
  material-card-selected:
    backgroundColor: "{colors.surface-active}"
  section-add:
    backgroundColor: "{colors.surface-subtle}"
    rounded: "{rounded.nested}"
    padding: "5px"
    height: "24px"
    width: "24px"
  section-content:
    padding: "0 12px 12px"
  tab:
    textColor: "{colors.ink-secondary}"
    padding: "11px 0"
  tab-selected:
    textColor: "{colors.ink}"
  domain-blueprint:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "12px"
  slider:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "4px 8px"
  slider-thumb:
    backgroundColor: "{colors.slider-thumb}"
    height: "16px"
    width: "16px"
---

# Design System: Axiom UI

## Overview

**Creative North Star: "Blueprint workbench"**

Axiom UI combines precise material drawings with compact neutral glass. Geist, thin construction lines and optical corners give English and Korean authoring a consistent rhythm. Fluorescent green identifies action and the flow of real references; authored materials remain the visual subject.

Structural planes are translucent and flat. The sidebar, inspector, headers and footer share neutral diffusion without inset highlights or bevels. Individual domains have one recognizable blueprint drawing. Inside a domain, the material determines the presentation: a shade row, a shared ruler, a stroke, an elevated object or an actual typographic specimen.

**Key Characteristics:**

- Achromatic glass with a fluorescent action and dependency accent.
- Compact controls with optical 8/12/16px corners.
- Primitive scales and semantic roles with real source connections.
- Purpose-specific specimens instead of repeated generic cards.
- Adjustable navigation, contextual help and restrained scroll indicators.

[PRODUCT.md](PRODUCT.md) carries durable product constraints; the [surface contract](.impeccable/surfaces/workbench.md) carries workbench composition. Styles load [styles.css](src/styles.css), [ui-system.css](src/ui-system.css), [foundation-workspace.css](src/foundation-workspace.css), [studio-chrome.css](src/studio-chrome.css), [foundation-blueprint.css](src/foundation-blueprint.css), then [studio-slider.css](src/studio-slider.css). Frontmatter owns reusable token values; the [sidecar](.impeccable/design.json) extends them with materials, motion, responsive behavior and snippets. This document records the source design system and does not issue a verification verdict.

## Colors

Fluorescent green supplies the brand action and the highlight traveling along a dependency edge. Accent-soft and accent-ink provide restrained selected or contextual treatments. Positive, warning and negative retain their feedback meanings. Neutral surface, hover, active, canvas, text and separator roles are achromatic in both themes. Glass changes opacity, not hue.

Filled controls and segmented selections use one selected surface. Structural lines remain quiet; keyboard focus remains distinct. Authored colors, gradients and shadows are independent content, including their source color space and alpha. Their values do not inherit Studio's accent.

**The Independent Values Rule.** Studio appearance never rewrites authored token values or saved appearance preferences.

**The One Selected Surface Rule.** Use one neutral fill for selected material and segmented choices; preserve a distinct keyboard focus outline.

Root colors describe light appearance. The app restores the saved appearance and defaults to dark when no choice has been saved. New-project starter suggestions use Geist and the current accent; existing project values are preserved.

## Typography

Geist Variable is bundled locally for the interface, Geist Mono for code and measurements, and SUIT for Korean glyph fallback. The local font assets are explicitly served by the Studio asset allowlist. Arbitrary fonts named by project tokens remain subject to browser availability and fallback.

The heading, title, body, label and caption recipes in frontmatter are the shared interface hierarchy. Foundation tier headings use a local 18px/24px, 550-weight recipe; family headings use 13px medium text. Measurements are intentionally smaller than labels. Color and dependency-node values have a compact 9px exception; they do not establish the body type size.

Typography specimens use the token's family, weight, font size, line height and letter spacing. A display specimen is large because its authored size is large. Font-family and weight-only tokens use a fixed comparison text; body, label and display composites keep their actual authored differences. Oversized specimens may scroll within their own plane, and previews retain explicit display bounds without changing the source.

**The Type Is the Specimen Rule.** Render an authored typographic style on real text; do not replace every style with the same decorative Aa card.

## Layout

Desktop uses a 52px global header, flexible work row and 28px status bar. Navigation defaults to 232px and can be resized from 196 to 400px with pointer or keyboard input. At desktop viewport widths of 1100px or less it is visually capped at 280px. The inspector defaults to 304px and follows the existing compact-pane rules. The center uses minmax(0,1fr), and each workspace scrolls independently.

Control sizes are 28/32/36px. Workspace choices are 36px. Foundation roots use 16px insets, inspector content 12px, and related measurements group with 8px gaps. Narrow roots use 12px. At 720px the editor exposes Browse / 탐색, Workspace / 작업 영역 and Inspect / 속성 as separate accessible panes instead of maintaining three fixed columns.

Foundation subsection tabs stay sticky within their own scrolling pane. Domain cards separate one blueprint each with modest boundaries. Token families sit under a single Primitive or Semantic heading, with 26px between family groups and a larger break between tiers. The standard ten brand shades, 50 through 900, use a four-pixel gap and one square row at Full HD; smaller widths can scroll that row locally.

Spacing and sizing align values on a ruler origin. Radius keeps the corner preview. Border and typography use rows, while shadows use an open plane. Semantic maps expose the source-to-role relationship; advanced reference details remain accessible under line, type and measurement specimens. A family provides the name context, so visible leaf labels avoid repeating the path. Contextual add inherits domain, tier, type and prefix. List and explicit bulk selection remain available.

Domain accordions in navigation start closed and expand for matching search results. Navigation and inspector may collapse independently while their forms remain mounted. Resizing and collapse are appearance preferences; they do not edit the project. Enhanced scroll indicators track native scrolling rather than replacing wheel or keyboard scrolling.

## Elevation & Depth

**The Flat Glass Rule.** Structural glass uses neutral opacity and backdrop diffusion without inset highlights or bevels.

Panels, headers and raised surfaces use the frontmatter glass roles at 54%, 58% and 80% opacity. Structural chrome uses 32px blur with restrained saturation. A neutral ambient ground supplies something for the translucent panes to diffuse. Floating canvas tools and zoom controls use a soft downward shadow, while tooltips use a smaller, separate shadow. Reduced transparency restores opaque structural surfaces and removes their backdrop filters.

Dependency glow travels only along real authored edges. A selected theme can change the source edge; composite and property references remain actual references. Reduced motion removes the traveling stroke and leaves the connection visible. Menus, disclosure, scroll indicators and selection movement use semantic timing. Motion and material values are extended in the sidecar; the presence of a motion definition is not temporal quality evidence.

## Shapes

Optical nesting replaces one radius applied at every size: small details and compact actions use eight-pixel corners, standard controls use twelve-pixel corners, and larger floating surfaces use sixteen-pixel corners. The fifteen-pixel checkbox retains a proportional four-pixel corner. True circular tools and indicator dots stay circular; the canvas tool dock is a capsule with an extended active tool.

Domain blueprints use crisp SVG geometry, construction lines, measured guides and unshaded layered outlines. A domain has one drawing. Token color surfaces remain square. Rulers, strokes and text rows use open geometry rather than enclosing every value in a card. Authored radius values remain independent from the Studio corner system.

Icons use rounded caps and joins with a 1.4-unit stroke in a 20-unit view box. Most icons render at 16px and workspace icons at 17px. Named icon controls retain accessible labels and contextual tooltips.

## Components

### Buttons, inputs and checkbox

Primary actions use the accent with dark text; secondary actions use a tonal fill and transparent resting border; subtle actions begin transparent; danger pairs negative ink with its soft surface. Small actions follow the nested radius, standard actions the control radius. Hover, focus, disabled and busy states remain explicit.

Managed inputs use compact neutral fills and invalid-state treatment. Fields may stack or align labels with values. Checkboxes use a neutral filled box and an accent check or indeterminate mark. Korean composition and incomplete numeric text belong to the owning form, not to a render-time normalization step.

### Authored dropdown

Select pairs a compact trigger and inset chevron with a frosted listbox. Arrow, Home/End, Page keys, typeahead, Enter/Space, Escape, Tab and outside dismissal retain the component's behavior. A hidden native proxy preserves form labels, required validation, reset and fieldset semantics. The popup clamps to the viewport and can remain inside an owning dialog's top layer. Consumer previews retain their authored controls.

### Precision slider

StudioSlider combines a bounded native pointer range with a lexical precision field and an optional unit. The value, gradient and ruler variants share one container, clear focus and disabled/error treatment. A range gesture stays within the configured window; exact text can retain values outside it or incomplete input for the owner to validate. Arrow keys use one step, Page keys ten steps and Home/End the endpoints. The precise input remains compatible with Korean composition.

The ordinary track is thin and neutral with a white thumb. Gradient controls expose the authored channel ramp; ruler controls use fine ticks and a small accent marker. These are Studio authoring controls, separate from generated consumer sliders.

### Chips, tabs and specimens

Choice chips and Specimens / 견본 versus List / 목록 use a neutral selected fill. Subsection tabs use neutral ink and an underline, keyboard navigation and local horizontal reveal. A domain card owns one blueprint. Square color swatches use leaf labels; spacing and sizing share a ruler; stroke is a horizontal sample; shadow is one elevated object; typography is actual styled text.

Primitive headings describe base scales and Semantic headings describe roles. Reference maps use actual source IDs and selected-theme expressions, with source names and values beside the edges. Card checkboxes appear only in explicit selection mode. A specimen is a display projection, not a replacement source value.

### Navigation and contextual inspector

The navigation rail combines a fluorescent workspace choice with quiet, initially collapsed domain sections. Token paths split into family context and a short terminal value. The resize separator supports pointer drag, arrow keys, Home/End and a reset gesture. The former lower Axiom UI footer remains absent.

The floating canvas tool dock uses circular inactive tools and a labeled active capsule. Contextual tooltips support icon controls. The component inspector starts with Design / 디자인 and Source / 소스, then compact property sections. Layout choices, paired dimensions, inline bindings and the uniform-padding diagram precede advanced metadata. Domain purpose and token type both contribute to property compatibility; unrestricted domains remain separate type-compatible candidates.

### Library specimens

A library preview should identify the component's recognizable structure rather than reuse one button or card for unrelated controls. Upstream catalog references describe provenance and comparison targets. They do not install those libraries, confer runtime semantics or certify every catalog interaction. Unsupported authoring or target behavior must remain explicit.

The canvas artboard is a separate rectangular preview environment: its backdrop follows the active project's resolved surface, and metadata follows its content color. Do not paint Studio radii or backgrounds onto transparent authored roots. Sparse color families retain the same bounded square scale as full ten-stop rows; shadow specimens use a shared neutral comparison plane.

## Do's and Don'ts

- **Do** reuse semantic roles, optical radii and shared authoring controls.
- **Do** show each token through a material-appropriate specimen and preserve its exact source value.
- **Do** connect semantic roles with actual references, including active theme overrides.
- **Do** preserve keyboard focus, Korean composition, reduced motion and reviewed source changes.
- **Do** keep local scroll and navigation adjustments independent from project data.

- **Don't** tint neutral Studio planes with the accent or add inset panel bevels.
- **Don't** repeat every token path below an existing family heading.
- **Don't** force all materials into identical or nested cards.
- **Don't** fabricate dependency edges or imply every catalog preview has a complete runtime implementation.
- **Don't** treat design context, static captures or source generation as proof of platform readiness or Foundation completion.

Legacy selector specificity remains part of the source cascade. New surfaces should use the shared recipes rather than promote incidental eyebrow styles, control shadows or local text weights into additional system rules. Verification and remaining implementation obligations belong to their separate records.
