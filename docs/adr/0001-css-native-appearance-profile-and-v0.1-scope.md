# ADR-0001 — CSS-Native Appearance Profile and v0.1 Scope

**Status:** ACCEPTED \
**Date:** 2026-09-01 \
**Decision owners:** Axiom Foundation \
**Supersedes:** SSOT-00 v0.1.0 INV-006, OPEN-001, OPEN-002, OPEN-003 and the corresponding SSOT-01/02 rules

---

## 1. Context

The original pre-adapter baseline defined a small target-independent appearance
vocabulary such as `background`, `foreground`, `flowDirection`, `radius`, and
`layer`. A Web adapter was expected to translate those names into CSS.

That model created four problems.

1. Supporting the full Web platform would require a second, much larger CSS
   vocabulary next to the Axiom vocabulary.
2. Authors would need to learn Axiom aliases for concepts already standardized
   by CSS.
3. Shorthands, longhands, value grammar, cascade, browser targeting, and motion
   would still need CSS-aware handling after the abstract layer.
4. A small lowest-common-denominator property set would make v0.1 unusable for
   real component work while not actually guaranteeing portability to React
   Native or SwiftUI.

The token system has a different concern. A CSS `<length>` cannot distinguish a
spacing value from a size, radius, border width, or font size. Axiom Token
Domains must continue to make those semantic distinctions even when property
identities come from CSS.

---

## 2. Decision

### 2.1 CSS is the canonical property vocabulary of the v0.1 Appearance Profile

The normative property identifier is the standard kebab-case CSS property name.

```text
background-color
color
padding-inline
inline-size
border-radius
z-index
```

TypeScript authoring may expose a mechanically generated camelCase projection,
but normalization MUST emit the standard kebab-case identifier.

### 2.2 Canonicality is profile-scoped

Axiom Token Foundation and Recipe structure remain target-neutral. Property and
value semantics are owned by an Appearance Profile.

```text
Axiom Token Foundation       target-neutral
Axiom Recipe Structure       profile-neutral structure
CSS Appearance Profile       Web CSS canonical vocabulary
Future native profile        separate profile or declared CSS subset mapping
```

The project no longer claims that one property vocabulary is naturally
canonical across CSS, React Native, and SwiftUI.

### 2.3 The CSS registry is generated, not hand-authored

`@webref/css` is the upstream machine-readable authority for standard CSS
property identity, formal syntax, and shorthand relations. An Axiom release pins
an exact package version and records an input digest.

The effective registry is generated from:

```text
Pinned Webref snapshot
  + global Axiom defaults
  + sparse property-group policy
  + sparse per-property overrides
  + explicit block/experimental policy
```

### 2.4 Sparse policy is not a property allowlist

Every recognized standard CSS property is authorable with a validated CSS value
by default. An Axiom policy entry is required only when Axiom adds semantics or
restrictions such as:

- allowed Token Domains;
- token-required authoring;
- shorthand diagnostics;
- motion capability overrides;
- portability classification;
- security restrictions.

A property without a sparse override is not unsupported. It receives the
standard default effective policy.

### 2.5 Full CSS support and token-governed support are different guarantees

```text
CSS support
  recognized standard property + grammar-valid CSS value

Token binding support
  property policy explicitly permits one or more Axiom Token Domains
```

The first is broad and generated. The second is deliberately governed.

### 2.6 Declaration and cascade semantics become normative

Appearance styles are normalized to ordered declaration arrays rather than a
plain `Record<PropertyName, Value>`. The registry preserves shorthand,
longhand, and reset-longhand relationships. Precedence is represented by an
ordered stage model and deterministic generated CSS layers.

`!important` is forbidden in v0.1 system recipes.

### 2.7 Component Tokens are a v0.1 tier

The Token Tier set is:

```text
primitive
semantic
component
```

Component Tokens are supported by the resolver and schema. Their creation is
still evidence-based; not every declaration becomes a Component Token.

### 2.8 Responsive Appearance and Motion are v0.1 requirements

Responsive appearance is modeled as registered Environment Conditions, not
arbitrary media-query strings or variants. v0.1 includes viewport width,
container inline-size, and reduced-motion conditions.

Motion has a serializable Axiom Motion IR. `motion` is the first runtime backend,
but its public types and callback model are not normative Axiom contracts.

### 2.9 React Aria is the v0.1 primary behavioral provider

Provider state is projected into canonical appearance/lifecycle state per
component. Axiom does not implement an interaction engine or accessibility state
machine. The React public API is Axiom-owned and MUST NOT extend or re-export
React Aria component prop types as its public contract.

### 2.10 Web CSS compiler replaces Tailwind as the primary style backend concept

The primary compiler emits CSS directly and may use Lightning CSS for parsing,
browser targeting, prefixing, and output validation. Tailwind is a supported
consumer integration, not the authority for property vocabulary or generated
style semantics.

The existing `adapter-tailwind` remains a historical executable spike until it
is migrated or replaced.

---

## 3. Consequences

### Positive

- Authors use standard CSS names and values.
- New standard properties inherit a default policy after a Webref snapshot
  update without hand-written Axiom entries.
- Token governance remains stronger than plain CSS because Token Domains are
  checked independently of CSS value grammar.
- Motion tracks reuse the same property registry and grammar validation.
- Web adapter translation becomes mostly serialization, ordering, and browser
  compatibility work rather than vocabulary translation.
- Non-Web targets can report an honest capability subset instead of forcing a
  false universal abstraction.

### Costs

- Appearance IR is explicitly tied to the CSS Appearance Profile.
- Shorthand/longhand and cascade ordering must be modeled and tested.
- Raw CSS values require a trust and resource policy.
- A future first-class native target may need a sibling Appearance Profile.
- The original atomic Tailwind spike cannot be promoted unchanged.

---

## 4. Rejected Alternatives

### Maintain a small target-neutral vocabulary plus a Web extension

Rejected as the default v0.1 authoring model because it duplicates property
concepts and forces authors to decide which of two style languages to use.

### Hand-author policy for every CSS property

Rejected because it recreates a moving Web standard and makes property coverage
dependent on Axiom maintenance throughput.

### Infer every Token Domain from CSS formal syntax

Rejected because `<length>` cannot distinguish `space`, `size`, `radius`,
`borderWidth`, or `fontSize`. Syntax compatibility may assist diagnostics, but
semantic Domain binding remains an Axiom decision.

### Expose `CSS.Properties` or Motion library types as normative IR

Rejected because TypeScript types, functions, callbacks, and library release
semantics are unsuitable as a language-neutral serialized contract.

### Build an Axiom behavior engine/state machine

Rejected because interaction, focus, selection, keyboard navigation, and ARIA
semantics belong to the behavioral provider.

---

## 5. Follow-up Specifications

- SSOT-00 v0.2 — system architecture and authority
- SSOT-01 v0.2 — token foundation and domain contracts
- SSOT-02 v0.2 — adapter, gates, and governance
- SSOT-03 — CSS Appearance Profile and Property Policy
- SSOT-04 — Environment Conditions and Motion
- SSOT-05 — React Runtime, Behavior Provider, and Public API

---

## References

- [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [W3C Webref](https://github.com/w3c/webref)
- [CSSTree](https://github.com/csstree/csstree)
- [Lightning CSS](https://lightningcss.dev/)
- [Motion animate API](https://motion.dev/docs/animate)
- [React Aria](https://react-aria.adobe.com/)
