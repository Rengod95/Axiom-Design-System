# Axiom Design System
## SSOT-01 — Token Foundation & Domain Contracts
### Version 0.3.3

**Status:** NORMATIVE \
**Depends on:** SSOT-00 v0.3 \
**Scope:** Token sources → context-complete resolved manifests → Appearance handoff

---

## 1. Purpose

This document defines the Axiom-owned profile applied on top of DTCG 2025.10:

- Token tiers and path grammar;
- Axiom Token Domains and their DTCG value shapes;
- common design-system Domain coverage and its CSS binding handoff;
- Primitive, Semantic, and Component dependency rules;
- theme/context composition and deterministic resolution;
- resolved manifest and generated type contracts;
- composite Token projection into CSS declarations;
- validation phases and conformance fixtures.

It does not define CSS property identity, Recipe precedence, Motion execution, or
behavior state. Those belong to SSOT-03 through SSOT-05.

---

## 2. Token Source Contract

Token sources MUST conform to DTCG 2025.10. Source files use the
`.tokens.json` extension. Axiom does not redefine DTCG aliases, composite
value shapes, group extension, deprecation, or reference syntax.

The reference implementation places the DTCG parser behind an Axiom-owned port.
Parser library objects MUST NOT cross the port boundary or become manifest
fields.

```ts
interface TokenParserPort {
  parse(
    sources: readonly TokenSourceDocument[],
  ): Promise<ParsedDTCGDocument>;
}
```

The port exists so parser upgrades can be conformance-tested independently of
Axiom Domain and context rules.

---

## 3. Token Identity

### 3.1 Normative path grammar

```text
<domain>.<tier>.<tier-specific-path>
```

The first segment identifies Axiom Token Domain. The second segment explicitly
identifies Token Tier.

```text
color.primitive.brand.600
color.primitive.common.white
color.semantic.fill.brand.default
color.component.button.root.background.default

space.primitive.scale.4
space.semantic.control.padding.inline.md
space.component.button.root.padding.inline.md
```

Implicit tier inference from a directory or arbitrary group name is forbidden.

### 3.2 Token ID

```ts
type TokenId = string;
```

Every normalized Token entry records the parsed domain and tier. Consumers MUST
NOT repeatedly infer them from string splitting after normalization.

```ts
interface NormalizedTokenIdentity {
  id: TokenId;
  domain: TokenDomain;
  tier: TokenTier;
}
```

### 3.3 Segment rules

- segments use lower camel case or lowercase words;
- component IDs and slot IDs use the same stable identifiers as their Recipe;
- arbitrary file paths do not participate in Token identity;
- renaming a Token ID is a breaking change unless an explicit migration alias is
  published outside the DTCG Token graph;
- CSS custom-property names are generated artifacts, not Token IDs.

---

## 4. Token Tiers

```ts
type TokenTier =
  | "primitive"
  | "semantic"
  | "component";
```

### 4.1 Primitive

Primitive Tokens own reusable value scales.

```text
color.primitive.common.white
color.primitive.brand.600
space.primitive.scale.4
fontSize.primitive.scale.300
duration.primitive.fast
```

Primitive Tokens MUST contain an explicit value or a same-tier alias justified
by DTCG composition. Theme contexts MUST NOT override Primitive Tokens in v0.1.

Primitive paths identify a value scale, palette, ratio, curve, or format value;
they MUST NOT encode product usage such as `disabled`, `backdrop`, `control`,
`focus`, `overlay`, or `productive`. Product purpose belongs to Semantic
Tokens. Numeric scale names denote the registered scale step or value and are
not inferred from presentation labels such as `small`, `medium`, or `large`.

### 4.2 Semantic

Semantic Tokens own product-wide design purpose.

```text
color.semantic.background.canvas
color.semantic.surface.default
color.semantic.fill.brand.default
color.semantic.text.muted
space.semantic.control.padding.inline.md
shadow.semantic.overlay.dialog
```

Semantic Tokens normally alias Primitive Tokens of a compatible Domain and DTCG
type. Theme contexts may override Semantic values while retaining Token ID,
tier, domain, and DTCG type.

### 4.3 Component

Component Tokens expose evidence-backed component customization axes.

```text
color.component.button.root.background.default
color.component.button.root.background.pressed
space.component.select.trigger.padding.inline.md
duration.component.dialog.popup.enter
```

Component Tokens MUST alias Semantic Tokens in their base definition in v0.1.
Direct Component → Primitive aliases are errors.

