---
name: "Axiom UI"
description: "A material workbench with signal lime, SUIT, and independent light and dark Studio themes."
colors:
  brand: "#b9ff46"
  accent: "#b9ff46"
  accent-hover: "#a9ef36"
  accent-soft: "#eaf7d7"
  accent-ink: "#355b0b"
  surface: "#fcfcfa"
  surface-subtle: "#f3f4f0"
  surface-hover: "#e9ece4"
  surface-active: "#dde3d5"
  canvas: "#eef0e9"
  canvas-dot: "#d5d9cf"
  ink: "#21241d"
  ink-secondary: "#575d50"
  ink-tertiary: "#68705f"
  line: "#e0e4da"
  line-strong: "#c5cdba"
  control-border: "#7a826f"
  positive: "#24714c"
  positive-soft: "#e9f5ed"
  warning: "#8c570d"
  warning-soft: "#fff4dd"
  negative: "#b23242"
  negative-soft: "#fff0f1"
  focus: "#568b12"
  selection: "#d8f7ad"
  overlay: "rgb(18 23 35 / 32%)"
  on-accent: "#172108"
  accent-dark: "#b9ff46"
  accent-hover-dark: "#c9ff75"
  accent-soft-dark: "#29351c"
  accent-ink-dark: "#c6fa80"
  surface-dark: "#171816"
  surface-subtle-dark: "#1c1e1a"
  surface-hover-dark: "#272a24"
  surface-active-dark: "#34392c"
  canvas-dark: "#10110f"
  canvas-dot-dark: "#2a2e25"
  ink-dark: "#f0f2eb"
  ink-secondary-dark: "#b7beae"
  ink-tertiary-dark: "#929c87"
  line-dark: "#2e3228"
  line-strong-dark: "#484f3e"
  control-border-dark: "#747f66"
  positive-dark: "#8bdbb0"
  positive-soft-dark: "#213e30"
  warning-dark: "#efc575"
  warning-soft-dark: "#44351c"
  negative-dark: "#ff9aa9"
  negative-soft-dark: "#472a30"
  focus-dark: "#b9ff46"
  selection-dark: "#3e5426"
  overlay-dark: "rgb(0 0 0 / 58%)"
  shadow-specimen-ground: "#dfe2d9"
typography:
  heading:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "24px"
    fontWeight: 650
    lineHeight: "32px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: "26px"
    letterSpacing: "-0.015em"
  body:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "14px"
    fontWeight: 450
    lineHeight: "22px"
  label:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "13px"
    fontWeight: 550
    lineHeight: "18px"
  caption:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 450
    lineHeight: "18px"
  button:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.4
    letterSpacing: "0px"
  button-large:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "14px"
    fontWeight: 550
    lineHeight: 1.4
    letterSpacing: "0px"
  field-control:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "14px"
    fontWeight: 450
    lineHeight: 1.4
  field-label:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.4
  section-title:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "13px"
    fontWeight: 650
    lineHeight: 1.5
  badge:
    fontFamily: "SUIT,Geist,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: "16px"
  material-code:
    fontFamily: "ui-monospace,Consolas,monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  sm: "6px"
  control: "10px"
  panel: "16px"
  sheet: "12px"
  pill: "999px"
  floating: "14px"
  choice: "7px"
  segment: "8px"
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
    padding: "8px 12px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-dark:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.on-accent}"
  button-primary-dark-hover:
    backgroundColor: "{colors.accent-hover-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  button-subtle-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.negative-soft}"
    textColor: "{colors.negative}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  button-small:
    typography: "{typography.button}"
    padding: "8px"
    height: "32px"
  button-large:
    typography: "{typography.button-large}"
    padding: "8px 16px"
    height: "48px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "7px"
    width: "40px"
    height: "40px"
  icon-button-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.field-control}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
    height: "40px"
  inspector-field:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.field-control}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
    height: "40px"
  field-select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.field-control}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  workspace-navigation:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "12px 16px"
    height: "48px"
  workspace-navigation-selected:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-accent}"
  object-navigation:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
    height: "36px"
  object-navigation-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  choice-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "32px"
  choice-chip-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  badge:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.badge}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
    height: "24px"
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
  material-card:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  material-card-selected:
    backgroundColor: "{colors.accent-soft}"
  section-heading:
    typography: "{typography.section-title}"
    padding: "16px"
  section-content:
    padding: "24px 16px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    padding: "16px 0"
  tab-selected:
    textColor: "{colors.accent-ink}"
