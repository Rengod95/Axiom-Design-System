# Ordered Declaration Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Gate A item N14 with machine-readable CSS declaration value, origin, declaration, and ordered-list contracts plus positive and negative conformance evidence.

**Architecture:** Add small composable Draft 2020-12 schemas under `spec/css/`. The value schema owns the discriminated `css | token | css-template` algebra and reuses the existing common Token Reference; the declaration schema composes property identity, value, fixed `important: false`, and provenance; the list schema makes declaration order explicit without imposing uniqueness. The existing specification harness remains the only execution path, while CSS grammar and Token Domain validation stay deferred to N21.

**Tech Stack:** JSON Schema Draft 2020-12, Ajv 8 strict mode, TypeScript 7, Vitest 4, pnpm 11.

**Spec:** `docs/ssot/03-css-appearance-profile-and-property-policy.md` sections 7 and 9; sequencing and exit evidence in `docs/plans/2026-09-01-post-p3-foundation-review.md`.

## Global Constraints

- Branch from PR #4 head `94388a88aa528e1a77870e978dc83deb732c8483`; do not amend PR #4.
- Preserve the discriminants exactly as `css`, `token`, and `css-template`.
- Reuse `https://axiom.dev/schemas/common/token-reference/0.1`; do not duplicate Token Reference shape or path rules.
- Require `important` to be exactly `false` and preserve `origin.recipeId`, `origin.slot`, `origin.stage`, and `origin.source`.
- Model declaration collections as arrays and allow repeated properties because fallback and cascade order are normative.
- Do not add Recipe, Appearance IR, CSS compiler, runtime, or generated TypeScript contracts in N14.
- Do not perform property grammar or Token binding validation in the schema layer; those remain N21 responsibilities.
- Every new normative schema must be registered in `spec/manifest.json` and exercised through positive and negative fixtures.
- Final acceptance requires `pnpm check`, `pnpm test`, `pnpm build`, and `git diff --check`.

---

### Task 1: Lock the N14 specification inventory with failing harness expectations

**Files:**
- Modify: `packages/spec-tooling/src/spec-harness.test.ts`
- Modify: `spec/manifest.json`
- Create: `spec/fixtures/css-declaration-value/positive/literal.json`
- Create: `spec/fixtures/css-declaration-value/positive/token.json`
- Create: `spec/fixtures/css-declaration-value/positive/template.json`
- Create: `spec/fixtures/css-declaration-value/negative/empty-literal.json`
- Create: `spec/fixtures/css-declaration-value/negative/invalid-kind.json`
- Create: `spec/fixtures/css-declaration-value/negative/template-without-token.json`
- Create: `spec/fixtures/css-declaration-value/negative/invalid-token-reference.json`
- Create: `spec/fixtures/css-declaration/positive/variant-token.json`
- Create: `spec/fixtures/css-declaration/negative/important-true.json`
- Create: `spec/fixtures/css-declaration/negative/missing-origin.json`
- Create: `spec/fixtures/css-declaration/negative/invalid-property.json`
- Create: `spec/fixtures/css-declaration/negative/unknown-stage.json`
- Create: `spec/fixtures/css-ordered-declaration-list/positive/ordered-fallback.json`
- Create: `spec/fixtures/css-ordered-declaration-list/negative/property-map.json`
- Create: `spec/fixtures/css-ordered-declaration-list/negative/missing-item-origin.json`

**Interfaces:**
- Consumes: `checkSpecification(specRoot): Promise<SpecCheckReport>` and the existing manifest discovery protocol.
- Produces: manifest entries for five N14 schemas and three fixture suites; expected totals of 31 schemas, 13 registries, 24 positive fixtures, and 45 negative fixtures.

- [x] **Step 1: Raise the specification count expectations**

```ts
expect(report.schemaCount).toBe(31);
expect(report.registryCount).toBe(13);
expect(report.positiveFixtureCount).toBe(24);
expect(report.negativeFixtureCount).toBe(45);
```

- [x] **Step 2: Register the five schema IDs and three fixture suites**

