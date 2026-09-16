import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import type { StudioComponentEdit } from "./studio-catalog-contracts.ts";
import { isObject } from "./documents.ts";
import { KernelError } from "./kernel-error.ts";
import { STUDIO_CATALOG_CODE } from "./studio-catalog-constants.ts";
import { getStudioReferencePartBinding } from "./studio-reference-bindings.ts";

export function requireReferenceEditSupport(component: AdsDocument, edit: StudioComponentEdit): void {
  if (!component.studioReference) return;
  const templateId = isObject(component.studioReference) ? String(component.studioReference.templateId) : "";
  const parts = Array.isArray(component.parts) ? component.parts.filter(isObject) : [];
  if (["part-text", "appearance", "layout"].includes(edit.kind) && "partId" in edit) {
    const part = parts.find(part => part.id === edit.partId);
    const binding = part ? getStudioReferencePartBinding(templateId, String(part.studioRole)) : null;
    if (part && !part.studioElement && (!binding || edit.kind === "part-text" && !binding.text)) throw new KernelError(STUDIO_CATALOG_CODE.invalid, edit.kind === "part-text" ? "This original part has no verified editable text node." : "This original part has no verified visual binding. Select a mapped part or an authored element.");
  }
  if (edit.kind === "element-add" || edit.kind === "part-parent") {
    const parent = parts.find(part => part.id === edit.parentId), binding = parent ? getStudioReferencePartBinding(templateId, String(parent.studioRole)) : null;
    if (parent && !parent.studioElement && (!binding || binding.content === "none")) throw new KernelError(STUDIO_CATALOG_CODE.invalid, "Choose a mapped original container or an authored container for this element.");
  }
  if (["part-delete", "part-parent", "part-element"].includes(edit.kind) && "partId" in edit && Array.isArray(component.parts) && !component.parts.some(part => isObject(part) && part.id === edit.partId && part.studioElement)) throw new KernelError(STUDIO_CATALOG_CODE.invalid, "Original semantic elements retain their HTML tree. Structural changes apply to authored elements.");
  if (edit.kind === "part-order" && Array.isArray(component.parts) && component.parts.some(part => isObject(part) && part.parent === edit.parentId && !part.studioElement)) throw new KernelError(STUDIO_CATALOG_CODE.invalid, "The original template's semantic anchor order is retained. Reordering authored elements is supported inside an authored container.");
  if (!["name", "purpose", "frame", "part-name", "part-text", "part-element", "part-parent", "part-delete", "part-order", "element-add", "layout", "appearance"].includes(edit.kind)) throw new KernelError(STUDIO_CATALOG_CODE.invalid, "This original template supports explicit element text, paint and layout edits. Its upstream values, variants, behavior, content slots and motion require a provider-specific authoring mapping.");
}

/** Record only deliberate edits so generated generic defaults never overwrite an upstream design. */
export function recordReferenceEdit(component: AdsDocument, designs: AdsDocument[], edit: StudioComponentEdit): void {
  const reference = component.studioReference;
  if (!isObject(reference)) return;
  const add = (key: string, value: string) => { const values = reference[key] as JsonValue[]; if (!values.includes(value)) values.push(value); };
  if (edit.kind === "sample-content") add("contentFields", edit.field);
  if (edit.kind === "variant-default") add("contentFields", "variant");
  if (edit.kind === "value-default") add("valueIds", edit.valueId);
  if (edit.kind === "value-delete") reference.valueIds = (reference.valueIds as JsonValue[]).filter(value => value !== edit.valueId);
  for (const design of designs) {
    const masks = (design.referenceLayout ??= []) as JsonObject[];
    if (edit.kind === "part-delete") { design.referenceLayout = masks.filter(row => row.partRef !== edit.partId); continue; }
    if (!(edit.kind === "layout" && design.category === edit.category || edit.kind === "part-order")) continue;
    const partId = edit.kind === "layout" ? edit.partId : edit.parentId, field = edit.kind === "layout" ? edit.field : "childOrder";
    let mask = masks.find(row => row.partRef === partId);
    if (!mask) { mask = { partRef: partId, fields: [] }; masks.push(mask); }
    if (!(mask.fields as JsonValue[]).includes(field)) (mask.fields as JsonValue[]).push(field);
  }
}
