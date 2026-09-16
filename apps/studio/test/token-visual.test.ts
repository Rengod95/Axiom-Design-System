import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

const bundle = await build({ stdin: { contents: `export * from './apps/studio/src/token-visual.tsx'; export { activeTokenReferences } from './apps/studio/src/token-relationships.tsx';`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, platform: "node", format: "cjs", jsx: "automatic", write: false, logLevel: "silent" });
const module = { exports: {} as Record<string, (...args: any[]) => any> };
new Function("module", "exports", "require", bundle.outputFiles[0]!.text)(module, module.exports, createRequire(import.meta.url));
const { specimenColor, specimenShadow, specimenTiming, specimenDimension, specimenSummary, specimenTypography, activeTokenReferences } = module.exports;

test("material colors retain alpha, missing channels and non-sRGB color spaces", () => {
  assert.equal(specimenColor!({ colorSpace: "hsl", components: [120, 50, 25], alpha: .4 }), "hsl(120 50% 25% / 0.4)");
  assert.equal(specimenColor!({ colorSpace: "display-p3", components: [1, .2, 0], alpha: .5 }), "color(display-p3 1 0.2 0 / 0.5)");
  assert.equal(specimenColor!({ colorSpace: "oklch", components: [.6, .2, "none"] }), "oklch(0.6 0.2 none / 1)");
  assert.equal(specimenColor!({ colorSpace: "srgb", components: [0, NaN, 0] }), undefined);
});
test("shadow specimens retain multiple layers, inset, offsets and rem dimensions", () => {
  const shadow = { inset: true, offsetX: { value: -.25, unit: "rem" }, offsetY: { value: 2, unit: "px" }, blur: { value: 8, unit: "px" }, spread: { value: -1, unit: "px" }, color: { colorSpace: "srgb", components: [0, 0, 0], alpha: .2 } };
  const original = JSON.stringify(shadow);
  assert.equal(specimenShadow!([shadow, { ...shadow, inset: false }]), "inset -0.25rem 2px 8px -1px color(srgb 0 0 0 / 0.2), -0.25rem 2px 8px -1px color(srgb 0 0 0 / 0.2)");
  assert.equal(JSON.stringify(shadow), original);
  assert.equal(specimenSummary!("shadow", [shadow, shadow]), "2 layers · Inset · X -0.25rem · Y 2px · Blur 8px · Spread -1px");
  assert.equal(specimenSummary!("border", { width: { value: 1, unit: "px" }, style: "solid" }), "1px · solid");
  assert.equal(specimenSummary!("typography", { fontFamily: ["SUIT", "sans-serif"], fontWeight: 550, fontSize: { value: 1, unit: "rem" }, lineHeight: 1.5 }), "SUIT, sans-serif · 550 · 1rem / 1.5");
  assert.equal(specimenDimension!({ value: 1.5, unit: "rem" }), 24);
  assert.equal(specimenDimension!({ value: 1.5, unit: "rem" }, 20), 30);
  assert.equal(specimenDimension!({ value: 3, unit: "vw" }), 0, "unknown units cannot masquerade as px");
});
test("motion specimens preserve zero duration and convert seconds and delays independently", () => {
  assert.equal(specimenTiming!("duration", { value: 0, unit: "ms" }).duration, 0);
  const timing = specimenTiming!("transition", { duration: { value: .35, unit: "s" }, delay: { value: 80, unit: "ms" }, timingFunction: [.2, -.5, .8, 1.5] });
  assert.equal(timing.duration, 350); assert.equal(timing.delay, 80); assert.equal(timing.easing, "cubic-bezier(0.2,-0.5,0.8,1.5)");
});

test("editorial type uses authored composite measurements and family instead of a generic preview size", () => {
  const style = specimenTypography!("typography", { fontFamily: ["Geist", "sans-serif"], fontWeight: "semi-bold", fontSize: { value: 3, unit: "rem" }, letterSpacing: { value: -.025, unit: "rem" }, lineHeight: 1.1 });
  assert.deepEqual(style, { fontFamily: "Geist, sans-serif", fontWeight: 600, fontSize: "clamp(1px, 3rem, 256px)", letterSpacing: "-0.025rem", lineHeight: 1.1 });
  assert.equal(specimenTypography!("dimension", { value: 72, unit: "px" }, "font.size.display").fontSize, 72);
});

test("dependency diagrams follow active overrides and retain actual composite/property edges", () => {
  const token = { id: "role.surface", value: { ref: { id: "base.light", expectedKind: "token" } }, overrideTrace: [{ axisId: "scheme", context: "dark", path: "/themeAxes/0/overrides/dark/role.surface" }] };
  const model = { valueSets: [{ id: "group.brand", values: { "role.surface": { ref: { id: "base.brand", expectedKind: "token" } } } }], resolutionOrder: ["scheme", "brand"], contexts: { scheme: "dark", brand: "default" }, axes: [
    { id: "scheme", overrides: { dark: { "role.surface": { composite: { first: { ref: { id: "base.dark", expectedKind: "token", path: "/components/0" } }, second: { ref: { id: "base.alpha", expectedKind: "token" } } } } } } },
    { id: "brand", overrides: { custom: { "role.surface": { literal: 1 } } } },
  ] };
  const before = JSON.stringify({ model, token });
  assert.deepEqual(activeTokenReferences!(model, token).map((edge: any) => [edge.ref.id, edge.ref.path]), [["base.dark", "/components/0"], ["base.alpha", undefined]]);
  assert.equal(JSON.stringify({ model, token }), before);
  const custom = { ...token, overrideTrace: [...token.overrideTrace, { axisId: "brand", context: "custom", path: "/themeAxes/1/overrides/custom/role.surface" }] };
  assert.deepEqual(activeTokenReferences!({ ...model, contexts: { scheme: "dark", brand: "custom" } }, custom), []);
  assert.equal(activeTokenReferences!({ ...model, contexts: { scheme: "light", brand: "default" } }, { ...token, overrideTrace: [] })[0].ref.id, "base.light");
  const group = { ...token, overrideTrace: [...token.overrideTrace, { axisId: "brand", context: "custom", valueSetId: "group.brand", path: "/valueSets/0/values/role.surface" }] };
  assert.equal(activeTokenReferences!(model, group)[0].ref.id, "base.brand");
  const dependency = { ...group, overrideTrace: [...group.overrideTrace, { axisId: "brand", context: "custom", path: "/themeAxes/1/overrides/custom/base.brand" }] };
  assert.equal(activeTokenReferences!(model, dependency)[0].ref.id, "base.brand", "dependency traces do not change the inspected token's own expression");
});
