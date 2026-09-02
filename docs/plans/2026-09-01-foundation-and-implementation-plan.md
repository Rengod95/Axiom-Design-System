# Axiom Foundation Reconciliation & Implementation Plan

**Date:** 2026-09-01; reconciled 2026-09-02 through N21 \
**Status:** ACTIVE PLAN \
**Normative inputs:** ADR-0001 through ADR-0005, SSOT-00 v0.3.1, SSOT-01 v0.4.1, SSOT-02 v0.5.1, SSOT-03 v0.3.1, SSOT-04 v0.2.0, SSOT-05 v0.2.3, Token Domain & CSS Binding Catalog \
**Repository baseline:** pre-foundation MVP removed; SSOT-based specification
harness and Token Foundation packages are the only live implementation baseline

---

## 1. Outcome

The implementation is complete only when Axiom can reproducibly perform:

```text
DTCG primitive/semantic/component sources
        ↓
light/dark resolved manifests
        ↓
pinned Webref + sparse policy
        ↓
complete effective CSS Property Registry
        ↓
expanded direct/template/projector Token bindings
        ↓
Axiom Recipe Kernel + typed Recipe and Motion authoring
        ↓
schema-valid normalized IR
        ↓
deterministic Web CSS and evaluator artifacts
        ↓
versioned React Aria Behavior Criteria + Button / Select / Dialog bindings
        ↓
responsive, Motion, accessibility, SSR conformance
```

The removed MVP is not an implementation or migration authority. Button,
Select, and Dialog conformance fixtures are recreated from the accepted ADRs,
SSOT documents, and normative schemas rather than copied from the deleted
packages.

---

## 2. Current Repository Disposition

| Current package | Disposition | Reason |
| --- | --- | --- |
| `@axiom/spec-tooling` | Preserve and extend | Owns the normative schema/registry harness and N15 Appearance IR semantic validation |
| `@axiom/tokens` | Preserve and complete | Owns renderer-independent Token contracts and resolution |
| `@axiom/token-tooling` | Preserve and complete | Owns pinned DTCG parser and Token artifact generation adapters |
| `@axiom/css-property-profile` | Preserve and extend | Implements the completed P3 pinned CSS metadata, policy generation, and validation boundary |

The removed appearance, Recipe, Adapter, Behavior, and React packages MUST NOT
be restored as examples. Their future replacements enter only after the owning
SSOT contract and conformance fixtures exist.

---

## 3. Target Workspace

```text
spec/
  token/
  css/
  condition/
  motion/
  runtime/

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
  behavior-contracts/
  behavior-react-aria/
  react/
  integration-tailwind/

fixtures/
  token/
  property-profile/
  recipe/
  motion/
  runtime/
  applications/
```

### 3.1 Package dependencies

```text
token-tooling ──→ tokens

recipe-kernel ────────────────────────┐
tokens ───────────────────────────────┤
css-property-profile ─────────────────┼─→ appearance-authoring
condition-registry ───────────────────┘          ↓
                                      appearance-normalizer
                                                 ↓
adapter-contract ←────────────────────── normalized artifacts
       ↓                                         ↓
adapter-web                             motion-schema
       ↓                                         ↓
integration-tailwind                   motion-adapter-motion

behavior-contracts ← behavior-react-aria
          ↑                 ↓
          └────────────── react ← generated Web/Motion artifacts
```

### 3.2 Forbidden dependencies

```text
tokens → CSS/React/Motion/provider
css-property-profile → Recipe/React/provider
recipe-kernel → Panda/Tailwind Variants/CVA/vanilla-extract runtime
appearance-normalizer → React/provider/Tailwind
adapter-web → authoring source/provider
behavior-contracts → React Aria
react → DTCG parser/Webref/CSSTree/Lightning CSS
```

A repository boundary script and TypeScript project references enforce these
rules.

---

## 4. Artifact Inventory