---

# Design System: Axiom UI

## Overview

**Creative North Star: "The material workbench"**

Axiom UI is a precise, tactile editor whose actual values carry the visual interest. Signal lime marks primary action and selection; charcoal or chalk planes carry the work. SUIT, rounded outline icons, and generous vertical grouping give Korean and English authoring the same measured rhythm.

The interface is built directly in code. Flat structural panels, restrained glow on active navigation, and glass on floating canvas tools establish depth without competing with the authored system. This identity belongs to Studio: a person's colors, type, shadows, and motion remain independently authored content.

**Key Characteristics:**

- One fluorescent signal color across dark and light Studio appearances.
- Shared SUIT roles, rounded controls, and vertically separated property groups.
- Actual material specimens connected to contextual controls and reviewed changes.
- Thin SVG outlines, tonal structural layers, and purposeful motion.

This code-derived authority refreshes the explicitly replaced violet world. The durable brief is [PRODUCT.md](PRODUCT.md); the selected-token composition and evidence limits live in the [workbench surface record](.impeccable/surfaces/workbench.md). The [direction contract](../../docs/implementation/studio-lime-redesign.md) records seed and reference provenance. No shipping raster imagery is used for the new identity: the interface uses code, inline SVG, and the locally bundled font.

The frontmatter is normative for extracted reusable tokens. The [v2 sidecar](.impeccable/design.json) adds elevation, motion, responsive and cascade metadata, and self-contained snippets. Runtime imports [styles.css](src/styles.css), [ui-system.css](src/ui-system.css), then [foundation-workspace.css](src/foundation-workspace.css). A later file does not override a more specific selector automatically. Component heights are minimum heights unless explicit geometry is noted below; they do not promise every native field or compact tool has that size.

## Colors

Signal lime sits on slightly green neutral planes, with readable neutral ink and separate feedback colors.

### Primary

The brand role is **Signal lime**, sampled from the owner's original navigation reference. Accent supplies primary buttons; accent-hover supplies theme-specific hover feedback. Accent-soft and accent-ink identify selected objects, chips, links, tabs, and relationship cues. On-accent is the dark foreground for both themes' solid lime actions.

### Neutral

Surface is the main editing plane; surface-subtle separates the rail and inset controls. Surface-hover and surface-active express interaction. Canvas and canvas-dot support document space. Ink, ink-secondary, and ink-tertiary step from primary content to supporting metadata. Line divides structure; line-strong strengthens secondary controls and non-editable edges; control-border identifies ordinary editable fields. Both palettes have corresponding roles in the frontmatter.

Shadow-specimen-ground is a fixed neutral comparison stage in both appearances, and its shadow object uses the light surface color. This makes authored shadow differences inspectable on stable ground; it is not a dark-theme panel token.

### Feedback and focus

Positive, warning, and negative each have a paired soft surface. Preserve their meaning and pair color with text or an actual state. Focus supplies the visible keyboard outline; selection supplies native text selection. Overlay dims the work below a dialog.

**The Independent Values Rule.** Studio appearance is separate from authored ADS theme contexts and token values. Preserve authored purple, other project colors, and explicit saved appearance preferences when changing the editor identity.

**The Boundaries Have Jobs Rule.** Structural separators use line, secondary edges use line-strong, and ordinary editable fields use control-border. Inset inspector fields are a documented tonal exception; focus and invalid state still need their own visible treatment.

The CSS root defines light values. App initializes from the saved axiom.ui.theme preference and falls back to dark, then writes the chosen value to the root data-theme attribute. A saved light preference remains valid.

## Typography

**Interface Font:** Locally hosted SUIT Variable, with Geist and platform sans-serif fallbacks from the frontmatter.
**Code Font:** The platform monospace stack in material-code.

