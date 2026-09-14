import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, createStudioStarter, FOUNDATION_STARTER_DOMAINS, foundationStarterTokens, inspectFoundationAuthoring, inspectStudioProject, planFoundationEdit, planStudioComponentCreate, planStudioComponentDuplicate, planStudioComponentEdit, sampleStudioSpring, STUDIO_PROFILE } from "../src/index.ts";
import type { FoundationDocument, JsonObject, ProjectSnapshot, StudioMotionTrack } from "../src/index.ts";
import { resolveExtendedStudioStyle } from "../src/studio-style-values.ts";

function opaqueContrast(left: JsonObject, right: JsonObject): number {
  const luminance = (color: JsonObject) => {
    assert.equal(color.colorSpace, "srgb"); assert.equal(color.alpha, 1);
    const [r, g, b] = (color.components as number[]).map(channel => channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
    return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
  };
  const first = luminance(left), second = luminance(right);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const OPTIONS = { domains: FOUNDATION_STARTER_DOMAINS.map(domain => domain.id), accent: "#245dc5", density: "compact" as const, fontFamily: "SUIT" };
function fixture(kit = false) {
  let count = 0; const id = () => `completion.${++count}`, documents = createStudioStarter("project.completion", kit ? OPTIONS : undefined);
  const project: ProjectSnapshot = { id: "project.completion", name: "Completion", revision: "initial", documents: Object.fromEntries(documents.map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:test", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  return { id, project };
}
const explain = (plan: { diagnostics: unknown[] }) => JSON.stringify(plan.diagnostics);

test("starter covers 11 classified domains and all 13 types, connects new sample components, and resolves both themes", () => {
  const { project } = fixture(true), foundation = project.documents["foundation.system"]!.document as FoundationDocument;
  const blueprint = foundationStarterTokens(OPTIONS);
  assert.equal(new Set(blueprint.map(token => token.type)).size, 13);
  assert.equal(foundation.domains.length, 11); assert.equal(foundation.tiers.length, 2);
  assert.ok(foundation.tokens.every(token => token.domain && token.tier));
  for (const themeSetId of ["theme.light", "theme.dark"]) {
    const report = inspectStudioProject(project, { themeSetId }); assert.equal(report.valid, true, explain(report));
    assert.equal(report.components[0]!.web.layout["component.button.root"]!.gap, 8);
    assert.ok(report.foundation.tokens.find(token => token.id === "token.action")!.aliasChain.length >= 2);
  }
  const light = inspectStudioProject(project, { themeSetId: "theme.light" }), dark = inspectStudioProject(project, { themeSetId: "theme.dark" });
  assert.notDeepEqual(light.components[0]!.web.parts["component.button.root"]!.base.background, dark.components[0]!.web.parts["component.button.root"]!.base.background);
});

test("adopting starter is additive and repeatable; name/type conflicts reject the entire proposal", () => {
  const { project, id } = fixture(), original = canonicalJson(project.documents["foundation.system"]!.document.tokens);
  const added = planFoundationEdit(project, { kind: "template-apply", ...OPTIONS }, id); assert.equal(added.valid, true, explain(added));
  const tokens = (added.project.documents["foundation.system"]!.document as FoundationDocument).tokens;
  assert.equal(canonicalJson(tokens.slice(0, 9)), original);
  const repeated = planFoundationEdit(added.project, { kind: "template-apply", ...OPTIONS, accent: "#c52c40" }, id); assert.equal(repeated.valid, true, explain(repeated)); assert.deepEqual((repeated.project.documents["foundation.system"]!.document as FoundationDocument).tokens, tokens);
  const collision = planFoundationEdit(project, { kind: "token-create", name: "color.neutral.0", type: "number", value: { literal: 42 } }, id);
  const rejected = planFoundationEdit(collision.project, { kind: "template-apply", ...OPTIONS }, id); assert.equal(rejected.valid, false); assert.equal(rejected.updates.length, 0); assert.deepEqual(rejected.project, collision.project);
});

test("new fluorescent starters resolve readable action foregrounds in both actual light and dark themes", () => {
  const documents = createStudioStarter("project.contrast", { ...OPTIONS, accent: "#8DFC52" });
  const project: ProjectSnapshot = { id: "project.contrast", name: "Contrast", revision: "initial", documents: Object.fromEntries(documents.map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:contrast", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  for (const themeSetId of ["theme.light", "theme.dark"]) {
    const report = inspectStudioProject(project, { themeSetId }); assert.equal(report.valid, true, explain(report));
    const background = report.foundation.tokens.find(token => token.name === "action.primary.background")!, foreground = report.foundation.tokens.find(token => token.name === "action.primary.foreground")!;
    assert.ok(opaqueContrast(background.value as JsonObject, foreground.value as JsonObject) >= 4.5, themeSetId);
    const neutral = report.foundation.tokens.find(token => token.name === "color.neutral.900")!;
    assert.deepEqual(foreground.value, neutral.value, themeSetId);
    assert.deepEqual(report.foundation.tokens.find(token => token.id === "token.onAccent")!.value, neutral.value, "New sample button follows the semantic foreground alias");
  }
});

test("starter action foregrounds use the best generated neutral for each generated shade across custom accents", () => {
  const accents = ["#8DFC52", "#000000", "#ffffff", "#5b50d6", "#ffff00", "#00ffff", "#ff00ff", "#ff0000", "#00ff00", "#0000ff", ...Array.from({ length: 256 }, (_, value) => `#${value.toString(16).padStart(2, "0").repeat(3)}`)];
  let white = 0, dark = 0, belowThreshold = 0;
  for (const accent of accents) {
    const tokens = foundationStarterTokens({ domains: ["color"], accent }), byName = new Map(tokens.map(token => [token.name, token]));
    const foreground = byName.get("action.primary.foreground")!, background = byName.get("action.primary.background")!;
    for (const theme of ["alias", "darkAlias"] as const) {
      const backgroundValue = byName.get(background[theme]!)!.literal as JsonObject, chosen = foreground[theme]!;
      assert.ok(chosen === "color.neutral.0" || chosen === "color.neutral.900");
      const achieved = opaqueContrast(backgroundValue, byName.get(chosen)!.literal as JsonObject);
      const candidates = ["color.neutral.0", "color.neutral.900"].map(name => opaqueContrast(backgroundValue, byName.get(name)!.literal as JsonObject));
      assert.equal(achieved, Math.max(...candidates), `${accent} ${theme}`);
      if (Math.max(...candidates) >= 4.5) assert.ok(achieved >= 4.5); else belowThreshold++;
      if (chosen === "color.neutral.0") white++; else dark++;
    }
  }
  assert.ok(white && dark, "Neither light nor dark foreground is hard-coded by theme");
  assert.ok(belowThreshold, "The fixed neutral palette does not pretend all custom accents satisfy AA");
});

test("reapplying starters preserves saved legacy foreground aliases and dark overrides", () => {
  const { project, id } = fixture(true), foundation = project.documents["foundation.system"]!.document as FoundationDocument;
  const byName = new Map(foundation.tokens.map(token => [token.name, token]));
  const foreground = byName.get("action.primary.foreground")!;
  foreground.value = { ref: { id: byName.get("color.neutral.0")!.id, expectedKind: "token" } };
  const axis = foundation.themeAxes.find(axis => axis.contexts.includes("dark"))!;
  axis.overrides!.dark![foreground.id] = { ref: { id: byName.get("color.neutral.950")!.id, expectedKind: "token" } };
  project.documents[foundation.id]!.currentText = canonicalJson(foundation);
  const beforeTokens = canonicalJson(foundation.tokens), beforeAxes = canonicalJson(foundation.themeAxes), beforeProject = canonicalJson(project);
  const applied = planFoundationEdit(project, { kind: "template-apply", ...OPTIONS, accent: "#8DFC52" }, id);
  assert.equal(applied.valid, true, explain(applied));
  const saved = applied.project.documents[foundation.id]!.document as FoundationDocument;
  assert.equal(canonicalJson(saved.tokens), beforeTokens); assert.equal(canonicalJson(saved.themeAxes), beforeAxes);
  assert.equal(canonicalJson(project), beforeProject, "Planning never mutates saved source");
});

test("custom parts nest without cycles, keep order and exposed slots, and duplicate owned identities", () => {
  const { project, id } = fixture(), created = planStudioComponentCreate(project, { catalogId: "catalog.box" }, id), component = created.changes.upserts.find(item => item.document.kind === "component")!.document;
  const root = (component.parts as JsonObject[])[0]!.id as string;
  const added = planStudioComponentEdit(created.project, { componentId: component.id, edit: [{ kind: "part-add", parentId: root, name: "Content", role: "content" }, { kind: "part-add", parentId: root, name: "Caption", role: "caption" }] }, id); assert.equal(added.valid, true, explain(added));
  const parts = added.project.documents[component.id]!.document.parts as JsonObject[], parent = String(parts.find(part => part.studioRole === "content")!.id), child = String(parts.find(part => part.studioRole === "caption")!.id);
  const nested = planStudioComponentEdit(added.project, { componentId: component.id, edit: [{ kind: "part-parent", partId: child, parentId: parent }, { kind: "part-text", partId: child, text: "<Escaped caption>" }, { kind: "slot-add", partId: parent, required: false, multiple: true }] }, id); assert.equal(nested.valid, true, explain(nested));
  const projected = inspectStudioProject(nested.project).components.find(item => item.id === component.id)!;
  assert.equal(projected.parts.find(part => part.id === child)!.parent, parent); assert.deepEqual(projected.web.layout[parent]!.childOrder, [child]);
  assert.equal(planStudioComponentEdit(nested.project, { componentId: component.id, edit: { kind: "part-parent", partId: parent, parentId: child } }, id).valid, false);
  assert.equal(planStudioComponentEdit(nested.project, { componentId: component.id, edit: { kind: "part-delete", partId: parent } }, id).valid, false);
  const copy = planStudioComponentDuplicate(nested.project, { componentId: component.id }, id); assert.equal(copy.valid, true, explain(copy));
  const same = planStudioComponentEdit(nested.project, { componentId: component.id, edit: { kind: "name", name: component.name } }, id); assert.equal(same.valid, true); assert.equal(same.changes.upserts.length, 0);
});

test("motion validates timing and channels, resolves token usage, protects deletion and duplicate references", () => {
  const { project, id } = fixture(true), created = planStudioComponentCreate(project, { catalogId: "catalog.box" }, id), component = created.changes.upserts.find(item => item.document.kind === "component")!.document;
  const root = String((component.parts as JsonObject[])[0]!.id), durationToken = (project.documents["foundation.system"]!.document as FoundationDocument).tokens.find(token => token.name === "motion.duration.normal")!.id;
  const track: Omit<StudioMotionTrack, "id"> = { targetPartRef: root, trigger: "enter", property: "opacity", keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 1 }], timing: { kind: "tween", duration: { tokenRef: durationToken }, easing: [.2, 0, 0, 1] }, delay: { value: 0, unit: "ms" }, interruption: "replace-from-current", reducedAlternative: { kind: "snap", value: 1 } };
  const edited = planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "motion-track-set", track, trackId: null } }, id); assert.equal(edited.valid, true, explain(edited));
  const report = inspectStudioProject(edited.project), motion = report.components.find(item => item.id === component.id)!.motionTracks![0]!;
  assert.equal(motion.durationMs, 200); assert.ok(report.usages[durationToken]!.some(use => use.componentId === component.id));
  assert.ok(inspectFoundationAuthoring(edited.project).references.some(reference => reference.kind === "motion" && reference.tokenId === durationToken));
  assert.equal(planFoundationEdit(edited.project, { kind: "token-delete", id: durationToken }, id).valid, false);
  assert.equal(planStudioComponentEdit(edited.project, { componentId: component.id, edit: { kind: "motion-track-set", track, trackId: null } }, id).valid, false, "duplicate channel");
  for (const invalid of [{ ...track, timing: { kind: "spring", stiffness: "170", damping: 26, mass: 1 } }, { ...track, keyframes: [{ offset: 0, value: 0 }, { offset: 0, value: 1 }] }, { ...track, timing: { kind: "tween", duration: { tokenRef: "token.accent" }, easing: [.2, 0, 0, 1] } }, { ...track, reducedAlternative: null }]) assert.equal(planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "motion-track-set", track: invalid as never, trackId: null } }, id).valid, false);
  const copied = planStudioComponentDuplicate(edited.project, { componentId: component.id }, id); assert.equal(copied.valid, true, explain(copied));
  const duplicate = copied.changes.upserts.find(item => item.document.kind === "component")!.document;
  assert.notEqual((duplicate.motion as JsonObject[])[0]!.targetPartRef, root); assert.equal(((duplicate.motion as JsonObject[])[0]!.timing as JsonObject).duration && canonicalJson(((duplicate.motion as JsonObject[])[0]!.timing as JsonObject).duration!), canonicalJson({ tokenRef: durationToken }));
  const spring = sampleStudioSpring(170, 26, 1); assert.ok(spring.durationMs > 0 && spring.durationMs < 10000); assert.deepEqual(spring.samples.at(-1), { offset: 1, value: 1 }); assert.throws(() => sampleStudioSpring(Infinity, 26, 1));
});

test("typed typography, shadow, gradient and transition generate finite CSS and reject executable values", () => {
  const blueprint = foundationStarterTokens(OPTIONS), literal = (name: string) => blueprint.find(token => token.name === name)!.literal!;
  assert.equal(resolveExtendedStudioStyle("typography", literal("type.scale.body")).fontSize, 16);
  assert.match(String(resolveExtendedStudioStyle("boxShadow", literal("shadow.scale.md")).boxShadow), /4px 16px/);
  assert.match(String(resolveExtendedStudioStyle("backgroundImage", literal("gradient.scale.brand")).backgroundImage), /^linear-gradient/);
  assert.deepEqual(resolveExtendedStudioStyle("transition", literal("transition.scale.standard")), { transitionDuration: "200ms", transitionDelay: "0ms", transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)" });
  assert.throws(() => resolveExtendedStudioStyle("backgroundImage", "url(javascript:alert(1))")); assert.throws(() => resolveExtendedStudioStyle("fontWeight", "600;display:none"));
});
