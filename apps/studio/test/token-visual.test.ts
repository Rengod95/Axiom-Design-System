import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

const bundle = await build({ stdin: { contents: `export * from './apps/studio/src/token-visual.tsx';`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, platform: "node", format: "cjs", jsx: "automatic", write: false, logLevel: "silent" });
const module = { exports: {} as Record<string, (...args: any[]) => any> };
new Function("module", "exports", "require", bundle.outputFiles[0]!.text)(module, module.exports, createRequire(import.meta.url));
const { specimenColor, specimenShadow, specimenTiming, specimenDimension, specimenSummary } = module.exports;

test("material colors retain alpha, missing channels and non-sRGB color spaces", () => {
  assert.equal(specimenColor!({ colorSpace: "hsl", components: [120, 50, 25], alpha: .4 }), "hsl(120 50% 25% / 0.4)");
  assert.equal(specimenColor!({ colorSpace: "display-p3", components: [1, .2, 0], alpha: .5 }), "color(display-p3 1 0.2 0 / 0.5)");
  assert.equal(specimenColor!({ colorSpace: "oklch", components: [.6, .2, "none"] }), "oklch(0.6 0.2 none / 1)");
  assert.equal(specimenColor!({ colorSpace: "srgb", components: [0, NaN, 0] }), undefined);
});
test("shadow specimens retain multiple layers, inset, offsets and rem dimensions", () => {
  const shadow = { inset: true, offsetX: { value: -.25, unit: "rem" }, offsetY: { value: 2, unit: "px" }, blur: { value: 8, unit: "px" }, spread: { value: -1, unit: "px" }, color: { colorSpace: "srgb", components: [0, 0, 0], alpha: .2 } };
  const original = JSON.stringify(shadow);
  assert.equal(specimenShadow!([shadow, { ...shadow, inset: false }]), "inset -4px 2px 8px -1px color(srgb 0 0 0 / 0.2), -4px 2px 8px -1px color(srgb 0 0 0 / 0.2)");
  assert.equal(JSON.stringify(shadow), original);
  assert.equal(specimenSummary!("shadow", [shadow, shadow]), "2 layers · Inset · X -0.25rem · Y 2px · Blur 8px · Spread -1px");
  assert.equal(specimenSummary!("border", { width: { value: 1, unit: "px" }, style: "solid" }), "1px · solid");
  assert.equal(specimenSummary!("typography", { fontFamily: ["SUIT", "sans-serif"], fontWeight: 550, fontSize: { value: 1, unit: "rem" }, lineHeight: 1.5 }), "SUIT, sans-serif · 550 · 1rem / 1.5");
  assert.equal(specimenDimension!({ value: 1.5, unit: "rem" }), 24);
});
test("motion specimens preserve zero duration and convert seconds and delays independently", () => {
  assert.equal(specimenTiming!("duration", { value: 0, unit: "ms" }).duration, 0);
  const timing = specimenTiming!("transition", { duration: { value: .35, unit: "s" }, delay: { value: 80, unit: "ms" }, timingFunction: [.2, -.5, .8, 1.5] });
  assert.equal(timing.duration, 350); assert.equal(timing.delay, 80); assert.equal(timing.easing, "cubic-bezier(0.2,-0.5,0.8,1.5)");
});
