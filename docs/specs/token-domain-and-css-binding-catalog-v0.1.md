# Axiom Token Domain & CSS Binding Catalog v0.1

**Status:** NORMATIVE ANNEX \
**Depends on:** SSOT-01 v0.3, SSOT-03 v0.2 \
**Purpose:** required Token Domain coverage and common Web property bindings

---

## 1. Reading Rule

This catalog is not a CSS property allowlist.

```text
Generated CSS Property Registry
  answers: may this standard CSS property be authored?

Token Domain Registry
  answers: what design meaning and value constraints does this Token have?

CSS Token Binding Catalog
  answers: may this Token Domain be used directly, in a template, or through a
           projector for this CSS property?
```

A standard property absent from this catalog is still authorable with valid raw
CSS according to SSOT-03. It merely has no governed Token binding until policy
adds one.

Wildcard property families in this document are authoring shorthand. The
generated effective registry expands them to exact property IDs from the pinned
Webref snapshot. A wildcard never reaches normalized IR.

---

## 2. Industry Coverage Evidence

The v0.1 Domain set is based on three kinds of evidence.

### 2.1 DTCG interoperability

DTCG 2025.10 supplies the normative value shapes used by Axiom: atomic values
such as color, dimension, number, duration, cubic Bézier, font family, font
weight, and stroke style; and composite values such as border, transition,
shadow, gradient, and typography.

### 2.2 Mature design-system coverage

- Chakra documents colors, gradients, sizes, spacing, fonts, font sizes, font
  weights, letter spacing, line heights, radii, borders, border widths, shadows,
  easings, opacity, z-index, durations, animations, and aspect ratios. Its
  spacing guidance explicitly includes margin, padding, gap, and positional
  offsets.
- Carbon distinguishes globally reusable core tokens from component tokens and
  documents theme-stable roles plus component/state-specific tokens.
- Material Design documents Token families for color, typography, shape,
  elevation, and motion.

Axiom does not copy any vendor's names or values. These systems provide evidence
that the underlying design decisions recur across real component libraries.

### 2.3 Axiom architecture requirements

Button, Select, and Dialog require spacing, sizing, typography, focus stroke,
overlay layering, elevation, responsive thresholds, state opacity, and motion.
Domains without a fixture or common-system precedent are not added merely for
completeness.

---

## 3. Required Domain Registry

| Domain | DTCG type | Constraint | Direct purpose |
| --- | --- | --- | --- |
| `color` | `color` | valid DTCG color | foreground, surface, border, icon, focus, status paint |
| `gradient` | `gradient` | valid ordered stops | reusable gradient stops/colors |
| `space` | `dimension` | primitive scale non-negative | margin, padding, gap, positional and scroll spacing |
| `size` | `dimension` | non-negative | control, icon, touch target, field, content, overlay dimensions |
| `radius` | `dimension` | non-negative | physical and logical corner radius |
| `borderWidth` | `dimension` | non-negative | border, outline, separator thickness |
| `strokeWidth` | `dimension` | non-negative | SVG and text-decoration stroke thickness |
| `fontFamily` | `fontFamily` | non-empty stack | text font stack |
| `fontSize` | `dimension` | positive | text size |
| `fontWeight` | `fontWeight` | DTCG-valid | text weight |
| `lineHeight` | `number` | positive | unitless text leading |
| `letterSpacing` | `dimension` | negative permitted | tracking |
| `typography` | `typography` | complete registered projector | coordinated text style |
| `strokeStyle` | `strokeStyle` | DTCG-valid | border/outline/SVG stroke pattern |
| `border` | `border` | compatible child fields | coordinated width/style/color |
| `shadow` | `shadow` | valid one-or-many layers | elevation and focus/overlay shadow |
| `blur` | `dimension` | non-negative | filter/backdrop blur amount |
| `opacity` | `number` | closed interval `[0,1]` | element and paint opacity |
| `duration` | `duration` | non-negative | transition/animation/Motion time |
| `easing` | `cubicBezier` | DTCG-valid tuple | transition/animation/Motion timing |
| `transition` | `transition` | valid duration/delay/timing | coordinated transition timing |
| `layer` | `number` | integer | z-axis stacking level |
| `breakpoint` | `dimension` | non-negative, common unit policy | viewport/container threshold |
| `aspectRatio` | `number` | positive | common media/control aspect ratio |

