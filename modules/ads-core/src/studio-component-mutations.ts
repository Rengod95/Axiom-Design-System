import { normalizeStudioStructure } from "./studio-structure-authoring.ts";
import { recordReferenceEdit, requireReferenceEditSupport } from "./studio-reference-authoring.ts";
import { sourceElementContent } from "./studio-element-contract.ts";
import { addStudioElement } from "./studio-elements.ts";
import { mutateStudioBehavior } from "./studio-behavior.ts";
import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import type { StudioComponentEdit } from "./studio-catalog-contracts.ts";
import { isObject } from "./documents.ts";
import { catalogObjects, hasCatalogProfile } from "./studio-catalog-validation.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";
import { catalogIdentity } from "./studio-catalog-validation.ts";
import { STUDIO_CATALOG_CODE } from "./studio-catalog-constants.ts";
import { STUDIO_VISUAL_PROPERTIES } from "./studio-constants.ts";
import { KernelError } from "./kernel-error.ts";

const EDIT_FIELDS: Readonly<Record<string, readonly string[]>> = {
  "structure-normalize": [], "element-add": ["parentId", "element"], "behavior-set": ["behavior"],
  "part-element": ["category", "partId", "element"], "slot-update": ["slotId", "required", "multiple"],
  "motion-track-set": ["track", "trackId"], "motion-track-delete": ["trackId"],
  "part-text": ["partId", "text"], "part-parent": ["partId", "parentId"], "appearance-rule": ["category", "partId", "condition", "property", "value"], "variant-default": ["value"], "slot-add": ["partId", "required", "multiple"], "slot-delete": ["slotId"],
  name: ["name"], purpose: ["purpose"], frame: ["category", "frame"], "part-name": ["partId", "name"], "part-add": ["parentId", "name", "role"], "part-delete": ["partId"], "part-order": ["parentId", "childIds"],
  layout: ["category", "partId", "field", "value"], appearance: ["category", "partId", "property", "value"], "value-default": ["valueId", "value"], "value-add": ["name", "type", "value", "ownership"], "value-delete": ["valueId"], accessibility: ["field", "value"], motion: ["field", "value"], "sample-content": ["field", "value"],
};
function fail(message: string): never { throw new KernelError(STUDIO_CATALOG_CODE.invalid, message); }
function expectFields(edit: StudioComponentEdit): void {
  const raw: unknown = edit;
  if (!isObject(raw) || typeof raw.kind !== "string" || !Object.hasOwn(EDIT_FIELDS, raw.kind)) fail("Unknown component edit.");
  const fields = EDIT_FIELDS[raw.kind]!;
  const optional = raw.kind === "element-add" ? ["category", "frame"] : [];
  if (Object.keys(raw).some(key => key !== "kind" && !fields.includes(key) && !optional.includes(key)) || fields.some(field => !Object.hasOwn(raw, field))) fail("Component edit contains missing or unsupported fields.");
}

