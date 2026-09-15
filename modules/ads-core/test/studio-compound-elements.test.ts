import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, createStudioStarter, inspectStudioProject, planStudioComponentCreate, planStudioComponentEdit, planStudioComponentDuplicate, planStudioInstanceEdit, STUDIO_PROFILE } from "../src/index.ts";
import type { JsonObject, ProjectSnapshot, StudioComponentEdit } from "../src/index.ts";

function fixture(catalogId = "catalog.accordion") {
  let index = 0; const id = () => `compound.${++index}`;
  let project: ProjectSnapshot = { id: "compound.project", name: "Compound", revision: "revision.base", documents: Object.fromEntries(createStudioStarter("compound.project").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:test", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  const created = planStudioComponentCreate(project, { catalogId }, id); assert.equal(created.valid, true, JSON.stringify(created.diagnostics)); project = created.project;
  const componentId = created.changes.upserts.find(item => item.document.kind === "component")!.document.id;
  const projected = () => inspectStudioProject(project).components.find(item => item.id === componentId)!;
  const edit = (edit: StudioComponentEdit | StudioComponentEdit[]) => {
    const plan = planStudioComponentEdit(project, { componentId, edit }, id); assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics)); project = plan.project; return plan;
  };
  return { get project() { return project; }, componentId, id, projected, edit };
}

test("compound source expresses Item/Header/Trigger/Content and nested authored children in both designs", () => {
  const f = fixture(), parts = f.projected().parts, byRole = (role: string) => parts.find(part => part.role === role)!;
  assert.equal(byRole("trigger").parent, byRole("header").id);
  assert.equal(byRole("header").parent, byRole("item").id);
  assert.equal(byRole("panel").parent, byRole("item").id);
  assert.equal(byRole("indicator").parent, byRole("trigger").id);
  const before = canonicalJson(f.project);
  f.edit({ kind: "element-add", parentId: byRole("trigger").id, element: "box" });
  const box = f.projected().parts.find(part => part.elementKind === "box")!;
  f.edit({ kind: "element-add", parentId: box.id, element: "text", category: "Web", frame: { x: 8, y: 12, width: 160, height: 28 } });
  const text = f.projected().parts.find(part => part.elementKind === "text")!;
  for (const design of [f.projected().web, f.projected().mobile]) { assert.equal(design.elements![box.id], "span"); assert.equal(design.elements![text.id], "span"); assert.deepEqual(design.layout[box.id]!.childOrder, [text.id]); }
  assert.deepEqual(f.projected().web.layout[text.id]!.width, { mode: "fixed", value: 160 });
  assert.equal(f.projected().mobile.layout[text.id]!.width?.mode, "hug");
  for (const entry of Object.values(f.project.documents)) assert.equal(entry.originalText, JSON.parse(before).documents[entry.document.id].originalText);
  const duplicate = planStudioComponentDuplicate(f.project, { componentId: f.componentId }, f.id);
  assert.equal(duplicate.valid, true, JSON.stringify(duplicate.diagnostics));
  const copy = inspectStudioProject(duplicate.project).components.find(item => item.name.endsWith(" copy"))!;
  assert.equal(copy.parts.filter(part => part.elementKind).length, 2);
  assert.ok(copy.parts.every(part => !f.projected().parts.some(original => original.id === part.id)));
});

test("invalid containment, nested interactive destinations, free semantic anchors and malformed draw geometry fail atomically", () => {
  const f = fixture(), trigger = f.projected().parts.find(part => part.role === "trigger")!;
  f.edit({ kind: "element-add", parentId: trigger.id, element: "text" });
  const text = f.projected().parts.find(part => part.elementKind === "text")!;
  const before = canonicalJson(f.project);
  for (const edit of [
    { kind: "element-add", parentId: text.id, element: "box" },
    { kind: "part-element", category: "Web", partId: text.id, element: "div" },
    { kind: "slot-add", partId: text.id, required: false, multiple: true },
    { kind: "layout", category: "Web", partId: trigger.id, field: "mode", value: "free" },
    { kind: "element-add", parentId: trigger.id, element: "box", category: "Web", frame: { x: 0, y: 0, width: -1, height: 20 } },
  ] as StudioComponentEdit[]) {
    const result = planStudioComponentEdit(f.project, { componentId: f.componentId, edit }, f.id);
    assert.equal(result.valid, false); assert.deepEqual(result.changes.upserts, []); assert.equal(canonicalJson(result.project), before);
  }
  const input = fixture("catalog.textfield"), native = input.projected().parts.find(part => part.role === "input")!;
  assert.equal(planStudioComponentEdit(input.project, { componentId: input.componentId, edit: { kind: "element-add", parentId: native.id, element: "text" } }, input.id).valid, false);
});

test("an Accordion Content accepts real component instances while Trigger rejects them", () => {
  const f = fixture();
  const source = planStudioComponentCreate(f.project, { catalogId: "catalog.button" }, f.id); assert.equal(source.valid, true);
  const sourceComponentId = source.changes.upserts.find(item => item.document.kind === "component")!.document.id;
  for (const [role, valid] of [["panel", true], ["trigger", false]] as const) {
    const ownerPartRef = f.projected().parts.find(part => part.role === role)!.id;
    const result = planStudioInstanceEdit(source.project, f.componentId, { kind: "insert", ownerPartRef, slotRef: null, sourceComponentId }, f.id);
    assert.equal(result.valid, valid, JSON.stringify(result.diagnostics));
  }
});

test("explicit legacy anatomy migration preserves existing identities, values and original bytes", () => {
  const f = fixture(), legacy = structuredClone(f.project), entry = legacy.documents[f.componentId]!;
  const parts = (entry.document.parts as JsonObject[]).filter(part => !["item", "header"].includes(String(part.studioRole))), root = parts.find(part => part.parent === null)!;
  parts.forEach(part => { if (part !== root) part.parent = root.id!; }); entry.document.parts = parts;
  (entry.document.accessibility as JsonObject).readingOrder = parts.map(part => part.id!);
  const ids = new Set(parts.map(part => part.id));
  for (const document of Object.values(legacy.documents)) {
    const design = document.document;
    if (design.kind !== "design" || (design.componentRef as JsonObject)?.id !== f.componentId) continue;
    for (const field of ["nodeMappings", "layout", "appearance"]) design[field] = (design[field] as JsonObject[]).filter(item => ids.has(item.partRef ?? item.targetPartRef));
    for (const layout of design.layout as JsonObject[]) layout.childOrder = parts.filter(part => part.parent === layout.targetPartRef).map(part => part.id!);
    document.currentText = canonicalJson(design);
  }
  entry.currentText = canonicalJson(entry.document);
  const before = canonicalJson(legacy), result = planStudioComponentEdit(legacy, { componentId: f.componentId, edit: { kind: "structure-normalize" } }, f.id);
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics)); assert.equal(canonicalJson(legacy), before);
  const normalized = inspectStudioProject(result.project).components.find(component => component.id === f.componentId)!;
  assert.ok([...ids].every(id => normalized.parts.some(part => part.id === id)));
  assert.equal(normalized.parts.find(part => part.role === "trigger")!.parent, normalized.parts.find(part => part.role === "header")!.id);
  assert.deepEqual(result.project.documents[f.componentId]!.document.publicContract, entry.document.publicContract);
  for (const [id, source] of Object.entries(legacy.documents)) assert.equal(result.project.documents[id]!.originalText, source.originalText);
});
