import { sourceElementContent } from "./studio-element-contract.ts";
import type { AdsDocument, Diagnostic, DocumentEntry, JsonObject, JsonValue } from "./contracts.ts";
import { isObject, isValidId } from "./documents.ts";
import { inspectTypedValue } from "./type-validation.ts";
import { catalogIdentity, catalogObjects, catalogKeys } from "./studio-catalog-validation.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";
import { inspectLocalReferences } from "./local-references.ts";

export const STUDIO_COMPOSITION_LIMITS = { instances: 64, depth: 8, expandedInstances: 1024 } as const;

export interface StudioInstance {
  id: string; ownerPartRef: string; slotRef: string | null;
  componentRef: { id: string; revision: string };
  designRefs: { Web: { id: string; revision: string }; Mobile: { id: string; revision: string } };
  values: Record<string, JsonValue>; slotContents: Record<string, string>;
}
export interface StudioInstanceProjection extends StudioInstance { status: "current" | "stale" | "missing"; sourceName: string }
export type StudioInstanceEdit =
  | { kind: "insert"; ownerPartRef: string; slotRef: string | null; sourceComponentId: string }
  | { kind: "remove" | "refresh"; instanceId: string }
  | { kind: "value"; instanceId: string; valueId: string; value: JsonValue; reset: boolean }
  | { kind: "content"; instanceId: string; slotId: string; text: string };

