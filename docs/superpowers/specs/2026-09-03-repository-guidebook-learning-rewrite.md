# Axiom Repository Guidebook Learning Rewrite Design

**Status:** Approved and implemented
**Date:** 2026-09-03
**Branch:** `codex/add-repository-guidebook`
**Current baseline:** N0–N24, after merging `main` `f368ae7d208424c922637ca625ab9687a85ed5b9`
**Audience:** contributors who know basic JavaScript and TypeScript but are new to design-token and compiler architecture
**Document language:** natural Korean prose with searchable English identifiers and contextual terminology notes

## 1. Goal

Rewrite `docs/guidebook.md` from a module-catalog-led repository inventory into a
learner-centered, example-led path that a new contributor can read from the human
problem through the current N24 executable boundary. Preserve complete module and
API lookup coverage in a separate reference part of the same file.

The guidebook remains non-normative orientation. It explains current code and points
to the authority that owns each rule; it does not amend ADR, SSOT, schema, registry,
or generated contracts.

## 2. Why the current guidebook needs a structural rewrite

The existing guidebook is useful as a repository catalog, but it asks the reader to
understand terms such as `contract`, `authority`, `pinned`, `canonical`, `adapter`,
and `effective policy` before teaching the situations those concepts solve. Package
and helper inventories occupy most of the document, while the end-to-end flows use
generic diagrams rather than one value the reader can follow.

Four information modes are also mixed at the same level:

| Mode | Reader question | Required shape |
| --- | --- | --- |
| Learn | How do I understand Axiom? | ordered narrative and one running example |
| How-to | How do I change or diagnose something? | goal-oriented procedure and verification |
| Explanation | Why is this boundary designed this way? | forces, decision, trade-offs, consequences |
| Reference | What exact module or API exists? | precise paths, inputs, outputs, errors, and evidence |

The rewrite separates those modes into four parts while keeping them reachable from
one `docs/guidebook.md`.

## 3. Reader contract

The document assumes the reader:

- understands basic JavaScript objects, TypeScript types and interfaces, functions,
  modules, JSON files, `package.json`, and ordinary package-manager commands;
- may have used React or another frontend repository;
- does not already know DTCG, design-token tiers, JSON Schema, compiler pipelines,
  intermediate representations, registries, manifests, canonicalization, digests,
  pinning, or provenance;
- benefits from a compact system map followed by one worked example;
- needs contextual Korean explanations for English semantic words whose literal
  translation loses responsibility, direction, status, or compatibility meaning;
- may need to review, maintain, and extend the repository, so failure boundaries and
  verification evidence are part of the learning path.

This assumption describes the document's explanation needs, not a personal skill
rating. No user calibration answers or personal labels are stored in the repository.

## 4. Scope and authority

### 4.1 Included

- `docs/guidebook.md` rewritten as Part I–IV;
- `README.md` and `docs/README.md` navigation aligned with the new structure;
- factual N24 checkpoint correction in non-normative `docs/architecture.md`;
- complete coverage of the source modules and repository policy scripts discovered
  by `scripts/check-guidebook-coverage.mjs`;
- a work-specific learning record under `docs/implementation/`;
- the current N24 Button authoring and normalization path;
- exact current commands, generated-artifact ownership, failure boundaries, and
  current-versus-planned labels.

### 4.2 Excluded

- changes to source implementation, public APIs, runtime behavior, or package
  dependencies beyond retaining the already approved guidebook coverage command;
- changes to ADR, SSOT, machine-readable schema, registry, normative fixture, Token
  source, or generated artifact;
- presenting N25 or later work as current;
- inventing a web compiler, React runtime, or final CSS emission that N24 does not
  implement;
- changing a normative contract merely to make an example easier to explain;
- copying all Token paths, CSS properties, generated union members, or complete large
  functions into the learning narrative.

### 4.3 Authority order

The guidebook uses, but does not replace, this order:

1. accepted ADRs;
2. owning SSOT documents;
3. normative schemas, registries, and pinned input manifests in `spec/`;
4. conformance fixtures and golden artifacts;
5. generated TypeScript and reference contracts;
6. capability-package implementations;
7. examples and historical reports.

If those sources disagree, the guidebook identifies the disagreement and stops short
of inventing a reconciliation.

## 5. Current baseline and reconciled facts

The rewrite targets the repository after N24 rather than preserving the earlier N15
snapshot from the first PR #12 draft.

| Inventory | N24 baseline |
| --- | ---: |
| Workspace packages | 10 |
| Package modules discovered by the guidebook checker | 91 |
| Repository policy scripts including the guidebook checker | 4 |
| Required `guidebook-module` markers | 95 |
| Schemas | 37 |
| Registries | 14 |
| Positive fixtures | 44 |
| Negative fixtures | 87 |
| Foundation Tokens per context | 635 |
| Resolver contexts | 2 |
| Effective CSS properties | 818 |

The inventory is evidence recorded at the N24 checkpoint, not a permanent
architecture constant. Commands and discovery logic remain the authority for future
counts.

N0–N24 are current. N25 is the next implementation boundary. N25 and later work is
labeled `planned` wherever it appears.

## 6. Running example: Button brand background

One Button brand-background case travels through all four parts. It has two connected
views because the current repository deliberately separates Token Foundation from
Recipe consumption.

### 6.1 Foundation view

The authored Component Token is:

```text
tokens/base.tokens.json#/color/component/button/root/background/default
```

Its alias chain is:

```text
color.component.button.root.background.default
→ color.semantic.fill.brand.default
→ color.primitive.brand.600
```

The primitive is an OKLCH value with the checked-in sRGB fallback `#444ce7`. The
light and dark sources both currently resolve the default brand fill to that same
primitive. The guide must state that a resolver context can change a value, but this
specific value happens to be equal in both current contexts.

The value passes through these real boundaries:

1. `tokens/*.tokens.json` supplies authored DTCG documents.
2. `@terrazzo/parser` parses the external format inside
   `packages/token-tooling/src/terrazzo-token-parser.ts`.
3. `TerrazzoTokenParser` adapts vendor output and normalizes each Token into
   `ParsedDtcgDocument`.
4. `resolveTokenContexts` validates graph and context rules, then resolves aliases.
5. `assertFoundationTokenPolicy` checks the production Foundation rules.
6. `serializeResolvedTokenManifest` produces the deterministic resolved manifest.
7. `generateTokenPathTypes` produces the compile-time Token-path projection.

### 6.2 Current consumer view

The real N24 Button fixture is:

```text
fixtures/button/appearance.ts#/variants/tone/brand/root/backgroundColor
```

It directly references `color.semantic.fill.brand.default`; it does not currently use
the Component Token path. The guide must expose this difference rather than silently
rewriting the fixture or claiming that the Component Token is exercised there.

The consumer path is:

```text
BUTTON_APPEARANCE
→ createCSSRecipeAuthoring(...).defineRecipe(...)
→ Token/property/authority validation
→ createAppearanceNormalizer(...).normalize(...)
→ CSS Appearance IR + collision trace
→ N24 Button golden/conformance evidence
```

`background-color` accepts a direct `color` Domain binding through
`spec/css/token-binding-catalog.json` and the generated effective property registry.
At N24 the executable path stops at validated and normalized artifacts. Final CSS
emission belongs to the planned N29 Web compiler and must not be described as current.

Together these views teach one Button problem while preserving the actual boundary
between Foundation Token contracts and the current Recipe fixture.

## 7. Guidebook information architecture

### Part I — Learn Axiom

Part I is read in order and must reveal Axiom's purpose and one complete current data
flow within the first 20 percent of the document.

1. **Start here** — audience, prerequisites, reading paths, non-normative status, and
   the difference among `current`, `planned`, and historical evidence.
2. **The problem Axiom solves** — why the project stabilizes Token and behavioral
   contracts before shipping a component library.
