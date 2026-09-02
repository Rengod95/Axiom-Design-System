# Axiom Design System
## SSOT-00 — System Architecture & Standards Profile
### Version 0.3.1

**Status:** NORMATIVE \
**Scope:** Axiom v0.1 system architecture and authority \
**Authority:** Highest Axiom-owned architectural authority \
**Decision basis:** [ADR-0001](../adr/0001-css-native-appearance-profile-and-scope.md), [ADR-0002](../adr/0002-react-aria-behavioral-criteria-source.md), [ADR-0003](../adr/0003-recipe-authoring-kernel-and-third-party-boundary.md), [ADR-0004](../adr/0004-token-vocabulary-and-color-profile.md)

---

## 1. Purpose

This document freezes:

- the relationship between external standards and Axiom-owned policy;
- module ownership and one-way dependency direction;
- the boundary between Tokens, CSS properties, Recipes, Motion, Behavior, and
  React;
- the v0.1 product scope and release gates;
- the authority order used when prose, schemas, fixtures, and implementation
  disagree.

Detailed contracts are delegated to SSOT-01 through SSOT-05. This document wins
when a lower specification contradicts its system boundary.

---

## 2. Authority Order

```text
1. Accepted ADRs that amend architecture
2. SSOT architecture/domain specifications
3. Normative JSON Schemas, registries, and pinned input manifests
4. Conformance fixtures and golden artifacts
5. Generated TypeScript/reference definitions
6. Compiler/runtime implementations
7. Examples and historical executable-spike documentation
```

An accepted ADR MUST be reconciled into the affected SSOT documents before
implementation begins. A prose/schema conflict stops the release; neither side
is silently preferred.

An explicit owner-approved requirement that changes an unreleased contract is
decision input above the stale draft it amends, but it MUST be recorded in an
ADR before the repository treats the new contract as authoritative. If an
implementation lands while reconciliation is paused, that implementation is
evidence only: release and the next dependent work item remain blocked until
ADR, SSOT, machine-readable contracts, and fixtures agree. ADR-0004 and
SSOT-01 v0.4.0 apply this rule to the Token clean break.

---

## 3. External and Axiom-Owned Authority

| Concern | Authority | Axiom role |
| --- | --- | --- |
| Token file format and value shapes | DTCG 2025.10 | Define tier, domain, path, context, and usage profile |
| Schema language | JSON Schema 2020-12 | Publish normative Axiom schemas |
| CSS property identity and formal syntax | CSS specifications through pinned `@webref/css` | Add sparse design-system policy and release snapshot |
| CSS grammar validation | CSS specifications through a pinned CSSTree-compatible grammar | Add diagnostics and trust policy |
| CSS browser transformation | Browser targets + Lightning CSS reference backend | Own deterministic compiler inputs and artifacts |
| Interaction/accessibility behavior | exact React Aria release + matching official criteria evidence in v0.1 | Own versioned Behavior Criteria Profiles and provider-independent projections |
| Motion execution | Axiom Motion IR + `motion` first backend | Own serialized semantics, tokens, reduced-motion policy |

External data is not copied into hand-maintained prose. Every generated registry
records source package version, source digest, generator version, schema version,
and generation timestamp policy.

---

## 4. Layer Model

```text
L0  External Standards
    DTCG 2025.10
    JSON Schema 2020-12
    CSS specifications / pinned Webref snapshot

L1  Token Foundation
    primitive / semantic / component sources
    Token Domain Registry
    resolver document and theme contexts

L2  Token Normalization
    parse → validate → compose contexts → resolve → manifest

L3  CSS Appearance Profile
    generated CSS property registry
    sparse Axiom policy overlay
    value and declaration algebra
    shorthand/cascade metadata

L4  Recipe Authoring
    slots / variants / states / compounds / conditions
    Axiom Recipe Kernel port / TypeScript authoring projection

L5  Normalized Appearance IR
    profile-tagged, serializable declaration IR

L6  Environment and Motion
    condition registry
    Motion authoring and normalized Motion IR

L7  Compiler Contracts
    CSS compiler capabilities, diagnostics, artifacts
    Motion backend capabilities

L8  Web Compiler
    token CSS, recipe CSS, evaluator, source maps, manifests

L9  Behavior Projection
    versioned Behavior Criteria Profiles
    React Aria state/lifecycle → canonical state/lifecycle

L10 React Component Binding
    Axiom-owned public API and provider integration
```

