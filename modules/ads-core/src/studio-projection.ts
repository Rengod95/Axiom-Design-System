import type { AdsDocument, Diagnostic, JsonObject, JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { StudioComponent, StudioEdit, StudioEditPlan, StudioProjection, StudioSelection, StudioUsage } from "./studio-contracts.ts";
import { canonicalJson, parseJson } from "./canonical-json.ts";
import { isObject, isValidId } from "./documents.ts";
import { inspectStudioDocument, inspectStudioGraph, studioArchetype, studioDiagnostic, studioParts } from "./studio-validation.ts";
import { resolveFoundationTokens } from "./foundation-resolution.ts";
import { projectStudioDesign } from "./studio-presentation.ts";
import { CODE, MAX_BATCH_BYTES, STUDIO_PROFILE } from "./constants.ts";
import { KernelError } from "./kernel-error.ts";
import { inspectLocalReferences } from "./local-references.ts";
import { catalogIdentity } from "./studio-catalog-validation.ts";
import { resolveStudioMotion } from "./studio-motion.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";

function list(value: JsonValue | undefined): JsonObject[] { return Array.isArray(value) ? value.filter(isObject) : []; }
function copiedProject(value: ProjectSnapshot): ProjectSnapshot {
  const snapshot: unknown = JSON.parse(canonicalJson(value, MAX_BATCH_BYTES));
  if (!isObject(snapshot) || !isValidId(snapshot.id) || !isValidId(snapshot.revision) || typeof snapshot.name !== "string" || !snapshot.name.trim() || !isObject(snapshot.documents)) throw new Error("Invalid project header.");
  for (const [id, entry] of Object.entries(snapshot.documents)) if (!isValidId(id) || !isObject(entry) || !isObject(entry.document) || entry.document.id !== id || typeof entry.originalText !== "string" || typeof entry.sourceUri !== "string") throw new Error("Invalid project document entry.");
  return snapshot as unknown as ProjectSnapshot;
}
function sourceGraph(project: ProjectSnapshot): string { return canonicalJson({ id: project.id, revision: project.revision, documents: Object.values(project.documents).map(entry => entry.document).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) }, MAX_BATCH_BYTES); }
function invalidProject(): ProjectSnapshot { return { id: "invalid", name: "Invalid source", revision: "invalid", documents: {} }; }
function invalidDiagnostic(): Diagnostic { return studioDiagnostic("memory:studio", "", "Studio input must satisfy the bounded plain JSON contract."); }
const EDIT_FIELDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "token-value": ["id", "value"], "token-rename": ["id", "name"], "token-create": ["name", "type", "value"],
  "theme-value": ["axisId", "context", "id", "value"], "sample-content": ["id", "field", "value"], "component-name": ["id", "name"],
  layout: ["id", "category", "partId", "field", "value"], appearance: ["id", "category", "partId", "property", "value"], source: ["id", "source"],
});

