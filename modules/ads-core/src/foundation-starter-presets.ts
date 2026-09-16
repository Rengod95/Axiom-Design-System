import type { JsonObject, JsonValue } from "./contracts.ts";
import { FOUNDATION_LENGTH_REFERENCE_PX } from "./foundation-role-registry.ts";
import type { FoundationStarterOptions, FoundationStarterToken } from "./foundation-starters.ts";

/** Architecture references inform these editable Axiom adaptations, not upstream conformance. */
export const FOUNDATION_STARTER_TEMPLATES = [
  { id: "essentials", name: "Axiom Essentials", summary: ["범용 스케일과 간결한 역할", "General scales, concise roles"], architecture: "Primitive → Semantic", source: "https://www.designtokens.org/tr/2025.10/format/", accent: "#8dfc52" },
  { id: "radix", name: "Radix · Interaction", summary: ["12단계 색상과 상호작용 상태", "12 color steps, interaction states"], architecture: "Scale → Surface / State / Text", source: "https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale", accent: "#3e63dd" },
  { id: "carbon", name: "Carbon · Layers", summary: ["레이어 깊이와 정밀한 간격", "Layer depth, precise spacing"], architecture: "Palette → Layer / Field / Support", source: "https://carbondesignsystem.com/elements/color/overview/", accent: "#0f62fe" },
  { id: "material", name: "Material · Roles", summary: ["참조 팔레트와 컨테이너 역할", "Reference palettes, container roles"], architecture: "Reference → System → Component", source: "https://github.com/material-foundation/material-tokens/blob/main/tokens.md", accent: "#6750a4" },
  { id: "fluent", name: "Fluent · States", summary: ["전역 값과 세밀한 상태 별칭", "Global values, detailed state aliases"], architecture: "Global → Alias / State", source: "https://fluent2.microsoft.design/design-tokens", accent: "#0f6cbd" },
  { id: "spectrum", name: "Spectrum · Scales", summary: ["크기 규격과 계층형 별칭", "Size scales, layered aliases"], architecture: "Global → Accent → Role", source: "https://spectrum.adobe.com/page/design-tokens/", accent: "#147af3" },
] as const;
export type FoundationStarterTemplateId = typeof FOUNDATION_STARTER_TEMPLATES[number]["id"];

