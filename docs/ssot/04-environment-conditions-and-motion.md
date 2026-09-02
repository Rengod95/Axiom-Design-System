# Axiom Design System
## SSOT-04 — Environment Conditions & Motion
### Version 0.2.0

**Status:** NORMATIVE \
**Depends on:** SSOT-00 v0.3.1, SSOT-01 v0.4.0, SSOT-03 v0.2.1 \
**Scope:** Responsive/environment conditions and serializable Motion semantics

---

## 1. Purpose

This document makes Responsive Appearance and Motion first-class v0.1
capabilities without introducing arbitrary media-query, selector, callback, or
behavior languages.

It freezes:

- Condition Registry identity and value model;
- viewport, container, and user-preference conditions;
- condition use in Recipe/Appearance IR;
- condition compilation and precedence;
- Motion authoring, Motion IR, Token binding, lifecycle input, and backend
  contract;
- mandatory reduced-motion behavior;
- the boundary between Motion and Behavior Provider state machines.

---

## 2. Orthogonal Input Axes

```text
Variant
  design-controlled selection
  example: size=md

State
  behavior/provider observation
  example: pressed=true

Condition
  environment observation
  example: container.inline.md=true

Theme
  Token resolver context
  example: theme=dark

Lifecycle
  provider/runtime transition phase
  example: enter / exit
```

No axis is encoded as another. In particular:

- breakpoints are not variants;
- reduced motion is not a theme;
- open/pressed are not conditions;
- enter/exit is not an interaction state machine.

---

## 3. Condition Registry

### 3.1 Condition identity

```ts
type ConditionId = string;
```

v0.1 naming:

```text
viewport.width.sm
viewport.width.md
viewport.width.lg
viewport.width.belowSm
viewport.width.belowMd
viewport.width.belowLg
container.inline.compact
container.inline.regular
container.inline.wide
container.inline.belowCompact
container.inline.belowRegular
container.inline.belowWide
preference.reducedMotion
```

Condition IDs describe meaning. They do not embed raw `@media` or
`@container` text. `below*` definitions use `<`; their matching unprefixed
definitions use `>=`. This closed pair supports bounded responsive ranges and
deterministic contradiction detection without raw query authoring.

The machine-readable authorities are
`spec/condition/condition-registry.schema.json`,
`spec/condition/condition-expression.schema.json`, and
`spec/condition/condition-registry.json`.

### 3.2 Condition kinds

```ts
type EnvironmentConditionDefinition =
  | ViewportCondition
  | ContainerCondition
  | PreferenceCondition;
```

### 3.3 Viewport condition

```ts
interface ViewportCondition {
  id: ConditionId;
  kind: "viewport";
  feature: "width";
  comparison:
    | ">="
    | "<";
  value: TokenReference;
}
```

The Token MUST belong to the `breakpoint` Domain and resolve to a non-negative
dimension in every context. v0.1 uses width ranges because CSS media queries
expose viewport width rather than logical inline-size.

### 3.4 Container condition

```ts
interface ContainerCondition {
  id: ConditionId;
  kind: "container";
  container: string;
  feature: "inline-size";
  comparison:
    | ">="
    | "<";
  value: TokenReference;
}
```

Container names are registered. v0.1 registers the `component` identity and
maps it to CSS container name `axiom-component`. A Recipe cannot introduce
arbitrary container names. The binding/integration layer is responsible for
establishing the corresponding query container.

### 3.5 Preference condition

```ts
interface PreferenceCondition {
  id: "preference.reducedMotion";
  kind: "preference";
  feature: "prefers-reduced-motion";
  equals: "reduce";
}
```

Reduced motion is mandatory. Other media preferences require a future registry
addition and an accessibility review.

---

## 4. Breakpoint Tokens

Breakpoint thresholds are Tokens so design-system contexts can name and govern
them, but Theme MUST NOT change their values in v0.1.

```text
breakpoint.primitive.scale.48
breakpoint.semantic.viewport.md
breakpoint.primitive.scale.40
breakpoint.semantic.container.md
```

