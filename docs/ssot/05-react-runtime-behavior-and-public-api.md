# Axiom Design System
## SSOT-05 — React Runtime, Behavior Provider & Public API
### Version 0.2.1

**Status:** NORMATIVE \
**Depends on:** SSOT-00 v0.3, SSOT-03 v0.2, SSOT-04 \
**Decision basis:** [ADR-0002](../adr/0002-react-aria-behavioral-criteria-source.md) \
**Scope:** Canonical runtime state, React Aria projection, generated evaluator binding, and v0.1 public component API

---

## 1. Purpose

This document freezes the runtime boundary that turns generated Appearance and
Motion artifacts into accessible React components.

It defines:

- canonical state and lifecycle vocabulary;
- React Aria as the versioned v0.1 Behavioral Criteria Source and primary
  provider;
- machine-readable per-component Behavior Criteria Profiles;
- per-component provider projection contracts;
- generated evaluator input/output;
- Axiom-owned React public API rules;
- runtime class/style override boundaries;
- SSR, accessibility, and provider-leakage conformance.

Axiom does not implement an interaction engine or accessibility state machine.

---

## 2. Runtime Dependency Direction

```text
Generated CSS / evaluator / Motion manifest
                 ↓
        Axiom React binding
                 ↑
Behavior Criteria Profile
                 ↑
React Aria behavior and lifecycle
                 ↓
              DOM
```

Forbidden:

```text
Token Foundation → React
CSS Property Profile → React Aria
Recipe IR → provider-specific state name
Public Axiom props → extends React Aria props wholesale
```

---

## 3. Canonical State Registry

The machine-readable authority is
`spec/state/canonical-state-registry.json`, validated by
`spec/state/canonical-state-registry.schema.json`. Each entry records its
State/Lifecycle axis, boolean or enum value shape, applicable component
contracts, and Appearance/Motion usage evidence. Provider spellings remain in
later component projection contracts rather than this registry.

### 3.1 Boolean state

```text
disabled
hovered
pressed
focused
focusVisible
selected
open
expanded
checked
indeterminate
invalid
readOnly
pending
required
```

### 3.2 Enum state

```text
orientation
  horizontal | vertical
```

New canonical state requires:

- at least one component contract;
- semantics independent of one provider's spelling;
- Appearance or Motion usage evidence;
- state registry schema and negative fixtures;
- provider mapping tests.

### 3.3 Lifecycle state

```text
entering
exiting
motionSuppressed
```

Lifecycle state feeds Motion bindings. It does not become a Recipe behavior
variant unless an explicit Appearance state rule exists.

---

## 4. Behavioral Criteria Source

React Aria Components is the v0.1 primary provider because it supplies:

- accessible component behavior;
- normalized press/hover/focus semantics;
- render-prop state used by Axiom projections;
- collection, selection, form, and overlay primitives needed by Button, Select,
  and Dialog;
- lifecycle state for overlay animation.

Base UI remains a future provider conformance candidate, not a v0.1 dependency.

Provider independence means Core schemas and Recipe vocabulary do not import
React Aria. It does not require implementing two providers before v0.1.

### 4.1 Source manifest

Behavior criteria never follow a floating dependency range. The build records
the exact lockfile-resolved provider packages and every official evidence page
used by a criteria profile.

```ts
interface BehaviorCriteriaSourceManifest {
  schemaVersion: "0.1";
  provider: "react-aria";
  packages: readonly {
    name: string;
    version: string;
    integrity: string;
  }[];
  evidence: readonly {
    id: string;
    url: string;
    digest: string;
  }[];
  manifestDigest: string;
}
```

The current baseline resolves:

```text
react-aria-components  1.20.0
react-aria             3.51.0
react-stately          3.49.0
```

Implementation reads actual lockfile data; these prose values do not override
the generated manifest.

### 4.2 Criteria profile

