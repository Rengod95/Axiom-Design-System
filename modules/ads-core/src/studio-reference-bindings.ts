import type { JsonObject, JsonValue } from "./contracts.ts";
import { canonicalJson } from "./canonical-json.ts";
import { isObject } from "./documents.ts";
import { STUDIO_REFERENCE_BINDINGS } from "./studio-reference-binding-data.ts";
import { STUDIO_REFERENCE_TEMPLATES } from "./studio-reference-data.ts";

export interface StudioReferencePartBinding { role: string; tag: string; text: boolean; content: "none" | "phrasing" | "flow" }
export interface StudioReferenceBindingProfile {
  sourceRow: number; commit: string;
  parts: { role: string; parent: string | null; required: boolean; designs: Record<string, { layout: JsonObject; element?: string }> }[];
  bindings: StudioReferencePartBinding[];
}
const rows = (value: unknown): JsonObject[] => Array.isArray(value) ? value.filter(isObject) : [];
const same = (left: JsonValue | undefined, right: JsonValue | undefined): boolean => canonicalJson(left ?? null) === canonicalJson(right ?? null);

function bindingProfile(templateId: string): StudioReferenceBindingProfile | null {
  const template = STUDIO_REFERENCE_TEMPLATES.find(item => item.id === templateId);
  const profile = Object.hasOwn(STUDIO_REFERENCE_BINDINGS, templateId) ? STUDIO_REFERENCE_BINDINGS[templateId] : null;
  return profile && template && profile.commit === template.commit && profile.sourceRow === template.sourceRow ? profile : null;
}
export function getStudioReferenceBindingProfile(templateId: string): StudioReferenceBindingProfile | null {
  const profile = bindingProfile(templateId); return profile ? structuredClone(profile) : null;
}
export function getStudioReferencePartBinding(templateId: string, role: string): StudioReferencePartBinding | null {
  const binding = bindingProfile(templateId)?.bindings.find(item => item.role === role);
  return binding ? { ...binding } : null;
}
function profileFor(component: JsonObject): StudioReferenceBindingProfile | null {
  return isObject(component.studioReference) && typeof component.studioReference.templateId === "string" ? bindingProfile(component.studioReference.templateId) : null;
}
export function referencePartContent(component: JsonObject, role: string): "none" | "phrasing" | "flow" | null {
  if (!component.studioReference) return null;
  return profileFor(component)?.bindings.find(item => item.role === role)?.content ?? "none";
}

/** Source imports obey the same measured capabilities as property commands. */
export function inspectReferenceParts(component: JsonObject, add: (path: string, message: string) => void): void {
  if (component.studioReference === undefined) return;
  const profile = profileFor(component);
  if (!profile) { add("/studioReference", "This template has no verified editable binding profile."); return; }
  const parts = rows(component.parts), byId = new Map(parts.map(part => [part.id, part]));
  for (const expected of profile.parts) {
    const part = parts.find(part => part.studioRole === expected.role);
    if (!part || part.studioElement !== undefined || part.required !== expected.required || (part.parent === null ? null : byId.get(part.parent)?.studioRole) !== expected.parent) add("/parts", `Original ${expected.role} retains its pinned semantic structure.`);
  }
  for (const [index, part] of parts.entries()) {
    const expected = profile.parts.find(row => row.role === part.studioRole), binding = profile.bindings.find(row => row.role === part.studioRole);
    if (!expected && !part.studioElement) add(`/parts/${index}`, "Additional reference parts must be authored elements, not unmapped semantic roles.");
    if (expected && part.studioText !== undefined && !binding?.text) add(`/parts/${index}/studioText`, "This original part has no editable text node in the pinned example.");
    if (part.studioElement) {
      const parent = byId.get(part.parent), parentBinding = profile.bindings.find(row => row.role === parent?.studioRole);
      if (!parent || parent.studioElement === "text" || !parent.studioElement && (!parentBinding || parentBinding.content === "none")) add(`/parts/${index}/parent`, "Authored elements require a mapped original container or an authored container.");
    }
  }
  const actualOrder = parts.filter(part => !part.studioElement).map(part => String(part.studioRole));
  if (!same(actualOrder, profile.parts.map(part => part.role))) add("/parts", "The original semantic part order is pinned; reorder authored children inside an authored container.");
}

export function inspectReferenceDesign(component: JsonObject, design: JsonObject, add: (path: string, message: string) => void): void {
  if (component.studioReference === undefined) return;
  const profile = profileFor(component); if (!profile) return;
  const parts = rows(component.parts), masks = rows(design.referenceLayout), layouts = rows(design.layout);
  const editable = (id: JsonValue | undefined) => { const part = parts.find(part => part.id === id); return part && (part.studioElement || profile.bindings.some(binding => binding.role === part.studioRole)); };
  for (const [index, rule] of rows(design.appearance).entries()) {
    if (!editable(rule.targetPartRef)) add(`/appearance/${index}/targetPartRef`, "This original part has no verified paint binding.");
    if (!isObject(rule.variants) || Object.keys(rule.variants).length || !isObject(rule.states) || Object.keys(rule.states).length) add(`/appearance/${index}`, "Original templates support base paint only; conditional provider states require an explicit runtime mapping.");
  }
  for (const [index, mask] of masks.entries()) {
    if (!editable(mask.partRef)) add(`/referenceLayout/${index}`, "This original part has no verified layout binding.");
    const layout = layouts.find(row => row.targetPartRef === mask.partRef);
    for (const field of Array.isArray(mask.fields) ? mask.fields : []) {
      const value = field === "width" || field === "height" ? isObject(layout?.size) ? layout.size[field] : undefined : typeof field === "string" ? layout?.[field] : undefined;
      if (value === undefined) add(`/referenceLayout/${index}`, "An explicit layout mask requires its corresponding value.");
    }
  }
  for (const [index, mapping] of rows(design.nodeMappings).entries()) {
    const part = parts.find(part => part.id === mapping.partRef), baseline = profile.parts.find(row => row.role === part?.studioRole)?.designs[String(design.category)];
    if (part && !part.studioElement && baseline && mapping.element !== baseline.element) add(`/nodeMappings/${index}/element`, "Original HTML mappings cannot be replaced through raw source.");
  }
  for (const [index, layout] of layouts.entries()) {
    const part = parts.find(part => part.id === layout.targetPartRef); if (!part) continue;
    const children = parts.filter(child => child.parent === part.id).map(child => child.id!);
    if (!same(layout.childOrder, children)) add(`/layout/${index}/childOrder`, "Reference child order must match the authored part tree.");
    if (part.studioElement) continue;
    const baseline = profile.parts.find(row => row.role === part.studioRole)?.designs[String(design.category)]?.layout; if (!baseline) continue;
    const fields = masks.find(row => row.partRef === part.id)?.fields;
    for (const field of ["gap", "padding", "minHeight", "axis", "width", "height", "alignment", "mode", "position"]) {
      if (Array.isArray(fields) && fields.includes(field)) continue;
      const value = field === "width" || field === "height" ? isObject(layout.size) ? layout.size[field] : undefined : layout[field];
      const expected = field === "width" || field === "height" ? isObject(baseline.size) ? baseline.size[field] : undefined : baseline[field];
      if (!same(value, expected)) add(`/layout/${index}/${field}`, "Changing an original layout value requires an explicit, supported reference mask.");
    }
  }
}