3. **Five-minute mental model** — authored intent, authority, validation,
   transformation/resolution, and generated or normalized output.
4. **Follow one Button background** — the Foundation and current consumer views from
   Section 6.
5. **Repository and package map** — major areas, ten packages, public boundaries, and
   legal dependency direction.
6. **Understand the Token system** — Domain, tier, alias, context, resolver,
   normalization, resolved manifest, and generated Token paths.
7. **Understand the CSS property profile** — Webref input, sparse policy, effective
   policy, binding catalog, grammar validation, and generated authoring names.
8. **Understand schema and validation** — JSON versus JSON Schema, runtime type
   checking, schema validation versus semantic validation, fixtures, and diagnostics.
9. **Understand State, Condition, Context, Appearance, and Motion** — distinct axes,
   N12–N23 contracts, and how N24 proves them together for Button.
10. **Why the packages are separate** — ownership, dependency direction, public API,
    internal API, entrypoints, and generated contract packages.

Each dense chapter ends with three to five points to remember, one or two retrieval
questions, and a reason for the next chapter.

### Part II — Work with Axiom

Each how-to uses this shape:

1. when the task is appropriate;
2. authority and contracts to read first;
3. the smallest current example;
4. authoring sources to modify;
5. exact validation or generation command;
6. expected result;
7. common failures and diagnostic owners;
8. generated files that must not be edited;
9. links into Part III and Part IV.

Required how-to paths are:

- add or change a Token;
- change semantic Token vocabulary;
- add a schema, registry, and positive/negative fixture;
- change CSS property policy or Token binding;
- add a semantic validator and connect its manifest dispatch;
- regenerate Token, CSS, and reference-contract artifacts;
- trace a validation failure from message and diagnostic code to its owner;
- follow an authored Button declaration through N20–N24;
- inspect an input through binding validation and normalized Appearance IR;
- add a source module without breaking guidebook coverage.

### Part III — Architecture Explanations

Part III explains why the architecture uses the following ideas, always reconnecting
them to the Button case:

- contract-first architecture and source-of-truth order;
- `contracts.ts`, authoring/authored source, and generated artifacts;
- parsing, adaptation, normalization, resolution, validation, and serialization;
- canonical form, canonicalization, and deterministic output;
- schema, JSON Schema, registry, manifest, and profile;
- effective policy, pinning, digest, and provenance;
- Domain, Modifier, alias, State, Condition, context, IR, boundary, and projection;
- public API, internal API, entrypoint, composition root, and dependency direction;
- diagnostics, fixtures, and repository policy scripts;
- the distinction among current implementation, normative intent, generated output,
  historical evidence, and planned work.

The glossary is a retrieval aid at the end of Part III. It never replaces the first
in-place explanation.

### Part IV — Module & API Reference

Part IV contains exactly one marker for every module discovered by the coverage
checker. The N24 integration baseline requires 95 markers.

Each package begins with the user-facing problem it solves, when a contributor meets
it, its smallest input/output example, public API, internal flow, directory map,
failure behavior, evidence, and dependency direction. It does not begin with a file
inventory.

Each module entry records:

1. the user or contributor problem it solves;
2. when the module is encountered;
3. its smallest input/output example when useful;
4. public exports and visibility;
5. internal processing flow at the depth justified by policy or failure behavior;
6. related directories and collaborating modules;
7. inputs, outputs, errors, and side effects;
8. tests, schemas, registries, fixtures, or generated sources that provide evidence;
9. dependency direction and non-responsibilities;
10. implementation cautions;
11. links back to the relevant Part I–III explanation.

`constants.ts`, `contracts.ts`, `index.ts`, CLIs, generated references, type-test
modules, and test-support modules receive responsibility-based entries. Private
mechanical helpers may be grouped, but helpers that own policy, transform meaning,
cross a trust boundary, or commonly fail are described individually.

## 8. Concept-teaching contract

