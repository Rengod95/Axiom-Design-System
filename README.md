# Axiom Design System

> **Foundation status:** the current packages are an executable architecture
> spike, not a Gate A-frozen implementation. The normative v0.1 architecture
> and implementation plan live in [`docs/`](docs/README.md).

Axiom is a contract-first design-system project. The v0.1 architecture combines
a target-neutral Token Foundation with a Web-specific CSS Appearance Profile,
serializable Recipe and Motion IRs, generated Web artifacts, React Aria behavior
projection, and an Axiom-owned React component API.

## Normative v0.1 Direction

```text
DTCG primitive / semantic / component tokens
  -> light and dark resolved manifests
  -> pinned Webref CSS registry + sparse Axiom Property Policy
  -> generated direct/template/projector Token Binding Catalog
  -> typed Recipe / Condition / Motion authoring
  -> schema-valid normalized IR
  -> deterministic CSS, evaluator, and Motion artifacts
  -> React Aria behavior projection
  -> Axiom React components
```

The CSS property registry is generated from a pinned Webref snapshot rather
than maintained as a hand-written allowlist. Recognized standard properties may
use valid CSS values by default. Axiom policy stays sparse and governs the
design-system-specific questions: whether a property may or must use a token,
which Token Domains are compatible, and whether a property is restricted or
blocked.

The required binding catalog includes physical and logical margin, padding,
gap, inset, scroll spacing, common sizing, paint, typography, border/stroke,
effect, layering, responsive, and motion property families. `space` Tokens are
therefore first-class values for margin as well as padding and gap.

Token and CSS concerns intentionally remain separate. CSS defines where a value
is applied and how browsers parse it; Axiom tokens define design meaning,
semantic indirection, component contracts, and theme resolution.

## Required v0.1 Scope

- DTCG 2025.10 parsing and primitive, semantic, and component token tiers;
- light and dark resolver contexts and generated token manifests;
- common-system Token Domains including stroke width, blur, aspect ratio, and
  complete spacing/margin coverage;
- full generated standard CSS property profile with sparse Axiom policy;
- ordered declaration-array IR with CSS cascade and shorthand semantics;
- an Axiom-owned Recipe Kernel with slots, variants, defaults, compound
  variants, slot-local states, and environment conditions;
- viewport and container responsive appearance plus reduced-motion conditions;
- serializable Motion DSL/IR and the `motion` reference backend;
- exact-version React Aria Behavioral Criteria Profiles and projections for
  Button, Select, and Dialog;
- an Axiom-owned React public API with explicit consumer override boundaries;
- deterministic Web CSS compilation and Tailwind coexistence integration.

See the [documentation index](docs/README.md),
[accepted architecture decisions](docs/adr/0001-css-native-appearance-profile-and-v0.1-scope.md),
and [detailed implementation plan](docs/plans/2026-09-01-v0.1-foundation-and-implementation-plan.md).

## Current Executable Spike

The repository currently proves a narrower Button and Select vertical slice:

```text
DTCG-like token source
  -> generated token paths and CSS variables
  -> small appearance table
  -> serializable recipe object and resolver
  -> generated Tailwind-facing atomic CSS
  -> React Aria projection
```

These packages remain buildable migration evidence. They do not implement the
new normative profile yet.

| Current package | Current role | v0.1 disposition |
| --- | --- | --- |
| `@axiom/tokens` | local token source and generator | preserve API evidence; replace internals |
| `@axiom/appearance-schema` | small hand-written appearance table | superseded by generated CSS profile |
| `@axiom/recipes` | Button and Select recipe objects | preserve fixtures; migrate authoring |
| `@axiom/recipe-engine` | object-merge resolver | preserve tests; replace with ordered declaration normalization |
| `@axiom/adapter-tailwind` | generated atomic CSS spike | keep historical; direct Web CSS becomes normative compiler |
| `@axiom/behavior` | behavior names and capabilities | extract provider-independent contracts |
| `@axiom/react` | React Aria Button and Select binding | preserve visual evidence; rewrite public API and bindings |

The older [executable architecture draft](docs/architecture.md) documents this
spike and is explicitly non-normative.

## Run the Existing Baseline

```bash
pnpm install
pnpm generate
pnpm check
pnpm test
pnpm build
```

`pnpm generate:check` fails if a current spike token or recipe changes without
its generated artifact being committed.

An existing spike application imports the generated styles beside Tailwind:

```css
@import "tailwindcss";
@import "@axiom/tokens/css";
@import "@axiom/adapter-tailwind/styles";
```

```tsx
import { Button, Select } from "@axiom/react";

<Button tone="accent" size="md">Save</Button>;

<Select
  label="Team"
  items={[
    { id: "platform", label: "Platform" },
    { id: "product", label: "Product" },
  ]}
/>;
```

This is not yet a production component library. New feature work should follow
the active Foundation plan rather than extending the spike contracts as
authority.
