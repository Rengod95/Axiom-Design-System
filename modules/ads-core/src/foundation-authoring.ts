import { applyDtcgImport } from "./foundation-import-authoring.ts";
import { canonicalJson } from "./canonical-json.ts";
import { isObject, isValidId } from "./documents.ts";
import { STUDIO_PROFILE } from "./constants.ts";
import { inspectLocalReferences } from "./local-references.ts";
import { inspectStudioProject } from "./studio-projection.ts";
import { studioDiagnostic } from "./studio-validation.ts";
import { authoringFoundation, authoringList, captureAuthoringProject, foundationReferences } from "./foundation-authoring-internal.ts";
import { applyFoundationTokenEdit } from "./foundation-authoring-token-ops.ts";
import { applyFoundationThemeEdit } from "./foundation-authoring-theme-ops.ts";
import { applyFoundationStarter } from "./foundation-starters.ts";
import type { ProjectSnapshot } from "./contracts.ts";
import type { FoundationSelection } from "./foundation-contracts.ts";
import type { FoundationAuthoringEdit, FoundationEditPlan } from "./foundation-authoring-contracts.ts";
import type { StudioUsage } from "./studio-contracts.ts";

export const MAX_FOUNDATION_AUTHORING_EDITS = 128;
const FIELDS: Readonly<Record<string, readonly [readonly string[], readonly string[]]>> = {
  "dtcg-import": [["sourceText", "sourceName", "conflicts"], ["prefix", "format", "inputs", "sources"]],
  "template-apply": [["domains"], ["accent", "fontFamily", "density", "template"]],
  "token-create": [["name", "type", "value"], ["description", "domain", "tier"]],
  "token-update": [["id"], ["name", "description", "domain", "tier", "deprecated"]],
  "token-delete": [["id"], ["replacementId"]], "token-duplicate": [["id", "name"], []],
  "token-alias": [["id", "targetId"], []], "token-literal": [["id", "value"], []], "token-expression": [["id", "value"], []],
  "classification-create": [["category", "name"], ["description", "allowedTypes", "bindingCategory"]],
  "classification-update": [["category", "id"], ["name", "description", "allowedTypes", "bindingCategory"]],
  "classification-delete": [["category", "id"], ["replacementId"]],
  "theme-axis-create": [["name", "contexts", "default"], ["description"]],
  "theme-axis-update": [["id"], ["name", "description", "default"]], "theme-axis-delete": [["id"], []],
  "theme-context-add": [["axisId", "name"], ["copyFrom"]], "theme-context-rename": [["axisId", "context", "name"], []],
  "theme-context-delete": [["axisId", "context"], ["replacement"]],
  "theme-set-create": [["name", "contexts"], ["description"]], "theme-set-update": [["id"], ["name", "description", "contexts"]], "theme-set-delete": [["id"], []],
  "theme-override-set": [["axisId", "context", "id", "value"], []], "theme-override-remove": [["axisId", "context", "id"], []],
  "theme-order": [["axisIds"], []],
};
function capturedEdits(input: FoundationAuthoringEdit | readonly FoundationAuthoringEdit[]): FoundationAuthoringEdit[] {
  const value: unknown = JSON.parse(canonicalJson(input)), edits = Array.isArray(value) ? value : [value];
  if (!edits.length || edits.length > MAX_FOUNDATION_AUTHORING_EDITS) throw new Error(`Select between 1 and ${MAX_FOUNDATION_AUTHORING_EDITS} authoring operations.`);
  for (const edit of edits) {
    if (!isObject(edit) || typeof edit.kind !== "string" || !Object.hasOwn(FIELDS, edit.kind)) throw new Error("Unknown Foundation authoring operation.");
    const [required, optional] = FIELDS[edit.kind]!;
    if (Object.keys(edit).some(key => key !== "kind" && !required.includes(key) && !optional.includes(key)) || required.some(key => !Object.hasOwn(edit, key))) throw new Error("Invalid fields for the selected Foundation authoring operation.");
    if (edit.kind.endsWith("-update") && !optional.some(key => Object.hasOwn(edit, key))) throw new Error("Select at least one field to update.");
    if (edit.kind.endsWith("-create") && optional.some(key => edit[key] === null)) throw new Error("Omit unset creation fields; null only clears optional fields in explicit update operations.");
  }
  return edits as FoundationAuthoringEdit[];
}

