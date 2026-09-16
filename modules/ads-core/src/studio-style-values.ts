import { isObject } from "./documents.ts";
import type { JsonValue } from "./contracts.ts";
import type { FoundationBindingCategory, FoundationTokenType, ResolvedFoundationToken } from "./foundation-contracts.ts";
import type { StudioLength, StudioVisualProperty } from "./studio-contracts.ts";
import { STUDIO_MAX_DIMENSION } from "./studio-constants.ts";
import { getFoundationRoles } from "./foundation-roles.ts";

/** Explicit reference basis for bounded specimens and native conversion; Web rem stays relative. */
export const STUDIO_ROOT_FONT_SIZE = 16;
const REM_LENGTH = /^(-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)rem$/i;

/** Resolve an executable length at a declared root basis, without changing its source unit. */
export function studioLengthPixels(value: StudioLength, rootFontSize = STUDIO_ROOT_FONT_SIZE): number {
  if (!Number.isFinite(rootFontSize) || rootFontSize <= 0 || rootFontSize > 256) throw new Error("Root font size must be positive and at most 256 logical px.");
  const match = typeof value === "string" ? REM_LENGTH.exec(value) : null;
  const result = typeof value === "number" ? value : match ? Number(match[1]) * rootFontSize : NaN;
  if (!Number.isFinite(result)) throw new Error("Expected a finite px or rem length.");
  return result;
}

/** Serialize only the closed numeric/relative length representation as CSS. */
export function studioLengthCss(value: StudioLength): string {
  studioLengthPixels(value);
  return typeof value === "number" ? `${value}px` : value;
}

