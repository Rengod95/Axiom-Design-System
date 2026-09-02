# Axiom Design System
## SSOT-02 — Compiler Contracts, Readiness & Governance
### Version 0.4.0

**Status:** NORMATIVE \
**Depends on:** SSOT-00 v0.3.1, SSOT-01 v0.4.0, SSOT-03 v0.2.1, SSOT-04 v0.2.0, SSOT-05 v0.2.2 \
**Purpose:** Compiler/backend boundaries, diagnostics, release gates, and implementation authority

---

## 1. Compiler Definition

An Axiom compiler backend transforms normalized, validated artifacts into
target artifacts. It does not define Token, CSS Property Policy, Recipe,
Condition, Motion, or public React semantics.

v0.1 has two backend classes:

```text
Web CSS Compiler
  Resolved Token Contexts + CSS Appearance IR
  → CSS, evaluators, manifests, source maps

Motion Runtime Backend
  Motion IR + resolved runtime values
  → runtime manifest/modules
```

Tailwind is an integration consumer of generated Web CSS, not the canonical
property compiler.

---

## 2. Compiler Inputs

### 2.1 Web compiler

```ts
interface WebCompilerInput {
  tokenManifest:
    ResolvedTokenManifest;
  propertyRegistry:
    EffectiveCSSPropertyRegistry;
  stateRegistry:
    CanonicalStateRegistry;
  conditionRegistry:
    ConditionRegistry;
  recipes:
    readonly CSSAppearanceIR[];
  browserTargets:
    BrowserTargetProfile;
}
```

### 2.2 Motion backend

```ts
interface MotionCompilerInput {
  tokenManifest:
    ResolvedTokenManifest;
  propertyRegistry:
    EffectiveCSSPropertyRegistry;
  stateRegistry:
    CanonicalStateRegistry;
  conditionRegistry:
    ConditionRegistry;
  motions:
    readonly MotionIR[];
  backend:
    MotionBackendDescriptor;
}
```

### 2.3 Forbidden direct inputs

Compilers MUST NOT read:

```text
DTCG source files
sparse policy source before effective-registry generation
defineRecipe() source objects
defineMotion() source objects
React components
React Aria state
Tailwind source scanner results
```

Every required input passes its normative schema and digest checks first.

---

## 3. Reference Contracts

### 3.1 Style compiler

```ts
interface StyleCompiler {
  descriptor:
    StyleCompilerDescriptor;

  validate(
    input: WebCompilerInput,
  ): readonly Diagnostic[];

  compile(
    input: WebCompilerInput,
  ): Promise<
    readonly GeneratedArtifact[]
  >;
}
```

### 3.2 Descriptor

```ts
interface StyleCompilerDescriptor {
  id: string;
  version: string;
  profile: "axiom-css";
  propertyProfileRange: string;
  capabilities:
    WebCompilerCapabilities;
}
```

### 3.3 Capabilities

```ts
interface WebCompilerCapabilities {
  propertyCoverage:
    | {
        kind: "profile-complete";
        profileDigest: string;
      }
    | {
        kind: "subset";
        properties:
          readonly string[];
      };
  propertyStatuses:
    readonly (
      | "standard"
      | "experimental"
      | "deprecated"
    )[];
  tokenDomains:
    readonly string[];
  valueKinds:
    readonly (
      | "css"
      | "token"
      | "css-template"
    )[];
  conditions:
    readonly (
      | "viewport"
      | "container"
      | "preference"
    )[];
  features: {
    multiSlot: boolean;
    variants: boolean;
    states: boolean;
    compoundRules: boolean;
    orderedDeclarations: boolean;
    shorthandAnalysis: boolean;
    sourceMaps: boolean;
    themes: boolean;
  };
}
```

Unsupported input is an error. A compiler cannot silently omit a declaration,
condition, Token context, or Motion track.

---

## 4. Generated Artifacts

```ts
interface GeneratedArtifact {
  path: string;
  kind:
    | "source"
    | "style"
    | "manifest"
    | "sourceMap"
    | "types";
  content: string;
  mediaType: string;
  digest: string;
  inputs:
    readonly ArtifactInputDigest[];
}
```

Reference Web output:

```text
generated/
  tokens.css
  recipes.css
  button.styles.mjs
  button.styles.d.ts
  select.styles.mjs
  dialog.styles.mjs
  condition-manifest.json
  resource-manifest.json
  build-manifest.json
  recipes.css.map
```

