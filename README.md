# Axiom Design System

Axiom is a contract-first design-system project. Normative documents and JSON
Schemas define the architecture; packages implement those contracts without
becoming an alternative source of truth.

## Authority

When sources disagree, use this order:

1. accepted ADRs;
2. SSOT documents;
3. normative schemas, registries, and pinned input manifests in `spec/`;
4. conformance fixtures;
5. generated definitions and artifacts;
6. compiler and runtime packages;
7. examples and historical reviews.

If this is your first visit, read the Korean
[repository guidebook](docs/guidebook.md) for the end-to-end mental model,
package/module/API catalog, data flows, and change recipes. Then use the
[documentation index](docs/README.md), the
[current architecture](docs/architecture.md), and the
[source-code and module standard](docs/standards/source-code-and-module-structure.md).

## Current workspace

| Package | Responsibility |
| --- | --- |
| `@axiom/spec-tooling` | Validate normative schemas, registries, fixtures, and canonical digests |
| `@axiom/tokens` | Own token contracts, identity validation, context resolution, and manifest serialization |
| `@axiom/token-tooling` | Adapt pinned DTCG parser output to Axiom token contracts |
| `@axiom/css-property-profile` | Generate the pinned CSS registry, Token bindings, authoring types, and validation services |

Renderer, recipe, appearance-normalization, and framework packages are intentionally absent
until their implementation gates are satisfied by the SSOT and normative spec.
The pre-foundation MVP packages are not migration authorities and must not be
reintroduced as examples.

## Repository layout

| Path | Role |
| --- | --- |
| `docs/` | ADRs, SSOT, normative annexes, implementation reports, and standards |
| `spec/` | Machine-readable normative schemas, registries, and conformance fixtures |
| `fixtures/` | External-source fixtures such as DTCG token documents |
| `tokens/` | Normative base and context-specific DTCG Token sources |
| `packages/` | Capability-owned implementation packages with explicit public entry points |
| `scripts/` | Repository policy and deterministic quality checks |

Version numbers remain contract data where compatibility requires them, but
they are not used in source identifiers, filenames, or directory names.

## Local verification

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

`pnpm check` also verifies that the resolved Token artifacts, generated Token
path types, effective CSS registry, coverage report, and CSS authoring types have
not drifted from their pinned inputs. Any source-level change must pass all
three commands before review.
