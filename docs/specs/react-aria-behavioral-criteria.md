# React Aria Behavioral Criteria Profile

**Status:** NORMATIVE ANNEX \
**Depends on:** SSOT-05 v0.2, ADR-0002 \
**Initial components:** Button, Select, Dialog \
**Source baseline:** lockfile-resolved React Aria Components 1.20.0 family

---

## 1. Purpose

This annex defines the minimum behavior that the v0.1 Axiom React wrappers must
preserve from React Aria. It is not a reimplementation guide for the React Aria
state machines.

The generated JSON profiles are normative implementation inputs. This Markdown
document defines their required coverage and human-readable criteria IDs.

---

## 2. Source Rule

The build produces:

```text
behavior-criteria-source-manifest.json
button.behavior-criteria.json
select.behavior-criteria.json
dialog.behavior-criteria.json
provider-upgrade-diff.json
```

The source manifest records exact versions and integrity for:

```text
react-aria-components
react-aria
react-stately
@react-aria/test-utils, when installed for conformance tests
```

Each evidence page has a stable ID, URL, content digest, and retrieval policy.
Axiom release artifacts do not depend on live documentation availability.

---

## 3. Verification Vocabulary

| Mode | Proves |
| --- | --- |
| `schema` | criteria/profile shape and evidence references |
| `type` | Axiom public and provider-internal mapping types |
| `dom` | semantic role/name/state and public event outcome |
| `browser` | real focus, keyboard, pointer, touch, overlay, and form behavior |
| `accessibility-tree` | exposed role/name/state relationships |
| `manual-at` | screen-reader/assistive-technology behavior not reliably automated |

DOM snapshots alone cannot close a focus, keyboard, or accessibility criterion.

---

## 4. Button Criteria

### 4.1 Semantics

| ID | Requirement | Verification |
| --- | --- | --- |
| `BTN-SEM-001` | Axiom Button exposes button semantics using a native button where the public API permits it. | dom, accessibility-tree |
| `BTN-SEM-002` | A navigation target is represented by Axiom Link rather than changing Button into link semantics. | type, dom |
| `BTN-SEM-003` | Accessible name derives from visible content or an explicit supported labeling prop. | dom, accessibility-tree |
| `BTN-SEM-004` | `type` defaults and form submission behavior are deliberate and fixture-tested. | dom, browser |

### 4.2 Multi-modal activation

| ID | Requirement | Verification |
| --- | --- | --- |
| `BTN-INT-001` | Mouse activation invokes one Axiom `onPress` outcome. | browser |
| `BTN-INT-002` | Touch activation invokes the same semantic press outcome without duplicate compatibility events. | browser |
| `BTN-INT-003` | Enter and Space keyboard activation follow button semantics. | browser |
| `BTN-INT-004` | Disabled Button does not produce a press outcome. | browser |
| `BTN-INT-005` | Consumer handlers are composed without removing provider behavior unless an explicit cancellation API says so. | type, browser |

### 4.3 Observable state projection

| ID | React Aria source | Canonical state | Slot |
| --- | --- | --- | --- |
| `BTN-STA-001` | `isHovered` | `hovered` | `root` |
| `BTN-STA-002` | `isPressed` | `pressed` | `root` |
| `BTN-STA-003` | `isFocused` | `focused` | `root` |
| `BTN-STA-004` | `isFocusVisible` | `focusVisible` | `root` |
| `BTN-STA-005` | `isDisabled` | `disabled` | `root` |
| `BTN-STA-006` | `isPending` | `pending` | `root` |

Every state is verified both as a projection snapshot and through at least one
real interaction where the state is reachable.

### 4.4 Pending and focus

| ID | Requirement | Verification |
| --- | --- | --- |
| `BTN-PEN-001` | Pending disables press and hover behavior. | browser |
| `BTN-PEN-002` | Pending retains focusability. | browser |
| `BTN-PEN-003` | Pending status has an accessible announcement strategy. | accessibility-tree, manual-at |
| `BTN-FOC-001` | `focusVisible` distinguishes keyboard-visible focus from general focus according to provider behavior. | browser |
| `BTN-FOC-002` | Styling never becomes the source of focus state. | type, browser |

---

## 5. Select Criteria

### 5.1 Composition and semantics