type PresetId = Exclude<FoundationStarterTemplateId, "essentials">;
interface Preset {
  steps: number[]; light: number[]; dark: number[];
  roles: Record<string, [number, number]>;
  action: [number, number]; radius: number[]; spacing: number[]; type: number[]; durations: number[];
  semanticPrefix: string;
}
// Neutral entries are achromatic sRGB byte values; role entries index these arrays.
// Brand ramps are Axiom sRGB mixes. They do not implement HCT, Radix's contrast guarantees,
// upstream high-contrast themes, or a complete vendor token distribution.
const PRESETS: Record<PresetId, Preset> = {
  radix: {
    steps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], light: [252, 249, 240, 232, 224, 217, 206, 187, 141, 131, 100, 32], dark: [17, 25, 34, 42, 49, 58, 72, 96, 110, 123, 180, 238],
    roles: { "surface.canvas": [0, 0], "surface.raised": [1, 1], "surface.subtle": [2, 2], "surface.hover": [3, 3], "surface.selected": [4, 4], "border.default": [5, 5], "border.strong": [7, 7], "text.primary": [11, 11], "text.secondary": [10, 10], "text.inverse": [0, 0] },
    action: [8, 8], radius: [0, 2, 4, 6, 8, 12, 4096], spacing: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96], type: [12, 14, 16, 24, 48], durations: [0, 100, 150, 200, 300, 500], semanticPrefix: "role",
  },
  carbon: {
    steps: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], light: [255, 244, 224, 198, 168, 141, 111, 82, 57, 38, 22], dark: [255, 244, 224, 198, 168, 141, 111, 82, 57, 38, 22],
    roles: { "background": [0, 10], "layer.01": [1, 9], "layer.02": [0, 8], "layer.03": [1, 7], "field.01": [1, 9], "border.subtle": [2, 8], "border.strong": [5, 6], "text.primary": [10, 1], "text.secondary": [7, 3], "text.inverse": [0, 10] },
    action: [6, 5], radius: [0, 0, 2, 2, 4, 8, 4096], spacing: [0, 2, 4, 8, 12, 16, 24, 32, 48, 64], type: [12, 14, 16, 28, 54], durations: [0, 70, 110, 150, 240, 400], semanticPrefix: "role",
  },
  material: {
    steps: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100], light: [0, 27, 48, 71, 94, 119, 145, 171, 198, 226, 241, 252, 255], dark: [0, 27, 48, 71, 94, 119, 145, 171, 198, 226, 241, 252, 255],
    roles: { "surface": [11, 1], "surface.container": [10, 2], "surface.container.high": [9, 3], "on.surface": [1, 9], "on.surface.variant": [3, 8], "outline": [5, 6], "outline.variant": [8, 3], "inverse.on.surface": [10, 2] },
    action: [4, 8], radius: [0, 4, 8, 12, 16, 28, 4096], spacing: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96], type: [12, 14, 16, 28, 57], durations: [0, 50, 100, 200, 300, 500], semanticPrefix: "sys.color",
  },
  fluent: {
    steps: [0, 4, 10, 14, 20, 26, 40, 60, 74, 84, 94, 98, 100], light: [0, 10, 26, 36, 51, 66, 102, 153, 189, 214, 240, 250, 255], dark: [0, 10, 26, 36, 51, 66, 102, 153, 189, 214, 240, 250, 255],
    roles: { "neutral.background.1": [12, 3], "neutral.background.2": [11, 2], "neutral.background.hover": [10, 4], "neutral.background.pressed": [9, 1], "neutral.foreground.1": [3, 12], "neutral.foreground.2": [5, 9], "neutral.stroke.1": [9, 6], "neutral.stroke.accessible": [6, 8], "neutral.foreground.inverted": [12, 3] },
    action: [7, 8], radius: [0, 2, 4, 4, 8, 12, 4096], spacing: [0, 2, 4, 8, 12, 16, 20, 24, 32, 48], type: [12, 14, 14, 24, 40], durations: [0, 50, 100, 150, 250, 400], semanticPrefix: "alias.color",
  },
  spectrum: {
    steps: [50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900], light: [255, 253, 248, 230, 213, 177, 144, 109, 70, 44, 29], dark: [29, 38, 50, 62, 80, 105, 132, 162, 192, 223, 255],
    roles: { "background.base": [1, 0], "background.layer.1": [0, 2], "background.layer.2": [2, 3], "content.default": [9, 9], "content.subdued": [7, 7], "border.default": [3, 4], "border.strong": [5, 6], "content.inverse": [0, 0] },
    action: [6, 6], radius: [0, 2, 4, 4, 8, 16, 4096], spacing: [0, 2, 4, 8, 12, 16, 24, 32, 40, 48], type: [12, 14, 16, 25, 50], durations: [0, 100, 130, 160, 250, 400], semanticPrefix: "alias",
  },
};

const COMMON_COLOR_ROLES: Record<PresetId, string[]> = {
  radix: ["surface.canvas", "surface.raised", "surface.subtle", "text.primary", "text.secondary", "text.inverse", "border.default", "border.strong"],
  carbon: ["background", "layer.01", "layer.02", "text.primary", "text.secondary", "text.inverse", "border.subtle", "border.strong"],
  material: ["surface", "surface.container", "surface.container.high", "on.surface", "on.surface.variant", "inverse.on.surface", "outline.variant", "outline"],
  fluent: ["neutral.background.2", "neutral.background.1", "neutral.background.hover", "neutral.foreground.1", "neutral.foreground.2", "neutral.foreground.inverted", "neutral.stroke.1", "neutral.stroke.accessible"],
  spectrum: ["background.base", "background.layer.1", "background.layer.2", "content.default", "content.subdued", "content.inverse", "border.default", "border.strong"],
};
const COMMON_COLOR_NAMES = ["surface.canvas", "surface.raised", "surface.subtle", "text.primary", "text.secondary", "text.inverse", "border.default", "border.strong"];
const DIMENSION_STEPS = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24];
const RADIUS_NAMES = ["none", "xs", "sm", "md", "lg", "xl", "full"];
const TYPE_NAMES = ["caption", "label", "body", "heading", "display"];
const DURATION_STEPS = [0, 100, 150, 200, 300, 500];
const rgb = (components: number[]): JsonObject => ({ colorSpace: "srgb", components, alpha: 1 });
const dim = (value: number): JsonObject => ({ value: value / FOUNDATION_LENGTH_REFERENCE_PX, unit: "rem" });