The complete shared recipes are heading, title, body, label, and caption. Heading and title establish screen and section hierarchy; body explains an action; label names a control; caption carries metadata. Button, field-control, field-label, section-title, badge, and material-code record actual component recipes where line-height or weight differs from the named type samples.

The role sizes form a practical editor hierarchy rather than a fixed ratio. Axiom UI demonstrates all five complete recipes. Root body weight comes from weight-regular; ordinary paragraphs still use a unitless line-height of 1.6. Buttons and managed fields use leading-label at 1.4. Badge and material-code keep their own line boxes. The SUIT wordmark retains its local branding recipe; it is not a general heading style.

**The Scope Shared Roles Rule.** Use shared role variables for Studio chrome, and inspect the actual cascade before claiming every element uses a complete type recipe. Authored typography specimens render the user's value with documented display bounds.

## Layout

The desktop workbench fills the dynamic viewport. Its main grid has a 60px header, flexible working row, and 32px status row. The default rail is 228px; the effective inspector is 348px after the shared stylesheet loads. The middle pane remains minmax(0, 1fr), and working panels scroll independently.

Use the extracted spacing rhythm. Shared sections separate controls by 20px and use 24px vertical by 16px horizontal content padding. Row fields align labels and values; related dimensions use two equal columns with 16px vertical and 12px horizontal gaps. Actions wrap rather than hiding their labels.

The domain directory uses two columns with 28px vertical and 24px horizontal gaps. Material groups are separated by 36px. General specimen grids grow from 156px minimum columns; colors start at 96px, typography at 220px. Specimens precede their name, readable measurement recipe, and usage or alias metadata. Values wrap; they are not a substitute for precise source inspection.

At 1200px the earlier stylesheet reduces the rail to 200px and compresses header content; its inspector override is superseded by the later shared root. At 1100px the shared stylesheet fixes the rail at 200px and inspector at 316px, while domain and control galleries become one column and material gutters reduce to 16px. Earlier 900px rules hide additional header detail and compact local layouts; their width variables are likewise superseded. At 720px the app uses a single pane with Browse, Workspace, and Inspect tabs. Its rows become 48px, 40px, flexible content, and 28px. The selected pane owns the width. Narrow color grids use an 86px minimum.

Small-screen shared buttons and managed fields receive larger minimum targets, but higher-specificity size variants and compact toolbar rules remain. The mobile base minimum does not make every small Button or icon 48px. The inspector's 300px container rule tightens label proportions and horizontal padding.

## Elevation & Depth

Tonal layering establishes structural depth; soft shadows belong to floating tools and dialogs. Selection rings mean selection, not elevation. Exact shadow, glow, and blur recipes live in the sidecar because they do not fit the frontmatter schema.

Canvas tools mix the current surface with transparency, blur the backdrop, and retain a stronger edge plus a subtle inset highlight. Active workspace navigation carries the lime pill and a small ambient glow. The inspector and side rail remain flat.

**The Elevate by Role Rule.** Keep structural panes flat. Use floating-shadow for detached tools and dialog-shadow for modal surfaces. Preserve the stable light ground behind authored shadow specimens.

Motion is informed by the transitions.dev reference recorded in the direction contract: fast color feedback, smooth-out selection and disclosure, and a short dialog reveal. The navigation marker animates translation and opacity while its measured height is set directly. Native disclosure animates block-size and opacity where browser support permits; children remain mounted. Reduced-motion rules remove nonessential animation and transitions. Static review images do not establish temporal visual approval.

## Shapes

Shared controls have soft, contained corners; panels are broader, and material sheets sit between them. Full pills belong to workspace navigation and the brand swatch. Badges use the small radius. Choice options, segmented switches, and floating canvas tools retain dedicated shapes.

Icons use a 20-unit view box, 1.4-unit current-color stroke, rounded caps and joins, and no fill. They default to 16px; workspace navigation displays them at 20px. Keep accessible names on icon-only actions. Do not replace inline SVG with font glyphs.

## Components

### Buttons

