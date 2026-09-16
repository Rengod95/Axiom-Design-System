import type { JsonObject } from "./contracts.ts";
import { isObject } from "./documents.ts";
import { STUDIO_REFERENCE_TEMPLATES } from "./studio-reference-data.ts";
import { studioLibraryIdentity } from "./studio-library.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";
import { canonicalJson } from "./canonical-json.ts";
import { inspectReferenceParts } from "./studio-reference-bindings.ts";
import { STUDIO_MOTION } from "./studio-constants.ts";

export interface StudioReferenceTemplate {
  id: string; catalogId: string; sourceCatalogId: string; sourceRow: number;
  provider: string; name: string; bundle: "shadcn" | "mantine" | "react-aria" | "base-ui";
  docsUrl: string; sourceUrl: string; commit: string; version: string; style: string;
}
export interface StudioReferenceSelection {
  templateId: string;
  contentFields: string[];
  valueIds: string[];
}
export const REFERENCE_CONTENT_FIELDS = ["label", "title", "body", "actionLabel", "closeLabel", "variant"] as const;
export const REFERENCE_LAYOUT_FIELDS = ["gap", "padding", "minHeight", "axis", "width", "height", "alignment", "mode", "position", "childOrder"] as const;

export function getStudioReferenceTemplate(id: string): StudioReferenceTemplate | null {
  const template = STUDIO_REFERENCE_TEMPLATES.find(item => item.id === id);
  return template ? structuredClone(template) : null;
}
export function studioReferenceForCatalog(catalogId: string): StudioReferenceTemplate | null {
  const template = STUDIO_REFERENCE_TEMPLATES.find(item => item.catalogId === studioLibraryIdentity(catalogId));
  return template ? structuredClone(template) : null;
}
export function listStudioReferenceTemplates(): readonly StudioReferenceTemplate[] { return structuredClone(STUDIO_REFERENCE_TEMPLATES); }

/** Pinned bundled code is selected by ID; document data cannot supply scripts, CSS selectors or remote URLs. */
export function inspectStudioReference(document: JsonObject, sourceCatalogId: string, add: (path: string, message: string) => void): void {
  if (document.studioReference === undefined) return;
  inspectReferenceParts(document, add);
  const ref = document.studioReference;
  const template = isObject(ref) && typeof ref.templateId === "string" ? getStudioReferenceTemplate(ref.templateId) : null;
  const contract = document.publicContract;
  const recipe = getStudioCatalogRecipe(sourceCatalogId);
  if (document.studioBehavior || document.studioComposition || Array.isArray(document.motion) && document.motion.length) add("/studioReference", "Original template behavior, instances and motion need a provider-specific authoring mapping.");
  if (recipe && isObject(contract)) {
    const values = Array.isArray(contract.values) ? contract.values.filter(isObject) : [];
    if (values.length !== recipe.values.length || values.some(value => { const expected = recipe.values.find(item => item.name === value.name); return !expected || canonicalJson(value.defaultValue ?? null) !== canonicalJson(expected.defaultValue); })) add("/studioReference", "Reference value ports retain their compatibility defaults until mapped to the original runtime.");
    if (Array.isArray(contract.variants) && contract.variants.some(value => isObject(value) && value.default !== "filled")) add("/studioReference", "Original provider variants require an explicit authoring mapping.");
    const events = Array.isArray(contract.events) ? contract.events.filter(isObject) : [];
    if (events.length !== recipe.events.length) add("/publicContract/events", "Original event ports retain their compatibility baseline until mapped to the provider runtime.");
    const parts = Array.isArray(document.parts) ? document.parts.filter(isObject) : [];
    const slots = Array.isArray(document.slots) ? document.slots.filter(isObject) : [];
    if (slots.length !== recipe.slots.length || recipe.slots.some(expected => {
      const matching = slots.filter(slot => slot.ownerPartRef === parts.find(part => part.studioRole === expected.role)?.id);
      return matching.length !== 1 || matching[0]!.min !== (expected.required ? 1 : 0) || matching[0]!.max !== "unbounded";
    })) add("/slots", "Original slots retain their declared owner and cardinality; provider slot authoring is not mapped.");
    if (!isObject(document.accessibility) || document.accessibility.label !== recipe.entry.name || document.accessibility.description !== "") add("/accessibility", "Original accessibility is supplied by the pinned example; compatibility labels cannot override its runtime.");
    if (canonicalJson(document.studioMotion ?? null) !== canonicalJson({ ...STUDIO_MOTION, easing: "ease-out" })) add("/studioMotion", "Original motion retains its compatibility baseline until mapped to the provider runtime.");
    if (canonicalJson(document.previewContent ?? null) !== canonicalJson({ label: recipe.entry.name, title: recipe.entry.name, body: `${recipe.entry.name} content`, actionLabel: "Continue", closeLabel: "Close" })) add("/previewContent", "Edit mapped element text; generic sample content is not applied to original examples.");
  }
  if (!isObject(ref) || Object.keys(ref).some(key => !["templateId", "contentFields", "valueIds"].includes(key)) || !template || template.sourceCatalogId !== sourceCatalogId
    || !Array.isArray(ref.contentFields) || ref.contentFields.length !== 0
    || !Array.isArray(ref.valueIds) || ref.valueIds.length !== 0) {
    add("/studioReference", "Reference templates require a known pinned original catalog and explicit, unique content/value overrides.");
  }
}

export function inspectReferenceLayout(document: JsonObject, add: (path: string, message: string) => void): void {
  const overrides = document.referenceLayout;
  if (overrides === undefined) return;
  const partIds = Array.isArray(document.nodeMappings) ? document.nodeMappings.filter(isObject).map(item => item.partRef) : [];
  if (!Array.isArray(overrides) || overrides.length > partIds.length) { add("/referenceLayout", "Reference layout overrides require existing part identities."); return; }
  const seen = new Set();
  for (const row of overrides) {
    if (!isObject(row) || Object.keys(row).some(key => !["partRef", "fields"].includes(key)) || !partIds.includes(row.partRef) || seen.has(row.partRef)
      || !Array.isArray(row.fields) || row.fields.length > REFERENCE_LAYOUT_FIELDS.length || new Set(row.fields).size !== row.fields.length || row.fields.some(field => !REFERENCE_LAYOUT_FIELDS.includes(field as never))) {
      add("/referenceLayout", "Reference layout fields must be unique, supported, and owned by the design."); return;
    }
    seen.add(row.partRef);
  }
}