`blur`, `strokeWidth`, and `aspectRatio` use existing DTCG atomic value shapes;
they do not invent new DTCG `$type` values.

---

## 4. Binding Modes

```ts
type TokenBindingMode =
  | "direct"
  | "template"
  | "projector"
  | "condition-only";
```

### Direct

The serialized Token value can satisfy the entire CSS property grammar.

```ts
backgroundColor:
  token("color.semantic.surface.default")
```

### Template

The Token supplies one typed segment of a larger CSS value.

```ts
boxShadow: css`
  0 ${token("space.semantic.elevation.offset.sm")}
  ${token("blur.semantic.elevation.soft")}
  ${token("color.semantic.shadow.default")}
`
```

### Projector

A composite Token expands into one or more validated declarations.

```ts
applyToken(
  token("typography.semantic.body.md"),
)
```

### Condition-only

The Token configures Condition compilation and cannot appear as a declaration
value.

```ts
when: {
  viewport: {
    min: token("breakpoint.semantic.viewport.md"),
  },
}
```

---

## 5. Color and Paint Bindings

### 5.1 `color` — direct

Required common property coverage:

```text
color
background-color

border-color
border-top-color
border-right-color
border-bottom-color
border-left-color
border-block-color
border-block-start-color
border-block-end-color
border-inline-color
border-inline-start-color
border-inline-end-color

outline-color
column-rule-color
text-decoration-color
text-emphasis-color
caret-color
accent-color

fill
stroke
stop-color
flood-color
lighting-color
```

Additional governed templates:

```text
scrollbar-color       color + color
box-shadow            shadow fields or color segment
text-shadow           compatible shadow fields or color segment
filter                drop-shadow color segment
background            color/gradient segment
border*               border/color segment
outline               border/color segment
```

System Recipes default paint properties to Token-required unless a property
policy documents a raw CSS exception. Consumer/application authoring may use raw
CSS according to its trust profile.

### 5.2 `gradient`

Direct or projector targets:

```text
background-image
border-image-source
mask-image
```

Template targets may include `background` and `mask`. Geometry that is not part
of the DTCG gradient value remains explicit Recipe data. Resource-bearing image
fallbacks follow SSOT-03 security policy.

---

## 6. Layout Distance Bindings

### 6.1 `space` — margin

All physical and logical margin properties are required Token bindings:

```text
margin
margin-top
margin-right
margin-bottom
margin-left

margin-block
margin-block-start
margin-block-end
margin-inline
margin-inline-start
margin-inline-end
```

Authoring examples:

```ts
base: {
  root: {
    marginBlockEnd:
      token("space.semantic.stack.md"),
    marginInline:
      token("space.semantic.layout.gutter"),
  },
}
```

Raw `auto`, percentage, and calculated margins remain valid. Negative spacing
does not require duplicate negative Primitive Tokens. The authoring helper:

```ts
negateToken(
  token("space.semantic.overlap.sm"),
)
```

normalizes to a validated template equivalent to
`calc(0px - var(--generated-token))`. It is permitted only where the effective
property policy sets `allowsTokenNegation: true`; margin and inset families do,
padding and gap families do not.

### 6.2 `space` — padding

```text
padding
padding-top
padding-right
padding-bottom
padding-left

padding-block
padding-block-start
padding-block-end
padding-inline
padding-inline-start
padding-inline-end
```

Padding accepts non-negative `space` Tokens. Raw percentages and calculations
remain available because percentage padding has layout semantics that a global
spacing scale cannot replace.

### 6.3 `space` — gaps

```text
gap
row-gap
column-gap
```

