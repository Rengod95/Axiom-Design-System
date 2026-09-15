import { inspectStudioMotion } from "./studio-motion.ts";
import { inspectStudioBehavior } from "./studio-behavior.ts";
import type { JsonObject, JsonValue } from "./contracts.ts";
import { canonicalJson } from "./canonical-json.ts";
import { isObject, isValidId } from "./documents.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";
import { STUDIO_CATALOG_ALIGNMENT, STUDIO_CATALOG_EASINGS, STUDIO_CATALOG_LIMITS, STUDIO_CATALOG_PROFILE } from "./studio-catalog-constants.ts";
import { STUDIO_ARCHETYPE_VERSION, STUDIO_MAX_DIMENSION } from "./studio-constants.ts";

type Sink = (path: string, message: string) => void;
const ENVELOPE = ["id", "kind", "schemaVersion", "revision", "name", "metadata", "extensions", "studioProfile", "catalogProfile"];
const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
export function catalogObjects(value: unknown): JsonObject[] { return Array.isArray(value) ? value.filter(isObject) : []; }
export function catalogKeys(value: JsonObject, allowed: readonly string[]): boolean { return Object.keys(value).every(key => allowed.includes(key)); }
function same(left: JsonValue | undefined, right: unknown): boolean { return left !== undefined && canonicalJson(left) === canonicalJson(right); }
function text(value: unknown, empty = false): boolean { return typeof value === "string" && value.length <= STUDIO_CATALOG_LIMITS.maxTextLength && (empty || !!value.trim()); }
function empty(value: unknown): boolean { return Array.isArray(value) && value.length === 0; }
function number(value: unknown, min = 0, max = STUDIO_MAX_DIMENSION): boolean { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max; }

/** Presence opts into validation; malformed pins never fall through to a different profile. */
export function hasCatalogProfile(document: JsonObject): boolean { return Object.hasOwn(document, "catalogProfile"); }
export function catalogIdentity(document: JsonObject): string | null {
  const profile = document.catalogProfile;
  return isObject(profile) && catalogKeys(profile, ["id", "version", "catalogId"]) && profile.id === STUDIO_CATALOG_PROFILE.id && profile.version === STUDIO_CATALOG_PROFILE.version && typeof profile.catalogId === "string" ? profile.catalogId : null;
}
export function inspectCatalogPin(document: JsonObject, add: Sink): void {
  const id = catalogIdentity(document), entry = id && getStudioCatalogRecipe(id)?.entry;
  if (!entry || entry.kind !== "component") add("/catalogProfile", "Catalog authoring requires a pinned independently authorable component ID; parts, templates and utilities have separate roles.");
}

