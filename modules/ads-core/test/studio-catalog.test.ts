import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalJson, CommandService, createStudioStarter, getStudioCatalogRecipe, inspectStudioProject, listStudioCatalog, MemoryStore, planStudioComponentBatch, planStudioComponentCreate, planStudioComponentDelete, planStudioComponentDuplicate, planStudioComponentEdit, PROTOCOL_VERSION, STUDIO_FORMAT, STUDIO_PROFILE, studioComponentPlanPayload } from "../src/index.ts";
import type { AdsDocument, CommandEnvelope, CommandResult, JsonObject, Principal, ProjectSnapshot, StudioComponentPlan } from "../src/index.ts";
import { studioCatalogPresentation, studioCatalogProvenance } from "../src/index.ts";

const OWNER: Principal = { id: "catalog.owner", scopes: ["project.read", "project.write", "review.apply"] };
const digest = (text: string): string => createHash("sha256").update(text).digest("hex");
function fixture() {
  let count = 0; const id = (): string => `catalog.generated.${++count}`;
  const documents = createStudioStarter("project.catalog");
  const project: ProjectSnapshot = { id: "project.catalog", name: "Catalog", revision: "project.initial", documents: Object.fromEntries(documents.map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:initial", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  return { project, id };
}
const errors = (plan: { diagnostics: CommandResult["diagnostics"] }): string => JSON.stringify(plan.diagnostics.filter(item => item.severity === "error").slice(0, 5));
const records = (value: unknown): JsonObject[] => value as JsonObject[];
function added(plan: StudioComponentPlan): AdsDocument { return plan.changes.upserts.find(item => item.document.kind === "component")!.document; }

test("catalog inventory exactly preserves all 239 normalized IDs, types and 330 provider rows", () => {
  const source = JSON.parse(readFileSync(new URL("../../../docs/foundation/annexes/component-catalog.json", import.meta.url), "utf8")) as { entries: { id: string; displayName: string; kind: string; familyIds: string[]; sourceRows: number[]; providerVariants: { provider: string; component: string; sourceRow: number }[] }[] };
  const catalog = listStudioCatalog(); assert.equal(catalog.length, 239);
  assert.deepEqual(catalog, source.entries.map(entry => ({ id: entry.id, name: entry.displayName, kind: entry.kind, familyIds: entry.familyIds, sourceRows: entry.sourceRows, providerVariants: entry.providerVariants.map(variant => ({ provider: variant.provider, name: variant.component, sourceRow: variant.sourceRow })) })));
  assert.equal(catalog.filter(entry => entry.kind === "component").length, 209);
  assert.equal(catalog.flatMap(entry => entry.sourceRows).length, 330);
  assert.equal(new Set(catalog.flatMap(entry => entry.familyIds)).size, 45);
  catalog[0]!.name = "mutated"; assert.notEqual(listStudioCatalog()[0]!.name, "mutated");
});

test("every independent catalog component produces a valid definition and both designs without inserting the entire library", () => {
  const { project, id } = fixture();
  for (const entry of listStudioCatalog()) {
    const plan = planStudioComponentCreate(project, { catalogId: entry.id }, id);
    if (entry.kind !== "component") { assert.equal(plan.valid, false, entry.id); continue; }
    assert.equal(plan.valid, true, `${entry.id}: ${errors(plan)}`);
    assert.equal(plan.changes.upserts.length, 3, entry.id); assert.equal(Object.keys(plan.project.documents).length, 13);
    const component = inspectStudioProject(plan.project).components.find(item => item.id === added(plan).id)!;
    assert.equal(component.archetype, "catalog"); assert.equal(component.catalog?.catalogId, entry.id);
    const presentation = studioCatalogPresentation(entry, component.catalog!.semantic.kind);
    assert.notEqual(presentation.shape, "reference", `${entry.id} needs an explicit visual composition`);
    assert.ok(component.parts.length <= 64);
    for (const authored of presentation.parts) {
      const part = component.parts.find(part => part.role === authored.role)!;
      assert.ok(part, `${entry.id}: authored ${authored.role} exists`);
      assert.equal(component.parts.find(parent => parent.id === part.parent)?.role, authored.parent);
      assert.equal(part.text, authored.text);
      assert.ok(component.web.layout[part.id] && component.mobile.layout[part.id]);
    }
    if (component.catalog!.semantic.contract === "unimplemented") assert.ok(component.parts.length > 2, `${entry.id} must not create generic root/body Card structure`);
  }
  assert.equal(Object.keys(project.documents).length, 10);
});

test("catalog provenance preserves all provider rows with official reference indexes, without claiming upstream execution", () => {
  const urls = new Set(["https://ui.shadcn.com/docs/components", "https://mantine.dev/core/package/", "https://mantine.dev/charts/getting-started/", "https://mantine.dev/dates/getting-started/", "https://mantine.dev/schedule/getting-started/", "https://mantine.dev/x/extensions/", "https://base-ui.com/react/overview/quick-start", "https://react-aria.adobe.com/"]);
  const refs = listStudioCatalog().flatMap(entry => {
    const references = studioCatalogProvenance(entry);
    assert.deepEqual(references.map(({ provider, name, sourceRow }) => ({ provider, name, sourceRow })), entry.providerVariants);
    return references;
  });
  assert.equal(refs.length, 330); assert.ok(refs.every(ref => urls.has(ref.catalogUrl)));
  assert.ok(refs.filter(ref => ref.provider === "React Aria").every(ref => !ref.catalogUrl.endsWith("/Button")));
});

test("new catalog defaults distinguish control and surface boxes and retain editable native properties", () => {
  const { project, id } = fixture();
  const components = Object.fromEntries(["checkbox", "switch", "textinput", "card", "calendar", "tree", "donutchart"].map(name => {
    const plan = planStudioComponentCreate(project, { catalogId: `catalog.${name}` }, id);
    assert.equal(plan.valid, true, errors(plan)); return [name, inspectStudioProject(plan.project).components.find(item => item.id === added(plan).id)!];
  }));
  for (const name of ["checkbox", "switch", "textinput"]) {
    const component = components[name]!, root = component.parts.find(part => part.role === "root")!;
    assert.equal(component.web.parts[root.id]!.base.borderWidth, 0, `${name} must not inherit a Card border`);
    assert.equal(component.web.layout[root.id]!.padding, 0);
  }
  assert.equal(components.checkbox!.web.layout[components.checkbox!.parts[0]!.id]!.axis, "horizontal");
  assert.equal(components.card!.web.layout[components.card!.parts[0]!.id]!.padding, 16);
  assert.ok(components.calendar!.parts.some(part => part.role === "day_15"));
  assert.ok(components.tree!.parts.some(part => part.role === "branch"));
  assert.ok(components.donutchart!.parts.some(part => part.role === "series"));
  assert.equal(Object.keys(project.documents).length, 10, "Looking up and constructing plans never edits the original project");
});

test("semantic descriptors preserve input, selection, popup and specialized-domain boundaries", () => {
  assert.equal(getStudioCatalogRecipe("catalog.checkbox")!.semantic.kind, "checkbox");
  assert.equal(getStudioCatalogRecipe("catalog.switch")!.semantic.kind, "switch");
  assert.equal(getStudioCatalogRecipe("catalog.radiogroup")!.semantic.selection, "single");
  assert.equal(getStudioCatalogRecipe("catalog.checkboxgroup")!.semantic.selection, "multiple");
  const number = getStudioCatalogRecipe("catalog.numberfield")!; assert.ok(number.values.some(value => value.name === "draft")); assert.ok(number.values.some(value => value.name === "value"));
  const combo = getStudioCatalogRecipe("catalog.combobox")!; assert.ok(combo.values.some(value => value.name === "query")); assert.ok(combo.values.some(value => value.name === "selectedKey"));
  assert.equal(getStudioCatalogRecipe("catalog.tooltip")!.semantic.role, "tooltip"); assert.equal(getStudioCatalogRecipe("catalog.hovercard")!.semantic.role, "dialog");
  for (const id of ["catalog.areachart", "catalog.richtexteditor", "catalog.datepicker", "catalog.copybutton"]) assert.equal(getStudioCatalogRecipe(id)!.semantic.contract, "unimplemented", id);
});

test("selected-object edits retain IDs and validate part structure, size, accessibility, typed defaults and motion together", () => {
  const { project, id } = fixture(), created = planStudioComponentCreate(project, { catalogId: "catalog.checkbox" }, id), component = added(created);
  const root = records(component.parts)[0]!, checked = records((component.publicContract as JsonObject).values).find(value => value.name === "checked")!;
  const edit = planStudioComponentEdit(created.project, { componentId: component.id, edit: [
    { kind: "name", name: "Consent" }, { kind: "part-name", partId: String(root.id), name: "Consent group" },
    { kind: "part-add", parentId: String(root.id), name: "Help", role: "help" },
    { kind: "layout", category: "Web", partId: String(root.id), field: "width", value: { mode: "fixed", value: 320 } },
    { kind: "layout", category: "Mobile", partId: String(root.id), field: "alignment", value: "center" },
    { kind: "accessibility", field: "label", value: "Accept terms" }, { kind: "accessibility", field: "description", value: "Required before continuing" },
    { kind: "value-default", valueId: String(checked.id), value: true }, { kind: "motion", field: "durationMs", value: 220 }, { kind: "motion", field: "easing", value: "linear" },
    { kind: "frame", category: "Web", frame: { x: 500, y: -20, width: 360, height: 220 } },
  ] }, id);
  assert.equal(edit.valid, true, errors(edit)); assert.equal(edit.changes.upserts.length, 3);
  const result = inspectStudioProject(edit.project).components.find(item => item.id === component.id)!;
  assert.equal(result.name, "Consent"); assert.equal(result.catalog!.accessibility.label, "Accept terms");
  assert.deepEqual(result.web.layout[String(root.id)]!.width, { mode: "fixed", value: 320 }); assert.equal(result.mobile.layout[String(root.id)]!.alignment, "center");
  assert.equal(result.web.editorFrame!.x, 500); assert.equal(result.motion.easing, "linear");
  const help = records(edit.project.documents[component.id]!.document.parts).find(part => part.studioRole === "help")!;
  const removed = planStudioComponentEdit(edit.project, { componentId: component.id, edit: { kind: "part-delete", partId: String(help.id) } }, id);
  assert.equal(removed.valid, true, errors(removed));
  const invalid = planStudioComponentEdit(edit.project, { componentId: component.id, edit: [{ kind: "name", name: "Must not leak" }, { kind: "value-default", valueId: String(checked.id), value: "true" }] }, id);
  assert.equal(invalid.valid, false); assert.equal(invalid.changes.upserts.length, 0); assert.equal(invalid.project.documents[component.id]!.document.name, "Consent");
  assert.equal(planStudioComponentEdit(edit.project, { componentId: component.id, edit: { kind: "part-delete", partId: String(root.id) } }, id).valid, false);
});

test("collection keys, numeric ranges, safe URLs and fixed size reject invalid defaults", () => {
  for (const [catalogId, valueName, badValue] of [["catalog.select", "selectedKey", "missing"], ["catalog.slider", "value", 101], ["catalog.rangeslider", "value", [80, 20]], ["catalog.link", "href", "javascript:alert(1)"]] as const) {
    const { project, id } = fixture(), created = planStudioComponentCreate(project, { catalogId }, id), component = added(created), value = records((component.publicContract as JsonObject).values).find(value => value.name === valueName)!;
    const plan = planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "value-default", valueId: String(value.id), value: structuredClone(badValue) as never } }, id);
    assert.equal(plan.valid, false, catalogId);
  }
});