Theme contexts may override an existing Component Token when a component-specific
context exception cannot be represented by a reusable Semantic Token. Such an
override requires a description and emits an informational diagnostic for
review.

### 4.4 Promotion policy

A declaration is promoted to a Component Token only when at least one condition
is demonstrated by fixtures or real component requirements:

1. consumers need to customize it without replacing the Recipe;
2. the value differs from the shared Semantic role for a legitimate component
   reason;
3. several variants/states need a stable named component axis;
4. component documentation needs to expose it as an intentional contract.

The following are not sufficient reasons:

- every declaration should have a Token;
- a one-off raw CSS value exists;
- generated token count is considered harmless;
- the property name can mechanically be copied into a Token path.

Component Token promotion MUST preserve a path-to-declaration usage fixture.

---

## 5. Axiom Token Domains

DTCG `$type` describes serialized value shape. Axiom Domain describes design
meaning and usage constraints.

### 5.1 Required v0.1 registry

| Domain | DTCG type(s) | Primary purpose |
| --- | --- | --- |
| `color` | `color` | paint and content color |
| `gradient` | `gradient` | reusable gradient stops; CSS geometry remains declaration data |
| `space` | `dimension` | padding, margin, gap, layout spacing |
| `size` | `dimension` | control, icon, touch target, field, overlay sizing |
| `radius` | `dimension` | corner radius |
| `borderWidth` | `dimension` | border and outline thickness |
| `strokeWidth` | `dimension` | SVG and text-decoration stroke thickness |
| `fontFamily` | `fontFamily` | font stacks |
| `fontSize` | `dimension` | type size |
| `fontWeight` | `fontWeight` | type weight |
| `lineHeight` | `number` | unitless line-height multiplier |
| `letterSpacing` | `dimension` | tracking |
| `typography` | `typography` | composite typography style |
| `strokeStyle` | `strokeStyle` | border/stroke style |
| `border` | `border` | composite border |
| `shadow` | `shadow` | one or more shadow layers |
| `blur` | `dimension` | filter and backdrop blur amount |
| `opacity` | `number` | opacity scale constrained to [0,1] |
| `duration` | `duration` | time values |
| `easing` | `cubicBezier` | cubic Bézier timing |
| `transition` | `transition` | duration, delay, and timing composite |
| `layer` | `number` | stacking scale |
| `breakpoint` | `dimension` | registered viewport/container thresholds |
| `aspectRatio` | `number` | positive reusable media/control ratio |

The DTCG parser MUST understand all standard DTCG 2025.10 types even when no
Axiom Domain authoring policy uses a type in the first component fixtures.

### 5.2 Registry shape

```ts
interface TokenDomainEntry {
  id: string;
  root: string;
  allowedDTCGTypes: readonly string[];
  constraints?: readonly TokenDomainConstraint[];
  cssSerializers: readonly string[];
}
```

Examples of Axiom-owned constraints:

```text
opacity         number in [0,1]
lineHeight      positive number
layer           integer
breakpoint      non-negative dimension
space           non-negative Primitive scale; governed negation at use site
size            non-negative dimension
radius          non-negative dimension
borderWidth     non-negative dimension
strokeWidth     non-negative dimension
blur            non-negative dimension
duration        non-negative duration
aspectRatio     positive number
```

Domain constraints supplement, not replace, DTCG validation.

### 5.3 Domain and CSS property independence

Token Domain Registry does not import the CSS Property Registry.

```text
Token Domain Registry
        ↓ referenced by
CSS Property Policy
```

This direction allows a property policy to say that `padding-inline` accepts
`space` without making the Token Foundation aware of CSS.

The same rule applies to margin. `space` is the Token meaning; the CSS Token
Binding Catalog expands that meaning over `margin-*`, `padding-*`, `gap`,
positional inset, scroll spacing, and other explicitly governed property
families. Adding margin support does not add CSS property names to the Domain
Registry.

### 5.4 Required coverage annex

The normative
[Token Domain & CSS Binding Catalog](../specs/token-domain-and-css-binding-catalog.md)
defines:

- the complete v0.1 Domain list and constraints;
- direct, template, projector, and condition-only binding modes;
- physical and logical margin/padding coverage;
- common sizing, typography, border, paint, effect, layering, responsive, and
  motion bindings;
- required Semantic role families and Component Token examples;
- positive, negative, and coverage-report fixtures.

The annex may enumerate CSS properties for binding purposes, but the generated
CSS Property Registry remains the authority for whether a standard property is
authorable at all.