At the N15 checkpoint, `spec/manifest.json` is the inventory authority and
contains **33 schemas, 14 registries, and 23 fixture suites**. Those suites own
26 positive and 57 negative fixture files. The table below is the target Gate A
inventory; rows after N15 are planned and MUST NOT be read as implemented.

### 4.1 Target normative schemas

| ID | Artifact |
| --- | --- |
| S-T01 | Token source profile |
| S-T02 | Token Domain Registry |
| S-T03 | Resolver context document |
| S-T04 | Resolved Token Manifest |
| S-T05 | Composite projector descriptor |
| S-P01 | CSS profile input manifest |
| S-P02 | Sparse property policy source |
| S-P03 | Effective CSS Property Registry |
| S-P04 | Token Binding Catalog |
| S-P05 | CSS declaration value |
| S-P06 | CSS Appearance IR |
| S-C01 | Condition Registry |
| S-M01 | Motion IR |
| S-R01 | Canonical State Registry |
| S-R02 | Behavioral Criteria Source Manifest |
| S-R03 | Component Behavior Criteria Profile |
| S-R04 | Behavior projection contract |
| S-A01 | Compiler descriptor/capabilities |
| S-A02 | Diagnostic |
| S-A03 | Generated artifact/build manifest |

### 4.2 Current registered authorities

```text
Canonical State Registry
Composite projector registry
Condition Registry
CSS Effective Property Registry
CSS Profile Input
CSS Sparse Property Policy
CSS Token Binding Catalog
CSS Token Binding Coverage
Foundation Resolved Token Manifest
Foundation Token Policy
Resolver Modifier Registry
Semantic Token Vocabulary
Token Domain Registry
Token Source Profile
```

### 4.3 Target generated authorities

```text
effective CSS Property Registry
resolved context Token manifests
Token path TypeScript unions
CSS property authoring types
Recipe variant/slot/state types
Behavior Criteria Source Manifest and profile digests
condition ID types
normalized fixtures
golden CSS/evaluators/manifests
```

Generated artifacts are subordinate to their inputs and generator.

---

## 5. Phase P0 — Preserve Baseline and Prevent Drift

**Implementation status (2026-09-01): COMPLETE through the accepted MVP
removal and SSOT rebaseline.**

### Work

- record the cleanup inputs and resulting package disposition;
- keep `pnpm check`, tests, and build passing;
- prevent removed MVP packages from becoming migration authority;
- enforce the current package dependency graph and source standard;
- recreate future Button, Select, and Dialog fixtures from SSOT evidence;
- record generated artifact digests through the specification harness.

### Outputs

```text
baseline manifest
spike behavior fixture list
package disposition ledger
boundary check update
```

### Acceptance

- clean dependency install succeeds;
- current tests remain unchanged or stronger;
- no current package is silently treated as normative;
- future changes can distinguish spike and new pipeline outputs.

---

## 6. Phase P1 — Normative Schema Harness

**Implementation status (2026-09-01): COMPLETE for the P1 entry gate.**

The executable result is recorded in
[P1 Normative Specification Harness — Implementation Report](../implementation/2026-09-01-p1-normative-spec-harness.md).
The same checkpoint also materialized the first P2 identity/domain slice: Token
tier/path schemas and the 24-entry Token Domain Registry. The remaining P2 work
is complete and recorded in the P2 implementation reports.

### Work

1. Create `spec/` directories and root schema conventions.
2. Pin JSON Schema 2020-12 dialect and canonical `$id` convention.
3. Add Ajv 2020 validator utility used only in tooling/tests.
4. Add schema meta-tests:
   - every schema validates against the meta-schema;
   - every `$ref` resolves;
   - fixture directories declare positive/negative expectation;
   - unknown fields follow an explicit `unevaluatedProperties` policy.
5. Add canonical JSON formatter and digest utility.
6. Add diagnostic source-location shape.

### File targets

```text
spec/README.md
spec/common/identifier.schema.json
spec/common/source-location.schema.json
spec/common/token-reference.schema.json
spec/common/diagnostic.schema.json
packages/spec-tooling/
```

