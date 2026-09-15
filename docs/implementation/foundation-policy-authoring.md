# Foundation policy authoring and delivery enforcement

The author can add project rules for minimum token inventory, token-layer references, and component property bindings. Rules are reviewed ADS source changes with the existing save and Undo boundary. A required violation keeps the project editable and prevents target delivery; an advisory finding remains visible without blocking output. This follows [SYN03](../foundation/syntax/foundation-and-token-semantics.md) and [UX05](../foundation/experience/foundation-editor.md).

## Supported contract

Each `PolicyRule` carries `ruleId`, `name`, `scope`, `predicate`, `severity`, `rationale`, and `exceptionRef: null`. A rule identity is stable across edits and unique among Foundation entities. Policy names are display text, never binding authority. Rules do not change a token value, classification or component property automatically.

| Predicate | Meaning | Scope |
| --- | --- | --- |
| `token-minimum` | Count non-deprecated tokens matching optional type, domain and tier; require at least the selected count. | Foundation |
| `token-alias` | Every token in the selected tier and optional domain must contain a reference; optional target tier constrains every direct reference. Check base expressions and every authored theme override. | Foundation |
| `token-binding` | Require token references, literal values, or either. Optional type, domain and tier restrict token references. Check declared appearance, stack-layout and motion properties. | All components or one stable component ID; Web, Mobile or both |

`token-binding` checks authored declarations, including inactive conditional rules, rather than only the current visual winner. Absent optional properties are not invented or required by that predicate. `any` permits literals and constrains references when present. `literal-only` cannot simultaneously require a token classification. Motion source is common to both design categories, so a category-scoped motion rule checks the shared motion declaration. Core type and property-purpose validation remains independent and cannot be weakened by a policy.

`token-alias` is a direct-reference architecture rule. A composite expression may contain both references and literals; a target-tier constraint applies to every reference in that expression. This does not certify all leaves as primitive references or replace cycle/type validation.

## Editor workflow

Foundation → Policies presents the required/advisory result, each rule's scope and rationale, and exact findings. Add rule opens an inline form using the shared Axiom controls. Authors choose a declarative predicate, property chips and existing classifications, then add the rule to the common proposal. New rules default to advisory. Editing retains `ruleId`; deletion participates in review and Undo.

Findings carry source document and JSON-pointer locations plus token or component/element IDs. Locate opens the relevant inspector. A deleted component scope is reported rather than silently ignored. Removing a classification referenced by a policy is rejected until the rule is updated or removed. The original imported source bytes remain intact.

## Limits and evidence

The engine accepts at most 64 policies and returns at most 256 detailed findings. It still evaluates required failures beyond the display limit and emits an overflow diagnostic. Predicates are closed data structures; arbitrary scripts, unknown fields, unknown classifications and counterfeit exception records are rejected.

Approved exception lifecycle, organization-wide policy inheritance, custom predicate plugins, semantic color contrast rules and target-dependent unit conversion policies remain future work. Neither advisory severity nor a policy deletion waives mandatory accessibility, behavior or renderer validation.

Seven focused core tests cover source-preserving atomic plans, draft versus delivery validity, stable update/delete, type/domain/tier inventory, deprecation, component/category/property locations, theme override aliases, malformed policies, identity collisions, unknown component scopes and overflow enforcement. Integration and target-gate evidence is recorded with the parent delivery verification.
