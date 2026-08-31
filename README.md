# Axiom Design System

Axiom is a contract-first design-system experiment. Its core is a serializable,
rendering-independent intermediate representation (IR); React and Tailwind are
replaceable projections of that IR rather than authorities over it.

This repository currently contains an executable architecture draft. It proves
the full path with Button and Select:

```text
DTCG token source
  -> generated token paths and CSS variables
  -> typed appearance schema
  -> serializable recipe IR
  -> deterministic recipe resolver
  -> generated Tailwind-facing atomic CSS
  -> React Aria behavior projection
```

## Architectural invariants

- `tokens`, `appearance-schema`, and recipe definitions contain no React, JSX,
  CSS API, Tailwind class, `className`, Base UI, or React Aria concept.
- A recipe is plain serializable data. Functions and renderer escape hatches are
  rejected by validation.
- Appearance variants and interaction states are different axes.
- State styles are slot-local. A one-slot recipe has only the `root` slot.
- The merge order is fixed: base -> variants -> states -> compound variants ->
  adapter extension -> consumer override.
- Adapters behave as compiler backends. Generated artifacts are committed and
  checked for drift in CI.

## Workspace

| Package | Responsibility |
| --- | --- |
| `@axiom/tokens` | DTCG source, resolution, generated paths and CSS variables |
| `@axiom/appearance-schema` | Token references and registry-derived appearance contract |
| `@axiom/recipes` | Serializable recipe contract plus Button and Select recipes |
| `@axiom/recipe-engine` | Validation and deterministic resolution with trace output |
| `@axiom/adapter-tailwind` | Atomic artifact compiler and runtime class projection |
| `@axiom/behavior` | Renderer-neutral behavior capabilities and state names |
| `@axiom/react` | React Aria Components projection for Button and Select |

See [`docs/architecture.md`](docs/architecture.md) for dependency rules and the
current stabilization boundary.

## Run locally

```bash
pnpm install
pnpm generate
pnpm check
pnpm test
pnpm build
```

`pnpm generate:check` fails if a source token or recipe changes without its
generated artifact being committed.

An application imports the generated styles once, next to Tailwind:

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

## Status

This is intentionally a narrow v0 draft, not a production component library.
The Button and Select slices exist to make architectural disagreements concrete
before the token vocabulary, component count, or adapter surface grows.
