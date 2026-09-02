# Token Governance Implementation Plan

> **For agentic workers:** Use test-driven-development for machine-readable
> contract changes and verification-before-completion before publishing.

**Goal:** Establish the authority and machine-readable vocabulary for the Token
clean break without migrating production Token values in this PR.

**Base:** `main` at Gate A N14. \
**Next PR:** `codex/migrate-oklch-semantic-colors` based on this PR head.

## Constraints

- Do not change `tokens/*.tokens.json`. Generated artifacts may change only in
  their source digest because the policy and vocabulary registry are generator
  inputs; Token IDs and resolved values must remain unchanged.
- Do not add Token compatibility aliases.
- Keep `.js` relative imports and document the NodeNext reason.
- The registry describes the approved target vocabulary; source-corpus
  conformance becomes mandatory when the final stack lands.
- Keep N15 and later Gate A implementation out of scope.

### Task 1: Lock the new specification inventory RED

**Files:**

- Modify `packages/spec-tooling/src/spec-harness.test.ts`
- Modify `spec/manifest.json`
- Create positive and negative `semantic-token-vocabulary` fixtures

1. Raise expected totals to 32 schemas, 14 registries, 25 positive fixtures,
   and 49 negative fixtures.
2. Assert a digest exists for `semantic-token-vocabulary`.
3. Register the future schema, registry, and fixture suite before creating the
   schema file.
4. Run the harness test and confirm it fails for the missing schema.

### Task 2: Implement the semantic vocabulary registry GREEN

**Files:**

- Create `spec/token/semantic-token-vocabulary.schema.json`
- Create `spec/token/semantic-token-vocabulary.json`
- Create `spec/fixtures/semantic-token-vocabulary/positive/valid.json`
- Create `spec/fixtures/semantic-token-vocabulary/negative/long-form-size.json`

The registry owns:

- clean-break compatibility mode;
- ordered `xs–xl` core scale and `xxs`/`xxl` extensions;
- excluded long-form scale segments;
- background/surface/fill purposes;
- canonical logical spacing family paths;
- removed paths `color.semantic.surface.sunken` and
  `space.semantic.overlap`.

Run the harness and specification CLI; confirm the new inventory and digest.

### Task 3: Link foundation policy to the registry

**Files:**

- Modify `spec/token/foundation-token-policy.schema.json`
- Modify `spec/token/foundation-token-policy.json`
- Modify both foundation policy fixtures
- Modify `packages/token-tooling/src/foundation-policy.ts`
- Modify `packages/token-tooling/src/foundation-policy.test.ts`

Add required `semanticVocabularyRegistry` with the exact value
`semantic-token-vocabulary`. Test the production policy and a mismatched value.
Do not enforce target paths against the old source corpus in this PR.

Add the registry content to the generated artifact source digest, regenerate,
and prove that Token IDs and resolved values did not change.

### Task 4: Reconcile authority documents and NodeNext imports

**Files:**

- Add ADR-0004 and the clean-break design
- Modify `docs/ssot/01-foundation-and-domain-contracts.md`
- Modify `docs/standards/source-code-and-module-structure.md`
- Modify `docs/README.md`

Document the palette, color fallback, semantic roles, size vocabulary, logical
spacing paths, ratio IDs, clean-break policy, stack activation, and `.js`
relative import rationale. Ensure external practices are cited as evidence, not
as private or universal standards.

### Task 5: Verify, review, and publish

Run focused tests, then all four acceptance commands. Review the diff for Token
source/generated drift and package dependency changes. Request an independent
read-only review, commit, publish the branch, and open the first stacked PR.