function affectedUses(before: ProjectSnapshot, after: ProjectSnapshot): StudioUsage[] {
  const oldFoundation = authoringFoundation(before), foundation = authoringFoundation(after);
  const previous = new Map(oldFoundation.tokens.map(token => [token.id, canonicalJson(token)]));
  const changed = new Set<string>();
  for (const token of foundation.tokens) { if (previous.get(token.id) !== canonicalJson(token)) changed.add(token.id); previous.delete(token.id); }
  for (const id of previous.keys()) changed.add(id);
  // Theme structure can affect another context even when the currently shown value is unchanged.
  if (canonicalJson(oldFoundation.themeAxes) !== canonicalJson(foundation.themeAxes) || canonicalJson(oldFoundation.themeSets) !== canonicalJson(foundation.themeSets) || canonicalJson(oldFoundation.resolutionOrder) !== canonicalJson(foundation.resolutionOrder)) for (const token of [...oldFoundation.tokens, ...foundation.tokens]) changed.add(token.id);
  const references = [...foundationReferences(before, oldFoundation), ...foundationReferences(after, foundation)].map(item => item.reference);
  const aliases = new Map<string, Set<string>>();
  for (const reference of references) if (reference.ownerTokenId && (reference.kind === "alias" || reference.kind === "theme-alias")) {
    const targets = aliases.get(reference.tokenId) ?? new Set<string>(); targets.add(reference.ownerTokenId); aliases.set(reference.tokenId, targets);
  }
  const queue = [...changed];
  for (let index = 0; index < queue.length; index++) for (const id of aliases.get(queue[index]!) ?? []) if (!changed.has(id)) { changed.add(id); queue.push(id); }
  const usages = new Map<string, StudioUsage>();
  for (const reference of references) if ((reference.kind === "design" || reference.kind === "motion") && changed.has(reference.tokenId) && reference.componentId && reference.partId) {
    const usage = { componentId: reference.componentId, partId: reference.partId, documentId: reference.documentId, path: reference.path };
    usages.set(canonicalJson(usage), usage);
  }
  return [...usages.values()];
}

/** Curated source edits share the existing reviewed command and one-Undo transaction boundary. */
export function planFoundationEdit(input: ProjectSnapshot, editInput: FoundationAuthoringEdit | readonly FoundationAuthoringEdit[], createId: () => string, selectionInput: FoundationSelection = {}, digest?: (text: string) => string): FoundationEditPlan {
  let baseline: ProjectSnapshot = { id: "invalid", name: "Invalid source", revision: "invalid", documents: {} };
  let selection: FoundationSelection = {};
  let originalSelection: FoundationSelection = {};
  let editIndex = 0;
  try {
    baseline = captureAuthoringProject(input);
    const project = captureAuthoringProject(baseline), foundation = authoringFoundation(project), edits = capturedEdits(editInput);
    const selected: unknown = JSON.parse(canonicalJson(selectionInput));
    if (!isObject(selected) || Object.keys(selected).some(key => !["themeSetId", "contexts"].includes(key)) || selected.themeSetId !== undefined && typeof selected.themeSetId !== "string"
      || selected.contexts !== undefined && (!isObject(selected.contexts) || !Object.values(selected.contexts).every(value => typeof value === "string"))) throw new Error("Invalid transient theme selection.");
    selection = selected as FoundationSelection;
    originalSelection = JSON.parse(canonicalJson(selection)) as FoundationSelection;
    const allocated = new Set(inspectLocalReferences(project.documents, project.id).entities.map(entity => entity.id));
    for (const entry of Object.values(project.documents)) allocated.add(entry.document.revision);
    for (const field of ["tokens", "domains", "tiers", "themeAxes", "themeSets"] as const) for (const item of authoringList(foundation[field])) if (typeof item.id === "string") allocated.add(item.id);
    const createdIds: string[] = [];
    const allocate = (entity: boolean): string => { const id = createId(); if (!isValidId(id) || allocated.has(id)) throw new Error("Identity service must return a fresh valid identity."); allocated.add(id); if (entity) createdIds.push(id); return id; };
    for (const edit of edits) {
      if (edit.kind === "dtcg-import") applyDtcgImport(foundation, edit, () => allocate(true), digest);
      else if (edit.kind === "template-apply") applyFoundationStarter(foundation, edit, () => allocate(true));
      else if (!applyFoundationTokenEdit(project, foundation, edit, () => allocate(true))) applyFoundationThemeEdit(foundation, edit, () => allocate(true), selection);
      editIndex++;
    }
    const updates: FoundationEditPlan["updates"] = [];
    for (const [id, entry] of Object.entries(project.documents)) {
      const original = baseline.documents[id]!;
      if (canonicalJson(entry.document) === canonicalJson(original.document)) continue;
      const expectedRevision = original.document.revision, revision = allocate(false);
      entry.document.revision = revision;
      if (entry.document.id === foundation.id) for (const axis of foundation.themeAxes) if (axis.scope.revision === expectedRevision) axis.scope.revision = revision;
      project.documents[id] = { ...entry, currentText: canonicalJson(entry.document), currentSourceUri: "studio:foundation-editor", validationProfile: STUDIO_PROFILE };
      updates.push({ document: entry.document, expectedRevision });
    }
    const report = inspectStudioProject(project, selection);
    if (!report.valid) return { valid: false, diagnostics: report.diagnostics, baseRevision: baseline.revision, updates: [], impact: [], project: baseline, createdIds: [], selection: originalSelection };
    const retainedIds = new Set([foundation.id, ...["tokens", "domains", "tiers", "themeAxes", "themeSets"].flatMap(key => authoringList(foundation[key]).map(item => item.id))]);
    return { valid: true, diagnostics: report.diagnostics, baseRevision: baseline.revision, updates, impact: affectedUses(baseline, project), project, createdIds: createdIds.filter(id => retainedIds.has(id)), selection };
  } catch (error) {
    return { valid: false, diagnostics: [studioDiagnostic("memory:foundation-authoring", `/edits/${editIndex}`, error instanceof Error ? error.message : "Invalid Foundation edit.", "FOUNDATION_AUTHORING_INVALID")], baseRevision: baseline.revision, updates: [], impact: [], project: baseline, createdIds: [], selection: {} };
  }
}