### Acceptance

- one command validates every schema and fixture;
- schema output is deterministic across directories;
- invalid fixture expectation mismatches fail CI;
- TypeScript types are not yet manually used as normative substitutes.

---

## 7. Phase P2 — Token Foundation

**Implementation status (2026-09-01): COMPLETE.**

The executable checkpoint is recorded in
[P2.1 DTCG Parser & Normalization Boundary — Implementation Report](../implementation/2026-09-01-p2-token-parser-and-normalization.md).
[P2.3/P2.4 Tier Graph & Context Resolver — Implementation Report](../implementation/2026-09-01-p2-tier-graph-and-context-resolver.md)
records the resolver checkpoint. The final generated-artifact and composite
descriptor evidence is recorded in
[P2 Token Foundation Closeout](../implementation/2026-09-01-p2-token-foundation-closeout.md).
The production scale audit and corrective expansion are recorded in
[Token Foundation Scale Hardening](../implementation/2026-09-01-token-foundation-scale-hardening.md).

### P2.1 Parser port

- [done] add `@terrazzo/parser` behind `TokenParserPort`;
- [done] pin dependency and parser configuration;
- [done] normalize parser output into Axiom-owned plain data;
- [done] add fixtures for all DTCG 2025.10 types;
- [done] prohibit parser-specific instances in manifests.

### P2.2 Identity and Domain

- [done] implement explicit `<domain>.<tier>.*` parsing;
- [done] implement Token Domain Registry schema/data;
- cover color, gradient, space, size, radius, border/stroke width, atomic and
  composite typography, border/stroke style, shadow, blur, opacity, duration,
  easing, transition, layer, breakpoint, and aspect ratio;
- [done] validate Domain ↔ DTCG type;
- [done] validate Domain numeric/range constraints;
- [done] enforce non-negative Primitive spacing while reserving governed negation for
  margin/inset use sites;
- [done] generate `TokenDomain`, `TokenTier`, and Token path types.
- [done] enforce the machine-readable color, space, unit, typography, primitive
  naming, and resolved contrast policy.

### P2.3 Tier graph

- [done] validate allowed tier edges;
- [done] reject Component → Primitive;
- [done] require Component base alias to Semantic;
- [done] emit dependency trace for every public Token.

### P2.4 Context resolver

- [done] implement light/dark modifier registry;
- [done] apply source precedence before alias resolution;
- [done] enforce immutable tier/domain/type;
- [done] enforce context completeness;
- [done] emit byte-stable resolved manifests.

### P2.5 Composite projectors

- [done] define the composite projector descriptor schema and registry;
- [done] keep descriptor identity, Token Domain, DTCG type, and declared output
  properties in Token Foundation;
- [P4 responsibility] implement typography, border, shadow, transition,
  gradient, and blur CSS serialization in the Appearance pipeline;
- [done] require every projector output to re-enter CSS Property Policy and grammar
  validation.

### Acceptance

```text
all DTCG positive/negative fixtures
all tier edge fixtures
light/dark golden manifests
component promotion fixtures
composite projection fixtures
two-directory deterministic output
tokens package imports no CSS/React/Motion modules
```

---

## 8. Phase P3 — CSS Property Profile

**Implementation status (2026-09-01): COMPLETE for the property-profile gate.**

The executable result is recorded in
[P3 CSS Property Profile — Implementation Report](../implementation/2026-09-01-p3-css-property-profile.md).

### P3.1 Dependency pinning

Pin and record:

```text
@webref/css
css-tree version compatible with Webref syntax
csstype for TypeScript projection
```

The input manifest records the consolidated CSS file path and digest.

### P3.2 Webref importer

- validate upstream data shape;
- extract property identity, syntax, source href, inherited/initial metadata;
- extract longhand/reset-longhand and legacy alias relationships;
- retain enough source provenance for diagnostics;
- sort deterministically.

### P3.3 Sparse policy