/** Catalog source preserves editable definitions while retaining required semantic ports and roles. */
export function inspectCatalogComponent(document: JsonObject, add: Sink): void {
  inspectCatalogPin(document, add);
  const id = catalogIdentity(document), recipe = id && getStudioCatalogRecipe(id); if (!recipe) return;
  if (!catalogKeys(document, [...ENVELOPE, "purpose", "archetypeRef", "traitBindings", "publicContract", "parts", "slots", "behavior", "accessibility", "motion", "requirements", "studioMotion", "studioBehavior", "studioComposition", "previewContent"])) add("", "Unknown catalog fields require a separate authoring contract.");
  if (!same(document.archetypeRef, { id: `axiom.archetype.${id}`, expectedKind: "archetype", version: STUDIO_ARCHETYPE_VERSION })) add("/archetypeRef", "Catalog archetype identity must match its pinned catalog entry.");
  if (!text(document.purpose) || !text(document.name)) add("/purpose", "Component name and purpose must be nonempty bounded text.");
  const parts = catalogObjects(document.parts), roles = new Map(parts.map(part => [part.studioRole, part]));
  if (!parts.length || parts.length > STUDIO_CATALOG_LIMITS.maxParts || roles.size !== parts.length) add("/parts", "Use 1–64 uniquely named semantic roles.");
  for (const required of recipe.parts.filter(part => part.required)) if (!roles.has(required.role) || roles.get(required.role)?.required !== true) add("/parts", `Required semantic part ${required.role} must remain present.`);
  const roots = parts.filter(part => part.parent === null);
  if (roots.length !== 1 || roots[0]?.studioRole !== "root") add("/parts", "Exactly one root semantic part must own the part tree.");
  for (const [index, part] of parts.entries()) {
    if (!catalogKeys(part, ["id", "name", "studioRole", "parent", "roleRefs", "required", "cardinality", "relationships", "studioText", "studioElement"]) || part.studioText !== undefined && !text(part.studioText, true) || !isValidId(part.id) || !text(part.name) || typeof part.studioRole !== "string" || !NAME_PATTERN.test(part.studioRole)
      || part.studioElement !== undefined && !["box", "frame", "text"].includes(String(part.studioElement))
      || part.studioElement !== undefined && recipe.parts.some(anchor => anchor.role === part.studioRole)
      || typeof part.required !== "boolean" || !same(part.cardinality, { min: 1, max: 1 }) || !empty(part.roleRefs) || !empty(part.relationships)) add(`/parts/${index}`, "Invalid bounded logical part declaration.");
    if (part.parent !== null && !parts.some(parent => parent.id === part.parent)) add(`/parts/${index}/parent`, "A part parent must be in the same component.");
  }
  const contract = document.publicContract;
  if (!isObject(contract)) { add("/publicContract", "Public values/events/slots must be explicit."); return; }
  if (!catalogKeys(contract, ["values", "events", "exposedSlots", "replaceableParts", "allowedOverrides", "variants"]) || !empty(contract.replaceableParts) || !empty(contract.allowedOverrides)) add("/publicContract", "Replacement and arbitrary override permissions require a separate realization profile.");
  const values = catalogObjects(contract.values), events = catalogObjects(contract.events), variants = catalogObjects(contract.variants);
  if (values.length > STUDIO_CATALOG_LIMITS.maxValues || events.length > STUDIO_CATALOG_LIMITS.maxEvents) add("/publicContract", "Public contract exceeds its bounded port limit.");
  if (new Set(values.map(item => item.name)).size !== values.length || new Set(events.map(item => item.name)).size !== events.length) add("/publicContract", "Value and event names must be unique in their respective namespaces.");
  for (const [index, value] of values.entries()) if (!catalogKeys(value, ["id", "name", "type", "ownership", "defaultValue", "requestEventRef", "visibility"]) || typeof value.name !== "string" || !NAME_PATTERN.test(value.name) || !["consumer", "local"].includes(String(value.ownership)) || value.visibility !== "public") add(`/publicContract/values/${index}`, "Catalog ports require valid names, public visibility and explicit consumer/local ownership.");
  for (const required of recipe.values) {
    const value = values.find(item => item.name === required.name);
    if (!value || !same(value.type, required.type) || value.ownership !== "consumer") add("/publicContract/values", `Required value ${required.name} must retain its type and consumer ownership.`);
    if (required.requestEvent && value?.requestEventRef !== events.find(event => event.name === required.requestEvent)?.id) add("/publicContract/values", `${required.name} must retain its change-request binding.`);
    if (!required.requestEvent && value?.requestEventRef !== undefined) add("/publicContract/values", `${required.name} has no change-request binding in this catalog contract.`);
  }
  for (const [index, event] of events.entries()) if (!catalogKeys(event, ["id", "name", "payloadType", "phase", "cancellable", "visibility"]) || typeof event.name !== "string" || !NAME_PATTERN.test(event.name) || event.phase !== "intent" || event.cancellable !== false || event.visibility !== "public") add(`/publicContract/events/${index}`, "Catalog events are typed intent requests without embedded runtime event objects.");
  for (const required of recipe.events) if (!events.some(event => event.name === required.name && same(event.payloadType, required.payloadType))) add("/publicContract/events", `Required event ${required.name} must retain its typed request payload.`);
  if (variants.length !== 1 || variants[0]?.name !== "variant" || !same(variants[0]?.options, ["filled", "outlined"]) || !["filled", "outlined"].includes(String(variants[0]?.default))) add("/publicContract/variants", "Catalog appearance currently supports an explicit filled/outlined variant axis.");
  const slots = catalogObjects(document.slots);
  if (slots.length > STUDIO_CATALOG_LIMITS.maxSlots || !same(contract.exposedSlots, slots.map(slot => slot.id))) add("/slots", "Bounded content slots must have an exact public exposure list.");
  for (const [index, slot] of slots.entries()) if (!catalogKeys(slot, ["id", "ownerPartRef", "contentKinds", "min", "max", "defaultContent", "allowedContractRefs"]) || !empty(slot.defaultContent) || !empty(slot.allowedContractRefs) || !same(slot.contentKinds, ["text", "component"])) add(`/slots/${index}`, "Catalog slots support declared text/component content without unverified replacement contracts.");
  for (const required of recipe.slots.filter(slot => slot.required)) if (!slots.some(slot => slot.ownerPartRef === roles.get(required.role)?.id && typeof slot.min === "number" && slot.min >= 1)) add("/slots", `Required ${required.role} content slot cannot be removed.`);
  for (const field of ["traitBindings", "requirements"]) if (!empty(document[field])) add(`/${field}`, "Unimplemented trait or obligation extensions cannot acquire an executable claim.");
  inspectStudioMotion(document, add);
  inspectStudioBehavior(document, add);
  const behavior = document.behavior;
  if (!isObject(behavior) || !catalogKeys(behavior, ["states", "transitions", "hostBindings", "profile"]) || !empty(behavior.states) || !empty(behavior.transitions) || !empty(behavior.hostBindings) || !same(behavior.profile, { id: `axiom.behavior.${id}`, version: STUDIO_CATALOG_PROFILE.version })) add("/behavior", "Catalog behavior must retain its explicit semantic profile; no arbitrary state machine executes.");
  const accessibility = document.accessibility;
  if (!isObject(accessibility) || !catalogKeys(accessibility, ["purpose", "nameSources", "descriptionSources", "stateExposure", "readingOrder", "focus", "announcements", "requirements", "label", "description"])
    || accessibility.purpose !== recipe.semantic.role || !text(accessibility.label) || !text(accessibility.description, true) || !same(accessibility.readingOrder, parts.map(part => part.id))
    || !same(accessibility.focus, { mode: "semantic-profile" }) || ["nameSources", "descriptionSources", "stateExposure", "announcements", "requirements"].some(key => !empty(accessibility[key]))) add("/accessibility", "Accessible label/description, role and complete reading order must match the semantic profile.");
  const motion = document.studioMotion;
  if (!isObject(motion) || !catalogKeys(motion, ["durationMs", "reducedDurationMs", "cleanupMs", "easing"]) || !number(motion.durationMs, 0, 10000) || motion.reducedDurationMs !== 0
    || !number(motion.cleanupMs, typeof motion.durationMs === "number" ? motion.durationMs + 1 : 1, 20000) || typeof motion.easing !== "string" || !STUDIO_CATALOG_EASINGS.some(item => item === motion.easing)) add("/studioMotion", "Motion requires bounded duration, easing, zero reduced-motion duration and a later cleanup deadline.");
  const preview = document.previewContent;
  if (!isObject(preview) || !catalogKeys(preview, ["label", "title", "body", "actionLabel", "closeLabel"]) || ["label", "title", "body", "actionLabel", "closeLabel"].some(key => !text(preview[key]))) add("/previewContent", "All preview content fields must be nonempty bounded text.");
  inspectCatalogDefaults(values, recipe.semantic.kind, add);
}

