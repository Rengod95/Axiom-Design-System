import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import type { StudioArchetype, StudioCategory } from "./studio-contracts.ts";
import { isObject, isValidId } from "./documents.ts";
import { KernelError } from "./kernel-error.ts";
import { CODE } from "./constants.ts";
import { applyFoundationStarter } from "./foundation-starters.ts";
import type { FoundationStarterOptions } from "./foundation-starters.ts";
import type { FoundationDocument } from "./foundation-contracts.ts";
import { STUDIO_ARCHETYPES, STUDIO_ARCHETYPE_VERSION, STUDIO_CATEGORIES, STUDIO_MOTION, STUDIO_PART_ROLES, STUDIO_RESOLVER, STUDIO_SCHEMA_VERSION, STUDIO_SOURCE_PROFILE } from "./studio-constants.ts";

const STARTER_REVISION = "source.initial";
const FOUNDATION_ID = "foundation.system";
function envelope(id: string, kind: string, name: string): AdsDocument {
  return { id, kind, name, schemaVersion: STUDIO_SCHEMA_VERSION, revision: STARTER_REVISION, studioProfile: { ...STUDIO_SOURCE_PROFILE }, metadata: { provenance: { template: "axiom.studio.starter", version: STUDIO_SOURCE_PROFILE.version } }, extensions: {} };
}
const color = (r: number, g: number, b: number): JsonObject => ({ colorSpace: "srgb", components: [r, g, b], alpha: 1 });
const dimension = (value: number): JsonObject => ({ value, unit: "px" });
const binding = (id: string): JsonObject => ({ tokenRef: id });
function foundation(): AdsDocument {
  const token = (id: string, name: string, type: string, literal: JsonValue): JsonObject => ({ id: `token.${id}`, name, typeRef: { id: type }, value: { literal } });
  return { ...envelope(FOUNDATION_ID, "foundation", "Axiom Foundation"), tokens: [
    token("accent", "brand.accent", "color", color(.2, .29, .83)), token("surface", "surface.default", "color", color(1, 1, 1)),
    token("content", "content.primary", "color", color(.12, .16, .22)), token("onAccent", "content.onAccent", "color", color(1, 1, 1)),
    token("border", "border.subtle", "color", color(.78, .81, .86)), token("gap", "spacing.component", "dimension", dimension(12)),
    token("radius", "radius.component", "dimension", dimension(10)), token("fontSize", "text.body.size", "dimension", dimension(16)),
    { id: "token.action", name: "action.background", typeRef: { id: "color" }, value: { ref: { id: "token.accent", expectedKind: "token" } } },
  ], domains: [], tiers: [], policies: [], originalSources: [], resolutionOrder: ["axis.scheme"],
  themeAxes: [{ id: "axis.scheme", contexts: ["light", "dark"], default: "light", scope: { id: FOUNDATION_ID, expectedKind: "foundation" }, overrides: { dark: {
    "token.surface": { literal: color(.08, .1, .15) }, "token.content": { literal: color(.93, .95, .99) }, "token.border": { literal: color(.3, .34, .43) },
    "token.accent": { literal: color(.25, .37, .84) },
  } } }], themeSets: ["light", "dark"].map(context => ({ id: `theme.${context}`, contexts: { "axis.scheme": context }, resolutionProfile: { ...STUDIO_RESOLVER } })) };
}
function component(archetype: Exclude<StudioArchetype, "catalog">): AdsDocument {
  const id = `component.${archetype}`;
  const part = (role: string): string => `${id}.${role}`;
  const roles = STUDIO_PART_ROLES[archetype];
  const publicValues: JsonValue[] = [];
  const events: JsonValue[] = [];
  if (archetype === "button") {
    publicValues.push({ id: `${id}.disabled`, name: "disabled", type: { kind: "boolean" }, ownership: "consumer", defaultValue: false, visibility: "public" });
    events.push({ id: `${id}.activate`, name: "activate", payloadType: { kind: "record", fields: {}, required: [], additionalFields: "reject" }, phase: "intent", cancellable: false, visibility: "public" });
  }
  if (archetype === "toast") {
    publicValues.push({ id: `${id}.open`, name: "open", type: { kind: "boolean" }, ownership: "consumer", defaultValue: true, requestEventRef: `${id}.closeRequest`, visibility: "public" });
    events.push({ id: `${id}.closeRequest`, name: "closeRequest", payloadType: { kind: "record", fields: {}, required: [], additionalFields: "reject" }, phase: "intent", cancellable: false, visibility: "public" });
  }
  return { ...envelope(id, "component", archetype[0]!.toUpperCase() + archetype.slice(1)),
    purpose: archetype === "button" ? "Request one UI activation" : archetype === "card" ? "Group related content" : "Present a controlled notification",
    archetypeRef: { id: STUDIO_ARCHETYPES[archetype], expectedKind: "archetype", version: STUDIO_ARCHETYPE_VERSION }, traitBindings: [],
    publicContract: { values: publicValues, events, exposedSlots: archetype === "card" ? [`${id}.slot.body`] : [], replaceableParts: [], allowedOverrides: [],
      variants: [{ id: `${id}.variant`, name: "variant", options: ["filled", "outlined"], default: "filled" }] },
    parts: roles.map(role => ({ id: part(role), name: role, studioRole: role, parent: role === "root" ? null : part("root"), roleRefs: [], required: true, cardinality: { min: 1, max: 1 }, relationships: [] })),
    slots: archetype === "card" ? [{ id: `${id}.slot.body`, ownerPartRef: part("body"), contentKinds: ["text", "component"], min: 1, max: "unbounded", defaultContent: [], allowedContractRefs: [] }] : [],
    behavior: { states: [], transitions: [], hostBindings: [], profile: { id: `axiom.behavior.${archetype}`, version: STUDIO_ARCHETYPE_VERSION } },
    accessibility: { purpose: archetype, nameSources: [], descriptionSources: [], stateExposure: [], readingOrder: roles.map(part),
      focus: { mode: archetype === "button" ? "native-control" : "content" }, announcements: archetype === "toast" ? [{ mode: "polite", owner: "host" }] : [], requirements: [] },
    motion: [], requirements: [], studioMotion: { ...STUDIO_MOTION },
    previewContent: { label: "계속하기", title: "작은 변화, 같은 시스템", body: "토큰 하나를 바꾸면 모든 컴포넌트에 같은 의미가 이어집니다.", actionLabel: "자세히 보기", closeLabel: "알림 닫기" } };
}
function design(document: AdsDocument, category: StudioCategory): AdsDocument {
  const archetype = document.id.slice("component.".length) as Exclude<StudioArchetype, "catalog">;
  const roles = STUDIO_PART_ROLES[archetype];
  const part = (role: string): string => `${document.id}.${role}`;
  const id = `design.${archetype}.${category.toLowerCase()}`;
  const root = part("root");
  return { ...envelope(id, "design", `${document.name} ${category}`), componentRef: { id: document.id, expectedKind: "component" }, category,
    foundationRef: { id: FOUNDATION_ID, expectedKind: "foundation" },
    nodeMappings: roles.map(role => ({ partRef: part(role), role })),
    layout: roles.map(role => ({ targetPartRef: part(role), mode: "stack", axis: role === "root" && archetype !== "card" ? "horizontal" : "vertical",
      size: {}, gap: role === "root" ? binding("token.gap") : dimension(0), padding: dimension(role === "root" ? category === "Web" ? 16 : 20 : 0),
      minHeight: dimension(role === "root" && archetype === "button" ? category === "Web" ? 44 : 48 : 0), childOrder: role === "root" ? roles.filter(item => item !== "root").map(part) : [] })),
    appearance: [{ id: `${id}.base`, targetPartRef: root, variants: {}, states: {}, declarations: {
      background: binding(archetype === "button" ? "token.action" : "token.surface"), color: binding(archetype === "button" ? "token.onAccent" : "token.content"),
      borderColor: binding("token.border"), borderWidth: dimension(archetype === "button" ? 0 : 1), borderRadius: binding("token.radius"), fontSize: binding("token.fontSize"),
    }, explicitPriority: 0, refines: [] },
    { id: `${id}.outlined`, targetPartRef: root, variants: { variant: "outlined" }, states: {}, declarations: { background: binding("token.surface"), color: binding("token.content"), borderWidth: dimension(1), borderColor: binding("token.accent") }, explicitPriority: 0, refines: [] }], targetOverrides: [] };
}

