# Axiom Design System
## SSOT-03 — CSS Appearance Profile & Property Policy
### Version 0.2.2

**Status:** NORMATIVE \
**Depends on:** SSOT-00 v0.3.1, SSOT-01 v0.4.0 \
**Decision basis:** [ADR-0003](../adr/0003-recipe-authoring-kernel-and-third-party-boundary.md) \
**Scope:** Pinned CSS metadata → effective property registry → Recipe authoring → normalized Appearance IR

---

## 1. Purpose

This document defines how standard CSS and Axiom Token semantics coexist.

It answers:

- what makes a CSS property canonical in Axiom v0.1;
- how all standard properties are supported without hand-written policy entries;
- when a CSS value, Token Reference, or Token template is legal;
- how sparse policy is resolved into a complete effective registry;
- how camelCase authoring becomes kebab-case IR;
- how shorthand, longhand, declaration order, and Recipe precedence interact;
- what the Web compiler may assume about normalized input.

---

## 2. CSS Appearance Profile Identity

```ts
interface CSSAppearanceProfileDescriptor {
  id: "axiom-css";
  schemaVersion: "0.1";
  webrefPackageVersion: string;
  webrefInputPath: string;
  webrefInputDigest: string;
  generatorVersion: string;
  policySourceDigest: string;
}
```

The descriptor is emitted with every effective registry. A profile cannot be
identified only as “latest CSS.” Reproducible builds require exact inputs.

The reference input is the consolidated `@webref/css` data. Webref versions
7+ provide consolidated CSS feature data and relationships such as
`longhands`, `resetLonghands`, `legacyAliasOf`, and source specification
links. The exact version is pinned by the repository lockfile and copied into the
descriptor.

---

## 3. Canonical Property Identity

### 3.1 Normative ID

The normative ID is the standard kebab-case CSS property name.

```text
background-color
padding-inline
grid-template-columns
transition-duration
```

Vendor-prefixed spellings are not canonical IDs. Legacy aliases resolve to their
standard target during registry generation or produce a migration diagnostic.

### 3.2 TypeScript authoring projection

TypeScript may expose a generated camelCase view:

```text
backgroundColor       → background-color
paddingInline         → padding-inline
gridTemplateColumns   → grid-template-columns
```

The projection is mechanical. It does not introduce Axiom synonyms such as
`foreground`, `radius`, `layer`, or `flowDirection`.

An authoring object MUST use one naming mode. Mixed camelCase/kebab-case keys in
one style fragment are rejected.

N20 CSS Recipe authoring accepts generated camelCase object keys for ordinary
Slot styles. Its explicit same-stage ordered declaration-array escape uses the
canonical kebab-case property name in each `{ property, value }` entry. An
object fragment cannot contain canonical kebab-case keys and an ordered array
cannot contain camelCase keys; the two forms are not mixed within one style
fragment. The Recipe Kernel treats either JSON-safe form as opaque structural
data. N20 validates property identity and value shape; N22 owns conversion to
normalized ordered Declaration IR.

### 3.3 Custom properties

CSS custom properties are not supplied by Webref. They require one of:

1. an Axiom-generated Token custom property;
2. an entry in a project Custom Property Registry;
3. an allowed namespace configured for trusted application authoring.

System Recipes MUST NOT directly spell generated Token custom-property names.
They use Token References so Token usage remains traceable.

---

## 4. Source Registry and Effective Registry

### 4.1 Upstream property entry

The generator reads at least:

```ts
interface UpstreamCSSProperty {
  name: string;
  syntax?: string;
  href: string;
  inherited?: boolean | string;
  initial?: string;
  longhands?: readonly string[];
  resetLonghands?: readonly string[];
  legacyAliasOf?: string;
}
```

Actual upstream data is validated against the pinned package schema. The
reference interface is not a substitute for upstream validation.

### 4.2 Sparse Axiom policy sources

```text
policy/
  defaults.json
  groups/
    paint.json
    spacing.json
    sizing.json
    shape.json
    typography.json
    effects.json
    motion.json
    layering.json
  overrides.json
  blocked.json
  custom-properties.json
```

Policy sources are intentionally sparse.

### 4.3 Effective policy

Every generated property has an effective policy.

