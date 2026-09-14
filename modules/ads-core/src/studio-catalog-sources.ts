import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import type { StudioCatalogRecipe } from "./studio-catalog-contracts.ts";
import { canonicalJson } from "./canonical-json.ts";
import { isObject } from "./documents.ts";
import { catalogObjects } from "./studio-catalog-validation.ts";
import { STUDIO_CATALOG_PROFILE } from "./studio-catalog-constants.ts";
import { STUDIO_ARCHETYPE_VERSION, STUDIO_CATEGORIES, STUDIO_MOTION, STUDIO_SCHEMA_VERSION, STUDIO_SOURCE_PROFILE } from "./studio-constants.ts";
import { studioCatalogPresentation } from "./studio-catalog-presentation.ts";

const dimension = (value: number): JsonObject => ({ value, unit: "px" });
const color = (value: number): JsonObject => ({ colorSpace: "srgb", components: [value, value, value], alpha: 1 });

/** Produce independent IDs for one definition and its two category designs. */
export function createCatalogSources(recipe: StudioCatalogRecipe, foundation: AdsDocument, name: string, id: () => string): AdsDocument[] {
  const presentation = studioCatalogPresentation(recipe.entry, recipe.semantic.kind);
  const pin = { ...STUDIO_CATALOG_PROFILE, catalogId: recipe.entry.id };
  const envelope = (kind: string, name: string): AdsDocument => ({ id: id(), kind, name, schemaVersion: STUDIO_SCHEMA_VERSION, revision: id(), studioProfile: { ...STUDIO_SOURCE_PROFILE }, catalogProfile: { ...pin }, metadata: {}, extensions: {} });
  const sourceParts = [...recipe.parts, ...presentation.parts.filter(part => !recipe.parts.some(existing => existing.role === part.role)).map(part => ({ role: part.role, required: false }))];
  const component = envelope("component", name), parts = sourceParts.map(part => {
    const visual = presentation.parts.find(item => item.role === part.role);
    return { id: id(), name: part.role, studioRole: part.role, parent: null as string | null, roleRefs: [], required: part.required, cardinality: { min: 1, max: 1 }, relationships: [], ...(visual?.text !== undefined ? { studioText: visual.text } : {}) };
  });
  const root = parts[0]!; for (const part of parts.slice(1)) part.parent = root.id;
  const partId = (role: string): string => parts.find(part => part.studioRole === role)!.id;
  for (const visual of presentation.parts) { const part = parts.find(item => item.studioRole === visual.role); if (part && part !== root) part.parent = partId(visual.parent); }
  const events = recipe.events.map(event => ({ id: id(), name: event.name, payloadType: structuredClone(event.payloadType), phase: "intent", cancellable: false, visibility: "public" }));
  const values = recipe.values.map(value => ({ id: id(), name: value.name, type: structuredClone(value.type), ownership: "consumer", defaultValue: structuredClone(value.defaultValue), visibility: "public", ...(value.requestEvent ? { requestEventRef: events.find(event => event.name === value.requestEvent)!.id } : {}) }));
  const slots = recipe.slots.map(slot => ({ id: id(), ownerPartRef: partId(slot.role), contentKinds: ["text", "component"], min: slot.required ? 1 : 0, max: "unbounded", defaultContent: [], allowedContractRefs: [] }));
  Object.assign(component, { purpose: recipe.entry.name, archetypeRef: { id: `axiom.archetype.${recipe.entry.id}`, expectedKind: "archetype", version: STUDIO_ARCHETYPE_VERSION }, traitBindings: [], parts, slots,
    publicContract: { values, events, variants: [{ id: id(), name: "variant", options: ["filled", "outlined"], default: "filled" }], exposedSlots: slots.map(slot => slot.id), replaceableParts: [], allowedOverrides: [] },
    behavior: { states: [], transitions: [], hostBindings: [], profile: { id: `axiom.behavior.${recipe.entry.id}`, version: STUDIO_CATALOG_PROFILE.version } },
    accessibility: { purpose: recipe.semantic.role, label: name, description: "", nameSources: [], descriptionSources: [], stateExposure: [], readingOrder: parts.map(part => part.id), focus: { mode: "semantic-profile" }, announcements: [], requirements: [] },
    motion: [], requirements: [], studioMotion: { ...STUDIO_MOTION, easing: "ease-out" }, previewContent: { label: name, title: name, body: `${name} content`, actionLabel: "Continue", closeLabel: "Close" } });
  const tokens = new Set(catalogObjects(foundation.tokens).map(token => token.id));
  const binding = (token: string, fallback: JsonValue): JsonValue => tokens.has(token) ? { tokenRef: token } : fallback;
  const designs = STUDIO_CATEGORIES.map(category => {
    const design = envelope("design", `${name} ${category}`);
    const partPadding = (role: string): number => {
      if (role === "root") return presentation.padding;
      if (role.startsWith("item_") || role.startsWith("result_") || role.startsWith("option_")) return 6;
      if (["first_pane", "second_pane", "message"].includes(role)) return 12;
      if (["submit", "step_1"].includes(role)) return 10;
      if (role === "body" && ["dropzone", "overlay", "loading-overlay", "navigation-progress", "affix"].includes(presentation.shape)) return 16;
      return 0;
    };
    const declarations: JsonObject = { color: binding("token.content", color(.1)), fontSize: binding("token.fontSize", dimension(14)), background: presentation.surface ? binding("token.surface", color(1)) : { colorSpace: "srgb", components: [0, 0, 0], alpha: 0 }, borderWidth: dimension(presentation.border ? 1 : 0), borderRadius: binding("token.radius", dimension(8)) };
    if (presentation.border) declarations.borderColor = binding("token.border", color(.8));
    Object.assign(design, { componentRef: { id: component.id, expectedKind: "component" }, foundationRef: { id: foundation.id, expectedKind: "foundation" }, category,
      nodeMappings: parts.map(part => ({ partRef: part.id, role: part.studioRole })),
      layout: parts.map(part => ({ targetPartRef: part.id, mode: "stack", axis: presentation.parts.find(item => item.role === part.studioRole)?.axis ?? (part === root || part.studioRole === "body" ? presentation.axis : ["actions", "list", "toolbar"].includes(part.studioRole) && ["tabs", "toolbar", "navigation"].includes(recipe.semantic.kind) ? "horizontal" : "vertical"), size: {}, gap: dimension(part === root || parts.some(child => child.parent === part.id) ? presentation.gap : 0), padding: dimension(partPadding(part.studioRole)), minHeight: dimension(part === root ? presentation.minHeight && category === "Mobile" ? Math.max(presentation.minHeight, 48) : presentation.minHeight : 0), childOrder: parts.filter(child => child.parent === part.id).map(child => child.id) })),
      appearance: [{ id: id(), targetPartRef: root.id, variants: {}, states: {}, declarations, explicitPriority: 0, refines: [] }], targetOverrides: [] });
    return design;
  });
  return [component, ...designs];
}