- implement standard/experimental/deprecated/vendor defaults;
- implement property group schema;
- add initial paint, spacing, sizing, shape, typography, effects, motion, and
  layering groups;
- implement the normative Token Binding Catalog with separate direct Domains,
  template Domains, projectors, and token-negation permission;
- expand every physical/logical `margin-*` and `padding-*` family member from
  the pinned property registry rather than maintaining an ad hoc allowlist;
- implement per-property overrides;
- implement blocks for unknown/vendor, `all`, `!important`, and unsafe
  resources;
- fail conflicting group overlaps.

### P3.4 Effective registry

- resolve every upstream property to an effective policy;
- prove a property without overlay remains raw-CSS authorable;
- generate authoring keys and kebab/camel map;
- emit Domain→property and property→binding coverage reports;
- emit policy provenance;
- produce snapshot diff utility.

### P3.5 CSS validation service

```ts
interface CSSGrammarValidator {
  validate(
    property: string,
    value: string,
  ): CSSGrammarResult;
}
```

- use CSSTree lexer matching;
- handle CSS-wide keywords by Axiom policy;
- reject embedded declaration syntax and importance;
- return structured mismatch diagnostics;
- expose no parser AST in normative artifacts.

### Acceptance

```text
unannotated standard property raw value succeeds
Token binding without policy fails
governed Domain match/mismatch fixtures
all physical/logical margin properties accept space Tokens
margin/inset accept governed token negation; padding/gap reject it
direct versus template Domain mismatch fixtures
experimental opt-in
vendor/unknown/custom property rules
legacy alias normalization
shorthand metadata integrity
registry snapshot deterministic
Webref update diff fixture
```

---

## 9. Phase P4 — Appearance Authoring and Normalization

### P4.1 Recipe Kernel proof

- define `RecipeKernelPort<TStyle>` and JSON-safe structural input;
- use Panda Slot Recipes as the primary authoring-shape reference;
- cover slots, per-slot base/variants, defaults, and ordered compound variants;
- prove required/default variant inference and flat AND/simple OR conditions;
- prohibit class strings, selectors, CSS output, and third-party runtime objects
  from the kernel result;
- run the same structural Button/Select/Dialog fixtures through the reference
  kernel conformance suite;
- defer optional Panda/Tailwind Variants source importers until after Gate A.

### P4.2 Generated TypeScript surface

- generate property keys from effective registry;
- use `csstype` only as an authoring aid;
- generate Token Domain-specific references;
- expose `token()`, `css()`, and CSS template helpers;
- prevent mixed naming modes;
- create TypeScript positive/`@ts-expect-error` fixtures.

### P4.3 Recipe authoring

- implement `defineRecipe()`;
- literal-infer slots, variants, defaults, `compoundVariants`, states, and
  condition IDs;
- support ordered declaration-array escape only for same-stage CSS cascade cases;
- reject selectors, at-rules, functions, symbols, Maps/Sets, and React nodes.

N20 configures the N19 Kernel with explicit effective Property, Canonical State,
and Condition registries. It accepts generated camelCase object fragments or
canonical kebab-case ordered declaration arrays, never mixed within one
fragment. It validates property identity, allowed value kind, raw CSS grammar,
and State/Condition membership. It deliberately does not emit Appearance IR,
CSS, class output, collision traces, provider data, or Token semantic results.

### P4.4 Declaration validation

- normalize camelCase to kebab-case;
- resolve effective property policy;
- validate CSS literal, Token Reference, or template path;
- N20 attaches CSS authoring context and validates only structural Token/
  template form; N21 validates direct/template Token Domain, projector,
  negation permission, and serializer;
- N21 expands composite Token applications; N22 attaches normalized
  Declaration IR source/provenance traces.

### P4.5 Recipe normalization

- normalize base, variant, state, compound, and condition stages;
- preserve serialized axis/rule/declaration order;
- analyze same-property and shorthand/longhand overlap;
- emit warning/error codes from SSOT-03;
- include profile and registry digests.

### P4.6 Round trip