test("duplicate remaps owned references and preserves opaque data and sample text resembling old identities", () => {
  const { project, id } = fixture(), original = project.documents["component.button"]!.document;
  original.metadata = { opaque: { id: original.id, parent: "component.button.root" } }; (original.previewContent as JsonObject).body = original.id;
  const duplicate = planStudioComponentDuplicate(project, { componentId: original.id }, id);
  assert.equal(duplicate.valid, true, errors(duplicate)); const copy = added(duplicate);
  assert.notEqual(copy.id, original.id); assert.deepEqual(copy.metadata, original.metadata); assert.equal((copy.previewContent as JsonObject).body, original.id);
  assert.ok(records(copy.parts).every(part => !records(original.parts).some(old => part.id === old.id)));
  assert.equal(duplicate.changes.upserts.length, 3);
  const removed = planStudioComponentDelete(duplicate.project, { componentId: copy.id });
  assert.equal(removed.valid, true, errors(removed)); assert.equal(removed.changes.deletes.length, 3); assert.equal(removed.changes.upserts.length, 0);
});

test("multi-component frame changes are one all-or-nothing plan and builtin obligations remain strict", () => {
  const { project, id } = fixture();
  const plan = planStudioComponentBatch(project, { edits: [
    { componentId: "component.button", edit: { kind: "frame", category: "Web", frame: { x: 40, y: 60, width: 260 } } },
    { componentId: "component.card", edit: { kind: "frame", category: "Web", frame: { x: 400, y: 60, width: 360 } } },
  ] }, id);
  assert.equal(plan.valid, true, errors(plan)); assert.equal(plan.changes.upserts.length, 2);
  const bad = planStudioComponentBatch(project, { edits: [{ componentId: "component.button", edit: { kind: "name", name: "Changed" } }, { componentId: "missing", edit: { kind: "name", name: "Missing" } }] }, id);
  assert.equal(bad.valid, false); assert.equal(bad.project.documents["component.button"]!.document.name, "Button");
  assert.equal(planStudioComponentEdit(project, { componentId: "component.button", edit: { kind: "part-add", parentId: "component.button.root", name: "Invalid", role: "extra" } }, id).valid, false);
});

