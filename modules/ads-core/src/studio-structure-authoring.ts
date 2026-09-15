import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import { catalogIdentity, catalogObjects } from "./studio-catalog-validation.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";
import { semanticParentRole } from "./studio-element-contract.ts";

/** Explicit, reviewed upgrade of older flat catalog trees. Existing part IDs/content stay intact. */
export function normalizeStudioStructure(component: AdsDocument, designs: AdsDocument[], id: () => string): void {
  const recipe = getStudioCatalogRecipe(catalogIdentity(component) ?? "");
  if (!recipe) throw new Error("Choose an editable catalog component.");
  const parts = catalogObjects(component.parts);
  if (recipe.semantic.kind === "accordion") for (const role of ["item", "header"]) {
    if (parts.some(part => part.studioRole === role)) continue;
    const part = { id: id(), name: role === "item" ? "Item" : "Header", studioRole: role, parent: parts.find(part => part.parent === null)!.id!, roleRefs: [], required: true, cardinality: { min: 1, max: 1 }, relationships: [] };
    parts.push(part);
    for (const design of designs) {
      (design.nodeMappings as JsonValue[]).push({ partRef: part.id, role });
      (design.layout as JsonValue[]).push({ targetPartRef: part.id, mode: "stack", axis: "vertical", size: {}, gap: { value: 0, unit: "px" }, padding: { value: 0, unit: "px" }, minHeight: { value: 0, unit: "px" }, childOrder: [] });
    }
  }
  const roles = parts.map(part => String(part.studioRole));
  for (const part of parts) if (recipe.parts.some(anchor => anchor.role === part.studioRole)) {
    const parentRole = semanticParentRole(recipe.semantic.kind, String(part.studioRole), roles);
    part.parent = parentRole === null ? null : parts.find(parent => parent.studioRole === parentRole)!.id!;
  }
  const ordered: JsonObject[] = [];
  const visit = (part: JsonObject) => { ordered.push(part); for (const child of parts.filter(item => item.parent === part.id)) visit(child); };
  visit(parts.find(part => part.parent === null)!);
  component.parts = ordered; (component.accessibility as JsonObject).readingOrder = ordered.map(part => part.id!);
  for (const design of designs) for (const layout of catalogObjects(design.layout)) layout.childOrder = ordered.filter(part => part.parent === layout.targetPartRef).map(part => part.id!);
}