Component-specific thresholds require evidence and use Component Tokens. No
Component breakpoint Token is registered in the N15 baseline; a future path
must follow this pattern and pass the normal promotion policy:

```text
breakpoint.component.<recipe>.<slot>.<role>
```

Breakpoint Token values do not make conditions variant or theme axes. The
Condition Registry binds a named observation to a threshold Token.

---

## 5. Condition Expressions

### 5.1 v0.1 expression model

```ts
interface ConditionExpression {
  all: readonly ConditionClause[];
}

type ConditionClause =
  | ConditionId
  | {
      any: readonly ConditionId[];
    };
```

Meaning:

```text
all array       AND
any array       OR within one clause
```

Forbidden:

```text
NOT
arbitrary nesting
callback predicates
raw query strings
feature/value authoring outside registry
```

### 5.2 Contradiction validation

The registry generator and Recipe normalizer detect impossible conjunctions
when they can be proven from the same condition family.

Example:

```text
viewport.width.lg
AND
viewport.width.belowMd
```

is an error when the resolved `lg >= md` relationship makes the conjunction
impossible. The validator resolves threshold Tokens from every registered
context and rejects missing, non-breakpoint, negative, non-`rem`, or
theme-variant values before evaluating the expression.

---

## 6. Condition Rules in Recipe Authoring

```ts
defineRecipe({
  id: "dialog",
  conditions: [
    {
      when: {
        all: [
          "container.inline.wide",
        ],
      },
      variants: {
        presentation: "modal",
      },
      apply: {
        popup: {
          maxInlineSize:
            token(
              "size.component.dialog.popup.maxInline",
            ),
        },
      },
    },
    {
      when: {
        all: [
          "preference.reducedMotion",
        ],
      },
      apply: {
        popup: {
          transitionDuration:
            token(
              "duration.semantic.instant",
            ),
        },
      },
    },
  ],
});
```

Condition rules may additionally constrain variants and states. They cannot
define a new variant/state or execute a function.

---

## 7. Condition Rule IR

```ts
interface ConditionRuleIR {
  when: ConditionExpression;
  variants?: Readonly<
    Record<
      string,
      string | readonly string[]
    >
  >;
  states?: Readonly<
    Record<
      string,
      Readonly<
        Record<string, boolean | string>
      >
    >
  >;
  apply:
    readonly SlotDeclarationRecord[];
}
```

The rule stores Condition IDs, not compiled query text. The Web compiler resolves
IDs using the exact Condition Registry digest embedded in compilation input.

---

## 8. Condition Compilation

### 8.1 Viewport

```text
viewport.width.md
    ↓
@media (width >= <resolved breakpoint>)
```

### 8.2 Container

```text
container.inline.regular
    ↓
@container <registered-name> (inline-size >= <resolved breakpoint>)
```

### 8.3 Preference

```text
preference.reducedMotion
    ↓
@media (prefers-reduced-motion: reduce)
```

### 8.4 Static compilation requirement

Web appearance conditions compile to CSS conditional rules. The default Web
runtime does not evaluate viewport/container conditions with JavaScript.

This preserves SSR behavior and avoids duplicating the browser's query engine.
Non-Web profiles may declare a different condition capability in the future.

### 8.5 Precedence

Condition rules are the final v0.1 Recipe stage:

```text
Base → Variant → State → Compound → Condition
```

Within one condition block, serialized rule order is normative. Cross-condition
overlap emits a warning unless the relation and winner are proven and recorded.

---

## 9. Motion Domain Boundary

Motion is a parallel artifact associated with Recipe Slots.

```text
Appearance IR
  what CSS declarations apply

Motion IR
  how a Slot transitions between visual values over time

Behavior Provider
  when lifecycle/state observations occur
```

Motion IR may reference CSS properties and Tokens but does not own interaction
state transitions, focus management, DOM queries, or component mounting policy.

---

## 10. Motion Authoring

### 10.1 Basic example