Four tones share Button: primary, secondary, subtle, and danger. Primary uses solid lime and dark text; secondary retains a neutral fill and outline; subtle has a transparent resting surface; danger pairs negative ink with its soft surface. The sm, md, and lg APIs change minimum size and horizontal padding. Padding and text can make the smallest button taller than its minimum.

Hover changes surface color; active secondary, subtle, danger, and icon controls use surface-active. Primary active uses accent-hover. Disabled controls retain reduced opacity and disabled semantics; aria-busy uses the progress cursor. Keyboard focus uses the shared outline. IconButton is 40px square by default, with compact and narrow-screen overrides.

### Inputs / Fields

Field supports stacked and aligned-row labels. Managed text fields use field-control and the neutral editable boundary. Managed selects have automatic height with the shared minimum and explicit block padding; textareas start at a 76px minimum. Outside those managed selectors, native controls retain fallback padding and the base native select remains 32px high.

Inspector fields use surface-subtle with a transparent resting border. The current resting selector is more specific than its hover/focus border selectors, so those intended border shifts do not reliably override it; keyboard focus still uses the global outline, and invalid state uses the important error edge. The sidecar records this cascade as an implementation limitation, not a desired state rule.

Color editors place picker, Hex, and Alpha together. Color-space and channel controls disclose progressively; non-sRGB values expose that group. Shadow editors pair X/Y and Blur/Spread before Inset and compact color controls. Units remain visible. Input composition and invalid buffers retain the existing reviewed workflow.

### Chips and choice controls

Choice chips are small Button instances with pressed state, accent-soft fill, accent-ink text, and an accent edge. Badges use neutral or semantic soft pairs. Grouped choices use an inset track and tonal selected option; segmented workspace modes use their own rounded track. These patterns retain distinct state semantics.

### Cards / Containers

Catalog cards use panel corners and an actual component specimen above the name. Their selected edge and ring use accent. Material cards use sheet corners, a transparent resting edge, neutral hover edge, and accent-ink selected edge with a soft ring. They render color, gradient, shadow, radius, size, spacing, typography, border, easing, duration, opacity, layers, or scalar values according to the authored token.

Material visualizations are bounded display projections. Units, source recipe, unresolved state, and usage explain what is shown. Supported color specimens preserve source color space and alpha; they do not normalize the source to the Studio palette.

### Navigation

The rail has lime pill workspace navigation and quieter nested object selection. The marker is measured from the active item; text stays stationary. Tabs use an active underline and accent ink, retain Arrow/Home/End behavior, and reveal the selected tab by scrolling only its horizontal strip. Narrow viewports select one working pane.

### Contextual inspector

The selected token's material precedes value controls. Editing scope and value source remain explicit; Definition, Lifecycle, resolved origin, Usage, and Manage disclose according to context. The component inspector begins with the selected Part and groups Layout, Fill, Text, and Border and corners, with secondary content and source contracts below. A binding carries a small material preview and a path to its token. Apply to preview feeds the existing review boundary; draft, reviewed, and saved work remain distinct.

## Do's and Don'ts

### Do:

- **Do** reuse semantic CSS roles and shared primitives before adding another local recipe.
- **Do** preserve the same role meanings in dark and light Studio appearances.
- **Do** keep authored material values independent from the Studio brand.
- **Do** group related measurements and leave vertical space between property groups.
- **Do** pair specimens with readable names, measurement recipes, bindings, and unresolved states.
- **Do** retain accessible icon labels, visible focus, reduced motion, and Korean input composition.
- **Do** verify selector precedence when extending shared controls or responsive behavior.
- **Do** keep review and source-provenance states explicit at the point of change.

### Don't:

- **Don't** change saved appearance or authored project values to enforce a new default.
- **Don't** replace ordinary editable boundaries with faint structural separators.
- **Don't** make structural panes glow or float just because active navigation and tools do.
- **Don't** squeeze three desktop panes into a narrow viewport.
- **Don't** substitute truncated composite JSON for a readable material caption.
- **Don't** treat a static capture, catalog entry, or generated source as proof of temporal behavior or native execution.
