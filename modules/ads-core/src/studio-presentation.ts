import type { AdsDocument, Diagnostic, JsonObject, JsonValue } from "./contracts.ts";
import type { FoundationResolution, ResolvedFoundationToken } from "./foundation-contracts.ts";
import type { StudioComponent, StudioDesign, StudioLayout, StudioLength, StudioPart, StudioPartPresentation, StudioStyle, StudioUsage, StudioVisualProperty } from "./studio-contracts.ts";
import { isObject, isValidId } from "./documents.ts";
import { STUDIO_COLOR_PROPERTIES, STUDIO_ERROR } from "./studio-constants.ts";

import { STUDIO_EXTENDED_STYLE_TYPES, isStudioTokenCompatible, resolveExtendedStudioStyle, resolveStudioDimension, studioLengthPixels } from "./studio-style-values.ts";
import type { StudioTokenBindingProperty } from "./studio-style-values.ts";

const PRESENTATION_STATES = ["filled", "outlined", "filled-disabled", "outlined-disabled", "filled-pressed", "outlined-pressed"] as const;
const TOKEN_REFERENCE_KEY = "tokenRef";
const CHANNEL_SCALE = 255;
const MIN_ACTION_HEIGHT = 44;
function diagnostic(id: string, path: string, message: string, code: string = STUDIO_ERROR.invalid): Diagnostic { return { code, phase: "document", severity: "error", sourceRef: id, path, message }; }
function objectList(value: JsonValue | undefined): JsonObject[] { return Array.isArray(value) ? value.filter(isObject) : []; }

