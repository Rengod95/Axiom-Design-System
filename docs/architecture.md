# Axiom executable architecture draft

## Authority and dependency direction

The dependency direction is one-way:

```text
tokens <- appearance-schema <- recipes <- recipe-engine <- adapters
                                             ^                 ^
behavior ------------------------------------|----------------- react
```

The token source and recipe IR are the authorities. Generated CSS, atomic class
manifests, and React components are projections and may be recreated.

## Token boundary

`packages/tokens/src/source/tokens.json` follows the DTCG group/token shape. A
small local resolver handles aliases and fails on cycles, missing paths, or type
mismatches. The generator commits three outputs:

- exact `TokenPath` unions for generic infrastructure;
- `AppearanceTokenPath` unions restricted to appearance-compatible token types;
- CSS custom properties and a resolved manifest for adapters.

An appearance token reference is an explicit object (`{$type: "token", path}`),
not an arbitrary string. This keeps serialization unambiguous and prevents
accidental admission of aliases or CSS text into the core contract.

## Appearance boundary

The property registry is a typed data table. `AppearanceStyle` is derived from
that table, so property names, accepted token categories, literal domains, and
adapter CSS properties have one source of truth. The first slice intentionally
contains only properties required by Button and Select.

## Recipe boundary

A recipe declares slots, base styles, appearance variants, defaults, slot-local
behavior states, and compound variants. It cannot carry callbacks, selectors,
arbitrary class names, or renderer nodes. Runtime validation is deliberately
stricter than TypeScript because recipes can eventually arrive from generated
JSON or other languages.

Resolution produces both final per-slot appearance and a trace. The trace makes
merge-order bugs reviewable and later allows devtools to explain the origin of a
winning value.

## Adapter boundary

The Tailwind adapter currently emits deterministic, namespaced atomic CSS. It is
"Tailwind-facing" because the generated file is imported beside Tailwind and
uses Axiom token variables; it does not put Tailwind utility strings into IR.
The compiler scans every appearance fragment and writes the only class names the
runtime projection may use. Unknown values fail closed and require regeneration.

## Behavior boundary

Behavior contracts name capabilities and observable state without depending on
a renderer. `@axiom/react` projects those contracts onto React Aria Components.
Base UI can be added as a sibling projection without changing recipes.

## Stabilization boundary for the next pass

The draft intentionally defers:

1. DTCG Resolver/Terrazzo integration behind the local token generator port;
2. responsive and conditional appearance values;
3. recipe composition and cross-package extension governance;
4. a Base UI behavior projection;
5. SSR/RSC packaging and framework integration fixtures;
6. accessibility conformance and visual-regression suites;
7. publishing, changesets, and semver policy.

These should be decided after the two vertical slices expose whether the current
IR has the right expressive power.