export const STUDIO_EXTENDED_STYLE_TYPES: Readonly<Record<string, FoundationTokenType>> = {
  fontFamily: "fontFamily", fontWeight: "fontWeight", lineHeight: "number", letterSpacing: "dimension",
  boxShadow: "shadow", backgroundImage: "gradient", borderStyle: "strokeStyle", border: "border", typography: "typography",
  transitionDuration: "duration", transitionTimingFunction: "cubicBezier", transition: "transition",
};
export type StudioTokenBindingProperty = StudioVisualProperty | "gap" | "padding" | "minHeight" | "motionDuration" | "motionDelay" | "motionEasing";
const STUDIO_BINDING_TYPES: Readonly<Record<StudioTokenBindingProperty, FoundationTokenType>> = {
  background: "color", color: "color", borderColor: "color", borderWidth: "dimension", borderRadius: "dimension", fontSize: "dimension", opacity: "number",
  fontFamily: "fontFamily", fontWeight: "fontWeight", lineHeight: "number", letterSpacing: "dimension", boxShadow: "shadow", backgroundImage: "gradient", borderStyle: "strokeStyle", border: "border", typography: "typography",
  transitionDuration: "duration", transitionTimingFunction: "cubicBezier", transition: "transition", gap: "dimension", padding: "dimension", minHeight: "dimension", motionDuration: "duration", motionDelay: "duration", motionEasing: "cubicBezier",
};
const STUDIO_BINDING_CATEGORIES: Readonly<Record<StudioTokenBindingProperty, FoundationBindingCategory>> = {
  background: "color", color: "color", borderColor: "color", borderWidth: "border", borderRadius: "radius", fontSize: "typography", opacity: "opacity",
  fontFamily: "typography", fontWeight: "typography", lineHeight: "typography", letterSpacing: "typography", boxShadow: "shadow", backgroundImage: "gradient", borderStyle: "border", border: "border", typography: "typography",
  transitionDuration: "motion", transitionTimingFunction: "motion", transition: "motion", gap: "spacing", padding: "spacing", minHeight: "sizing", motionDuration: "motion", motionDelay: "motion", motionEasing: "motion",
};
const STUDIO_BINDING_ROLES: Readonly<Record<StudioTokenBindingProperty, string>> = {
  background: "color.surface", color: "color.content", borderColor: "color.border", borderWidth: "border.width", borderRadius: "radius.corner", fontSize: "typography.size", opacity: "opacity.level",
  fontFamily: "typography.family", fontWeight: "typography.weight", lineHeight: "typography.line-height", letterSpacing: "typography.tracking", boxShadow: "shadow.elevation", backgroundImage: "gradient.fill", borderStyle: "border.style", border: "border.stroke", typography: "typography.style",
  transitionDuration: "motion.duration", transitionTimingFunction: "motion.easing", transition: "motion.transition", gap: "spacing.length", padding: "spacing.length", minHeight: "sizing.control", motionDuration: "motion.duration", motionDelay: "motion.delay", motionEasing: "motion.easing",
};
const FOUNDATION_BINDING_ROLES = new Map(getFoundationRoles().map(role => [role.id, role]));
/** Shared by UI candidates and authoritative projection/transaction validation. Unclassified imports retain type compatibility. */
export function isStudioTokenCompatible(token: Pick<ResolvedFoundationToken, "type" | "bindingCategory" | "role">, property: StudioTokenBindingProperty): boolean {
  if (!Object.hasOwn(STUDIO_BINDING_TYPES, property) || token.type !== STUDIO_BINDING_TYPES[property]
    || token.bindingCategory !== undefined && token.bindingCategory !== "unrestricted" && token.bindingCategory !== STUDIO_BINDING_CATEGORIES[property]) return false;
  if (token.role === undefined) return true;
  const role = FOUNDATION_BINDING_ROLES.get(token.role), purpose = FOUNDATION_BINDING_ROLES.get(STUDIO_BINDING_ROLES[property]);
  return role?.type === token.type && role.category === STUDIO_BINDING_CATEGORIES[property] && purpose?.references.includes(role.id) === true;
}
const finite = (value: JsonValue | undefined, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`Expected a number from ${min} to ${max}.`);
  return value;
};
/** Keep px numeric compatibility and rem source semantics; bounds use the documented 16px reference basis. */
export function resolveStudioDimension(value: JsonValue | undefined, min = 0): StudioLength {
  if (!isObject(value) || Object.keys(value).some(key => !["value", "unit"].includes(key)) || !["px", "rem"].includes(String(value.unit))) throw new Error("This preview mapping needs an explicit px or rem dimension.");
  const scale = value.unit === "rem" ? STUDIO_ROOT_FONT_SIZE : 1;
  const numeric = finite(value.value, min / scale, STUDIO_MAX_DIMENSION / scale);
  return value.unit === "rem" ? `${numeric}rem` : numeric;
}
const rgba = (value: JsonValue | undefined): string => {
  if (!isObject(value) || value.colorSpace !== "srgb" || !Array.isArray(value.components) || value.components.length !== 3 || Object.keys(value).some(key => !["colorSpace", "components", "alpha", "hex"].includes(key))) throw new Error("This preview mapping needs a numeric sRGB color.");
  return `rgba(${value.components.map(channel => Math.round(finite(channel, 0, 1) * 255)).join(", ")}, ${value.alpha === undefined ? 1 : finite(value.alpha, 0, 1)})`;
};
const font = (value: JsonValue | undefined): string => {
  const names = typeof value === "string" ? [value] : value;
  if (!Array.isArray(names) || !names.length || names.length > 32 || names.some(name => typeof name !== "string" || !name.trim() || name.length > 200)) throw new Error("Choose bounded, nonempty font families.");
  return names.map(name => `"${String(name).replace(/[^a-zA-Z0-9 -]/gu, char => `\\${char.codePointAt(0)!.toString(16)} `)}"`).join(", ");
};
const stroke = (value: JsonValue | undefined): string => { if (typeof value !== "string" || !["solid", "dashed", "dotted", "double", "groove", "ridge", "outset", "inset"].includes(value)) throw new Error("Custom dash patterns require a dedicated stroke mapping."); return value; };
const durationCss = (value: JsonValue | undefined, delay = false): string => {
  if (!isObject(value) || Object.keys(value).some(key => !["value", "unit"].includes(key)) || !["ms", "s"].includes(String(value.unit))) throw new Error("Transition duration requires ms or s.");
  const bound = value.unit === "s" ? 10 : 10000;
  return `${finite(value.value, delay ? -bound : 0, bound)}${value.unit}`;
};

