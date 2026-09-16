import type { JsonValue } from "./contracts.ts";
import type { FoundationBindingCategory, FoundationTokenType } from "./foundation-contracts.ts";

export const FOUNDATION_AUTHORING_PROFILE = Object.freeze({ id: "axiom.foundation", version: "1.0.0" } as const);
export const FOUNDATION_REQUIRED_CATEGORIES = Object.freeze(["color", "spacing", "sizing", "radius", "border", "shadow", "typography", "motion", "opacity", "gradient", "layer"] as const);
export const FOUNDATION_LENGTH_REFERENCE_PX = 16;
export interface FoundationRole {
  id: string; label: string; description: string; category: FoundationBindingCategory;
  type: FoundationTokenType; required: boolean; defaultUnit?: "rem" | "px" | "ms";
  references: string[]; defaultValue: JsonValue; minimum?: number; maximum?: number; exclusiveMinimum?: boolean; integer?: boolean;
}

const COLOR_ROLES = ["color.palette", "color.surface", "color.content", "color.action", "color.border", "color.focus", "color.feedback"];
const SIZE_ROLES = ["sizing.length", "sizing.icon", "sizing.control", "sizing.container", "sizing.target"];
const RADIUS_ROLES = ["radius.corner", "radius.pill"];
const COLOR = { colorSpace: "srgb", components: [0.55, 0.99, 0.32], alpha: 1 };
const LENGTH = { value: 1, unit: "rem" };
const ZERO = { value: 0, unit: "rem" };
const EASING = [0.2, 0, 0, 1];
const role = (id: string, label: string, type: FoundationTokenType, defaultValue: JsonValue, rules: Partial<FoundationRole> = {}): FoundationRole => ({
  id, label, description: `${label} tokens use the ${type} value contract.`, category: id.split(".")[0] as FoundationBindingCategory,
  type, required: true, references: [id], defaultValue, ...rules,
});

/** Private registry values are never returned directly by the public role API. */
export const FOUNDATION_ROLE_REGISTRY: readonly FoundationRole[] = [
  ...COLOR_ROLES.map(id => role(id, ({ "color.palette": "Palette color", "color.surface": "Surface", "color.content": "Content", "color.action": "Action", "color.border": "Border color", "color.focus": "Focus color", "color.feedback": "Feedback" } as Record<string, string>)[id]!, "color", COLOR, { references: COLOR_ROLES })),
  role("spacing.length", "Spacing", "dimension", LENGTH, { minimum: 0, defaultUnit: "rem" }),
  role("spacing.margin", "Signed margin", "dimension", ZERO, { required: false, defaultUnit: "rem", references: ["spacing.margin", "spacing.length"] }),
  ...SIZE_ROLES.map(id => role(id, ({ "sizing.length": "Size scale", "sizing.icon": "Icon size", "sizing.control": "Control size", "sizing.container": "Container size", "sizing.target": "Minimum target" } as Record<string, string>)[id]!, "dimension", id === "sizing.target" ? { value: 2.75, unit: "rem" } : LENGTH, { minimum: 0, exclusiveMinimum: true, defaultUnit: "rem", references: SIZE_ROLES })),
  role("radius.corner", "Corner radius", "dimension", { value: 0.5, unit: "rem" }, { minimum: 0, defaultUnit: "rem", references: RADIUS_ROLES }),
  role("radius.pill", "Pill radius", "dimension", { value: 256, unit: "rem" }, { minimum: 0, defaultUnit: "rem", references: RADIUS_ROLES }),
  role("border.width", "Border width", "dimension", { value: 1, unit: "px" }, { minimum: 0, defaultUnit: "px" }),
  role("border.style", "Border style", "strokeStyle", "solid"),
  role("border.stroke", "Border", "border", { color: COLOR, width: { value: 1, unit: "px" }, style: "solid" }, { defaultUnit: "px" }),
  role("shadow.elevation", "Elevation", "shadow", { color: { ...COLOR, components: [0, 0, 0], alpha: 0.12 }, offsetX: ZERO, offsetY: { value: 0.25, unit: "rem" }, blur: LENGTH, spread: ZERO }, { defaultUnit: "rem" }),
  role("typography.family", "Font family", "fontFamily", ["Geist", "sans-serif"]),
  role("typography.weight", "Font weight", "fontWeight", 400),
  role("typography.size", "Font size", "dimension", LENGTH, { minimum: 0, exclusiveMinimum: true, defaultUnit: "rem" }),
  role("typography.line-height", "Line height", "number", 1.5, { minimum: 0, exclusiveMinimum: true }),
  role("typography.tracking", "Letter spacing", "dimension", ZERO, { defaultUnit: "rem" }),
  role("typography.style", "Text style", "typography", { fontFamily: ["Geist", "sans-serif"], fontSize: LENGTH, fontWeight: 400, letterSpacing: ZERO, lineHeight: 1.5 }, { defaultUnit: "rem" }),
  role("motion.duration", "Duration", "duration", { value: 200, unit: "ms" }, { minimum: 0, defaultUnit: "ms", references: ["motion.duration", "motion.reduced"] }),
  role("motion.delay", "Transition delay", "duration", { value: 0, unit: "ms" }, { required: false, defaultUnit: "ms", references: ["motion.delay", "motion.duration", "motion.reduced"] }),
  role("motion.reduced", "Reduced motion duration", "duration", { value: 0, unit: "ms" }, { minimum: 0, maximum: 0, defaultUnit: "ms", description: "Zero-duration fallback; reduced-motion preference handling belongs to the consuming component." }),
  role("motion.easing", "Easing", "cubicBezier", EASING),
  role("motion.transition", "Transition", "transition", { duration: { value: 200, unit: "ms" }, delay: { value: 0, unit: "ms" }, timingFunction: EASING }),
  role("opacity.level", "Opacity", "number", 1, { minimum: 0, maximum: 1 }),
  role("gradient.fill", "Gradient fill", "gradient", [{ color: COLOR, position: 0 }, { color: { ...COLOR, components: [0, 0, 0] }, position: 1 }]),
  role("layer.order", "Stacking order", "number", 0, { integer: true }),
];
