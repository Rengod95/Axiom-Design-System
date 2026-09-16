import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, CommandService, MemoryStore, PROTOCOL_VERSION, STUDIO_FORMAT, createStudioStarter, inspectStudioProject, inspectStudioCompositionGraph, planStudioComponentCreate, planStudioComponentEdit, planStudioComponentDelete, planStudioComponentDuplicate, planStudioInstanceEdit, studioReferenceForCatalog, STUDIO_PROFILE } from "../src/index.ts";
import type { CommandResult, JsonObject, Principal, ProjectSnapshot, StudioComponentPlan, StudioInstance } from "../src/index.ts";

const valid = (plan: StudioComponentPlan) => { assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics)); return plan.project; };
function fixture() {
  let index = 0; const id = () => `composition.${++index}`;
  let project: ProjectSnapshot = { id: "composition.project", name: "Composition", revision: "revision.base", documents: Object.fromEntries(createStudioStarter("composition.project").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:test", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  const add = (catalogId: string, name: string) => { const plan = planStudioComponentCreate(project, { catalogId, name }, id); project = valid(plan); return plan.changes.upserts.find(item => item.document.kind === "component")!.document.id; };
  const owner = add("catalog.box", "Frame"), child = add("catalog.button", "Action");
  const projected = () => inspectStudioProject(project).components.find(component => component.id === owner)!;
  return { get project() { return project; }, set project(next) { project = next; }, owner, child, projected, id };
}
test("instances store pinned references and individual values without duplicating definitions", () => {
  const f = fixture(), before = canonicalJson(f.project), root = f.projected().parts.find(part => part.parent === null)!;
  const plan = planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: f.child }, f.id);
  f.project = valid(plan); assert.equal(plan.changes.upserts.length, 1); assert.equal(canonicalJson(f.project.documents[f.child]), JSON.parse(before).documents[f.child] && canonicalJson(JSON.parse(before).documents[f.child]));
  const instance = f.projected().instances![0]!; assert.equal(instance.status, "current"); assert.equal(instance.componentRef.id, f.child); assert.deepEqual(instance.values, {});
  const port = inspectStudioProject(f.project).components.find(component => component.id === f.child)!.catalog!.values.find(port => port.name === "disabled")!;
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "value", instanceId: instance.id, valueId: String(port.id), value: true, reset: false }, f.id));
  assert.equal(f.projected().instances![0]!.values[String(port.id)], true);
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "value", instanceId: instance.id, valueId: String(port.id), value: null, reset: true }, f.id));
  assert.deepEqual(f.projected().instances![0]!.values, {});
});

test("original template instances preserve their baseline and reject unmapped value and content overrides", () => {
  for (const catalogId of ["catalog.checkbox", "catalog.card"]) {
    const f = fixture(), template = studioReferenceForCatalog(catalogId)!;
    const created = planStudioComponentCreate(f.project, { catalogId, referenceTemplateId: template.id }, f.id);
    f.project = valid(created);
    const child = created.changes.upserts.find(entry => entry.document.kind === "component")!.document;
    const childBefore = canonicalJson(f.project.documents[child.id]), ownerRoot = f.projected().parts.find(part => part.parent === null)!;
    f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: ownerRoot.id, slotRef: null, sourceComponentId: child.id }, f.id));
    const instance = f.projected().instances![0]!;
    assert.deepEqual(instance.values, {}); assert.deepEqual(instance.slotContents, {});
    assert.equal(canonicalJson(f.project.documents[child.id]), childBefore);
    assert.equal(inspectStudioProject(f.project).valid, true, "Original runtime supplies its own required content");
    const port = (child.publicContract as JsonObject).values as JsonObject[];
    const checkedPort = port.find(value => value.name === "checked");
    const before = canonicalJson(f.project);
    for (const edit of [
      ...(checkedPort ? [{ kind: "value" as const, instanceId: instance.id, valueId: String(checkedPort.id), value: true, reset: false }] : []),
      { kind: "content" as const, instanceId: instance.id, slotId: String((child.slots as JsonObject[])[0]?.id ?? "slot.unmapped"), text: "Replacement" },
    ]) {
      const rejected = planStudioInstanceEdit(f.project, f.owner, edit, f.id);
      assert.equal(rejected.valid, false); assert.deepEqual(rejected.changes.upserts, []);
      assert.equal(canonicalJson(rejected.project), before); assert.equal(canonicalJson(f.project), before);
      assert.ok(rejected.diagnostics.some(item => item.message.includes("provider-specific mapping")));
    }
    const childRoot = (child.parts as JsonObject[]).find(part => part.parent === null)!;
    const unsupportedOwner = planStudioInstanceEdit(f.project, child.id, { kind: "insert", ownerPartRef: String(childRoot.id), slotRef: null, sourceComponentId: f.child }, f.id);
    assert.equal(unsupportedOwner.valid, false, "Original React anatomy cannot silently ignore authored instance children");
  }
});