```ts
type BehaviorCriterionCategory =
  | "semantics"
  | "keyboard"
  | "pointer"
  | "touch"
  | "focus"
  | "state"
  | "selection"
  | "collection"
  | "form"
  | "validation"
  | "overlay"
  | "lifecycle";

interface ComponentBehaviorCriteriaProfile {
  schemaVersion: "0.1";
  id: string;
  component: string;
  sourceManifestDigest: string;
  criteria:
    readonly BehaviorCriterion[];
}

interface BehaviorCriterion {
  id: string;
  category:
    BehaviorCriterionCategory;
  part: string;
  requirement: string;
  evidenceIds: readonly string[];
  providerObservation?: string;
  canonicalProjection?: string;
  verification:
    readonly (
      | "schema"
      | "type"
      | "dom"
      | "browser"
      | "accessibility-tree"
      | "manual-at"
    )[];
}
```

Profiles are JSON data. They contain no provider values, callback predicates,
React nodes, or executable tests.

### 4.3 Authority relationship

```text
HTML / ARIA / applicable WAI-ARIA APG
                 ↓
Pinned React Aria behavior and official documentation
                 ↓
Axiom Behavior Criteria Profile
                 ↓
Projection + public component conformance
```

React Aria is the primary v0.1 product behavior source, not a replacement for
the platform accessibility standards it implements. An apparent conflict stops
the release for reconciliation.

### 4.4 Provider upgrade rule

A provider upgrade requires a generated and reviewed criteria diff covering:

```text
semantic roles and labels
public/provider controlled state
render props and data attributes
keyboard/pointer/touch outcomes
focus management
selection and collection behavior
form and validation behavior
overlay dismissal and lifecycle
official testing guidance
```

Each diff item is classified as no-impact, criteria update, projection update,
public API change, or behavioral breaking change. Passing TypeScript and visual
snapshots alone cannot approve the upgrade.

---

## 5. Behavior Contract

```ts
interface ComponentBehaviorContract<
  TCapability extends string,
  TState extends string,
> {
  id: string;
  criteriaProfileId: string;
  criteriaProfileVersion: string;
  criteriaProfileDigest: string;
  slots: readonly string[];
  capabilities: readonly TCapability[];
  observableStates:
    Readonly<
      Record<
        string,
        readonly TState[]
      >
    >;
  lifecycle:
    readonly (
      | "entering"
      | "exiting"
    )[];
}
```

This contract is descriptive and testable. It does not execute transitions.

Button example:

```ts
const buttonBehaviorContract = {
  id: "button",
  criteriaProfileId:
    "react-aria.button",
  criteriaProfileVersion:
    "0.1",
  criteriaProfileDigest:
    "<generated digest>",
  slots: ["root"],
  capabilities: [
    "press",
    "keyboardActivation",
    "focus",
    "disabled",
  ],
  observableStates: {
    root: [
      "hovered",
      "pressed",
      "focused",
      "focusVisible",
      "disabled",
      "pending",
    ],
  },
  lifecycle: [],
} as const;
```

---

## 6. Provider State Projection

### 6.1 Projection rule

A projection may:

```text
select provider fields
rename provider fields
apply a documented default for an absent optional field
```

A projection may not:

```text
implement business logic
infer inaccessible state from DOM queries
change controlled component state
run Recipe selection
start animations
call provider event handlers
```

### 6.2 Button projection

```ts
interface ButtonAppearanceState {
  hovered: boolean;
  pressed: boolean;
  focused: boolean;
  focusVisible: boolean;
  disabled: boolean;
  pending: boolean;
}

function projectButtonState(
  state: ReactAriaButtonRenderState,
): ButtonAppearanceState {
  return {
    hovered: state.isHovered,
    pressed: state.isPressed,
    focused: state.isFocused,
    focusVisible: state.isFocusVisible,
    disabled: state.isDisabled,
    pending: state.isPending,
  };
}
```

### 6.3 Select projection

Select has slot-local projections.

```text
root       focused, focusVisible, disabled, invalid, required, open
trigger    hovered, pressed, focused, focusVisible, disabled, open
item       hovered, pressed, focused, focusVisible, selected, disabled
```

