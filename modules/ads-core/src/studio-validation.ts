import type { AdsDocument, Diagnostic, DocumentEntry, JsonObject, JsonValue } from "./contracts.ts";
import type { StudioArchetype, StudioDocumentReport, StudioPartRole } from "./studio-contracts.ts";
import { canonicalJson, parseJson } from "./canonical-json.ts";
import { isObject, isValidId } from "./documents.ts";
import { inspectDocumentDomain } from "./domain-validation.ts";
import { inspectFoundationDocument } from "./foundation-validation.ts";
import { resolveFoundationTokens } from "./foundation-resolution.ts";
import { projectStudioDesign } from "./studio-presentation.ts";
import { MAX_DOCUMENT_BYTES, MAX_STRUCTURE_DIAGNOSTICS, STUDIO_PROFILE } from "./constants.ts";
import { STUDIO_ARCHETYPES, STUDIO_ARCHETYPE_VERSION, STUDIO_CATEGORIES, STUDIO_ERROR, STUDIO_MAX_COMPONENTS, STUDIO_MAX_DIMENSION, STUDIO_MAX_RULES, STUDIO_MAX_THEME_SETS, STUDIO_PART_ROLES, STUDIO_SCHEMA_VERSION, STUDIO_SOURCE_PROFILE, STUDIO_VISUAL_PROPERTIES } from "./studio-constants.ts";

const ENVELOPE_KEYS = ["id", "kind", "schemaVersion", "revision", "name", "metadata", "extensions", "studioProfile"];
const SAMPLE_FIELDS = ["label", "title", "body", "actionLabel", "closeLabel"];
const EMPTY_EVENT_TYPE = { kind: "record", fields: {}, required: [], additionalFields: "reject" };
const MAX_MOTION_MS = 10_000;
export function studioDiagnostic(sourceRef: string, path: string, message: string, code: string = STUDIO_ERROR.invalid): Diagnostic { return { code, phase: "document", severity: "error", sourceRef, path, message }; }
function same(left: unknown, right: unknown): boolean { try { return canonicalJson(left) === canonicalJson(right); } catch { return false; } }
function keys(value: JsonObject, allowed: readonly string[]): boolean { return Object.keys(value).every(key => allowed.includes(key)); }
function objects(value: unknown): JsonObject[] { return Array.isArray(value) ? value.filter(isObject) : []; }
function empty(value: unknown): boolean { return Array.isArray(value) && value.length === 0; }
function boundedNumber(value: unknown, maximum: number, minimum = 0): value is number { return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum; }

/** Resolve only the exact builtin archetype pin, never a similarly named external registry entry. */
export function studioArchetype(document: JsonObject): StudioArchetype | null {
  if (!isObject(document.archetypeRef)) return null;
  for (const [name, id] of Object.entries(STUDIO_ARCHETYPES)) if (same(document.archetypeRef, { id, expectedKind: "archetype", version: STUDIO_ARCHETYPE_VERSION })) return name as StudioArchetype;
  return null;
}