/** Produce independent scales while preserving stable Axiom role adapters used by new projects. */
export function adaptFoundationStarterTokens(base: FoundationStarterToken[], options: FoundationStarterOptions, id: PresetId): FoundationStarterToken[] {
  const preset = PRESETS[id], result: FoundationStarterToken[] = [], namespace = `${id}.`;
  const primitive = (domain: string, name: string, type: FoundationStarterToken["type"], value: JsonValue, role = "color.palette") => result.push({ domain, name, role, type, tier: "primitive", literal: value });
  const semantic = (domain: string, name: string, type: FoundationStarterToken["type"], alias: string, darkAlias?: string, role = "color.palette") => result.push({ domain, name, role, type, tier: "semantic", alias, ...(darkAlias ? { darkAlias } : {}) });
  const native = (name: string) => `${namespace}${preset.semanticPrefix}.${name}`;
  const neutral = (theme: string, index: number) => `${namespace}color.neutral.${theme}.${preset.steps[index]}`;
  const brand = (theme: string, index: number) => `${namespace}color.brand.${theme}.${preset.steps[index]}`;
  const accent = options.accent ?? FOUNDATION_STARTER_TEMPLATES.find(template => template.id === id)!.accent;
  const seed = [1, 3, 5].map(offset => parseInt(accent.slice(offset, offset + 2), 16) / 255);
  for (const [theme, values] of [["light", preset.light], ["dark", preset.dark]] as const) {
    values.forEach((value, index) => {
      primitive("color", neutral(theme, index), "color", rgb([value / 255, value / 255, value / 255]));
      // Match the selected action stop exactly; other stops follow the neutral ramp's direction.
      const anchor = values[preset.action[theme === "light" ? 0 : 1]]!;
      const amount = value >= anchor ? (value - anchor) / Math.max(1, 255 - anchor) : (value - anchor) / Math.max(1, anchor);
      primitive("color", brand(theme, index), "color", rgb(seed.map(channel => amount >= 0 ? channel + (1 - channel) * amount : channel * (1 + amount))));
    });
  }
  for (const [name, [light, dark]] of Object.entries(preset.roles)) semantic("color", native(name), "color", neutral("light", light), neutral("dark", dark));
  const backgroundRole = id === "material" ? "primary" : id === "spectrum" ? "accent.background.default" : "brand.background.default";
  const foregroundRole = id === "material" ? "on.primary" : id === "spectrum" ? "accent.content.default" : "brand.foreground";
  if (id === "spectrum") {
    semantic("color", `${namespace}accent.default`, "color", brand("light", preset.action[0]), brand("dark", preset.action[1]));
    semantic("color", native(backgroundRole), "color", `${namespace}accent.default`);
  } else semantic("color", native(backgroundRole), "color", brand("light", preset.action[0]), brand("dark", preset.action[1]));
  const luminance = (value: number[]) => value.reduce((sum, channel, i) => sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][i]!, 0);
  const foreground = (theme: "light" | "dark") => {
    const shades = theme === "light" ? preset.light : preset.dark;
    const light = shades.indexOf(Math.max(...shades)), dark = shades.indexOf(Math.min(...shades));
    const backgroundL = luminance(seed), contrast = (index: number) => { const level = luminance([shades[index]! / 255, shades[index]! / 255, shades[index]! / 255]); return (Math.max(level, backgroundL) + .05) / (Math.min(level, backgroundL) + .05); };
    return neutral(theme, contrast(light) >= contrast(dark) ? light : dark);
  };
  semantic("color", native(foregroundRole), "color", foreground("light"), foreground("dark"));
  const lightDirection = preset.light[0]! < preset.light.at(-1)! ? -1 : 1;
  for (const [state, offset] of [["hover", 1], ["pressed", 2]] as const) semantic("color", native(`brand.background.${state}`), "color", brand("light", Math.max(0, Math.min(preset.steps.length - 1, preset.action[0] + offset * lightDirection))), brand("dark", Math.max(0, Math.min(preset.steps.length - 1, preset.action[1] + offset))));
  if (id === "material") semantic("color", native("primary.container"), "color", brand("light", 9), brand("dark", 3));
  semantic("color", native("focus.ring"), "color", brand("light", preset.action[0]), brand("dark", preset.action[1]));
  COMMON_COLOR_NAMES.forEach((name, index) => semantic("color", name, "color", native(COMMON_COLOR_ROLES[id][index]!), undefined, base.find(token => token.name === name)!.role));
  semantic("color", "action.primary.background", "color", native(backgroundRole), undefined, "color.action");
  semantic("color", "action.primary.foreground", "color", native(foregroundRole), undefined, "color.action");
  semantic("color", "focus.ring", "color", native("focus.ring"), undefined, "color.focus");
  for (const token of base.filter(token => token.domain === "color" && (token.name.startsWith("color.success") || token.name.startsWith("color.warning") || token.name.startsWith("color.danger") || token.name.startsWith("color.info")))) primitive("color", namespace + token.name, token.type, token.literal!);
  for (const token of base.filter(token => token.domain === "color" && token.name.startsWith("feedback."))) { semantic("color", namespace + token.name, token.type, namespace + token.alias!, undefined, token.role); semantic("color", token.name, token.type, namespace + token.name, undefined, token.role); }
  const nativeValueName = (name: string) => name.startsWith("duration.") && name !== "duration.reduced" ? `${namespace}duration.${preset.durations[DURATION_STEPS.indexOf(Number(name.split(".").at(-1)))]}` : namespace + name;
  for (const token of base.filter(token => token.domain !== "color")) {
    const name = nativeValueName(token.name);
    if (token.alias) {
      const target = token.name === "sizing.control.default" && (id === "fluent" || id === "spectrum") ? "size.32" : token.alias;
      semantic(token.domain, name, token.type, nativeValueName(target), undefined, token.role); semantic(token.domain, token.name, token.type, name, undefined, token.role); continue;
    }
    let value = token.literal!;
    if (token.name.startsWith("space.")) value = dim(preset.spacing[DIMENSION_STEPS.indexOf(Number(token.name.split(".").at(-1)))]!);
    if (token.name.startsWith("radius.scale.")) value = dim(preset.radius[RADIUS_NAMES.indexOf(token.name.split(".").at(-1)!)]!);
    if (token.name.startsWith("type.scale.")) { const index = TYPE_NAMES.indexOf(token.name.split(".").at(-1)!); value = { ...(value as JsonObject), fontSize: dim(preset.type[index]!), ...(index > 2 ? { lineHeight: 1.2 } : {}) }; }
    if (token.name.startsWith("duration.") && token.name !== "duration.reduced") value = { value: preset.durations[DURATION_STEPS.indexOf(Number(token.name.split(".").at(-1)))]!, unit: "ms" };
    if (token.name === "transition.scale.standard") value = { ...(value as JsonObject), duration: { value: preset.durations[3]!, unit: "ms" } };
    if (token.name === "border.scale.default") value = { ...(value as JsonObject), color: rgb([.68, .68, .68]) };
    primitive(token.domain, name, token.type, value, token.role);
    if (token.name === "font.size.16") semantic(token.domain, token.name, token.type, name, undefined, token.role);
  }
  return result;
}
