import type { StudioCategory, StudioComponent, StudioPart } from "./studio-contracts.ts";
import type { StudioSemanticKind } from "./studio-catalog-contracts.ts";
import type { JsonObject } from "./contracts.ts";
import { isObject } from "./documents.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";
import { getStudioReferencePartBinding } from "./studio-reference-bindings.ts";

export type StudioElementKind = "box" | "frame" | "text";
export type ElementContentKind = "flow" | "phrasing" | "none";
/** Native semantic anchors own their element and input contract. Their content may be authored. */
export function semanticElementContent(kind: StudioSemanticKind, role: string): ElementContentKind {
  if (kind === "layout") return "flow";
  const anchors: Partial<Record<StudioSemanticKind, readonly string[]>> = {
    button: ["root", "label"], surface: ["root", "header", "body", "actions"], toast: ["root", "body", "close"],
    "text-input": ["root", "label", "description"], textarea: ["root", "label", "description"], "number-input": ["root", "label", "description", "decrement", "increment"],
    checkbox: ["root", "indicator", "label"], radio: ["root", "indicator", "label"], switch: ["root", "indicator", "label"], toggle: ["root", "label"],
    "choice-group": ["root", "label", "list", "item", "description"], select: ["root", "label", "description"],
    slider: ["root", "label", "value"], "range-slider": ["root", "label", "value"], progress: ["root", "label", "value"], meter: ["root", "label", "value"], loading: ["root", "indicator", "label"],
    badge: ["root", "body"], text: ["root", "body"], avatar: ["root", "fallback"], image: ["root", "fallback"],
    tabs: ["root", "trigger", "panel"], accordion: ["root", "item", "trigger", "indicator", "panel"],
    dialog: ["root", "trigger", "title", "body", "close"], tooltip: ["root", "trigger", "content"], menu: ["root", "trigger", "item"], link: ["root", "label"], navigation: ["root", "item"],
    table: ["cell"], list: ["item"], field: ["root", "label", "body", "description", "error"], alert: ["root", "title", "body", "close"], toolbar: ["root", "body"],
  };
  if (!anchors[kind]?.includes(role)) return "none";
  if (["button", "toggle", "link", "badge", "text"].includes(kind) || ["trigger", "indicator", "label", "title", "description", "error", "value", "close", "decrement", "increment", "fallback"].includes(role) || kind === "tooltip" && role === "content" || ["menu", "choice-group"].includes(kind) && role === "item") return "phrasing";
  return "flow";
}

export const PHRASING_ELEMENTS = ["span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "code"] as const;
export function elementContentContext(parts: readonly StudioPart[], elements: Record<string, string>, kind: StudioSemanticKind, parentId: string, referenceTemplateId?: string): ElementContentKind {
  const parent = parts.find(part => part.id === parentId);
  if (!parent || parent.elementKind === "text") return "none";
  const nativeContent = (part: StudioPart) => referenceTemplateId ? getStudioReferencePartBinding(referenceTemplateId, part.role)?.content ?? "none" : semanticElementContent(kind, part.role);
  const own = parent.elementKind ? "flow" : nativeContent(parent);
  if (own === "none") return own;
  let current: StudioPart | undefined = parent;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (PHRASING_ELEMENTS.includes(elements[current.id] as typeof PHRASING_ELEMENTS[number]) || !current.elementKind && nativeContent(current) === "phrasing") return "phrasing";
    current = parts.find(part => part.id === current!.parent);
  }
  return own;
}

export function getStudioElementParentIssue(component: StudioComponent, category: StudioCategory, parentId: string): string | null {
  if (!component.catalog) return "This original component has fixed internal structure. Create an editable component from Library.";
  const design = category === "Web" ? component.web : component.mobile;
  return elementContentContext(component.parts, design.elements ?? {}, component.catalog.semantic.kind, parentId, component.catalog.reference?.templateId) === "none" ? component.catalog.reference ? "This original element has no verified child insertion point. Choose a mapped container or an authored frame." : "This element owns native behavior or text content. Choose a container, Trigger or Content instead." : null;
}
export function canContainStudioElement(component: StudioComponent, category: StudioCategory, parentId: string): boolean { return getStudioElementParentIssue(component, category, parentId) === null; }

export function sourceElementContent(component: JsonObject, design: JsonObject, parentId: string): ElementContentKind {
  const pin = isObject(component.catalogProfile) ? component.catalogProfile : {};
  const recipe = getStudioCatalogRecipe(String(pin.catalogId));
  if (!recipe) return "none";
  const parts = (Array.isArray(component.parts) ? component.parts.filter(isObject) : []).map(part => ({ id: String(part.id), name: String(part.name), parent: part.parent as string | null, role: String(part.studioRole), ...(part.studioElement ? { elementKind: part.studioElement as StudioElementKind } : {}) }));
  const elements = Object.fromEntries((Array.isArray(design.nodeMappings) ? design.nodeMappings.filter(isObject) : []).filter(mapping => typeof mapping.element === "string").map(mapping => [String(mapping.partRef), String(mapping.element)]));
  return elementContentContext(parts, elements, recipe.semantic.kind, parentId, isObject(component.studioReference) ? String(component.studioReference.templateId) : undefined);
}

/** The template tree for a compound collection, without inventing per-item source identities. */
export function semanticParentRole(kind: StudioSemanticKind, role: string, roles: readonly string[]): string | null {
  if (role === "root") return null;
  if (kind === "accordion") {
    if (role === "item") return "root";
    if (role === "header" || role === "panel") return roles.includes("item") ? "item" : "root";
    if (role === "trigger") return roles.includes("header") ? "header" : roles.includes("item") ? "item" : "root";
    if (role === "indicator") return "trigger";
  }
  if (kind === "tabs" && role === "trigger" || ["choice-group", "menu", "navigation"].includes(kind) && role === "item") return "list";
  if (kind === "table" && role === "cell") return "row";
  return "root";
}
