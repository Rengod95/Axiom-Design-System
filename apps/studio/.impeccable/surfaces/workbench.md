# Axiom Studio workbench

Mode: Operate. Surface: the local browser design-system editor.

## Direction contract

THESIS: A dark material workbench makes the actual token value the primary browsing surface. Fluorescent lime identifies selection and action; neutral planes carry editing.

OWN-WORLD: The owner's navigation reference supplies Signal lime, sampled from the original image as RGB 185/255/70. SUIT, thin rounded SVG outlines, pill workspace navigation, and vertically generous property groups define Studio. Studio appearance is independent from authored design tokens. First-run appearance is dark; existing explicit light preferences remain valid.

STORY: Domains lead to material specimens. Selecting a specimen reveals its contextual value controls, scope, source, and bindings; Apply to preview enters the existing reviewed change. Lists remain available for comparison and bulk management. Selecting an authored component connects its Part, appearance, and linked token.

FIRST VIEWPORT: A stable workspace rail, restrained header, grouped material sheets, and quiet inspector. Actual token values are the visual anchor. Names, readable measurements, and usage context follow each specimen. The selected material appears again before its value controls.

FORM: Direction seed 0b6cfbbd, Operate slot 7, with user-pinned form priority. The [direction contract and seed execution note](../../../../docs/implementation/studio-lime-redesign.md) record observed results, including successful API pool c3b204a1eed6 and the absence of a separately saved raw log. Code-first and both-theme decisions were already confirmed. No image-comp approval is needed.

FINISH: The current identity is extracted into [DESIGN.md](../../DESIGN.md) and the [extension sidecar](../design.json). The [finish review](../../../../docs/implementation/studio-lime-finish-review.md) and [verification record](../../../../docs/implementation/studio-lime-verification.json) retain their distinct visual and functional scopes.

This 2026-09-14 contract replaces the prior violet workbench authority. The earlier familiar-editor references still inform clarity and source relationships; their old violet color, smaller shared controls, and compact type roles are superseded by the implementation recorded in DESIGN.md.

## Selected-token composition

The desktop grid has a 60px header, independently scrolling work row, and 32px status row. The rail is 228px and the effective inspector is 348px at full desktop width. Workspace navigation uses a measured lime pill, with quieter component and token selection below. The header preserves project, review/save, appearance, language, and export actions.

Foundation domains display actual materials rather than generic domain icons. Within a domain, the atlas groups tokens by domain, tier, type, and a shared name family when at least three members exist. Primitive groups sort first. Color, spacing, radius, shadow, typography, motion, opacity, and sizing use their own visual forms; unresolved values remain explicit. Authored colors, including purple, remain unchanged.

A selected token shows a material specimen before editing scope and value controls. Picker, Hex, and Alpha share the first color row; color space and channels disclose below. Shadow geometry pairs X/Y and Blur/Spread, followed by Inset and compact color. Existing-token Definition, Lifecycle, origin, usage, and management remain secondary disclosures. Creating a token exposes its definition first. Draft specimen and current-theme specimen labels distinguish a form buffer from the current source.

The component inspector starts from the selected Part and groups Layout, Fill, Text, and Border and corners. Related dimensions share rows, and bindings carry miniature specimens plus a route to the linked token. Source and secondary contracts remain available through disclosure.

## Shared system and cascade

The reusable type recipes, palettes, radii, spacing, and component states are normative in DESIGN.md. Shared controls use the 32/40/48 minimum-height scale; actual boxes can grow for padding and text, and compact or native fallback controls keep their observed exceptions. Complete SUIT samples and individual field/button line-height recipes are documented separately.

The final editable-border roles are neutral in both appearances. Ordinary fields use control-border, while inset inspector fields use a transparent resting border over surface-subtle. Current hover/focus border declarations lose to that resting selector; the global keyboard outline and important invalid edge remain effective. This source limitation is recorded without establishing a desired future hover rule.

The root CSS is light, but App reads axiom.ui.theme with a dark fallback and retains explicit saved preferences. The Studio switch does not select an authored ADS theme or rewrite token values. Stylesheet order is styles.css, ui-system.css, then foundation-workspace.css; specificity and local exceptions remain part of the implemented system.

## Motion and depth

A measured pill animates workspace selection without moving labels. Fast feedback uses 150ms; disclosure and modal entry use 250ms with cubic-bezier(.22,1,.36,1). Marker height is set directly, with only translation and opacity animated. Details retain mounted children; unsupported block-size interpolation falls back to native disclosure behavior.

Floating tools use translucent surface, backdrop blur, a stronger neutral edge, and soft elevation. Structural panels remain flat. Shadow specimens keep a stable light comparison ground in both Studio appearances. Replayable material motion is a bounded display projection and honors reduced motion. These source behaviors do not imply temporal visual approval.

## Responsive behavior

At 1100px the effective rail and inspector are 200px and 316px; domain and control galleries become one column. Earlier 1200px and 900px layout rules still hide or compact local content, while shared width declarations supersede their inspector sizes. At 720px, Browse, Workspace, and Inspect select one full-width pane. Material color grids adapt to 86px minimum columns. The 300px inspector container rule adjusts row-label proportions and horizontal section padding.

The same roles serve Foundation, library, canvas, inspector, review, export, and Axiom UI. Narrow-screen and high-specificity control exceptions are retained in the cascade record; no universal 48px mobile-control claim is made.

## Evidence and approval scope

The finish review disposition is **ship for four scored fixes only**:

- Compact Foundation color and shadow control hierarchy.
- Readable composite specimen captions.
- Direction-seed persistence and the explicit non-raw execution note.
- Shared neutral editable-border roles.

The reviewer reopened all nineteen recaptures and verified them against the refreshed SHA256 manifest. Local archived copies are under ignored dist/evidence/lime-*.png, with committed [capture metadata](../../../../docs/implementation/studio-lime-verification.json). States are domains-dark, atlas-dark, color-inspector, spacing, radius, shadow, typography, motion, opacity, sizing, component-inspector, system-dark, system-controls, system-motion, system-light, domains-light, user-1312, mobile, and mobile-light. They include desktop, the 1312px Korean view, and both 390px themes. Temporary review copies are not durable authority.

The verdict does not approve the whole surface, temporal behavior, or List rendering; List had no capture. The documenter read current source and the supplied review, without rerunning a browser or detector. The single detector run compared against stale DESIGN.md and produced 45 advisory mismatches plus one height-transition warning; the height transition was subsequently removed mechanically. No fresh detector verdict is implied.

Functional test results are owned by the verification record, not inferred from screenshots or this extraction. Full Foundation completion, complete DTCG Resolver coverage, assistive-technology validation, and native execution retain their separate evidence requirements. The new identity ships no raster imagery: UI materials use code, SVG, and the locally bundled font.

## Continuing authoring behavior

Valid form buffers join the shared review boundary. Invalid values retain correction/reset paths and the last valid preview. Source provenance, rejected buffers, project recovery, apply/discard, and atomic Undo remain explicit. Foundation Files still preserves staged import separately from project edits, provides preview/conflict/context choices, and distinguishes selected-theme output from original sources and the whole ADS project bundle. Tab reveal scrolls its horizontal strip without moving independently scrolled work panels.