At first meaningful use, a foundational concept follows this ladder:

```text
familiar situation
→ concrete problem
→ Korean explanation and English term
→ minimal example
→ important lines or value changes
→ real Axiom path and identifier
→ boundary and common misconception
```

Important English semantic words receive a contextual note when translation alone
would lose responsibility or nuance. Priority terms include `canonical`, `effective`,
`authoring`, `resolve`, `normalize`, `contract`, `manifest`, `registry`, `profile`,
`provenance`, `pin`, `digest`, `projection`, `adapter`, `fixture`, `boundary`,
`entrypoint`, `source of truth`, `owner`, `stable`, `raw`, and `direct`.

A bilingual pair is not a sufficient explanation. Repeated terms use one consistent
Korean expression and the same English identifier after the first explanation.

## 9. Example and code contract

Every learning code block uses a code sandwich:

1. state the question and values to observe;
2. show the smallest useful block;
3. explain important lines in execution order;
4. show the resulting value, diagnostic, or artifact;
5. reconnect it to the system map and the Button case.

Examples are labeled as one of:

- **Simplified example** — invented or reduced and not an Axiom API;
- **Actual Axiom code** — verified against the current source without semantic change;
- **Abridged actual Axiom code** — exact behavior with unrelated sections explicitly
  omitted.

If an analogy is used, the guide states where the analogy stops matching the actual
technical concept.

## 10. Existing-content migration

| Existing guidebook section | New destination |
| --- | --- |
| 1–2 reading and overview | Part I Sections 1–3 |
| 3–4 repository map and topology | Part I Section 5; dependency rationale in Part III |
| 5 core concepts | Part I Sections 6–9; deeper rationale in Part III |
| 6 generic data flows | Part I Button running example and concept chapters |
| 7 commands | Part II common verification contract |
| 8–12 package/module catalog | Part IV, updated for all N24 packages |
| 13 normative data and generated artifacts | Part I Token flow and Part III authoring/generated distinction |
| 14 change recipes | Part II how-to paths |
| 15 failure guide | Part II diagnostic tracing |
| 16 test and review map | Part II verification and Part IV evidence links |
| 17 edit-location lookup | Part II task index |
| 18 glossary | end of Part III, after in-place explanations |
| 19 role-based paths | Start-here navigation and Part IV lookup guidance |

## 11. Learning artifact separation

The stable guide and work record have different jobs:

- `docs/guidebook.md` describes the current system and must not become a changelog.
- `docs/implementation/2026-09-03-repository-guidebook-learning-rewrite.md` records
  why the document changed, the old cognitive-load problems, the Button path chosen,
  baseline conflicts, verification evidence, and any uncertainty left after the work.

The work record links to stable guide sections rather than duplicating their tutorial
content.

## 12. Files to change

| File | Responsibility in this change |
| --- | --- |
| `docs/guidebook.md` | learner-centered Part I–IV guide and 95-module reference |
| `README.md` | public onboarding link and current summary |
| `docs/README.md` | non-normative guide entrypoint and corrected current document index |
| `docs/architecture.md` | factual N24 package/checkpoint map; remains non-normative |
| `docs/implementation/2026-09-03-repository-guidebook-learning-rewrite.md` | work-specific learning record |
| `docs/superpowers/plans/2026-09-03-repository-guidebook-learning-rewrite.md` | execution plan created after this spec is approved |

`scripts/check-guidebook-coverage.mjs`, its tests, `package.json`, and
`vitest.config.ts` are inspected and retained unless the N24 merge reveals a factual
compatibility defect. Source implementation and generated files are not edited.

## 13. Known conflicts and their treatment

### 13.1 N15 prompt versus N24 repository

The N15 counts and “N16 is planned” language are replaced with N24 evidence. This is
the approved baseline decision. N25 becomes the first planned item.

### 13.2 Stale architecture checkpoint