```ts
defineMotion({
  id: "dialog.popup",
  profile: "axiom-css",
  slot: "popup",
  phases: {
    enter: {
      tracks: {
        opacity: [
          "0",
          "1",
        ],
        transform: [
          "translateY(8px) scale(0.96)",
          "translateY(0) scale(1)",
        ],
      },
      transition: {
        type: "spring",
        duration:
          token(
            "duration.component.dialog.popup.enter",
          ),
        bounce: 0.16,
      },
    },
    exit: {
      tracks: {
        opacity: [
          "1",
          "0",
        ],
        transform: [
          "translateY(0) scale(1)",
          "translateY(4px) scale(0.98)",
        ],
      },
      transition: {
        type: "tween",
        duration:
          token(
            "duration.component.dialog.popup.exit",
          ),
        easing:
          token(
            "easing.semantic.exit",
          ),
      },
    },
  },
  reducedMotion: {
    strategy: "replace",
    phases: {
      enter: {
        tracks: {
          opacity: ["0", "1"],
        },
        transition: {
          type: "tween",
          duration: token("duration.semantic.instant"),
          easing: token("easing.semantic.productive"),
        },
      },
      exit: {
        tracks: {
          opacity: ["1", "0"],
        },
        transition: {
          type: "tween",
          duration: token("duration.semantic.instant"),
          easing: token("easing.semantic.productive"),
        },
      },
    },
  },
});
```

### 10.2 v0.1 phases

```ts
type MotionPhase =
  | "enter"
  | "exit"
  | "stateChange";
```

`stateChange` requires an explicit canonical state and from/to case.

### 10.3 Keyframe authoring

```ts
type MotionKeyframesAuthoring =
  | readonly [MotionValue, MotionValue]
  | readonly MotionKeyframeAuthoring[];

interface MotionKeyframeAuthoring {
  offset: number;
  value: MotionValue;
}
```

Exactly two shorthand `MotionValue` entries normalize to offsets `0` and `1`.
Three or more keyframes MUST use the explicit form and contain at least three
finite, strictly ascending offsets with `0` and `1` endpoints. Mixed shorthand
and explicit forms are forbidden; there is no inferred interpolation policy.

### 10.4 v0.1 transitions

```ts
type MotionTransitionAuthoring =
  | {
      type: "tween";
      duration: TokenReference;
      delay?: TokenReference;
      easing: TokenReference;
    }
  | {
      type: "spring";
      duration?: TokenReference;
      bounce?: number;
      stiffness?: number;
      damping?: number;
      mass?: number;
    };
```

`bounce` is a finite literal in `[0,1]`; `stiffness`, `damping`, and `mass` are
finite literals greater than zero. Functions and backend-specific easing
objects are forbidden.

---

## 11. Motion IR

### 11.1 Root

```ts
interface MotionIR {
  schemaVersion: "0.1";
  profile: "axiom-css";
  profileInputDigest: string;
  conditionRegistryDigest: string;
  id: string;
  // Explicit lexical identity; never inferred from a dotted Motion id.
  recipeId: string;
  slot: string;
  phases: readonly MotionPhaseIR[];
  reducedMotion: ReducedMotionIR;
}
```

`conditionRegistryDigest` is computed from the exact Condition Registry passed
through `MotionCompilerInput`. The Motion compiler validates both the registry
identity and digest before it validates reduced-motion policy. It cannot infer
the registry from a Condition ID or read it from repository state.

`recipeId` is explicit lexical identity at N16. Recipe/Slot applicability is
not inferred or validated until the Recipe contract exists.

### 11.2 Phase

```ts
interface MotionPhaseIR {
  phase: MotionPhase;
  state?: {
    name: string;
    from: boolean | string;
    to: boolean | string;
  };
  sequence:
    readonly MotionSegmentIR[];
}
```

One segment contains parallel property tracks. Multiple segments execute in
serialized order.

For `stateChange`, the named Canonical State MUST have `axis: "state"` and
include `motion` in its registered usage. Recipe/Slot applicability remains a
later Recipe-contract check.

