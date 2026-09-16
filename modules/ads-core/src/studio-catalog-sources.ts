import { semanticParentRole } from "./studio-element-contract.ts";
import { applyCatalogDesignBaseline } from "./studio-catalog-design-baseline.ts";
import { remapStudioBehavior } from "./studio-behavior.ts";
import { studioInstances } from "./studio-composition.ts";
import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import type { StudioCatalogRecipe } from "./studio-catalog-contracts.ts";
import type { FoundationDocument, FoundationToken, ResolvedFoundationToken } from "./foundation-contracts.ts";
import { canonicalJson } from "./canonical-json.ts";
import { isObject } from "./documents.ts";
import { catalogObjects } from "./studio-catalog-validation.ts";
import { STUDIO_CATALOG_PROFILE } from "./studio-catalog-constants.ts";
import { STUDIO_ARCHETYPE_VERSION, STUDIO_CATEGORIES, STUDIO_MOTION, STUDIO_SCHEMA_VERSION, STUDIO_SOURCE_PROFILE } from "./studio-constants.ts";
import { studioCatalogPresentation } from "./studio-catalog-presentation.ts";
import { resolveFoundationTokens } from "./foundation-resolution.ts";
import { isStudioTokenCompatible, resolveStudioDimension, studioLengthPixels } from "./studio-style-values.ts";

const dimension = (value: number): JsonObject => ({ value, unit: "px" });
const color = (value: number): JsonObject => ({ colorSpace: "srgb", components: [value, value, value], alpha: 1 });
type BaselineProperty = "color" | "background" | "borderColor" | "borderRadius" | "fontSize";
const BASELINE_TOKEN_INTENTS: Readonly<Record<BaselineProperty, { canonical: string; names: readonly string[] }>> = {
  color: { canonical: "token.content", names: ["text.primary", "content.primary", "foreground", "text.default", "content.default"] },
  background: { canonical: "token.surface", names: ["surface.raised", "surface.default", "surface.canvas", "background.default", "background"] },
  borderColor: { canonical: "token.border", names: ["border.default", "border.subtle", "border.color", "bordercolor", "border"] },
  borderRadius: { canonical: "token.radius", names: ["radius.control", "radius.default", "radius.component", "radius.md", "radii.md", "border.radius", "radius"] },
  fontSize: { canonical: "token.fontSize", names: ["text.body.size", "font.size.body", "font.size.default", "font.size.base", "font.size.16", "font.size.14", "fontsize", "font.size"] },
};
const BASELINE_PATH_NAMESPACES = new Set(["semantic", "color", "colors"]);

/** New defaults must render in every named theme; source values remain subject to normal projection validation. */
function renderableBaselineToken(token: ResolvedFoundationToken, property: BaselineProperty): boolean {
  if (!isStudioTokenCompatible(token, property) || !isObject(token.value)) return false;
  const value = token.value;
  if (token.type === "dimension") { try { const length = resolveStudioDimension(value); return property !== "fontSize" || studioLengthPixels(length) > 0; } catch { return false; } }
  return Object.keys(value).every(key => ["colorSpace", "components", "alpha", "hex"].includes(key)) && value.colorSpace === "srgb"
    && Array.isArray(value.components) && value.components.length === 3 && value.components.every(channel => typeof channel === "number" && Number.isFinite(channel) && channel >= 0 && channel <= 1)
    && (value.alpha === undefined || typeof value.alpha === "number" && Number.isFinite(value.alpha) && value.alpha >= 0 && value.alpha <= 1);
}