function componentErrors(document: JsonObject, add: (path: string, message: string) => void): void {
  if (!keys(document, [...ENVELOPE_KEYS, "purpose", "archetypeRef", "traitBindings", "publicContract", "parts", "slots", "behavior", "accessibility", "motion", "requirements", "studioMotion", "previewContent"])) add("", "Unknown executable component fields require a supported profile.");
  const archetype = studioArchetype(document);
  if (!archetype) { add("/archetypeRef", "Only the pinned Button, plain Card and controlled Toast archetypes are executable."); return; }
  const roles = STUDIO_PART_ROLES[archetype];
  const parts = objects(document.parts);
  const byRole = new Map(parts.map(part => [part.studioRole, part]));
  if (parts.length !== roles.length || byRole.size !== roles.length || roles.some(role => !byRole.has(role))) add("/parts", "Required builtin logical parts must occur exactly once.");
  const root = byRole.get("root");
  for (const [index, part] of parts.entries()) {
    const path = `/parts/${index}`;
    if (!keys(part, ["id", "name", "studioRole", "parent", "roleRefs", "required", "cardinality", "relationships"]) || !roles.some(role => role === part.studioRole)
      || typeof part.name !== "string" || !part.name.trim() || part.required !== true || !same(part.cardinality, { min: 1, max: 1 }) || !empty(part.roleRefs) || !empty(part.relationships)) add(path, "Part contract is outside the builtin execution profile.");
    if (part.parent !== (part.studioRole === "root" ? null : root?.id)) add(`${path}/parent`, "Builtin children must belong to the component root.");
  }
  for (const field of ["traitBindings", "motion", "requirements"]) if (!empty(document[field])) add(`/${field}`, "Additional obligations require their own executable profile; they cannot be omitted during generation.");
  const contract = document.publicContract;
  if (isObject(contract)) {
    if (!keys(contract, ["values", "events", "exposedSlots", "replaceableParts", "allowedOverrides", "variants"]) || !empty(contract.replaceableParts) || !empty(contract.allowedOverrides)) add("/publicContract", "Unsupported public contract extension.");
    const values = objects(contract.values), events = objects(contract.events), variants = objects(contract.variants);
    const name = archetype === "button" ? "disabled" : "open";
    if (values.length !== (archetype === "card" ? 0 : 1) || events.length !== (archetype === "card" ? 0 : 1)) add("/publicContract", "Builtin values/events cannot be removed or silently extended.");
    for (const value of values) if (value.name !== name || !same(value.type, { kind: "boolean" }) || value.ownership !== "consumer" || value.visibility !== "public"
      || typeof value.defaultValue !== "boolean" || !keys(value, ["id", "name", "type", "ownership", "defaultValue", "requestEventRef", "visibility"])) add("/publicContract/values", "Builtin state is a public consumer-owned boolean.");
    for (const event of events) if (event.name !== (archetype === "button" ? "activate" : "closeRequest") || event.phase !== "intent" || event.cancellable !== false || event.visibility !== "public"
      || !same(event.payloadType, EMPTY_EVENT_TYPE) || !keys(event, ["id", "name", "payloadType", "phase", "cancellable", "visibility"])) add("/publicContract/events", "Builtin events report one UI intent with the pinned payload.");
    if (archetype === "toast" && values[0]?.requestEventRef !== events[0]?.id) add("/publicContract/values", "Controlled Toast open must bind its closeRequest intent.");
    if (archetype === "button" && values[0]?.requestEventRef !== undefined) add("/publicContract/values", "Button disabled does not own an activation request.");
    if (variants.length !== 1 || variants[0]?.name !== "variant" || !same(variants[0]?.options, ["filled", "outlined"]) || typeof variants[0]?.default !== "string" || !["filled", "outlined"].includes(variants[0].default)
      || !keys(variants[0] ?? {}, ["id", "name", "options", "default"])) add("/publicContract/variants", "The builtin profile has one filled/outlined variant axis.");
    const slots = objects(document.slots);
    if (archetype === "card") {
      const slot = slots[0];
      if (slots.length !== 1 || !slot || slot.ownerPartRef !== byRole.get("body")?.id || slot.min !== 1 || slot.max !== "unbounded"
        || !same(slot.contentKinds, ["text", "component"]) || !empty(slot.defaultContent) || !empty(slot.allowedContractRefs)
        || !same(contract.exposedSlots, [slot.id]) || !keys(slot, ["id", "ownerPartRef", "contentKinds", "min", "max", "defaultContent", "allowedContractRefs"])) add("/slots", "Plain Card requires its public body content slot.");
    } else if (!empty(document.slots) || !empty(contract.exposedSlots)) add("/slots", "This builtin does not declare additional content slots.");
  }
  const behavior = document.behavior;
  if (!isObject(behavior) || !keys(behavior, ["states", "transitions", "hostBindings", "profile"]) || !empty(behavior.states) || !empty(behavior.transitions) || !empty(behavior.hostBindings)
    || !same(behavior.profile, { id: `axiom.behavior.${archetype}`, version: STUDIO_ARCHETYPE_VERSION })) add("/behavior", "Behavior must use the pinned native activation/content/controlled notification profile.");
  const accessibility = document.accessibility;
  if (!isObject(accessibility) || !keys(accessibility, ["purpose", "nameSources", "descriptionSources", "stateExposure", "readingOrder", "focus", "announcements", "requirements"])
    || accessibility.purpose !== archetype || !empty(accessibility.nameSources) || !empty(accessibility.descriptionSources) || !empty(accessibility.stateExposure) || !empty(accessibility.requirements)
    || !same(accessibility.readingOrder, roles.map(role => byRole.get(role)?.id ?? ""))
    || !same(accessibility.focus, { mode: archetype === "button" ? "native-control" : "content" })
    || !same(accessibility.announcements, archetype === "toast" ? [{ mode: "polite", owner: "host" }] : [])) add("/accessibility", "Pinned naming, reading order, focus and host-owned announcement obligations must remain intact.");
  const motion = document.studioMotion;
  if (!isObject(motion) || !keys(motion, ["durationMs", "reducedDurationMs", "cleanupMs"]) || !boundedNumber(motion.durationMs, MAX_MOTION_MS)
    || motion.reducedDurationMs !== 0 || !boundedNumber(motion.cleanupMs, MAX_MOTION_MS * 2, typeof motion.durationMs === "number" ? motion.durationMs + 1 : 1)) add("/studioMotion", "Motion requires a bounded completion deadline and immediate reduced alternative.");
  const content = document.previewContent;
  if (!isObject(content) || !keys(content, SAMPLE_FIELDS) || SAMPLE_FIELDS.some(field => typeof content[field] !== "string" || !(content[field] as string).trim())) add("/previewContent", "Preview labels and required Card body must be nonempty text.");
}

