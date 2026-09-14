---
name: "Axiom UI"
description: "A compact glass workbench with Geist, achromatic planes and fluorescent green action."
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
  glass-panel: "rgb(250 250 250 / 58%)"
  glass-header: "rgb(255 255 255 / 60%)"
  glass-raised: "rgb(255 255 255 / 74%)"
  glass-edge: "rgb(255 255 255 / 75%)"
  glass-sheen: "rgb(255 255 255 / 48%)"
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
  dark-glass-panel: "rgb(23 23 23 / 58%)"
  dark-glass-header: "rgb(29 29 29 / 60%)"
  dark-glass-raised: "rgb(35 35 35 / 72%)"
  dark-glass-edge: "rgb(255 255 255 / 9%)"
  dark-glass-sheen: "rgb(255 255 255 / 6%)"
  on-accent: "#152009"
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
    fontSize: "11px"
    lineHeight: "16px"
rounded:
  control: "8px"
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
    rounded: "{rounded.control}"
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
    rounded: "{rounded.control}"
    height: "28px"
  choice-chip-selected:
    backgroundColor: "{colors.surface-active}"
    textColor: "{colors.ink}"
  material-card:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "3px"
  material-card-selected:
    backgroundColor: "{colors.surface-active}"
  section-add:
    backgroundColor: "{colors.surface-subtle}"
    rounded: "{rounded.control}"
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
---

# Design System: Axiom UI

## Overview

**Creative North Star: "Compact glass workbench"**

Axiom UI is a compact glass workbench. Achromatic planes recede behind the authored materials; fluorescent green identifies action. Geist, consistent rectangular corners, thin SVG icons and tightly grouped controls give English and Korean authoring a consistent rhythm.

Translucent rails, inspectors and overlapping menus share neutral edge light and soft backdrop diffusion. Headers and footer use flat translucent fills without an internal highlight or inset bevel. Both themes retain the same hierarchy. Studio appearance stays independent from the user's authored colors, typography and saved theme preferences.

**Key Characteristics:**

- Achromatic grounds with a fluorescent action accent.
- Compact controls and aligned panel bars.
- Material specimens with contextual creation and inspection.
- Shared glass depth in dark and light appearances.

This refresh follows the owner's explicit replacement of the earlier spacing, font and neutral palette. [PRODUCT.md](PRODUCT.md) records durable commitments; the [surface contract](.impeccable/surfaces/workbench.md) and [refinement record](../../docs/implementation/studio-panel-binding-refinement.md) record composition and evidence. [styles.css](src/styles.css), [ui-system.css](src/ui-system.css), then [foundation-workspace.css](src/foundation-workspace.css) define the effective cascade. Frontmatter owns reusable tokens; the [sidecar](.impeccable/design.json) extends it with material, motion and snippets.

## Colors

The brand and accent roles are fluorescent green. Accent-soft and accent-ink support action, links and relationship cues; positive, warning and negative preserve feedback meaning. Neutral surface, hover, active, canvas, ink and line roles are achromatic in both themes. Glass roles vary opacity, not hue.

Line separates structure, line-strong marks a stronger boundary and control-border supplies eligible control edges. Filled controls and specimen selection do not receive an additional accent outline. Authored color and shadow specimens remain independent content; shadow comparisons use a stable neutral ground.

**The Independent Values Rule.** Studio appearance never rewrites authored token values or saved appearance preferences.

**The One Selected Surface Rule.** Use a neutral fill for selected specimens and segmented choices; preserve a distinct keyboard focus outline.

CSS root values describe light appearance. The app restores the saved appearance and defaults to dark only when there is no saved choice.

## Typography

Geist Variable is locally bundled for the interface; SUIT is the Korean glyph fallback. Geist Mono is locally bundled for code and material measurements. Shared heading, title, body, label and caption recipes are normative in frontmatter and demonstrated by Axiom UI.

The complete role recipes do not override every local text style. Buttons use medium weight and 1.4 leading; managed fields use 12px with 1.4 leading; Select uses 450 weight and an 18px line box; badges use their local 11px/16px recipe. Existing root headings and the wordmark retain local weights. Reuse complete roles for new surfaces rather than copying incidental literals.

## Layout

Desktop rows are a 52px header, flexible work row and 28px status bar. Rail and inspector defaults are 196px and 304px. Foundation navigation, canvas tools bar, selection actions and token context header align on 44px bars. The middle pane uses minmax(0,1fr); workspaces scroll independently. Foundation subsection tabs remain sticky inside their scrolling pane.

Control size variants use 28/32/36px minimum heights. Workspace choices are 36px with 7px vertical and 10px horizontal padding. Foundation roots use 16px insets; inspector content uses 12px. Section content uses 10px gaps and 0 12px 12px padding. Related measurements use two columns with 8px gaps. Descriptions follow section titles by 4px.

Material families are separated by 24px. General, color and typography columns start at 140px, 88px and 220px respectively. Color surfaces remain square. A family supplies context; cards show local leaf names, and section add inherits classification and prefix. Full paths remain accessible and in source. Bulk checks appear only after selecting the explicit selection mode; List remains available.

