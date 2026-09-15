# ADR-0020 — Compound anatomy and canvas insertion

Status: ACCEPTED for the owner-requested implementation increment

**Date:** 2026-09-15

**Decision input:** The owner requests JSX-like nested component construction, meaningful Accordion Trigger/Content composition, structural editing in the left panel and drawing elements on the canvas.

## Problem and decision

The earlier catalog renderer used fixed semantic HTML, while the source offered editable Parts. Only custom layouts rendered their authored children recursively. Adding a Part to an Accordion therefore did not create the corresponding DOM content. A flat source tree also concealed collection wrappers.

Keep the Foundation distinction between logical responsibility, replaceable content and target realization. Required semantic anchors own behavior, input and accessibility; they cannot be converted into arbitrary HTML. The bounded Studio extension marks authored visual elements with `studioElement: box | frame | text`. Their stable identity, parent and reading order use the existing part records; their HTML tag remains in each category's `nodeMappings`. This is not a claim that every DOM node must become a public logical Part, or that the full multi-node realization model is complete.

New Accordion definitions expose Root → Item → Header → Trigger → Indicator and Item → Content. Item/Header are optional in the recipe for compatibility with existing sources. An explicit `structure-normalize` edit upgrades older flat trees through normal review, retaining existing IDs, values, content and original bytes. Tabs and related collection anchors use their actual parent roles in new definitions.

Authored children are shared templates within stable-keyed collection items. They may nest under valid containers and semantic content anchors. Triggers accept phrasing content: Box/Frame map to span there, while Content permits block containers. Text is a leaf; void/native controls and structural-only list/table boundaries reject incompatible children. Component instances may occupy flow-content containers, including Accordion Content, and remain pinned references. They cannot introduce interactive components inside Trigger/text.

## Authoring and realization

- The left tree owns insertion, hierarchy, ordering and deletion. The inspector owns the selected element's properties and content contract.
- Canvas B/F/T tools insert Box/Frame/Text inside an existing component container. Pointer geometry passes through camera and parent coordinates. Free parents keep positions; auto-layout parents keep flow and adopt the drawn size. Creating an independent definition still uses the component creation action.
- Pointer movement is transient. Pointer-up creates one edit; Escape, pointer cancellation, lost window focus, mode change or a disabled editor cancels the gesture.
- Preview and generated React render authored descendants within their semantic anchors, retaining native events and ARIA relationships. Provided semantic-slot content replaces the authored default contents. Existing layout slots retain their additive text-and-children behavior for compatibility. Slots are content contracts, not variant axes.
- Arbitrary JSX evaluation/import, replacing behavior anchors with foreign components, per-item structural overrides and arbitrary public props are outside this increment. Native targets reject unmapped authored descendants/composition rather than dropping them.

## Verification boundaries

Core checks cover containment, finite drawing geometry, category independence, duplicate identities and atomic rejection. Browser checks must cover actual nested DOM selection, drawing at zoom, cancellation, review, Undo/Redo and reopening saved content. Generated React checks are separate from browser preview; passing either does not certify native compound execution or full Foundation completion.

References: [Foundation Parts/Slots/Instances](../foundation/components/parts-slots-and-instances.md), [Canvas manipulation](../foundation/experience/canvas-and-direct-manipulation.md), [React children](https://react.dev/learn/passing-props-to-a-component), [Radix Accordion anatomy](https://www.radix-ui.com/primitives/docs/components/accordion).