/** Create independent editable sources; adoption still requires ordinary reviewed import. */
export function createStudioStarter(projectId: string, options?: FoundationStarterOptions): AdsDocument[] {
  if (!isValidId(projectId) || projectId === FOUNDATION_ID || projectId.startsWith("component.") || projectId.startsWith("design.")) throw new KernelError(CODE.PAYLOAD_INVALID, "Starter requires a distinct valid project identity.");
  const components = (Object.keys(STUDIO_ARCHETYPES) as Exclude<StudioArchetype, "catalog">[]).map(component);
  const source = foundation(); let sequence = 0;
  if (options) {
    const foundation = source as FoundationDocument;
    applyFoundationStarter(foundation, options, () => `foundation.starter.${++sequence}`);
    const scheme = foundation.themeAxes.find(axis => axis.id === "axis.scheme"); if (scheme) scheme.name = "Color scheme";
    for (const theme of foundation.themeSets) if (["theme.light", "theme.dark"].includes(theme.id)) theme.name = theme.id === "theme.light" ? "Light" : "Dark";
    // Only a newly created project is connected to the chosen kit. Existing-project adoption is additive.
    const links: Record<string, string> = { accent: "action.primary.background", action: "action.primary.background", surface: "surface.raised", content: "text.primary", onAccent: "action.primary.foreground", border: "border.default", gap: "spacing.control", radius: "radius.control", fontSize: "font.size.16" };
    for (const [id, targetName] of Object.entries(links)) {
      const token = foundation.tokens.find(token => token.id === `token.${id}`), target = foundation.tokens.find(token => token.name === targetName);
      if (!token || !target) continue;
      token.value = { ref: { id: target.id, expectedKind: "token" } };
      if (target.domain) token.domain = target.domain;
      const semantic = foundation.tiers.filter(isObject).find(tier => typeof tier.name === "string" && tier.name.toLowerCase() === "semantic"); if (semantic && typeof semantic.id === "string") token.tier = semantic.id;
      for (const axis of foundation.themeAxes) for (const overrides of Object.values(axis.overrides ?? {})) delete overrides[token.id];
    }
  }
  return [source, ...components, ...components.flatMap(item => STUDIO_CATEGORIES.map(category => design(item, category)))];
}
