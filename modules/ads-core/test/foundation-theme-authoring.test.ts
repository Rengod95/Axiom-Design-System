import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, inspectFoundationAuthoring, inspectFoundationDocument, resolveFoundationTokens } from "../src/index.ts";
import { authoringFixture, brief, reviseFixture, source } from "./foundation-authoring-fixtures.ts";

test("axis creation fills named sets and explicit order; rename/delete preserves context selections consistently", () => {
  const h = authoringFixture();
  let plan = h.plan(h.project, { kind: "theme-axis-create", name: "Density", description: "Content spacing", contexts: ["normal", "compact"], default: "normal" });
  assert.equal(plan.valid, true, brief(plan)); const axisId = plan.createdIds[0]!;
  assert.equal(source(plan.project).resolutionOrder.at(-1), axisId);
  assert.ok(source(plan.project).themeSets.every(theme => theme.contexts[axisId] === "normal"));
  plan = h.plan(plan.project, { kind: "theme-override-set", axisId, context: "compact", id: "token.gap", value: { literal: { value: 6, unit: "px" } } });
  assert.equal(plan.valid, true, brief(plan));
  plan = h.plan(plan.project, { kind: "theme-set-create", name: "Compact dark", description: "A named complete combination", contexts: { "axis.scheme": "dark", [axisId]: "compact" } });
  assert.equal(plan.valid, true, brief(plan)); const themeId = plan.createdIds[0]!;
  assert.equal(canonicalJson(resolveFoundationTokens(source(plan.project), { themeSetId: themeId }).tokens.find(token => token.id === "token.gap")!.value), canonicalJson({ value: 6, unit: "px" }));
  plan = h.plan(plan.project, { kind: "theme-context-rename", axisId, context: "compact", name: "dense" }, { themeSetId: themeId, contexts: { [axisId]: "compact" } });
  assert.equal(plan.valid, true, brief(plan)); assert.equal(plan.selection.contexts![axisId], "dense");
  assert.equal(source(plan.project).themeSets.find(theme => theme.id === themeId)!.contexts[axisId], "dense");
  assert.ok(source(plan.project).themeAxes.find(axis => axis.id === axisId)!.overrides!.dense);
  const protectedDelete = h.plan(plan.project, { kind: "theme-context-delete", axisId, context: "dense" });
  assert.equal(protectedDelete.valid, false); assert.deepEqual(protectedDelete.updates, []);
  plan = h.plan(plan.project, { kind: "theme-context-delete", axisId, context: "dense", replacement: "normal" }, plan.selection);
  assert.equal(plan.valid, true, brief(plan)); assert.equal(plan.selection.contexts![axisId], "normal");
  plan = h.plan(plan.project, { kind: "theme-axis-delete", id: axisId }, plan.selection);
  assert.equal(plan.valid, true, brief(plan)); assert.ok(source(plan.project).themeSets.every(theme => !Object.hasOwn(theme.contexts, axisId))); assert.equal(Object.hasOwn(plan.selection.contexts!, axisId), false);
});

test("theme display metadata/default/set/order/override edits remain curated and preserve original source", () => {
  const h = authoringFixture(), original = h.project.documents[source(h.project).id]!.originalText;
  let plan = h.plan(h.project, [
    { kind: "theme-axis-update", id: "axis.scheme", name: "Appearance", description: "Brightness", default: "dark" },
    { kind: "theme-set-update", id: "theme.light", name: "Reading", description: "A complete light choice", contexts: { "axis.scheme": "light" } },
  ]);
  assert.equal(plan.valid, true, brief(plan)); assert.equal(inspectFoundationAuthoring(plan.project).axes[0]!.name, "Appearance");
  assert.equal(resolveFoundationTokens(source(plan.project)).contexts["axis.scheme"], "dark");
  plan = h.plan(plan.project, { kind: "theme-override-remove", axisId: "axis.scheme", context: "dark", id: "token.accent" });
  assert.equal(plan.valid, true, brief(plan)); assert.equal(Object.hasOwn(source(plan.project).themeAxes[0]!.overrides!.dark!, "token.accent"), false);
  plan = h.plan(plan.project, { kind: "theme-set-delete", id: "theme.light" }, { themeSetId: "theme.light" });
  assert.equal(plan.valid, true, brief(plan)); assert.equal(plan.selection.themeSetId, "theme.dark");
  const badOrder = h.plan(plan.project, { kind: "theme-order", axisIds: [] }); assert.equal(badOrder.valid, false); assert.deepEqual(badOrder.updates, []);
  assert.equal(plan.project.documents[source(plan.project).id]!.originalText, original);
  assert.equal(h.plan(plan.project, { kind: "theme-set-create", name: "Incomplete", contexts: {} }).valid, false);
  assert.equal(h.plan(plan.project, { kind: "theme-axis-update", id: "axis.scheme", default: "missing" }).valid, false);
});