Gap properties accept non-negative `space` Tokens and raw `normal`, percentage,
and calculated values.

### 6.4 `space` — position and inset

```text
top
right
bottom
left

inset
inset-block
inset-block-start
inset-block-end
inset-inline
inset-inline-start
inset-inline-end
```

These bindings allow design-system offsets for badges, indicators, anchored
parts, and overlay geometry. Raw `auto`, percentage, anchor-positioning syntax,
and calculations remain allowed. Token negation is allowed.

### 6.5 `space` — scrolling and ancillary spacing

```text
scroll-margin
scroll-margin-top
scroll-margin-right
scroll-margin-bottom
scroll-margin-left
scroll-margin-block
scroll-margin-block-start
scroll-margin-block-end
scroll-margin-inline
scroll-margin-inline-start
scroll-margin-inline-end

scroll-padding
scroll-padding-top
scroll-padding-right
scroll-padding-bottom
scroll-padding-left
scroll-padding-block
scroll-padding-block-start
scroll-padding-block-end
scroll-padding-inline
scroll-padding-inline-start
scroll-padding-inline-end

outline-offset
text-indent
border-spacing       template permits one or two space Tokens
```

`space` does not mean every CSS `<length>` is interchangeable. The effective
Binding Catalog explicitly controls the families above.

---

## 7. Sizing Bindings

### 7.1 `size` — direct

```text
width
height
min-width
min-height
max-width
max-height

inline-size
block-size
min-inline-size
min-block-size
max-inline-size
max-block-size

flex-basis
column-width
perspective
```

Common semantic paths:

```text
size.semantic.control.height.sm
size.semantic.control.height.md
size.semantic.touchTarget.minimum
size.semantic.icon.sm
size.semantic.icon.md
size.semantic.field.inline.md
size.semantic.content.readable
size.semantic.overlay.dialog.maxInline
```

### 7.2 `size` — track/template

The following properties accept `size` in a CSS template but usually need more
structure than a single Token:

```text
grid-template-columns
grid-template-rows
grid-auto-columns
grid-auto-rows
contain-intrinsic-size
contain-intrinsic-inline-size
contain-intrinsic-block-size
```

Raw intrinsic keywords, percentages, viewport/container units, `minmax()`,
`fit-content()`, and `calc()` remain required CSS capabilities.

---

## 8. Shape, Border, and Stroke Bindings

### 8.1 `radius`

```text
border-radius
border-top-left-radius
border-top-right-radius
border-bottom-right-radius
border-bottom-left-radius

border-start-start-radius
border-start-end-radius
border-end-start-radius
border-end-end-radius
```

Percentage and elliptical two-value radii may be raw CSS or templates. A single
`radius` Token is a direct value.

### 8.2 `borderWidth`

```text
border-width
border-top-width
border-right-width
border-bottom-width
border-left-width
border-block-width
border-block-start-width
border-block-end-width
border-inline-width
border-inline-start-width
border-inline-end-width
outline-width
column-rule-width
```

### 8.3 `strokeWidth`

```text
stroke-width
text-decoration-thickness
```

`strokeWidth` is kept separate from `borderWidth` because iconography and text
decoration scales can evolve independently from control borders.

### 8.4 `strokeStyle`

```text
border-style
border-top-style
border-right-style
border-bottom-style
border-left-style
border-block-style
border-block-start-style
border-block-end-style
border-inline-style
border-inline-start-style
border-inline-end-style
outline-style
column-rule-style
stroke-dasharray       when the DTCG serializer proves compatibility
stroke-linecap         when the DTCG serializer proves compatibility
```

### 8.5 `border` composite projector

The projector emits ordered width/style/color longhands for:

```text
border
border-top
border-right
border-bottom
border-left
border-block
border-block-start
border-block-end
border-inline
border-inline-start
border-inline-end
outline
```

It never hides shorthand/reset behavior from the collision analyzer.

---

## 9. Typography Bindings

### 9.1 Atomic domains

