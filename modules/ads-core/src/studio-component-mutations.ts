import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import type { StudioComponentEdit } from "./studio-catalog-contracts.ts";
import { isObject } from "./documents.ts";
import { catalogObjects, hasCatalogProfile } from "./studio-catalog-validation.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";
import { catalogIdentity } from "./studio-catalog-validation.ts";
import { STUDIO_CATALOG_CODE } from "./studio-catalog-constants.ts";
import { KernelError } from "./kernel-error.ts";

const EDIT_FIELDS: Readonly<Record<string, readonly string[]>> = {
  name: ["name"], purpose: ["purpose"], frame: ["category", "frame"], "part-name": ["partId", "name"], "part-add": ["parentId", "name", "role"], "part-delete": ["partId"], "part-order": ["parentId", "childIds"],
  layout: ["category", "partId", "field", "value"], appearance: ["category", "partId", "property", "value"], "value-default": ["valueId", "value"], "value-add": ["name", "type", "value", "ownership"], "value-delete": ["valueId"], accessibility: ["field", "value"], motion: ["field", "value"], "sample-content": ["field", "value"],
};
function fail(message: string): never { throw new KernelError(STUDIO_CATALOG_CODE.invalid, message); }
function expectFields(edit: StudioComponentEdit): void {
  const raw: unknown = edit;
  if (!isObject(raw) || typeof raw.kind !== "string" || !Object.hasOwn(EDIT_FIELDS, raw.kind)) fail("Unknown component edit.");
  const fields = EDIT_FIELDS[raw.kind]!;
  if (Object.keys(raw).some(key => key !== "kind" && !fields.includes(key)) || fields.some(field => !Object.hasOwn(raw, field))) fail("Component edit contains missing or unsupported fields.");
}