### 11.3 Segment and track

```ts
interface MotionSegmentIR {
  at:
    | {
        kind: "afterPrevious";
      }
    | {
        kind: "absolute";
        seconds: number;
      }
    | {
        kind: "overlapPrevious";
        seconds: number;
      };
  tracks: readonly MotionTrackIR[];
  transition: MotionTransitionIR;
}

interface MotionTrackIR {
  property: CSSPropertyName;
  allowDiscrete: boolean;
  keyframes: readonly MotionKeyframeIR[];
}

interface MotionKeyframeIR {
  offset: number;
  value:
    | CSSLiteral
    | TokenReference
    | CSSValueTemplate;
}
```

Offsets are finite numbers in [0,1], sorted ascending, and include 0 and 1 after
normalization. `allowDiscrete: true` preserves the authoring opt-in required
for a discrete property; it is required even when the property is interpolable.
Every segment, including every `reducedMotion.strategy: "replace"` segment,
MUST declare its own transition. Replacement phases never inherit a normal
phase or segment transition.

### 11.4 Reduced motion

```ts
type ReducedMotionIR =
  | {
      strategy: "disable";
    }
  | {
      strategy: "replace";
      phases:
        readonly MotionPhaseIR[];
    };
```

Every Motion IR MUST define a reduced-motion strategy. Omitting it is a schema
error.

The field name `reducedMotion` owns policy, not environment identity or
lifecycle state. The three canonical names are intentionally distinct:

| Name | Owner | Meaning |
| --- | --- | --- |
| `preference.reducedMotion` | Condition Registry | browser/user environment preference |
| `reducedMotion` | Motion authoring and IR | required `disable` or `replace` strategy |
| `motionSuppressed` | Canonical State Registry | normal Motion execution was suppressed after policy selection |

These names MUST NOT be treated as aliases. Runtime bindings observe the
registered preference, select the IR strategy, and then project
`motionSuppressed`. A replacement animation still sets `motionSuppressed`
because the normal motion path was suppressed.

---

## 12. Motion Property and Value Validation

Every track passes through the CSS Appearance Profile.

```text
property exists
property is not blocked
keyframe value matches CSS grammar
Token Domain binding is configured where Token is used
property motion capability is known
backend declares support
```

Policy:

- `not-animatable` is an error;
- `discrete` requires explicit `allowDiscrete: true` authoring and a warning;
- `unknown` requires backend validation and a warning;
- `interpolable` proceeds.

Motion library shorthands such as `x` or `y` are not canonical properties.
Authors use standard CSS properties/values; backend adapters translate when
needed.

---

## 13. Motion Token Resolution

Duration and easing references remain Token IDs in Motion IR. The runtime
artifact generator resolves them to compact context-aware tables or CSS custom
properties before browser execution.

The browser MUST NOT ship the general DTCG resolver.

DTCG `transition` composites may supply duration, delay, and timing function
for tween segments, but spring physics remains Axiom Motion data.

---

## 14. Motion Backend Contract

```ts
interface MotionBackend {
  descriptor: MotionBackendDescriptor;
  validate(
    motion: MotionIR,
    context: MotionCompileContext,
  ): readonly Diagnostic[];
  compile(
    motion: MotionIR,
    context: MotionCompileContext,
  ): Promise<readonly GeneratedArtifact[]>;
}
```

```ts
interface MotionBackendDescriptor {
  id: string;
  version: string;
  runtime: "browser";
  capabilities: {
    transitions:
      readonly ("tween" | "spring")[];
    phases:
      readonly MotionPhase[];
    properties:
      "css-profile";
    sequences: boolean;
    reducedMotion: boolean;
  };
}
```

The first v0.1 backend uses `motion`. Backend public types, selectors, event
callbacks, and imperative controls are not exposed through Motion IR.

---

## 15. Behavior and Lifecycle Input

Provider bindings map provider lifecycle observations to:

```ts
interface CanonicalMotionLifecycle {
  entering: boolean;
  exiting: boolean;
  motionSuppressed: boolean;
}
```

The mapping is component-local. `motionSuppressed` is a derived lifecycle
observation, not a copy of the `preference.reducedMotion` Condition ID. A
universal provider adapter is forbidden.

The binding owns mount/unmount coordination required for exit animation. Motion
IR does not create or retain DOM nodes by itself.

---

## 16. Runtime and SSR

- condition CSS is generated at build time;
- Motion runtime code is imported only by components with Motion artifacts;
- initial server markup cannot depend on browser-only media-query evaluation;
- reduced-motion CSS fallback is emitted even when the runtime backend also
  checks preference;
- hydration must not change semantic component state;
- Motion failure must leave content visible and operable.

---

## 17. Diagnostics

```text
AXC1001  unknown Condition ID
AXC1002  invalid breakpoint Token Domain
AXC1003  unregistered container
AXC1004  contradictory condition expression
AXC1005  raw query string forbidden
AXC1101  overlapping condition winner unclear

AXM1001  unknown Motion property
AXM1002  property not animatable
AXM1003  discrete animation requires opt-in
AXM1004  keyframe grammar mismatch
AXM1005  invalid keyframe offset
AXM1006  unsupported backend transition
AXM1007  reduced-motion strategy missing
AXM1008  Token Domain mismatch
AXM1009  provider lifecycle capability missing
AXM1010  Motion profile identity mismatch
AXM1011  Condition Registry digest mismatch
AXM1012  Motion property requires backend capability validation
AXM1013  unknown Motion state
AXM1014  invalid Motion state value
AXM1015  discrete Motion opt-in accepted (warning)
AXM1016  Motion keyframe value kind is not permitted
AXM1017  Motion keyframe Token binding is not permitted
```

---

## 18. Conformance Fixtures

### Conditions

```text
viewport min-width compilation
container inline-size compilation
reduced-motion compilation
AND expression
simple OR expression
variant/state constrained condition
unknown ID negative
wrong breakpoint Domain negative
contradiction negative
raw query negative
condition precedence golden CSS
```

### Motion

```text
Dialog popup enter/exit
Dialog backdrop tween
Button pressed stateChange
tween duration/easing Tokens
spring configuration
two-segment sequence
direct Token keyframe
CSS template keyframe
reduced-motion replacement
reduced-motion disable
reduced-motion replacement transition is explicit (no inheritance)
unknown property negative
non-empty invalid keyframe grammar negative
illegal Token binding negative
invalid IR transition-kind negative
JSON round trip
```

The invalid IR transition-kind fixture proves only the closed Motion IR
discriminant. Backend transition support remains AXM1006 work for N31; provider
lifecycle capability remains AXM1009 work for N33.

The generated profile currently exposes neither a discrete nor a not-animatable
Motion property. Their policy branches are therefore covered by injected-profile
validator tests rather than a registered profile fixture.

### Runtime

```text
SSR markup stable
enter lifecycle starts once
exit lifecycle completes before unmount
rapid open/close cancellation remains consistent
reduced-motion path avoids transform motion
backend load failure preserves operability
```

---

## 19. Definition of Done

Environment and Motion reach their release gates only when:

- Condition Registry and Motion IR schemas exist;
- every condition compiles from an ID, never raw query text;
- breakpoints use registered Tokens;
- condition precedence is represented in Appearance IR and generated CSS;
- Motion tracks use CSS Profile properties and values;
- every Motion artifact has a reduced-motion strategy;
- the first Motion backend passes backend-independent fixtures;
- Dialog demonstrates enter/exit and container-responsive appearance;
- Button demonstrates state-change Motion;
- no Motion package is imported by Token or Appearance normalization packages.

---

## References

- [CSS Containment Module Level 3](https://www.w3.org/TR/css-contain-3/)
- [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/)
- [Motion animate API](https://motion.dev/docs/animate)
- [Motion transitions](https://motion.dev/docs/react-transitions)
