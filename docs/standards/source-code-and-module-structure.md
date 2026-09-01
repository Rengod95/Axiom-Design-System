# Axiom source-code and module-structure standard

**Status:** Normative repository engineering standard

**Applies to:** source, tests, scripts, package manifests, generated-code inputs,
and source-level changes

**Enforcement:** `pnpm check`, code review, and the repository root `AGENTS.md`

## 1. Purpose and language

This standard keeps implementation context aligned with Axiom's established
foundation and prevents prototypes, temporary version names, and unexplained
literals from becoming accidental architecture.

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are
normative. A rule may be waived only by an accepted ADR that names the rule,
scope, owner, and removal or review condition.

## 2. Source authority

Source changes MUST be derived in this order:

1. accepted ADR;
2. owning SSOT document;
3. normative schema, registry, or pinned source profile;
4. positive and negative conformance fixture;
5. public TypeScript contract;
6. implementation and adapter;
7. example.

An implementation MUST NOT invent behavior that belongs in a higher authority.
When prose and machine-readable specifications disagree, the change is blocked
until they are reconciled.

## 3. Naming

### 3.1 Required forms

| Kind | Form | Example |
| --- | --- | --- |
| Package, directory, source file | `kebab-case` | `token-tooling`, `context-resolver.ts` |
| Type, interface, class, error | `UpperCamelCase` | `ResolvedTokenManifest` |
| Function, parameter, local variable | `lowerCamelCase` | `resolveTokenContexts` |
| Exported or package-wide constant | `CONSTANT_CASE` | `TOKEN_SCHEMA_VERSION` |
| Boolean | affirmative predicate | `isSchemaValid`, `hasAlias` |
| Test | behavior statement | `rejects unknown token domains` |

Names MUST describe responsibility or domain meaning. Generic containers such
as `misc`, `common-utils`, `helpers`, `new`, `old`, `legacy`, and `temp` are
forbidden unless an ADR gives them a precise lifecycle and owner. Prefer a
capability name such as `canonical-json`, `identity`, or `resolution`.

### 3.2 No version-bearing source names

Version markers MUST NOT appear in source identifiers, public symbols,
filenames, or directory names. Forbidden examples include:

- `v0-1/`, `v01/`, `profile-v0.1.json`;
- `ParsedTokenV01`, `resolveTokensV2`, `manifest_v2`;
- `new-resolver` and `legacy-contracts` used as implicit version aliases.

Use semantic capability names instead: `parsed-token-document`,
`resolved-token-manifest`, `context-resolver`.

Compatibility versions MAY appear as data where a protocol requires them:

- `schemaVersion` and `profileVersion` values;
- package-manager dependency versions;
- document metadata, changelogs, and migration records;
- generated artifact provenance.

Version data MUST be centralized as a named constant when source code consumes
it. Two incompatible contracts that must coexist require an ADR and separate
semantic package or capability boundaries; a version-suffixed folder is not a
boundary.

## 4. Constants and literal policy

### 4.1 Ownership

Every package MUST have `src/constants.ts` for package-wide protocol, policy,
diagnostic, serialization, and integration values. A domain directory MAY have
one `constants.ts` when the values are meaningful only inside that domain.

A value used by one module MAY remain in that module only when it is named with
`CONSTANT_CASE` and its meaning is obvious at the declaration. Constants modules
MUST be side-effect free and MUST NOT read files, environment variables, clocks,
randomness, or the network.

Use `as const`, readonly collections, or frozen lookup objects so TypeScript
derives literal unions from the same value table used at runtime.

### 4.2 Values that must be named

The following MUST NOT be repeated inline:

- schema/profile versions and dialect URIs;
- diagnostic codes, phases, and stable severity names;
- parser modes, supported units, fixed locales, and serialization indentation;
- timeouts, limits, retry counts, byte sizes, and unit conversions;
- regexes that define identifiers, references, paths, or other contracts;
- externally observable error text that consumers are expected to match;
- file names and directory names used by more than one operation;
- feature flags, environment keys, storage keys, and protocol field values.

Inline `true`, `false`, `null`, empty collections, loop counters, and comparison
sentinels are acceptable when they carry no hidden domain meaning. Test fixture
values MAY remain local when the test name explains the boundary being tested;
shared fixtures and repeated expectations MUST be named.

### 4.3 Example

```ts
// constants.ts
export const TOKEN_SCHEMA_VERSION = "0.1" as const;
export const MILLISECONDS_PER_SECOND = 1_000;
export const TOKEN_DIAGNOSTIC_CODE = {
  UNKNOWN_DOMAIN: "AXT1103",
} as const;
```

```ts
// identity.ts
import {
  MILLISECONDS_PER_SECOND,
  TOKEN_DIAGNOSTIC_CODE,
} from "../constants.js";
```

## 5. Package and directory structure

