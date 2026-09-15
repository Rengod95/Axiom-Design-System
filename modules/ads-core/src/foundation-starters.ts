import type { JsonObject, JsonValue } from "./contracts.ts";
import type { FoundationBindingCategory, FoundationDocument, FoundationTokenType, FoundationTokenValue } from "./foundation-contracts.ts";
import { isObject } from "./documents.ts";
import { adaptFoundationStarterTokens, FOUNDATION_STARTER_TEMPLATES } from "./foundation-starter-presets.ts";
import type { FoundationStarterTemplateId } from "./foundation-starter-presets.ts";

export const FOUNDATION_STARTER_PROFILE = Object.freeze({ id: "axiom.foundation.essentials", version: "1.0.0" });

export const FOUNDATION_STARTER_DOMAINS = [
  { id: "color", name: "Color", types: ["color"] },
  { id: "spacing", name: "Spacing", types: ["dimension"] },
  { id: "sizing", name: "Sizing", types: ["dimension"] },
  { id: "radius", name: "Radius", types: ["dimension"] },
  { id: "border", name: "Border", types: ["border", "strokeStyle", "dimension"] },
  { id: "shadow", name: "Shadow", types: ["shadow"] },
  { id: "typography", name: "Typography", types: ["fontFamily", "fontWeight", "dimension", "number", "typography"] },
  { id: "motion", name: "Motion", types: ["duration", "cubicBezier", "transition"] },
  { id: "opacity", name: "Opacity", types: ["number"] },
  { id: "gradient", name: "Gradient", types: ["gradient"] },
  { id: "layer", name: "Layer", types: ["number"] },
] as const;
export const FOUNDATION_BINDING_CATEGORIES: readonly FoundationBindingCategory[] = [...FOUNDATION_STARTER_DOMAINS.map(domain => domain.id), "unrestricted"];
export interface FoundationStarterOptions { domains: string[]; template?: FoundationStarterTemplateId; accent?: string; fontFamily?: string; density?: "comfortable" | "compact" }
export interface FoundationStarterToken { name: string; domain: string; type: FoundationTokenType; tier: "primitive" | "semantic"; literal?: JsonValue; alias?: string; darkAlias?: string }
const dimension = (value: number): JsonObject => ({ value, unit: "px" });
const color = (hex: string, alpha = 1): JsonObject => ({ colorSpace: "srgb", components: [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), alpha });

