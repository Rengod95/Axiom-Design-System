# ADR-0002 — React Aria as the Behavioral Criteria Source

**Status:** ACCEPTED \
**Date:** 2026-09-01 \
**Decision owners:** Axiom Foundation \
**Amends:** SSOT-00, SSOT-02, SSOT-05
**Amended by:** ADR-0005

---

## 1. Context

ADR-0001 selected React Aria Components as the v0.1 primary behavior provider,
but “provider” alone does not define what Axiom must preserve when it wraps the
provider. A wrapper can compile and render successfully while accidentally
dropping keyboard behavior, focus restoration, pending semantics, collection
state, form integration, or overlay lifecycle.

Axiom needs a versioned source from which component behavior criteria and
projection tests are derived. That source must remain outside Token, CSS,
Recipe, and Motion schemas while still being strong enough to block a release
when the public component behaves differently.

---

## 2. Decision

### 2.1 React Aria is the v0.1 Behavioral Criteria Source

For every v0.1 React component, Axiom derives its provider-facing behavior
criteria from an exact, lockfile-resolved React Aria release and the matching
official component documentation.

The initial repository baseline is:

```text
react-aria-components  1.20.0
react-aria             3.51.0
react-stately          3.49.0
```

The package versions above are reviewed candidates, not current-lockfile facts.
N32 MUST emit a Behavioral Criteria Source Manifest with actual resolved
versions and evidence digests.

### 2.2 Platform accessibility standards remain higher authority

React Aria is the primary product behavior and state-vocabulary source. It does
not replace HTML, ARIA, or applicable WAI-ARIA Authoring Practices as platform
accessibility authority.

```text
HTML / ARIA / applicable APG requirement
                 ↓
React Aria behavior implementation and documented contract
                 ↓
Axiom criteria extraction and public wrapper conformance
```

When React Aria documentation and a platform requirement appear to conflict,
the release stops for reconciliation. Axiom does not intentionally preserve a
provider behavior that violates the platform requirement.

### 2.3 Criteria are versioned data, not prose-only notes

Each supported component has a machine-readable Behavior Criteria Profile. It
records at least:

- semantic role and labeling requirements;
- keyboard, pointer, touch, and virtual-cursor interaction outcomes;
- focus acquisition, containment, visibility, and restoration;
- controlled/uncontrolled state and change events;
- selection, collection, form, and validation behavior where applicable;
- observable render state and lifecycle fields;
- overlay opening, dismissal, and exit behavior;
- provider evidence location;
- Axiom canonical projection and required tests.

The profile does not contain executable callbacks or provider objects.

### 2.4 Projection remains narrow

React Aria state may be selected, renamed, and defaulted only as specified by a
component profile. Axiom does not reimplement the provider state machine in
Recipe evaluation or a generic Behavior Engine.

### 2.5 Provider upgrades require a criteria diff

A React Aria upgrade is not complete when TypeScript and visual snapshots pass.
The upgrade pipeline must:

1. update the source manifest;
2. diff documented props, render states, data attributes, lifecycle, and testing
   guidance used by Axiom;
3. classify each change as no-impact, projection change, public API change, or
   behavioral breaking change;
4. update criteria and fixtures;
5. pass accessibility and interaction conformance before lockfile promotion.

Unreviewed provider range drift is forbidden in release builds.

### 2.6 React Aria test utilities are a reference test driver

Where the pinned version supports the component, `@react-aria/test-utils` may
drive provider interaction fixtures. Tests must still assert public semantics
by role, accessible name, state, focus, and observable events. Test utility
implementation details do not become Axiom behavior criteria.

---

## 3. Consequences

### Positive

- Axiom can state exactly which provider behavior a wrapper must preserve.
- provider upgrades become reviewable instead of silently expanding the public
  API or state vocabulary;
- Button, Select, and Dialog receive component-specific interaction gates;
- the same criteria can later evaluate a second provider without changing
  Token, CSS, or Recipe contracts.

### Cost

- behavior profiles and evidence digests must be maintained;
- provider upgrades require semantic review in addition to dependency updates;
- some criteria cannot be proven by unit tests and require browser,
  accessibility-tree, or manual assistive-technology evidence.

---

## 4. Rejected Alternatives

### Treat React Aria types as the criteria

Types do not fully describe keyboard sequences, focus restoration, semantics,
or the outcome of multi-modal interaction.

### Extend React Aria props as the Axiom public API

This makes provider additions and breaking changes Axiom public changes without
review and prevents a future provider substitution.

### Maintain a provider-neutral state machine in Axiom Core

This duplicates the hardest interaction and accessibility logic and creates two
competing behavior authorities.

---

## References

- [React Aria releases](https://react-aria.adobe.com/releases/)
- [React Aria testing guidance](https://react-aria.adobe.com/testing)
- [React Aria Button](https://react-aria.adobe.com/Button)
- [React Aria Select](https://react-aria.adobe.com/Select)
- [React Aria Modal](https://react-aria.adobe.com/Modal)
- [React Aria FocusScope](https://react-aria.adobe.com/FocusScope)