/** Names are optional default-selection hints, never type/domain authority or required user token names. */
function baselineTokenBindings(document: AdsDocument): Map<BaselineProperty, string> {
  const foundation = document as FoundationDocument;
  const resolutions = [{}, ...foundation.themeSets.map(set => ({ themeSetId: set.id }))].map(selection => resolveFoundationTokens(foundation, selection));
  const bindings = new Map<BaselineProperty, string>();
  if (resolutions.some(result => !result.valid)) return bindings;
  const resolved = resolutions.map(result => new Map(result.tokens.map(token => [token.id, token])));
  const semanticTiers = new Set(catalogObjects(foundation.tiers).filter(tier => typeof tier.name === "string" && tier.name.toLowerCase() === "semantic").map(tier => tier.id));
  const prefixes = catalogObjects(foundation.originalSources).flatMap(source => typeof source.importPrefix === "string" && source.importPrefix ? [source.importPrefix.toLowerCase()] : []).sort((a, b) => b.length - a.length);
  const intentName = (token: FoundationToken): string => {
    let name = token.name.toLowerCase();
    const prefix = prefixes.find(prefix => name.startsWith(`${prefix}.`)); if (prefix) name = name.slice(prefix.length + 1);
    const segments = name.split("."); while (segments.length > 1 && BASELINE_PATH_NAMESPACES.has(segments[0]!)) segments.shift();
    return segments.join(".");
  };
  for (const property of Object.keys(BASELINE_TOKEN_INTENTS) as BaselineProperty[]) {
    const intent = BASELINE_TOKEN_INTENTS[property];
    const candidates = foundation.tokens.filter(token => (token.deprecated === undefined || token.deprecated === false) && resolved.every(tokens => {
      const value = tokens.get(token.id); return value !== undefined && renderableBaselineToken(value, property);
    }));
    const canonical = candidates.find(token => token.id === intent.canonical);
    if (canonical) { bindings.set(property, canonical.id); continue; }
    const ranked = candidates.flatMap(token => {
      const nameRank = intent.names.indexOf(intentName(token)); if (nameRank < 0) return [];
      const semantic = token.tier !== undefined && semanticTiers.has(token.tier) || "ref" in token.value || "composite" in token.value;
      return [{ id: token.id, semanticRank: semantic ? 0 : 1, nameRank }];
    }).sort((a, b) => a.semanticRank - b.semanticRank || a.nameRank - b.nameRank);
    const first = ranked[0], second = ranked[1];
    // Multiple equally suitable namespaces need a user's choice, not insertion-order guessing.
    if (first && (!second || first.semanticRank !== second.semanticRank || first.nameRank !== second.nameRank)) bindings.set(property, first.id);
  }
  return bindings;
}

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
  if (["accordion", "tabs", "choice-group", "menu", "navigation", "table"].includes(recipe.semantic.kind)) {
    const roles = parts.map(part => part.studioRole);
    for (const part of parts) if (recipe.parts.some(anchor => anchor.role === part.studioRole)) { const parent = semanticParentRole(recipe.semantic.kind, part.studioRole, roles); part.parent = parent === null ? null : partId(parent); }
    const ordered: typeof parts = [];
    const visit = (part: typeof root) => { ordered.push(part); for (const child of parts.filter(item => item.parent === part.id)) visit(child); };
    visit(root); parts.splice(0, parts.length, ...ordered);
  }
  const events = recipe.events.map(event => ({ id: id(), name: event.name, payloadType: structuredClone(event.payloadType), phase: "intent", cancellable: false, visibility: "public" }));
  const values = recipe.values.map(value => ({ id: id(), name: value.name, type: structuredClone(value.type), ownership: "consumer", defaultValue: structuredClone(value.defaultValue), visibility: "public", ...(value.requestEvent ? { requestEventRef: events.find(event => event.name === value.requestEvent)!.id } : {}) }));
  const slots = recipe.slots.map(slot => ({ id: id(), ownerPartRef: partId(slot.role), contentKinds: ["text", "component"], min: slot.required ? 1 : 0, max: "unbounded", defaultContent: [], allowedContractRefs: [] }));
  Object.assign(component, { purpose: recipe.entry.name, archetypeRef: { id: `axiom.archetype.${recipe.entry.id}`, expectedKind: "archetype", version: STUDIO_ARCHETYPE_VERSION }, traitBindings: [], parts, slots,
    publicContract: { values, events, variants: [{ id: id(), name: "variant", options: ["filled", "outlined"], default: "filled" }], exposedSlots: slots.map(slot => slot.id), replaceableParts: [], allowedOverrides: [] },
    behavior: { states: [], transitions: [], hostBindings: [], profile: { id: `axiom.behavior.${recipe.entry.id}`, version: STUDIO_CATALOG_PROFILE.version } },
    accessibility: { purpose: recipe.semantic.role, label: name, description: "", nameSources: [], descriptionSources: [], stateExposure: [], readingOrder: parts.map(part => part.id), focus: { mode: "semantic-profile" }, announcements: [], requirements: [] },
    motion: [], requirements: [], studioMotion: { ...STUDIO_MOTION, easing: "ease-out" }, previewContent: { label: name, title: name, body: `${name} content`, actionLabel: "Continue", closeLabel: "Close" } });
  const tokens = baselineTokenBindings(foundation);
  const binding = (property: BaselineProperty, fallback: JsonValue): JsonValue => tokens.has(property) ? { tokenRef: tokens.get(property)! } : fallback;
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
    const declarations: JsonObject = { color: binding("color", color(.1)), fontSize: binding("fontSize", dimension(14)), background: presentation.surface ? binding("background", color(1)) : { colorSpace: "srgb", components: [0, 0, 0], alpha: 0 }, borderWidth: dimension(presentation.border ? 1 : 0), borderRadius: binding("borderRadius", dimension(8)) };
    if (presentation.border) declarations.borderColor = binding("borderColor", color(.8));
    Object.assign(design, { componentRef: { id: component.id, expectedKind: "component" }, foundationRef: { id: foundation.id, expectedKind: "foundation" }, category,
      nodeMappings: parts.map(part => ({ partRef: part.id, role: part.studioRole })),
      layout: parts.map(part => ({ targetPartRef: part.id, mode: "stack", axis: presentation.parts.find(item => item.role === part.studioRole)?.axis ?? (part === root || part.studioRole === "body" ? presentation.axis : (part.studioRole === "trigger" && recipe.semantic.kind === "accordion" || ["actions", "list", "toolbar"].includes(part.studioRole) && ["tabs", "toolbar", "navigation"].includes(recipe.semantic.kind)) ? "horizontal" : "vertical"), size: {}, gap: dimension(part === root || (category === "Web" || recipe.semantic.kind === "layout") && parts.some(child => child.parent === part.id) ? presentation.gap : 0), padding: dimension(partPadding(part.studioRole)), minHeight: dimension(part === root ? presentation.minHeight && category === "Mobile" ? Math.max(presentation.minHeight, 48) : presentation.minHeight : 0), childOrder: parts.filter(child => child.parent === part.id).map(child => child.id) })),
      appearance: [{ id: id(), targetPartRef: root.id, variants: {}, states: {}, declarations, explicitPriority: 0, refines: [] }], targetOverrides: [] });
    applyCatalogDesignBaseline(design, recipe.semantic.kind, parts, id, binding);
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
  remapStudioBehavior(copy, ids, id);
  if (isObject(copy.studioReference) && Array.isArray(copy.studioReference.valueIds)) copy.studioReference.valueIds = copy.studioReference.valueIds.map(mapped);
  for (const instance of studioInstances(copy)) { instance.id = id(); instance.ownerPartRef = ids.get(instance.ownerPartRef) ?? instance.ownerPartRef; if (instance.slotRef) instance.slotRef = ids.get(instance.slotRef) ?? instance.slotRef; }
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
    for (const mapping of catalogObjects(design.referenceLayout)) mapping.partRef = mapped(mapping.partRef);
    for (const layout of catalogObjects(design.layout)) { layout.targetPartRef = mapped(layout.targetPartRef); if (Array.isArray(layout.childOrder)) layout.childOrder = layout.childOrder.map(mapped); }
    for (const rule of catalogObjects(design.appearance)) rule.targetPartRef = mapped(rule.targetPartRef);
    if (isObject(design.editorFrame) && typeof design.editorFrame.x === "number" && typeof design.editorFrame.y === "number") { design.editorFrame.x += 32; design.editorFrame.y += 32; }
  }
  return sources;
}
