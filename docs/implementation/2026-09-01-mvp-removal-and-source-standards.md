# MVP removal and source-standards implementation report

**Date:** 2026-09-01

**Status:** Complete

**Cleanup inputs:** `3cf949e03dbd22e56332eb1b8c7e36a1aa77d830`,
`c48d2927fbad2e4ab702c2de6092f981a1a794c7`

## Outcome

The pre-foundation executable MVP is no longer present as live implementation
context. Of the 61 files introduced by the scaffold commit, 47 obsolete files
were removed and 14 shared infrastructure or authority-entry files were
rebaselined against the current SSOT and package graph. The CI file changed by
the follow-up commit was removed and replaced by `quality.yml`.

Removed implementation packages:

- `@axiom/adapter-tailwind`;
- `@axiom/appearance-schema`;
- `@axiom/behavior`;
- `@axiom/react`;
- `@axiom/recipe-engine`;
- `@axiom/recipes`.

The initial token generator, handwritten token source, generated token outputs,
and local MVP resolver were also removed.

## Preserved post-foundation implementation

Later SSOT-based work remains authoritative implementation evidence:

- normative schemas, registries, and conformance fixtures in `spec/`;
- DTCG source fixtures in `fixtures/`;
- `@axiom/spec-tooling` and `@axiom/token-tooling`;
- token contracts, identity validation, context resolution, and deterministic
  manifest serialization in `@axiom/tokens`.

Token source was moved from a version-bearing directory into semantic
capability boundaries:

```text
packages/tokens/src/
├── constants.ts
├── contracts.ts
├── domain/
├── resolution/
└── index.ts
```

Version suffixes were removed from TypeScript symbols, documentation filenames,
fixture filenames, and public function names. Schema and profile versions remain
explicit contract data because compatibility checks require them.

## Permanent controls

- `AGENTS.md` makes the authority and source rules available to future coding
  agents before they modify the repository.
- `docs/standards/source-code-and-module-structure.md` defines naming, constants,
  package structure, diagnostics, tests, generated artifacts, and review gates.
- `scripts/check-source-standards.mjs` rejects version-bearing paths and source
  identifiers, requires one package constants module, and enforces
  `CONSTANT_CASE` for exported constants.
- `scripts/check-boundaries.mjs` validates the explicit package dependency graph
  and renderer-independent core.
- `.github/workflows/quality.yml` runs install, check, test, and build on pushes
  and pull requests.

## Verification

The completed baseline passes:

- `pnpm check`, including 16 schemas, 3 registries, 8 positive fixtures, and 17
  negative fixtures;
- `pnpm test`, with 43 tests across 5 files;
- `pnpm build` for all workspace packages;
- local Markdown-link validation for the documentation tree.
