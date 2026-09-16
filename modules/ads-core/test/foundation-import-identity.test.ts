import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, createStudioStarter, planFoundationEdit, resolveFoundationTokens } from "../src/index.ts";
import { previewFoundationImportSource } from "../src/foundation-import-preview.ts";
import type { FoundationAuthoringEdit, FoundationDocument, JsonObject, ProjectSnapshot } from "../src/index.ts";
import { authoringFixture, source, brief } from "./foundation-authoring-fixtures.ts";

type ImportEdit = Extract<FoundationAuthoringEdit, { kind: "dtcg-import" }>;
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const sourceText = (value = 1) => JSON.stringify({ external: { base: { $type: "number", $value: value, $description: "source description", $extensions: { retained: { custom: true } } }, alias: { $type: "number", $value: "{external.base}" } } });
const importEdit = (extra: Partial<ImportEdit> = {}): ImportEdit => ({ kind: "dtcg-import", sourceName: "tokens.json", sourceText: sourceText(), conflicts: "keep", ...extra });

test("same-source reimport preserves a renamed token ID, display name, aliases and local metadata", () => {
  const h = authoringFixture(), initial = planFoundationEdit(h.project, importEdit(), h.createId, {}, digest);
  assert.equal(initial.valid, true, brief(initial));
  const base = source(initial.project).tokens.find(token => token.name === "external.base")!;
  const firstOriginal = canonicalJson(source(initial.project).originalSources[0]!);
  const renamed = h.plan(initial.project, { kind: "token-update", id: base.id, name: "renamed.local.value" });
  const edited = source(renamed.project).tokens.find(token => token.id === base.id)!;
  edited.metadata = { localNote: "Do not replace local metadata" };
  const reimported = planFoundationEdit(renamed.project, importEdit({ sourceText: sourceText(7), conflicts: "update" }), h.createId, {}, digest);
  assert.equal(reimported.valid, true, brief(reimported)); assert.deepEqual(reimported.createdIds, []);
  const after = source(reimported.project).tokens.find(token => token.id === base.id)!;
  assert.equal(after.name, "renamed.local.value"); assert.equal(canonicalJson(after.value), canonicalJson({ literal: 7 })); assert.equal(canonicalJson(after.metadata!), canonicalJson(edited.metadata!));
  assert.equal(canonicalJson(source(reimported.project).originalSources[0]!), firstOriginal);
  assert.equal(resolveFoundationTokens(source(reimported.project)).tokens.find(token => token.name === "external.alias")!.value, 7);
  const mapping = (source(reimported.project).originalSources.at(-1) as JsonObject).sourceIdentity as JsonObject;
  assert.equal((mapping.tokenIds as JsonObject)["/external/base"], base.id);
});

test("unrelated same-name sources cannot merge through any conflict policy and a prefix creates independent identities", () => {
  const h = authoringFixture(), initial = planFoundationEdit(h.project, importEdit(), h.createId, {}, digest);
  for (const conflicts of ["keep", "update", "reject"] as const) {
    const rejected = planFoundationEdit(initial.project, importEdit({ sourceName: "unrelated.json", sourceText: sourceText(9), conflicts }), h.createId, {}, digest);
    assert.equal(rejected.valid, false); assert.equal(canonicalJson(rejected.project), canonicalJson(initial.project)); assert.deepEqual(rejected.updates, []);
    assert.ok(rejected.diagnostics.some(item => /matching name is not identity/.test(item.message)), brief(rejected));
  }
  const copied = planFoundationEdit(initial.project, importEdit({ sourceName: "unrelated.json", prefix: "copy", sourceText: sourceText(9), conflicts: "update" }), h.createId, {}, digest);
  assert.equal(copied.valid, true, brief(copied)); assert.equal(copied.createdIds.length, 2);
  assert.notEqual(source(copied.project).tokens.find(token => token.name === "copy.external.base")!.id, source(initial.project).tokens.find(token => token.name === "external.base")!.id);
});

test("keep/reject retain their same-source conflict meanings and type changes remain atomic", () => {
  const h = authoringFixture(), initial = planFoundationEdit(h.project, importEdit(), h.createId, {}, digest);
  const kept = planFoundationEdit(initial.project, importEdit({ sourceText: sourceText(8), conflicts: "keep" }), h.createId, {}, digest);
  assert.equal(kept.valid, true, brief(kept)); assert.equal(canonicalJson(source(kept.project).tokens), canonicalJson(source(initial.project).tokens));
  const rejected = planFoundationEdit(initial.project, importEdit({ conflicts: "reject" }), h.createId, {}, digest);
  assert.equal(rejected.valid, false); assert.equal(canonicalJson(rejected.project), canonicalJson(initial.project));
  const differentType = JSON.stringify({ external: { base: { $type: "dimension", $value: { value: 1, unit: "rem" } } } });
  for (const conflicts of ["keep", "update"] as const) {
    const plan = planFoundationEdit(initial.project, importEdit({ sourceText: differentType, conflicts }), h.createId, {}, digest);
    assert.equal(plan.valid, false); assert.equal(canonicalJson(plan.project), canonicalJson(initial.project));
  }
});