### 5.5 Coverage evidence and admission

The required v0.1 set covers the recurring decisions documented by mature UI
systems: color, gradient, spacing, sizing, type, shape, border/stroke, shadow
and blur, opacity, layer, breakpoints, aspect ratio, and motion timing. A new
Domain still requires all of:

1. a distinct design meaning not represented by an existing Domain;
2. a DTCG-standard value shape or an approved Axiom extension ADR;
3. at least one Semantic Token family;
4. a CSS binding, Condition use, Motion use, or public component contract;
5. positive and negative Domain fixtures.

CSS capabilities such as cursor, grid templates, transforms, and generated
content remain fully authorable raw CSS without becoming Token Domains merely
because another library offers a convenience token category.

### 5.6 Foundation scale and unit policy

The machine-readable
`spec/token/foundation-token-policy.json` owns the production scale profile.
The following rules are normative:

- the root type size is 16px and the minimum supported body style is 13px;
- the spacing scale uses a 4px base and registered multipliers only;
- spacing, general size, font size, radius, blur, and breakpoints use `rem`
  except for the required zero representation;
- border and stroke hairlines use `px`;
- DTCG 2025.10 source dimensions use only `px` or `rem`;
- `em` is a derived CSS output unit for component-relative or condition
  serialization and MUST NOT be authored as a DTCG dimension;
- color primitives are complete registered palette/shade coordinates;
- every palette exposes the registered `50–900` coordinates; absolute white and
  black are `color.primitive.common.white` and `.black`;
- explicit color values use canonical OKLCH components and an Axiom-required
  lowercase six-digit sRGB `hex` fallback;
- environmental `background`, contained `surface`, compact `fill`, text, icon,
  border, status, focus, backdrop, and selection roles are distinct Semantic
  Token responsibilities and have light/dark context values;
- typography includes heading h1 through h6, body, label, code, and display
  families; each registered family exposes regular, medium, semibold, and bold
  variants;
- registered foreground/background pairs pass their declared WCAG contrast
  threshold in every emitted context.

Scale coverage, units, typography variants, primitive naming, and resolved
contrast are checked by `pnpm tokens:check`. A source is not complete merely
because it parses as DTCG.

### 5.7 Semantic vocabulary registry

`spec/token/semantic-token-vocabulary.json` owns the canonical ordered scale,
color-role responsibilities, logical spacing family paths, permitted extended
sizes, and removed paths. The Foundation Policy pins that registry by ID, and
its content participates in the generated artifact source digest.

The core ordered Token scale is `xs`, `sm`, `md`, `lg`, and `xl`. `xxs` or
`xxl` requires a registry entry with a consumer rationale. The long forms
`xsmall`, `small`, `medium`, `large`, and `xlarge` are not scale positions. This
does not rename non-scale meanings such as the `medium` font-weight variant,
duration `normal`, or heading levels.

Logical spacing uses:

```text
space.semantic.control.padding.inline.<size>
space.semantic.control.padding.block.<size>
space.semantic.layout.stack.gap.<size>
space.semantic.layout.cluster.gap.<size>
space.semantic.layout.gutter.<size>
space.semantic.layout.section.<size>
```

The accepted clean-break stack introduces this authority before migrating the
production corpus. The registry and source migrations MUST merge in stack order
without publishing an intermediate release; no compatibility aliases are
added.

---

## 6. Alias Dependency Rules

Allowed tier dependencies in base sources:

```text
primitive → primitive or explicit value
semantic  → primitive or semantic or explicit value
component → semantic
```

Context overrides may use:

```text
semantic  → primitive or semantic or explicit value
component → semantic or component or explicit value
```

Forbidden:

```text
primitive → semantic
primitive → component
semantic  → component
component → primitive
component base → component
```

Every alias also requires compatible Axiom Domain and DTCG type. Composite-field
references follow DTCG rules and are validated after reference resolution.

The Domain/type identity rule applies to a whole-Token alias. A typed field
inside a DTCG composite may reference the compatible atomic Token Domain for
that field; for example, `border.semantic.control` may reference `color` and
`borderWidth` Primitive Tokens.

Cycles are errors regardless of tier.

---

## 7. Theme and Resolver Context

### 7.1 Context model

Theme is not a tier. It is a registered Resolver modifier.

```ts
type TokenContext = Readonly<Record<string, string>>;
```

v0.1 source contexts:

```text
theme=light
theme=dark
```

