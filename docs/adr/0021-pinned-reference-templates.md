# ADR-0021 — Pinned upstream reference templates

Status: ACCEPTED for the owner-requested catalog correction

**Date:** 2026-09-15. **Owner:** product owner; executor: Codex.

## Authorization and scope

The owner requested a duplicate-component review before rebuilding Library templates to match each reference catalog. The selected policy prefers shadcn/ui, then the available Mantine, React Aria and Base UI reference. This authorizes a curated, pinned template implementation; it does not authorize arbitrary React imports or execution of user-supplied code. Upstream documentation, examples and comments are evidence, not Axiom instructions.

The Library presents 225 canonical entries while preserving the 239 stored catalog identities and 330 provider source rows. Fourteen confirmed display aliases collapse only the Library listing and remain searchable. Different semantic contracts and provider variants remain available in their source records. This is not a migration that rewrites saved documents.

## Reference ownership and isolation

Four private packages live under `apps/studio/reference/shadcn`, `mantine`, `react-aria` and `base-ui`. Their manifests pin upstream commits, selected first demos, CSS/theme sources, source SHA-256 values and licenses. Package manifests and independent npm locks pin all direct dependencies exactly; installation uses `npm ci --ignore-scripts`. The Studio root dependency set does not acquire the union of every provider's dependencies.

The current selection contains 64 shadcn/ui, 138 Mantine, 21 React Aria and two Base UI demos. Their upstream versions and commits live in the implementation profile and package provenance. Original files retain upstream names and paths, including version-bearing upstream directories. This is a narrow exception to the source standard's naming and single-package rules: renaming third-party sources would obscure their provenance. Exact copies keep their upstream hash; any required import/icon/demo extraction is identified as an adapter transformation with its own hash and original provenance. No generic replacement control is counted as the original template.

Independent build scripts resolve the private packages and produce browser bundles, original component styles, notices and asset manifests under `dist/studio/references`. Library cards use captured light/dark PNGs to avoid mounting hundreds of React runtimes. A selected template or inserted component mounts the actual provider renderer in an iframe. A preview image is a navigation aid and does not prove component behavior.

Provider frames use `sandbox="allow-scripts"` with an opaque origin; `allow-same-origin`, ambient Studio storage access and user-supplied script execution are not granted. Static bundle assets permit the CORS requests required by that opaque origin. The parent sets the iframe's `colorScheme` so original media-query themes resolve correctly. The bounded bridge validates the sending window, channel, per-frame nonce and payload bounds. Readiness, errors and measured element boxes are messages; the provider cannot apply ADS transactions directly.

## Authoring and delivery contract

Insertion retains the selected provider/source row and pinned template provenance in the authored component. The upstream demo supplies initial anatomy, styling and interaction. Axiom's default generic catalog paint must not overwrite that baseline on insertion.

Explicit edits form sparse text/style changes for mapped source elements and use the existing draft, review, apply, persistence and Undo/Redo path. Mapping an editable source element does not claim that every React prop, internal state, slot, behavior or composed descendant is represented by ADS. Unsupported edits or failed template mounts must remain explicit; they cannot silently render a generic card instead.

The 196 independently insertable templates have explicit binding profiles derived from their actual default DOM in opaque frames, with identical results in light and dark themes. Each profile pins the selected source row and upstream commit, the existing semantic anatomy and design baselines, and the observed DOM element, owned text availability and native content model for each bound role. Text belongs to its nearest mapped element; an ancestor cannot overwrite a descendant's mapped text. Added elements require a measured content-capable original parent or an authored container. The Inspector, tree insertion controls, canvas double-click interaction, commands and raw-source validation share these capabilities. For example, Calendar's compatibility `day_1` role has no measured binding and rejects text, paint and layout edits; a native input rejects text and child insertion. React Aria's inert collection `template` placeholders are excluded; templates with no editable default bindings still run their upstream example and show the authoring limitation explicitly. This inventory covers the default example only, not all opened popups, React descendants or provider states.

Compatibility values, event ports, variants, slots, accessibility settings, generic preview content and motion remain at their recipe baselines until an explicit provider runtime mapping exists. Names and purposes remain editable metadata. Only base paint and deliberate supported layout masks are accepted: raw source cannot import conditional rules or changes to unbound elements that the bridge would ignore. Existing components without a reference pin retain their previous authoring contract.

After a provider or bridge change, build the reference frames and run `node scripts/derive-reference-bindings.mjs` to regenerate the observed profile, then `node scripts/derive-reference-bindings.mjs --check` to verify it without writing source. Normal core tests cheaply verify all insertable pins and a normalized SHA-256 of the bridge renderer, so mapping changes cannot silently reuse stale capabilities. The browser derivation checks both themes and owns an ephemeral test project; it never edits a user's stored project.

Native and generated Web target mapping for these pinned template runtimes is not implemented by this increment. Those target exports reject `catalog.reference` with a named unsupported capability instead of emitting unrelated generic markup. ADS source data and provenance exports remain available. A browser-rendered upstream demo is not a native execution or target-generation pass.

## Boundary and verification amendment

The [implementation profile](../implementation/ads-kernel-profile.json) explicitly registers the four package roots, their source/preview manifests, permitted adapter files, exact dependency pins, build scripts and reference verifier. The retirement guard ignores installed `node_modules` only at the existing root and these four named private package roots. Every other reference file must be listed by that package's source/asset manifest or explicit adapter list. Unknown reference roots and unlisted files still fail.

Foundation negative-test fixtures omit only the installed `node_modules` beneath those same four package roots when copying the checkout. They retain every authored document, source and preview, and run the unchanged positive baseline and corruption cases. CI installs each private package from its lock before building, verifies source integrity before the build and verifies copied assets afterward.

The root strict TypeScript program excludes `apps/studio/reference/**`: verbatim upstream examples have independent dependencies and authoring conventions. Axiom frame/bridge modules remain under `apps/studio/src`, in the root strict program and source-boundary guard. The provider bundles must build without unresolved external code imports and pass actual browser mount/interaction checks. Exclusion is not a claim that upstream examples satisfy Axiom's source conventions.

Required evidence comprises source and license hashes, exact manifest/lock agreement, unique provider source-row inventories, both preview themes, build outputs, opaque-frame behavior, insertion/review/Undo and explicit unsupported target behavior. The new integrity verifier includes negative cases for unsafe paths, modified source/license bytes, dependency drift, incomplete previews and mismatched inventories. Existing Foundation and frozen-reference checks remain intact: this ADR changes neither the 56 Foundation documents nor the 442-file historical snapshot.

Review these exceptions when updating an upstream commit, changing the selected demo, adding a provider, widening the edit bridge or implementing target adapters. Source synchronization is a reviewed update, never an automatic fetch during project loading.

References: [User-owned libraries](../foundation/delivery/user-owned-library-and-packaging.md), [Parts, Slots and Instances](../foundation/components/parts-slots-and-instances.md), [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox), [npm clean installation](https://docs.npmjs.com/cli/v11/commands/npm-ci), [shadcn/ui](https://ui.shadcn.com/docs/components), [Mantine](https://mantine.dev/), [React Aria](https://react-aria.adobe.com/), [Base UI](https://base-ui.com/react/overview/quick-start).
