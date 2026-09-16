import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, createStudioStarter, isStudioTokenCompatible, planStudioComponentEdit, resolveFoundationTokens, resolveStudioMotion } from "../src/index.ts";
import type { Diagnostic, FoundationDocument, FoundationToken, JsonObject, ProjectSnapshot } from "../src/index.ts";

function fixture() {
  const project: ProjectSnapshot = { id: "project.roles", name: "Roles", revision: "initial", documents: Object.fromEntries(createStudioStarter("project.roles").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:roles", validation: "envelope-only", validationProfile: "foundation-studio", diagnostics: [] }])) };
  const foundation = project.documents["foundation.system"]!.document as FoundationDocument;
  foundation.domains.push({ id: "domain.type", name: "Typography", allowedTypes: ["dimension"], bindingCategory: "typography" }, { id: "domain.motion", name: "Motion", allowedTypes: ["duration"], bindingCategory: "motion" });
  const add = (id: string, role: string, value: number, unit: string): FoundationToken => {
    const token: FoundationToken = { id, name: id, domain: role.startsWith("motion.") ? "domain.motion" : "domain.type", role, typeRef: { id: role.startsWith("motion.") ? "duration" : "dimension" }, value: { literal: { value, unit } } };
    foundation.tokens.push(token); return token;
  };
  add("token.tracking", "typography.tracking", -.025, "rem");
  add("token.duration", "motion.duration", 200, "ms");
  add("token.delay", "motion.delay", -50, "ms");
  add("token.reduced", "motion.reduced", 0, "ms");
  return { project, foundation };
}

test("explicit roles distinguish same-type siblings without guessing legacy token semantics", () => {
  const { foundation } = fixture(), resolution = resolveFoundationTokens(foundation);
  assert.equal(resolution.valid, true, canonicalJson(resolution.diagnostics));
  const tracking = resolution.tokens.find(token => token.id === "token.tracking")!;
  assert.equal(tracking.role, "typography.tracking");
  assert.equal(isStudioTokenCompatible(tracking, "fontSize"), false);
  assert.equal(isStudioTokenCompatible(tracking, "letterSpacing"), true);
  assert.equal(isStudioTokenCompatible({ type: "dimension", bindingCategory: "typography" }, "fontSize"), true);
  assert.equal(isStudioTokenCompatible({ ...tracking, role: "unknown.role" }, "letterSpacing"), false);
  assert.equal(isStudioTokenCompatible({ ...tracking, role: "typography.family" }, "letterSpacing"), false);
  assert.equal(isStudioTokenCompatible({ type: "dimension", bindingCategory: "spacing", role: "spacing.margin" }, "gap"), false);
  for (const token of resolution.tokens.filter(token => token.type === "duration")) {
    assert.equal(isStudioTokenCompatible(token, "motionDuration"), token.role !== "motion.delay", token.name);
    assert.equal(isStudioTokenCompatible(token, "transitionDuration"), token.role !== "motion.delay", token.name);
    assert.equal(isStudioTokenCompatible(token, "motionDelay"), true, token.name);
  }
});

test("authoritative component edits reject wrong explicit roles atomically and retain signed tracking", () => {
  const { project } = fixture(), before = canonicalJson(project);
  const edit = (property: "fontSize" | "letterSpacing") => planStudioComponentEdit(project, { componentId: "component.button", edit: { kind: "appearance", category: "Web", partId: "component.button.root", property, value: { tokenRef: "token.tracking" } } }, () => "revision.roles");
  const rejected = edit("fontSize");
  assert.equal(rejected.valid, false); assert.deepEqual(rejected.changes.upserts, []);
  assert.ok(rejected.diagnostics.some(item => item.code === "STUDIO_TOKEN_BINDING" && item.message.includes("typography.tracking")));
  const accepted = edit("letterSpacing");
  assert.equal(accepted.valid, true, canonicalJson(accepted.diagnostics));
  assert.equal(canonicalJson(project), before);
});

test("motion duration and delay share only allowed roles and validate the final signed value", () => {
  const { foundation } = fixture(), resolution = resolveFoundationTokens(foundation);
  const document: JsonObject = { id: "component.motion", motion: [{ id: "track.enter", targetPartRef: "part.root", trigger: "enter", property: "opacity", keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 1 }], timing: { kind: "tween", duration: { tokenRef: "token.duration" }, easing: [.2, 0, 0, 1] }, delay: { tokenRef: "token.delay" }, interruption: "replace-from-current", reducedAlternative: { kind: "snap", value: 1 } }] };
  const evaluate = () => { const diagnostics: Diagnostic[] = []; return { tracks: resolveStudioMotion(document, resolution, diagnostics), diagnostics }; };
  assert.deepEqual(evaluate().diagnostics, []); assert.equal(evaluate().tracks[0]!.delayMs, -50);
  const track = (document.motion as JsonObject[])[0]!, timing = track.timing as JsonObject;
  timing.duration = { tokenRef: "token.delay" };
  assert.ok(evaluate().diagnostics.some(item => item.code === "STUDIO_TOKEN_BINDING"));
  timing.duration = { tokenRef: "token.reduced" }; track.delay = { tokenRef: "token.duration" };
  assert.equal(evaluate().tracks[0]!.durationMs, 0); assert.equal(evaluate().tracks[0]!.delayMs, 200);
  resolution.tokens.find(token => token.id === "token.duration")!.value = { value: -1, unit: "ms" };
  timing.duration = { tokenRef: "token.duration" };
  assert.ok(evaluate().diagnostics.some(item => item.code === "STUDIO_MOTION_INVALID"));
  timing.duration = { value: 0, unit: "ms" }; track.delay = { value: -11, unit: "s" };
  assert.ok(evaluate().diagnostics.some(item => item.code === "STUDIO_MOTION_INVALID"));
});
