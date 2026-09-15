import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, inspectFoundationDocument, inspectStudioProject } from "../src/index.ts";
import { inspectFoundationPolicies } from "../src/foundation-policy-evaluation.ts";
import { planFoundationPolicyEdit } from "../src/foundation-policy-authoring.ts";
import type { FoundationPolicyEdit, FoundationPolicyRule } from "../src/foundation-policy-contracts.ts";
import { authoringFixture, source, brief } from "./foundation-authoring-fixtures.ts";

const rule = (predicate: FoundationPolicyRule["predicate"], severity: "warning" | "error" = "error"): Omit<FoundationPolicyRule, "ruleId"> => ({ name: "Design standard", scope: { kind: predicate.kind === "token-binding" ? "design" : "foundation" }, predicate, severity, rationale: "Keep the system consistent.", exceptionRef: null });

test("required policies preserve editable drafts and original source while blocking delivery", () => {
  const h = authoringFixture(true), before = canonicalJson(h.project);
  const plan = planFoundationPolicyEdit(h.project, { kind: "policy-create", rule: rule({ kind: "token-minimum", type: "color", count: 100 }) }, h.createId);
  assert.equal(plan.valid, true, brief(plan)); assert.equal(plan.updates.length, 1); assert.equal(plan.createdIds.length, 1);
  assert.equal(canonicalJson(h.project), before);
  assert.equal(plan.project.documents[source(plan.project).id]!.originalText, h.project.documents[source(h.project).id]!.originalText);
  assert.equal(inspectStudioProject(plan.project).valid, true);
  const report = inspectFoundationPolicies(plan.project);
  assert.equal(report.valid, true); assert.equal(report.canDeliver, false); assert.equal(report.violations[0]!.ruleId, plan.createdIds[0]);
  const updated = planFoundationPolicyEdit(plan.project, { kind: "policy-update", ruleId: plan.createdIds[0]!, rule: rule({ kind: "token-minimum", type: "color", count: 100 }, "warning") }, h.createId);
  assert.equal(updated.valid, true, brief(updated)); assert.equal(inspectFoundationPolicies(updated.project).canDeliver, true);
  assert.equal((source(updated.project).policies[0] as unknown as FoundationPolicyRule).ruleId, plan.createdIds[0]);
  const deleted = planFoundationPolicyEdit(updated.project, { kind: "policy-delete", ruleId: plan.createdIds[0]! }, h.createId);
  assert.equal(deleted.valid, true); assert.equal(source(deleted.project).policies.length, 0);
});

test("minimum token rules count type, domain, tier and exclude deprecated tokens", () => {
  const h = authoringFixture(true);
  let plan = h.plan(h.project, [{ kind: "classification-create", category: "domain", name: "Colors", allowedTypes: ["color"] }, { kind: "classification-create", category: "tier", name: "Semantic" }]);
  const [domain, tier] = plan.createdIds;
  plan = h.plan(plan.project, { kind: "token-update", id: "token.accent", domain: domain!, tier: tier! });
  const policy = planFoundationPolicyEdit(plan.project, { kind: "policy-create", rule: rule({ kind: "token-minimum", domain: domain!, tier: tier!, type: "color", count: 1 }) }, h.createId);
  assert.equal(policy.valid, true, brief(policy)); assert.equal(inspectFoundationPolicies(policy.project).canDeliver, true);
  const deprecated = h.plan(policy.project, { kind: "token-update", id: "token.accent", deprecated: "Replace this role" });
  assert.equal(deprecated.valid, true, brief(deprecated)); assert.equal(inspectFoundationPolicies(deprecated.project).canDeliver, false);
});

test("property rules distinguish literals and token classifications at exact Web and part locations", () => {
  const h = authoringFixture(true);
  const definition = rule({ kind: "token-binding", properties: ["gap", "padding"], mode: "token-only" });
  definition.scope = { kind: "design", componentId: "component.button", category: "Web" };
  const plan = planFoundationPolicyEdit(h.project, { kind: "policy-create", rule: definition }, h.createId);
  assert.equal(plan.valid, true, brief(plan));
  const report = inspectFoundationPolicies(plan.project);
  assert.ok(report.violations.length > 0); assert.ok(report.violations.every(item => item.componentId === "component.button" && item.category === "Web" && item.partId && item.path.startsWith("/layout/")));
  const literal = planFoundationPolicyEdit(h.project, { kind: "policy-create", rule: rule({ kind: "token-binding", properties: ["background"], mode: "literal-only" }) }, h.createId);
  assert.equal(literal.valid, true, brief(literal)); assert.ok(inspectFoundationPolicies(literal.project).violations.some(item => !!item.tokenId));
  const type = planFoundationPolicyEdit(h.project, { kind: "policy-create", rule: rule({ kind: "token-binding", properties: ["background"], mode: "any", type: "dimension" }) }, h.createId);
  assert.equal(type.valid, true, brief(type)); assert.equal(inspectFoundationPolicies(type.project).canDeliver, false);
});

