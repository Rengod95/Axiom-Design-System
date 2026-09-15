# Studio panel and token-binding refinement

Status: implemented; local gates and bounded independent finish review passed.

The owner's follow-up removes the embossed header/footer treatment, standardizes rectangular Studio corners, separates object rows by 2px, requests independently collapsible side panels and fixes property token candidates across unrelated domains. The accent shifts to greener fluorescent #8DFC52. This is a refinement of the compact workbench, not a Foundation completion claim.

## Presentation and layout

Headers and footer retain transparent material and backdrop diffusion without the internal gradient or inset highlight that produced a convex appearance. Rectangular controls, navigation, specimens, menus and containers use an 8px corner. Authored geometry, circular indicators and the small checkbox shape remain purpose-specific.

Independent header controls hide the navigation and inspector columns. Their state is a browser layout preference, separate from project data. Hidden inspector forms stay mounted, including invalid lexical input. Draft recovery reopens the inspector before focusing the field; selecting an object or contextual creation also reveals it. Narrow screens retain Browse/Workspace/Inspect navigation independently of desktop collapse preferences.

## Binding contract

The root defect crossed three layers: UI candidates checked only the DTCG value type; resolved tokens lost their domain classification; authoritative component validation also checked only type. As a result, dimensions from spacing, sizing, radius, border and typography could be interchanged, as could numeric opacity, line-height and layering tokens.

The bounded Studio profile now accepts optional `bindingCategory` on a Foundation domain. It is a stable property-use category, separate from its editable name, opaque identity and `allowedTypes` shape constraint. New starter domains declare the category; custom domains expose it in Manage. The supported categories are color, spacing, sizing, radius, border, shadow, typography, motion, opacity, gradient, layer and unrestricted. These are Studio authoring choices, not categories mandated by DTCG.

Resolved tokens retain the exposed token's own domain and binding category across alias and theme resolution. A common `isStudioTokenCompatible` function checks property type and purpose in both candidates and authoritative validation, including layout, appearance, extended rules and motion timing. An alias is not reclassified from its primitive target.

Older starter domains derive a read-only category only when retained tokens have the exact pinned starter provenance, matching blueprint name/type, and one consistent category. Domain labels and arbitrary token names alone never establish purpose. Unknown/custom/unassigned or explicitly unrestricted domains retain type compatibility and appear in an unrestricted candidate group. Users can assign purpose explicitly; reads never rewrite source.

Existing incompatible references remain visible as disabled repair choices. Projects whose only errors are the new `STUDIO_TOKEN_BINDING` diagnostics remain inspectable. A component repair must produce a fully valid result; unrelated changes do not bypass validation. Because sequential repairs cannot pass while another component remains invalid, the dedicated binding-repair dialog collects every incompatible appearance, conditional-rule, layout and motion binding before preparing one source plan. Opening, selecting and cancelling remain local to the dialog. Every site requires a compatible replacement or the explicit choice to keep its current resolved value as a literal, which stops following future token/theme changes. The core matches each choice against a recognized source binding and its prior token, rejects partial/duplicate/arbitrary-path replacements, updates any affected component revision pins and validates the complete graph. Only then can ordinary change review and atomic apply save the repair. Original source captures remain unchanged. Preview/export still require valid data.

## Verification

Permanent browser cases cover independent hiding, released canvas width, preserved invalid input, recovery into a hidden inspector, browser preferences, mobile navigation, shared corners and flat headers. Same-type candidates are checked for radius, font size, border width, opacity and line height. Core tests exercise classification, aliases, themes, custom purpose, atomic rejection and repair.

Switching the inspected property now initializes its value and binding together, before the new typed editor mounts. Previously a typography object briefly reached a numeric editor and created a false invalid draft, blocking subsequent navigation. The browser regression verifies that changing the inspected property keeps the existing save state and selector available.

The repair browser fixture represents three incompatible sites in two saved documents, including Base and Outlined rules on the same part. Row labels distinguish rule predicates and motion-track context. The fixture checks partial-choice blocking, cancellation, ordinary review, atomic save and reopening. Trusted journal seeding is confined to the isolated test database; product imports retain their validation.

Local validation passed 372 unit tests, strict TypeScript and module checks, the 142-input Studio build, browser storage, Studio editing and 25 workbench flows. Representative Web and React Native consumer checks also passed. Frozen-snapshot and Foundation integrity checks preserve 442 reference files and all 56 documents. The final panel/property and atomic-repair probes passed without browser errors. Independent Impeccable review inspected 19 shell and repair captures across both themes, intermediate width and mobile, and returned ship after resolving repair-row ambiguity.

Previous CI #86 failed in both operating systems because an SSR test expected the former exact native Select opening tag. It now checks the retained rem selection with additional form attributes and the visible combobox independently. No runtime behavior is weakened to satisfy that test. [Verification evidence](studio-panel-binding-verification.json) records local results; [finish review](studio-panel-binding-finish-review.md) records the bounded visual assessment. Latest-head CI is reported by PR checks separately.