test("raw current and stale instance documents cannot bypass original-template override restrictions", () => {
  const f = fixture(), template = studioReferenceForCatalog("catalog.checkbox")!;
  const created = planStudioComponentCreate(f.project, { catalogId: template.catalogId, referenceTemplateId: template.id }, f.id);
  f.project = valid(created);
  const child = created.changes.upserts.find(entry => entry.document.kind === "component")!.document;
  const ownerRoot = f.projected().parts.find(part => part.parent === null)!;
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: ownerRoot.id, slotRef: null, sourceComponentId: child.id }, f.id));
  const valueId = String(((child.publicContract as JsonObject).values as JsonObject[]).find(value => value.name === "checked")!.id);
  for (const stale of [false, true]) for (const field of ["values", "slotContents"] as const) {
    const imported = structuredClone(f.project), instance = ((imported.documents[f.owner]!.document.studioComposition as JsonObject).instances as JsonObject[])[0]!;
    instance[field] = field === "values" ? { [valueId]: true } : { "slot.unmapped": "Replacement" };
    if (stale) (instance.componentRef as JsonObject).revision = "revision.previous";
    const diagnostic = inspectStudioCompositionGraph(imported.documents, imported.id).find(item => item.sourceRef === f.owner && item.path?.endsWith(`/${field}`) && item.message.includes("provider-specific mapping"));
    assert.equal(diagnostic?.severity, "error", `${field}: ${stale ? "stale" : "current"} references retain the same override boundary`);
  }
});
test("self/nested cycles, text destinations and incompatible prop values reject atomically", () => {
  const f = fixture(), root = f.projected().parts.find(part => part.parent === null)!;
  const self = planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: f.owner }, f.id);
  assert.equal(self.valid, false); assert.deepEqual(self.changes.upserts, []);
  f.project = valid(planStudioComponentEdit(f.project, { componentId: f.owner, edit: { kind: "element-add", parentId: root.id, element: "text" } }, f.id));
  const text = f.projected().parts.find(part => part.text === "Text")!;
  assert.equal(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: text.id, slotRef: null, sourceComponentId: f.child }, f.id).valid, false);
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: f.child }, f.id));
  const instance = f.projected().instances![0]!, port = inspectStudioProject(f.project).components.find(component => component.id === f.child)!.catalog!.values.find(port => port.name === "disabled")!;
  assert.equal(planStudioInstanceEdit(f.project, f.owner, { kind: "value", instanceId: instance.id, valueId: String(port.id), value: "yes", reset: false }, f.id).valid, false);
});
test("source edits preserve instance pins and require explicit refresh", () => {
  const f = fixture(), root = f.projected().parts.find(part => part.parent === null)!;
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: f.child }, f.id));
  const instance = f.projected().instances![0]!;
  f.project = valid(planStudioComponentEdit(f.project, { componentId: f.child, edit: { kind: "name", name: "Changed action" } }, f.id));
  assert.equal(f.projected().instances![0]!.status, "stale"); assert.equal(f.projected().instances![0]!.componentRef.revision, instance.componentRef.revision);
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "refresh", instanceId: instance.id }, f.id));
  assert.equal(f.projected().instances![0]!.status, "current");
});
test("free frame elements preserve positions, both categories, text and duplicate identities", () => {
  const f = fixture(), root = f.projected().parts.find(part => part.parent === null)!;
  for (const element of ["frame", "box", "text"] as const) f.project = valid(planStudioComponentEdit(f.project, { componentId: f.owner, edit: { kind: "element-add", parentId: root.id, element } }, f.id));
  const text = f.projected().parts.find(part => part.text === "Text")!;
  f.project = valid(planStudioComponentEdit(f.project, { componentId: f.owner, edit: [{ kind: "layout", category: "Web", partId: root.id, field: "mode", value: "free" }, { kind: "layout", category: "Web", partId: text.id, field: "position", value: { x: -8, y: 42 } }] }, f.id));
  assert.deepEqual(f.projected().web.layout[text.id]!.position, { x: -8, y: 42 });
  assert.equal(f.projected().web.elements![text.id], "p"); assert.equal(f.projected().mobile.elements![text.id], "p");
  assert.equal(planStudioComponentEdit(f.project, { componentId: f.owner, edit: { kind: "layout", category: "Web", partId: text.id, field: "position", value: { x: "8", y: 0 } } }, f.id).valid, false);
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: f.child }, f.id));
  const old = f.projected().instances![0]!, duplicate = planStudioComponentDuplicate(f.project, { componentId: f.owner }, f.id); valid(duplicate);
  const copy = inspectStudioProject(duplicate.project).components.find(component => component.name === "Frame copy")!;
  assert.notEqual(copy.instances![0]!.id, old.id); assert.notEqual(copy.instances![0]!.ownerPartRef, old.ownerPartRef); assert.deepEqual(copy.instances![0]!.componentRef, old.componentRef);
});

