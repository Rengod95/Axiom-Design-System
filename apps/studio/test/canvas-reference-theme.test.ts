import assert from "node:assert/strict";
import test from "node:test";
import { previewBackgroundLuminance, referenceThemeForBackground } from "../src/canvas-reference-theme.ts";

test("missing, unsupported and transparent canvas paint leave reference theme inherited", () => {
  for (const background of [undefined, "", "transparent", "var(--surface)", "oklch(.5 .2 100)", "#ggg", "#12345", "#fff0", "#00000080"]) assert.equal(referenceThemeForBackground(background), null, String(background));
});

test("opaque hex backgrounds use sRGB luminance rather than an unweighted channel sum", () => {
  assert.equal(referenceThemeForBackground("#00ff00"), "light");
  assert.equal(referenceThemeForBackground("#0000ff"), "dark");
  assert.equal(referenceThemeForBackground("#777777"), "light");
  assert.equal(referenceThemeForBackground("#666666"), "dark");
  assert.equal(referenceThemeForBackground("  #FfF  "), "light");
  assert.equal(referenceThemeForBackground("#000F"), "dark");
  assert.equal(referenceThemeForBackground("#ffffffFF"), "light");
  assert.equal(previewBackgroundLuminance("#000000"), 0);
  assert.equal(previewBackgroundLuminance("#ffffff"), 1);
  assert.equal(previewBackgroundLuminance("#00ff00"), .7152);
});