The default package layout is:

```text
packages/<capability>/
├── package.json
├── tsconfig.json
└── src/
    ├── constants.ts
    ├── contracts.ts
    ├── <domain>/
    │   ├── <behavior>.ts
    │   └── <behavior>.test.ts
    └── index.ts
```

- A package MUST own one cohesive capability and one dependency direction.
- `contracts.ts` MUST contain serializable contracts and typed errors, not I/O.
- Domain directories MUST group files by behavior or policy, not technical file
  type.
- Tests SHOULD be colocated with the behavior they verify.
- `index.ts` MUST be a deliberate public export surface. It MUST NOT contain
  business logic or wildcard-export private modules.
- Consumers MUST import another package through its declared `exports`; deep
  cross-package imports are forbidden.
- A package MUST NOT depend on a higher presentation or framework layer.
- Cyclic package dependencies are forbidden.

Repository-level ownership is fixed:

| Directory | Ownership rule |
| --- | --- |
| `docs/adr/` | architecture amendments and alternatives |
| `docs/ssot/` | normative system and domain rules |
| `docs/specs/` | normative human-readable annexes |
| `docs/standards/` | contributor and source-engineering rules |
| `spec/` | machine-readable normative contracts and conformance fixtures |
| `fixtures/` | external-source and integration inputs |
| `packages/` | independently checkable capability units |
| `scripts/` | repository-wide policy checks only |

## 6. Module design

A module SHOULD have one primary reason to change and a narrow public surface.
Separate parsing, validation, normalization, resolution, serialization, and I/O
when their failure modes or authorities differ.

Functions SHOULD be deterministic by default. Clock, randomness, filesystem,
network, and environment access MUST enter through an adapter or explicit input.
Core packages MUST use plain serializable data and MUST NOT import renderer or
framework concepts.

Prefer:

- exhaustive discriminated unions over boolean mode combinations;
- `unknown` plus validation at trust boundaries over unchecked casts;
- readonly inputs and outputs over shared mutation;
- explicit result or typed error contracts over stringly typed control flow;
- early returns and small named operations over nested control flow;
- one canonical representation over parallel aliases.

Avoid speculative abstractions. A shared module is created only after the shared
contract and owner are clear; proximity alone is not evidence of commonality.

## 7. Diagnostics and errors

Stable diagnostics MUST have a named code, severity, phase, human-readable
message, and location or target when available. Code meanings MUST be defined in
one package constants module and MUST NOT be reused for a different condition.

Errors crossing a package boundary MUST be typed. Messages are for humans and
must not be the only machine-readable discriminator. A caught error MUST either
be enriched and rethrown with `cause`, converted to a declared diagnostic, or
handled completely.

## 8. Tests, fixtures, and generated outputs

Every normative rule implemented in code SHOULD have:

1. a positive case;
2. a negative or boundary case;
3. a stable diagnostic assertion when failure is observable.

Normative JSON behavior belongs in `spec/fixtures/`. Parser-source behavior
belongs in `fixtures/`. Package-local unit mechanics belong beside the source.
Tests MUST be deterministic and MUST NOT depend on execution order or external
network state.

Generated files MUST identify their source, generator, schema/profile version,
and input digest. Generated outputs MUST be byte-stable and checked for drift.
Generated code MUST NOT be edited by hand.

## 9. Change and review protocol

Changes SHOULD be small, self-contained, and ordered by authority: contract,
fixture, implementation, integration. A change description MUST explain both
what changed and why the owning authority permits it.

Reviewers evaluate, in order:

1. authority and architecture;
2. correctness and failure behavior;
3. package boundaries and public API;
4. tests and conformance evidence;
5. complexity, naming, constants, comments, and documentation.

Every source change MUST pass:

```bash
pnpm check
pnpm test
pnpm build
```

`pnpm check` rejects version-bearing source names, missing package constants
modules, non-constant-case exported constants, package-boundary drift,
specification failures, and TypeScript errors. Literal intent still requires
review because a static rule cannot reliably distinguish every domain value
from ordinary syntax.

## 10. Public practice references

This standard is Axiom-specific; it does not claim access to private company
rules. Its reviewability and consistency goals are informed by public practices:

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
  for identifier forms, constants, and prescriptive language;
- [Google Code Review Standard](https://google.github.io/eng-practices/review/reviewer/standard.html)
  and [Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)
  for improving code health through reviewable changes;
- [Turborepo repository structure](https://turborepo.com/docs/crafting-your-repository/structuring-a-repository)
  and [TypeScript package guidance](https://turborepo.com/docs/guides/tools/typescript)
  for independently checkable workspace packages;
- [Meta's Glean engineering overview](https://engineering.fb.com/2024/12/19/developer-tools/glean-open-source-code-indexing/)
  for machine-readable code facts that support search, navigation, and
  documentation tooling.