The Axiom Select public component may use a different JSX composition from
React Aria, but must preserve the semantic pattern formed by label, trigger,
value, popover/listbox, and option items.

| ID | Requirement | Verification |
| --- | --- | --- |
| `SEL-SEM-001` | The trigger is associated with the Select label and current value. | dom, accessibility-tree |
| `SEL-SEM-002` | The popup exposes listbox semantics and items expose option semantics. | dom, accessibility-tree |
| `SEL-SEM-003` | Disabled items cannot be selected, focused, or otherwise interacted with according to provider behavior. | browser |
| `SEL-SEM-004` | Placeholder content is distinguishable from a selected value without becoming a fake selection. | dom, browser |

### 5.2 Controlled state and form behavior

| ID | Requirement | Verification |
| --- | --- | --- |
| `SEL-VAL-001` | `value` and `onValueChange` form a controlled contract. | type, browser |
| `SEL-VAL-002` | `defaultValue` forms an uncontrolled initial-value contract. | type, browser |
| `SEL-VAL-003` | Invalid controlled/default combinations produce the documented diagnostic. | type, dom |
| `SEL-FRM-001` | Name/value are serialized by forms according to the Axiom public contract. | browser |
| `SEL-FRM-002` | Required and invalid behavior is projected and exposed accessibly. | browser, accessibility-tree |

### 5.3 Root and trigger projection

| ID | React Aria source | Canonical state | Slot |
| --- | --- | --- | --- |
| `SEL-STA-001` | Select `isFocused` | `focused` | `root` |
| `SEL-STA-002` | Select `isFocusVisible` | `focusVisible` | `root` |
| `SEL-STA-003` | Select `isDisabled` | `disabled` | `root`, `trigger` |
| `SEL-STA-004` | Select `isOpen` | `open` | `root`, `trigger`, `popup` |
| `SEL-STA-005` | Select `isInvalid` | `invalid` | `root` |
| `SEL-STA-006` | Select `isRequired` | `required` | `root` |
| `SEL-STA-007` | trigger Button `isHovered` | `hovered` | `trigger` |
| `SEL-STA-008` | trigger Button `isPressed` | `pressed` | `trigger` |
| `SEL-STA-009` | trigger Button `isFocusVisible` | `focusVisible` | `trigger` |

### 5.4 Repeated item projection

| ID | React Aria source | Canonical state | Slot instance |
| --- | --- | --- | --- |
| `SEL-ITM-001` | ListBoxItem `isHovered` | `hovered` | that `item` only |
| `SEL-ITM-002` | ListBoxItem `isPressed` | `pressed` | that `item` only |
| `SEL-ITM-003` | ListBoxItem `isFocused` | `focused` | that `item` only |
| `SEL-ITM-004` | ListBoxItem `isFocusVisible` | `focusVisible` | that `item` only |
| `SEL-ITM-005` | ListBoxItem `isSelected` | `selected` | that `item` only |
| `SEL-ITM-006` | ListBoxItem `isDisabled` | `disabled` | that `item` only |

The Recipe IR stores one `item` Slot definition. The binding evaluates each
rendered item with its own state snapshot. It may not aggregate item states at
the root or share one selected/focused result across instances.

### 5.5 Interaction

| ID | Requirement | Verification |
| --- | --- | --- |
| `SEL-INT-001` | Mouse, touch, and keyboard can open and close the popup through documented interactions. | browser |
| `SEL-INT-002` | Keyboard navigation reaches available items and updates focused option semantics. | browser, accessibility-tree |
| `SEL-INT-003` | Selection updates controlled/uncontrolled value exactly once. | browser |
| `SEL-INT-004` | Escape dismissal and focus return follow the provider pattern. | browser |
| `SEL-INT-005` | Outside interaction dismissal preserves the public event reason mapping. | browser |

The preferred driver for supported flows is the pinned React Aria Select test
utility, with independent role/name/state assertions after every action.

---

## 6. Dialog Criteria

### 6.1 Semantics and modal behavior

| ID | Requirement | Verification |
| --- | --- | --- |
| `DLG-SEM-001` | Dialog exposes dialog semantics and a usable accessible name. | dom, accessibility-tree |
| `DLG-SEM-002` | Modal mode blocks interaction with outside content. | browser, accessibility-tree |
| `DLG-SEM-003` | Non-modal behavior is exposed only when the Axiom public API deliberately supports it. | type, browser |
| `DLG-SEM-004` | Backdrop and popup remain distinct Recipe Slots even if provider DOM structure changes. | type, dom |

