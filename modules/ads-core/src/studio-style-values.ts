import { isObject } from "./documents.ts";
import type { JsonValue } from "./contracts.ts";
import type { FoundationTokenType } from "./foundation-contracts.ts";

export const STUDIO_EXTENDED_STYLE_TYPES: Readonly<Record<string, FoundationTokenType>> = {
  fontFamily: "fontFamily", fontWeight: "fontWeight", lineHeight: "number", letterSpacing: "dimension",
  boxShadow: "shadow", backgroundImage: "gradient", borderStyle: "strokeStyle", border: "border", typography: "typography",
  transitionDuration: "duration", transitionTimingFunction: "cubicBezier", transition: "transition",
};
const finite = (value: JsonValue | undefined, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`Expected a number from ${min} to ${max}.`);
  return value;
};
const px = (value: JsonValue | undefined, min = 0): number => {
  if (!isObject(value) || Object.keys(value).some(key => !["value", "unit"].includes(key)) || value.unit !== "px") throw new Error("This preview mapping needs an explicit px dimension.");
  return finite(value.value, min, 4096);
};
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

/** Only typed data becomes CSS; arbitrary CSS expressions and URLs are never evaluated. */
export function resolveExtendedStudioStyle(property: string, value: JsonValue): Record<string, string | number> {
  switch (property) {
    case "fontFamily": return { fontFamily: font(value) };
    case "fontWeight": return { fontWeight: finite(value, 1, 1000) };
    case "lineHeight": return { lineHeight: finite(value, .1, 10) };
    case "letterSpacing": return { letterSpacing: px(value, -100) };
    case "borderStyle": return { borderStyle: stroke(value) };
    case "border": {
      if (!isObject(value) || Object.keys(value).some(key => !["width", "color", "style"].includes(key))) throw new Error("Border requires width, color and style.");
      return { borderWidth: px(value.width), borderColor: rgba(value.color), borderStyle: stroke(value.style) };
    }
    case "typography": {
      if (!isObject(value) || Object.keys(value).some(key => !["fontFamily", "fontWeight", "fontSize", "lineHeight", "letterSpacing"].includes(key))) throw new Error("Unsupported typography fields.");
      const fontSize = px(value.fontSize); if (!fontSize) throw new Error("Typography needs a positive font size.");
      return { fontFamily: font(value.fontFamily), fontWeight: finite(value.fontWeight, 1, 1000), fontSize, lineHeight: finite(value.lineHeight, .1, 10), letterSpacing: px(value.letterSpacing, -100) };
    }
    case "boxShadow": {
      const layers = Array.isArray(value) ? value : [value];
      if (!layers.length || layers.length > 8) throw new Error("Preview supports one to eight shadow layers.");
      return { boxShadow: layers.map(layer => {
        if (!isObject(layer) || Object.keys(layer).some(key => !["color", "offsetX", "offsetY", "blur", "spread", "inset"].includes(key)) || layer.inset !== undefined && typeof layer.inset !== "boolean") throw new Error("Invalid shadow fields.");
        return `${layer.inset ? "inset " : ""}${px(layer.offsetX, -4096)}px ${px(layer.offsetY, -4096)}px ${px(layer.blur)}px ${px(layer.spread, -4096)}px ${rgba(layer.color)}`;
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
      return { ...resolveExtendedStudioStyle("transitionDuration", value.duration!), ...resolveExtendedStudioStyle("transitionTimingFunction", value.timingFunction!), transitionDelay: resolveExtendedStudioStyle("transitionDuration", value.delay!).transitionDuration! };
    }
    case "transitionDuration": {
      if (!isObject(value) || Object.keys(value).some(key => !["value", "unit"].includes(key)) || !["ms", "s"].includes(String(value.unit))) throw new Error("Transition duration requires ms or s.");
      return { transitionDuration: `${finite(value.value, 0, value.unit === "s" ? 10 : 10000)}${value.unit}` };
    }
    case "transitionTimingFunction": {
      if (!Array.isArray(value) || value.length !== 4) throw new Error("Easing requires four cubic-bezier coordinates.");
      return { transitionTimingFunction: `cubic-bezier(${value.map((coordinate, index) => finite(coordinate, index % 2 ? -100 : 0, index % 2 ? 100 : 1)).join(", ")})` };
    }
    default: throw new Error("Unsupported style mapping.");
  }
}