- serialize canonical JSON;
- parse and validate with Appearance IR schema;
- compare semantic equality;
- reject profile digest mismatch.

### Acceptance

```text
Button normalizes
Select repeated-item Slot model normalizes
Dialog multi-part model normalizes
full CSS raw property fixture
all Token Domain mismatch negatives
Recipe Kernel slot/default/compound conformance
no third-party class/CSS artifact leakage
all selector/callback negatives
shorthand/cascade trace fixtures
TypeScript inference fixtures
round-trip and deterministic normalization
```

---

## 10. Phase P5 — Conditions and Responsive Appearance

### Work

- implement Condition Registry schema/data;
- add breakpoint Domain Tokens;
- register viewport width conditions;
- register named container inline-size conditions;
- register reduced-motion preference;
- validate flat AND/simple OR expressions;
- detect provable contradictory ranges;
- add condition-constrained variant/state rules;
- normalize Condition IDs without query strings.

### Compiler-facing fixtures

```text
viewport rule expected @media
container rule expected @container
reduced-motion expected @media
Base → Variant → State → Compound → Condition winner
overlapping conditions diagnostic
```

### Acceptance

- no Recipe source contains raw `@media` or `@container`;
- no JavaScript matchMedia is needed for appearance;
- breakpoint Tokens resolve in all contexts and remain theme-invariant;
- Dialog demonstrates container-responsive layout.

---

## 11. Gate A Review

Before Web compiler implementation:

1. Run all schema/meta-schema tests.
2. Generate all registries/types in two clean paths.
3. Expand the Token Binding Catalog and verify every required margin/padding
   family member against the pinned CSS registry.
4. Pass the Recipe Kernel structural conformance suite.
5. Validate Behavioral Criteria Source/Profile schemas.
6. Normalize Button, Select, Dialog.
7. Run negative/type/round-trip tests.
8. Audit dependency graph.
9. Compare prose SSOT against schemas with a checklist.
10. Record unresolved warnings and classify P0/P1/P2.
11. Declare Gate A only with zero P0/P1 blockers.

Compiler inconvenience after Gate A is not enough reason to mutate Core. A
demonstrated domain deficiency requires ADR and fixture evidence.

---

## 12. Phase P6 — Web CSS Compiler

### P6.1 Contract and capability validation

- implement compiler descriptor;
- require profile-complete property digest;
- validate conditions and value kinds;
- reject unsupported/experimental inputs according to build profile.

### P6.2 Token CSS

- generate stable CSS custom-property names;
- emit light/dark scopes;
- choose alias-preserving or flattened mode explicitly;
- verify both modes have equivalent resolved values;
- emit Token usage and custom-property manifest.

### P6.3 Recipe CSS

- allocate deterministic selectors/classes;
- emit controlled-specificity rules;
- emit normative cascade layers;
- compile viewport/container/preference conditions;
- keep origin mapping for source maps and diagnostics.

### P6.4 Evaluators

- generate per-Recipe static lookup modules and declaration files;
- accept canonical variant/state inputs;
- return Slot class maps;
- exclude condition evaluation from JavaScript.

### P6.5 Lightning CSS

- pin browser target config as an input;
- transform/prefix/minify;
- prevent semantic shorthand reordering regressions with golden/computed-style
  fixtures;
- reparse final CSS;
- emit source maps and build manifest.

### P6.6 Tailwind integration

- create import/layer fixture application;
- document utility override behavior;
- ensure Tailwind scan is not required for Axiom generated classes;
- do not translate Recipe declarations into utility strings.

### Acceptance

```text
Button/Select/Dialog CSS and evaluators
light/dark variable switching
full CSS property fixture
condition CSS
shorthand/longhand computed-style cases
browser target prefix/lowering fixture
resource manifest
two-directory byte-stable build
Tailwind integration application
```

---

## 13. Phase P7 — Motion

### P7.1 Schema and authoring

