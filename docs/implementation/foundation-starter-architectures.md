# Foundation starter architectures

The owner requested at least five additional primitive/semantic templates and clearer domain selection on 2026-09-15. The starter selector now offers Axiom Essentials plus five editable adaptations. A template changes the proposed token structure; choosing one does not apply it. The ordinary reviewed authoring transaction, save and Undo remain authoritative.

## Research and implemented distinctions

These are Axiom-authored starting points informed by official architecture documents. They are not upstream token exports, upstream component packages, or certifications of compatibility. All five adapt every selectable domain; shared fallback domains retain the Axiom conventions documented in ADR-0016.

| Template | Structural distinction | Implemented examples |
| --- | --- | --- |
| Radix · Interaction | Role-indexed, 12-step neutral and brand palettes, independently represented in light and dark. | Canvas → step 1; subtle surface → 3; selected surface → 5; primary text → 12. Default control radius 6px. |
| Carbon · Layers | Palette → explicit layer/field/text roles. Light layers alternate; dark layers become progressively lighter. | `carbon.role.layer.01`, `.02`, `.03`; spacing begins 0/2/4/8/12/16px; default control radius 2px. |
| Material · Roles | Reference steps → system roles, including surface containers and on-surface roles. | Primary points to 40 in light and 80 in dark; primary container points to 90/30; default control radius 12px; display text 57px. |
| Fluent · States | Global scale → role/state aliases, with separate resting, hover and pressed backgrounds. | Neutral background/foreground/stroke roles; default control 32px and radius 4px; display text 40px. |
| Spectrum · Scales | Global → accent → semantic role chain, plus size-oriented defaults. | `spectrum.accent.default` feeds `spectrum.alias.accent.background.default`; default control 32px; display text 50px. |

[Radix's scale guide](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) assigns distinct background, border, solid-action and text purposes to its twelve steps. Axiom follows that role organization but generates its own brand ramp; Radix's published contrast guarantees do not apply to this adaptation.

[Carbon's color architecture](https://carbondesignsystem.com/elements/color/overview/) keeps roles constant while theme values change, and distinguishes alternating light layers from progressively lighter dark layers. The adaptation implements one light/dark pair; it does not implement all four Carbon themes or contextual nesting. Its compact spacing is informed by the [Carbon spacing scale](https://carbondesignsystem.com/elements/spacing/overview/).

[Material's reference/system map](https://github.com/material-foundation/material-tokens/blob/main/tokens.md) supplies the architecture and primary/container mappings. This repository is an archived official reference. Axiom's neutral values and seed-color mixing are sRGB approximations, not Material HCT, dynamic color, contrast-level adjustment or the complete current Material distribution.

[Fluent's token architecture](https://fluent2.microsoft.design/design-tokens) separates globals from semantic aliases. Its [color table](https://fluent2.microsoft.design/color-tokens/) distinguishes roles and interaction states; its [shape guidance](https://fluent2.microsoft.design/shapes) informs 2/4/8/12px geometry. Axiom does not implement Fluent high-contrast themes or all global/alias names.

[Spectrum's token architecture](https://spectrum.adobe.com/page/design-tokens/) demonstrates global, accent, alias and component-specific chains and platform-specific sizing. This adaptation realizes an editable desktop-oriented subset; it does not claim Spectrum mobile scale or a complete component-specific token distribution.

## Data and adoption policy

- Existing Essentials generation is unchanged when `template` is omitted or is `essentials`.
- New templates use distinct `radix.`, `carbon.`, `material.`, `fluent.` or `spectrum.` names. Stable Axiom semantic adapters such as `surface.raised`, `action.primary.background` and `radius.control` connect newly created sample components to that architecture.
- Namespaced tokens carry the selected template ID, adaptation version, `axiom-authored` marker and official reference URL. They remain ordinary editable ADS tokens, with native stable references and explicit domain-purpose classification.
- Existing names, IDs, values, theme overrides and bindings are never replaced during adoption. Applying a different template adds its missing namespaced tokens. Existing common roles stay connected to the previously authored system. Switching existing role bindings requires an explicit separate edit.
- Each domain is reference-closed: excluding Color, for example, does not leave a dangling spacing or typography alias. Empty selection disables application with recovery guidance. Color creates/reuses light and dark contexts only when selected.
- Brand seeds, typefaces and density are editable proposal settings. Brand ramps are bounded sRGB mixes. The generated action foreground chooses the higher-contrast endpoint independently in each theme. This is not an assurance that arbitrary custom colors satisfy accessibility requirements.

## Selection surface and evidence

The full template picker uses native radios with quiet selected fills, a source link and a preview resolved from the generated alias chain. Light/dark preview selection is local UI state. Compact onboarding uses the Studio select instead of six large cards. Included domains use whole-label checkbox targets, a domain icon, concrete usage examples and actual token counts; Select all/Clear all does not submit the form.

`foundation-starter-templates.test.ts` covers six template identities, distinct non-color structures, thirteen supported token types, all 66 independently selected template/domain combinations in both themes, common sample bindings, sequential template adoption, exact reapplication, theme/source preservation, invalid template rejection and atomic namespace collision rejection. The six new cases passed together with the eight existing editor-completion cases. Browser and whole-repository results are recorded by the integrating task; these unit results do not establish visual or platform conformance.
