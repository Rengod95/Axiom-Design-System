# ADR 0018 — Contextual Foundation and component composition

Status: ACCEPTED for the bounded Studio increment requested on 2026-09-15.

## Problem

The global Connections workspace repeats token browsing without a clear editing task. A blank component action inserts a Box immediately, while logical Parts and content Slots are presented as disconnected technical concepts. New catalog designs depend on fixed starter token identities and cannot discover equivalent authored semantic values. One token architecture is insufficient for evaluating different systems.

## Decision

1. Remove Connections from Foundation navigation. Retain active-theme dependency drawings within token specimens and place value sources, dependent tokens and exact design/property usage links in the selected token inspector. Navigation preserves category and element identity, and flushes recoverable form drafts through the existing registry.
2. Offer Essentials plus five explicitly labeled Axiom adaptations of Radix, Carbon, Material, Fluent and Spectrum architectures. Selection is local form state. Application creates a reviewed additive plan; authored values, identities and theme overrides remain owned by the user. No adaptation claims to reproduce the upstream runtime, full token inventory or palette algorithm.
3. Provide a component composer with an actual in-memory source preview. Blank frame, content stack and article are custom layout starting structures; button, field and card use their existing semantic catalog recipes. One creation plan owns the component and both category designs. It enters the existing review, save, conflict and Undo path.
4. Present logical Parts as an Elements tree. A selected element may declare a Content area; this is the Slot contract, not a variant axis. Keep their separate persisted models, stable identities, required-role protection and ownership. Allow cardinality updates in place without deleting and recreating the slot. This increment does not implement instance content insertion.
5. For catalog layout definitions only, allow an optional closed `element` in a design's `nodeMappings`: div, section, article, header, footer, span, p, h1–h6 or code. Logical Parts remain platform independent. Validate tag types and HTML text-container nesting. Preview and React source generation use the mapping; native targets reject unmapped HTML semantics explicitly. Interactive catalog recipes retain their own HTML and behavior contracts.
6. Preserve compatible canonical token bindings first. Otherwise choose an unambiguous, type- and domain-compatible semantic intent from a bounded vocabulary, checking renderability across named themes. Use explicit literal defaults when no compatible, unambiguous token exists. This is a creation baseline, not a mandatory Foundation token naming rule or the general policy/exception engine.

## Compatibility and limits

Existing mappings without `element` retain div layout realization. Existing templates without a template identifier retain Essentials behavior. No automatic migration, source rewrite, weakened required slot, new arbitrary event behavior or native certification is implied. Added content slots still need target mappings before export; declaring a slot does not manufacture a consumer instance. The broader Foundation gaps are recorded in the [fresh 56-document audit](../implementation/foundation-audit-2026-09-15.md).

## Evidence

Core regressions exercise atomic creation, invalid tag/type/nesting rejection, stable slot cardinality updates and duplication. Target regressions compile and render React article/heading/paragraph output and verify explicit native rejection. Shared slider tests retain native pointer/keyboard semantics and lexical precision while checking narrow geometry. Browser integration covers template selection/application and composer creation through the shared reviewed command path; execution results are recorded separately from this decision.