test("nested element insertion keeps authored reading order identical to depth-first rendered structure", () => {
  const f = fixture(), root = f.projected().parts.find(part => part.parent === null)!;
  for (const element of ["frame", "box"] as const) f.project = valid(planStudioComponentEdit(f.project, { componentId: f.owner, edit: { kind: "element-add", parentId: root.id, element } }, f.id));
  const frame = f.projected().parts.find(part => part.role === "frame1")!, box = f.projected().parts.find(part => part.role === "box1")!;
  f.project = valid(planStudioComponentEdit(f.project, { componentId: f.owner, edit: { kind: "element-add", parentId: frame.id, element: "text" } }, f.id));
  const projected = f.projected(), text = projected.parts.find(part => part.role === "text1")!;
  assert.ok(projected.parts.findIndex(part => part.id === text.id) < projected.parts.findIndex(part => part.id === box.id), "A nested child's source order precedes the following sibling frame");
  for (const design of [projected.web, projected.mobile]) {
    const expected: string[] = [], visit = (id: string) => { expected.push(id); for (const child of design.layout[id]!.childOrder) visit(child); }; visit(root.id);
    assert.deepEqual((f.project.documents[f.owner]!.document.accessibility as JsonObject).readingOrder, expected);
  }
});

test("malformed composition pins produce source diagnostics without throwing from the graph inspector", () => {
  const f = fixture(), component = f.project.documents[f.owner]!.document;
  for (const value of [null, {}, { id: "instance.bad", componentRef: null }, { id: "instance.bad", componentRef: { id: f.child }, designRefs: { Web: null } }]) {
    component.studioComposition = { version: "1.0.0", instances: [value] };
    assert.doesNotThrow(() => inspectStudioCompositionGraph(f.project.documents, f.project.id));
    assert.ok(inspectStudioCompositionGraph(f.project.documents, f.project.id).some(item => item.severity === "error" && item.path?.includes("studioComposition")));
    assert.equal(inspectStudioProject(f.project).valid, false);
  }
});

test("instance identity cannot collide with project, Foundation token or design appearance identities", () => {
  const f = fixture(), root = f.projected().parts.find(part => part.parent === null)!;
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: f.child }, f.id));
  const foundation = Object.values(f.project.documents).find(entry => entry.document.kind === "foundation")!.document;
  const design = Object.values(f.project.documents).find(entry => entry.document.kind === "design")!.document;
  const ids = [f.project.id, String((foundation.tokens as JsonObject[])[0]!.id), String((design.appearance as JsonObject[])[0]!.id)];
  for (const id of ids) {
    const source = structuredClone(f.project);
    ((source.documents[f.owner]!.document.studioComposition as JsonObject).instances as JsonObject[])[0]!.id = id;
    assert.ok(inspectStudioCompositionGraph(source.documents, source.id).some(item => item.message.includes("unique across the project")), id);
  }
});