/** Remap only owned IDs and declared local references; opaque payloads and sample text remain byte-meaningful data. */
export function duplicateComponentSources(component: AdsDocument, designs: AdsDocument[], name: string, id: () => string): AdsDocument[] {
  const sources = JSON.parse(canonicalJson([component, ...designs])) as AdsDocument[];
  const copy = sources[0]!, contract = copy.publicContract as JsonObject;
  const entities: JsonObject[] = [copy, ...catalogObjects(copy.parts), ...catalogObjects(copy.slots), ...catalogObjects(copy.motion), ...catalogObjects(contract.values), ...catalogObjects(contract.events), ...catalogObjects(contract.variants), ...sources.slice(1), ...sources.slice(1).flatMap(design => catalogObjects(design.appearance))];
  const ids = new Map(entities.map(entity => [String(entity.id), id()]));
  const mapped = (value: JsonValue | undefined): JsonValue => typeof value === "string" && ids.has(value) ? ids.get(value)! : value ?? null;
  for (const entity of entities) entity.id = mapped(entity.id);
  for (const source of sources) source.revision = id();
  copy.name = name;
  for (const part of catalogObjects(copy.parts)) part.parent = mapped(part.parent);
  for (const track of catalogObjects(copy.motion)) track.targetPartRef = mapped(track.targetPartRef);
  for (const slot of catalogObjects(copy.slots)) slot.ownerPartRef = mapped(slot.ownerPartRef);
  for (const value of catalogObjects(contract.values)) if (value.requestEventRef !== undefined) value.requestEventRef = mapped(value.requestEventRef);
  for (const key of ["exposedSlots", "replaceableParts"]) if (Array.isArray(contract[key])) contract[key] = contract[key].map(mapped);
  if (isObject(copy.accessibility) && Array.isArray(copy.accessibility.readingOrder)) copy.accessibility.readingOrder = copy.accessibility.readingOrder.map(mapped);
  for (const design of sources.slice(1)) {
    design.name = `${name} ${String(design.category)}`;
    if (isObject(design.componentRef)) { design.componentRef.id = copy.id; if (design.componentRef.revision !== undefined) design.componentRef.revision = copy.revision; }
    for (const mapping of catalogObjects(design.nodeMappings)) mapping.partRef = mapped(mapping.partRef);
    for (const layout of catalogObjects(design.layout)) { layout.targetPartRef = mapped(layout.targetPartRef); if (Array.isArray(layout.childOrder)) layout.childOrder = layout.childOrder.map(mapped); }
    for (const rule of catalogObjects(design.appearance)) rule.targetPartRef = mapped(rule.targetPartRef);
    if (isObject(design.editorFrame) && typeof design.editorFrame.x === "number" && typeof design.editorFrame.y === "number") { design.editorFrame.x += 32; design.editorFrame.y += 32; }
  }
  return sources;
}