function isDimensionSource(value: unknown): boolean {
  return isObject(value) && (keys(value, ["tokenRef"]) && isValidId(value.tokenRef)
    || keys(value, ["value", "unit"]) && value.unit === "px" && boundedNumber(value.value, STUDIO_MAX_DIMENSION));
}
function designErrors(document: JsonObject, add: (path: string, message: string) => void): void {
  if (!keys(document, [...ENVELOPE_KEYS, "componentRef", "foundationRef", "category", "nodeMappings", "layout", "appearance", "targetOverrides"])) add("", "Unknown design fields cannot be silently dropped by a target.");
  for (const [field, kind] of [["foundationRef", "foundation"], ["componentRef", "component"]] as const) {
    const ref = document[field];
    if (!isObject(ref) || ref.expectedKind !== kind || !isValidId(ref.id) || !keys(ref, ["id", "expectedKind", "revision"]) || ref.revision !== undefined && !isValidId(ref.revision)) add(`/${field}`, `A design needs an explicit local ${kind} with an optional valid revision pin.`);
  }
  if (!STUDIO_CATEGORIES.some(category => category === document.category) || !empty(document.targetOverrides)) add("/category", "Use an explicit Web/Mobile design without unsupported target overrides.");
  for (const [index, mapping] of objects(document.nodeMappings).entries()) if (!keys(mapping, ["partRef", "role"]) || !isValidId(mapping.partRef)
    || typeof mapping.role !== "string" || !["root", "label", "header", "body", "actions", "close"].includes(mapping.role)) add(`/nodeMappings/${index}`, "Invalid builtin part mapping.");
  for (const [index, layout] of objects(document.layout).entries()) {
    if (!keys(layout, ["targetPartRef", "mode", "axis", "size", "gap", "padding", "minHeight", "childOrder"]) || layout.mode !== "stack" || typeof layout.axis !== "string" || !["horizontal", "vertical"].includes(layout.axis)
      || !isObject(layout.size) || Object.keys(layout.size).length || !isDimensionSource(layout.gap) || !isDimensionSource(layout.padding) || !isDimensionSource(layout.minHeight)) add(`/layout/${index}`, "Only explicit stack layout with bounded px/token dimensions is executable.");
  }
  const rules = objects(document.appearance);
  if (rules.length > STUDIO_MAX_RULES) add("/appearance", "Too many appearance rules for the bounded profile.");
  for (const [index, rule] of rules.entries()) {
    const variants = rule.variants, states = rule.states;
    if (!keys(rule, ["id", "targetPartRef", "variants", "states", "declarations", "explicitPriority", "refines"]) || !isValidId(rule.targetPartRef) || !empty(rule.refines)
      || !boundedNumber(rule.explicitPriority, 1000, -1000) || !Number.isInteger(rule.explicitPriority)) add(`/appearance/${index}`, "Unsupported appearance precedence or condition.");
    if (!isObject(variants) || !keys(variants, ["variant"]) || variants.variant !== undefined && (typeof variants.variant !== "string" || !["filled", "outlined"].includes(variants.variant))
      || !isObject(states) || !keys(states, ["disabled", "pressed"]) || Object.values(states).some(value => value !== true) || Object.keys(states).length > 1
      || Object.keys(states).length && Object.keys(variants).length) add(`/appearance/${index}`, "This profile supports separate base, variant and disabled/pressed rules.");
    if (!isObject(rule.declarations) || !keys(rule.declarations, STUDIO_VISUAL_PROPERTIES)) add(`/appearance/${index}/declarations`, "Unsupported visual property; it cannot be dropped from target output.");
  }
}

