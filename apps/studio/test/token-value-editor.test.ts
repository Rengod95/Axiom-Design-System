import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import type { FoundationTokenType, JsonValue } from "../../../modules/ads-core/src/index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const directory = await mkdtemp(join(tmpdir(), "axiom-value-controls-"));
after(async () => { assert.equal(dirname(resolve(directory)), resolve(tmpdir())); assert.ok(directory.includes("axiom-value-controls-")); await rm(directory, { recursive: true, force: true }); });
// Compile the real TSX with its SSR consumer. React hooks and the renderer share one runtime.
const output = await build({ absWorkingDir: root, stdin: { contents: `
  import { createElement } from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';
  import { TokenValueEditor } from './apps/studio/src/token-value-editor.tsx';
  export * from './apps/studio/src/token-value-editor.tsx';
  export function render(type, value, locale='en', disabled=false) {
    return renderToStaticMarkup(createElement(TokenValueEditor, {type,value,locale,disabled,onChange(){}}));
  }
`, resolveDir: root, loader: "tsx" }, bundle: true, platform: "node", format: "cjs", target: "node24", jsx: "automatic", write: false, logLevel: "silent" });
const filename = join(directory, "controls.cjs");
await writeFile(filename, output.outputFiles[0]!.text);
const controls = (await import(pathToFileURL(filename).href)).default as {
  TOKEN_TYPES: FoundationTokenType[]; COLOR_SPACES: string[];
  defaultTokenValue(type: FoundationTokenType): JsonValue;
  validateTokenEditorValue(type: FoundationTokenType, value: JsonValue): { valid: boolean };
  tokenValueSummary(value: JsonValue): string; tokenSwatch(value: JsonValue): string | undefined;
  render(type: FoundationTokenType, value: JsonValue, locale?: string, disabled?: boolean): string;
};

test("all thirteen creation defaults pass the independent public Foundation boundary and have structured controls", () => {
  assert.equal(controls.TOKEN_TYPES.length, 13);
  for (const type of controls.TOKEN_TYPES) {
    const value = controls.defaultTokenValue(type), before = JSON.stringify(value);
    assert.equal(controls.validateTokenEditorValue(type, value).valid, true, type);
    const html = controls.render(type, value);
    assert.match(html, /<(input|select)/, type);
    assert.doesNotMatch(html, /<textarea/, `${type} must not fall back to a JSON textarea`);
    assert.doesNotMatch(html, /Check the value/, type);
    assert.equal(JSON.stringify(value), before, `${type} render must not mutate source`);
  }
});

test("fourteen color spaces keep literal channels and alpha without pretending to convert to sRGB", () => {
  const colors: Record<string, number[]> = { srgb: [0.123, 0.456, 0.789], "srgb-linear": [0.1, 0.2, 0.3], hsl: [250, 30, 50], hwb: [250, 30, 50], lab: [40, -5, 8], lch: [40, 15, 250], oklab: [0.4, -0.05, 0.08], oklch: [0.4, 0.15, 250], "display-p3": [0.1, 0.2, 0.3], "a98-rgb": [0.1, 0.2, 0.3], "prophoto-rgb": [0.1, 0.2, 0.3], rec2020: [0.1, 0.2, 0.3], "xyz-d65": [0.1, 0.2, 0.3], "xyz-d50": [0.1, 0.2, 0.3] };
  assert.deepEqual([...controls.COLOR_SPACES].sort(), Object.keys(colors).sort());
  for (const [colorSpace, components] of Object.entries(colors)) {
    const value = { colorSpace, components, alpha: 0.37 };
    assert.equal(controls.validateTokenEditorValue("color", value).valid, true);
    const html = controls.render("color", value);
    assert.match(html, /value="0.37"/); assert.match(html, /It does not convert the color/);
    for (const channel of components) assert.ok(html.includes(`value="${channel}"`));
    if (colorSpace !== "srgb") { assert.equal(controls.tokenSwatch(value), undefined); assert.doesNotMatch(html, /type="color"/); assert.doesNotMatch(html, /token-value-input/); }
    else { assert.match(html, /data-testid="token-value-input"/); assert.match(html, /aria-label="Hex sRGB"/); }
  }
  assert.equal(controls.validateTokenEditorValue("color", { colorSpace: "oklch", components: [0.4, "none", 45], alpha: 1 }).valid, true);
});

test("compound fixtures expose their independent fields, lists and controls while preserving original values", () => {
  const value: JsonValue = [{ color: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.11 }, offsetX: { value: -2.5, unit: "rem" }, offsetY: { value: 1, unit: "px" }, blur: { value: 3, unit: "px" }, spread: { value: 0, unit: "px" }, inset: true }];
  assert.equal(controls.validateTokenEditorValue("shadow", value).valid, true);
  const html = controls.render("shadow", value);
  assert.match(html, /aria-label="Hex sRGB"/); assert.doesNotMatch(html, /data-testid="token-value-input"/, "nested colors never duplicate the root test identity");
  for (const label of ["offsetX", "offsetY", "blur", "spread", "Inset shadow", "Remove shadow", "Add shadow"]) assert.ok(html.includes(label), label);
  assert.match(html, /value="-2.5"/); assert.match(html, /value="rem" selected/);
  const gradient: JsonValue = [{ color: { colorSpace: "srgb", components: [1, 0, 0] }, position: -0.1 }, { color: { colorSpace: "srgb", components: [0, 0, 1] }, position: 1.2 }];
  assert.equal(controls.validateTokenEditorValue("gradient", gradient).valid, true, "DTCG out-of-range stops are preserved with warnings");
  const rendered = controls.render("gradient", gradient); assert.match(rendered, /value="-0.1"/); assert.match(rendered, /value="1.2"/);
});

test("invalid values remain visibly invalid and arbitrary strings cannot become markup or CSS swatches", () => {
  for (const [type, value] of [["color", { colorSpace: "srgb", components: [0, 0, 0], alpha: 2 }], ["dimension", { value: 12, unit: "vw" }], ["cubicBezier", [2, 0, 0.5, 1]], ["fontWeight", 0], ["typography", { fontFamily: "sans-serif" }]] as [FoundationTokenType, JsonValue][]) {
    assert.equal(controls.validateTokenEditorValue(type, value).valid, false, type);
    assert.match(controls.render(type, value), /Check the value/);
  }
  const source = '<img src=x onerror="alert(1)">';
  const html = controls.render("fontFamily", source);
  assert.doesNotMatch(html, /<img/); assert.match(html, /&lt;img/);
  assert.equal(controls.tokenSwatch({ colorSpace: "srgb", components: ["url(evil)", 0, 0] }), undefined);
  assert.equal(controls.tokenValueSummary({ value: 1.234, unit: "rem" }), "1.234 rem");
});

test("disabled structured controls and Korean labels are present for every type", () => {
  for (const type of controls.TOKEN_TYPES) {
    const html = controls.render(type, controls.defaultTokenValue(type), "ko", true);
    const inputs = [...html.matchAll(/<(input|select)\b[^>]*>/g)].map(item => item[0]);
    assert.ok(inputs.length > 0); inputs.forEach(input => assert.match(input, /disabled=""/, `${type}: ${input}`));
  }
  assert.match(controls.render("color", controls.defaultTokenValue("color"), "ko"), /색 공간/);
});
