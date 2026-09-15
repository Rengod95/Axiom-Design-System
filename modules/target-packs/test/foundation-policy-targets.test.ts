import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { inspectStudioProject, planFoundationPolicyEdit } from "../../ads-core/src/index.ts";
import { authoringFixture } from "../../ads-core/test/foundation-authoring-fixtures.ts";
import { generateTargetPack } from "../src/index.ts";

test("every delivery target enforces required Foundation rules while retaining advisory diagnostics", () => {
  const h = authoringFixture(true), digest = (text: string) => createHash("sha256").update(text).digest("hex");
  const definition = { name: "Color inventory", scope: { kind: "foundation" } as const, predicate: { kind: "token-minimum", type: "color", count: 100 } as const, severity: "error" as const, rationale: "Provide the minimum product palette.", exceptionRef: null };
  const required = planFoundationPolicyEdit(h.project, { kind: "policy-create", rule: definition }, h.createId);
  assert.equal(required.valid, true); assert.equal(inspectStudioProject(required.project).valid, true);
  const advisory = planFoundationPolicyEdit(required.project, { kind: "policy-update", ruleId: required.createdIds[0]!, rule: { ...definition, severity: "warning" } }, h.createId);
  assert.equal(advisory.valid, true);
  for (const target of ["react", "react-native", "swiftui", "compose"] as const) {
    const blocked = generateTargetPack(required.project, { target }, digest);
    assert.equal(blocked.valid, false, target); assert.equal(blocked.pack, undefined); assert.ok(blocked.diagnostics.some(item => item.code === "FOUNDATION_POLICY_VIOLATION" && item.severity === "error"));
    const allowed = generateTargetPack(advisory.project, { target }, digest);
    assert.equal(allowed.valid, true, JSON.stringify(allowed.diagnostics)); assert.ok(allowed.pack);
    assert.ok(allowed.pack.diagnostics.some(item => item.code === "FOUNDATION_POLICY_VIOLATION" && item.severity === "warning"));
  }
});