```text
fontFamily       → font-family
fontSize         → font-size
fontWeight       → font-weight
lineHeight       → line-height
letterSpacing    → letter-spacing
```

Template use is allowed where the property grammar genuinely combines values,
for example the `font` shorthand, but governed Recipes prefer the longhands.

### 9.2 Typography projector

`typography` expands to:

```text
font-family
font-size
font-weight
letter-spacing
line-height
```

Optional DTCG typography fields are emitted only when present and supported by
the pinned Token profile. Projected declarations retain the composite Token ID
and field origin.

Typography Tokens do not own text color, margins, text transforms, truncation,
or wrapping behavior. Those are separate design decisions.

---

## 10. Effect and Layer Bindings

### 10.1 `shadow`

```text
box-shadow       direct composite serialization
text-shadow      only through a compatible no-spread projector
filter           drop-shadow template/projector when compatible
```

Semantic paths distinguish elevation from other effects:

```text
shadow.semantic.elevation.raised
shadow.semantic.elevation.overlay
shadow.semantic.focus.default
shadow.component.dialog.popup
```

### 10.2 `blur`

`blur` is a template-only Domain:

```text
filter
backdrop-filter
```

Example:

```ts
backdropFilter: css`
  blur(${token("blur.semantic.overlay.backdrop")})
`
```

### 10.3 `opacity`

```text
opacity
fill-opacity
stroke-opacity
stop-opacity
flood-opacity
```

Opacity Tokens remain numbers in `[0,1]`; percentage authoring is raw CSS.

### 10.4 `layer`

```text
z-index
```

Layer tokens express named stacking roles, not arbitrary monotonically growing
numbers:

```text
layer.semantic.base
layer.semantic.sticky
layer.semantic.dropdown
layer.semantic.overlay
layer.semantic.modal
layer.semantic.toast
```

### 10.5 `aspectRatio`

```text
aspect-ratio
```

The value is a positive number. Raw CSS remains available for explicit
`width / height` syntax or `auto` combinations.

---

## 11. Motion Bindings

### 11.1 `duration`

```text
transition-duration
transition-delay
animation-duration
animation-delay
```

### 11.2 `easing`

```text
transition-timing-function
animation-timing-function
```

### 11.3 `transition` projector

A DTCG transition Token supplies duration, delay, and timing function. The
Recipe or Motion definition must separately name the animated CSS properties.
The projector emits:

```text
transition-property
transition-duration
transition-delay
transition-timing-function
```

### 11.4 Motion IR

Motion spring parameters, keyframes, sequencing, direction, iteration, and
fill behavior belong to SSOT-04 Motion IR rather than inventing non-DTCG Token
Domains. `duration` and `easing` Tokens may be referenced by Motion IR.

---

## 12. Responsive Binding

`breakpoint` is condition-only. It can configure:

```text
viewport min-width
viewport max-width
named container min inline-size
named container max inline-size
```

It cannot be used as an arbitrary Recipe declaration value simply because both
breakpoint and size serialize as dimensions. This is the reason Domain is
separate from DTCG `$type`.

---

## 13. Domains Deliberately Not Added

| Candidate | v0.1 treatment | Reason |
| --- | --- | --- |
| `animation` | Motion IR or raw CSS | no standard DTCG animation composite; avoids backend leakage |
| `spring` | Motion IR | backend-independent spring schema belongs to Motion |
| `asset` | trusted raw CSS resource manifest | DTCG 2025.10 has no standard asset type |
| `cursor` | raw CSS enum | generally structural/behavioral, not a theme design value |
| `transform` | raw CSS or Motion track | composite syntax and runtime interpolation matter more than a named value |
| `gridTemplate` | raw CSS/template | layout structure should not become a global design Token by default |
| `content` | raw CSS with security policy | localization and generated-content risks |
| `animationName` | Motion/CSS artifact identity | generated artifact, not a design value |

These remain fully authorable CSS properties where standard. “No Token Domain”
does not mean “unsupported CSS.”