export function studioInstances(component: JsonObject): StudioInstance[] {
  return isObject(component.studioComposition) && Array.isArray(component.studioComposition.instances)
    ? component.studioComposition.instances.filter(validInstanceShape) as unknown as StudioInstance[] : [];
}
const pin = (value: unknown): boolean => isObject(value) && catalogKeys(value, ["id", "revision"]) && isValidId(value.id) && isValidId(value.revision);
function validInstanceShape(value: unknown): value is JsonObject {
  return isObject(value) && catalogKeys(value, ["id", "ownerPartRef", "slotRef", "componentRef", "designRefs", "values", "slotContents"]) && isValidId(value.id) && isValidId(value.ownerPartRef)
    && (value.slotRef === null || isValidId(value.slotRef)) && pin(value.componentRef) && isObject(value.designRefs) && catalogKeys(value.designRefs, ["Web", "Mobile"]) && pin(value.designRefs.Web) && pin(value.designRefs.Mobile)
    && isObject(value.values) && isObject(value.slotContents) && Object.values(value.slotContents).every(text => typeof text === "string" && text.length <= 8000);
}
/** Validate only the closed owned source; cross-definition constraints are checked separately. */
export function inspectStudioComposition(component: JsonObject, add: (path: string, message: string) => void): void {
  const composition = component.studioComposition;
  if (composition === undefined) return;
  if (!isObject(composition) || !catalogKeys(composition, ["version", "instances"]) || composition.version !== "1.0.0" || !Array.isArray(composition.instances) || composition.instances.length > STUDIO_COMPOSITION_LIMITS.instances) { add("/studioComposition", "Use a supported composition with at most 64 instances."); return; }
  const ids = new Set<string>();
  composition.instances.forEach((value, index) => {
    const path = `/studioComposition/instances/${index}`;
    if (!validInstanceShape(value) || ids.has(String(value.id))) { add(path, "An instance needs a unique identity, pinned sources, typed values and explicit text content."); return; }
    ids.add(String(value.id));
  });
}
export function projectStudioInstances(component: AdsDocument, documents: Record<string, DocumentEntry>): StudioInstanceProjection[] {
  return studioInstances(component).map(instance => {
    const source = documents[instance.componentRef.id]?.document;
    const pins = [instance.componentRef, instance.designRefs.Web, instance.designRefs.Mobile];
    const status = pins.some(ref => !documents[ref.id]) ? "missing" : pins.some(ref => documents[ref.id]!.document.revision !== ref.revision) ? "stale" : "current";
    return { ...instance, status, sourceName: source?.name ?? "Missing component" };
  });
}
/** Pinned versions never silently retarget. A stale instance stays editable but cannot be delivered. */
export function inspectStudioCompositionGraph(documents: Record<string, DocumentEntry>, projectId?: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [], components = Object.values(documents).map(entry => entry.document).filter(document => document.kind === "component");
  const add = (id: string, path: string, message: string, stale = false) => diagnostics.push({ code: stale ? "STUDIO_INSTANCE_STALE" : "STUDIO_INSTANCE_INVALID", phase: "reference" as const, severity: stale ? "warning" as const : "error" as const, sourceRef: id, path, message });
  const visiting = new Set<string>(), metrics = new Map<string, { depth: number; expanded: number }>();
  const reserved = new Set(inspectLocalReferences(documents, projectId ?? "scope.composition").entities.filter(entity => entity.ownerDocumentId !== null).map(entity => entity.id));
  if (projectId) reserved.add(projectId);
  for (const { document } of Object.values(documents)) {
    for (const key of ["motion", "appearance", "domains", "tiers", "policies"]) for (const entity of catalogObjects(document[key])) if (typeof entity.id === "string") reserved.add(entity.id);
    if (isObject(document.studioBehavior)) for (const rule of catalogObjects(document.studioBehavior.rules)) if (typeof rule.id === "string") reserved.add(rule.id);
  }
  const visit = (id: string): { depth: number; expanded: number } => {
    if (visiting.has(id)) { add(id, "/studioComposition", "Component composition must be acyclic."); return { depth: STUDIO_COMPOSITION_LIMITS.depth + 1, expanded: STUDIO_COMPOSITION_LIMITS.expandedInstances + 1 }; }
    if (metrics.has(id)) return metrics.get(id)!;
    visiting.add(id); const component = documents[id]?.document;
    const children = component?.kind === "component" ? studioInstances(component).map(instance => visit(instance.componentRef.id)) : [];
    const result = { depth: 1 + Math.max(0, ...children.map(child => child.depth)), expanded: children.reduce((sum, child) => Math.min(STUDIO_COMPOSITION_LIMITS.expandedInstances + 1, sum + 1 + child.expanded), 0) };
    visiting.delete(id); metrics.set(id, result);
    if (result.depth > STUDIO_COMPOSITION_LIMITS.depth) add(id, "/studioComposition", "Component composition must be at most eight levels deep.");
    if (result.expanded > STUDIO_COMPOSITION_LIMITS.expandedInstances) add(id, "/studioComposition", "Component composition expands beyond the 1024-instance runtime budget; reuse fewer nested instances.");
    return result;
  };
  for (const component of components) {
    inspectStudioComposition(component, (path, message) => add(component.id, path, message));
    visit(component.id);
    const instances = projectStudioInstances(component, documents), parts = catalogObjects(component.parts), slots = catalogObjects(component.slots);
    instances.forEach((instance, index) => {
      const path = `/studioComposition/instances/${index}`, source = documents[instance.componentRef.id]?.document;
      if (reserved.has(instance.id)) add(component.id, path, "Instance identity must be unique across the project.");
      reserved.add(instance.id);
      const owner = parts.find(part => part.id === instance.ownerPartRef), slot = slots.find(slot => slot.id === instance.slotRef);
      if (!owner) add(component.id, path, "Instances need an existing owner element.");
      if (instance.slotRef !== null && (!slot || slot.ownerPartRef !== instance.ownerPartRef)) add(component.id, path, "Content insertion requires a slot owned by the selected element.");
      if (!source) { add(component.id, path, "The referenced catalog component is missing; remove or replace the instance.", true); return; }
      if (source.kind !== "component" || !catalogIdentity(source)) { add(component.id, path, "An existing instance source must be a catalog component; this reference has an incompatible kind or profile."); return; }
      for (const category of ["Web", "Mobile"] as const) {
        const design = documents[instance.designRefs[category].id]?.document;
        if (design && (design.kind !== "design" || design.category !== category || !isObject(design.componentRef) || design.componentRef.id !== source.id)) add(component.id, path, "Instance designs must belong to their pinned source component and category.");
        const ownerDesign = Object.values(documents).find(entry => entry.document.kind === "design" && entry.document.category === category && isObject(entry.document.componentRef) && entry.document.componentRef.id === component.id)?.document;
        const element = catalogObjects(ownerDesign?.nodeMappings).find(mapping => mapping.partRef === instance.ownerPartRef)?.element;
        if (!ownerDesign || sourceElementContent(component, ownerDesign, instance.ownerPartRef) !== "flow" || ["span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "code"].includes(String(element))) add(component.id, path, "Insert components into a frame, not inside text or heading content.");
      }
      if (instance.status !== "current") { add(component.id, path, "The source version changed. Review an explicit instance update or remove this instance before export.", true); return; }
      const values = isObject(source.publicContract) ? catalogObjects(source.publicContract.values) : [];
      for (const [id, value] of Object.entries(instance.values)) {
        const port = values.find(port => port.id === id);
        if (!port || port.ownership !== "consumer" || !inspectTypedValue(port.type, value).valid) add(component.id, `${path}/values`, "Instance overrides require a declared consumer-owned value of the same type.");
      }
      const sourceSlots = catalogObjects(source.slots);
      for (const id of Object.keys(instance.slotContents)) if (!sourceSlots.some(slot => slot.id === id && Array.isArray(slot.contentKinds) && slot.contentKinds.includes("text"))) add(component.id, `${path}/slotContents`, "Text content must target an exposed source slot.");
      for (const slot of sourceSlots) if (Number(slot.min) > 0 && !instance.slotContents[String(slot.id)]?.trim()) add(component.id, `${path}/slotContents`, "Supply content for every required source slot.");
    });
    for (const slot of slots) {
      const count = instances.filter(instance => instance.slotRef === slot.id).length;
      if (typeof slot.max === "number" && count > slot.max) add(component.id, "/studioComposition", "This content area exceeds its declared maximum number of instances.");
    }
  }
  return diagnostics.slice(0, 128);
}