### 6.2 Focus

| ID | Requirement | Verification |
| --- | --- | --- |
| `DLG-FOC-001` | Focus moves into the dialog when opened. | browser |
| `DLG-FOC-002` | Focus is contained in a modal dialog while open. | browser |
| `DLG-FOC-003` | Focus returns to the trigger when the dialog closes. | browser |
| `DLG-FOC-004` | Rapid close/reopen does not strand focus in exiting content. | browser |
| `DLG-FOC-005` | Motion failure cannot leave an invisible focus trap. | browser |

### 6.3 Dismissal

| ID | Requirement | Verification |
| --- | --- | --- |
| `DLG-DIS-001` | Escape closes when keyboard dismissal is enabled. | browser |
| `DLG-DIS-002` | Outside interaction closes only when dismissible policy permits. | browser |
| `DLG-DIS-003` | Close buttons use the provider close-slot behavior through the Axiom Part API. | dom, browser |
| `DLG-DIS-004` | `onOpenChange` exposes an Axiom-owned reason without leaking provider event types. | type, browser |

### 6.4 Lifecycle and Motion

| ID | React Aria source | Axiom lifecycle | Target |
| --- | --- | --- | --- |
| `DLG-LIF-001` | `isEntering` | `entering` | `backdrop`, `popup` |
| `DLG-LIF-002` | `isExiting` | `exiting` | `backdrop`, `popup` |
| `DLG-LIF-003` | open/closed semantic state | `open` | `root`, `backdrop`, `popup` |

Exit Motion may retain rendered content until completion, but semantic
operability, focus restoration, and outside interaction blocking follow the
Behavior Criteria Profile rather than the animation timeline.

---

## 7. Criteria-to-Projection Coverage

Generation emits these reports:

```text
provider observation → canonical state/lifecycle
canonical state/lifecycle → Recipe/Motion usages
criterion → automated fixture IDs
criterion → manual evidence IDs
provider evidence ID → criteria IDs
public prop/event → behavior criteria IDs
```

Errors:

```text
provider observation has no projection or explicit exclusion
canonical state has no provider evidence for a component
criterion has no verification mode
criterion evidence digest is absent or stale
public behavior is not covered by any criterion
manual criterion lacks an approved evidence artifact
```

---

## 8. Provider Upgrade Diff

The diff command compares old and proposed manifests/profiles and emits:

```ts
interface ProviderCriteriaDiffItem {
  component: string;
  subject: string;
  oldEvidence?: string;
  newEvidence?: string;
  classification:
    | "no-impact"
    | "criteria-update"
    | "projection-update"
    | "public-api-change"
    | "behavioral-breaking";
  review: {
    status:
      | "pending"
      | "accepted"
      | "rejected";
    rationale?: string;
  };
}
```

An unresolved `projection-update`, `public-api-change`, or
`behavioral-breaking` item blocks Gate C. A version bump without an evidence
change still runs the conformance suite because runtime behavior can change
without documentation or type shape changes.

---

## 9. Definition of Done

- exact provider package and evidence manifests validate;
- every Button/Select/Dialog criterion has evidence and verification;
- every observable provider state is projected or explicitly excluded;
- semantic tests query roles, accessible names, and states rather than provider
  DOM/class implementation;
- repeated Select item isolation passes;
- Dialog focus containment/restoration passes with and without Motion;
- pending Button behavior and announcement evidence pass;
- provider-upgrade diff is generated and reviewed;
- no React Aria type crosses the Axiom public API boundary.

---

## References

- [React Aria Button](https://react-aria.adobe.com/Button)
- [React Aria useButton](https://react-aria.adobe.com/Button/useButton)
- [React Aria Select](https://react-aria.adobe.com/Select)
- [Testing React Aria Select](https://react-aria.adobe.com/Select/testing)
- [React Aria ListBox](https://react-aria.adobe.com/ListBox)
- [React Aria Modal](https://react-aria.adobe.com/Modal)
- [React Aria FocusScope](https://react-aria.adobe.com/FocusScope)
- [React Aria testing](https://react-aria.adobe.com/testing)
