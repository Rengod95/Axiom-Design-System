import { projectStudioInstances } from "./studio-composition.ts";
import { readStudioBehavior } from "./studio-behavior.ts";
import type { AdsDocument, Diagnostic, JsonObject, JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { StudioComponent, StudioEdit, StudioEditPlan, StudioProjection, StudioSelection, StudioTokenBindingIssue, StudioTokenBindingReplacement, StudioUsage } from "./studio-contracts.ts";
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
import { STUDIO_ERROR, STUDIO_VISUAL_PROPERTIES } from "./studio-constants.ts";
import { isStudioTokenCompatible } from "./studio-style-values.ts";
import type { StudioTokenBindingProperty } from "./studio-style-values.ts";

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
  // Domain-incompatible references remain inspectable for repair; preview/export still require valid=true.
  if (!diagnostics.some(item => item.severity === "error" && item.code !== STUDIO_ERROR.tokenBinding)) for (const entry of entries.filter(item => item.document.kind === "component")) {
    const document = entry.document, archetype = studioArchetype(document)!;
    const parts = studioParts(document);
    const contract = document.publicContract as JsonObject;
    const values = list(contract.values), variants = list(contract.variants);
    const catalog = archetype === "catalog" ? getStudioCatalogRecipe(catalogIdentity(document)!) : null;
    const metadata = { id: document.id, archetype, parts };
    const design = (category: "Web" | "Mobile") => entries.find(item => item.document.kind === "design" && item.document.category === category && isObject(item.document.componentRef) && item.document.componentRef.id === document.id)!.document;
    components.push({ ...(document.studioComposition ? { instances: projectStudioInstances(document, project.documents) } : {}), ...(document.studioBehavior ? { behavior: readStudioBehavior(document) } : {}), ...metadata, ...(catalog ? { catalog: { catalogId: catalog.entry.id, kind: catalog.entry.kind, familyIds: catalog.entry.familyIds, semantic: catalog.semantic, values, events: list(contract.events), variants, slots: list(document.slots), accessibility: document.accessibility as JsonObject, behavior: document.behavior as JsonObject } } : {}), name: document.name, purpose: String(document.purpose), sampleContent: document.previewContent as unknown as StudioComponent["sampleContent"],
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

interface BindingSite { issue: StudioTokenBindingIssue; source: JsonObject; owner: JsonObject; key: string }
function bindingSites(project: ProjectSnapshot, projection: StudioProjection): BindingSite[] {
  const tokens = new Map(projection.foundation.tokens.map(token => [token.id, token])), found: BindingSite[] = [];
  const collect = (documentId: string, componentId: string, partId: string, owner: JsonObject, key: string, path: string, property: StudioTokenBindingProperty) => {
    const source = owner[key]; if (!isObject(source) || typeof source.tokenRef !== "string") return;
    const token = tokens.get(source.tokenRef); if (!token || isStudioTokenCompatible(token, property)) return;
    found.push({ source, owner, key, issue: { documentId, componentId, partId, path, property, tokenId: token.id,
      compatibleTokenIds: projection.foundation.tokens.filter(candidate => isStudioTokenCompatible(candidate, property)).map(candidate => candidate.id) } });
  };
  for (const { document } of Object.values(project.documents)) {
    if (document.kind === "design" && isObject(document.componentRef)) {
      const componentId = String(document.componentRef.id);
      list(document.appearance).forEach((rule, index) => { if (isObject(rule.declarations)) for (const property of STUDIO_VISUAL_PROPERTIES) collect(document.id, componentId, String(rule.targetPartRef), rule.declarations, property, `/appearance/${index}/declarations/${property}`, property); });
      list(document.layout).forEach((rule, index) => { for (const property of ["gap", "padding", "minHeight"] as const) collect(document.id, componentId, String(rule.targetPartRef), rule, property, `/layout/${index}/${property}`, property); });
    } else if (document.kind === "component") list(document.motion).forEach((track, index) => {
      collect(document.id, document.id, String(track.targetPartRef), track, "delay", `/motion/${index}/delay`, "motionDelay");
      if (isObject(track.timing) && track.timing.kind === "tween") {
        collect(document.id, document.id, String(track.targetPartRef), track.timing, "duration", `/motion/${index}/timing/duration`, "motionDuration");
        collect(document.id, document.id, String(track.targetPartRef), track.timing, "easing", `/motion/${index}/timing/easing`, "motionEasing");
      }
    });
  }
  return found;
}
const bindingOnlyErrors = (projection: StudioProjection): boolean => {
  const errors = projection.diagnostics.filter(item => item.severity === "error");
  return errors.length > 0 && errors.every(item => item.code === STUDIO_ERROR.tokenBinding);
};
/** Enumerate explicit supported binding sites, never arbitrary paths or opaque extension data. */
export function inspectStudioTokenBindingIssues(input: ProjectSnapshot, selection: StudioSelection = {}): StudioTokenBindingIssue[] {
  try { const project = copiedProject(input), projection = inspectStudioProject(project, selection); return bindingOnlyErrors(projection) ? bindingSites(project, projection).map(site => site.issue) : []; }
  catch { return []; }
}
/** Collect all corrections before producing one valid, reviewed source update. Partial repairs never become plans. */
export function planStudioTokenBindingRepair(input: ProjectSnapshot, replacements: readonly StudioTokenBindingReplacement[], createId: () => string, selection: StudioSelection = {}): StudioEditPlan {
  let baseline = invalidProject();
  try {
    baseline = copiedProject(input); const project = copiedProject(baseline), projection = inspectStudioProject(project, selection);
    if (!bindingOnlyErrors(projection)) throw new Error("This repair handles existing token-purpose errors only. Repair other source diagnostics first.");
    const sites = bindingSites(project, projection), choices: unknown = JSON.parse(canonicalJson(replacements, MAX_BATCH_BYTES));
    if (!sites.length || !Array.isArray(choices) || choices.length !== sites.length) throw new Error("Choose a replacement for every incompatible binding before proposing the repair.");
    const seen = new Set<string>(), changed = new Set<string>(), tokens = new Map(projection.foundation.tokens.map(token => [token.id, token]));
    for (const choice of choices) {
      if (!isObject(choice) || Object.keys(choice).length !== 4 || !["documentId", "path", "tokenId", "replacementTokenId"].every(key => Object.hasOwn(choice, key))) throw new Error("Invalid binding repair fields.");
      const site = sites.find(site => site.issue.documentId === choice.documentId && site.issue.path === choice.path && site.issue.tokenId === choice.tokenId);
      const key = canonicalJson([choice.documentId!, choice.path!]);
      if (!site || seen.has(key)) throw new Error("The binding changed or was selected more than once. Reopen the repair form.");
      seen.add(key); changed.add(site.issue.documentId);
      if (choice.replacementTokenId === null) site.owner[site.key] = structuredClone(tokens.get(site.issue.tokenId)!.value);
      else {
        if (typeof choice.replacementTokenId !== "string" || !site.issue.compatibleTokenIds.includes(choice.replacementTokenId)) throw new Error("Choose a token compatible with this property's type and purpose.");
        site.source.tokenRef = choice.replacementTokenId;
      }
    }
    const revisions = new Set(Object.values(project.documents).map(entry => entry.document.revision));
    const revise = (document: AdsDocument) => { const revision = createId(); if (!isValidId(revision) || revisions.has(revision)) throw new Error("A distinct source revision is required."); revisions.add(revision); document.revision = revision; };
    for (const documentId of changed) revise(project.documents[documentId]!.document);
    for (const { document } of Object.values(project.documents)) if (document.kind === "design" && isObject(document.componentRef) && typeof document.componentRef.id === "string" && document.componentRef.revision !== undefined && changed.has(document.componentRef.id)) {
      document.componentRef.revision = project.documents[document.componentRef.id]!.document.revision;
      if (!changed.has(document.id)) { changed.add(document.id); revise(document); }
    }
    for (const documentId of changed) { const entry = project.documents[documentId]!; entry.currentText = canonicalJson(entry.document); entry.currentSourceUri = "studio:binding-repair"; }
    const report = inspectStudioProject(project, selection);
    if (!report.valid) return { valid: false, diagnostics: report.diagnostics, baseRevision: baseline.revision, updates: [], impact: [], project: baseline };
    return { valid: true, diagnostics: report.diagnostics, baseRevision: baseline.revision, updates: [...changed].map(id => ({ document: project.documents[id]!.document, expectedRevision: baseline.documents[id]!.document.revision })),
      impact: sites.map(({ issue: { componentId, partId, documentId, path } }) => ({ componentId, partId, documentId, path })), project };
  } catch (error) { return { valid: false, diagnostics: [studioDiagnostic(baseline.id, "", error instanceof Error ? error.message : "Invalid binding repair.")], baseRevision: baseline.revision, updates: [], impact: [], project: baseline }; }
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