/** Mutate only explicitly addressed contract fields on a detached candidate graph. */
export function mutateStudioComponent(component: AdsDocument, designs: AdsDocument[], edit: StudioComponentEdit, id: () => string): void {
  expectFields(edit);
  requireReferenceEditSupport(component, edit);
  const parts = catalogObjects(component.parts), contract = component.publicContract as JsonObject;
  const part = "partId" in edit ? parts.find(part => part.id === edit.partId) : undefined;
  if ("partId" in edit && !part) fail("The selected part no longer exists.");
  const design = "category" in edit ? designs.find(design => design.category === edit.category) : undefined;
  if ("category" in edit && !design) fail("The selected category design does not exist.");
  const layout = design && part ? catalogObjects(design.layout).find(layout => layout.targetPartRef === part.id) : undefined;
  const values = catalogObjects(contract.values);
  switch (edit.kind) {
    case "structure-normalize": normalizeStudioStructure(component, designs, id); break;
    case "element-add": {
      if ((edit.frame === undefined) !== (edit.category === undefined)) fail("Drawn elements require both a category and bounds.");
      if (edit.frame && (!isObject(edit.frame) || Object.keys(edit.frame).length !== 4 || ["x", "y", "width", "height"].some(key => { const value = edit.frame![key as keyof typeof edit.frame]; return typeof value !== "number" || !Number.isFinite(value) || value < (key === "x" || key === "y" ? 0 : 1) || value > 4096; }))) fail("Drawn element bounds must be finite, positive and within 4096px.");
      addStudioElement(component, designs, edit.parentId, edit.element, id, edit.frame && edit.category ? { category: edit.category, frame: edit.frame } : undefined); break;
    }
    case "behavior-set": mutateStudioBehavior(component, edit.behavior); break;
    case "name": component.name = edit.name; for (const design of designs) design.name = `${edit.name} ${String(design.category)}`; break;
    case "purpose": component.purpose = edit.purpose; break;
    case "frame": design!.editorFrame = edit.frame; break;
    case "part-name": part!.name = edit.name; break;
    case "part-text": if (!hasCatalogProfile(component)) fail("Part-specific content requires a catalog definition."); else part!.studioText = edit.text; break;
    case "part-element": {
      const recipe = getStudioCatalogRecipe(catalogIdentity(component)!);
      if (recipe?.semantic.kind !== "layout" && !part!.studioElement) fail("Semantic anchors retain their HTML behavior. Select an authored child element.");
      const mapping = catalogObjects(design!.nodeMappings).find(item => item.partRef === part!.id);
      if (!mapping) fail("The selected element has no design mapping.");
      mapping.element = edit.element; break;
    }
    case "part-parent": {
      if (!hasCatalogProfile(component) || part!.required === true || part!.parent === null || getStudioCatalogRecipe(catalogIdentity(component)!)?.parts.some(anchor => anchor.role === part!.studioRole)) fail("Required semantic parts retain their parent.");
      let parent = parts.find(item => item.id === edit.parentId); if (!parent) fail("Choose an existing parent.");
      const seen = new Set<string>([String(part!.id)]);
      while (parent) { if (seen.has(String(parent.id))) fail("A part cannot be its own ancestor."); seen.add(String(parent.id)); parent = parts.find(item => item.id === parent!.parent); }
      if (designs.some(design => sourceElementContent(component, design, edit.parentId) === "none")) fail("Choose a container that accepts authored children.");
      part!.parent = edit.parentId; syncOrder(component, designs); break;
    }
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
      if (catalogObjects(component.motion).some(track => track.targetPartRef === part!.id)) fail("Remove this part's motion tracks before deleting it.");
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
      if (!["gap", "padding", "minHeight", "axis", "width", "height", "alignment", "mode", "position"].includes(edit.field)) fail("Unsupported layout property.");
      if (edit.field === "width" || edit.field === "height") {
        if (!isObject(edit.value)) fail("Width/height requires a hug/fill/fixed policy.");
        if (!isObject(layout.size)) fail("Invalid existing size map.");
        const size = { ...edit.value }; if (size.mode === "fixed" && typeof size.value === "number") size.value = { value: size.value, unit: "px" };
        layout.size[edit.field] = size;
      } else layout[edit.field] = edit.field === "axis" || edit.field === "alignment" || edit.field === "mode" || edit.field === "position" ? edit.value : typeof edit.value === "number" ? { value: edit.value, unit: "px" } : edit.value;
      break;
    }
    case "appearance": case "appearance-rule": {
      if (!STUDIO_VISUAL_PROPERTIES.includes(edit.property)) fail("Unsupported appearance property.");
      const condition = edit.kind === "appearance-rule" ? edit.condition : "base";
      if (!["base", "outlined", "disabled", "pressed"].includes(condition)) fail("Unsupported appearance condition.");
      const variants: JsonObject = condition === "outlined" ? { variant: "outlined" } : {}, states: JsonObject = condition === "disabled" || condition === "pressed" ? { [condition]: true } : {};
      const match = (value: unknown, expected: JsonObject) => isObject(value) && Object.keys(value).length === Object.keys(expected).length && Object.keys(expected).every(key => value[key] === expected[key]);
      let rule = catalogObjects(design!.appearance).find(rule => rule.targetPartRef === part!.id && match(rule.variants, variants) && match(rule.states, states));
      if (edit.value === null) { if (rule && isObject(rule.declarations)) { delete rule.declarations[edit.property]; if (!Object.keys(rule.declarations).length) design!.appearance = catalogObjects(design!.appearance).filter(item => item !== rule); } break; }
      if (!rule) { rule = { id: id(), targetPartRef: part!.id!, variants, states, declarations: {}, explicitPriority: 0, refines: [] }; (design!.appearance as JsonValue[]).push(rule); }
      (rule.declarations as JsonObject)[edit.property] = edit.value; break;
    }
    case "variant-default": if (!["filled", "outlined"].includes(edit.value)) fail("Invalid variant."); else catalogObjects(contract.variants)[0]!.default = edit.value; break;
    case "slot-add": {
      if (!hasCatalogProfile(component) || typeof edit.required !== "boolean" || typeof edit.multiple !== "boolean") fail("Invalid slot contract.");
      if (designs.some(design => sourceElementContent(component, design, String(part!.id)) !== "flow")) fail("Component content areas require a flow container. Text and native triggers cannot accept arbitrary component content.");
      if (catalogObjects(component.slots).some(slot => slot.ownerPartRef === part!.id)) fail("This Part already owns a slot.");
      const slot = { id: id(), ownerPartRef: part!.id!, contentKinds: ["text", "component"], min: edit.required ? 1 : 0, max: edit.multiple ? "unbounded" : 1, defaultContent: [], allowedContractRefs: [] };
      (component.slots as JsonValue[]).push(slot); (contract.exposedSlots as JsonValue[]).push(slot.id); break;
    }
    case "slot-delete": {
      const slot = catalogObjects(component.slots).find(slot => slot.id === edit.slotId); if (!slot) fail("Slot no longer exists.");
      const role = parts.find(part => part.id === slot.ownerPartRef)?.studioRole, recipe = getStudioCatalogRecipe(catalogIdentity(component)!);
      if (!recipe || recipe.slots.some(required => required.required && required.role === role)) fail("A required semantic slot cannot be deleted.");
      component.slots = catalogObjects(component.slots).filter(slot => slot.id !== edit.slotId); contract.exposedSlots = (contract.exposedSlots as JsonValue[]).filter(id => id !== edit.slotId); break;
    }
    case "slot-update": {
      if (typeof edit.required !== "boolean" || typeof edit.multiple !== "boolean") fail("Invalid content area settings.");
      const slot = catalogObjects(component.slots).find(item => item.id === edit.slotId); if (!slot) fail("Content area no longer exists.");
      const role = parts.find(item => item.id === slot.ownerPartRef)?.studioRole;
      const recipe = getStudioCatalogRecipe(catalogIdentity(component)!);
      if (!recipe || !edit.required && recipe.slots.some(item => item.required && item.role === role)) fail("This component requires its content area.");
      slot.min = edit.required ? 1 : 0; slot.max = edit.multiple ? "unbounded" : 1; break;
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
    case "motion-track-set": {
      if (!hasCatalogProfile(component) || !isObject(edit.track) || Object.hasOwn(edit.track, "id")) fail("A motion track requires a catalog component and generated identity.");
      const tracks = catalogObjects(component.motion), existing = edit.trackId === null ? undefined : tracks.find(track => track.id === edit.trackId);
      if (edit.trackId !== null && !existing) fail("Motion track no longer exists.");
      const next = { ...edit.track, id: existing?.id ?? id() } as unknown as JsonObject;
      component.motion = existing ? tracks.map(track => track.id === existing.id ? next : track) : [...tracks, next]; break;
    }
    case "motion-track-delete": {
      if (!hasCatalogProfile(component) || !catalogObjects(component.motion).some(track => track.id === edit.trackId)) fail("Motion track no longer exists.");
      component.motion = catalogObjects(component.motion).filter(track => track.id !== edit.trackId); break;
    }
    case "motion": {
      if (!["durationMs", "easing"].includes(edit.field) || !isObject(component.studioMotion)) fail("Invalid motion property.");
      component.studioMotion[edit.field] = edit.value;
      if (edit.field === "durationMs" && typeof edit.value === "number") component.studioMotion.cleanupMs = Math.max(edit.value + 1, edit.value + 340);
      break;
    }
    case "sample-content": if (!["label", "title", "body", "actionLabel", "closeLabel"].includes(edit.field) || !isObject(component.previewContent)) fail("Invalid sample content field."); else component.previewContent[edit.field] = edit.value; break;
  }
  recordReferenceEdit(component, designs, edit);
}
function syncOrder(component: AdsDocument, designs: AdsDocument[]): void {
  const source = catalogObjects(component.parts), parts: JsonObject[] = [];
  const visit = (parent: JsonObject) => { parts.push(parent); for (const child of source.filter(item => item.parent === parent.id)) visit(child); };
  const root = source.find(item => item.parent === null); if (root) visit(root);
  component.parts = parts;
  (component.accessibility as JsonObject).readingOrder = parts.map(part => part.id!);
  for (const design of designs) for (const layout of catalogObjects(design.layout)) layout.childOrder = parts.filter(part => part.parent === layout.targetPartRef).map(part => part.id!);
}