test("existing incompatible source profiles reject insertion while live instances protect their source from deletion", () => {
  const f = fixture(), root = f.projected().parts.find(part => part.parent === null)!;
  const builtin = Object.values(f.project.documents).find(entry => entry.document.kind === "component" && !entry.document.catalogProfile)!.document;
  assert.equal(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: builtin.id }, f.id).valid, false);
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: f.child }, f.id));
  const before = canonicalJson(f.project), blocked = planStudioComponentDelete(f.project, { componentId: f.child });
  assert.equal(blocked.valid, false); assert.deepEqual(blocked.changes, { upserts: [], deletes: [] }); assert.equal(canonicalJson(f.project), before);
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "remove", instanceId: f.projected().instances![0]!.id }, f.id));
  assert.equal(planStudioComponentDelete(f.project, { componentId: f.child }).valid, true);
});

test("shared nested definitions obey a total expansion budget even when depth and source counts are small", () => {
  const f = fixture(), added = planStudioComponentCreate(f.project, { catalogId: "catalog.box", name: "Repeated group" }, f.id);
  f.project = valid(added); const middle = added.changes.upserts.find(item => item.document.kind === "component")!.document;
  const pins = (componentId: string) => { const source = f.project.documents[componentId]!.document, designs = Object.values(f.project.documents).filter(entry => entry.document.kind === "design" && (entry.document.componentRef as JsonObject).id === componentId).map(entry => entry.document); return { componentRef: { id: source.id, revision: source.revision }, designRefs: { Web: { id: designs.find(design => design.category === "Web")!.id, revision: designs.find(design => design.category === "Web")!.revision }, Mobile: { id: designs.find(design => design.category === "Mobile")!.id, revision: designs.find(design => design.category === "Mobile")!.revision } } }; };
  const instances = (owner: string, source: string, count: number): StudioInstance[] => Array.from({ length: count }, () => ({ id: f.id(), ownerPartRef: String((f.project.documents[owner]!.document.parts as JsonObject[]).find(part => part.parent === null)!.id), slotRef: null, ...pins(source), values: {}, slotContents: {} }));
  middle.studioComposition = { version: "1.0.0", instances: instances(middle.id, f.child, 32) } as unknown as JsonObject;
  f.project.documents[middle.id]!.document = middle;
  f.project.documents[f.owner]!.document.studioComposition = { version: "1.0.0", instances: instances(f.owner, middle.id, 32) } as unknown as JsonObject;
  const diagnostics = inspectStudioCompositionGraph(f.project.documents, f.project.id);
  assert.ok(diagnostics.some(item => item.message.includes("1024-instance runtime budget")));
  assert.ok(!diagnostics.some(item => item.message.includes("eight levels")), "Three levels can still exceed total execution capacity");
  (f.project.documents[f.owner]!.document.studioComposition as JsonObject).instances = instances(f.owner, middle.id, 30) as unknown as JsonObject[];
  assert.ok(!inspectStudioCompositionGraph(f.project.documents, f.project.id).some(item => item.message.includes("runtime budget")));
});

