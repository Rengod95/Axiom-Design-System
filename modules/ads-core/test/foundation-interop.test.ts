import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, importDtcgFoundation, exportFoundationDtcg, exportSelectedFoundationDtcg, inspectFoundationDocument, resolveFoundationTokens, resolveDtcgResolver, planFoundationEdit, inspectFoundationAuthoring, inspectStudioProject } from "../src/index.ts";
import type { FoundationAuthoringEdit, JsonObject, FoundationTokenValue } from "../src/index.ts";
import { foundation, token } from "./foundation-fixtures.ts";
import { authoringFixture, source, brief } from "./foundation-authoring-fixtures.ts";

const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const imported = (data: unknown) => { let i = 0; return importDtcgFoundation(typeof data === "string" ? data : JSON.stringify(data), { id: "foundation.import", name: "Import", revision: "r1", sourceUri: "memory:tokens", createId: () => `token.import.${++i}`, digest }); };
const referenceSource = () => ({ space: { $type: "dimension", base: { $value: { value: 8, unit: "px" } }, semantic: { $value: "{space.base}" } }, amount: { $type: "number", $value: { $ref: "#/space/base/$value/value" } }, font: { $type: "typography", $value: { fontFamily: "SUIT", fontSize: "{space.base}", fontWeight: 450, letterSpacing: { value: 0, unit: "px" }, lineHeight: 1.5 } } });

test("group and type inheritance, explicit root, deprecation and metadata normalize without losing the original", () => {
  const data = { base: { $type: "number", $deprecated: "Use next", $description: "Scale", $extensions: { vendor: { future: true } }, $root: { $value: 1 }, one: { $value: 2 } }, next: { $extends: "{base}", $deprecated: false, one: { $value: 3 } }, alias: { $value: "{base.$root}" } };
  const report = imported(data); assert.equal(report.valid, true, brief(report));
  const tokens = report.document!.tokens;
  assert.equal(tokens.find(item => item.name === "next.one")!.deprecated, false);
  assert.equal(tokens.find(item => item.name === "base.one")!.deprecated, "Use next");
  assert.equal(resolveFoundationTokens(report.document).tokens.find(item => item.name === "alias")!.value, 1);
  const exported = exportFoundationDtcg(report.document); assert.equal(exported.valid, true, brief(exported));
  assert.deepEqual(JSON.parse(exported.text!).base.$extensions, data.base.$extensions);
  assert.equal(JSON.parse(exported.text!).next.one.$value, 3);
  assert.deepEqual(JSON.parse(exportFoundationDtcg(report.document, "original").text!), data);
});

test("group inheritance rejects cycles, invalid roots and token/group path collisions", () => {
  for (const data of [ { a: { $extends: "{b}" }, b: { $extends: "{a}" } }, { a: { nested: { $extends: "{a}" } } }, { a: { $root: {} } }, { a: { $value: 1, $type: "number" }, b: { $extends: "{a}" } }, { a: { $unknown: true } }, { a: { $value: 1, $type: "number" }, alias: { $value: "{missing}" } } ]) assert.equal(imported(data).valid, false, JSON.stringify(data));
  const doc = foundation([token("token.a"), token("token.b")]); (doc.tokens as JsonObject[])[0]!.name = "a"; (doc.tokens as JsonObject[])[1]!.name = "a.b";
  assert.equal(exportFoundationDtcg(doc).valid, false);
});

test("property and composite references stay live across source edits and selected contexts", () => {
  const report = imported(referenceSource()); assert.equal(report.valid, true, brief(report)); const doc = report.document!;
  const base = doc.tokens.find(item => item.name === "space.base")!;
  assert.ok("composite" in doc.tokens.find(item => item.name === "font")!.value);
  base.value = { literal: { value: 20, unit: "px" } };
  doc.themeAxes = [{ id: "axis.size", contexts: ["normal", "large"], default: "normal", scope: { id: doc.id, expectedKind: "foundation" }, overrides: { large: { [base.id]: { literal: { value: 32, unit: "px" } } } } }]; doc.resolutionOrder = ["axis.size"];
  for (const [context, expected] of [["normal", 20], ["large", 32]] as const) {
    const result = resolveFoundationTokens(doc, { contexts: { "axis.size": context } }); assert.equal(result.valid, true, brief(result));
    assert.equal(result.tokens.find(item => item.name === "amount")!.value, expected);
    assert.equal(canonicalJson((result.tokens.find(item => item.name === "font")!.value as JsonObject).fontSize!), canonicalJson({ value: expected, unit: "px" }));
    assert.ok(result.tokens.find(item => item.name === "font")!.aliasChain.includes(base.id));
  }
});