test("context copying handles prototype-named maps as data without replacing object prototypes", () => {
  const h = authoringFixture();
  let plan = h.plan(h.project, { kind: "theme-context-add", axisId: "axis.scheme", name: "__proto__", copyFrom: "dark" });
  assert.equal(plan.valid, true, brief(plan));
  const overrides = source(plan.project).themeAxes[0]!.overrides!;
  assert.equal(Object.hasOwn(overrides, "__proto__"), true); assert.equal(Object.getPrototypeOf(overrides), Object.prototype);
  assert.deepEqual(overrides["__proto__"], overrides.dark);
  plan = h.plan(plan.project, { kind: "theme-override-set", axisId: "axis.scheme", context: "__proto__", id: "token.gap", value: { literal: { value: 9, unit: "px" } } });
  assert.equal(plan.valid, true, brief(plan));
  assert.equal(canonicalJson(resolveFoundationTokens(source(plan.project), { contexts: { "axis.scheme": "__proto__" } }).tokens.find(token => token.id === "token.gap")!.value), canonicalJson({ value: 9, unit: "px" }));
  plan = h.plan(plan.project, { kind: "theme-context-delete", axisId: "axis.scheme", context: "__proto__" });
  assert.equal(plan.valid, true, brief(plan)); assert.equal(Object.hasOwn(source(plan.project).themeAxes[0]!.overrides!, "__proto__"), false);
});

test("mutually exclusive contextual aliases are valid, but an unnamed cross-axis cycle rejects the whole batch", () => {
  const h = authoringFixture();
  let plan = h.plan(h.project, [{ kind: "token-create", name: "a", type: "number", value: { literal: 1 } }, { kind: "token-create", name: "b", type: "number", value: { literal: 2 } }]);
  const [a, b] = plan.createdIds;
  plan = h.plan(plan.project, [{ kind: "theme-override-set", axisId: "axis.scheme", context: "light", id: a!, value: { ref: { id: b!, expectedKind: "token" } } }, { kind: "theme-override-set", axisId: "axis.scheme", context: "dark", id: b!, value: { ref: { id: a!, expectedKind: "token" } } }]);
  assert.equal(plan.valid, true, brief(plan));
  const withAxis = h.plan(plan.project, { kind: "theme-axis-create", name: "Brand", contexts: ["base", "alternate"], default: "base" });
  assert.equal(withAxis.valid, true, brief(withAxis));
  const before = canonicalJson(withAxis.project);
  const cycle = h.plan(withAxis.project, { kind: "theme-override-set", axisId: withAxis.createdIds[0]!, context: "alternate", id: b!, value: { ref: { id: a!, expectedKind: "token" } } });
  assert.equal(cycle.valid, false); assert.ok(cycle.diagnostics.some(item => item.code === "FOUNDATION_ALIAS_CYCLE"));
  assert.deepEqual(cycle.updates, []); assert.equal(canonicalJson(withAxis.project), before);
});

test("context product limit gives exact diagnostics and preserves legacy data for a bounded axis-removal repair", () => {
  const h = authoringFixture(), document = source(h.project);
  for (let index = 1; index < 8; index++) {
    const id = `axis.extra.${index}`;
    document.themeAxes.push({ id, contexts: ["a", "b"], default: "a", scope: { id: document.id, expectedKind: "foundation" } });
    document.resolutionOrder.push(id); for (const theme of document.themeSets) theme.contexts[id] = "a";
  }
  reviseFixture(h.project, document); const before = canonicalJson(h.project);
  const report = inspectFoundationDocument(document);
  assert.equal(report.valid, false); assert.ok(report.diagnostics.some(item => item.code === "FOUNDATION_LIMIT" && item.path === "/themeAxes" && item.message.includes("256") && item.message.includes("128")));
  const shown = inspectFoundationAuthoring(h.project); assert.equal(shown.valid, false); assert.equal(shown.axes.length, 8); assert.ok(shown.tokens.length > 0); assert.ok(shown.tokens.every(token => token.resolvedValue === undefined));
  const repair = h.plan(h.project, { kind: "theme-axis-delete", id: "axis.extra.7" });
  assert.equal(repair.valid, true, brief(repair)); assert.equal(inspectFoundationDocument(source(repair.project)).valid, true);
  assert.equal(canonicalJson(h.project), before); assert.equal(repair.project.documents[document.id]!.originalText, h.project.documents[document.id]!.originalText);
  const beyond = h.plan(repair.project, { kind: "theme-axis-create", name: "Too many", contexts: ["x", "y"], default: "x" });
  assert.equal(beyond.valid, false); assert.deepEqual(beyond.updates, []);
});

test("self-owned source revision pins advance with the Foundation edit without repinning external owners", () => {
  const h = authoringFixture(), document = source(h.project);
  document.themeAxes[0]!.scope.revision = document.revision; reviseFixture(h.project, document);
  const changed = h.plan(h.project, { kind: "token-update", id: "token.accent", description: "A description" });
  assert.equal(changed.valid, true, brief(changed)); assert.equal(source(changed.project).themeAxes[0]!.scope.revision, source(changed.project).revision);
});