async function kernel() {
  const f = fixture(), store = new MemoryStore(), service = new CommandService(store, { createId: f.id, digest });
  const current = async (): Promise<ProjectSnapshot> => (await service.getProject(OWNER))!;
  const envelope = async (operation: string, payload: JsonObject): Promise<CommandEnvelope> => ({ protocolVersion: PROTOCOL_VERSION, commandId: f.id(), actorId: OWNER.id, projectId: f.project.id, baseRevision: (await service.getProject(OWNER))?.revision ?? null, operation, payload, idempotencyKey: f.id(), transactionId: f.id(), origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] });
  const execute = async (operation: string, payload: JsonObject) => service.execute(await envelope(operation, payload), OWNER);
  const adopt = async (candidate: CommandResult) => { assert.equal(candidate.status, "reviewRequired", errors(candidate)); const approved = await execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" }); assert.equal(approved.status, "accepted", errors(approved)); const result = await execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: (await current()).revision }); assert.equal(result.status, "accepted", errors(result)); return result; };
  await execute("project.create", { name: f.project.name });
  await adopt(await execute("document.import", { formatProfile: STUDIO_FORMAT, importMode: "review", sourceRefs: Object.values(f.project.documents).map(entry => ({ uri: entry.sourceUri, content: entry.originalText })) }));
  return { ...f, store, service, current, envelope, execute, adopt };
}