L9 and L10 are consumers of generated artifacts. They cannot redefine Token,
Property Policy, Recipe precedence, or Motion IR semantics.

---

## 5. System Pipelines

### 5.1 Token and appearance build pipeline

```text
DTCG Token Sources ──→ Token Resolver ──→ Resolved Token Contexts ─┐
                                                                  │
Pinned Webref ──→ CSS Registry Generator ──→ Effective Registry ──┼─→ Normalizer
                                                                  │
Recipe Authoring ─────────────────────────────────────────────────┘
                                      ↓
                          Normalized Appearance IR
                                      ↓
                              Web CSS Compiler
                                      ↓
                     CSS + evaluators + manifests
```

### 5.2 Behavior/runtime pipeline

```text
React Aria state and lifecycle
             ↓
per-component state projection
             ↓
canonical evaluator input ──→ generated class selection
             ↓
optional Motion binding ──→ Motion runtime backend
```

### 5.3 Theme runtime

Theme is resolved during generation into context-complete token artifacts. The
browser selects a generated context, normally through scoped CSS custom
properties. Changing theme does not re-run Recipe normalization.

---

## 6. Boundary Definitions

### 6.1 Token Boundary

Tokens own design value identity, tier, domain, aliases, context resolution, and
serialization metadata.

Tokens do not own:

- CSS property selection;
- Recipe precedence;
- DOM structure;
- React props;
- behavior state machines;
- arbitrary selectors.

### 6.2 CSS Appearance Boundary

The v0.1 Appearance Profile adopts standard CSS property names and CSS value
grammar. Axiom enriches them with sparse policy:

- Token Domain compatibility;
- token-required/token-allowed/css-only authoring;
- shorthand and reset-longhand relationships;
- property status and portability;
- motion capability and exceptions;
- explicit blocking/security rules.

The policy overlay is not an allowlist. A recognized standard property without
an override remains authorable with a grammar-valid CSS value.

### 6.3 Recipe Boundary

A Recipe describes slot-local declarations selected by variants, canonical
states, compounds, and registered conditions.

The structural authoring contract is exposed behind an Axiom-owned Recipe
Kernel port. Third-party Recipe libraries may inform its ergonomics or feed a
loss-aware source importer, but their evaluated class/CSS output is never Core
IR or compiler input.

A Recipe does not contain:

- renderer nodes;
- arbitrary selectors or at-rules;
- callbacks or predicates;
- Tailwind utilities;
- provider-specific state names;
- behavior implementation;
- imperative animation handles.

### 6.4 IR Boundary

Normalized IR is the only normative Recipe input to compilers. It is JSON
round-trippable and profile tagged. Property identifiers are kebab-case CSS
names. Declarations are ordered arrays, not unordered style objects.

### 6.5 Condition Boundary

Environment Conditions are registered observations such as viewport size,
container inline-size, and reduced-motion preference. They are not variants,
themes, or behavior states. Raw media/container query strings are not Recipe IR.

### 6.6 Motion Boundary

Axiom owns serialized Motion semantics, token references, lifecycle phases,
reduced-motion alternatives, and backend capability diagnostics. The first
runtime backend executes those semantics but is not the SSOT.

### 6.7 Behavior Boundary

React Aria owns focus management, press semantics, keyboard navigation,
selection, overlay dismissal, and accessibility state machines. Axiom performs
component-local select/rename projection into canonical appearance and motion
lifecycle inputs.

A lockfile-resolved React Aria release and matching official documentation form
the v0.1 Behavioral Criteria Source. Axiom snapshots the evidence it relies on,
publishes machine-readable per-component criteria, and requires a semantic diff
before provider upgrades.

### 6.8 Public Component Boundary

`@axiom/react` owns its props, events, refs, variants, parts, and override
policy. Provider types are implementation details. Runtime `className` or
`style` escape hatches remain downstream of normative Recipe IR.

