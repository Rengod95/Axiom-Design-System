import type { AdsDocument, Diagnostic, JsonObject, ProjectSnapshot } from "./contracts.ts";
import type { StudioComponentEdit, StudioComponentPlan } from "./studio-catalog-contracts.ts";
import { canonicalJson } from "./canonical-json.ts";
import { isObject, isValidId } from "./documents.ts";
import { inspectStudioProject } from "./studio-projection.ts";
import { inspectLocalReferences } from "./local-references.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";
import { createCatalogSources, duplicateComponentSources } from "./studio-catalog-sources.ts";
import { mutateStudioComponent } from "./studio-component-mutations.ts";
import { STUDIO_CATALOG_CODE } from "./studio-catalog-constants.ts";
import { MAX_BATCH_BYTES, STUDIO_FORMAT, STUDIO_PROFILE } from "./constants.ts";
import { KernelError } from "./kernel-error.ts";

interface Context { project: ProjectSnapshot; id(): string; component(id: string): AdsDocument; designs(id: string): AdsDocument[] }
const EMPTY_PROJECT: ProjectSnapshot = { id: "invalid", revision: "invalid", name: "Invalid source", documents: {} };
function fail(message: string): never { throw new KernelError(STUDIO_CATALOG_CODE.invalid, message); }
function object(value: unknown, required: readonly string[], optional: readonly string[] = []): JsonObject {
  if (!isObject(value) || required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail("Invalid component plan options.");
  return value;
}
function diagnostic(error: unknown): Diagnostic { return { code: error instanceof KernelError ? error.code : STUDIO_CATALOG_CODE.invalid, phase: "document", severity: "error", message: error instanceof Error ? error.message : "Invalid component authoring request." }; }

function plan(input: ProjectSnapshot, options: unknown, createId: () => string, apply: (context: Context, options: JsonObject) => void): StudioComponentPlan {
  let before = EMPTY_PROJECT;
  try {
    const detached: unknown = JSON.parse(canonicalJson(input, MAX_BATCH_BYTES));
    if (!isObject(detached) || !isValidId(detached.id) || !isValidId(detached.revision) || !isObject(detached.documents)) fail("Invalid Studio project snapshot.");
    before = detached as unknown as ProjectSnapshot;
    const previous = inspectStudioProject(before);
    if (!previous.valid) return { valid: false, diagnostics: previous.diagnostics, baseRevision: before.revision, changes: { upserts: [], deletes: [] }, impact: [], project: before };
    const data: unknown = JSON.parse(canonicalJson(options, MAX_BATCH_BYTES)); if (!isObject(data)) fail("Component plan options must be plain JSON.");
    const project = structuredClone(before), seen = new Set(inspectLocalReferences(project.documents, project.id).entities.map(entity => entity.id));
    const context: Context = { project,
      id() { const id = createId(); if (!isValidId(id) || seen.has(id)) fail("Identity service must provide distinct valid IDs."); seen.add(id); return id; },
      component(id) { const entry = typeof id === "string" && Object.hasOwn(project.documents, id) ? project.documents[id] : undefined; if (!entry || entry.document.kind !== "component") fail("Component no longer exists in this project."); return entry.document; },
      designs(id) { return Object.values(project.documents).map(entry => entry.document).filter(document => document.kind === "design" && isObject(document.componentRef) && document.componentRef.id === id); },
    };
    apply(context, data);
    const changedComponents = new Map<string, string>();
    for (const [id, entry] of Object.entries(project.documents)) {
      const original = before.documents[id];
      if (original && canonicalJson(original.document) !== canonicalJson(entry.document)) { entry.document.revision = context.id(); if (entry.document.kind === "component") changedComponents.set(id, entry.document.revision); }
    }
    for (const entry of Object.values(project.documents)) {
      const ref = entry.document.componentRef;
      if (entry.document.kind === "design" && isObject(ref) && ref.revision !== undefined && typeof ref.id === "string" && changedComponents.has(ref.id)) {
        ref.revision = changedComponents.get(ref.id)!;
        if (entry.document.revision === before.documents[entry.document.id]?.document.revision) entry.document.revision = context.id();
      }
    }
    const changes: StudioComponentPlan["changes"] = { upserts: [], deletes: [] };
    for (const [id, entry] of Object.entries(project.documents)) {
      const original = before.documents[id]; if (original && canonicalJson(original.document) === canonicalJson(entry.document)) continue;
      entry.currentText = canonicalJson(entry.document); entry.currentSourceUri = "studio:component-authoring";
      changes.upserts.push({ document: structuredClone(entry.document), ...(original ? { expectedRevision: original.document.revision } : {}) });
    }
    for (const [id, entry] of Object.entries(before.documents)) if (!Object.hasOwn(project.documents, id)) changes.deletes.push({ id, expectedKind: entry.document.kind, revision: entry.document.revision });
    const report = inspectStudioProject(project), changed = new Set([...changes.upserts.map(item => item.document.id), ...changes.deletes.map(item => item.id)]);
    const impact = Object.values(previous.usages).flat().filter(usage => changed.has(usage.documentId) || changed.has(usage.componentId));
    if (!changes.upserts.length && !changes.deletes.length) return { valid: false, diagnostics: [diagnostic(new Error("The selected edit does not change the source."))], baseRevision: before.revision, changes: { upserts: [], deletes: [] }, impact: [], project: before };
    return { valid: report.valid, diagnostics: report.diagnostics, baseRevision: before.revision, changes: report.valid ? changes : { upserts: [], deletes: [] }, impact, project: report.valid ? project : before };
  } catch (error) { return { valid: false, diagnostics: [diagnostic(error)], baseRevision: before.revision, changes: { upserts: [], deletes: [] }, impact: [], project: before }; }
}
function insert(context: Context, documents: AdsDocument[]): void {
  for (const document of documents) {
    if (Object.hasOwn(context.project.documents, document.id)) fail("Document identity already exists.");
    context.project.documents[document.id] = { document, originalText: canonicalJson(document), sourceUri: "studio:component-authoring", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] };
  }
}