Each repeated item instance is evaluated separately with its own snapshot.

### 6.4 Dialog projection

```text
root/backdrop/popup   open
backdrop/popup        entering, exiting
root                  disabled is not applicable
```

Exit lifecycle coordination belongs to the React binding and Motion adapter.

### 6.5 Criteria extraction examples

The first profiles include at least the following evidence-backed criteria.

#### Button

| Provider observation/behavior | Axiom result |
| --- | --- |
| `isHovered` / `[data-hovered]` | `root.hovered` |
| `isPressed` / `[data-pressed]` | `root.pressed` |
| `isFocused` / `[data-focused]` | `root.focused` |
| `isFocusVisible` / `[data-focus-visible]` | `root.focusVisible` |
| `isDisabled` / `[data-disabled]` | `root.disabled` |
| `isPending` / `[data-pending]` | `root.pending`; press and hover disabled while focusability and announcement are preserved |
| button semantics remain a button | link navigation uses Axiom Link, not Button styling plus changed semantics |

#### Select

| Provider observation/behavior | Axiom result |
| --- | --- |
| Select `isOpen` | `root.open` and `trigger.open` |
| Select `isInvalid` / `isRequired` | `root.invalid` / `root.required` |
| trigger Button render state | trigger-local hover/press/focus projection |
| ListBoxItem render state | instance-local hover/press/focus/selection/disabled projection |
| controlled/default value and change | Axiom `value`, `defaultValue`, `onValueChange` contract |
| keyboard collection interaction | semantic interaction fixture, not a Recipe rule |
| form serialization and validation | public API and browser conformance fixture |

#### Dialog

| Provider observation/behavior | Axiom result |
| --- | --- |
| modal blocks outside interaction | modal semantics criterion |
| focus moves inside and is contained | focus criterion |
| focus restores to trigger on close | focus restoration criterion |
| Escape/outside dismissal according to props | Axiom dismissal API mapping |
| `isEntering` / `isExiting` | popup/backdrop Motion lifecycle input |

The tables are readable summaries. Machine-readable criteria profiles and
their evidence digests are the executable release inputs.

The normative
[React Aria Behavioral Criteria Profile](../specs/react-aria-behavioral-criteria.md)
defines the complete v0.1 Button, Select, and Dialog criterion IDs and
verification matrix.

---

## 7. Evaluator Contract

```ts
interface RecipeEvaluator<
  TVariants,
  TSlots extends string,
  TStates,
> {
  evaluate(
    input: {
      variants: TVariants;
      states: TStates;
    },
  ): Readonly<Record<TSlots, string>>;
}
```

The evaluator:

- selects already-generated classes;
- does not parse Tokens or CSS;
- does not read viewport/container conditions;
- does not compile raw style objects;
- does not depend on provider types;
- does not use class attribute token order as precedence.

Condition appearance is already in generated CSS conditional rules.

---

## 8. Public React API Ownership

### 8.1 No provider prop inheritance

Forbidden:

```ts
interface ButtonProps
  extends ReactAriaButtonProps {}
```

Required:

```ts
interface ButtonProps {
  children: React.ReactNode;
  size?: ButtonSize;
  tone?: ButtonTone;
  disabled?: boolean;
  pending?: boolean;
  onPress?: AxiomPressHandler;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLButtonElement>;
}
```

The exact event/ref contract is specified per component and mapped internally.
An Axiom minor release does not automatically inherit newly added provider props.

### 8.2 Provider-independent names

Public Axiom names do not copy provider prefixes such as `isDisabled` unless
that naming is deliberately selected as an Axiom convention. v0.1 uses:

```text
disabled
pending
open
defaultOpen
value
defaultValue
onOpenChange
onValueChange
```

### 8.3 Controlled and uncontrolled state

Each stateful component specifies:

- controlled prop;
- default prop;
- change event;
- event reason vocabulary owned by Axiom;
- invalid controlled/default combinations;
- form serialization behavior.