test("partial reference and composite failures reject every context without fallback literals", () => {
  for (const replacement of [{ $ref: "#/space/base/$value/missing" }, { $ref: "#/space/base/$value/unit" }, { $ref: "#/space/base/$description" }, { $ref: "https://invalid.test/token" }, { $ref: "#/space/base/$value/value", ignored: true }]) {
    const data = referenceSource(); data.amount.$value = replacement as typeof data.amount.$value; assert.equal(imported(data).valid, false, JSON.stringify(replacement));
  }
  const doc = imported(referenceSource()).document!, base = doc.tokens.find(item => item.name === "space.base")!, amount = doc.tokens.find(item => item.name === "amount")!;
  base.value = { composite: { value: { ref: { id: amount.id, expectedKind: "token" } }, unit: "px" } };
  assert.equal(inspectFoundationDocument(doc).valid, false);
});

test("JSON pointer escaping and renamed stable aliases round trip", () => {
  const report = imported({ "a/b~ c": { $type: "dimension", $value: { value: 5, unit: "px" } }, n: { $type: "number", $value: { $ref: "#/a~1b~0%20c/$value/value" } } });
  assert.equal(report.valid, true, brief(report)); report.document!.tokens[0]!.name = "new.base";
  const output = exportFoundationDtcg(report.document); assert.equal(output.valid, true, brief(output));
  assert.equal(JSON.parse(output.text!).n.$value.$ref, "#/new/base/$value/value");
  assert.equal(imported(output.text!).valid, true);
});

test("selected-context export distinguishes live references from resolved values and retains lifecycle", () => {
  const doc = imported(referenceSource()).document!; doc.tokens[0]!.deprecated = "Use spacing.next";
  doc.domains = [{ id: "domain.space", name: "Spacing" }]; doc.tokens[0]!.domain = "domain.space";
  const linked = exportSelectedFoundationDtcg(doc), resolved = exportSelectedFoundationDtcg(doc, {}, "resolved");
  assert.equal(linked.valid, true, brief(linked)); assert.equal(resolved.valid, true);
  assert.equal(JSON.parse(linked.text!).space.semantic.$value, "{space.base}");
  assert.deepEqual(JSON.parse(resolved.text!).space.semantic.$value, { value: 8, unit: "px" });
  assert.equal(JSON.parse(linked.text!).space.base.$deprecated, "Use spacing.next");
  assert.ok(linked.diagnostics.some(item => item.severity === "warning")); assert.equal(imported(linked.text!).valid, true);
  assert.equal(exportFoundationDtcg(doc).valid, false);
});

test("import updates existing identities, rebinds new aliases, reports retained ids and is atomic", () => {
  const h = authoringFixture(), before = canonicalJson(h.project);
  const edit: FoundationAuthoringEdit = { kind: "dtcg-import", sourceText: JSON.stringify(referenceSource()), sourceName: "tokens.json", conflicts: "keep", prefix: "imported" };
  const run = (project = h.project, operation = edit) => planFoundationEdit(project, operation, h.createId, {}, digest);
  let plan = run(); assert.equal(plan.valid, true, brief(plan)); assert.equal(plan.createdIds.length, 4); assert.equal(canonicalJson(h.project), before);
  const base = source(plan.project).tokens.find(item => item.name === "imported.space.base")!;
  const again = run(plan.project); assert.equal(again.valid, true, brief(again)); assert.equal(again.updates.length, 0); assert.deepEqual(again.createdIds, []);
  const data = referenceSource(); data.space.base.$value.value = 18;
  plan = run(plan.project, { ...edit, conflicts: "update", sourceText: JSON.stringify(data) }); assert.equal(plan.valid, true, brief(plan));
  assert.equal(source(plan.project).tokens.find(item => item.name === base.name)!.id, base.id);
  assert.equal(inspectFoundationAuthoring(plan.project).tokens.find(item => item.name === "imported.amount")!.resolvedValue, 18);
  const failed = run(plan.project, { ...edit, conflicts: "reject" }); assert.equal(failed.valid, false); assert.deepEqual(failed.updates, []); assert.equal(canonicalJson(failed.project), canonicalJson(plan.project));
  assert.equal(planFoundationEdit(h.project, edit, h.createId).valid, false);
});