---

## 7. Architectural Invariants

### INV-001 — Normative contracts are language-neutral

SSOT, JSON Schema, registries, and serialized fixtures are normative.
TypeScript is a generated/reference authoring surface.

### INV-002 — Dependency direction is one-way

Token sources cannot import CSS, React, Tailwind, Motion, or provider concepts.
Profile and runtime layers may depend on upstream registries but not the reverse.

### INV-003 — DTCG Type, Token Domain, and CSS grammar differ

`dimension` describes serialized value shape. `space`, `size`, and `radius`
describe Axiom meaning. `<length-percentage>` describes a CSS value grammar.

### INV-004 — CSS property identity is standard, Axiom policy is sparse

Axiom MUST NOT rename standard properties into a parallel vocabulary.
Unannotated standard properties receive default CSS authoring policy.

### INV-005 — Full CSS support does not imply unrestricted Token binding

Raw CSS authoring is broadly generated. Token references require explicit
Domain compatibility policy.

### INV-006 — Theme is a Resolver context, not a Token tier

The v0.1 tier set is primitive, semantic, and component. Theme overrides values
within a registered context without changing Token ID, tier, domain, or type.

### INV-007 — Token alias and Appearance reference differ

Token graph aliases are DTCG references. Appearance Token References bind a CSS
declaration value to a Token ID.

### INV-008 — Authoring and IR differ

CamelCase TypeScript keys, templates, helpers, and literal inference are authoring
concerns. Compilers consume only normalized kebab-case serialized IR.

### INV-009 — Declaration order and cascade are explicit

Base, variant, state, compound, and condition precedence is serialized.
Shorthand/longhand overlap is diagnosed. Adapters cannot reorder declarations
in a way that changes meaning.

### INV-010 — Variant, State, Condition, and Theme are distinct axes

```text
variant    design-controlled input
state      behavior observation
condition  environment observation
theme      token resolver context
```

### INV-011 — Motion does not become behavior

Motion reacts to lifecycle/state inputs but does not determine interaction
state transitions.

### INV-012 — Provider independence is a Core property, not a release deferral

Core contracts remain provider-independent while the v0.1 React binding selects
React Aria as its primary provider.

### INV-013 — No arbitrary selector/callback language in Core

Full property support does not admit arbitrary selectors, arbitrary at-rules,
functions, React nodes, or executable callbacks into serialized Recipe/Motion
IR.

### INV-014 — Build-time heavy, runtime light by default

Parsing, resolution, registry generation, normalization, and CSS compilation do
not ship to the browser. Motion is an explicit optional runtime capability.

---

## 8. Standard and Reference Tooling Profile

### Normative standards

```text
Design Tokens        DTCG 2025.10
Axiom schemas        JSON Schema 2020-12
CSS property input   pinned @webref/css consolidated snapshot
CSS semantics        referenced CSS specifications
```

### Reference implementation dependencies

```text
DTCG parser          @terrazzo/parser behind an Axiom port
Schema validation    Ajv 2020
CSS authoring types  csstype, generated projection only
CSS grammar          css-tree compatible with pinned Webref
CSS compilation      lightningcss
Motion backend       motion
Behavior provider    react-aria-components
Behavior tests       @react-aria/test-utils where supported + semantic assertions
Recipe references    Panda Slot Recipes / Tailwind Variants / CVA, not Core runtimes
Tests                Vitest + TypeScript fixture projects
Workspace            pnpm + TypeScript project references
```

Reference dependencies are version-pinned in the repository. An implementation
may substitute an equivalent backend only if all normative conformance fixtures
pass.

---

## 9. Planned Repository Boundaries

```text
spec/
  token/
    token-profile.schema.json
    token-domain-registry.json
    resolved-token-manifest.schema.json
  css/
    css-profile-input-manifest.schema.json
    property-policy-source.schema.json
    effective-property-registry.schema.json
    token-binding-catalog.schema.json
    appearance-ir.schema.json
  condition/
    condition-registry.schema.json
  motion/
    motion-ir.schema.json
  runtime/
    state-registry.schema.json
    behavior-criteria-source-manifest.schema.json
    behavior-criteria-profile.schema.json
    behavior-projection.schema.json

packages/
  token-tooling/
  tokens/
  css-property-profile/
  recipe-kernel/
  appearance-authoring/
  appearance-normalizer/
  condition-registry/
  adapter-contract/
  adapter-web/
  motion-schema/
  motion-adapter-motion/
  behavior-react-aria/
  react/
  integration-tailwind/

fixtures/
  button/
  select/
  dialog/
  negative/
  round-trip/
  golden/
```