```ts
interface EffectiveCSSPropertyEntry {
  name: CSSPropertyName;
  syntax: string | null;
  sourceHref: string;
  status:
    | "standard"
    | "experimental"
    | "deprecated"
    | "legacy";
  kind:
    | "longhand"
    | "shorthand";
  inherited: boolean | null;
  initialValue: string | null;
  longhands: readonly CSSPropertyName[];
  resetLonghands: readonly CSSPropertyName[];
  policy: EffectivePropertyPolicy;
}
```

```ts
interface EffectivePropertyPolicy {
  authoring:
    | "allowed"
    | "opt-in"
    | "blocked";
  valueKinds: readonly CSSValueKind[];
  tokenBindings:
    EffectiveTokenBindingPolicy;
  rawCSS:
    | "allowed"
    | "warning"
    | "blocked";
  shorthand:
    | "not-applicable"
    | "allowed"
    | "warning"
    | "blocked";
  portability:
    | "portable-candidate"
    | "web-specific"
    | "unknown";
  motion:
    | "interpolable"
    | "discrete"
    | "not-animatable"
    | "unknown";
  security: PropertySecurityPolicy;
  provenance: readonly PolicyProvenance[];
}

interface EffectiveTokenBindingPolicy {
  directDomains:
    readonly TokenDomain[];
  templateDomains:
    readonly TokenDomain[];
  projectors:
    readonly string[];
  allowsTokenNegation: boolean;
}
```

---

## 5. Policy Resolution

### 5.1 Resolution order

```text
1. Upstream CSS metadata
2. Status-class default
3. Global Axiom default
4. Matching property-group policy
5. Per-property override
6. Explicit block/security override
7. Consistency validation
```

Later stages may narrow earlier permission. A later stage cannot silently remove
a security block.

### 5.2 Standard default

A recognized standard property defaults to:

```json
{
  "authoring": "allowed",
  "valueKinds": ["css"],
  "tokenBindings": {
    "directDomains": [],
    "templateDomains": [],
    "projectors": [],
    "allowsTokenNegation": false
  },
  "rawCSS": "allowed",
  "shorthand": "warning",
  "portability": "unknown",
  "motion": "unknown"
}
```

Therefore absence from an authored overlay never means that a standard property
is unavailable.

### 5.3 Experimental default

```json
{
  "authoring": "opt-in",
  "valueKinds": ["css"],
  "rawCSS": "allowed",
  "diagnostic": "warning"
}
```

An opt-in is declared in build configuration and recorded in generated
artifacts. Experimental status is not inferred from browser popularity alone.

### 5.4 Vendor and unknown defaults

Vendor-prefixed property authoring is blocked unless an explicit compatibility
exception exists. Unknown non-custom properties are errors.

### 5.5 Policy conflicts

Two group policies cannot assign incompatible Token Domain or raw-CSS rules to
the same property. The generator fails and reports both source locations. A
per-property override must explicitly resolve an intended overlap.

---

## 6. Property Policy Groups

Groups reduce maintenance but do not infer semantic Domain solely from CSS
syntax.

The exhaustive v0.1 direct/template/projector mappings, including every
physical and logical margin property, are defined by the
[Token Domain & CSS Binding Catalog](../specs/token-domain-and-css-binding-catalog.md).
The lists below summarize the generated policy groups.

### 6.1 Paint

Representative properties:

```text
color
background-color
border-*-color
outline-color
text-decoration-color
caret-color
accent-color
fill
stroke
```

Default governed policy:

```text
value kinds     token
direct Domains  color
template Domains color where the property grammar embeds paint
raw CSS         blocked in system Recipes
```

Gradient/image properties may accept `gradient` through a per-property policy
because a DTCG gradient does not contain CSS linear/radial geometry.

### 6.2 Spacing

```text
padding-*
margin-*
gap
row-gap
column-gap
scroll-margin-*
scroll-padding-*
```

```text
direct Domains  space
template Domains space
negation         margin/inset only
raw CSS         allowed for auto, percentage, and calculated layout needs
```

Negative margins require an explicit policy decision; Primitive spacing Tokens
remain non-negative.

### 6.3 Sizing

```text
inline-size / block-size
min-* / max-*
width / height
flex-basis
```