async function kernelFixture(project: ProjectSnapshot) {
  const principal: Principal = { id: "composition.owner", scopes: ["project.read", "project.write", "review.apply"] }, store = new MemoryStore();
  let serial = 0; const id = () => `composition.kernel.${++serial}`;
  const service = new CommandService(store, { createId: id, digest: text => createHash("sha256").update(text).digest("hex") });
  const execute = async (operation: string, payload: JsonObject) => {
    const commandId = id();
    return service.execute({ protocolVersion: PROTOCOL_VERSION, commandId, actorId: principal.id, projectId: project.id, baseRevision: (await service.getProject(principal))?.revision ?? null, operation, payload, idempotencyKey: commandId, transactionId: commandId, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] }, principal);
  };
  const adopt = async (candidate: CommandResult) => {
    assert.equal(candidate.status, "reviewRequired", JSON.stringify(candidate.diagnostics));
    const approval = await execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
    assert.equal(approval.status, "accepted");
    const applied = await execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approval.reviewToken!, expectedRevision: (await service.getProject(principal))!.revision });
    assert.equal(applied.status, "accepted", JSON.stringify(applied.diagnostics));
    return applied;
  };
  assert.equal((await execute("project.create", { name: project.name })).status, "accepted");
  await adopt(await execute("document.import", { sourceRefs: Object.values(project.documents).map(entry => ({ uri: entry.sourceUri, content: canonicalJson(entry.document) })), formatProfile: STUDIO_FORMAT, importMode: "review" }));
  return { store, service, principal, execute, adopt };
}

test("raw document deletion cannot orphan retained instances, but removing source and owners together is atomic", async () => {
  const f = fixture(), root = f.projected().parts.find(part => part.parent === null)!;
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: f.child }, f.id));
  const instance = f.projected().instances![0]!, h = await kernelFixture(f.project), before = await h.store.read();
  const sourceIds = [instance.componentRef.id, instance.designRefs.Web.id, instance.designRefs.Mobile.id];
  for (const sourceId of sourceIds) {
    const blocked = await h.execute("entity.delete", { refs: [{ id: sourceId, expectedKind: f.project.documents[sourceId]!.document.kind }] });
    assert.equal(blocked.status, "rejected"); assert.equal(blocked.diagnostics[0]?.code, "REFERENCE_MISSING");
    assert.equal(blocked.diagnostics[0]?.sourceRef, f.owner); assert.match(blocked.diagnostics[0]!.message, /retained component instance/);
    assert.deepEqual(await h.store.read(), before, "A rejected deletion does not persist candidates, receipts or revisions");
  }
  const ids = Object.values(f.project.documents).filter(entry => [f.owner, f.child].includes(entry.document.id) || entry.document.kind === "design" && [f.owner, f.child].includes(String((entry.document.componentRef as JsonObject).id))).map(entry => ({ id: entry.document.id, expectedKind: entry.document.kind }));
  const removed = await h.adopt(await h.execute("entity.delete", { refs: ids }));
  assert.equal(await h.service.getDocument(f.owner, h.principal), null); assert.equal(await h.service.getDocument(f.child, h.principal), null);
  const undo = await h.execute("transaction.undo", { undoHandle: removed.undoHandle!, expectedRevision: removed.revision! });
  assert.equal(undo.status, "accepted"); assert.deepEqual((await h.service.getProject(h.principal))!.documents, before!.project!.documents);
});

test("imported missing instance sources remain recoverable while unrelated deletions still apply", async () => {
  const f = fixture(), root = f.projected().parts.find(part => part.parent === null)!;
  f.project = valid(planStudioInstanceEdit(f.project, f.owner, { kind: "insert", ownerPartRef: root.id, slotRef: null, sourceComponentId: f.child }, f.id));
  const instance = f.projected().instances![0]!;
  for (const sourceId of [instance.componentRef.id, instance.designRefs.Web.id, instance.designRefs.Mobile.id]) delete f.project.documents[sourceId];
  assert.equal(inspectStudioProject(f.project).valid, true);
  const extra = planStudioComponentCreate(f.project, { catalogId: "catalog.button", name: "Unrelated" }, f.id); f.project = valid(extra);
  const h = await kernelFixture(f.project), unrelated = extra.changes.upserts.map(entry => ({ id: entry.document.id, expectedKind: entry.document.kind }));
  const applied = await h.adopt(await h.execute("entity.delete", { refs: unrelated }));
  assert.ok(applied.diagnostics.some(item => item.code === "STUDIO_INSTANCE_STALE" && item.severity === "warning"));
  assert.equal(inspectStudioProject((await h.service.getProject(h.principal))!).components.find(component => component.id === f.owner)!.instances![0]!.status, "missing");
});