/** Derive the exact same checked preview/target data from a detached adopted or transient graph. */
function inspectCapturedProject(input: ProjectSnapshot, selection: StudioSelection = {}): StudioProjection {
  const project = copiedProject(input);
  const diagnostics: Diagnostic[] = [];
  const entries = Object.values(project.documents);
  for (const entry of entries) {
    const report = inspectStudioDocument(entry.document, entry.document.id);
    diagnostics.push(...report.diagnostics.filter(item => item.severity === "error"));
    if (entry.validationProfile !== STUDIO_PROFILE) diagnostics.push(studioDiagnostic(entry.document.id, "", "Adopt the Studio validation profile before rendering or output."));
  }
  diagnostics.push(...inspectStudioGraph(project.documents, project.id));
  const references = inspectLocalReferences(project.documents, project.id);
  diagnostics.push(...references.diagnostics.filter(item => item.severity === "error"));
  if (!references.valid && !references.diagnostics.some(item => item.severity === "error")) diagnostics.push(studioDiagnostic(project.id, "", "The project contains invalid local identities or references."));
  const foundations = entries.filter(entry => entry.document.kind === "foundation");
  if (foundations.length !== 1) diagnostics.push(studioDiagnostic(project.id, "", "The local Studio profile requires one unambiguous Foundation."));
  const foundation = resolveFoundationTokens(foundations[0]?.document ?? null, selection);
  diagnostics.push(...foundation.diagnostics);
  const components: StudioComponent[] = [];
  const usages: Record<string, StudioUsage[]> = Object.create(null);
  if (!diagnostics.some(item => item.severity === "error")) for (const entry of entries.filter(item => item.document.kind === "component")) {
    const document = entry.document, archetype = studioArchetype(document)!;
    const parts = studioParts(document);
    const contract = document.publicContract as JsonObject;
    const values = list(contract.values), variants = list(contract.variants);
    const catalog = archetype === "catalog" ? getStudioCatalogRecipe(catalogIdentity(document)!) : null;
    const metadata = { id: document.id, archetype, parts };
    const design = (category: "Web" | "Mobile") => entries.find(item => item.document.kind === "design" && item.document.category === category && isObject(item.document.componentRef) && item.document.componentRef.id === document.id)!.document;
    components.push({ ...metadata, ...(catalog ? { catalog: { catalogId: catalog.entry.id, kind: catalog.entry.kind, familyIds: catalog.entry.familyIds, semantic: catalog.semantic, values, events: list(contract.events), variants, slots: list(document.slots), accessibility: document.accessibility as JsonObject, behavior: document.behavior as JsonObject } } : {}), name: document.name, purpose: String(document.purpose), sampleContent: document.previewContent as unknown as StudioComponent["sampleContent"],
      defaults: { disabled: values.find(item => item.name === "disabled")?.defaultValue === true, open: values.find(item => item.name === "open")?.defaultValue !== false, variant: variants[0]?.default === "outlined" ? "outlined" : "filled" },
      motion: document.studioMotion as unknown as StudioComponent["motion"],
      ...(catalog ? { motionTracks: resolveStudioMotion(document, foundation, diagnostics, (id, partId, path) => { const entries = usages[id] ??= []; if (!entries.some(item => item.documentId === document.id && item.path === path)) entries.push({ componentId: document.id, documentId: document.id, partId, path }); }) } : {}),
      web: projectStudioDesign(design("Web"), metadata, foundation, diagnostics, usages), mobile: projectStudioDesign(design("Mobile"), metadata, foundation, diagnostics, usages) });
  }
  return { valid: !diagnostics.some(item => item.severity === "error"), diagnostics, projectId: project.id, revision: project.revision, sourceText: sourceGraph(project), foundation, components, usages,
    capabilities: { editor: "implemented", targets: ["react", "react-native", "swiftui", "compose"], nativeExecution: "unverified" } };
}

/** Malformed API input produces a failed report, without evaluating accessors or partial output. */
export function inspectStudioProject(input: ProjectSnapshot, selection: StudioSelection = {}): StudioProjection {
  try { return inspectCapturedProject(input, JSON.parse(canonicalJson(selection)) as StudioSelection); }
  catch { return { valid: false, diagnostics: [invalidDiagnostic()], projectId: "invalid", revision: "invalid", sourceText: "", foundation: { valid: false, diagnostics: [invalidDiagnostic()], foundationId: null, contexts: {}, resolutionOrder: [], tokens: [] }, components: [], usages: {}, capabilities: { editor: "implemented", targets: ["react", "react-native", "swiftui", "compose"], nativeExecution: "unverified" } }; }
}