/** Curated defaults, not a claim that DTCG mandates domain names or scales. */
export function foundationStarterTokens(options: FoundationStarterOptions): FoundationStarterToken[] {
  if (!Array.isArray(options.domains) || !options.domains.length || new Set(options.domains).size !== options.domains.length || options.domains.some(id => !FOUNDATION_STARTER_DOMAINS.some(domain => domain.id === id))) throw new Error("Choose known, unique starter domains.");
  if (options.template !== undefined && !FOUNDATION_STARTER_TEMPLATES.some(template => template.id === options.template)) throw new Error("Choose a known starter template.");
  const preset = options.template && options.template !== "essentials" ? FOUNDATION_STARTER_TEMPLATES.find(template => template.id === options.template) : null;
  const accent = options.accent ?? preset?.accent ?? "#5b50d6", family = options.fontFamily ?? (preset ? "Geist" : "SUIT");
  if (!/^#[\da-f]{6}$/i.test(accent) || !family.trim() || family.length > 100 || options.density !== undefined && !["comfortable", "compact"].includes(options.density)) throw new Error("Invalid starter settings.");
  const tokens: FoundationStarterToken[] = [];
  const literal = (domain: string, name: string, type: FoundationTokenType, value: JsonValue) => tokens.push({ domain, name, type, tier: "primitive", literal: value });
  const alias = (domain: string, name: string, type: FoundationTokenType, target: string, darkAlias?: string) => tokens.push({ domain, name, type, tier: "semantic", alias: target, ...(darkAlias ? { darkAlias } : {}) });
  const neutral = ["#ffffff", "#f8f9fb", "#eef0f4", "#dfe3ea", "#c5cbd5", "#9ba4b3", "#727d8e", "#525e70", "#384354", "#252e3c", "#171e29", "#0c111b"];
  [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].forEach((step, i) => literal("color", `color.neutral.${step}`, "color", color(neutral[i]!)));
  const accentValue = color(accent), channels = accentValue.components as number[];
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].forEach((step, i) => {
    const amount = i < 5 ? (5 - i) * .16 : (i - 5) * .15;
    literal("color", `color.brand.${step}`, "color", { ...accentValue, components: channels.map(channel => i < 5 ? channel + (1 - channel) * amount : channel * (1 - amount)) });
  });
  for (const [name, hex] of Object.entries({ success: "#147d4f", warning: "#a15b06", danger: "#c52c40", info: "#245dc5" })) {
    literal("color", `color.${name}.600`, "color", color(hex)); alias("color", `feedback.${name}`, "color", `color.${name}.600`);
  }
  for (const [name, light, dark] of [["surface.canvas", "50", "950"], ["surface.raised", "0", "900"], ["surface.subtle", "100", "800"], ["text.primary", "900", "50"], ["text.secondary", "600", "300"], ["text.inverse", "0", "950"], ["border.default", "300", "600"], ["border.strong", "500", "400"]]) alias("color", name!, "color", `color.neutral.${light}`, `color.neutral.${dark}`);
  // These generated literals are opaque sRGB. Choose each theme's foreground against its
  // actual action shade, not the accent seed or an assumed light/dark text polarity.
  const luminance = (name: string): number => {
    const channels = (tokens.find(token => token.name === name)!.literal as JsonObject).components as number[];
    return channels.reduce((sum, channel, index) => sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index]!, 0);
  };
  const actionForeground = (background: string): string => {
    const backgroundLuminance = luminance(background);
    const contrast = (name: string): number => {
      const foregroundLuminance = luminance(name);
      return (Math.max(backgroundLuminance, foregroundLuminance) + .05) / (Math.min(backgroundLuminance, foregroundLuminance) + .05);
    };
    // The larger ratio meets 4.5 whenever either available neutral does. Some custom
    // accents fall between both candidates; this bounded palette does not claim AA for those.
    return contrast("color.neutral.0") >= contrast("color.neutral.900") ? "color.neutral.0" : "color.neutral.900";
  };
  alias("color", "action.primary.background", "color", "color.brand.600", "color.brand.400");
  alias("color", "action.primary.foreground", "color", actionForeground("color.brand.600"), actionForeground("color.brand.400"));
  alias("color", "focus.ring", "color", "color.brand.500", "color.brand.300");
  for (const step of [0, 1, 2, 3, 4, 6, 8, 12, 16, 24]) literal("spacing", `space.${step}`, "dimension", dimension(step * 4));
  for (const [name, step] of [["inline", 2], ["stack", 3], ["control", options.density === "compact" ? 2 : 3], ["section", 6], ["page", 8]] as const) alias("spacing", `spacing.${name}`, "dimension", `space.${step}`);
  for (const step of [16, 20, 24, 32, 40, 44, 48, 64, 96]) literal("sizing", `size.${step}`, "dimension", dimension(step));
  for (const [name, step] of [["icon.small", 16], ["icon.default", 20], ["control.small", 32], ["control.default", options.density === "compact" ? 32 : 40], ["touch.minimum", 44]] as const) alias("sizing", `sizing.${name}`, "dimension", `size.${step}`);
  for (const [name, value] of Object.entries({ none: 0, xs: 2, sm: 4, md: 8, lg: 12, xl: 20, full: 4096 })) literal("radius", `radius.scale.${name}`, "dimension", dimension(value));
  for (const [name, scale] of [["control", "md"], ["surface", "lg"], ["overlay", "xl"], ["pill", "full"]]) alias("radius", `radius.${name}`, "dimension", `radius.scale.${scale}`);
  literal("border", "stroke.solid", "strokeStyle", "solid");
  for (const width of [0, 1, 2]) literal("border", `stroke.width.${width}`, "dimension", dimension(width));
  literal("border", "border.scale.default", "border", { color: color("#c5cbd5"), width: dimension(1), style: "solid" });
  alias("border", "border.control", "border", "border.scale.default");
  for (const [name, offsetY, blur, alpha] of [["sm", 2, 6, .08], ["md", 4, 16, .12], ["lg", 12, 32, .18]] as const) {
    literal("shadow", `shadow.scale.${name}`, "shadow", { color: color("#0c111b", alpha), offsetX: dimension(0), offsetY: dimension(offsetY), blur: dimension(blur), spread: dimension(0) });
    alias("shadow", `elevation.${name}`, "shadow", `shadow.scale.${name}`);
  }
  literal("typography", "font.family.sans", "fontFamily", [family, "sans-serif"]);
  literal("typography", "font.family.mono", "fontFamily", ["ui-monospace", "monospace"]);
  for (const weight of [400, 500, 600, 700]) literal("typography", `font.weight.${weight}`, "fontWeight", weight);
  for (const size of [12, 14, 16, 20, 24, 32, 40]) literal("typography", `font.size.${size}`, "dimension", dimension(size));
  for (const [name, height] of [["tight", 1.25], ["normal", 1.5], ["relaxed", 1.75]] as const) literal("typography", `font.lineHeight.${name}`, "number", height);
  for (const [name, size, weight] of [["caption", 12, 400], ["label", 14, 500], ["body", 16, 400], ["heading", 24, 600], ["display", 40, 600]] as const) {
    literal("typography", `type.scale.${name}`, "typography", { fontFamily: [family, "sans-serif"], fontSize: dimension(size), fontWeight: weight, letterSpacing: dimension(0), lineHeight: name === "heading" || name === "display" ? 1.25 : 1.5 });
    alias("typography", `typography.${name}`, "typography", `type.scale.${name}`);
  }
  for (const duration of [0, 100, 150, 200, 300, 500]) literal("motion", `duration.${duration}`, "duration", { value: duration, unit: "ms" });
  literal("motion", "easing.standard", "cubicBezier", [.2, 0, 0, 1]); literal("motion", "easing.linear", "cubicBezier", [0, 0, 1, 1]);
  for (const [name, duration] of [["instant", 0], ["fast", 150], ["normal", 200], ["slow", 300]] as const) alias("motion", `motion.duration.${name}`, "duration", `duration.${duration}`);
  literal("motion", "transition.scale.standard", "transition", { duration: { value: 200, unit: "ms" }, delay: { value: 0, unit: "ms" }, timingFunction: [.2, 0, 0, 1] });
  alias("motion", "motion.transition.control", "transition", "transition.scale.standard");
  for (const [name, value] of Object.entries({ invisible: 0, disabled: .4, muted: .64, opaque: 1 })) { literal("opacity", `alpha.${name}`, "number", value); alias("opacity", `opacity.${name}`, "number", `alpha.${name}`); }
  literal("gradient", "gradient.scale.brand", "gradient", [{ color: color(accent), position: 0 }, { color: color("#171e29"), position: 1 }]);
  alias("gradient", "fill.brand", "gradient", "gradient.scale.brand");
  for (const [name, value] of Object.entries({ base: 0, raised: 1, dropdown: 100, overlay: 200, toast: 300 })) { literal("layer", `z.${name}`, "number", value); alias("layer", `layer.${name}`, "number", `z.${name}`); }
  return options.template && options.template !== "essentials" ? adaptFoundationStarterTokens(tokens, options, options.template) : tokens.filter(token => options.domains.includes(token.domain));
}