/** Mutate only explicitly addressed contract fields on a detached candidate graph. */
export function mutateStudioComponent(component: AdsDocument, designs: AdsDocument[], edit: StudioComponentEdit, id: () => string): void {
  expectFields(edit);
  const parts = catalogObjects(component.parts), contract = component.publicContract as JsonObject;
  const part = "partId" in edit ? parts.find(part => part.id === edit.partId) : undefined;
  if ("partId" in edit && !part) fail("The selected part no longer exists.");
  const design = "category" in edit ? designs.find(design => design.category === edit.category) : undefined;
  if ("category" in edit && !design) fail("The selected category design does not exist.");
  const layout = design && part ? catalogObjects(design.layout).find(layout => layout.targetPartRef === part.id) : undefined;
  const values = catalogObjects(contract.values);
  switch (edit.kind) {
    case "name": component.name = edit.name; for (const design of designs) design.name = `${edit.name} ${String(design.category)}`; break;
    case "purpose": component.purpose = edit.purpose; break;
    case "frame": design!.editorFrame = edit.frame; break;
    case "part-name": part!.name = edit.name; break;
    case "part-add": {
      if (!hasCatalogProfile(component)) fail("Additional parts require an explicit catalog authoring definition; builtin semantic parts remain fixed.");
      const parent = parts.find(part => part.id === edit.parentId); if (!parent) fail("New part requires an existing local parent.");
      const added = { id: id(), name: edit.name, studioRole: edit.role, parent: parent.id!, roleRefs: [], required: false, cardinality: { min: 1, max: 1 }, relationships: [] };
      (component.parts as JsonValue[]).push(added);
      for (const design of designs) {
        (design.nodeMappings as JsonValue[]).push({ partRef: added.id, role: edit.role });
        (design.layout as JsonValue[]).push({ targetPartRef: added.id, mode: "stack", axis: "vertical", size: {}, gap: { value: 0, unit: "px" }, padding: { value: 0, unit: "px" }, minHeight: { value: 0, unit: "px" }, childOrder: [] });
      }
      syncOrder(component, designs); break;
    }
    case "part-delete": {
      if (part!.required === true || part!.parent === null) fail("A required semantic part cannot be deleted.");
      if (parts.some(child => child.parent === part!.id)) fail("Delete or explicitly move child parts before deleting their parent.");
      if (catalogObjects(component.slots).some(slot => slot.ownerPartRef === part!.id)) fail("A content slot still depends on this part.");
      component.parts = parts.filter(item => item.id !== part!.id);
      for (const design of designs) {
        design.nodeMappings = catalogObjects(design.nodeMappings).filter(item => item.partRef !== part!.id);
        design.layout = catalogObjects(design.layout).filter(item => item.targetPartRef !== part!.id);
        design.appearance = catalogObjects(design.appearance).filter(item => item.targetPartRef !== part!.id);
      }
      syncOrder(component, designs); break;
    }
    case "part-order": {
      if (!Array.isArray(edit.childIds) || edit.childIds.some(child => typeof child !== "string")) fail("Part order requires explicit child identities.");
      const children = parts.filter(part => part.parent === edit.parentId);
      if (!parts.some(part => part.id === edit.parentId) || children.length !== edit.childIds.length || new Set(edit.childIds).size !== children.length || edit.childIds.some(child => !children.some(part => part.id === child))) fail("Child order must contain every direct child exactly once.");
      const ordered = edit.childIds.map(child => children.find(part => part.id === child)!); let position = 0;
      component.parts = parts.map(part => part.parent === edit.parentId ? ordered[position++]! : part);
      syncOrder(component, designs); break;
    }
    case "layout": {
      if (!layout) fail("The selected part has no category layout.");
      if (!["gap", "padding", "minHeight", "axis", "width", "height", "alignment"].includes(edit.field)) fail("Unsupported layout property.");
      if (edit.field === "width" || edit.field === "height") {
        if (!isObject(edit.value)) fail("Width/height requires a hug/fill/fixed policy.");
        if (!isObject(layout.size)) fail("Invalid existing size map.");
        const size = { ...edit.value }; if (size.mode === "fixed" && typeof size.value === "number") size.value = { value: size.value, unit: "px" };
        layout.size[edit.field] = size;
      } else layout[edit.field] = edit.field === "axis" || edit.field === "alignment" ? edit.value : typeof edit.value === "number" ? { value: edit.value, unit: "px" } : edit.value;
      break;
    }
    case "appearance": {
      if (!["background", "color", "borderColor", "borderWidth", "borderRadius", "fontSize", "opacity"].includes(edit.property)) fail("Unsupported appearance property.");
      let rule = catalogObjects(design!.appearance).find(rule => rule.targetPartRef === part!.id && isObject(rule.variants) && Object.keys(rule.variants).length === 0 && isObject(rule.states) && Object.keys(rule.states).length === 0);
      if (!rule) { rule = { id: id(), targetPartRef: part!.id!, variants: {}, states: {}, declarations: {}, explicitPriority: 0, refines: [] }; (design!.appearance as JsonValue[]).push(rule); }
      (rule.declarations as JsonObject)[edit.property] = edit.value; break;
    }
    case "value-default": { const value = values.find(value => value.id === edit.valueId); if (!value) fail("Value port no longer exists."); value.defaultValue = edit.value; break; }
    case "value-add": {
      if (!hasCatalogProfile(component)) fail("Additional public values require an explicit catalog authoring definition.");
      (contract.values as JsonValue[]).push({ id: id(), name: edit.name, type: edit.type, defaultValue: edit.value, ownership: edit.ownership, visibility: "public" }); break;
    }
    case "value-delete": {
      const value = values.find(value => value.id === edit.valueId); if (!value) fail("Value port no longer exists.");
      const recipe = getStudioCatalogRecipe(catalogIdentity(component)!);
      if (!recipe || recipe.values.some(required => required.name === value.name)) fail("A required semantic value port cannot be deleted.");
      contract.values = values.filter(value => value.id !== edit.valueId); break;
    }
    case "accessibility": if (!["label", "description"].includes(edit.field) || !isObject(component.accessibility)) fail("Invalid accessibility property."); else component.accessibility[edit.field] = edit.value; break;
    case "motion": {
      if (!["durationMs", "easing"].includes(edit.field) || !isObject(component.studioMotion)) fail("Invalid motion property.");
      component.studioMotion[edit.field] = edit.value;
      if (edit.field === "durationMs" && typeof edit.value === "number") component.studioMotion.cleanupMs = Math.max(edit.value + 1, edit.value + 340);
      break;
    }
    case "sample-content": if (!["label", "title", "body", "actionLabel", "closeLabel"].includes(edit.field) || !isObject(component.previewContent)) fail("Invalid sample content field."); else component.previewContent[edit.field] = edit.value; break;
  }
}
function syncOrder(component: AdsDocument, designs: AdsDocument[]): void {
  const parts = catalogObjects(component.parts);
  (component.accessibility as JsonObject).readingOrder = parts.map(part => part.id!);
  for (const design of designs) for (const layout of catalogObjects(design.layout)) layout.childOrder = parts.filter(part => part.parent === layout.targetPartRef).map(part => part.id!);
}