/** Build reviewed source updates; stable identity and the caller's base revision are preserved. */
function planCapturedEdit(input: ProjectSnapshot, editInput: StudioEdit, createId: () => string, selection: StudioSelection = {}): StudioEditPlan {
  const project = copiedProject(input);
  const edit = JSON.parse(canonicalJson(editInput)) as StudioEdit;
  const diagnostics: Diagnostic[] = [];
  const updates: StudioEditPlan["updates"] = [];
  if (!isObject(edit) || typeof edit.kind !== "string" || !Object.hasOwn(EDIT_FIELDS, edit.kind)) throw new Error("Unknown Studio edit kind.");
  const allowed = EDIT_FIELDS[edit.kind]!;
  if (Object.keys(edit).some(key => key !== "kind" && !allowed.includes(key)) || allowed.some(key => !Object.hasOwn(edit, key))) throw new Error("Invalid Studio edit fields.");
  const previous = inspectStudioProject(project, selection);
  const impact = "id" in edit ? [...(previous.usages[edit.id] ?? [])] : [];
  try {
    const entries = Object.values(project.documents);
    const foundation = entries.find(entry => entry.document.kind === "foundation")?.document;
    let document: AdsDocument | undefined;
    if (edit.kind === "token-value" || edit.kind === "token-rename" || edit.kind === "token-create" || edit.kind === "theme-value") {
      if (!foundation) throw new Error("Foundation is missing.");
      document = foundation;
      if (edit.kind === "token-create") {
        const id = createId(); if (!isValidId(id)) throw new Error("Identity service returned an invalid token ID.");
        (foundation.tokens as JsonValue[]).push({ id, name: edit.name, typeRef: { id: edit.type }, value: edit.value });
      } else if (edit.kind === "theme-value") {
        const axis = list(foundation.themeAxes).find(item => item.id === edit.axisId);
        if (!axis || !Array.isArray(axis.contexts) || !axis.contexts.includes(edit.context) || !isValidId(edit.id) || !list(foundation.tokens).some(item => item.id === edit.id)) throw new Error("Theme target is unavailable.");
        const overrides = isObject(axis.overrides) ? axis.overrides : (axis.overrides = {});
        const context = Object.hasOwn(overrides, edit.context) && isObject(overrides[edit.context]) ? overrides[edit.context] as JsonObject : Object.create(null) as JsonObject;
        Object.defineProperty(overrides, edit.context, { value: context, writable: true, enumerable: true, configurable: true });
        context[edit.id] = edit.value;
      } else if (edit.kind === "token-value" || edit.kind === "token-rename") {
        const token = list(foundation.tokens).find(item => item.id === edit.id); if (!token) throw new Error("Token is missing.");
        if (edit.kind === "token-value") token.value = edit.value; else token.name = edit.name;
      }
    } else {
      document = entries.find(entry => entry.document.id === edit.id)?.document;
      if (!document) throw new Error("Selected document is unavailable.");
      if (edit.kind === "source") {
        const parsed = parseJson(edit.source);
        if (!isObject(parsed) || parsed.id !== document.id || parsed.kind !== document.kind || parsed.schemaVersion !== document.schemaVersion) throw new Error("Source editing cannot change document identity, kind or schema version.");
        document = parsed as AdsDocument;
      } else if (edit.kind === "component-name") document.name = edit.name;
      else if (edit.kind === "sample-content") {
        if (!isObject(document.previewContent) || !Object.hasOwn(document.previewContent, edit.field)) throw new Error("Unknown preview content field.");
        document.previewContent[edit.field] = edit.value;
      } else if (edit.kind === "layout" || edit.kind === "appearance") {
        document = entries.find(entry => entry.document.kind === "design" && entry.document.category === edit.category && isObject(entry.document.componentRef) && entry.document.componentRef.id === edit.id)?.document;
        if (!document) throw new Error("Selected design is unavailable.");
        if (edit.kind === "layout") {
          const rule = list(document.layout).find(item => item.targetPartRef === edit.partId); if (!rule) throw new Error("Selected layout part is unavailable.");
          rule[edit.field] = edit.field === "axis" ? edit.value : { value: edit.value, unit: "px" };
        } else {
          const rules = list(document.appearance);
          let rule = rules.find(item => item.targetPartRef === edit.partId && isObject(item.variants) && !Object.keys(item.variants).length && isObject(item.states) && !Object.keys(item.states).length);
          if (!rule) { rule = { id: createId(), targetPartRef: edit.partId, variants: {}, states: {}, declarations: {}, explicitPriority: 0, refines: [] }; (document.appearance as JsonValue[]).push(rule); }
          (rule.declarations as JsonObject)[edit.property] = edit.value;
        }
      }
    }
    if (!document) throw new Error("No edit target.");
    const entry = project.documents[document.id]; if (!entry) throw new Error("Editing cannot insert an unreviewed document.");
    const expectedRevision = entry.document.revision;
    const revision = createId(); if (!isValidId(revision) || revision === expectedRevision) throw new Error("A fresh source revision is required.");
    document.revision = revision;
    project.documents[document.id] = { ...entry, document, currentText: canonicalJson(document), currentSourceUri: "studio:editor", validationProfile: STUDIO_PROFILE };
    updates.push({ document, expectedRevision });
    const report = inspectStudioProject(project, selection);
    diagnostics.push(...report.diagnostics.filter(item => item.severity === "error"));
  } catch (error) { diagnostics.push(studioDiagnostic(project.id, "", error instanceof Error ? error.message : "Invalid edit.")); }
  return { valid: !diagnostics.some(item => item.severity === "error"), diagnostics, baseRevision: project.revision, updates, impact, project };
}

/** Invalid public edit data never creates a source revision or partially usable update. */
export function planStudioEdit(input: ProjectSnapshot, edit: StudioEdit, createId: () => string, selection: StudioSelection = {}): StudioEditPlan {
  try { return planCapturedEdit(input, edit, createId, JSON.parse(canonicalJson(selection)) as StudioSelection); }
  catch { return { valid: false, diagnostics: [invalidDiagnostic()], baseRevision: "invalid", updates: [], impact: [], project: invalidProject() }; }
}