An inherited 1200px rule sets the rail to 200px. At 1100px, the effective rail/inspector become 180px/288px and domain galleries become one column. At 720px, a single working pane replaces the three-column composition, with 52/40/flexible/28px rows and Browse/Workspace/Inspect choices. Narrow root insets become 12px and color minima 82px. Compact contextual targets retain exceptions to the shared mobile button minimum. Object rows have a 2px trailing gap. Independent header controls collapse either side column and persist browser preferences. Hidden forms stay mounted. Inspector-form recovery and successful object selection reopen the inspector; Foundation manager recovery returns to the workspace. Desktop collapse preferences do not suppress mobile panel navigation.

## Elevation & Depth

**The Shared Glass Rule.** Use translucent structural planes and frosted raised surfaces with restrained neutral edge light; reduced transparency restores solid surfaces.

Headers, sidebar, inspector and status use the shared glass roles over an achromatic ambient ground. Sidebar and inspector retain restrained neutral sheen; headers and footer have no internal gradient or inset shadow. Raised menus, tools and dialogs add soft depth. Chrome uses 24px blur; popup saturation is 1.08, chrome saturation 1.04, and dialogs use 28px blur. Primary actions retain a restrained accent glow. Exact material, shadows and motion live in the sidecar.

Selection moves by translation and opacity; disclosure and menus use semantic fast/reveal timing. Reduced motion removes nonessential transitions and animations. Reduced transparency removes blur and restores opaque surfaces. The static finish review does not establish temporal motion quality.

## Shapes

Rectangular Studio controls, navigation, menus, cards and specimen surfaces share an 8px corner. The 15px checkbox retains a proportional 4px corner, and circular indicators retain their actual shape. Authored geometry stays independent; rectangular color surfaces always use equal width and height. Borders establish structure without outlining every container.

SVG icons use rounded caps/joins and a 1.4-unit stroke in a 20-unit view box. Most controls display 16px icons, workspace navigation 17px. Icon-only controls retain accessible names and titles.

## Components

### Buttons, inputs and checkbox

Primary is solid accent with dark text; secondary is tonal fill with a transparent resting border; subtle starts transparent; danger pairs negative ink and its soft surface. Minimum height is represented by frontmatter height recipes. Hover and pressed feedback use semantic surface roles; disabled and busy semantics remain explicit.

Managed inputs use filled neutral grounds, compact padding and visible invalid treatment. Fields may stack or align labels with values. Checkboxes use a 15px neutral filled box with a compact accent check or indeterminate mark. Source/review state, composition and rejected-input recovery remain functional contracts.

### Authored dropdown

Select renders a compact trigger and frosted listbox with an inset chevron. It supports Arrow/Home/End/Page keys, typeahead, Enter/Space, Escape cancellation, Tab continuation and outside dismissal. A hidden native form proxy preserves labels, required validation, reset and fieldsets. Popups clamp to the viewport and stay inside an owning dialog's top layer. Consumer component previews retain their authored controls.

### Chips, tabs and cards

Choice chips and Specimens/List segments use a neutral selected fill. Subsection tabs use neutral ink and an underline, keyboard navigation and horizontal reveal without moving their parent panel. Badges use compact tonal or semantic pairs. Catalog and specimen selection use neutral fills without a competing accent border. A specimen is a bounded display projection of the authored value, not a replacement value.

### Navigation and contextual inspector

The rail has a fluorescent rounded workspace selection and quieter object navigation. The former lower Axiom UI footer is absent; Quick search exposes the system gallery. Canvas category, interaction mode and theme use named icon controls. The component inspector starts with Design/Source and compact property sections instead of a large identity heading.

Layout choices, paired dimensions, inline binding actions and an all-sides padding diagram precede advanced metadata. The diagram describes the currently supported uniform value, not independently editable sides. Token context uses a 44px bar; material and value come before collapsed metadata. Contextual creation prepopulates family defaults. Draft, review, save and Undo remain distinct. Property binding combines the token value type with the domain's declared use category. Unknown or unrestricted domains appear separately as type-compatible candidates; custom domain purpose is editable in Manage.

## Do's and Don'ts

- **Do** reuse semantic roles and shared primitives.
- **Do** keep related measurements together and disclose advanced metadata.
- **Do** preserve readable focus, Korean input composition, reduced motion and reviewed source changes.
- **Do** inspect selector precedence when extending a control.

- **Don't** tint neutral Studio surfaces with the accent.
- **Don't** repeat the full token path beneath a family heading.
- **Don't** add competing selection borders to filled specimen or view controls.
- **Don't** treat static captures or source generation as proof of motion quality, native execution or Foundation completion.

Known drift is not canonized: a more specific managed-field transparent-border selector still outranks ordinary hover/focus border declarations; the keyboard outline and important invalid edge remain. Legacy eyebrow styling and incidental heading weights are not new reusable type rules. Native execution, assistive-technology certification and full Foundation completion are outside this design record.
