# ADR-0015 — Studio workbench, Foundation authoring and catalog expansion

Status: ACCEPTED for the owner-authorized editor expansion; individual capabilities require implementation evidence.

Date: 2026-09-13. Owner: product owner; executor: Codex.

## Problem and authorization

The owner explicitly requested merging PR #29, auditing every Foundation-defined editor omission, expanding the complete component catalog, improving token creation/management/classification and selected-object editing, adding expected canvas operations, replacing the editor's visual design with Impeccable, and building Axiom's own design system. Linear, Geist, Figma and Apple are reference products, and Geist or SUIT is the required base typeface. PR #29 merged at `e72dfb11aa29bc051c92c87d52224f98c64c33fa` after exact-head Windows and Ubuntu Quality Gate #76 succeeded.

The initial three-component editor has no complete library browser, classification manager or navigable canvas. Its limited forms expose storage contracts more clearly than authoring tasks. This extension addresses those product gaps and preserves the prior reviewed command, recovery and source-provenance boundaries.

## Ownership and source contracts

- `modules/ads-core` owns canonical catalog identity, typed Foundation authoring, component lifecycle plans, complete-graph validation and atomic source-change plans. Classification and theme labels/descriptions are optional metadata for legacy data, with explicit validation for new records. Domain `allowedTypes` lists token types and is not a rendering capability claim.
- `apps/studio` owns Axiom UI primitives and semantic CSS tokens, theme/font preferences, library and layer navigation, Foundation tables and structured inspectors, keyboard/canvas interaction and transient preview. Canvas viewport, selection, panel visibility and transient simulation state do not change ADS revisions. Document geometry and design properties do.
- New component documents and their Web/Mobile designs are reviewed together. Create, duplicate and delete use a bounded source transaction with expected revisions and complete graph validation. No arbitrary-path mutation or bypass of candidate authorization is introduced. One accepted transaction has one Undo.
- Catalog inventory distinguishes component, part, template and utility. Library availability is independent of the number of objects inserted in a project. Existing Button/Card/Toast profiles remain compatible. Extended catalog definitions carry an explicit authoring profile; authorable structure and browser simulation do not assert native realization or certified accessibility.
- Foundation creation, duplication, metadata/classification edits, alias rebinding, literal replacement and theme-axis/context/set edits use typed plans. Referenced deletion either fails or explicitly rewrites known compatible references in the same plan. Bulk changes are validated as a complete selected set, not partially committed row by row.
- Target generators must identify any unsupported contract and keep source-generation, browser simulation, independent consumer tests and native verification distinct. The catalog must not map unrelated semantics to Button merely to produce output.

## Axiom's own design system

The Studio receives a replacement, restrained tool interface, with central canvas, library/layers and context-sensitive inspector. Reusable components share density, typography, spacing, color, focus, control, overlay, disabled/error and motion contracts. Light/dark preferences are separate from the user's edited design-system themes.

SUIT 2.0.5 (`@sun-typeface/suit`, OFL-1.1) is a pinned asset dependency from the official publisher. The build copies only its variable WOFF2 and license to the local served output. Font loading needs no external request and does not change the CSP. Product assets remain under the explicit Studio allowlist. Product context, token-bearing design documentation, design sidecar and surface brief belong to `apps/studio`; they describe the Studio UI, not imported user ADS documents.

## Evidence and limits

The [editor completeness audit](../implementation/editor-completeness-audit.md) maps all 56 Foundation bodies and concrete editor requirements to implementation evidence and remaining obligations. Audit coverage and catalog coverage are separate from feature completion. Native toolchains, external AI/service connections and user studies require their own evidence. Do not relabel those obligations complete because a related UI control or source file exists.

Required validation retains the existing document/frozen-snapshot negative tests, module/dependency boundaries, strict TypeScript, product behavior, build, real storage/Studio Chromium regression and generated target consumers. Add behavioral evidence for token/classification/theme lifecycle, catalog create/duplicate/delete, selected-object changes, keyboard/canvas coordinates and persistence/Undo. Impeccable visual verification uses a batched desktop/small-screen pass, one correction confirmation, and independent finish review.

## Bounded validation and font ownership

Theme authoring validates all Cartesian axis/context combinations, up to 128. Projects exceeding that explicit limit return diagnostics and preserve source rows for repair; they do not silently skip combinations. Named theme sets are not a substitute for validating possible contexts.

The UI font is the official `@sun-typeface/suit` 2.0.5 variable WOFF2 asset, licensed under OFL-1.1. Build copies only that font and its license into the local Studio output. No remote font request or additional script dependency is needed. The source package and lock pin the publisher artifact. Studio light/dark preferences remain separate from authored Foundation themes.

## Browser journal validation reuse

Repeated editing exposed quadratic repeated historical semantic decoding. The store may retain bounded validated digest/identity metadata within one connection lifetime, while rechecking every stored byte digest, shape, sequence, lineage and advisory-head relationship on every operation. UTF-8 size/Unicode preflight runs before hashing; a cold reader verifies all semantics, and every returned latest snapshot is freshly decoded. Decoded historical states are never retained. This changes no storage format or durability guarantee. Warm/cold corruption, malformed Unicode, oversized input and detached-return regression evidence is required.