Generated headers:

```text
AUTO-GENERATED
DO NOT EDIT
SOURCE DIGESTS
GENERATOR/COMPILER VERSION
SCHEMA VERSIONS
CSS PROFILE DIGEST
```

---

## 5. Web Compilation Phases

```text
W1 Input Schema and Digest Validation
      ↓
W2 Compiler Capability Validation
      ↓
W3 Token CSS Serialization
      ↓
W4 Declaration and Condition Lowering
      ↓
W5 Deterministic Selector/Class Allocation
      ↓
W6 Evaluator Generation
      ↓
W7 CSS Assembly and Layer Ordering
      ↓
W8 Lightning CSS Browser Transformation
      ↓
W9 Output Grammar and Resource Validation
      ↓
W10 Manifest, Source Map, and Golden Digest Emission
```

### W1 — Input validation

All schema versions, profile IDs, and input digests must agree. A Recipe produced
from another CSS profile snapshot is rejected unless an explicit migration runs.

### W2 — Capabilities

The compiler checks property status, value kind, conditions, composite
serialization, and browser-target policy before output is created.

### W3 — Token CSS

Each context emits complete custom-property definitions. Generated names are
stable functions of Token IDs and generator version. Collisions are errors.

### W4 — Lowering

Condition IDs become media/container queries. Token References become generated
custom-property references or an explicitly configured resolved literal mode.
CSS value templates are assembled and validated.

### W5 — Class allocation

Class names are deterministic and namespaced. Hashing, if used, includes
semantic input rather than file-system absolute paths. The build manifest retains
Recipe/Slot/stage traceability.

### W6 — Evaluator generation

Evaluators contain static lookup and selection logic only. They do not parse CSS,
Tokens, conditions, or provider state.

### W7 — Layer ordering

The compiler preserves:

```text
tokens
base
variant
state
compound
condition
```

### W8 — Browser transformation

Lightning CSS is the reference parser/transformer/minifier. Configured browser
targets are an explicit build input. Prefixing or syntax lowering cannot be
performed from an implicit developer-machine configuration.

### W9 — Output validation

The final stylesheet is reparsed. Resource references are compared with the
resource policy and manifest. Unsupported browser-target features produce a
configured error or explicit compatibility warning.

### W10 — Emission

All artifacts are written atomically by implementation code. Partial output is
not considered a successful compile.

---

## 6. Tailwind Integration

Tailwind may coexist with Axiom generated CSS:

```css
@import "tailwindcss";
@import "@axiom/tokens/css";
@import "@axiom/web/styles";
```

Rules:

- Tailwind utility scanning is not an input to Axiom Core;
- Axiom does not encode Tailwind utility strings in Recipe IR;
- Tailwind integration documents CSS layer ordering;
- consumer utilities are downstream overrides, not Recipe stages;
- the removed `adapter-tailwind` package is historical and MUST NOT be restored
  as an implementation authority;
- a future integration package may export Tailwind theme/source configuration,
  but it cannot redefine Token or Property Registry semantics.

---

## 7. Runtime Boundary

### Build time

```text
DTCG parser
Token resolver
Webref importer
Policy resolver
CSSTree grammar validation
Recipe/Motion normalizers
Web compiler
Lightning CSS
schema validation
type/evaluator generation
```

### Browser runtime

```text
generated CSS
generated evaluator
React binding
React Aria provider
Motion runtime only for components with Motion artifacts
```

No general Recipe compiler or raw CSS parser ships to the browser.

---

## 8. Determinism

For identical:

```text
Token source digest
Resolver context document
CSS profile input digest
Sparse policy digest
State and Condition Registry digests
Appearance/Motion IR digests
browser targets
compiler/backend versions
```

the output MUST be semantically identical and SHOULD be byte-identical.

Determinism tests run in two clean temporary directories with different absolute
paths and compare artifact digests.

Timestamps, absolute paths, locale-sensitive sorting, random IDs, and
environment-dependent browser targets are forbidden output inputs.

---

## 9. Diagnostic Contract

