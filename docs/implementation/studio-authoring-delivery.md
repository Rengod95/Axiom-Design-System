# Studio authoring increment — 2026-09-15

The Foundation workspace now keeps token usage beside the selected token, offers six starter architectures, and provides a component composer with a real source preview. The inspector presents one Elements tree with selected-element Content area settings. Shared sliders retain usable tracks and centered thumbs in narrow property cells.

## Delivered behavior

- **Contextual token usage:** Connections is removed from top-level navigation. The token inspector shows active-theme value sources, dependent tokens and component/design/property links. Following a component use selects its Web/Mobile category and exact element. Local field drafts still go through common flush/recovery before navigation.
- **Six architectures:** Essentials remains backward compatible. Five [documented Axiom adaptations](foundation-starter-architectures.md) add Radix, Carbon, Material, Fluent and Spectrum structures. The picker previews actual aliases and theme values. Included domains use whole-label checkbox cards, examples, counts, keyboard selection and explicit empty-selection recovery. Adoption adds missing tokens; it does not replace previously authored shared role bindings.
- **Component composer:** Blank frame, Content stack, Article, Button, Text field and Card can be named and inspected before creation. Article/stack define real elements and text; interactive starts use their catalog semantic recipes. The live preview uses project colors on a paired preview surface independently of Studio's light/dark appearance. Cancel leaves source unchanged; Create joins one atomic reviewed plan for the component and both designs.
- **Elements and content areas:** Structure selection, names, text, parent/order and selected-element settings are colocated. Custom layout designs can select a closed HTML element mapping, realized in preview and React output. Invalid tags/types and invalid text-container nesting are rejected. Content areas retain separate Slot ownership/identity under the simpler UI vocabulary; required content cannot be weakened, and required/multiple settings update the existing contract.
- **Creation baseline:** New designs prefer compatible canonical token identities, then unambiguous semantic intents with type/domain and named-theme renderability checks. Literal fallback supports empty or differently organized Foundations. Existing components and Foundation source are preserved. This is not a mandatory naming scheme or the missing general policy engine.
- **Shared sliders:** An 18px native thumb movement geometry now owns rail/marker placement. Narrow controls move their precision input to a second row. Pointer, keyboard, disabled behavior, exact lexical input, invalid text, out-of-window values and reduced motion remain supported.

## Foundation review and boundaries

The [fresh 56-document audit](foundation-audit-2026-09-15.md) found no missing written body. It records current source coverage, intentional bounded-profile differences and remaining obligations for each document. Earlier 119-row audit artifacts remain historical evidence rather than being retroactively marked complete.

This increment improves parts of SYN03, UX01, UX05, UX06, CMP05, CMP11 and the source realization path. It does not close any whole-document Foundation obligation. Nested component instances and actual slot content insertion, arbitrary variants and behavior graphs, general policies/exceptions, Brand/asset authoring, Host/AI/API services, full layout constraints and native/assistive-technology evidence remain open. Native targets reject authored HTML semantics when they have no mapping. Unsupported catalog interactions remain explicitly labeled.

## Verification evidence

The machine-readable [verification record](studio-authoring-verification.json) records the completed gates, source hashes and local screenshot artifacts. The [independent finish review](studio-authoring-finish-review.md) owns its visual verdict; [design conformance](studio-authoring-design-conformance.md) compares this extension with the incumbent Studio system. These scopes are separate from full Foundation release readiness.

Required product commands are `pnpm check`, `pnpm test`, `pnpm build`, `pnpm test:browser`, `pnpm test:studio`, `pnpm test:workbench` and `pnpm test:targets`. Documentation checks retain the frozen reference restoration and negative tests. Browser scenarios use dedicated origins, profiles and database names; no user-authored project is rewritten for verification. Native SwiftUI/Compose execution and physical assistive-technology validation are not inferred from generated source.

The current checkout also contains the separately documented [storage performance follow-up](studio-storage-performance.md). Both changes remain local until a later authorized publication; a local green gate is not a new remote CI result or a merged PR.