/** Add missing tokens only. Existing values, IDs and overrides are never overwritten. */
export function applyFoundationStarter(foundation: FoundationDocument, options: FoundationStarterOptions, createId: () => string): void {
  const blueprint = foundationStarterTokens(options);
  const records = (value: JsonValue[]) => value as JsonObject[];
  const classification = (category: "domains" | "tiers", name: string, extra: JsonObject = {}) => {
    const found = records(foundation[category]).find(record => String(record.name).toLowerCase() === name.toLowerCase());
    if (found) return String(found.id);
    const id = createId(); foundation[category].push({ id, name, ...extra }); return id;
  };
  const tiers = { primitive: classification("tiers", "Primitive"), semantic: classification("tiers", "Semantic") };
  const domains = new Map<string, string>(FOUNDATION_STARTER_DOMAINS.filter(domain => options.domains.includes(domain.id)).map(domain => [domain.id, classification("domains", domain.name, { allowedTypes: [...domain.types], bindingCategory: domain.id })]));
  const byName = new Map(foundation.tokens.map(token => [token.name, token]));
  const newNames = new Set<string>();
  for (const spec of blueprint) {
    const existing = byName.get(spec.name);
    if (existing) { if (existing.typeRef.id !== spec.type) throw new Error(`Starter name ${spec.name} exists with another type. Rename it before applying this domain.`); continue; }
    const value: FoundationTokenValue = spec.alias ? { ref: { id: byName.get(spec.alias)!.id, expectedKind: "token" } } : { literal: spec.literal! };
    const template = options.template && options.template !== "essentials" ? FOUNDATION_STARTER_TEMPLATES.find(template => template.id === options.template)! : null;
    const token = { id: createId(), name: spec.name, typeRef: { id: spec.type }, domain: domains.get(spec.domain)!, tier: tiers[spec.tier], value, metadata: { starter: FOUNDATION_STARTER_PROFILE.id, version: FOUNDATION_STARTER_PROFILE.version, ...(template ? { template: template.id, templateVersion: "1.0.0", adaptation: "axiom-authored", reference: template.source } : {}) } };
    foundation.tokens.push(token); byName.set(spec.name, token); newNames.add(spec.name);
  }
  if (options.domains.includes("color")) {
    let axis = foundation.themeAxes.find(axis => axis.contexts.includes("light") && axis.contexts.includes("dark"));
    if (!axis) { axis = { id: createId(), name: "Color scheme", contexts: ["light", "dark"], default: "light", scope: { id: foundation.id, expectedKind: "foundation" }, overrides: {} }; foundation.themeAxes.push(axis); foundation.resolutionOrder.push(axis.id); }
    axis.overrides ??= {}; axis.overrides.dark ??= {};
    for (const spec of blueprint) if (spec.darkAlias && newNames.has(spec.name)) axis.overrides.dark[byName.get(spec.name)!.id] = { ref: { id: byName.get(spec.darkAlias)!.id, expectedKind: "token" } };
    for (const context of ["light", "dark"]) if (!foundation.themeSets.some(set => set.contexts[axis!.id] === context)) foundation.themeSets.push({ id: createId(), name: context === "light" ? "Light" : "Dark", contexts: Object.fromEntries(foundation.themeAxes.map(item => [item.id, item.id === axis!.id ? context : item.default ?? item.contexts[0]!])), resolutionProfile: { id: "axiom.resolver.explicit-order", expectedKind: "resolutionProfile", version: "1.0.0" } });
  }
}