```ts
type DiagnosticSeverity =
  | "error"
  | "warning"
  | "info";

interface Diagnostic {
  code: string;
  severity: DiagnosticSeverity;
  phase:
    | "token"
    | "propertyProfile"
    | "property"
    | "recipe"
    | "condition"
    | "motion"
    | "normalization"
    | "compiler"
    | "behavior"
    | "react";
  message: string;
  location?: {
    file?: string;
    pointer?: string;
    recipe?: string;
    motion?: string;
    slot?: string;
    stage?: string;
    property?: string;
    token?: string;
    condition?: string;
  };
  provenance?:
    readonly DiagnosticProvenance[];
  target?: string;
}
```

Namespaces:

```text
AXT  Token
AXP  CSS Property/Profile
AXR  Recipe/React, separated by numeric range
AXS  Canonical State
AXC  Condition
AXM  Motion
AXN  Normalization
AXA  Compiler/Adapter
AXB  Behavior projection
```

Code meaning is stable within a major specification version.

---

## 10. Security and Trust Boundary

v0.1 Recipe and Motion sources are trusted build-time project sources.

The compiler still enforces:

- no embedded selectors/declaration delimiters in values;
- no `!important` in system Recipes;
- no `@import` through value authoring;
- explicit URL/resource protocol policy;
- no runtime compilation of user input;
- no callback/function in serialized IR;
- no absolute source path leakage in artifacts;
- source maps follow release visibility policy.

Supporting arbitrary standard property values is not authorization to compile
untrusted CSS.

---

## 11. Versioning and Change Control

### 11.1 Contract and document versioning

```text
DOCUMENT PATCH
  editorial correction without meaning change

COMPATIBLE CONTRACT CHANGE
  optional compatible field
  new Token Domain or canonical state
  new condition/backend capability
  expanded sparse policy that does not invalidate valid input

BREAKING CONTRACT CHANGE
  property identity/profile model change
  required field addition or field removal/meaning change
  stage precedence change
  Token path/tier rule change
  previously valid Recipe becomes invalid by default
```

Document revision, JSON Schema compatibility identity, source/profile version,
and generator version are separate axes:

- an SSOT version records the revision of that prose contract;
- a schema `$id` identifies a compatibility line and MUST NOT change meaning in
  place after the line is frozen;
- a source/profile version records the governed input contract or corpus;
- a generator version records implementation provenance, not input
  compatibility.

Before 1.0, a breaking prose contract change increments the SSOT minor version
and resets its patch version. A breaking machine-readable change creates a new
schema compatibility identity and migration fixtures. Compatible additions
increment the owning profile or schema line according to that artifact's
published policy; editorial-only changes increment a document patch version.

ADR-0004 is a documented exception for the private pre-Gate-A reset: no
supported external consumer existed, so the clean-break tree established the
current schema identities as a new baseline while the Token Source Profile
moved to `0.2.0` and SSOT-01 moved to `0.4.0`. From that baseline forward,
schema meaning MUST NOT be changed in place.

### 11.2 Webref snapshot updates

A snapshot update produces a machine-readable diff:

```text
added properties
removed/renamed/legacy properties
syntax changes
longhand/reset-longhand changes
source href changes
policy effect changes
```

Removal, alias, and grammar narrowing require review. Newly added standard
properties receive the default raw-CSS policy automatically.

### 11.3 Backend upgrades

Lightning CSS, Motion, React Aria, parser, and schema-validator upgrades run
their relevant conformance suites and record artifact diffs before merge.

---

## 12. Gate Model

### Gate A — Foundation Frozen

Required:

```text
SSOT-00 through SSOT-05 approved
ADR-0001 through ADR-0004 reconciled
Token Domain/Tier schemas and registries
Token Binding Catalog schema and expanded margin/padding coverage
Resolved Token Manifest schema
CSS profile input manifest schema
Sparse policy source schema
Effective property registry schema
Canonical State Registry
Condition Registry
Appearance IR schema
Motion IR schema
Recipe Kernel contract and conformance fixtures
Behavioral Criteria Source/Profile schemas
Button / Select / Dialog normalize
negative and round-trip fixtures
TypeScript inference fixtures
no compiler/provider dependency in Foundation packages
```

Gate A authorizes compiler implementation.

### Gate B — Web Compiler Conformant

Required:

```text
all Gate A inputs consumed through normalized contracts
light/dark Token CSS
full standard property raw CSS fixture
Token Domain policy fixtures
direct/template/projector Token binding fixtures
physical/logical margin coverage fixture
viewport/container/reduced-motion CSS
stage/layer precedence
shorthand/longhand semantic fixtures
browser target transformation
resource/security validation
deterministic double-build
Button / Select / Dialog generated artifacts
Tailwind integration fixture
```

Gate B authorizes React binding stabilization.

### Gate C — React Runtime Conformant

Required:

```text
React Aria isolated behind component projections
exact React Aria Behavioral Criteria Source Manifest
Button / Select / Dialog Behavior Criteria Profiles
reviewed provider criteria diff with no unresolved breaking item
Axiom-owned Button / Select / Dialog public props
generated evaluator binding
Motion runtime backend and lifecycle
consumer override boundary
accessibility tests
SSR/hydration tests
RSC/package export fixtures
provider leakage type tests
```

Gate C authorizes v0.1 release review.

### Release Gate — v0.1

Required:

```text
Gates A/B/C pass in clean checkout
all normative docs and schemas agree
no unresolved P0/P1 diagnostic
artifact provenance complete
dependency licenses/security reviewed
public migration note from executable spike
release package dry run
```

---

## 13. Normative Implementation Order

The repository has completed N0–N15. N16 is the next implementation boundary;
listing an item here does not mark it complete.

```text
N0   schema directory and authority harness
N1   Token tier/path schema
N2   Token Domain Registry
N3   Token source profile schema
N4   resolver context schema
N5   Resolved Token Manifest schema
N6   composite projector descriptors

N7   CSS profile input manifest schema
N8   sparse property policy schema
N9   effective property registry schema
N10  Token Binding Catalog schema and family expansion
N11  Webref importer/generator fixtures
N12  State Registry schema
N13  Condition Registry schema
N14  ordered declaration/value schema
N15  Appearance IR schema
N16  Motion IR schema
N17  Behavioral Criteria Source/Profile schemas

N18  generated/reference TypeScript types
N19  Recipe Kernel port and structural conformance suite
N20  defineRecipe CSS authoring SDK
N21  CSS direct/template/projector Token validation
N22  Recipe normalizer and collision trace
N23  defineMotion authoring SDK and normalizer

N24  Button conformance fixture
N25  Select conformance fixture
N26  Dialog conformance fixture
N27  negative/type/round-trip/determinism fixtures
N28  Foundation reconciliation review

────────────────────────────────
GATE A
────────────────────────────────

N29  Web compiler
N30  Tailwind integration
N31  Motion runtime backend
N32  React Aria Behavioral Criteria manifests/profiles
N33  React Aria projections
N34  Axiom React public components
N35  accessibility/SSR/package fixtures
N36  release reconciliation
```

An implementation phase cannot consume an authoring object when its required
normalized schema step is incomplete.

---

## 14. Pre-Implementation Questions That Must Have Stable Answers

```text
What is a Token tier and Domain?
How are Component Tokens promoted and resolved?
Why does Theme not form a tier?
What exact Webref input generated this registry?
What happens to a standard property with no Axiom overlay?
When may a property receive a Token Reference?
Why are direct and template Token Domain bindings distinct?
Which physical and logical margin properties accept space Tokens?
How is a CSS value grammar-validated?
How are shorthand/longhand conflicts ordered?
Why are declarations arrays rather than objects?
How do Variant, State, Condition, Theme, and Lifecycle differ?
How is reduced motion guaranteed?
What does the Motion backend own?
What does React Aria own?
Which exact React Aria release and evidence produced each Behavior criterion?
What semantic diff is required before a provider upgrade?
Why can a third-party Recipe library inform authoring but not supply IR output?
Which public React types are Axiom-owned?
What information ships to the browser?
How are generated artifacts reproduced and traced?
```

A changed answer requires schema/fixture impact analysis before implementation
continues.

---

## 15. References

- [Tailwind CSS source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [W3C Webref](https://github.com/w3c/webref)
- [Lightning CSS](https://lightningcss.dev/)
- [Motion](https://motion.dev/docs/animate)
- [React Aria releases](https://react-aria.adobe.com/releases/)
- [React Aria testing](https://react-aria.adobe.com/testing)
- [Panda CSS Slot Recipes](https://panda-css.com/docs/concepts/slot-recipes)
- [Token Domain & CSS Binding Catalog](../specs/token-domain-and-css-binding-catalog.md)
