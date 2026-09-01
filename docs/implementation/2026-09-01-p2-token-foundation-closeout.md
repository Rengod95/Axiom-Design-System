# P2 Token Foundation closeout — implementation report

**Date:** 2026-09-01  
**Status:** COMPLETE  
**Scope:** normative Token corpus, context resolution artifacts, generated
types, composite projector descriptors, and drift enforcement  
**Related plan:** [Foundation Reconciliation & Implementation Plan](../plans/2026-09-01-foundation-and-implementation-plan.md)

## Outcome

P2 now produces a complete renderer-independent Token Foundation from authored
DTCG 2025.10 sources:

```text
base + light/dark sources
        ↓
pinned parser adapter + Axiom value/profile validation
        ↓
tier graph and context resolver
        ↓
resolved manifest + generated Domain/tier/path types
```

The normative source corpus contains 84 Tokens across all 24 registered
Domains. The light and dark contexts each resolve to the same complete 84-Token
identity set. The current source digest is
`sha256:3f51f47c11cfdefae7c8cc76fc2986a98ab0f373e2ece0d69d2826e00a7f1137`.

## Authored and generated artifacts

| Artifact | Responsibility |
| --- | --- |
| `tokens/base.tokens.json` | Primitive, Semantic, and evidence-backed Component Tokens |
| `tokens/theme-light.tokens.json` | Light-context override source |
| `tokens/theme-dark.tokens.json` | Dark-context semantic overrides |
| `spec/token/foundation-resolved-token-manifest.json` | Byte-stable light/dark resolved result |
| `packages/tokens/src/generated/token-paths.ts` | Generated `TokenDomain`, `TokenTier`, and Domain-indexed `TokenPath` unions |
| `spec/token/composite-token-projector-registry.json` | Border, gradient, shadow, transition, and typography projector descriptors |

Every generated artifact records its input digest, generator version, and
schema version. `pnpm tokens:check` regenerates the expected bytes in memory and
fails on missing or drifted output; `pnpm tokens:generate` is the only supported
write path.

## Boundary decisions

- Terrazzo supplies parsing with alias resolution disabled and provider lint
  skipped; Axiom validates all 13 DTCG value shapes and the narrower unit/profile
  rules.
- Token identity comes from `<domain>.<tier>.*`, never from a filesystem path.
- Theme remains a resolver context, not a Token tier.
- Token Foundation owns projector descriptors. CSS serialization remains in
  the CSS/Appearance pipeline, and every projection must re-enter property and
  grammar validation.
- Generated contracts contain no renderer, React, Tailwind, or parser-owned
  object.

## Acceptance evidence

- all 13 DTCG types and whole-token aliases parse into serializable records;
- tier edges, cycles, Component promotion, context completeness, immutable
  identity, and post-resolution Domain constraints are tested;
- the normative resolved manifest passes schema and semantic validation;
- generated output is independent of caller source ordering and physical clone
  location because canonical source labels are fixed;
- `@axiom/tokens` remains renderer-independent.

Repository-wide results at closeout: 22 schemas, 10 registries, 14 positive
schema fixtures, 23 negative schema fixtures, and 55 unit/integration tests.
