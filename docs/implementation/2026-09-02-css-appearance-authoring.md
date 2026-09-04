# N20 CSS Appearance Authoring

Status: **COMPLETE — CSS-aware structural authoring boundary**.

`@axiom/appearance-authoring` configures the N19 renderer-neutral Recipe Kernel
with caller-provided effective Property, Canonical State, and Condition
registries. It has only downward workspace dependencies on
`@axiom/recipe-kernel`, `@axiom/css-property-profile`, and the N18 generated
`@axiom/motion-schema` and `@axiom/condition-registry` contracts. It reads no
repository fixture, compiler, provider, React, or Token-resolution state.

The public `createCSSRecipeAuthoring(input)` factory returns the author-facing
`defineRecipe` port. Ordinary Slot styles use generated camelCase property keys;
the intentional same-stage ordering escape is an array of canonical kebab-case
`{ property, value }` declarations. N19 retains either JSON-safe fragment as
opaque structural data. The N20 package validates property identity, naming
mode, effective-policy value-kind permission, raw CSS grammar through the
public `CSSGrammarValidator`, schema-shaped CSS/Token/template helper values,
canonical State applicability/value shape, and registered Condition membership.
`negateToken(token(...))` preserves a closed authoring-only negated-token form;
N20 deliberately does not make the eventual binding permission decision.

The returned value remains the frozen Kernel definition and structural snapshot.
It is not Appearance IR and contains no profile digest, normalized declaration
origin, class output, CSS output, collision trace, compiler data, or provider
data. N22 owns declaration normalization, stage/collision analysis, provenance
materialization, digests, and Appearance IR. N21 is the first permitted phase
to validate Token existence, Domain, direct/template/projector binding,
negation, serializer, and composite expansion; N20 deliberately does not call
the public Token-binding validator.

Stable N20 diagnostics `AXA1001` through `AXA1007` are registered in SSOT-03
for naming, State, Condition, value-kind, and declaration-value errors. Raw CSS
profile diagnostics retain their existing AXP code meanings and receive Recipe,
Slot, stage, source, and policy-provenance context where available. Structural
prototype/accessor/function/symbol/Map/Set/cycle rejection stays in the N19
Kernel boundary.

The mandatory workspace boundary policy lists this package's exact four
renderer-independent workspace dependencies. The root TypeScript project and
`recipe:type-check` gate include the package's
dedicated no-emit type fixtures. The focused runtime test proves valid CSS
capture without Appearance output, the explicit template Token requirement,
and stable CSS/profile/State/Condition diagnostics. The type fixture proves
generated property-key and Slot-style boundaries.