/** Resolve source values to sRGB and unit-preserving px/rem visual mappings with provenance. */
export function projectStudioDesign(document: AdsDocument, component: Pick<StudioComponent, "id" | "archetype" | "parts">, foundation: FoundationResolution,
  diagnostics: Diagnostic[], usages: Record<string, StudioUsage[]>): StudioDesign {
  const tokens = new Map(foundation.tokens.map(token => [token.id, token]));
  const parts: Record<string, StudioPartPresentation> = Object.create(null);
  const layout: Record<string, StudioLayout> = Object.create(null);
  const add = (path: string, message: string, code?: string): void => { diagnostics.push(diagnostic(document.id, path, message, code)); };
  function value(source: JsonValue | undefined, type: "color" | "dimension" | "number", property: StudioTokenBindingProperty, path: string, partId: string): { resolved?: string | number; tokenId?: string } {
    let raw: JsonValue | undefined = source, token: ResolvedFoundationToken | undefined;
    if (isObject(source) && Object.hasOwn(source, TOKEN_REFERENCE_KEY)) {
      if (Object.keys(source).length !== 1 || !isValidId(source.tokenRef)) { add(path, "A visual token binding must name exactly one stable token ID."); return {}; }
      token = tokens.get(source.tokenRef);
      if (!token || token.type !== type) { add(path, "The visual token is missing or has an incompatible type."); return {}; }
      if (!isStudioTokenCompatible(token, property)) { add(path, `Token ${token.name} has purpose ${token.role ?? token.bindingCategory ?? "unclassified"}, which cannot bind ${property}. Choose a token with a compatible role and domain.`, STUDIO_ERROR.tokenBinding); return {}; }
      raw = token.value;
      for (const id of [...new Set([token.id, ...token.aliasChain])]) {
        const entries = usages[id] ??= [];
        if (!entries.some(item => item.documentId === document.id && item.path === path)) entries.push({ componentId: component.id, partId, documentId: document.id, path });
      }
    }
    const tokenId = token ? { tokenId: token.id } : {};
    if (type === "color") {
      if (!isObject(raw) || raw.colorSpace !== "srgb" || !Array.isArray(raw.components) || raw.components.length !== 3
        || raw.components.some(channel => typeof channel !== "number" || !Number.isFinite(channel) || channel < 0 || channel > 1)
        || raw.alpha !== undefined && (typeof raw.alpha !== "number" || raw.alpha < 0 || raw.alpha > 1)
        || Object.keys(raw).some(key => !["colorSpace", "components", "alpha", "hex"].includes(key))) { add(path, "This visual profile requires numeric in-gamut sRGB; other source colors remain unrendered.", STUDIO_ERROR.unsupported); return {}; }
      return { resolved: `rgba(${raw.components.map(channel => Math.round((channel as number) * CHANNEL_SCALE)).join(", ")}, ${raw.alpha ?? 1})`, ...tokenId };
    }
    if (type === "dimension") {
      try { return { resolved: resolveStudioDimension(raw), ...tokenId }; }
      catch (error) { add(path, error instanceof Error ? error.message : "Invalid dimension.", STUDIO_ERROR.unsupported); return {}; }
    }
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 1) { add(path, "Opacity must be a finite number from zero through one."); return {}; }
    return { resolved: raw, ...tokenId };
  }
  for (const part of component.parts) {
    const presentation: StudioPartPresentation = { base: {}, outlined: {}, disabled: {}, pressed: {}, combinations: { filled: {}, outlined: {}, "filled-disabled": {}, "outlined-disabled": {}, "filled-pressed": {}, "outlined-pressed": {} }, provenance: Object.create(null) };
    for (const state of PRESENTATION_STATES) {
      const winners = new Map<string, { rank: number; value: string | number; path: string; tokenId?: string }>();
      for (const [index, rule] of objectList(document.appearance).entries()) {
        if (rule.targetPartRef !== part.id || !isObject(rule.variants) || !isObject(rule.states) || !isObject(rule.declarations)) continue;
        const variant = state.startsWith("outlined") ? "outlined" : "filled";
        if (rule.variants.variant !== undefined && rule.variants.variant !== variant) continue;
        if (Object.keys(rule.states).some(key => !state.endsWith(`-${key}`))) continue;
        const specificity = Object.keys(rule.states).length + Object.keys(rule.variants).length;
        const rank = specificity * 100_000 + Number(rule.explicitPriority) * 10;
        for (const [property, source] of Object.entries(rule.declarations)) {
          const path = `/appearance/${index}/declarations/${property}`;
          const outputs: { property: string; resolved: string | number; tokenId?: string; rank: number }[] = [];
          if (Object.hasOwn(STUDIO_EXTENDED_STYLE_TYPES, property)) {
            let raw = source, tokenId: string | undefined;
            try {
              if (isObject(source) && Object.hasOwn(source, TOKEN_REFERENCE_KEY)) {
                if (Object.keys(source).length !== 1 || typeof source.tokenRef !== "string") throw new Error("Use exactly one stable token binding.");
                const token = tokens.get(source.tokenRef);
                if (!token || token.type !== STUDIO_EXTENDED_STYLE_TYPES[property]) throw new Error("Style token is missing or has an incompatible type.");
                if (!isStudioTokenCompatible(token, property as StudioVisualProperty)) { add(path, `Token ${token.name} has purpose ${token.role ?? token.bindingCategory ?? "unclassified"}, which cannot bind ${property}. Choose a token with a compatible role and domain.`, STUDIO_ERROR.tokenBinding); continue; }
                raw = token.value; tokenId = token.id;
                for (const id of new Set([token.id, ...token.aliasChain])) { const entries = usages[id] ??= []; if (!entries.some(item => item.documentId === document.id && item.path === path)) entries.push({ componentId: component.id, partId: part.id, documentId: document.id, path }); }
              }
              for (const [field, resolved] of Object.entries(resolveExtendedStudioStyle(property, raw))) outputs.push({ property: field, resolved, ...(tokenId ? { tokenId } : {}), rank: rank + (property === "typography" || property === "border" ? 0 : 1) });
            } catch (error) { add(path, error instanceof Error ? error.message : "Invalid style value.", STUDIO_ERROR.unsupported); }
          } else {
            const output = value(source, STUDIO_COLOR_PROPERTIES.has(property) ? "color" : property === "opacity" ? "number" : "dimension", property as StudioVisualProperty, path, part.id);
            if (output.resolved !== undefined) outputs.push({ property, resolved: output.resolved, ...(output.tokenId ? { tokenId: output.tokenId } : {}), rank: rank + 1 });
          }
          for (const output of outputs) {
            if (output.property === "fontSize" && studioLengthPixels(output.resolved as StudioLength) === 0) { add(path, "Text must have a positive size."); continue; }
            const previous = winners.get(output.property);
            if (previous?.rank === output.rank && previous.value !== output.resolved) { add(path, `Conflicting ${output.property} declarations at equal precedence.`, STUDIO_ERROR.conflict); continue; }
            if (!previous || output.rank > previous.rank) winners.set(output.property, { rank: output.rank, value: output.resolved, path, ...(output.tokenId ? { tokenId: output.tokenId } : {}) });
          }
        }
      }
      const style: StudioStyle = {};
      for (const [property, winner] of winners) {
        Object.assign(style, { [property]: winner.value });
        presentation.provenance[`${state}.${property}`] = { documentId: document.id, path: winner.path, ...(winner.tokenId ? { tokenId: winner.tokenId } : {}) };
      }
      presentation.combinations[state] = style;
    }
    presentation.base = presentation.combinations.filled;
    const changes = (style: StudioStyle): StudioStyle => Object.fromEntries(Object.entries(style).filter(([key, value]) => presentation.base[key as keyof StudioStyle] !== value));
    presentation.outlined = changes(presentation.combinations.outlined);
    presentation.disabled = changes(presentation.combinations["filled-disabled"]);
    presentation.pressed = changes(presentation.combinations["filled-pressed"]);
    parts[part.id] = presentation;
    const source = objectList(document.layout).find(item => item.targetPartRef === part.id);
    if (!source) continue;
    const index = objectList(document.layout).indexOf(source);
    const numeric = (field: "gap" | "padding" | "minHeight"): StudioLength => {
      const result = value(source[field], "dimension", field, `/layout/${index}/${field}`, part.id).resolved;
      return result === undefined ? 0 : result as StudioLength;
    };
    layout[part.id] = { ...(source.mode === "free" ? { mode: "free" as const } : {}), ...(isObject(source.position) ? { position: { x: Number(source.position.x), y: Number(source.position.y) } } : {}), axis: source.axis === "horizontal" ? "horizontal" : "vertical", gap: numeric("gap"), padding: numeric("padding"), minHeight: numeric("minHeight"), childOrder: Array.isArray(source.childOrder) ? source.childOrder.map(String) : [] };
    if (isObject(source.size)) for (const axis of ["width", "height"] as const) {
      const policy = source.size[axis];
      if (isObject(policy) && (policy.mode === "hug" || policy.mode === "fill")) layout[part.id]![axis] = { mode: policy.mode };
      else if (isObject(policy) && policy.mode === "fixed" && isObject(policy.value) && typeof policy.value.value === "number") layout[part.id]![axis] = { mode: "fixed", value: policy.value.value };
    }
    if (source.alignment === "start" || source.alignment === "center" || source.alignment === "end" || source.alignment === "stretch") layout[part.id]!.alignment = source.alignment;
    if (component.archetype === "button" && part.role === "root" && studioLengthPixels(layout[part.id]!.minHeight) < MIN_ACTION_HEIGHT) add(`/layout/${index}/minHeight`, "Button requires at least 44 logical px at the 16px root reference in this profile.");
  }
  const mappings = objectList(document.nodeMappings).filter(item => typeof item.element === "string");
  const elements = Object.fromEntries(mappings.map(item => [String(item.partRef), item.element])) as NonNullable<StudioDesign["elements"]>;
  return { id: document.id, category: document.category === "Web" ? "Web" : "Mobile", parts, layout, ...(document.referenceLayout ? { referenceLayout: Object.fromEntries(objectList(document.referenceLayout).map(row => [String(row.partRef), row.fields])) as Record<string, string[]> } : {}), ...(mappings.length ? { elements } : {}), ...(isObject(document.editorFrame) ? { editorFrame: document.editorFrame as unknown as NonNullable<StudioDesign["editorFrame"]> } : {}) };
}