test("expression usage blocks deletion, explicit replacement rewrites composite and property edges", () => {
  const h = authoringFixture(true), data = referenceSource();
  let plan = planFoundationEdit(h.project, { kind: "dtcg-import", sourceText: JSON.stringify(data), sourceName: "tokens.json", conflicts: "keep" }, h.createId, {}, digest);
  assert.equal(plan.valid, true, brief(plan)); const base = source(plan.project).tokens.find(item => item.name === "space.base")!;
  assert.equal(h.plan(plan.project, { kind: "token-delete", id: base.id }).valid, false);
  const duplicated = h.plan(plan.project, { kind: "token-duplicate", id: base.id, name: "space.replacement" });
  plan = h.plan(duplicated.project, { kind: "token-delete", id: base.id, replacementId: duplicated.createdIds[0]! }); assert.equal(plan.valid, true, brief(plan));
  assert.ok(!canonicalJson(source(plan.project).tokens).includes(`"${base.id}"`));
  const amount = source(plan.project).tokens.find(item => item.name === "amount")!;
  plan = h.plan(plan.project, { kind: "token-update", id: amount.id, deprecated: "Use the replacement" }); assert.equal(plan.valid, true);
  assert.equal(source(plan.project).tokens.find(item => item.id === amount.id)!.deprecated, "Use the replacement");
  assert.deepEqual(source(plan.project).tokens.find(item => item.id === amount.id)!.value, amount.value);
});

test("component layout and affected-use review follow a live composite property edge", () => {
  const h = authoringFixture(true);
  let plan = planFoundationEdit(h.project, { kind: "dtcg-import", sourceText: JSON.stringify(referenceSource()), sourceName: "tokens.json", conflicts: "keep" }, h.createId, {}, digest);
  const base = source(plan.project).tokens.find(item => item.name === "space.base")!;
  plan = h.plan(plan.project, { kind: "token-expression", id: "token.gap", value: { composite: { value: { ref: { id: base.id, expectedKind: "token", path: "/value" } }, unit: "px" } } });
  assert.equal(plan.valid, true, brief(plan));
  plan = h.plan(plan.project, { kind: "token-literal", id: base.id, value: { value: 26, unit: "px" } });
  assert.equal(plan.valid, true, brief(plan)); assert.ok(plan.impact.some(use => use.componentId === "component.button"));
  const projection = inspectStudioProject(plan.project); assert.equal(projection.valid, true, brief(projection));
  assert.equal(projection.components.find(item => item.id === "component.button")!.web.layout["component.button.root"]!.gap, 26);
});

const resolverSource = () => ({ version: "2025.10", sets: { base: { sources: [{ $ref: "base.json" }] } }, modifiers: { scheme: { default: "light", contexts: { light: [], dark: [{ base: { $type: "number", $value: 9 } }] } } }, resolutionOrder: [{ $ref: "#/sets/base" }, { $ref: "#/modifiers/scheme" }] });
const sourceFiles = { "base.json": JSON.stringify({ base: { $type: "number", $value: 2 }, semantic: { $type: "number", $value: "{base}" } }) };

test("Resolver applies explicit later-wins source order and resolves aliases after the selected merge", () => {
  for (const [inputs, expected] of [[{}, 2], [{ scheme: "dark" }, 9]] as const) {
    const report = resolveDtcgResolver(JSON.stringify(resolverSource()), inputs, sourceFiles); assert.equal(report.valid, true, brief(report));
    const tokens = imported(report.tokenText!); assert.equal(tokens.valid, true, brief(tokens));
    assert.equal(resolveFoundationTokens(tokens.document).tokens.find(item => item.name === "semantic")!.value, expected);
    assert.equal(report.order.length, 2);
  }
});

test("Resolver rejects missing, invalid, unknown and case-mismatched inputs", () => {
  const source = resolverSource(); delete (source.modifiers.scheme as { default?: string }).default;
  for (const inputs of [{}, { scheme: "nope" }, { Scheme: "dark" }, { scheme: "dark", other: "value" }]) assert.equal(resolveDtcgResolver(JSON.stringify(source), inputs, sourceFiles).valid, false);
  assert.equal(resolveDtcgResolver(JSON.stringify(source), { scheme: "dark" }, sourceFiles).valid, true);
});

