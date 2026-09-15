import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import type { StudioSliderProps } from "../src/studio-slider.tsx";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const directory = await mkdtemp(join(tmpdir(), "axiom-studio-slider-"));
after(async () => { assert.equal(dirname(resolve(directory)), resolve(tmpdir())); assert.ok(directory.includes("axiom-studio-slider-")); await rm(directory, { recursive: true, force: true }); });
const output = await build({ absWorkingDir: root, stdin: { contents: `
  import { createElement } from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';
  import { StudioSlider } from './apps/studio/src/studio-slider.tsx';
  export { sliderKeyboardValue } from './apps/studio/src/studio-slider.tsx';
  export function render(props) {
    let changes = 0;
    const html = renderToStaticMarkup(createElement(StudioSlider, {...props, onChange(){ changes++; }}));
    return {html, changes};
  }
`, resolveDir: root, loader: "tsx" }, bundle: true, platform: "node", format: "cjs", target: "node24", jsx: "automatic", write: false, logLevel: "silent" });
const filename = join(directory, "slider.cjs");
await writeFile(filename, output.outputFiles[0]!.text);
const slider = (await import(pathToFileURL(filename).href)).default as {
  sliderKeyboardValue(key: string, value: number, min: number, max: number, step: number): number | null;
  render(props: Omit<StudioSliderProps, "onChange">): { html: string; changes: number };
};

test("slider keys preserve decimal steps and clamp Home End and page increments to bounds", () => {
  const key = slider.sliderKeyboardValue;
  assert.equal(key("ArrowRight", .29, 0, 1, .01), .3);
  assert.equal(key("ArrowDown", .3, 0, 1, .01), .29);
  assert.equal(key("PageUp", .95, 0, 1, .01), 1);
  assert.equal(key("PageDown", -32, -64, 256, 8), -64);
  assert.equal(key("Home", 500, 1, 1000, 1), 1);
  assert.equal(key("End", 500, 1, 1000, 1), 1000);
  assert.equal(key("ArrowLeft", 0, 0, 1, .01), 0);
  assert.equal(key("Escape", .5, 0, 1, .01), null);
  assert.equal(key("ArrowRight", .5, 1, 0, .01), null);
  assert.equal(key("ArrowRight", .5, 0, 1, 0), null);
});

test("precise and out-of-window authored values render without normalizing or notifying the form", () => {
  for (const value of ["0.123456789", "-0.1", "1.2", "1e-3"]) {
    const result = slider.render({ label: "Position", value, min: 0, max: 1, step: .01 });
    assert.equal(result.changes, 0);
    assert.ok(result.html.includes(`value="${value}"`));
    assert.match(result.html, /type="range"[^>]*min="0"[^>]*max="1"[^>]*step="0.01"/);
    assert.match(result.html, /aria-label="Position"/);
  }
});

test("incomplete precision input stays invalid and editable beside a bounded accessible slider", () => {
  const result = slider.render({ label: "Opacity", value: "-", min: 0, max: 1, step: .01, invalid: true, testId: "opacity", locale: "ko" });
  assert.equal(result.changes, 0);
  assert.match(result.html, /aria-label="Opacity · 슬라이더"/);
  assert.match(result.html, /aria-invalid="true"[^>]*value="-"/);
  assert.match(result.html, /data-testid="opacity-slider"/);
  assert.match(result.html, /data-testid="opacity"/);
});

test("disabled gradient controls and rulers expose real range inputs with decorative ticks hidden", () => {
  const gradient = slider.render({ label: "Red", value: .2, min: 0, max: 1, step: .01, variant: "gradient", gradient: "linear-gradient(90deg,#000,#f00)", disabled: true });
  assert.equal((gradient.html.match(/disabled=""/g) ?? []).length, 2);
  assert.match(gradient.html, /data-variant="gradient"/);
  const ruler = slider.render({ label: "Duration", value: 240, min: 0, max: 2000, step: 10, variant: "ruler", precision: false });
  assert.match(ruler.html, /studio-slider-visual" aria-hidden="true"/);
  assert.match(ruler.html, /studio-slider-ticks/);
  assert.equal((ruler.html.match(/<input/g) ?? []).length, 1);
  assert.equal(ruler.changes, 0);
});

test("every slider variant paints one decorative thumb on shared native travel", () => {
  for (const variant of ["value", "gradient", "ruler"] as const) for (const value of [0, 50, 100]) {
    const result = slider.render({ label: "Amount", value, min: 0, max: 100, variant });
    assert.match(result.html, new RegExp(`--slider-progress:${value}%`));
    assert.equal((result.html.match(/type="range"/g) ?? []).length, 1);
    assert.equal((result.html.match(/class="studio-slider-thumb"/g) ?? []).length, 1);
    assert.match(result.html, /studio-slider-controls/);
    assert.equal(result.changes, 0);
  }
});

test("ruler ticks remain bounded for non-finite counts without changing authored input", () => {
  for (const ticks of [NaN, Infinity, -Infinity]) {
    const result = slider.render({ label: "Duration", value: "175.125", min: 0, max: 2000, variant: "ruler", ticks });
    assert.equal((result.html.match(/<i(?: |>)/g) ?? []).length, 21);
    assert.match(result.html, /value="175.125"/);
    assert.equal(result.changes, 0);
  }
});