---

## 14. Tier Coverage Requirements

### Primitive

Required reusable scales or palettes:

```text
color
space
size
radius
borderWidth
strokeWidth
fontFamily
fontSize
fontWeight
lineHeight
letterSpacing
shadow
blur
opacity
duration
easing
layer
breakpoint
aspectRatio
```

Composite Tokens may be composed from compatible atomic Tokens rather than
requiring an unrelated primitive scale.

### Semantic

At minimum, fixtures establish roles for:

```text
surface / text / icon / border / focus / action / status colors
inline / block / stack / cluster / layout spacing
control / icon / touch-target / field / content / overlay sizes
control / container / overlay radii
separator / control / focus widths
body / label / heading / code typography
raised / overlay / focus shadows
disabled / backdrop opacity
fast / normal / slow durations and productive/expressive easings
base / sticky / dropdown / overlay / modal / toast layers
viewport and container breakpoints
```

### Component

Button, Select, and Dialog publish only evidence-backed customization contracts.
Representative required paths:

```text
color.component.button.root.background.default
color.component.button.root.background.hovered
space.component.button.root.padding.inline.md
space.component.select.item.padding.block.md
size.component.select.trigger.block.md
radius.component.select.popup
borderWidth.component.button.root.focus
shadow.component.dialog.popup
opacity.component.dialog.backdrop
duration.component.dialog.popup.enter
layer.component.dialog.popup
```

Component Token paths use property roles for clarity, but the Token Domain—not
the path word—determines value compatibility.

---

## 15. Binding Policy Shape

The effective CSS property policy represents direct and template domains
separately.

```ts
interface EffectiveTokenBindingPolicy {
  directDomains: readonly TokenDomain[];
  templateDomains: readonly TokenDomain[];
  projectors: readonly string[];
  allowsTokenNegation: boolean;
}
```

Examples:

```json
{
  "property": "margin-inline-start",
  "tokenBindings": {
    "directDomains": ["space"],
    "templateDomains": ["space"],
    "projectors": [],
    "allowsTokenNegation": true
  }
}
```

```json
{
  "property": "box-shadow",
  "tokenBindings": {
    "directDomains": ["shadow"],
    "templateDomains": ["space", "blur", "color"],
    "projectors": ["shadow.css.box-shadow.v1"],
    "allowsTokenNegation": false
  }
}
```

---

## 16. Required Conformance Matrix

### Positive

```text
every physical/logical margin property + space
every physical/logical padding property + space
gap families + space
inset families + space and negateToken(space)
width/height/logical/min/max + size
all corner properties + radius
border/outline widths + borderWidth
stroke-width + strokeWidth
atomic typography bindings
typography projector
border projector
box-shadow + shadow
filter template + blur
paint properties + color
opacity paint families + opacity
z-index + layer
aspect-ratio + aspectRatio
motion timing properties + duration/easing
breakpoint usable in Condition and rejected as declaration
```

### Negative

```text
padding + negative/negated space
margin + size
width + space
background-color + gradient
z-index + number Token from an unrelated Domain
font-size + size
filter direct + blur
breakpoint direct CSS declaration
stroke-width + borderWidth when policy requires strokeWidth
unknown projector
template Token Domain absent from templateDomains
```

### Coverage reports

Generation emits:

```text
Domain → direct CSS properties
Domain → template CSS properties
Domain → projectors
CSS property → effective Token binding policy
Token ID → Recipe/Slot/property usage
public Component Token → documentation and fixture usage
```

The release fails if a required family member from the pinned Webref snapshot
is unintentionally missing from the expanded policy.

---

## References

- [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [Chakra UI Tokens](https://chakra-ui.com/docs/theming/tokens)
- [Carbon Design System Color and Tokens](https://carbondesignsystem.com/elements/color/overview/)
- [Material Design 3 Design Tokens](https://m3.material.io/foundations/design-tokens)
- [W3C Webref](https://github.com/w3c/webref)