/** Inspect a detached source under the opt-in profile; opaque extension payloads never execute. */
export function inspectStudioDocument(value: unknown, sourceRef = "memory:studio"): StudioDocumentReport {
  let document: JsonObject;
  try { const snapshot: unknown = parseJson(canonicalJson(value, MAX_DOCUMENT_BYTES)); if (!isObject(snapshot)) throw new Error("object required"); document = snapshot; }
  catch { return { profile: STUDIO_PROFILE, valid: false, diagnostics: [studioDiagnostic(sourceRef, "", "Studio source must be bounded plain JSON.")], checkedRecords: [], unverifiedTypes: [] }; }
  try { return inspectStudioSnapshot(document, sourceRef); }
  catch { return { profile: STUDIO_PROFILE, valid: false, diagnostics: [studioDiagnostic(sourceRef, "", "Studio source could not be inspected under the executable profile.")], checkedRecords: [], unverifiedTypes: [] }; }
}

/** Every semantic read operates on detached JSON and performs exact type comparisons. */
function inspectStudioSnapshot(document: JsonObject, sourceRef: string): StudioDocumentReport {
  const base = inspectDocumentDomain(document, sourceRef);
  const diagnostics = [...base.diagnostics];
  let valid = base.valid;
  const add = (path: string, message: string): void => { valid = false; if (diagnostics.length < MAX_STRUCTURE_DIAGNOSTICS * 2) diagnostics.push(studioDiagnostic(sourceRef, path, message)); };
  if (document.schemaVersion !== STUDIO_SCHEMA_VERSION || !same(document.studioProfile ?? null, STUDIO_SOURCE_PROFILE)) add("/studioProfile", "Unsupported executable Studio source/profile version.");
  if (document.kind === "foundation") { const report = inspectFoundationDocument(document, sourceRef); valid &&= report.valid; diagnostics.push(...report.diagnostics); if (objects(document.themeSets).length > STUDIO_MAX_THEME_SETS) add("/themeSets", "Studio supports at most 32 named ThemeSets per Foundation."); }
  else if (document.kind === "component") componentErrors(document, add);
  else if (document.kind === "design") designErrors(document, add);
  else add("/kind", "The Studio profile executes Foundation, Component and Design documents only.");
  diagnostics.sort((a, b) => Number(b.severity === "error") - Number(a.severity === "error"));
  return { profile: STUDIO_PROFILE, valid, diagnostics: diagnostics.slice(0, MAX_STRUCTURE_DIAGNOSTICS), checkedRecords: base.checkedRecords, unverifiedTypes: base.unverifiedTypes };
}

