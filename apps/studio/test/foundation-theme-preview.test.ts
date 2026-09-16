import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, createStudioStarter, resolveFoundationTokens } from "../../../modules/ads-core/src/index.ts";
import type { FoundationDocument, FoundationThemeSet, FoundationTokenValue } from "../../../modules/ads-core/src/index.ts";
import { resolveThemeDraft, themeOverrideOrigin, valueGroupDraftState } from "../src/foundation-theme-preview.ts";

function fixture() {
  const source = createStudioStarter("project.theme-preview").find(document => document.kind === "foundation") as FoundationDocument;
  const color = (value: number) => ({ colorSpace: "srgb", components: [value, value, value], alpha: 1 });
  const alias = (id: string): FoundationTokenValue => ({ ref: { id, expectedKind: "token" } });
  const gradient: FoundationTokenValue = { composite: [{ color: alias("preview.surface"), position: 0 }, { color: alias("token.accent"), position: 1 }] };
  source.tokens.push(
    { id: "preview.middle", name: "preview.middle", typeRef: { id: "color" }, value: alias("token.accent") },
    { id: "preview.surface", name: "preview.surface", typeRef: { id: "color" }, value: alias("preview.middle") },
    { id: "preview.gradient", name: "preview.gradient", typeRef: { id: "gradient" }, value: gradient },
  );
  source.valueSets = [0.9, 0.1].map((value, index) => ({ id: `group.${index ? "dark" : "light"}`, name: index ? "Dark values" : "Light values", values: { "token.accent": { literal: color(value) }, "preview.surface": alias("preview.middle"), "preview.gradient": gradient } }));
  delete source.themeAxes[0]!.overrides;
  source.themeAxes[0]!.name = "Color scheme";
  source.themeAxes[0]!.valueSetIds = { light: ["group.light"], dark: ["group.dark"] };
  const theme = (contexts: Record<string, string>, valueSetIds: string[] = []): FoundationThemeSet => ({ ...source.themeSets[0]!, id: "theme.draft", contexts, valueSetIds });
  return { source, color, theme };
}

test("draft theme preview resolves nested aliases and composites in its own connected groups", () => {
  const { source, color, theme } = fixture();
  const before = JSON.stringify(source);
  const globalLight = resolveFoundationTokens(source, { themeSetId: "theme.light" });
  assert.equal(globalLight.valid, true, JSON.stringify(globalLight.diagnostics));
  assert.equal(canonicalJson(globalLight.tokens.find(token => token.id === "preview.surface")!.value), canonicalJson(color(0.9)));
  for (const draft of [theme({ "axis.scheme": "dark" }), theme({ "axis.scheme": "light" }, ["group.dark"])]) {
    const preview = resolveThemeDraft(source, draft);
    assert.equal(preview.valid, true, JSON.stringify(preview.diagnostics));
    assert.equal(canonicalJson(preview.tokens.find(token => token.id === "preview.surface")!.value), canonicalJson(color(0.1)));
    assert.equal(canonicalJson(preview.tokens.find(token => token.id === "preview.gradient")!.value), canonicalJson([{ color: color(0.1), position: 0 }, { color: color(0.1), position: 1 }]));
  }
  assert.equal(JSON.stringify(source), before, "preview never changes saved themes, group links or token identities");
});

test("incomplete or invalid draft themes yield diagnostics and no substitute preview tokens", () => {
  const { source, theme } = fixture();
  for (const draft of [theme({}), theme({ "axis.scheme": "missing" }), theme({ "axis.scheme": "light" }, ["group.missing"])]) {
    const preview = resolveThemeDraft(source, draft);
    assert.equal(preview.valid, false);
    assert.deepEqual(preview.tokens, []);
    assert.ok(preview.diagnostics.some(item => item.severity === "error"));
  }
  assert.equal(resolveThemeDraft(undefined, theme({ "axis.scheme": "dark" })).valid, false);
});

test("override origin identifies connected value groups rather than synthetic theme or axis names", () => {
  const { source, theme } = fixture();
  const preview = resolveThemeDraft(source, theme({ "axis.scheme": "light" }, ["group.dark"]));
  const token = preview.tokens.find(token => token.id === "preview.surface")!;
  const trace = token.overrideTrace.find(item => item.valueSetId === "group.dark")!;
  const model = { valueSets: source.valueSets!, axes: source.themeAxes };
  assert.equal(themeOverrideOrigin(trace, model, "en"), "Dark values · Value group");
  assert.equal(themeOverrideOrigin(trace, model, "ko"), "Dark values · 값 그룹");
  assert.equal(themeOverrideOrigin({ axisId: "axis.scheme", context: "dark", path: "/themeAxes/0/overrides/dark/token.accent" }, model, "en"), "Color scheme / dark");
  assert.equal(themeOverrideOrigin({ ...trace, valueSetId: "group.removed" }, model, "en"), "group.removed · Value group");
});

test("shared group drafts preserve rename/create intent without flagging initial default selections", () => {
  const initial = { name: "", domain: "color", copyFrom: "" };
  assert.deepEqual(valueGroupDraftState(initial, undefined, "color", ["color", "spacing"]), { dirty: false, valid: false });
  assert.deepEqual(valueGroupDraftState({ ...initial, domain: "spacing" }, undefined, "color", ["color", "spacing"]), { dirty: true, valid: false });
  assert.deepEqual(valueGroupDraftState({ ...initial, name: "Brand", copyFrom: "group.source" }, undefined, "color", ["color"]), { dirty: true, valid: true });
  const existing = { id: "group.shared", name: "Shared values", values: {} };
  const selected = { ...initial, name: existing.name };
  assert.deepEqual(valueGroupDraftState(selected, existing, "color", ["color"]), { dirty: false, valid: true });
  assert.deepEqual(valueGroupDraftState({ ...selected, name: "" }, existing, "color", ["color"]), { dirty: true, valid: false });
  assert.deepEqual(valueGroupDraftState({ ...selected, name: "Updated" }, existing, "color", ["color"]), { dirty: true, valid: true });
  assert.deepEqual(valueGroupDraftState(selected, existing, "color", ["color"]), { dirty: false, valid: true }, "resetting to the selected group's current values clears the draft");
});
