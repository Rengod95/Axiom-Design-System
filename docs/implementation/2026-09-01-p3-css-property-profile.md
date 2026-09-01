# P3 CSS Property Profile — implementation report

**Date:** 2026-09-01  
**Status:** COMPLETE for the property-profile gate  
**Scope:** pinned CSS metadata, sparse policy, effective registry, Token Binding
coverage, generated authoring types, snapshot diff, and CSS validation  
**Related plan:** [Foundation Reconciliation & Implementation Plan](../plans/2026-09-01-foundation-and-implementation-plan.md)

## Outcome

P3 replaces property allowlists with a reproducible complete profile:

```text
@webref/css 8.7.3 + sparse Axiom policy + Token Binding Catalog
                              ↓
                 818-property effective registry
                              ↓
     coverage report + generated types + validation services
```

The consolidated Webref input `css.json` is pinned at digest
`sha256:b26a0501c6ee972ca343d2f91be620aaef0c719ec5602a2a70f317fd22135d75`.
`css-tree` `3.2.1` validates CSS values, `csstype` `3.2.3` provides a
TypeScript compatibility projection, and none of these dependencies cross into
Token core or a renderer.

## Policy and generated outputs

| Artifact | Evidence |
| --- | --- |
| `spec/css/profile-input-manifest.json` | exact Webref path/version/digest and policy digest |
| `spec/css/sparse-property-policy.json` | standard, experimental, deprecated, legacy, vendor, group, override, block, and custom-property defaults |
| `spec/css/token-binding-catalog.json` | direct/template/projector Domain permissions and governed negation |
| `spec/css/effective-property-registry.json` | 818 normalized properties, shorthand relations, aliases, authoring map, policy, and provenance |
| `spec/css/token-binding-coverage.json` | Domain-to-property, projector-to-property, and property-to-binding coverage |
| `packages/css-property-profile/src/generated/css-property-names.ts` | pinned kebab-case and camelCase property unions |

Physical and logical margin, padding, inset, gap, and scroll-spacing families
are expanded from Webref shorthand metadata. Margin and inset permit explicit
Token negation; padding and gap reject it. Composite bindings reference only
registered projector descriptors.

## Validation behavior

The CSS validation service:

- accepts raw CSS for ungoverned standard properties such as
  `grid-template-columns`;
- blocks raw values where a governed policy requires Tokens, including paint;
- distinguishes direct Domain, template Domain, and projector paths;
- requires explicit experimental-property opt-in;
- blocks vendor/legacy aliases, unknown properties, undeclared custom
  properties, `all`, `!important`, embedded declarations, and the blocked
  `revert-layer` keyword;
- returns stable `AXP` diagnostics and exposes no CSSTree AST.

Legacy aliases remain in the generated map for migration diagnostics but are
not accepted as authoring keys. Snapshot differences classify added, removed,
and policy-changed properties deterministically.

## Acceptance evidence

Tests prove the unannotated raw-CSS default, background-color direct color
binding, all required margin/padding members, negation boundaries,
grid-template size templates, box-shadow space/blur/color templates and shadow
projector, experimental opt-in, vendor/custom/unknown handling, shorthand
metadata, generator determinism, profile diffing, and grammar mismatch
diagnostics.

`pnpm profile:check` fails when any generated registry, coverage report, or
property type differs from the pinned inputs. P3 deliberately stops before
Recipe authoring and Appearance normalization; those begin at P4 and consume
this profile through its public contracts.

Resource-bearing properties carry an explicit `allowed`/`reported`/`blocked`
policy at P3. Resource extraction, manifest emission, protocol/path policy, and
final-output comparison remain declaration/IR/compiler responsibilities; P3
does not silently treat the policy marker as a completed resource scanner.