- implement Motion IR schema;
- implement `defineMotion()`;
- validate CSS properties/keyframe grammar through Profile;
- validate Token Domains for duration/easing and value tracks;
- normalize offsets and sequence timing;
- require reduced-motion strategy.

### P7.2 Backend-independent tests

- Dialog enter/exit;
- backdrop tween;
- Button pressed stateChange;
- tween and spring;
- sequential segments;
- invalid/discrete/non-animatable properties;
- JSON round trip.

### P7.3 Motion backend

- implement backend descriptor/capabilities;
- translate standard CSS property tracks to Motion runtime calls;
- resolve Token-backed transition data without general resolver in browser;
- support cancellation/reversal contract;
- emit tree-shakeable per-component runtime modules.

### P7.4 Failure and reduced-motion

- use replacement/disable strategies;
- guarantee final semantic visibility on backend error;
- add reduced-motion CSS fallback;
- ensure no focus/accessibility state depends on animation completion.

### Acceptance

```text
backend-independent fixtures
Motion backend fixtures
rapid open/close cancellation
reduced-motion tests
runtime failure operability
no Motion dependency in Token/Profile/Normalizer
```

---

## 14. Gate B Review

Gate B requires:

- Web compiler consumes only normalized schema-valid inputs;
- output reparse and golden artifacts pass;
- browser target and profile digests are present;
- conditions and cascade semantics pass computed-style tests;
- Tailwind integration works without becoming authority;
- no compiler warning silently drops output;
- clean deterministic rebuild succeeds.

---

## 15. Phase P8 — Behavior and React

### P8.1 Behavioral Criteria Source

Under ADR-0005, the N17 schema/structural-fixture boundary is complete
in this branch. The following executable provider-source work belongs to N32.

- generate a source manifest from exact lockfile-resolved
  `react-aria-components`, `react-aria`, and `react-stately` packages;
- record integrity and official evidence-page digests;
- populate the current source manifest and component criteria profiles under
  the closed N17 schemas;
- author Button, Select, and Dialog profiles for semantics, multi-modal
  interaction, focus, state, selection/collection, form/validation, overlay,
  and lifecycle;
- add a provider-upgrade diff command with impact classification;
- fail Gate C for an unreviewed criteria or evidence change.

### P8.2 Behavior contracts

- create `behavior-contracts`;
- move canonical state registry out of current state-order implementation;
- define Button, Select, Dialog capabilities and Slot state;
- provide plain snapshot/projection types.
- attach criteria profile ID/digest to every component contract.

### P8.3 React Aria projection

- create component-local projection functions;
- map select/rename only;
- test repeated Select item state independently;
- map Dialog lifecycle;
- isolate all React Aria imports in provider/binding packages.
- prove every observed provider field is projected or explicitly classified as
  non-Appearance/non-Motion data.

### P8.4 Public React API

- define Axiom-owned Button/Select/Dialog props;
- remove wholesale provider prop extension;
- map controlled/default state;
- define Axiom event reason unions;
- define ref and accessibility contracts;
- generate variant types from Recipes.

### P8.5 Generated artifact binding

- use generated class evaluator;
- import generated styles through documented entry;
- bind Motion only for components with artifacts;
- keep conditions in CSS;
- remove runtime `AppearanceStyle` compilation and Core consumer override.

### P8.6 Overrides

- support root `className` and `style`;
- expose registered Component Token custom properties in documentation;
- add explicit part props only per component;
- test merge order and event-handler composition;
- reject internal generated-class contracts as public API.

### P8.7 Accessibility/SSR/package

- keyboard and focus fixtures;
- semantic role/name/state assertions with React Testing Library;
- use pinned `@react-aria/test-utils` for supported high-level interaction
  drivers without making its internals normative;
- form/validation fixtures;
- Dialog focus containment/restoration;
- server render/hydration;
- RSC import boundaries;
- export map/tree-shaking fixture applications.

### Acceptance

```text
no public provider type leakage
exact Behavioral Criteria Source Manifest
Button/Select/Dialog criteria profiles and evidence digests
reviewed provider criteria diff
Button/Select/Dialog accessible behavior
canonical projection tests
generated evaluator integration
Motion lifecycle integration
SSR/RSC/package tests
runtime contains no build tooling
```