test("deleted identities, ambiguous source mappings and damaged captures are never silently rematched", () => {
  const h = authoringFixture(), text = JSON.stringify({ standalone: { $type: "number", $value: 1 } });
  const initial = planFoundationEdit(h.project, importEdit({ sourceText: text }), h.createId, {}, digest);
  const id = source(initial.project).tokens.find(token => token.name === "standalone")!.id;
  const deleted = h.plan(initial.project, { kind: "token-delete", id }); assert.equal(deleted.valid, true, brief(deleted));
  const reimported = planFoundationEdit(deleted.project, importEdit({ sourceText: text, conflicts: "update" }), h.createId, {}, digest);
  assert.equal(reimported.valid, false); assert.ok(reimported.diagnostics.some(item => /was removed/.test(item.message)));
  const broken = structuredClone(initial.project), capture = source(broken).originalSources[0] as JsonObject; capture.digest = "0".repeat(64);
  const corrupted = planFoundationEdit(broken, importEdit({ sourceText: text, conflicts: "update" }), h.createId, {}, digest);
  assert.equal(corrupted.valid, false); assert.ok(corrupted.diagnostics.some(item => /recorded digest/.test(item.message)));
  const ambiguous = structuredClone(initial.project), original = source(ambiguous).originalSources[0] as JsonObject;
  const duplicate = structuredClone(original), identity = duplicate.sourceIdentity as JsonObject;
  (identity.tokenIds as JsonObject)["/standalone"] = "different.stable.id";
  source(ambiguous).originalSources.push(duplicate);
  const conflicted = planFoundationEdit(ambiguous, importEdit({ sourceText: text, conflicts: "update" }), h.createId, {}, digest);
  assert.equal(conflicted.valid, false); assert.ok(conflicted.diagnostics.some(item => /mapping is ambiguous/.test(item.message)), brief(conflicted));
  delete capture.sourceIdentity; capture.digest = digest(text);
  const unmapped = planFoundationEdit(broken, importEdit({ sourceText: text, conflicts: "update" }), h.createId, {}, digest);
  assert.equal(unmapped.valid, false); assert.ok(unmapped.diagnostics.some(item => /no stable path-to-token mapping/.test(item.message)));
});

test("a newly appearing source path cannot steal a locally renamed token with the same display name", () => {
  const h = authoringFixture(), initial = planFoundationEdit(h.project, importEdit(), h.createId, {}, digest);
  const base = source(initial.project).tokens.find(token => token.name === "external.base")!;
  const renamed = h.plan(initial.project, { kind: "token-update", id: base.id, name: "external.other" });
  const incoming = JSON.parse(sourceText()); incoming.external.other = { $type: "number", $value: 9 };
  const rejected = planFoundationEdit(renamed.project, importEdit({ sourceText: JSON.stringify(incoming), conflicts: "update" }), h.createId, {}, digest);
  assert.equal(rejected.valid, false); assert.equal(canonicalJson(rejected.project), canonicalJson(renamed.project));
});