test("semantic alias policy checks base and every authored theme override by stable tier identity", () => {
  const h = authoringFixture(true);
  let plan = h.plan(h.project, [{ kind: "classification-create", category: "tier", name: "Primitive" }, { kind: "classification-create", category: "tier", name: "Semantic" }]);
  const [primitive, semantic] = plan.createdIds;
  plan = h.plan(plan.project, [{ kind: "token-update", id: "token.accent", tier: primitive! }, { kind: "token-update", id: "token.action", tier: semantic! }]);
  assert.equal(plan.valid, true, brief(plan));
  const policy = planFoundationPolicyEdit(plan.project, { kind: "policy-create", rule: rule({ kind: "token-alias", tier: semantic!, targetTier: primitive! }) }, h.createId);
  assert.equal(policy.valid, true, brief(policy)); assert.equal(inspectFoundationPolicies(policy.project).canDeliver, true);
  const foundation = source(policy.project), axis = foundation.themeAxes[0]!;
  const changed = h.plan(policy.project, { kind: "theme-override-set", axisId: axis.id, context: "dark", id: "token.action", value: { literal: { colorSpace: "srgb", components: [0.1, 0.2, 0.3], alpha: 1 } } });
  assert.equal(changed.valid, true, brief(changed));
  const report = inspectFoundationPolicies(changed.project);
  assert.equal(report.canDeliver, false); assert.ok(report.violations.some(item => item.tokenId === "token.action" && item.path.includes("/overrides/dark/")));
});

test("malformed predicates, unknown classifications, approval claims and duplicate identities reject atomically", () => {
  const h = authoringFixture(true), before = canonicalJson(h.project);
  const invalid = [
    { ...rule({ kind: "token-minimum", count: 1 }), predicate: { kind: "script", code: "return true" } },
    rule({ kind: "token-minimum", count: 1, domain: "unknown" }),
    rule({ kind: "token-binding", properties: ["gap", "gap"], mode: "token-only" }),
    rule({ kind: "token-binding", properties: ["gap"], mode: "literal-only", type: "dimension" }),
    { ...rule({ kind: "token-minimum", count: 1 }), exceptionRef: { id: "fake.approval" } },
    { ...rule({ kind: "token-minimum", count: 1 }), scope: { kind: "design" } },
  ];
  for (const bad of invalid) {
    const plan = planFoundationPolicyEdit(h.project, [{ kind: "policy-create", rule: rule({ kind: "token-minimum", count: 1 }) }, { kind: "policy-create", rule: bad } as FoundationPolicyEdit], h.createId);
    assert.equal(plan.valid, false, canonicalJson(bad)); assert.equal(plan.updates.length, 0); assert.equal(canonicalJson(plan.project), before);
  }
  const collision = planFoundationPolicyEdit(h.project, { kind: "policy-create", rule: rule({ kind: "token-minimum", count: 1 }) }, () => "token.accent");
  assert.equal(collision.valid, false);
});

test("a deleted scope is a policy finding, and policy classification deletion cannot leave dangling records", () => {
  const h = authoringFixture(true);
  const scoped = { ...rule({ kind: "token-binding", properties: ["gap"], mode: "any" }), scope: { kind: "design", componentId: "component.missing" } as const };
  const plan = planFoundationPolicyEdit(h.project, { kind: "policy-create", rule: scoped }, h.createId);
  assert.equal(plan.valid, true, brief(plan)); assert.equal(inspectFoundationPolicies(plan.project).canDeliver, false);
  const definition = source(plan.project), policy = definition.policies[0] as unknown as FoundationPolicyRule;
  policy.ruleId = "token.accent";
  assert.equal(inspectFoundationDocument(definition).valid, false);
});

test("violations beyond the display limit remain enforced and opaque extensions are not interpreted", () => {
  const h = authoringFixture(true);
  const edits = Array.from({ length: 64 }, () => ({ kind: "policy-create", rule: rule({ kind: "token-binding", properties: ["gap", "padding", "minHeight"], mode: "token-only" }) } as const));
  const plan = planFoundationPolicyEdit(h.project, edits, h.createId);
  assert.equal(plan.valid, true, brief(plan));
  const report = inspectFoundationPolicies(plan.project);
  assert.equal(report.violations.length, 256); assert.equal(report.canDeliver, false); assert.ok(report.diagnostics.some(item => item.code === "FOUNDATION_POLICY_LIMIT"));
  const foundation = source(h.project); foundation.extensions = { policy: { script: "invalid-policy-is-opaque" } };
  assert.equal(inspectFoundationPolicies(h.project).canDeliver, true);
});