---

## 16. Gate C and Release Review

### Gate C

- all React Runtime criteria in SSOT-05 pass;
- exact provider/evidence manifest and Button/Select/Dialog criteria profiles
  validate;
- provider upgrade criteria diff has no unresolved change;
- no Core package depends on React/provider;
- override boundary is documented and tested;
- public API examples compile without provider knowledge.

### Release

- run all Gates in a fresh clone;
- inspect packaged files and dependency graph;
- run artifact drift check;
- generate specification/registry/build provenance report;
- publish spike migration notes;
- verify no unresolved P0/P1 diagnostics;
- perform license and dependency security review;
- tag schemas, generated types, compilers, and React packages consistently.

---

## 17. Cross-Cutting Test Matrix

| Concern | Unit | Schema | Type | Golden | Browser/runtime |
| --- | ---: | ---: | ---: | ---: | ---: |
| DTCG parsing | yes | yes | no | yes | no |
| Token tier/domain | yes | yes | yes | yes | no |
| Token CSS binding catalog | yes | yes | yes | coverage report | computed value sample |
| Context resolution | yes | yes | yes | yes | CSS theme |
| Property policy | yes | yes | yes | registry | no |
| CSS grammar | yes | no | partial | diagnostics | output reparse |
| Recipe normalization | yes | yes | yes | IR | no |
| Recipe Kernel | yes | structural | yes | definition snapshot | no |
| Cascade/shorthand | yes | yes | no | CSS | computed style |
| Conditions | yes | yes | yes | CSS | browser |
| Motion | yes | yes | yes | manifest | runtime |
| Behavior projection | yes | optional | yes | snapshots | React |
| Behavior criteria | yes | yes | partial | evidence/profile digests | React/accessibility tree |
| Public API | yes | no | yes | package | React/SSR |
| Determinism | no | yes | no | yes | no |

No single test type is considered sufficient for CSS cascade, accessibility, or
package-boundary behavior.

---

## 18. Migration Map

### Token source

```text
previous color.primitive.blue.600
  → color.primitive.brand.600

previous color.semantic.action.primary.default
  → color.semantic.fill.brand.default

new component binding
  → color.component.button.root.background.default
```

### Properties

```text
background       → background-color
foreground       → color
flowDirection    → flex-direction
radius           → border-radius
shadow           → box-shadow
layer            → z-index
```

CamelCase remains authoring-only:

```text
backgroundColor  → IR background-color
paddingInline    → IR padding-inline
marginInline     → IR margin-inline + space Token binding
```

### Recipe

```text
style object Record
  → ordered Slot declaration arrays

adapterExtension / consumerOverride stages
  → removed from normative IR

arbitrary state strings
  → canonical State Registry

third-party Recipe class output
  → rejected as IR; optional source importer after Gate A
```

### Adapter

```text
adapter-tailwind atomic spike
  → adapter-web direct CSS compiler
  → integration-tailwind downstream package
```

### Behavior/React

```text
@axiom/behavior state ordering
  → behavior-contracts + generated Recipe ordering

floating React Aria behavior assumption
  → exact source manifest + component Behavior Criteria Profiles

ButtonProps extends provider props
  → Axiom-owned ButtonProps + internal mapping
```

---