/** Check relationships on the entire candidate graph before it can be stored or restored. */
export function inspectStudioGraph(documents: Record<string, DocumentEntry>, projectId: string): Diagnostic[] {
  const entries = Object.values(documents).filter(entry => entry.validationProfile === STUDIO_PROFILE);
  const diagnostics: Diagnostic[] = [];
  const add = (id: string, path: string, message: string): void => { if (diagnostics.length < MAX_STRUCTURE_DIAGNOSTICS) diagnostics.push(studioDiagnostic(id, path, message)); };
  const components = entries.filter(entry => entry.document.kind === "component").map(entry => entry.document);
  const foundations = entries.filter(entry => entry.document.kind === "foundation");
  if (entries.length && foundations.length !== 1) add(projectId, "", "The Studio graph requires one unambiguous Foundation.");
  if (components.length > STUDIO_MAX_COMPONENTS) add(projectId, "", "Too many Studio components.");
  if (components.length > STUDIO_MAX_COMPONENTS || foundations.some(entry => objects(entry.document.themeSets).length > STUDIO_MAX_THEME_SETS)) {
    add(projectId, "", "Studio graph exceeds its component or theme evaluation budget."); return diagnostics;
  }
  const resolutions = new Map<string, ReturnType<typeof resolveFoundationTokens>[]>();
  for (const entry of foundations) if (inspectStudioDocument(entry.document).valid) {
    resolutions.set(entry.document.id, [{}, ...objects(entry.document.themeSets).map(set => ({ themeSetId: String(set.id) }))].map(selection => resolveFoundationTokens(entry.document, selection)));
  }
  for (const [id, entry] of Object.entries(documents)) if (entry.validationProfile === STUDIO_PROFILE && entry.document.id !== id) add(id, "/id", "Project record key must match the stable document ID.");
  for (const { document } of entries.filter(entry => entry.document.kind === "design")) {
    const componentRef = document.componentRef, foundationRef = document.foundationRef;
    const owner = isObject(componentRef) && typeof componentRef.id === "string" ? documents[componentRef.id] : undefined;
    const foundation = isObject(foundationRef) && typeof foundationRef.id === "string" ? documents[foundationRef.id] : undefined;
    if (!owner || owner.validationProfile !== STUDIO_PROFILE || owner.document.kind !== "component") { add(document.id, "/componentRef", "Design owner must be a Studio component."); continue; }
    if (!foundation || foundation.validationProfile !== STUDIO_PROFILE || foundation.document.kind !== "foundation") add(document.id, "/foundationRef", "Design Foundation must have an executable Studio policy.");
    for (const [field, ref, entry, kind] of [["componentRef", componentRef, owner, "component"], ["foundationRef", foundationRef, foundation, "foundation"]] as const) {
      if (!isObject(ref) || !entry || ref.expectedKind !== kind || ref.id !== entry.document.id || !keys(ref, ["id", "expectedKind", "revision"]) || ref.revision !== undefined && ref.revision !== entry.document.revision) add(document.id, `/${field}`, "Local reference kind, identity and optional revision pin must match the adopted document.");
    }
    const parts = objects(owner.document.parts), mappings = objects(document.nodeMappings), layouts = objects(document.layout);
    const ids = parts.map(part => part.id);
    if (mappings.length !== parts.length || new Set(mappings.map(item => item.partRef)).size !== parts.length || mappings.some(item => !ids.includes(item.partRef)
      || parts.find(part => part.id === item.partRef)?.studioRole !== item.role)) add(document.id, "/nodeMappings", "Every logical part needs one matching design mapping.");
    if (layouts.length !== parts.length || new Set(layouts.map(item => item.targetPartRef)).size !== parts.length || layouts.some(item => !ids.includes(item.targetPartRef))) add(document.id, "/layout", "Every logical part needs one layout declaration.");
    for (const [index, layout] of layouts.entries()) {
      const part = parts.find(item => item.id === layout.targetPartRef);
      const expected = parts.filter(item => item.parent === part?.id).map(item => item.id);
      if (!same(layout.childOrder, expected)) add(document.id, `/layout/${index}/childOrder`, "Child order must preserve the pinned component reading order.");
    }
    for (const [index, rule] of objects(document.appearance).entries()) if (!ids.includes(rule.targetPartRef)) add(document.id, `/appearance/${index}/targetPartRef`, "Appearance must target a part owned by this component.");
    if (foundation && inspectStudioDocument(document).valid && inspectStudioDocument(owner.document).valid && inspectFoundationDocument(foundation.document).valid) {
      const archetype = studioArchetype(owner.document)!;
      for (const resolved of resolutions.get(foundation.document.id) ?? []) {
        if (diagnostics.length >= MAX_STRUCTURE_DIAGNOSTICS) break;
        diagnostics.push(...resolved.diagnostics.filter(item => item.severity === "error"));
        if (resolved.valid) projectStudioDesign(document, { id: owner.document.id, archetype, parts: studioParts(owner.document) }, resolved, diagnostics, Object.create(null));
      }
      if (archetype !== "button" && objects(document.appearance).some(rule => isObject(rule.states) && Object.keys(rule.states).length)) add(document.id, "/appearance", "Only Button has pressed/disabled states in the builtin profile.");
    }
  }
  for (const component of components) for (const category of STUDIO_CATEGORIES) {
    const matches = entries.filter(entry => entry.document.kind === "design" && entry.document.category === category && isObject(entry.document.componentRef) && entry.document.componentRef.id === component.id);
    if (matches.length !== 1) add(component.id, "", `A Studio component requires exactly one ${category} design.`);
  }
  return diagnostics.slice(0, MAX_STRUCTURE_DIAGNOSTICS);
}

/** Read validated component roles without tying stable IDs to presentation names. */
export function studioParts(document: AdsDocument) { return objects(document.parts).map(part => ({ id: String(part.id), name: String(part.name), parent: part.parent as string | null, role: part.studioRole as StudioPartRole })); }