test("Resolver refuses unsupplied and remote resources, illegal modifier references, cycles and duplicate steps", () => {
  const cases = [resolverSource(), { version: "2025.10", resolutionOrder: [{ type: "set", name: "x", sources: [{ $ref: "https://example.com/a.json" }] }] }, { version: "2025.10", sets: { a: { sources: [{ $ref: "#/sets/a" }] } }, resolutionOrder: [{ $ref: "#/sets/a" }] }, { ...resolverSource(), resolutionOrder: [{ $ref: "#/resolutionOrder/0" }] }, { ...resolverSource(), resolutionOrder: [{ $ref: "#/sets/base" }, { $ref: "#/sets/base" }] }, { ...resolverSource(), sets: { base: { sources: [{ $ref: "#/modifiers/scheme/contexts/light" }] } } }];
  cases.forEach((data, index) => assert.equal(resolveDtcgResolver(JSON.stringify(data), {}, index === 0 ? {} : sourceFiles).valid, false, JSON.stringify(data)));
});

test("inline Resolver definitions validate inactive contexts and replace token records atomically", () => {
  const data = { version: "2025.10", resolutionOrder: [{ type: "set", name: "base", sources: [{ number: { $type: "number", $value: 2, $description: "old" } }, { number: { $type: "number", $value: 3 } }] }, { type: "modifier", name: "size", default: "normal", contexts: { normal: [], large: [{ $ref: "missing.json" }] } }] };
  assert.equal(resolveDtcgResolver(JSON.stringify(data)).valid, false);
  const result = resolveDtcgResolver(JSON.stringify(data), {}, { "missing.json": "{}" }); assert.equal(result.valid, true, brief(result));
  assert.deepEqual(JSON.parse(result.tokenText!).number, { $type: "number", $value: 3 });
});

test("Resolver import retains exact definition and supplied sources beside the adopted permutation", () => {
  const h = authoringFixture(), text = JSON.stringify(resolverSource(), null, 2);
  const plan = planFoundationEdit(h.project, { kind: "dtcg-import", format: "resolver", sourceText: text, sourceName: "resolver.json", sources: sourceFiles, inputs: { scheme: "dark" }, conflicts: "keep", prefix: "resolver" }, h.createId, {}, digest);
  assert.equal(plan.valid, true, brief(plan)); const doc = source(plan.project), saved = doc.originalSources.at(-1) as JsonObject;
  assert.equal((saved.resolver as JsonObject).sourceText, text); assert.deepEqual((saved.resolver as JsonObject).sources, sourceFiles);
  assert.equal(resolveFoundationTokens(doc).tokens.find(item => item.name === "resolver.semantic")!.value, 9);
  const other = JSON.stringify({ ...resolverSource(), description: "Another authored source, same output" });
  const again = planFoundationEdit(plan.project, { kind: "dtcg-import", format: "resolver", sourceText: other, sourceName: "resolver.json", sources: sourceFiles, inputs: { scheme: "dark" }, conflicts: "keep", prefix: "resolver" }, h.createId, {}, digest);
  assert.equal(again.valid, true, brief(again));
  assert.equal(source(again.project).originalSources.length, doc.originalSources.length + 1);
  assert.equal((source(again.project).originalSources.at(-1) as JsonObject).originalText, saved.originalText);
});

test("malicious expressions and group expansion fail within the shared work budget", () => {
  const doc = imported(referenceSource()).document!;
  for (const value of [{ ref: null }, { ref: { id: "missing", expectedKind: "token" } }, { composite: { ref: { id: doc.tokens[0]!.id, expectedKind: "token", path: "/__proto__" } } }]) {
    const copy = structuredClone(doc); copy.tokens[0]!.value = value as unknown as FoundationTokenValue; assert.equal(inspectFoundationDocument(copy).valid, false);
  }
  const data: JsonObject = { g0: { n: { $type: "number", $value: 1 } } };
  for (let i = 1; i < 18; i++) data[`g${i}`] = { a: { $extends: `{g${i - 1}}` }, b: { $extends: `{g${i - 1}}` } };
  assert.equal(imported(data).valid, false);
});