```text
direct Domains  size
template Domains size for track/function values
raw CSS         allowed for auto, intrinsic, percentage, viewport, and calc
```

### 6.4 Shape and stroke

```text
border-*-radius    radius
border-*-width     borderWidth
outline-width      borderWidth
border-*-style     strokeStyle
stroke-width       strokeWidth
```

Composite `border` Token projection is governed by SSOT-01 and emits validated
longhands.

### 6.5 Typography

```text
font-family       fontFamily
font-size         fontSize
font-weight       fontWeight
line-height       lineHeight
letter-spacing    letterSpacing
```

Typography composite Tokens expand before final declaration validation.

### 6.6 Effects and layering

```text
box-shadow        shadow
filter template   blur
backdrop-filter   blur
opacity           opacity
z-index           layer
aspect-ratio      aspectRatio
```

`filter`, `backdrop-filter`, and blend properties are standard raw CSS by
default and can receive future Domains only through evidence-backed policy.

### 6.7 Motion CSS properties

```text
transition-duration         duration
transition-delay            duration
transition-timing-function  easing
```

`transition-property`, `animation-name`, and iteration/direction/fill
properties are CSS data, not design-value Tokens by default.

---

## 7. Value Algebra

```ts
type CSSValueKind =
  | "css"
  | "token"
  | "css-template";
```

### 7.1 CSS literal

```ts
interface CSSLiteral {
  kind: "css";
  value: string;
}
```

The value is parsed and matched against the property grammar. Empty values,
embedded declaration delimiters, and `!important` are rejected.

### 7.2 Token Reference

```ts
interface TokenReference {
  kind: "token";
  path: TokenId;
}
```

Validation requires:

1. property permits `token`;
2. Token exists in every required context;
3. Token Domain is in `tokenBindings.directDomains`;
4. resolved DTCG type has a registered CSS serializer;
5. serialized context values are grammar-compatible.

### 7.3 CSS value template

```ts
interface CSSValueTemplate {
  kind: "css-template";
  parts: readonly (
    | string
    | TokenReference
  )[];
}
```

Authoring example:

```ts
inlineSize:
  css`calc(100% - ${token("space.semantic.layout.gutter.md")})`
```

Templates are not arbitrary JavaScript templates in IR. The authoring helper
normalizes them to string/Token segments. Every Token segment is validated and a
synthetic CSS custom-property reference is used for final grammar validation.

Each Token segment Domain must appear in
`tokenBindings.templateDomains`. Direct and template permissions are separate:
`box-shadow` may directly accept a `shadow` Token while allowing `space`,
`blur`, and `color` Token segments in a template.

`negateToken(token(...))` is a restricted authoring helper. N20 preserves its
closed serializable authoring form `{ kind: "negated-token", token }` and
checks only that the embedded value is a closed Token Reference; N20 does not
decide whether a property permits negation. N21 validates
`allowsTokenNegation`, Domain, and serializer policy, so margin/inset acceptance
and padding/gap rejection first become binding decisions there. N22 lowers an
accepted negated Token to a CSS template equivalent to
`calc(0px - var(--generated-token))`.

### 7.4 CSS-wide keywords

`initial`, `inherit`, `unset`, `revert`, and `revert-layer` are
recognized CSS values. System policy may warn or block them because they can
bypass component guarantees. `revert-layer` is blocked in v0.1 generated
Recipe declarations.

### 7.5 Resource-bearing values

Values containing URLs are allowed only in trusted build-time sources and are
reported in a resource manifest. Data URLs, remote protocols, fragments, and
local paths have separately configurable rules. No raw value originating from
untrusted runtime input is compiled.

---

## 8. Authoring Model

### 8.1 Recipe Kernel port

The structural Recipe layer is parameterized by the CSS profile's generated
style fragment type.

```ts
interface RecipeKernelPort<TStyle> {
  define<
    const TDefinition extends
      RecipeKernelDefinition<TStyle>,
  >(
    definition: TDefinition,
  ): DefinedRecipe<TDefinition>;
}
```

The kernel owns:

```text
literal slot/variant inference
defaulted versus required variant axes
slot reference validation
compound condition structure
stable source order
authoring source locations
```

It does not own:

```text
CSS property/value validation
Token Domain binding
provider behavior
environment query compilation
CSS/class output
runtime callbacks
```

N20 configures this Kernel with an explicit effective Property Registry,
Canonical State Registry, and Condition Registry. It does not read repository
state or select a current profile implicitly. The configured `defineRecipe`
boundary validates generated property identity, permitted value kinds, raw CSS
grammar, canonical State membership/applicability/value shape, and registered
Condition membership. It retains only the Kernel definition and structural
snapshot; it does not emit Appearance IR, CSS, class strings, collision traces,
or provider/runtime data.

Panda Slot Recipes is the primary API-shape reference and Tailwind Variants is
a secondary ergonomics reference. Their evaluated output is not accepted by
the normalizer. Optional source importers are downstream of this contract and
must fail on any construct without a lossless Axiom representation.

### 8.2 Recipe shape

```ts
const authoring = createCSSRecipeAuthoring({
  propertyRegistry,
  canonicalStateRegistry,
  conditionRegistry,
});

authoring.defineRecipe({
  id: "button",
  slots: ["root", "icon", "label"],
  base: {
    root: {
      display: "inline-flex",
      backgroundColor:
        token(
          "color.component.button.root.background.default",
        ),
      paddingInline:
        token(
          "space.component.button.root.padding.inline.md",
        ),
    },
  },
  variants: {},
  states: {},
  compoundVariants: [],
  conditions: [],
});
```

String values in TypeScript authoring are treated as CSS literals only when the
generated property type permits them. Explicit `css()` and `css``` helpers
are required where inference would be ambiguous.

### 8.3 Structural axes

```text
slots       appearance parts
base        unconditional declarations
variants    design-controlled selections
states      canonical observed state
compoundVariants
            combinations of variants/states
conditions  registered environment observations
```

No axis contains raw selectors.

### 8.4 Slot

A Slot is a stable appearance part identifier, not necessarily a DOM element.
Repeated instances use the same Slot ID and are evaluated separately by the
runtime binding.

### 8.5 Variant

Variant axes and values are literal-inferred. A default makes an axis optional
at runtime; no default makes it required.

### 8.6 State

State is slot-local and references the canonical registry in SSOT-05. Provider
names such as `isPressed` are not Recipe state IDs.

### 8.7 Compound variants

v0.1 permits:

- AND between condition fields;
- a scalar equality;
- a flat array meaning OR within one field.

It forbids callbacks, NOT, and nested arbitrary expression trees.

```ts
compoundVariants: [
  {
    when: {
      variants: {
        tone: ["danger", "warning"],
      },
      states: {
        root: {
          pressed: true,
        },
      },
    },
    apply: {
      root: {
        transform: "translateY(1px)",
      },
    },
  },
]
```

The authoring field is `compoundVariants` for familiarity with established
Recipe libraries. Normalization emits `compoundRules`; authoring field names do
not become IR field names automatically.

---

## 9. Normalized Declaration IR

### 9.1 Declaration

```ts
interface CSSDeclarationIR {
  property: CSSPropertyName;
  value:
    | CSSLiteral
    | TokenReference
    | CSSValueTemplate;
  important: false;
  origin: DeclarationOrigin;
}

interface DeclarationOrigin {
  recipeId: string;
  slot: string;
  stage:
    | "base"
    | "variant"
    | "state"
    | "compound"
    | "condition";
  source: string;
}
```

### 9.2 Slot declarations

```ts
interface SlotDeclarationRecord {
  slot: string;
  declarations: readonly CSSDeclarationIR[];
}
```

Object property enumeration order is not normative. Normalization emits explicit
arrays.

### 9.3 Appearance IR

```ts
interface CSSAppearanceIR {
  schemaVersion: "0.1";
  profile: "axiom-css";
  profileInputDigest: string;
  recipeId: string;
  slots: readonly string[];
  base: readonly SlotDeclarationRecord[];
  variantAxes: readonly VariantAxisIR[];
  stateRules: readonly StateRuleIR[];
  compoundRules: readonly CompoundRuleIR[];
  conditionRules: readonly ConditionRuleIR[];
}
```

Condition rule details are normative in SSOT-04.

### 9.4 Variant and state IR

