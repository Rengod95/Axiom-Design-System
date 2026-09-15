# Compact glass Studio revision

Status: implemented and locally verified; independent compact review ships after its three scoped corrections.

The owner's 2026-09-14 video and direct feedback supersede generous spacing, SUIT primary typography, green-tinted neutral surfaces and redundant Foundation headers. The work retains the source/review boundary and all existing authored project values.

## Bounded implementation

- Local Geist Sans and Mono variable font assets from geist 1.7.2 (OFL); existing SUIT is Korean fallback. The official package's Next peer is install metadata only; Studio imports its font assets, never Next or Geist JavaScript. Build evidence must continue to show no external JS imports or Node adapter.
- Single-select control lives in ui.tsx. Existing react-dom 19.3.0 createPortal is allowed only there, for authored listboxes that preserve native form ownership. Keyboard operation, required validation, reset and disabled fieldsets remain part of verification.
- Compact chromes use achromatic neutral roles and fluorescent green #A3FF47. Both themes, reduced motion and reduced transparency retain usable solid/focus fallbacks.
- Foundation subsection navigation is sticky; token families supply contextual add and short display labels. Default specimens do not expose checkboxes; explicit selection mode and List retain bulk management.
- Component properties use short rows, inline token binding actions, layout pairs and a uniform-padding diagram describing the currently supported all-sides value.

## Reference evidence

The supplied [builder video](https://cdn.dribbble.com/userupload/40430823/file/large-cd8b73c3d8327748db387dfad3f10235.mp4) was inspected directly in Chrome: 800x600, 7.68 seconds. Its compact Layout/Size/Spacing hierarchy informs the inspector; no media is copied into the product. The live local editor was inspected at 1198x958. [Geist's official source](https://vercel.com/font) establishes the locally bundled face; [transitions.dev](https://transitions.dev/skill.html) informs semantic interaction motion.

## Verification

Local verification passes: 361 unit tests, strict TypeScript and 161 source boundary checks, a 142-input Studio build, browser storage, Studio editing, 22 workbench flows and representative Web/React Native target consumers. New browser cases exercise visible dropdown keyboard/pointer navigation, contextual add defaults and reentry, square swatches, shortened labels, sticky navigation and project preservation. The isolated Select probe also covers required validation, form reset, disabled fieldsets and viewport clamping.

Thirty named captures cover both themes, desktop widths 1440/1198/1401 and a 390px layout. An independent review requested stronger shared glass material, clearer light structural separators and aligned 44px token headers; the complete capture set was regenerated after that bounded fix batch. Final disposition and archival hashes are recorded in studio-compact-finish-review.md and studio-compact-verification.json.

Live local reload was performed only after confirming saved state and no pending input, and preserved the project revision. Native execution, assistive-technology certification and full Foundation completion are outside this UI revision's evidence.