| Schema ID | Path |
| --- | --- |
| `https://axiom.dev/schemas/css/property-name/0.1` | `css/property-name.schema.json` |
| `https://axiom.dev/schemas/css/declaration-value/0.1` | `css/declaration-value.schema.json` |
| `https://axiom.dev/schemas/css/declaration-origin/0.1` | `css/declaration-origin.schema.json` |
| `https://axiom.dev/schemas/css/declaration/0.1` | `css/declaration.schema.json` |
| `https://axiom.dev/schemas/css/ordered-declaration-list/0.1` | `css/ordered-declaration-list.schema.json` |

Register the following exact fixture suite IDs against their matching schemas
and `fixtures/<id>/positive` plus `fixtures/<id>/negative` directories:
`css-declaration-value`, `css-declaration`, and
`css-ordered-declaration-list`.

- [x] **Step 3: Add all positive and negative fixture documents**

Use these exact cases:

| Suite | Positive cases | Negative cases |
| --- | --- | --- |
| `css-declaration-value` | `{"kind":"css","value":"inline-flex"}`; a valid semantic color Token Reference; `calc(100% - <space token>)` split into string/Token/string parts | empty CSS value; `kind: "raw"`; template with only a string; invalid Token path `semantic.color.action.primary.default` |
| `css-declaration` | `background-color` Token declaration with `important: false` and variant provenance; valid `--brand-color` custom property | `important: true`; missing origin; camelCase property; origin stage `override`; vendor-prefixed property; uppercase custom property |
| `css-ordered-declaration-list` | two consecutive `background-color` CSS literal declarations with source suffixes `/0` and `/1` | property map instead of array; array item without origin |

Every declaration origin uses `recipeId`, `slot`, one registered `stage`, and a
non-empty `source`. The ordered fixture's first value is
`rgb(10 20 30 / 0.8)` and second value is `oklch(45% 0.08 250 / 0.8)`.

- [x] **Step 4: Run the harness test and verify RED**

Run: `pnpm vitest run packages/spec-tooling/src/spec-harness.test.ts`

Expected: FAIL because the newly declared schema files do not exist yet. This proves the manifest and fixture inventory is active before implementation.

### Task 2: Implement the composable declaration schemas

**Files:**
- Create: `spec/css/property-name.schema.json`
- Create: `spec/css/declaration-value.schema.json`
- Create: `spec/css/declaration-origin.schema.json`
- Create: `spec/css/declaration.schema.json`
- Create: `spec/css/ordered-declaration-list.schema.json`

**Interfaces:**
- Consumes: common Token Reference schema `https://axiom.dev/schemas/common/token-reference/0.1` and stable identifier schema `https://axiom.dev/schemas/common/identifier/0.1`.
- Produces: declaration schema ID `https://axiom.dev/schemas/css/declaration/0.1` and ordered list schema ID `https://axiom.dev/schemas/css/ordered-declaration-list/0.1` for N15 Appearance IR.

- [x] **Step 1: Add the CSS property-name contract**