## 19. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Webref snapshot changes grammar unexpectedly | Registry/build churn | Pin exact input, diff tool, golden fixtures |
| CSSTree grammar and Webref drift | False validation | Pin compatible versions, upstream syntax fixture |
| Full CSS allows governance bypass | Inconsistent system components | token-required group policy, raw-value diagnostics |
| Shorthand changes stage winner | Visual bugs | affected-longhand analysis and computed-style tests |
| Lightning CSS optimization changes meaning | Output regression | browser target pin, semantic golden tests |
| Component Token explosion | Unmaintainable API | promotion criteria and usage fixtures |
| Motion backend leaks into IR | Lock-in | backend-independent JSON schema/tests |
| Exit Motion conflicts with provider unmount | Broken focus/visibility | lifecycle contract and rapid-reversal tests |
| React Aria types leak publicly | provider lock-in | public API type fixtures and boundary lint |
| React Aria behavior changes without type break | interaction/accessibility regression | exact source manifest, evidence digest, criteria diff gate |
| Third-party Recipe engine becomes compiler authority | Token/property/provenance loss | Axiom Recipe Kernel port; source-only interop after Gate A |
| Broad Token bindings become another hand allowlist | coverage drift | generated family expansion and Domain/property coverage reports |
| Current spike edits overlap migration | lost evidence | preserve baseline and migrate package-by-package |
| Raw CSS resource values create risk | build/security issue | trusted source boundary and resource manifest |

---

## 20. Work Item Completion Template

Every implementation work item records:

```text
ID
Normative source section
Inputs
Outputs
Package/files
Positive fixtures
Negative fixtures
Diagnostics
Generated artifact impact
Dependency boundary impact
Migration impact
Acceptance command
Open questions
```

A work item is not complete when only TypeScript compiles. Its normative schema,
negative fixtures, diagnostics, and generated-artifact impact must also be
resolved.

---

## 21. Immediate Next Work

The next coding session continues from the cleaned SSOT implementation baseline,
not from removed Recipe or Adapter code.

Exact first sequence:

```text
1. [done] Add spec harness and canonical JSON/digest utilities.
2. [done] Add Token tier/path and Domain schemas.
3. [done] Add DTCG parser port with all-type fixtures.
4. [done] Add context/resolved manifest schemas.
5. [done] Materialize the complete v0.1 Token Domain Registry and constraints.
6. [done] Complete generated Token path types and composite projector descriptors.
7. [done] Pin Webref/CSSTree and generate the effective registry.
8. [done] Add Token Binding Catalog schema and expand margin/padding families.
9. [done] Prove unannotated grid-template-columns raw authoring.
10. [done] Prove background-color + direct color Token binding.
11. [done] Prove margin-inline + space and governed negative margin.
12. [done] Prove box-shadow template segments for space/blur/color.
13. [done] Add the Canonical State Registry schema and fixtures (N12).
14. [done] Add the Condition Registry schema and fixtures (N13).
15. [done] Add ordered declaration/value schemas (N14).
16. [done] Add the Appearance IR schema (N15).
17. [done] Add the Motion IR schema (N16).
18. [done, ADR-0005] Add Behavioral Criteria Source/Profile schemas and synthetic structural fixtures (N17); N32 owns current provider data.
19. [done] Generate/reference the combined TypeScript contract surface (N18).
20. [done] Implement the Recipe Kernel port and structural conformance suite (N19).
21. [done] Implement the CSS-aware defineRecipe SDK (N20); N21 retains Token semantic validation.
22. [done] Integrate profile policy with explicit resolved-manifest, exact
    property-policy source, digest, serializer, and projector validation into
    declarations (N21); N22 consumes the frozen binding receipt without
    duplicating Token semantic decisions.
23. Implement the Recipe normalizer and collision trace (N22).
24. Implement defineMotion authoring and normalization (N23).
```

This produces the smallest vertical foundation proof without returning to the
old small-property allowlist.

The sequencing rationale and post-P3 gaps are recorded in
[Post-P3 Foundation Review](2026-09-01-post-p3-foundation-review.md). In
particular, authoring implementation cannot precede its normalized State,
Condition, declaration, Appearance, Motion, and Behavior schemas.

---

## 22. Plan Definition of Done

This plan may be closed when:

- every work phase has an owner/status in the project tracker;
- Gates A, B, and C produce archived reports;
- removed spike packages remain absent and are not used as implementation
  authority;
- all current SSOT questions have executable fixture answers;
- v0.1 packages can be rebuilt from a fresh clone with byte-stable normative
  artifacts.