Current packages are preserved as a historical executable spike until a phase
explicitly migrates or replaces them.

---

## 10. v0.1 Required Scope

```text
DTCG 2025.10 parsing and all standard value shapes
primitive / semantic / component Token tiers
light / dark resolver contexts
common-system Token Domain coverage and generated CSS Token Binding Catalog
CSS-standard property identity
full standard CSS raw-value authoring through pinned registry
sparse Token Domain policy
ordered declaration IR and shorthand diagnostics
slots / variants / states / compounds
Axiom-owned Recipe Kernel contract
viewport / container / reduced-motion conditions
serializable Motion DSL and first Motion runtime backend
Web CSS compiler and Tailwind integration
React Aria behavioral projection
versioned React Aria Behavioral Criteria Profiles
Axiom-owned React Button / Select / Dialog APIs
consumer override boundary
deterministic generation and conformance fixtures
```

---

## 11. v0.1 Non-Goals

```text
Replacing the CSS language
Hand-authoring policy for every CSS property
Arbitrary selector or at-rule language in Recipe IR
Untrusted runtime CSS compilation
Axiom interaction engine or accessibility state machine
Multiple full behavior providers
Runtime token parsing or Recipe compilation
Automatic CSS/static Motion backend selection
Gesture, drag, scroll-linked, or shared-layout Motion
React Native or SwiftUI first-class Appearance Profile
Figma synchronization protocol
Storybook architecture
```

Full standard property support is not a claim that every property is portable,
animatable, token-governed, or supported by every future target.

---

## 12. Frozen v0.1 Decisions

```text
DTCG 2025.10 and JSON Schema 2020-12
domain-root + explicit-tier Token path profile
primitive / semantic / component tiers
Theme as resolver context
CSS-native canonical property identity
Pinned generated CSS registry + sparse Axiom policy
Default raw CSS authoring for recognized standard properties
Explicit Domain policy for Token binding
Ordered declaration-array IR
No !important in system Recipes
Recipe Authoring != Normalized IR
Slot-local state
Variant != State != Condition != Theme
Base → Variant → State → Compound → Condition precedence
Web compiler as first style backend
Motion IR with Motion runtime as first backend
React Aria as v0.1 primary behavior provider
React Aria as versioned v0.1 Behavioral Criteria Source
Axiom-owned Recipe Kernel; no evaluated third-party class/CSS output in IR
Provider-independent Core
No arbitrary selectors/callbacks in serialized IR
Build-time-heavy architecture
```

Changing one of these requires a new ADR, SSOT version update, schema impact
analysis, and fixture migration plan.

---

## 13. Specification Map

| Specification | Owns |
| --- | --- |
| SSOT-01 | Token tiers, domains, paths, resolver, manifests, composite projection |
| SSOT-02 | compiler contracts, diagnostics, gates, versioning, governance |
| SSOT-03 | CSS registry generation, sparse policy, values, declarations, Recipe and Appearance IR |
| SSOT-04 | environment conditions, responsive rules, Motion authoring/IR/backend |
| SSOT-05 | canonical runtime state, React Aria projection, public React API |
| Token Domain & CSS Binding Catalog | required Domains and common governed Web property bindings |
| React Aria Behavioral Criteria Profile | Button/Select/Dialog behavior criteria and verification matrix |

---

## References

- [Design Tokens Technical Reports 2025.10](https://www.designtokens.org/TR/2025.10/)
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- [W3C Webref](https://github.com/w3c/webref)
- [CSSTree](https://github.com/csstree/csstree)
- [Lightning CSS](https://lightningcss.dev/)
- [Motion](https://motion.dev/docs/animate)
- [React Aria](https://react-aria.adobe.com/)