Allow canonical kebab-case CSS properties and custom-property name syntax. Reject
vendor-prefixed properties; custom-property profile membership remains an N21
validation responsibility.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://axiom.dev/schemas/css/property-name/0.1",
  "title": "Axiom CSS Declaration Property Name",
  "type": "string",
  "pattern": "^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*|--[a-z0-9][a-z0-9-]*)$"
}
```

- [x] **Step 2: Add the discriminated declaration-value contract**

Define a `oneOf` for `{ kind: "css", value }`, the common Token Reference, and `{ kind: "css-template", parts }`. CSS literals must contain a non-whitespace character. Template parts contain strings or Token References and must include at least one Token Reference.

```json
{
  "oneOf": [
    { "$ref": "#/$defs/cssLiteral" },
    { "$ref": "https://axiom.dev/schemas/common/token-reference/0.1" },
    { "$ref": "#/$defs/cssValueTemplate" }
  ],
  "$defs": {
    "cssLiteral": {
      "type": "object",
      "required": ["kind", "value"],
      "properties": {
        "kind": { "const": "css" },
        "value": { "type": "string", "pattern": "\\S" }
      },
      "unevaluatedProperties": false
    },
    "templatePart": {
      "oneOf": [
        { "type": "string" },
        { "$ref": "https://axiom.dev/schemas/common/token-reference/0.1" }
      ]
    },
    "cssValueTemplate": {
      "type": "object",
      "required": ["kind", "parts"],
      "properties": {
        "kind": { "const": "css-template" },
        "parts": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/templatePart" },
          "contains": {
            "$ref": "https://axiom.dev/schemas/common/token-reference/0.1"
          },
          "minContains": 1
        }
      },
      "unevaluatedProperties": false
    }
  }
}
```

- [x] **Step 3: Add declaration provenance**

```json
{
  "type": "object",
  "required": ["recipeId", "slot", "stage", "source"],
  "properties": {
    "recipeId": { "$ref": "https://axiom.dev/schemas/common/identifier/0.1" },
    "slot": { "$ref": "https://axiom.dev/schemas/common/identifier/0.1" },
    "stage": { "enum": ["base", "variant", "state", "compound", "condition"] },
    "source": { "type": "string", "minLength": 1 }
  },
  "unevaluatedProperties": false
}
```

- [x] **Step 4: Compose declaration and ordered-list contracts**

The declaration requires `property`, `value`, `important`, and `origin`:

```json
{
  "type": "object",
  "required": ["property", "value", "important", "origin"],
  "properties": {
    "property": { "$ref": "https://axiom.dev/schemas/css/property-name/0.1" },
    "value": { "$ref": "https://axiom.dev/schemas/css/declaration-value/0.1" },
    "important": { "const": false },
    "origin": { "$ref": "https://axiom.dev/schemas/css/declaration-origin/0.1" }
  },
  "unevaluatedProperties": false
}
```

The ordered list contains declaration references and deliberately omits a
`uniqueItems` constraint:

```json
{
  "type": "array",
  "items": {
    "$ref": "https://axiom.dev/schemas/css/declaration/0.1"
  }
}
```

- [x] **Step 5: Run the harness test and verify GREEN**

Run: `pnpm vitest run packages/spec-tooling/src/spec-harness.test.ts`

Expected: PASS with 31 schemas, 13 registries, 24 positive fixtures, and 45 negative fixtures.

- [x] **Step 6: Run the specification CLI directly**

Run: `pnpm spec:check`

Expected: PASS with the same inventory totals and unchanged registry digests.

### Task 3: Reconcile Gate A sequencing and document N14 evidence

**Files:**
- Create: `docs/implementation/2026-09-02-ordered-declaration-contracts.md`
- Modify: `docs/README.md`
- Modify: `docs/plans/2026-09-01-foundation-and-implementation-plan.md`
- Modify: `docs/plans/2026-09-01-post-p3-foundation-review.md`

**Interfaces:**
- Consumes: verified schema and fixture inventory from Tasks 1–2.
- Produces: a durable N14 implementation report and an active sequence that names N15 as next without rewriting historical N12–N13 reports.

- [x] **Step 1: Write the implementation report**

Document the five schemas, three fixture suites, explicit order/provenance evidence, deferral of grammar and binding semantics to N21, acceptance counts, and N15 as the next boundary.

- [x] **Step 2: Update the active documentation index and sequence**

Add the report to `docs/README.md`; mark N14 done and N15 next in the active implementation plan; update the active post-P3 review table without changing the historical N12–N13 implementation report.

- [x] **Step 3: Run final verification**

Run: `pnpm check`

Expected: PASS for source standards, boundaries, TypeScript, generated Token/CSS drift, and all specification contracts.

Run: `pnpm test`

Expected: PASS for all Vitest suites.

Run: `pnpm build`

Expected: exit 0.

Run: `git diff --check`

Expected: exit 0 with no output.

- [x] **Step 4: Review and commit**

Review `git diff --stat`, `git diff -- spec packages/spec-tooling docs`, and ensure no package dependency or public export changed. Commit with:

```bash
git add docs packages/spec-tooling/src/spec-harness.test.ts spec
git commit -m "feat: add ordered declaration contracts"
```