test("guided imports require explicit source-path mappings and preserve classifications on subsequent updates", () => {
  const h = authoringFixture(), document = createStudioStarter(h.project.id, { domains: ["color"] }).find(item => item.kind === "foundation") as FoundationDocument;
  const project: ProjectSnapshot = structuredClone(h.project); project.documents[document.id]!.document = document;
  const domain = (document.domains as JsonObject[]).find(item => item.bindingCategory === "opacity")!.id as string;
  const tier = (document.tiers as JsonObject[]).find(item => item.role === "semantic")!.id as string;
  const edit = importEdit({ sourceText: JSON.stringify({ "a/b~ c": { $type: "number", $value: 0.5 } }) });
  const parsed = previewFoundationImportSource(edit, h.createId, digest);
  assert.equal(parsed.valid, true); assert.deepEqual(parsed.tokens, [{ path: "/a~1b~0 c", name: "a/b~ c", type: "number" }]);
  const missing = planFoundationEdit(project, edit, h.createId, {}, digest); assert.equal(missing.valid, false);
  const mappings = { "/a~1b~0 c": { domain, tier, role: "opacity.level" } };
  const applied = planFoundationEdit(project, { ...edit, mappings }, h.createId, {}, digest);
  assert.equal(applied.valid, true, brief(applied));
  const imported = source(applied.project).tokens.find(token => token.name === "a/b~ c")!;
  assert.equal(imported.role, "opacity.level"); assert.equal(imported.domain, domain); assert.equal(imported.tier, tier);
  const again = planFoundationEdit(applied.project, { ...edit, conflicts: "update" }, h.createId, {}, digest);
  assert.equal(again.valid, true, brief(again)); assert.equal(canonicalJson(source(again.project).tokens.find(token => token.id === imported.id)!), canonicalJson(imported));
  const primitive = (document.tiers as JsonObject[]).find(item => item.role === "primitive")!.id as string;
  const reclassified = planFoundationEdit(applied.project, { ...edit, conflicts: "update", mappings: { "/a~1b~0 c": { domain, role: "opacity.level", tier: primitive } } }, h.createId, {}, digest);
  assert.equal(reclassified.valid, false); assert.ok(reclassified.diagnostics.some(item => /preserves the classification/.test(item.message)));
  const outOfRange = planFoundationEdit(applied.project, { ...edit, conflicts: "update", sourceText: JSON.stringify({ "a/b~ c": { $type: "number", $value: 2 } }) }, h.createId, {}, digest);
  assert.equal(outOfRange.valid, false); assert.equal(canonicalJson(outOfRange.project), canonicalJson(applied.project));
  for (const mapping of [{ domain, role: "layer.order" }, { domain, role: "color.palette" }, { domain: "missing", role: "opacity.level" }, { domain, role: "opacity.level", tier: "missing" }]) {
    const wrong = planFoundationEdit(project, { ...edit, mappings: { "/a~1b~0 c": mapping } }, h.createId, {}, digest);
    assert.equal(wrong.valid, false); assert.equal(canonicalJson(wrong.project), canonicalJson(project));
  }
});

test("Resolver source identity survives renamed output labels and changes of the selected permutation", () => {
  const h = authoringFixture(), definition = JSON.stringify({ version: "2025.10", sets: { base: { sources: [{ $ref: "base.json" }] } }, modifiers: { scheme: { default: "light", contexts: { light: [], dark: [{ base: { $type: "number", $value: 9 } }] } } }, resolutionOrder: [{ $ref: "#/sets/base" }, { $ref: "#/modifiers/scheme" }] }, null, 2);
  const files = { "base.json": '{"base":{"$type":"number","$value":2},"alias":{"$type":"number","$value":"{base}"}}' };
  const edit = importEdit({ format: "resolver", sourceName: "theme.resolver.json", sourceText: definition, sources: files, prefix: "imported" });
  const initial = planFoundationEdit(h.project, edit, h.createId, {}, digest);
  assert.equal(initial.valid, true, brief(initial));
  const base = source(initial.project).tokens.find(token => token.name === "imported.base")!;
  const renamed = h.plan(initial.project, { kind: "token-update", id: base.id, name: "renamed.base" });
  const updated = planFoundationEdit(renamed.project, { ...edit, conflicts: "update", inputs: { scheme: "dark" } }, h.createId, {}, digest);
  assert.equal(updated.valid, true, brief(updated)); assert.deepEqual(updated.createdIds, []);
  assert.equal(source(updated.project).tokens.find(token => token.id === base.id)!.name, "renamed.base");
  assert.equal(resolveFoundationTokens(source(updated.project)).tokens.find(token => token.name === "imported.alias")!.value, 9);
  const saved = source(updated.project).originalSources.at(-1) as JsonObject, resolver = saved.resolver as JsonObject;
  assert.equal(resolver.sourceText, definition); assert.equal(canonicalJson(resolver.sources!), canonicalJson(files));
  assert.equal(((saved.sourceIdentity as JsonObject).tokenIds as JsonObject)["/base"], base.id);
});

test("invalid partial sources retain exact text in source preview and never partially adopt executable tokens", () => {
  const h = authoringFixture(), text = '{\n "good":{"$type":"number","$value":1}, "bad":{"$type":"dimension","$value":{"value":2,"unit":"em"}}\n}';
  const edit = importEdit({ sourceText: text }), preview = previewFoundationImportSource(edit, h.createId, digest);
  assert.equal(preview.valid, false); assert.equal(preview.originalText, text); assert.deepEqual(preview.tokens, []); assert.ok(preview.diagnostics.some(item => item.severity === "error"));
  const plan = planFoundationEdit(h.project, edit, h.createId, {}, digest);
  assert.equal(plan.valid, false); assert.equal(canonicalJson(plan.project), canonicalJson(h.project)); assert.deepEqual(plan.updates, []);
});
