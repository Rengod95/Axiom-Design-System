import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import { catalogIdentity, catalogObjects } from "./studio-catalog-validation.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";

export type StudioElementKind = "box" | "frame" | "text";
/** Add a real element and both mappings without asking an author for source identifiers. */
export function addStudioElement(component: AdsDocument, designs: AdsDocument[], parentId: string, element: StudioElementKind, id: () => string): void {
  if (getStudioCatalogRecipe(catalogIdentity(component) ?? "")?.semantic.kind !== "layout" || !["box", "frame", "text"].includes(element)) throw new Error("Choose a box, frame or text element inside a custom layout.");
  const parts = catalogObjects(component.parts), parent = parts.find(item => item.id === parentId);
  if (!parent) throw new Error("Select a parent frame.");
  let index = 1; while (parts.some(part => part.studioRole === `${element}${index}`)) index++;
  const role = `${element}${index}`, added = { id: id(), name: `${element[0]!.toUpperCase()}${element.slice(1)} ${index}`, studioRole: role, parent: parentId, roleRefs: [], required: false, cardinality: { min: 1, max: 1 }, relationships: [], ...(element === "text" ? { studioText: "Text" } : {}) };
  (component.parts as JsonValue[]).push(added);
  for (const design of designs) {
    const text = element === "text", frame = element === "frame";
    (design.nodeMappings as JsonValue[]).push({ partRef: added.id, role, element: text ? "p" : "div" });
    (design.layout as JsonValue[]).push({ targetPartRef: added.id, mode: frame ? "free" : "stack", axis: "vertical", size: { width: text ? { mode: "hug" } : { mode: "fixed", value: { value: frame ? 240 : 80, unit: "px" } }, height: text ? { mode: "hug" } : { mode: "fixed", value: { value: frame ? 160 : 80, unit: "px" } } }, position: { x: 24, y: 24 }, gap: { value: 8, unit: "px" }, padding: { value: frame ? 12 : 0, unit: "px" }, minHeight: { value: text ? 24 : 0, unit: "px" }, childOrder: [] });
    (design.appearance as JsonValue[]).push({ id: id(), targetPartRef: added.id, variants: {}, states: {}, explicitPriority: 0, refines: [], declarations: text ? { fontSize: { value: 16, unit: "px" } } : { background: { colorSpace: "srgb", components: [.45, .45, .45], alpha: frame ? .08 : .28 }, borderRadius: { value: frame ? 12 : 8, unit: "px" } } });
    const layout = catalogObjects(design.layout).find(item => item.targetPartRef === parentId);
    if (layout) layout.childOrder = catalogObjects(component.parts).filter(item => item.parent === parentId).map(item => item.id!);
  }
  const source = catalogObjects(component.parts), ordered: JsonObject[] = [];
  const visit = (part: JsonObject) => { ordered.push(part); for (const child of source.filter(item => item.parent === part.id)) visit(child); };
  const root = source.find(part => part.parent === null); if (root) visit(root);
  component.parts = ordered;
  (component.accessibility as JsonObject).readingOrder = ordered.map(part => part.id!);
  for (const design of designs) for (const layout of catalogObjects(design.layout)) layout.childOrder = ordered.filter(part => part.parent === layout.targetPartRef).map(part => part.id!);
}