function inspectCatalogDefaults(values: JsonObject[], kind: string, add: Sink): void {
  const defaults = new Map(values.map(value => [value.name, value.defaultValue]));
  const minimum = defaults.get("min"), maximum = defaults.get("max"), step = defaults.get("step"), value = defaults.get("value");
  if (typeof minimum === "number" && typeof maximum === "number" && minimum >= maximum) add("/publicContract/values", "Minimum must be lower than maximum.");
  if (step !== undefined && !(typeof step === "number" && step > 0)) add("/publicContract/values", "Numeric step must be positive.");
  for (const item of Array.isArray(value) && kind === "range-slider" ? value : [value]) if (typeof item === "number" && (typeof minimum === "number" && item < minimum || typeof maximum === "number" && item > maximum)) add("/publicContract/values", "Numeric default lies outside the declared range.");
  if (kind === "range-slider" && (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== "number" || typeof value[1] !== "number" || value[0] > value[1])) add("/publicContract/values", "RangeSlider requires two ordered numeric endpoints.");
  for (const name of ["items", "columns", "rows"]) {
    const items = defaults.get(name); if (!Array.isArray(items)) continue;
    const keys = items.map(item => isObject(item) ? item.key : undefined);
    if (items.length > STUDIO_CATALOG_LIMITS.maxItems || keys.some(key => typeof key !== "string" || !key.trim()) || new Set(keys).size !== keys.length) add("/publicContract/values", `${name} must use a bounded list of unique nonempty stable keys.`);
  }
  const items = defaults.get("items");
  if (Array.isArray(items)) {
    const keys = new Set(items.filter(isObject).map(item => item.key));
    for (const name of ["selectedKey", "selectedKeys", "currentKey", "expandedKeys"]) {
      const selected = defaults.get(name), list = selected === null || selected === undefined ? [] : Array.isArray(selected) ? selected : [selected];
      if (new Set(list).size !== list.length || list.some(key => !keys.has(key))) add("/publicContract/values", "Selection/expansion keys must be unique and belong to the declared collection.");
    }
  }
  if (kind === "table") { const rows = defaults.get("rows"), columns = defaults.get("columns"); if (Array.isArray(rows) && Array.isArray(columns) && rows.some(row => !isObject(row) || !Array.isArray(row.cells) || row.cells.length !== columns.length)) add("/publicContract/values", "Every table row must have exactly one cell per declared column."); }
  for (const name of ["href", "src"]) { const url = defaults.get(name); if (typeof url !== "string" || name === "src" && !url) continue;
    if (/\s|[\u0000-\u001f\u007f]/u.test(url) || !(url.startsWith("#") && url.length > 1 || /^https?:\/\//iu.test(url))) add("/publicContract/values", "URLs require http/https or a named local fragment; executable and implicit schemes are rejected.");
    else if (!url.startsWith("#")) try { const parsed = new URL(url); if (!parsed.hostname || parsed.username || parsed.password) add("/publicContract/values", "URL credentials and empty hosts are not allowed."); } catch { add("/publicContract/values", "Invalid absolute URL."); }
  }
}

/** Bounded authored layout is independent of editor camera or native absolute positioning. */
export function inspectCatalogLayout(layout: JsonObject, path: string, add: Sink): void {
  if (!isObject(layout.size) || !catalogKeys(layout.size, ["width", "height"])) { add(`${path}/size`, "Size contains only optional width/height policies."); return; }
  for (const [axis, policy] of Object.entries(layout.size)) {
    if (!isObject(policy) || !catalogKeys(policy, ["mode", "value"]) || !["hug", "fill", "fixed"].includes(String(policy.mode))
      || (policy.mode === "fixed" ? !isObject(policy.value) || !catalogKeys(policy.value, ["value", "unit"]) || policy.value.unit !== "px" || !number(policy.value.value, 1) : policy.value !== undefined)) add(`${path}/size/${axis}`, "Size is hug/fill, or fixed with a positive bounded px dimension.");
  }
  if (layout.alignment !== undefined && !STUDIO_CATALOG_ALIGNMENT.some(item => item === layout.alignment)) add(`${path}/alignment`, "Alignment must be start, center, end or stretch.");
}
export function inspectEditorFrame(frame: JsonValue | undefined, add: Sink): void {
  if (frame === undefined) return;
  if (!isObject(frame) || !catalogKeys(frame, ["x", "y", "width", "height"]) || !number(frame.x, -100000, 100000) || !number(frame.y, -100000, 100000) || !number(frame.width, 1) || frame.height !== undefined && !number(frame.height, 1)) add("/editorFrame", "Editor frame needs bounded canvas x/y and positive width/optional height.");
}
