# ADR-0016 — Foundation onboarding and editor completion

Status: ACCEPTED for the owner's requested authoring and usability corrections.

Date: 2026-09-14. Owner: product owner; executor: Codex.

The owner reported an unrecoverable property-input notice and blocked change review on the local Studio, and requested domain-based primitive/semantic templates and onboarding, connected theme/token/domain management, visual alias relationships, lighter forms with suggestions, custom component authoring, fixed library thumbnails, trackpad pinch, a Foundation omission review, and consistent Axiom UI specifications. This extends [ADR-0015](0015-studio-workbench-and-catalog-authoring.md); it does not supersede the Foundation release obligations or assert their completion.

## Decisions

- `apps/studio` owns a registry of local form drafts, separate from the project proposal. Before navigation or review, valid forms can join the transient proposal. Invalid lexical input is preserved, has a named recovery destination and an explicit reset action. Resetting local input keeps the last valid proposal; discarding the proposal remains an explicit separate action. No-op edits are successful and create no document revision or history entry.
- `modules/ads-core` owns the curated Foundation starter blueprint and its typed, additive authoring operation. Eleven suggested domains cover all thirteen supported DTCG literal types, with primitive scales, semantic aliases and light/dark overrides. DTCG does not mandate these domain names or numeric choices. Existing values, identities, source text and overrides are preserved; a name/type conflict rejects the entire proposal. Reapplying a template is idempotent.
- Domain pages, relationship trees and named-theme previews consume the same Foundation projection and stable references as the inspector. Creation suggestions change form values, never silently apply defaults to an existing project.
- Catalog thumbnails are locally authored static SVG specimens of control structure. They are navigation aids, not execution or accessibility evidence. Custom structure must be represented in the source model and preview; unsupported target realizations reject output rather than omit authored data.
- Canvas camera changes remain transient. Normalized wheel/pinch, native gesture events and two-touch pointer input use the same pointer-anchored transform, clamp and coordinate tests. Synthetic browser evidence is distinguished from physical trackpad verification on the user's device.
- Axiom UI owns shared type, weight, leading, spacing, radius, control-size and variant tokens. Reusable field, section, action and suggestion components use these tokens. Studio styling does not overwrite consumer component paint or native control semantics.

## Verification and review

Preserve the complete existing regression suite and frozen reference checks. Add user-sequence browser regressions for invalid input → repair/reset → navigation/review, valid pending forms → review, no-op property edits, starter onboarding/adoption/idempotence, domain/alias/theme navigation, custom-part editing, and gesture coordinates. Document remaining Foundation obligations separately from source authoring and browser-preview evidence. Native compilers, devices and assistive technology still require their own evidence.

## Bounded authoring extensions

- Newly created starter projects connect the original sample token identities to the chosen semantic/primitive kit. Existing-project template adoption never rewrites existing bindings.
- Catalog Part text, optional reparenting, DFS reading order, optional/required content-slot declarations and the existing filled/outlined default have explicit edits. React layout output realizes nested custom Parts and escaped text; unsupported slot/semantic/native mappings reject rather than drop data. Arbitrary instances, traits and behavior graphs remain unimplemented.
- Typography, font-family/weight, line height, letter spacing, shadow, gradient, stroke/border and transition data can bind compatible whole tokens. Composite declarations expand into typed leaves; at equal specificity/priority, individual leaves refine the composite. Current Web mapping is bounded sRGB/px CSS; native mappings reject these additions.
- Catalog motion accepts up to 16 typed Part tracks, 2–32 strictly ordered keyframes, opacity/translateY/scale channels, tween or bounded spring timing, duration/easing tokens, delay, explicit interruption and mandatory reduced-motion snap. Spring integration uses fixed time steps and a ten-second convergence budget. Preview playback, pause, scrub, step and reset own cancellable Web Animation handles. Trigger labels identify preview scenarios, not a completed behavior event graph. Stagger, completion effects, layout/screen motion and target runtime emission remain open.
- Authored contrast reports only an opaque resolved color pair, never a composite-background or assistive-technology pass. Source-order navigation is connected to actual selected Parts.

The exact maintenance/asset allowlist adds `scripts/workbench-completion-cases.mjs`, `apps/studio/src/ui-system.css` and `apps/studio/src/foundation-workspace.css` for these corrections. Other active-tree and frozen-snapshot boundaries remain in force.