Provider event reasons are mapped into an Axiom reason union. Unknown future
provider reasons map to `"provider"` and can carry non-normative development
metadata without expanding the public union automatically.

### 8.4 Accessibility props

Public APIs explicitly expose the labeling, description, validation, and
required-state contracts needed by each component. An arbitrary provider-prop
spread is not a substitute for an Axiom accessibility contract.

Standard safe DOM `data-*` and `aria-*` passthrough may be supported by a
shared utility, but its behavior is independently tested.

---

## 9. Component API Shapes

### 9.1 Button

```ts
interface ButtonProps {
  children: React.ReactNode;
  tone?:
    | "primary"
    | "neutral"
    | "danger";
  size?:
    | "sm"
    | "md"
    | "lg";
  disabled?: boolean;
  pending?: boolean;
  type?:
    | "button"
    | "submit"
    | "reset";
  onPress?: (
    event: AxiomPressEvent,
  ) => void;
  className?: string;
  style?: React.CSSProperties;
}
```

### 9.2 Select

```ts
interface SelectProps<TItem> {
  label: React.ReactNode;
  items: readonly TItem[];
  getKey: (item: TItem) => string;
  getTextValue:
    (item: TItem) => string;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (
    value: string | null,
    event: AxiomValueChangeEvent,
  ) => void;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  size?:
    | "sm"
    | "md"
    | "lg";
}
```

Collection rendering and item content extension require a separate explicit API;
provider collection types are not public defaults.

### 9.3 Dialog

```ts
interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (
    open: boolean,
    event: AxiomOpenChangeEvent,
  ) => void;
  modal?: boolean;
  dismissible?: boolean;
  children: React.ReactNode;
}
```

Trigger/content composition is defined through Axiom parts. The provider's exact
component tree remains internal.

---

## 10. Slot and Part Boundary

Recipe Slots and public React Parts are related but not required to be 1:1.

```text
Recipe Slot
  appearance identity

React Part
  composition/public API identity

DOM node
  current renderer implementation
```

A Slot may map to one Part, several internal elements, or a conceptual style
target. Changing DOM structure is not automatically a Slot breaking change.

Public Part changes follow React package versioning; Slot changes follow Recipe
and generated artifact versioning.

---

## 11. Consumer Override Boundary

### 11.1 Normative IR exclusion

Consumer overrides do not participate in:

```text
Base → Variant → State → Compound → Condition
```

They are downstream Web/React concerns.

### 11.2 v0.1 public escape hatches

```text
className   root-level class merge
style       root-level inline style
registered part props where a component explicitly exposes them
CSS custom properties declared public by Component Token documentation
```

The runtime does not accept an `AppearanceStyle` object and invoke the build
compiler in the browser.

### 11.3 Token customization

Documented Component Token CSS custom properties are the preferred stable visual
customization axis. Directly overriding generated internal classes is
unsupported.

### 11.4 Merge behavior

- generated class is always present;
- consumer `className` is appended for DOM output but class token order is not
  claimed as CSS precedence;
- inline `style` follows browser cascade and is intentionally an escape hatch;
- internal event handlers and accessibility props use a tested merge utility;
- consumer handlers do not silently disable provider behavior unless the public
  API documents a cancellation contract.

---

## 12. Motion Binding

Components with Motion artifacts:

1. project provider lifecycle;
2. select Motion artifact by Recipe/Slot;
3. start/cancel the backend execution;
4. retain exiting content until the backend completion contract resolves;
5. use the required reduced-motion strategy;
6. preserve focus and aria state during lifecycle changes.

Motion execution errors fail open: content becomes visible/hidden according to
semantic component state without trapping interaction.

---

## 13. SSR and React Server Components

### 13.1 SSR

- generated classes and Token CSS are available during server render;
- initial semantic state is serializable;
- IDs must be stable across hydration;
- no viewport/container JavaScript branch changes server element structure;
- Motion starts after hydration unless the backend explicitly proves an SSR-safe
  behavior;