```ts
interface VariantAxisIR {
  name: string;
  defaultValue?: string;
  values: readonly {
    value: string;
    apply: readonly SlotDeclarationRecord[];
  }[];
}

interface StateRuleIR {
  slot: string;
  state: string;
  cases: readonly {
    equals: boolean | string;
    apply: readonly CSSDeclarationIR[];
  }[];
}
```

### 9.5 Compound IR

```ts
interface CompoundRuleIR {
  when: {
    variants?: Readonly<
      Record<string, string | readonly string[]>
    >;
    states?: Readonly<
      Record<
        string,
        Readonly<Record<string, boolean | string>>
      >
    >;
  };
  apply: readonly SlotDeclarationRecord[];
}
```

---

## 10. Evaluation and Cascade Semantics

### 10.1 Stage order

```text
1. Base
2. Selected Variant axes, serialized axis order
3. Active State rules, serialized rule order
4. Matching Compound rules, serialized rule order
5. Matching Condition rules, serialized rule order
```

Later matching declarations win according to CSS cascade semantics when
specificity and importance are equal. Generated selectors MUST have controlled
specificity, and generated CSS layers MUST preserve stage order.

### 10.2 Generated layer order

```css
@layer
  axiom.tokens,
  axiom.recipe.base,
  axiom.recipe.variant,
  axiom.recipe.state,
  axiom.recipe.compound,
  axiom.recipe.condition;
```

An adapter may use another representation only if its golden tests prove
equivalent meaning.

### 10.3 Class attribute order

HTML class token order does not define CSS precedence. Evaluators MUST NOT depend
on the order of class names in a `class` attribute to implement Recipe stage
precedence.

### 10.4 Same-property collisions

Multiple declarations for the same property are legal when stage order is
intentional. Cross-variant-axis and simultaneous-state collisions emit
diagnostics because their winner may be hard to understand.

### 10.5 Shorthand/longhand overlap

The normalizer expands the affected-property set using `longhands` and
`resetLonghands` metadata for collision analysis.

Example:

```text
base      border
variant   border-color
```

These names differ but overlap. The variant declaration may intentionally win
for color while the shorthand still supplies width and style. The normalizer
records a diagnostic trace.

v0.1 policy:

- standard shorthands are authorable;
- governed system Recipes SHOULD prefer longhands;
- shorthand/longhand overlap across stages produces a warning;
- a reset-longhand overlap that would erase a later expectation produces an
  error;
- same-stage ambiguous overlap produces an error unless declaration order is
  explicit in an array authoring form.

### 10.6 Adapter reordering

Minification, shorthand synthesis, and rule merging may occur only when the CSS
compiler proves semantic preservation for the configured browser targets.
Golden output and browser-level computed-style fixtures guard this boundary.

---

## 11. Validation Pipeline

### P1 — Profile input

```text
pinned version and digest
upstream schema
unique property identities
valid longhand/reset relationships
CSSTree-compatible syntax fields
```

### P2 — Sparse policy source

```text
known property references
known direct/template Token Domains and projectors
no conflicting group policies
override provenance
blocked rule precedence
```

### P3 — Effective registry

```text
every standard property has a policy
stable deterministic order
legacy aliases resolved
all policy provenance retained
round-trip schema validation
```

### P4 — Authoring declaration

```text
generated property key
single naming mode
allowed value kind
no !important
no embedded declaration/selector syntax
```

### P5 — Value

```text
CSS grammar match
Token existence and Domain compatibility
Token serializer availability
template segment validity
resource policy
```

N20 performs the structural declaration path: CSS literal grammar and profile
value-kind permission, plus the schema-shaped Token Reference/template form
and closed negated-Token authoring form.
N21 is the first phase permitted to validate Token existence, direct/template
Domain compatibility, projector, negation, serializer, or composite expansion.
The N20 boundary therefore MUST NOT call Token-binding validation merely
because an authored declaration contains a Token Reference.

### P6 — Recipe

```text
unique IDs/slots
valid variant defaults
valid canonical states
valid condition IDs
compound references
```

### P7 — Normalization

```text
kebab-case IDs
ordered declaration arrays
shorthand overlap diagnostics
stable stage order
serialized profile digest
```

---

## 12. Diagnostics

Representative codes:

```text
AXP1001  unknown CSS property
AXP1002  experimental property requires opt-in
AXP1003  vendor property blocked
AXP1101  raw CSS blocked by governed policy
AXP1102  Token binding not configured
AXP1103  Token Domain mismatch
AXP1104  missing Token serializer
AXP1201  CSS grammar mismatch
AXP1202  !important forbidden
AXP1203  resource policy violation
AXP1301  shorthand/longhand overlap
AXP1302  reset-longhand conflict
AXN2001  unstable declaration order
AXN2002  profile digest mismatch
AXR1001  invalid Recipe structural shape or closed-key violation
AXR1002  invalid shared-schema Recipe identifier
AXR1003  duplicate Recipe Slot
AXR1004  undeclared Recipe Slot reference
AXR1005  invalid Recipe Variant shape or identifier
AXR1006  invalid default Recipe Variant selection
AXR1007  invalid compound Recipe predicate or reference
AXR1008  invalid Recipe State rule or case
AXR1010  invalid Recipe Condition expression or rule
AXR1011  non-JSON-safe Recipe structural input
AXR1012  invalid Recipe source location
AXA1001  CSS Recipe declaration naming mode violation
AXA1002  unknown canonical State in CSS Recipe authoring
AXA1003  canonical State not applicable to the Recipe appearance scope
AXA1004  canonical State value does not match its registered value shape
AXA1005  unknown registered Condition in CSS Recipe authoring
AXA1006  CSS declaration value kind not permitted by effective property policy
AXA1007  malformed CSS Recipe declaration value or ordered declaration entry
```

Every diagnostic includes property, Recipe, Slot, stage, source location, and
policy provenance where available.

---

## 13. Conformance Fixtures

### Registry

```text
standard property without overlay receives raw-CSS default
group policy adds Token Domain
per-property override narrows group
explicit block wins
legacy alias normalization
new snapshot property diff
conflicting group policy fails generation
```

### Value

```text
grid-template-columns raw CSS succeeds without overlay
scroll-snap-type raw CSS succeeds without overlay
background-color + color Token succeeds
background-color + space Token fails
margin + space Token succeeds
margin-inline-start + negated space Token succeeds
padding + negated space Token fails
padding-inline + space Token succeeds
padding-inline + size Token fails
inline-size raw percentage succeeds
CSS template with space Token succeeds
invalid CSS grammar fails
!important fails
```

### Cascade

```text
base/variant/state/compound/condition order
two variant-axis collision warning
simultaneous state collision warning
border shorthand + border-color trace
reset-longhand error
class order independence
Lightning CSS transformation semantic equivalence
```

### Round trip

```text
author → normalize → serialize → parse → schema validate
semantic equality
profile digest retained
byte-stable canonical output
```

---

## 14. Definition of Done

The CSS Appearance Foundation reaches Gate A only when:

- pinned input manifest, sparse policy schema, and effective registry schema
  exist;
- the normative Token Binding Catalog is expanded against the pinned property
  snapshot and all required margin/padding families are covered;
- every recognized standard property has a deterministic effective policy;
- CSS literals and Token bindings take separate validated paths;
- TypeScript authoring keys are generated from the registry;
- normalized declarations are ordered arrays with kebab-case IDs;
- shorthand/reset-longhand diagnostics pass fixtures;
- Button, Select, and Dialog normalize without target/compiler code;
- the Recipe Kernel conformance suite proves slots, defaults, per-slot variants,
  and compound variants without emitting class strings;
- Appearance IR round-trips through JSON Schema;
- no Web compiler reads Recipe authoring source directly.

---

## References

- [W3C Webref](https://github.com/w3c/webref)
- [Webref CSS package changelog](https://github.com/w3c/webref/blob/main/packages/css/CHANGELOG.md)
- [CSSTree](https://github.com/csstree/csstree)
- [CSS Syntax Module Level 3](https://www.w3.org/TR/css-syntax-3/)
- [Lightning CSS](https://lightningcss.dev/)
- [Axiom Token Domain & CSS Binding Catalog](../specs/token-domain-and-css-binding-catalog.md)
- [Panda CSS Slot Recipes](https://panda-css.com/docs/concepts/slot-recipes)
- [Tailwind Variants slots](https://www.tailwind-variants.org/docs/slots)