The manifest keeps a generic context record so future modifiers can be added
without changing its fundamental shape. No unimplemented modifier is admitted
to v0.1 sources.

Normalized context overrides use the following wrapper after DTCG parsing:

```ts
interface TokenContextOverrideDocument {
  schemaVersion: "0.1";
  context: TokenContext;
  tokens: readonly ParsedDTCGToken[];
}
```

### 7.2 Source application order

```text
1. Primitive base
2. Semantic base
3. Component base
4. Context Semantic overrides
5. Context Component overrides
6. Alias resolution
7. Domain constraint validation
8. Context completeness validation
```

An override cannot introduce a Token ID that has no base declaration.

### 7.3 Context invariants

A context may change:

```text
Token value
Alias target, if compatible
Deprecation message text only when source governance permits
```

A context cannot change:

```text
Token ID
Token tier
Axiom Domain
DTCG type
Component ownership
```

### 7.4 Completeness

Every emitted context contains a value for every public Semantic and Component
Token. Missing, cyclic, ambiguous, or context-dependent unresolved aliases are
errors.

---

## 8. Resolved Token Manifest

### 8.1 Manifest shape

```ts
interface ResolvedTokenManifest {
  schemaVersion: "0.2";
  profileVersion: string;
  sourceDigest: string;
  contexts: readonly ResolvedTokenContext[];
}

interface ResolvedTokenContext {
  context: Readonly<Record<string, string>>;
  tokens: readonly ResolvedTokenEntry[];
}

interface ResolvedTokenEntry {
  id: TokenId;
  tier: TokenTier;
  domain: TokenDomain;
  dtcgType: string;
  resolvedValue: unknown;
  source: TokenSourceLocation;
  dependencies: readonly TokenId[];
  description?: string;
  deprecated?: boolean | string;
}
```

The real normative shape is JSON Schema. The TypeScript interface is a reference
projection.

`dependencies` contains the entry's sorted direct Token references. Because
every referenced Token is also present in the same context, tooling can
reconstruct and inspect the complete dependency graph without retaining parser
objects or unresolved values.

### 8.2 Ordering

- contexts sort by registered modifier order and then modifier value;
- Tokens sort lexicographically by Token ID unless an explicit registry order is
  required for generated documentation;
- object key enumeration order never carries semantics;
- byte-stable JSON generation uses a canonical formatter.

### 8.3 Source locations

Diagnostics require source location without embedding parser-specific objects.

```ts
interface TokenSourceLocation {
  file: string;
  pointer: string;
}
```

---

## 9. Appearance Token Reference

An Appearance Token Reference is not a DTCG alias.

```ts
interface TokenReference {
  kind: "token";
  path: TokenId;
}
```

```text
DTCG alias
  Token value → Token value

Appearance reference
  CSS declaration value → Token ID
```

The reference remains unresolved in Appearance IR so the Web compiler can emit
stable CSS custom-property references and context artifacts.

---

## 10. Composite Token Projection

Some DTCG composites serialize to one CSS value. Others project to several CSS
declarations.

### 10.1 Direct CSS value serialization

| Domain | Typical CSS target | Behavior |
| --- | --- | --- |
| `shadow` | `box-shadow` | serialize one or more layers |
| `border` | border longhands or shorthand | prefer longhand projection in governed Recipes |
| `gradient` | background/image property | Token owns stops; declaration owns linear/radial geometry |

### 10.2 Multi-declaration projection

Typography uses an explicit application operation in authoring:

```ts
applyToken(
  token("typography.semantic.body.md"),
)
```

Normalization expands it deterministically:

```text
fontFamily     → font-family
fontSize       → font-size
fontWeight     → font-weight
letterSpacing  → letter-spacing
lineHeight     → line-height
```

The IR stores the expanded declarations and their Token-field origin. It does
not invent a non-standard `typography` CSS property.

### 10.3 Transition composite

DTCG `transition` contains duration, delay, and timing function but not the CSS
property being transitioned. Application therefore requires an explicit
property list:

```ts
applyTransitionToken({
  token:
    token(
      "transition.component.button.state",
    ),
  properties: [
    "background-color",
    "color",
    "transform",
  ],
})
```

Normalization emits:

```text
transition-property
transition-duration
transition-delay
transition-timing-function
```

### 10.4 Projector registry

```ts
interface CompositeTokenProjectorDescriptor {
  domain: TokenDomain;
  dtcgType: string;
  outputProperties: readonly string[];
  version: string;
}
```