const STARTER_BINDING_BLUEPRINT = new Map(foundationStarterTokens({ domains: FOUNDATION_STARTER_DOMAINS.map(domain => domain.id) }).map(token => [token.name, token]));
/** Read-only compatibility for pre-purpose starter domains. Only retained, pinned starter provenance is evidence. */
export function foundationDomainBindings(foundation: FoundationDocument): Map<string, { category: FoundationBindingCategory; source: "explicit" | "starter" }> {
  const bindings = new Map<string, { category: FoundationBindingCategory; source: "explicit" | "starter" }>();
  for (const domain of foundation.domains.filter(isObject)) {
    if (typeof domain.id !== "string") continue;
    if (typeof domain.bindingCategory === "string" && FOUNDATION_BINDING_CATEGORIES.includes(domain.bindingCategory as FoundationBindingCategory)) {
      bindings.set(domain.id, { category: domain.bindingCategory as FoundationBindingCategory, source: "explicit" }); continue;
    }
    const evidence = new Set<FoundationBindingCategory>();
    for (const token of foundation.tokens) {
      if (token.domain !== domain.id || token.metadata?.starter !== FOUNDATION_STARTER_PROFILE.id || token.metadata.version !== FOUNDATION_STARTER_PROFILE.version) continue;
      const spec = STARTER_BINDING_BLUEPRINT.get(token.name);
      if (spec && spec.type === token.typeRef.id) evidence.add(spec.domain as FoundationBindingCategory);
    }
    if (evidence.size === 1) bindings.set(domain.id, { category: [...evidence][0]!, source: "starter" });
  }
  return bindings;
}
