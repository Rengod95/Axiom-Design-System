import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, createStudioStarter, inspectStudioProject, planStudioComponentCreate, planStudioComponentDuplicate, planStudioComponentEdit, STUDIO_PROFILE, studioComponentPlanPayload } from "../src/index.ts";
import type { AdsDocument, JsonObject, ProjectSnapshot, StudioComponentEdit, StudioComponentPlan } from "../src/index.ts";

const rows = (value: unknown): JsonObject[] => value as JsonObject[];
const explain = (plan: { diagnostics: unknown[] }) => JSON.stringify(plan.diagnostics);
function fixture() {
  let next = 0;
  const project: ProjectSnapshot = { id: "project.composer", name: "Composer", revision: "revision.initial", documents: Object.fromEntries(createStudioStarter("project.composer").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:composer", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  return { project, id: () => `composer.${++next}` };
}
function component(plan: StudioComponentPlan): AdsDocument {
  assert.equal(plan.valid, true, explain(plan));
  return plan.changes.upserts.find(item => item.document.kind === "component")!.document;
}
function designs(project: ProjectSnapshot, componentId: string): AdsDocument[] {
  return Object.values(project.documents).map(item => item.document).filter(document => document.kind === "design" && (document.componentRef as JsonObject).id === componentId);
}
function mapping(design: AdsDocument, partId: string): JsonObject { return rows(design.nodeMappings).find(item => item.partRef === partId)!; }
function rejected(plan: StudioComponentPlan, before: ProjectSnapshot) {
  assert.equal(plan.valid, false, "Unsafe edits must reject before creating source changes");
  assert.deepEqual(plan.changes, { upserts: [], deletes: [] });
  assert.equal(canonicalJson(plan.project), canonicalJson(before));
  assert.throws(() => studioComponentPlanPayload(plan));
}

test("blank, stack and article create one atomic component plus Web and Mobile sources without mutating the project", () => {
  for (const structure of ["blank", "stack", "article"] as const) {
    const { project, id } = fixture(), before = canonicalJson(project);
    const plan = planStudioComponentCreate(project, { catalogId: "catalog.box", name: "Editorial block", structure }, id), definition = component(plan);
    const parts = rows(definition.parts), root = parts.find(part => part.parent === null)!;
    assert.equal(canonicalJson(project), before);
    assert.equal(plan.baseRevision, project.revision);
    assert.equal(plan.project.revision, project.revision, "A proposed plan is not an adopted revision");
    assert.equal(plan.changes.upserts.length, 3);
    assert.equal(plan.changes.deletes.length, 0);
    assert.equal(rows(studioComponentPlanPayload(plan).sourceRefs).length, 3);
    assert.ok(plan.changes.upserts.every(item => item.expectedRevision === undefined));
    assert.equal(parts.length, structure === "blank" ? 2 : 4);
    const categories = designs(plan.project, definition.id);
    assert.deepEqual(new Set(categories.map(design => design.category)), new Set(["Web", "Mobile"]));
    for (const design of categories) {
      assert.equal(mapping(design, String(root.id)).element, structure === "article" ? "article" : undefined);
      if (structure !== "blank") {
        const heading = parts.find(part => part.studioRole === "heading")!, description = parts.find(part => part.studioRole === "description")!, body = parts.find(part => part.studioRole === "body")!;
        assert.equal(heading.studioText, "Editorial block");
        assert.equal(mapping(design, String(heading.id)).element, "h2");
        assert.equal(mapping(design, String(description.id)).element, "p");
        assert.deepEqual(rows(design.layout).find(item => item.targetPartRef === root.id)!.childOrder, [heading.id, description.id, body.id]);
      }
    }
    assert.equal(inspectStudioProject(plan.project).valid, true);
  }
});

test("custom structure choices reject invalid catalog and malformed structures atomically", () => {
  const { project, id } = fixture();
  for (const options of [{ catalogId: "catalog.checkbox", structure: "article" }, { catalogId: "catalog.box", structure: "script" }, { catalogId: "catalog.box", structure: null }, { catalogId: "catalog.box", structure: ["article"] }]) {
    rejected(planStudioComponentCreate(project, options as never, id), project);
  }
});

test("element tags remain category-specific and duplicate with remapped owned identities", () => {
  const { project, id } = fixture(), created = planStudioComponentCreate(project, { catalogId: "catalog.box", structure: "blank" }, id), definition = component(created);
  const root = String(rows(definition.parts).find(part => part.parent === null)!.id);
  const edited = planStudioComponentEdit(created.project, { componentId: definition.id, edit: [
    { kind: "part-element", category: "Web", partId: root, element: "section" },
    { kind: "part-element", category: "Mobile", partId: root, element: "article" },
  ] }, id);
  assert.equal(edited.valid, true, explain(edited));
  assert.equal(edited.changes.upserts.length, 2, "Only the addressed designs change");
  assert.deepEqual(edited.project.documents[definition.id], created.project.documents[definition.id]);
  const projected = inspectStudioProject(edited.project).components.find(item => item.id === definition.id)!;
  assert.equal(projected.web.elements?.[root], "section");
  assert.equal(projected.mobile.elements?.[root], "article");
  const copy = planStudioComponentDuplicate(edited.project, { componentId: definition.id }, id), copied = component(copy), copiedRoot = String(rows(copied.parts).find(part => part.parent === null)!.id);
  assert.notEqual(copiedRoot, root);
  const oldParts = new Set(rows(definition.parts).map(part => part.id)), oldSlots = new Set(rows(definition.slots).map(slot => slot.id));
  for (const design of designs(copy.project, copied.id)) {
    assert.equal(mapping(design, copiedRoot).element, design.category === "Web" ? "section" : "article");
    assert.ok(rows(design.nodeMappings).every(item => !oldParts.has(item.partRef)));
  }
  assert.ok(rows(copied.slots).every(slot => !oldSlots.has(slot.id) && !oldParts.has(slot.ownerPartRef)));
  assert.deepEqual((copied.publicContract as JsonObject).exposedSlots, rows(copied.slots).map(slot => slot.id));
});

test("element mapping rejects injected tags, non-string tags and interactive catalog remapping", () => {
  const { project, id } = fixture(), created = planStudioComponentCreate(project, { catalogId: "catalog.box" }, id), definition = component(created), root = String(rows(definition.parts)[0]!.id);
  for (const element of ["script", "img", "a", "div onclick=alert(1)", "<section>", "SECTION", null, ["section"], { tag: "section" }]) {
    rejected(planStudioComponentEdit(created.project, { componentId: definition.id, edit: { kind: "part-element", category: "Web", partId: root, element } as StudioComponentEdit }, id), created.project);
  }
  const button = planStudioComponentCreate(project, { catalogId: "catalog.button" }, id), buttonDefinition = component(button);
  rejected(planStudioComponentEdit(button.project, { componentId: buttonDefinition.id, edit: { kind: "part-element", category: "Web", partId: String(rows(buttonDefinition.parts)[0]!.id), element: "div" } }, id), button.project);
});

test("text and heading elements reject block children and content areas while preserving valid span children", () => {
  const { project, id } = fixture(), created = planStudioComponentCreate(project, { catalogId: "catalog.box", structure: "article" }, id), definition = component(created), parts = rows(definition.parts);
  const heading = String(parts.find(part => part.studioRole === "heading")!.id), body = String(parts.find(part => part.studioRole === "body")!.id), root = String(parts.find(part => part.parent === null)!.id);
  rejected(planStudioComponentEdit(created.project, { componentId: definition.id, edit: { kind: "part-element", category: "Web", partId: body, element: "p" } }, id), created.project);
  rejected(planStudioComponentEdit(created.project, { componentId: definition.id, edit: { kind: "part-element", category: "Web", partId: root, element: "span" } }, id), created.project);
  const added = planStudioComponentEdit(created.project, { componentId: definition.id, edit: { kind: "part-add", parentId: root, name: "Emphasis", role: "emphasis" } }, id);
  assert.equal(added.valid, true, explain(added));
  const emphasis = String(rows(added.project.documents[definition.id]!.document.parts).find(part => part.studioRole === "emphasis")!.id);
  const nested = planStudioComponentEdit(added.project, { componentId: definition.id, edit: [
    { kind: "part-element", category: "Web", partId: emphasis, element: "span" },
    { kind: "part-element", category: "Mobile", partId: emphasis, element: "code" },
    { kind: "part-parent", partId: emphasis, parentId: heading },
  ] }, id);
  assert.equal(nested.valid, true, explain(nested));
  rejected(planStudioComponentEdit(nested.project, { componentId: definition.id, edit: { kind: "part-element", category: "Web", partId: emphasis, element: "section" } }, id), nested.project);
});

test("content-area edits preserve slot identity and exposure while required semantic slots cannot be weakened", () => {
  const { project, id } = fixture(), created = planStudioComponentCreate(project, { catalogId: "catalog.box" }, id), definition = component(created), required = rows(definition.slots)[0]!;
  const before = structuredClone(required), exposure = structuredClone((definition.publicContract as JsonObject).exposedSlots);
  const updated = planStudioComponentEdit(created.project, { componentId: definition.id, edit: { kind: "slot-update", slotId: String(required.id), required: true, multiple: true } }, id);
  assert.equal(updated.valid, true, explain(updated));
  assert.deepEqual(rows(updated.project.documents[definition.id]!.document.slots)[0], { ...before, min: 1, max: "unbounded" });
  assert.deepEqual((updated.project.documents[definition.id]!.document.publicContract as JsonObject).exposedSlots, exposure);
  rejected(planStudioComponentEdit(updated.project, { componentId: definition.id, edit: { kind: "slot-update", slotId: String(required.id), required: false, multiple: true } }, id), updated.project);
  rejected(planStudioComponentEdit(updated.project, { componentId: definition.id, edit: { kind: "slot-delete", slotId: String(required.id) } }, id), updated.project);
  rejected(planStudioComponentEdit(updated.project, { componentId: definition.id, edit: { kind: "slot-update", slotId: "slot.missing", required: true, multiple: false } }, id), updated.project);
  const optional = planStudioComponentCreate(project, { catalogId: "catalog.accordion" }, id), accordion = component(optional), optionalSlot = rows(accordion.slots)[0]!;
  const tightened = planStudioComponentEdit(optional.project, { componentId: accordion.id, edit: { kind: "slot-update", slotId: String(optionalSlot.id), required: true, multiple: true } }, id);
  assert.equal(tightened.valid, true, explain(tightened));
  const relaxed = planStudioComponentEdit(tightened.project, { componentId: accordion.id, edit: { kind: "slot-update", slotId: String(optionalSlot.id), required: false, multiple: false } }, id);
  assert.equal(relaxed.valid, true, explain(relaxed));
  assert.deepEqual(rows(relaxed.project.documents[accordion.id]!.document.slots)[0], { ...optionalSlot, min: 0, max: 1 });
});