Projector output MUST pass the same CSS Property Policy and declaration
validation as directly authored declarations.

---

## 11. Generated Token Types

Generated TypeScript types derive from the Domain Registry and Token Manifest.

```ts
interface TokenPathByDomain {
  color:
    | "color.semantic.fill.brand.default"
    | "color.component.button.root.background.default";
  space:
    | "space.semantic.control.padding.inline.md"
    | "space.component.button.root.padding.inline.md";
}
```

Generated code MUST include:

```text
AUTO-GENERATED
DO NOT EDIT
SOURCE DIGEST
GENERATOR VERSION
SCHEMA VERSION
```

Fix generators or normative sources rather than generated output.

---

## 12. Validation Phases

### T1 — DTCG conformance

```text
document syntax
group/token structure
all value shapes
references and composite references
deprecated/extensions syntax
```

### T2 — Axiom identity

```text
registered domain root
explicit registered tier
path grammar
unique Token ID
component and slot ownership format
```

### T3 — Domain semantics

```text
Domain ↔ DTCG type compatibility
Domain numeric/range constraints
alias Domain/type compatibility
tier dependency legality
registered palette and scale completeness
primitive naming and dimension-unit policy
typography family/weight coverage
resolved semantic color contrast
```

### T4 — Context composition

```text
registered context keys and values
override target exists
immutable metadata preserved
deterministic application order
```

### T5 — Resolution

```text
no cycles
no missing references
all public contexts complete
all composite fields resolved
```

### T6 — Manifest determinism

```text
stable ordering
stable serialization
source digest present
round-trip schema validation
```

---

## 13. Required Token Fixtures

### Positive

```text
all 13 DTCG 2025.10 type shapes parse
Primitive → Primitive alias
Semantic → Primitive alias
Component → Semantic alias
light/dark Semantic override
light/dark Component override
typography projection
border projection
transition projection with explicit property list
multi-shadow serialization
gradient stop serialization
stroke width serialization
blur template serialization
aspect ratio serialization
complete registered color palettes
4px spacing rhythm
h1-h6 and 13px+ typography with four weight variants
light/dark semantic contrast pairs
```

### Negative

```text
unknown Domain
implicit/missing tier
Domain/$type mismatch
Primitive → Semantic
Semantic → Component
Component → Primitive
alias cycle
context introduces new Token
context changes Domain/tier/type
incomplete context
invalid opacity range
invalid layer integer
invalid negative Primitive space
invalid negative size/radius/borderWidth/strokeWidth/blur/duration
invalid non-positive aspect ratio
invalid composite field reference
semantic usage name in Primitive tier
unregistered color shade or spacing step
unsupported Domain dimension unit
missing typography family/weight variant
semantic color contrast regression
```

### Coverage

Button, Select, and Dialog MUST collectively exercise Component Tokens from
color, space, size, radius, shadow, duration/easing or transition, opacity, and
layer domains. The cross-profile coverage fixture additionally proves physical
and logical margin, padding, and gap bindings; stroke width; blur; breakpoint;
and aspect ratio according to the normative binding annex.

---

## 14. Definition of Done

Token Foundation is ready for the CSS Appearance Profile only when:

- Domain and tier registries exist as normative JSON;
- source and manifest schemas exist;
- every required fixture passes;
- context output is byte-stable;
- generated path types compile;
- no CSS package is imported by Token packages;
- composite projector descriptors are versioned;
- all public Semantic and Component Tokens resolve in light and dark contexts.
- every Domain in the normative coverage annex has positive and negative value
  fixtures and at least one documented usage or explicit condition-only use.
- the Foundation Token Policy passes primitive naming, palette, spacing,
  typography, unit, and contrast validation.

---

## References

- [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [Design Tokens Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)
- [Axiom Token Domain & CSS Binding Catalog](../specs/token-domain-and-css-binding-catalog.md)
- [Toss Design System Colors](https://tossmini-docs.toss.im/tds-mobile/foundation/colors/)
- [Toss Design System Typography](https://tossmini-docs.toss.im/tds-react-native/foundation/typography/)
- [Apple Human Interface Guidelines — Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Vercel Geist — Colors](https://vercel.com/geist/colors)
- [Vercel Geist — Typography](https://vercel.com/geist/typography)
- [Linear Brand Guidelines](https://linear.app/brand)
- [Chakra UI Tokens](https://chakra-ui.com/docs/theming/tokens)
- [Carbon Design System Color and Tokens](https://carbondesignsystem.com/elements/color/overview/)
