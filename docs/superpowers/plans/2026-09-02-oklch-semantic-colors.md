# OKLCH and Semantic Color Migration Plan

> **For agentic workers:** Use test-driven-development for validators and
> verification-before-completion before publishing.

**Goal:** Migrate the complete production color corpus to the accepted OKLCH
profile and separate environmental backgrounds, contained surfaces, and fills.

**Base:** Token Governance PR head. \
**Next PR:** `codex/normalize-semantic-scales-and-ratios` based on this PR head.

## Constraints

- Every palette is exactly `50–900`; absolute endpoints live under `common`.
- Every explicit color is OKLCH with alpha and lowercase six-digit hex.
- No old `surface.sunken`, `action.*` fill family, `neutral.0/950/1000`, or
  chromatic `.950` path remains in active sources/generated artifacts.
- Preserve two complete light/dark contexts and all contrast thresholds.
- Do not change size, space, typography, or aspect-ratio paths.

### Task 1: Add failing OKLCH profile tests

**Files:**

- Modify `packages/token-tooling/src/foundation-policy.test.ts`
- Add `packages/token-tooling/src/oklch-color.test.ts`
- Modify `spec/token/foundation-token-policy.schema.json` and fixtures first

Add RED cases for wrong color space, missing/invalid hex, excess precision,
fallback mismatch, missing common endpoint, `.950` scale entries, and light or
dark contrast regression.

### Task 2: Implement deterministic color-profile validation

**Files:**

- Add `packages/token-tooling/src/oklch-color.ts`
- Modify `packages/token-tooling/src/foundation-policy.ts`
- Modify `packages/token-tooling/src/constants.ts`
- Modify the foundation policy schema, registry data, and fixtures

Implement OKLCH-to-linear-sRGB conversion, chroma-reduction gamut mapping,
lowercase hex serialization, hex parsing for WCAG relative luminance, and policy
diagnostics. Keep the capability internal to `token-tooling`.

### Task 3: Migrate primitive palettes and all embedded colors

**Files:**

- Modify `tokens/base.tokens.json`

Convert the existing palette colors to deterministic OKLCH coordinates, add
`common.white/black`, remove disallowed shades, and convert embedded gradient
and shadow colors. Use a deterministic mechanical migration and review every
changed family; do not hand-edit generated artifacts.

### Task 4: Rebuild semantic roles and themes

**Files:**

- Modify all three Token source files
- Modify current normative Token-reference fixtures and examples
- Modify component color aliases and contrast pairs

Create `background`, `surface`, and `fill` families with non-overlapping
purposes. Remove `sunken` and `action`, migrate component aliases, and update
status background names where they describe painted regions. Keep shadow
elevation separate.

### Task 5: Regenerate and prove the color contract

Run `pnpm tokens:generate`, inspect the manifest and generated `TokenPath`
changes, then run focused and full verification. Add an implementation report,
request independent review, commit, publish, and open the second stacked PR.