/** Only typed data becomes CSS; arbitrary CSS expressions and URLs are never evaluated. */
export function resolveExtendedStudioStyle(property: string, value: JsonValue): Record<string, string | number> {
  switch (property) {
    case "fontFamily": return { fontFamily: font(value) };
    case "fontWeight": return { fontWeight: finite(value, 1, 1000) };
    case "lineHeight": return { lineHeight: finite(value, .1, 10) };
    case "letterSpacing": return { letterSpacing: resolveStudioDimension(value, -100) };
    case "borderStyle": return { borderStyle: stroke(value) };
    case "border": {
      if (!isObject(value) || Object.keys(value).some(key => !["width", "color", "style"].includes(key))) throw new Error("Border requires width, color and style.");
      return { borderWidth: resolveStudioDimension(value.width), borderColor: rgba(value.color), borderStyle: stroke(value.style) };
    }
    case "typography": {
      if (!isObject(value) || Object.keys(value).some(key => !["fontFamily", "fontWeight", "fontSize", "lineHeight", "letterSpacing"].includes(key))) throw new Error("Unsupported typography fields.");
      const fontSize = resolveStudioDimension(value.fontSize); if (studioLengthPixels(fontSize) === 0) throw new Error("Typography needs a positive font size.");
      return { fontFamily: font(value.fontFamily), fontWeight: finite(value.fontWeight, 1, 1000), fontSize, lineHeight: finite(value.lineHeight, .1, 10), letterSpacing: resolveStudioDimension(value.letterSpacing, -100) };
    }
    case "boxShadow": {
      const layers = Array.isArray(value) ? value : [value];
      if (!layers.length || layers.length > 8) throw new Error("Preview supports one to eight shadow layers.");
      return { boxShadow: layers.map(layer => {
        if (!isObject(layer) || Object.keys(layer).some(key => !["color", "offsetX", "offsetY", "blur", "spread", "inset"].includes(key)) || layer.inset !== undefined && typeof layer.inset !== "boolean") throw new Error("Invalid shadow fields.");
        return `${layer.inset ? "inset " : ""}${studioLengthCss(resolveStudioDimension(layer.offsetX, -4096))} ${studioLengthCss(resolveStudioDimension(layer.offsetY, -4096))} ${studioLengthCss(resolveStudioDimension(layer.blur))} ${studioLengthCss(resolveStudioDimension(layer.spread, -4096))} ${rgba(layer.color)}`;
      }).join(", ") };
    }
    case "backgroundImage": {
      if (!Array.isArray(value) || value.length < 2 || value.length > 32) throw new Error("Preview supports 2–32 gradient stops.");
      let previous = -1;
      const stops = value.map(stop => { if (!isObject(stop) || Object.keys(stop).some(key => !["color", "position"].includes(key))) throw new Error("Invalid gradient stop."); const position = finite(stop.position, 0, 1); if (position < previous) throw new Error("Gradient stops must be ordered."); previous = position; return `${rgba(stop.color)} ${position * 100}%`; });
      return { backgroundImage: `linear-gradient(180deg, ${stops.join(", ")})` };
    }
    case "transition": {
      if (!isObject(value) || Object.keys(value).some(key => !["duration", "delay", "timingFunction"].includes(key))) throw new Error("Transition requires duration, delay and timingFunction.");
      return { ...resolveExtendedStudioStyle("transitionDuration", value.duration!), ...resolveExtendedStudioStyle("transitionTimingFunction", value.timingFunction!), transitionDelay: durationCss(value.delay, true) };
    }
    case "transitionDuration": {
      return { transitionDuration: durationCss(value) };
    }
    case "transitionTimingFunction": {
      if (!Array.isArray(value) || value.length !== 4) throw new Error("Easing requires four cubic-bezier coordinates.");
      return { transitionTimingFunction: `cubic-bezier(${value.map((coordinate, index) => finite(coordinate, index % 2 ? -100 : 0, index % 2 ? 100 : 1)).join(", ")})` };
    }
    default: throw new Error("Unsupported style mapping.");
  }
}