/** Add one catalog component and both category designs; nothing persists before common review/apply. */
export function planStudioComponentCreate(project: ProjectSnapshot, options: { catalogId: string; name?: string }, createId: () => string): StudioComponentPlan {
  return plan(project, options, createId, (context, data) => {
    object(data, ["catalogId"], ["name"]);
    if (typeof data.catalogId !== "string") fail("Choose a canonical catalog component.");
    const recipe = getStudioCatalogRecipe(data.catalogId); if (!recipe || recipe.entry.kind !== "component") fail("This catalog entry is a part, template or utility and cannot be inserted as an independent component.");
    const name = data.name ?? recipe.entry.name; if (typeof name !== "string" || !name.trim()) fail("Component name must be nonempty text.");
    const foundation = Object.values(context.project.documents).find(entry => entry.document.kind === "foundation")?.document; if (!foundation) fail("Create a Foundation before adding components.");
    insert(context, createCatalogSources(recipe, foundation, name, context.id));
  });
}
/** Duplicate all owned IDs; preserve external references and opaque metadata as source data. */
export function planStudioComponentDuplicate(project: ProjectSnapshot, options: { componentId: string; name?: string }, createId: () => string): StudioComponentPlan {
  return plan(project, options, createId, (context, data) => {
    object(data, ["componentId"], ["name"]); if (typeof data.componentId !== "string") fail("Choose a stable component identity.");
    const component = context.component(data.componentId), name = data.name ?? `${component.name} copy`;
    if (typeof name !== "string" || !name.trim()) fail("Component name must be nonempty text.");
    insert(context, duplicateComponentSources(component, context.designs(component.id), name, context.id));
  });
}
/** Delete a definition and its designs together; complete graph validation protects external dependents. */
export function planStudioComponentDelete(project: ProjectSnapshot, options: { componentId: string }): StudioComponentPlan {
  return plan(project, options, () => fail("Deletion must not allocate an identity."), (context, data) => {
    object(data, ["componentId"]); if (typeof data.componentId !== "string") fail("Choose a stable component identity.");
    const component = context.component(data.componentId);
    for (const document of [component, ...context.designs(component.id)]) delete context.project.documents[document.id];
  });
}
/** Multiple edits on one component share one source revision and one reviewed transaction. */
export function planStudioComponentEdit(project: ProjectSnapshot, options: { componentId: string; edit: StudioComponentEdit | StudioComponentEdit[] }, createId: () => string): StudioComponentPlan {
  return plan(project, options, createId, (context, data) => {
    object(data, ["componentId", "edit"]); if (typeof data.componentId !== "string") fail("Choose a stable component identity.");
    const edits = Array.isArray(data.edit) ? data.edit : [data.edit]; if (!edits.length || edits.length > 64) fail("Use 1–64 explicit component edits.");
    for (const edit of edits) mutateStudioComponent(context.component(data.componentId), context.designs(data.componentId), edit as unknown as StudioComponentEdit, context.id);
  });
}
/** Batch selected-object edits across components without partial commits or UI-coordinate side effects. */
export function planStudioComponentBatch(project: ProjectSnapshot, options: { edits: { componentId: string; edit: StudioComponentEdit }[] }, createId: () => string): StudioComponentPlan {
  return plan(project, options, createId, (context, data) => {
    object(data, ["edits"]); if (!Array.isArray(data.edits) || !data.edits.length || data.edits.length > 64) fail("Use 1–64 selected-object edits.");
    for (const entry of data.edits) { const item = object(entry, ["componentId", "edit"]); if (typeof item.componentId !== "string") fail("Choose stable component identities."); mutateStudioComponent(context.component(item.componentId), context.designs(item.componentId), item.edit as unknown as StudioComponentEdit, context.id); }
  });
}
/** Whole source records and pinned deletions feed the existing authenticated review/apply pipeline. */
export function studioComponentPlanPayload(input: StudioComponentPlan): JsonObject {
  const plan = JSON.parse(canonicalJson(input, MAX_BATCH_BYTES)) as StudioComponentPlan;
  if (!plan.valid || !isObject(plan.changes)) fail("An invalid authoring plan cannot create an import payload.");
  return { formatProfile: STUDIO_FORMAT, importMode: "change", sourceRefs: plan.changes.upserts.map(item => ({ uri: "studio:component-authoring", content: canonicalJson(item.document), ...(item.expectedRevision ? { expectedRevision: item.expectedRevision } : {}) })), deleteRefs: plan.changes.deletes };
}
