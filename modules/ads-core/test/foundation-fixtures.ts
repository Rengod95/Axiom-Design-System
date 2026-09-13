import type { JsonObject, JsonValue } from "../src/contracts.ts";
import type { FoundationTokenType } from "../src/foundation-contracts.ts";

export const color: JsonObject = { colorSpace: "srgb", components: [0.2, 0.4, 0.6] };
export const dimension: JsonObject = { value: 12, unit: "px" };
export const values: Record<FoundationTokenType, JsonValue> = {
  color, dimension, fontFamily: ["Inter", "sans-serif"], fontWeight: "semi-bold", duration: { value: 150, unit: "ms" }, cubicBezier: [0.2, -1, 0.8, 2], number: -3.5,
  strokeStyle: { dashArray: [dimension], lineCap: "round" }, border: { color, width: dimension, style: "solid" },
  transition: { duration: { value: 1, unit: "s" }, delay: { value: -20, unit: "ms" }, timingFunction: [0, 0, 1, 1] },
  shadow: [{ color, offsetX: dimension, offsetY: dimension, blur: dimension, spread: dimension, inset: true }],
  gradient: [{ color, position: 0 }, { color, position: 1 }],
  typography: { fontFamily: "Inter", fontSize: dimension, fontWeight: 450, letterSpacing: { value: 0, unit: "rem" }, lineHeight: 1.4 },
};
export function token(id = "token.base", type: FoundationTokenType = "number", literal: JsonValue = 1): JsonObject { return { id, name: id.replace("token.", ""), typeRef: { id: type }, value: { literal } }; }
export function foundation(tokens: JsonObject[] = [token()]): JsonObject {
  return { id: "foundation.demo", kind: "foundation", schemaVersion: "1.0.0", revision: "r1", name: "Demo", studioProfile: { id: "axiom.studio", version: "0.1.0" }, tokens, domains: [], tiers: [], themeAxes: [], themeSets: [], policies: [], originalSources: [], resolutionOrder: [] };
}
export const ref = (id: string): JsonObject => ({ ref: { id, expectedKind: "token" } });
export const profile = { id: "axiom.resolver.explicit-order", expectedKind: "resolutionProfile", version: "1.0.0" };
export function themed(): JsonObject {
  const document = foundation([token(), { ...token("token.alias"), value: ref("token.base") }]);
  document.themeAxes = [
    { id: "axis.scheme", contexts: ["light", "dark"], default: "light", scope: { id: document.id!, expectedKind: "foundation" }, overrides: { light: { "token.base": { literal: 2 } }, dark: { "token.base": { literal: 3 } } } },
    { id: "axis.density", contexts: ["normal", "compact"], default: "normal", scope: { id: document.id!, expectedKind: "foundation" }, overrides: { compact: { "token.base": { literal: 4 } } } },
  ];
  document.resolutionOrder = ["axis.scheme", "axis.density"];
  document.themeSets = [{ id: "theme.dark", contexts: { "axis.scheme": "dark", "axis.density": "normal" }, resolutionProfile: profile }];
  return document;
}
