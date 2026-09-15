import { canonicalJson } from "./canonical-json.ts";
import { STUDIO_PROFILE } from "./constants.ts";
import { isObject, isValidId } from "./documents.ts";
import { authoringFoundation, captureAuthoringProject } from "./foundation-authoring-internal.ts";
import { inspectLocalReferences } from "./local-references.ts";
import { inspectStudioProject } from "./studio-projection.ts";
import type { JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { FoundationSelection } from "./foundation-contracts.ts";
import type { FoundationEditPlan } from "./foundation-authoring-contracts.ts";
import type { FoundationPolicyEdit } from "./foundation-policy-contracts.ts";

/** Submit the resulting source through the controller's ordinary review/apply boundary. */
export function planFoundationPolicyEdit(input: ProjectSnapshot, editInput: FoundationPolicyEdit | readonly FoundationPolicyEdit[], createId: () => string, selection: FoundationSelection = {}): FoundationEditPlan {
  let baseline: ProjectSnapshot = { id: "invalid", name: "Invalid source", revision: "invalid", documents: {} };
  const failed = (message: string): FoundationEditPlan => ({ valid: false, baseRevision: baseline.revision, project: baseline, updates: [], impact: [], createdIds: [], selection, diagnostics: [{ code: "FOUNDATION_POLICY_AUTHORING_INVALID", phase: "document", severity: "error", sourceRef: "memory:policy-authoring", path: "/policies", message }] });
  try {
    baseline = captureAuthoringProject(input);
    const project = captureAuthoringProject(baseline), foundation = authoringFoundation(project);
    const value: unknown = JSON.parse(canonicalJson(editInput)), edits = Array.isArray(value) ? value : [value];
    if (!edits.length || edits.length > 64) return failed("Choose between one and 64 policy edits.");
    const allocated = new Set(inspectLocalReferences(project.documents, project.id).entities.map(entity => entity.id));
    for (const entry of Object.values(project.documents)) allocated.add(entry.document.revision);
    for (const item of foundation.policies) if (isObject(item) && typeof item.ruleId === "string") allocated.add(item.ruleId);
    const allocate = () => { const id = createId(); if (!isValidId(id) || allocated.has(id)) throw new Error("Identity service must return a fresh valid identity."); allocated.add(id); return id; };
    const createdIds: string[] = [];
    for (const edit of edits) {
      if (!isObject(edit) || !["policy-create", "policy-update", "policy-delete"].includes(String(edit.kind)) || typeof edit.kind !== "string") return failed("Choose a supported policy edit.");
      const required = edit.kind === "policy-create" ? ["kind", "rule"] : edit.kind === "policy-update" ? ["kind", "ruleId", "rule"] : ["kind", "ruleId"];
      if (Object.keys(edit).length !== required.length || required.some(key => !Object.hasOwn(edit, key))) return failed("Invalid fields for this policy edit.");
      if (edit.kind !== "policy-delete" && (!isObject(edit.rule) || Object.hasOwn(edit.rule, "ruleId"))) return failed("Policy fields must be an object without a replacement identity.");
      if (edit.kind === "policy-create") { const ruleId = allocate(); foundation.policies.push({ ...edit.rule as object, ruleId } as JsonValue); createdIds.push(ruleId); }
      else {
        const index = foundation.policies.findIndex(rule => isObject(rule) && rule.ruleId === edit.ruleId);
        if (index < 0) return failed("The selected policy no longer exists.");
        if (edit.kind === "policy-delete") foundation.policies.splice(index, 1);
        else foundation.policies[index] = { ...edit.rule as object, ruleId: edit.ruleId } as JsonValue;
      }
    }
    const original = baseline.documents[foundation.id]!, changed = canonicalJson(original.document) !== canonicalJson(foundation);
    if (!changed) return { valid: true, baseRevision: baseline.revision, project: baseline, updates: [], impact: [], createdIds: [], selection, diagnostics: [] };
    foundation.revision = allocate();
    for (const axis of foundation.themeAxes) if (axis.scope.revision === original.document.revision) axis.scope.revision = foundation.revision;
    project.documents[foundation.id] = { ...project.documents[foundation.id]!, document: foundation, validationProfile: STUDIO_PROFILE, currentText: canonicalJson(foundation), currentSourceUri: "studio:policy-editor" };
    const report = inspectStudioProject(project, selection);
    if (!report.valid) return { ...failed("The policy source is invalid."), diagnostics: report.diagnostics };
    return { valid: true, baseRevision: baseline.revision, project, updates: [{ document: foundation, expectedRevision: original.document.revision }], impact: Object.values(report.usages).flat(), createdIds: createdIds.filter(id => foundation.policies.some(rule => isObject(rule) && rule.ruleId === id)), selection, diagnostics: [] };
  } catch (error) { return failed(error instanceof Error ? error.message : "Invalid policy source."); }
}