`docs/architecture.md` currently labels an N18 checkpoint while SSOT-02 and the
repository have completed N24. Because this file is a non-normative implementation
map, the change corrects it without amending SSOT authority.

### 13.3 Invalid generation commands

The old guide's `pnpm foundation:write` and `pnpm css-profile:write` instructions are
replaced with the actual root scripts `pnpm tokens:generate` and
`pnpm profile:generate`. Reference-contract regeneration uses
`pnpm contracts:generate`.

### 13.4 Component Token versus current fixture

The Component Token path exists and resolves, but the N24 Button fixture consumes the
Semantic Token directly. Both facts are shown as separate views of the same Button
case. No source is changed to force the example into the requested shape.

### 13.5 Final CSS output is not current

The guide stops the current Button path at normalized and validated artifacts. N29
Web compilation and final CSS emission are explicitly planned.

## 14. Verification strategy

### 14.1 Repository verification

Run from a clean checkout after all edits:

```bash
pnpm guidebook:check
pnpm check
pnpm test
pnpm build
git diff --check origin/main...HEAD
```

The guidebook checker must report 95 covered modules with no missing, stale, or
duplicate marker.

### 14.2 Documentation verification

- verify every relative Markdown link resolves to a current file or anchor;
- compare every named path and identifier with the current source tree;
- check actual code excerpts against current behavior and label omissions;
- verify current/planned/historical language against SSOT-02 and current packages;
- scan for stale N15 counts and invalid command names;
- confirm source implementation, normative specifications, Token sources, and
  generated artifacts are unchanged by the rewrite.

### 14.3 Learning-quality verification

- novice-reader pass: English terms can be hidden without losing the main Korean
  meaning;
- jargon-density pass: no sentence depends on several unexplained new terms;
- terminology pass: schema, contract, registry, manifest, raw, normalized, resolved,
  effective, and canonical remain distinct;
- code-sandwich pass: every teaching block has observation guidance and a result;
- fidelity pass: simplified, actual, and abridged examples are clearly labeled;
- authority pass: current behavior, normative rule, generated projection, history,
  and planned work are not merged into one claim;
- artifact-separation pass: the stable guide is not a changelog and the work record
  is not a duplicate architecture manual.

## 15. Risks and controls

| Risk | Control |
| --- | --- |
| 95 module entries overwhelm the learning path | keep all markers in Part IV and link to them only when the running example reaches the module |
| N24 changes make old prose subtly false | derive examples, commands, counts, and package roles from current files and tests |
| English annotations make Korean prose harder to read | annotate only consequential first uses; move longer nuance to callouts or the glossary |
| Simplified examples look like supported APIs | use mandatory fidelity labels and connect to exact real paths afterward |
| Guidebook becomes a second authority | link normative claims to owners and use explanatory rather than prescriptive language |
| Current and planned pipelines blur together | end the current Button path at N24 and label N25+ or N29 responsibilities explicitly |
| Large document rewrite drops module coverage | retain machine-checked one-marker-per-module coverage and run the checker throughout implementation |

## 16. Completion criteria

The rewrite is complete only when:

- the first 20 percent explains Axiom's purpose and one complete current Button flow;
- a reader with basic TypeScript knowledge can follow Part I without external
  architecture reading;
- the Button case is reused consistently across Parts I–III;
- foundational concepts begin with a situation or executable example;
- consequential English semantic words receive contextual, not merely bilingual,
  explanations at first use;
- every important code block has a before/after explanation;
- Part II identifies exact authority, edit source, command, expected result, and
  common failure for each task;
- Part III explains design choices using concepts already introduced in Part I;
- Part IV accurately covers all 95 discovered modules exactly once;
- all relative links and current paths resolve;
- N0–N24 are current and N25+ are not presented as implemented;
- the current Button fixture's direct Semantic Token use and the separate Component
  Token alias are both described accurately;
- final CSS emission is not claimed before N29;
- no source implementation, normative contract, Token source, or generated artifact
  is changed;
- all repository and learning-quality verification gates pass.