test("atomic source change create/update/delete is reviewed once, replays exactly and restarts through Undo/redo", async () => {
  const h = await kernel(), before = await h.current(), created = planStudioComponentCreate(before, { catalogId: "catalog.checkbox" }, h.id);
  const request = await h.envelope("document.import", studioComponentPlanPayload(created)); request.baseRevision = created.baseRevision;
  const candidate = await h.service.execute(request, OWNER); assert.equal(candidate.status, "reviewRequired", errors(candidate)); assert.deepEqual((await h.current()).documents, before.documents);
  const applied = await h.adopt(candidate), after = await h.current(); assert.equal(Object.keys(after.documents).length, 13);
  assert.deepEqual(await h.service.execute(request, OWNER), candidate);
  const service = new CommandService(h.store, { createId: h.id, digest }); assert.deepEqual((await service.getProject(OWNER))!.documents, after.documents);
  const undo = await h.execute("transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: after.revision }); assert.equal(undo.status, "accepted", errors(undo)); assert.deepEqual((await h.current()).documents, before.documents);
  const redo = await h.execute("transaction.redo", { redoHandle: undo.redoHandle!, expectedRevision: (await h.current()).revision }); assert.equal(redo.status, "accepted", errors(redo)); assert.deepEqual((await h.current()).documents, after.documents);
  const component = added(created), removed = planStudioComponentDelete(await h.current(), { componentId: component.id });
  const rename = planStudioComponentEdit(removed.project, { componentId: "component.card", edit: { kind: "name", name: "Retained card" } }, h.id);
  rename.changes.deletes = removed.changes.deletes;
  await h.adopt(await h.execute("document.import", studioComponentPlanPayload(rename)));
  assert.equal(Object.keys((await h.current()).documents).length, 10); assert.equal((await h.current()).documents["component.card"]!.document.name, "Retained card");
});

test("mixed source transactions reject stale revisions and late invalid records without publishing any candidate", async () => {
  const h = await kernel(), before = await h.current(), created = planStudioComponentCreate(before, { catalogId: "catalog.checkbox" }, h.id), payload = studioComponentPlanPayload(created);
  (payload.sourceRefs as JsonObject[]).push({ uri: "memory:bad", content: "{" });
  const candidates = (await h.store.read())!.candidates.length;
  assert.equal((await h.execute("document.import", payload)).status, "rejected");
  assert.equal((await h.store.read())!.candidates.length, candidates); assert.deepEqual((await h.current()).documents, before.documents);
  const deleted = planStudioComponentDelete(before, { componentId: "component.button" }); deleted.changes.deletes[0]!.revision = "stale.source";
  assert.equal((await h.execute("document.import", studioComponentPlanPayload(deleted))).status, "conflict"); assert.deepEqual((await h.current()).documents, before.documents);
  const collision = studioComponentPlanPayload(created); (collision.deleteRefs as JsonObject[]).push({ id: created.changes.upserts[0]!.document.id, expectedKind: "component", revision: "missing" });
  assert.equal((await h.execute("document.import", collision)).status, "rejected");
});

test("public planning snapshots descriptor input and rejects invalid IDs, accessors and extra edit fields", () => {
  const { project, id } = fixture(); let reads = 0;
  const options = Object.defineProperty({}, "catalogId", { enumerable: true, get() { reads++; return "catalog.checkbox"; } });
  assert.equal(planStudioComponentCreate(project, options as never, id).valid, false); assert.equal(reads, 0);
  assert.equal(planStudioComponentCreate(project, { catalogId: "catalog.checkbox" }, () => "component.button").valid, false);
  assert.equal(planStudioComponentEdit(project, { componentId: "component.button", edit: { kind: "name", name: "Not applied", extra: true } as never }, id).valid, false);
  assert.equal(planStudioComponentCreate(project, null as never, id).valid, false);
});