- reduced-motion CSS covers the pre-hydration path.

### 13.2 RSC packaging

The public package separates client components from server-safe types and static
artifacts. A package-level client directive cannot accidentally mark Token,
schema, or generated style modules as client-only.

Exact export maps are implementation artifacts tested by fixture applications.

---

## 14. Diagnostics

```text
AXB1001  unknown canonical state projection
AXB1002  provider state not selected or renamed
AXB1003  behavior logic found in projection
AXB1004  missing required lifecycle capability
AXB1101  missing Behavioral Criteria Source Manifest
AXB1102  criteria evidence digest mismatch
AXB1103  provider upgrade has unreviewed criteria diff
AXB1104  public behavior fails a required criterion
AXB1105  criteria profile references an unknown provider observation

AXR3001  public API exposes provider type
AXR3002  unsupported consumer appearance object
AXR3003  controlled/default prop conflict
AXR3004  missing accessibility contract
AXR3005  invalid Slot/Part mapping
AXR3006  SSR hydration mismatch
```

---

## 15. Conformance Tests

### Behavioral criteria

```text
source manifest matches exact lockfile resolution
every criteria evidence ID exists and its digest matches
Button/Select/Dialog criteria profiles pass JSON Schema
every provider observation maps to a tested projection or explicit non-projection
provider upgrade produces a categorized criteria diff
semantic queries use roles/names/state rather than provider DOM structure
@react-aria/test-utils drives supported high-level interactions where compatible
platform accessibility assertions remain independent of the test utility
```

### Projection

```text
Button state rename/select
Select root/trigger/item locality
repeated Select item independence
Dialog entering/exiting
missing optional provider state defaults
projection contains no side effects
```

### Public API

```text
generated Recipe variant unions
provider props not structurally leaked
controlled/uncontrolled behavior
event reason mapping
ref target
aria/data passthrough
className/style boundary
no runtime Appearance compiler
```

### Accessibility

```text
keyboard activation
focus-visible behavior
disabled/pending semantics
Select labeling and keyboard navigation
Select form serialization and validation
Dialog focus containment, dismissal, and restoration
screen-reader naming
```

### SSR/package

```text
server render + hydrate Button
server render + hydrate Select
Dialog initially open/closed
RSC fixture import boundaries
tree-shaken subpath import
styles included exactly once
```

### Motion

```text
enter once
exit completion before unmount
rapid reversal/cancellation
reduced-motion replacement
runtime backend failure preserves operability
```

---

## 16. Definition of Done

React Runtime reaches Gate C when:

- the React Aria Behavioral Criteria Source Manifest is generated from exact
  resolved versions and all evidence digests match;
- Button, Select, and Dialog criteria profiles pass every required verification
  mode or record an approved manual evidence artifact;
- React Aria is isolated in provider/binding packages;
- Button, Select, and Dialog use Axiom-owned public props;
- provider state maps only through tested component-local projections;
- generated evaluators accept canonical state;
- public override policy is implemented without modifying normative IR;
- accessibility, SSR, package-boundary, and Motion lifecycle fixtures pass;
- a dependency-boundary test prevents Token/Profile/Normalizer packages from
  importing React or React Aria.

---

## References

- [React Aria styling and render props](https://react-aria.adobe.com/styling)
- [React Aria Button](https://react-aria.adobe.com/Button)
- [React Aria Select](https://react-aria.adobe.com/Select)
- [React Aria Popover](https://react-aria.adobe.com/Popover)
- [React Aria Modal](https://react-aria.adobe.com/Modal)
- [React Aria testing](https://react-aria.adobe.com/testing)
- [Testing React Aria Select](https://react-aria.adobe.com/Select/testing)
- [ADR-0002](../adr/0002-react-aria-behavioral-criteria-source.md)
- [React Aria Behavioral Criteria Profile](../specs/react-aria-behavioral-criteria.md)
