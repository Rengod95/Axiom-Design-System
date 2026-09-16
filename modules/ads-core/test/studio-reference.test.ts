import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalJson, createStudioStarter, getStudioReferenceTemplate, inspectStudioDocument, inspectStudioProject, listStudioLibrary, listStudioReferenceTemplates, planStudioComponentCreate, planStudioComponentDuplicate, planStudioComponentEdit, STUDIO_PROFILE, studioReferenceForCatalog } from "../src/index.ts";
import type { JsonObject, ProjectSnapshot } from "../src/index.ts";
import { getStudioReferenceBindingProfile, getStudioReferencePartBinding } from "../src/studio-reference-bindings.ts";
import { STUDIO_REFERENCE_BINDING_RENDERER_SHA256 } from "../src/studio-reference-binding-data.ts";
function fixture() {
  let count = 0;
  const project: ProjectSnapshot = { id: "project.reference", name: "Reference", revision: "reference.initial", documents: Object.fromEntries(createStudioStarter("project.reference").map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:reference", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  return { project, id: () => `reference.generated.${++count}` };
}
test("Every curated entry has one pinned primary template, preferring shadcn without provider duplicates", () => {
  const library = listStudioLibrary(), templates = listStudioReferenceTemplates();
  assert.equal(templates.length, 225); assert.equal(new Set(templates.map(row => row.catalogId)).size, 225);
  for (const entry of library) {
    const template = studioReferenceForCatalog(entry.id)!;
    assert.ok(template); assert.match(template.commit, /^[a-f0-9]{40}$/); assert.ok(template.sourceUrl.includes(template.commit));
    assert.ok(entry.sourceRows.includes(template.sourceRow));
    if (entry.providerVariants.some(row => row.provider === "shadcn/ui")) assert.equal(template.provider, "shadcn/ui", entry.id);
  }
  assert.equal(studioReferenceForCatalog("catalog.breadcrumbs")?.id, studioReferenceForCatalog("catalog.breadcrumb")?.id);
  assert.equal(getStudioReferenceTemplate("__proto__"), null);
});
test("All 196 primary component templates insert with untouched upstream defaults and preserve old documents", () => {
  const { project, id } = fixture(), before = canonicalJson(project);
  for (const entry of listStudioLibrary().filter(entry => entry.kind === "component")) {
    const template = studioReferenceForCatalog(entry.id)!;
    const plan = planStudioComponentCreate(project, { catalogId: entry.id, referenceTemplateId: template.id }, id);
    assert.equal(plan.valid, true, `${entry.id}: ${JSON.stringify(plan.diagnostics)}`);
    const source = plan.changes.upserts.find(row => row.document.kind === "component")!.document;
    const component = inspectStudioProject(plan.project).components.find(item => item.id === source.id)!;
    assert.equal(component.catalog!.reference!.templateId, template.id);
    assert.equal(component.catalog!.catalogId, template.sourceCatalogId);
    assert.ok(component.parts.every(part => part.text === undefined));
    assert.ok(Object.values(component.web.parts).every(part => Object.keys(part.base).length === 0));
    assert.deepEqual(component.web.referenceLayout, {});
  }
  assert.equal(canonicalJson(project), before);
});
test("Explicit reference edits survive duplication; malformed template data cannot execute", () => {
  const { project, id } = fixture(), template = studioReferenceForCatalog("catalog.button")!;
  let plan = planStudioComponentCreate(project, { catalogId: template.catalogId, referenceTemplateId: template.id }, id);
  const component = inspectStudioProject(plan.project).components.find(item => item.catalog?.reference)!, root = component.parts.find(part => part.role === "root")!;
  plan = planStudioComponentEdit(plan.project, { componentId: component.id, edit: [{ kind: "layout", category: "Web", partId: root.id, field: "padding", value: 0 }, { kind: "part-text", partId: root.id, text: "Authored" }] }, id);
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics));
  let next = inspectStudioProject(plan.project).components.find(item => item.id === component.id)!;
  assert.deepEqual(next.web.referenceLayout![root.id], ["padding"]);
  const copy = planStudioComponentDuplicate(plan.project, { componentId: component.id }, id);
  assert.equal(copy.valid, true, JSON.stringify(copy.diagnostics));
  next = inspectStudioProject(copy.project).components.find(item => item.catalog?.reference && item.id !== component.id)!;
  assert.deepEqual(next.web.referenceLayout![next.parts.find(part => part.role === "root")!.id], ["padding"]);
  const source = structuredClone(plan.project.documents[component.id]!.document);
  (source.studioReference as JsonObject).script = "alert(1)";
  assert.equal(inspectStudioDocument(source).valid, false);
  assert.equal(planStudioComponentCreate(project, { catalogId: "catalog.card", referenceTemplateId: template.id }, id).valid, false);
});

test("an unsupported original-template edit rejects the entire batch and preserves saved source", () => {
  const { project, id } = fixture(), template = studioReferenceForCatalog("catalog.checkbox")!;
  const created = planStudioComponentCreate(project, { catalogId: template.catalogId, referenceTemplateId: template.id }, id);
  const component = inspectStudioProject(created.project).components.find(item => item.catalog?.reference)!;
  const before = canonicalJson(created.project);
  const edited = planStudioComponentEdit(created.project, { componentId: component.id, edit: [
    { kind: "name", name: "Must not apply" }, { kind: "variant-default", value: "outlined" },
  ] }, id);
  assert.equal(edited.valid, false); assert.equal(canonicalJson(created.project), before);
  assert.equal(canonicalJson(edited.project), before);
});

test("observed binding profiles cover exactly insertable pins and cannot be mutated by consumers", () => {
  const renderer = readFileSync(new URL("../../../apps/studio/src/reference-frame-styles.ts", import.meta.url), "utf8").replaceAll("\r\n", "\n");
  assert.equal(createHash("sha256").update(renderer).digest("hex"), STUDIO_REFERENCE_BINDING_RENDERER_SHA256, "Re-audit observed DOM capabilities when the trusted renderer changes");
  for (const entry of listStudioLibrary().filter(entry => entry.kind === "component")) {
    const template = studioReferenceForCatalog(entry.id)!, profile = getStudioReferenceBindingProfile(template.id)!;
    assert.equal(profile.sourceRow, template.sourceRow); assert.equal(profile.commit, template.commit);
    assert.ok(profile.bindings.every(binding => binding.tag !== "template"), "Inert collection placeholders are not editable visual elements");
    assert.ok(profile.bindings.every(binding => profile.parts.some(part => part.role === binding.role)));
  }
  const template = studioReferenceForCatalog("catalog.checkbox")!, profile = getStudioReferenceBindingProfile(template.id)!;
  const original = canonicalJson(profile), root = getStudioReferencePartBinding(template.id, "root")!;
  profile.bindings.length = 0; profile.parts[0]!.designs.Web!.layout.padding = { value: 999, unit: "px" };
  root.text = !root.text;
  assert.equal(canonicalJson(getStudioReferenceBindingProfile(template.id)), original);
  assert.notEqual(getStudioReferencePartBinding(template.id, "root")!.text, root.text);
  assert.equal(getStudioReferenceBindingProfile("__proto__"), null);
  assert.equal(getStudioReferencePartBinding("reference.react-aria.251", "root"), null);
});

test("Calendar day_1 rejects unmapped edits atomically while Checkbox label and root support observed edits", () => {
  const { project, id } = fixture();
  const template = studioReferenceForCatalog("catalog.calendar")!;
  const created = planStudioComponentCreate(project, { catalogId: template.catalogId, referenceTemplateId: template.id }, id);
  const component = inspectStudioProject(created.project).components.find(item => item.catalog?.reference)!;
  const day = component.parts.find(part => part.role === "day_1")!, before = canonicalJson(created.project);
  assert.ok(day); assert.equal(getStudioReferencePartBinding(template.id, day.role), null);
  for (const edit of [
    { kind: "part-text", partId: day.id, text: "Ignored day" },
    { kind: "appearance", category: "Web", partId: day.id, property: "color", value: { colorSpace: "srgb", components: [1, 0, 0], alpha: 1 } },
    { kind: "layout", category: "Web", partId: day.id, field: "padding", value: 0 },
    { kind: "element-add", parentId: day.id, element: "box" },
  ]) {
    const result = planStudioComponentEdit(created.project, { componentId: component.id, edit: [{ kind: "name", name: "Must stay atomic" }, edit] } as Parameters<typeof planStudioComponentEdit>[1], id);
    assert.equal(result.valid, false, edit.kind); assert.equal(canonicalJson(result.project), before);
    assert.equal(result.changes.upserts.length, 0);
  }
  const checkboxTemplate = studioReferenceForCatalog("catalog.checkbox")!;
  let checkbox = planStudioComponentCreate(project, { catalogId: checkboxTemplate.catalogId, referenceTemplateId: checkboxTemplate.id }, id);
  const native = inspectStudioProject(checkbox.project).components.find(item => item.catalog?.reference)!;
  const root = native.parts.find(part => part.role === "root")!, label = native.parts.find(part => part.role === "label")!;
  checkbox = planStudioComponentEdit(checkbox.project, { componentId: native.id, edit: [
    { kind: "part-text", partId: label.id, text: "Native label" },
    { kind: "appearance", category: "Web", partId: root.id, property: "color", value: { colorSpace: "srgb", components: [1, 0, 0], alpha: 1 } },
    { kind: "layout", category: "Web", partId: root.id, field: "padding", value: 0 },
    { kind: "element-add", parentId: root.id, element: "box" },
  ] }, id);
  assert.equal(checkbox.valid, true, JSON.stringify(checkbox.diagnostics));
});

test("native inputs and ancestor text cannot accept an ignored text override", () => {
  const { project, id } = fixture();
  for (const [catalog, role] of [["catalog.input", "input"], ["catalog.input", "root"]]) {
    const template = studioReferenceForCatalog(catalog!)!;
    const created = planStudioComponentCreate(project, { catalogId: template.catalogId, referenceTemplateId: template.id }, id);
    const component = inspectStudioProject(created.project).components.find(item => item.catalog?.reference)!;
    const part = component.parts.find(part => part.role === role)!;
    assert.equal(getStudioReferencePartBinding(template.id, part.role)?.text, false);
    assert.equal(planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "part-text", partId: part.id, text: "Ignored" } }, id).valid, false);
    if (role === "input") assert.equal(planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "element-add", parentId: part.id, element: "box" } }, id).valid, false);
    const source = structuredClone(created.project.documents[component.id]!.document);
    (source.parts as JsonObject[]).find(item => item.id === part.id)!.studioText = "Smuggled";
    assert.equal(inspectStudioDocument(source).valid, false);
  }
});

test("raw reference designs reject unmapped, conditional and unmasked edits instead of silently ignoring them", () => {
  const { project, id } = fixture(), template = studioReferenceForCatalog("catalog.calendar")!;
  const created = planStudioComponentCreate(project, { catalogId: template.catalogId, referenceTemplateId: template.id }, id);
  const component = inspectStudioProject(created.project).components.find(item => item.catalog?.reference)!;
  const root = component.parts.find(part => part.role === "root")!, day = component.parts.find(part => part.role === "day_1")!;
  const web = Object.values(created.project.documents).find(item => item.document.kind === "design" && (item.document.componentRef as JsonObject).id === component.id && item.document.category === "Web")!.document;
  const check = (mutate: (design: JsonObject) => void) => { const changed = structuredClone(created.project); mutate(changed.documents[web.id]!.document); assert.equal(inspectStudioProject(changed).valid, false); };
  const paint = (target: string, states: JsonObject = {}) => ({ id: id(), targetPartRef: target, variants: {}, states, declarations: { color: { colorSpace: "srgb", components: [1, 0, 0], alpha: 1 } }, explicitPriority: 0, refines: [] });
  check(design => { design.appearance = [paint(day.id)]; });
  check(design => { design.appearance = [paint(root.id, { disabled: true })]; });
  check(design => { (design.layout as JsonObject[]).find(row => row.targetPartRef === root.id)!.padding = { value: 0, unit: "px" }; });
  check(design => { design.referenceLayout = [{ partRef: day.id, fields: ["padding"] }]; });
  check(design => { (design.nodeMappings as JsonObject[]).find(row => row.partRef === root.id)!.element = "section"; });
});

test("raw inert behavior ports stay pinned while names and purposes remain editable", () => {
  const { project, id } = fixture(), template = studioReferenceForCatalog("catalog.checkbox")!;
  const created = planStudioComponentCreate(project, { catalogId: template.catalogId, referenceTemplateId: template.id, name: "My checkbox" }, id);
  assert.equal(created.valid, true, JSON.stringify(created.diagnostics));
  const source = created.changes.upserts.find(row => row.document.kind === "component")!.document;
  const reject = (mutate: (source: JsonObject) => void) => { const next = structuredClone(source); mutate(next); assert.equal(inspectStudioDocument(next).valid, false); };
  reject(next => { ((next.publicContract as JsonObject).events as JsonObject[]).push({ id: id(), name: "ignored", payloadType: { kind: "boolean" }, phase: "intent", cancellable: false, visibility: "public" }); });
  reject(next => { (next.slots as JsonObject[]).push({ id: id(), ownerPartRef: (next.parts as JsonObject[])[0]!.id!, min: 0, max: 2, contentKinds: ["text", "component"], defaultContent: [], allowedContractRefs: [] }); });
  reject(next => { (next.accessibility as JsonObject).label = "Ignored accessible name"; });
  reject(next => { (next.studioMotion as JsonObject).durationMs = 200; });
  reject(next => { (next.previewContent as JsonObject).label = "Ignored sample"; });
  reject(next => { (next.parts as JsonObject[]).find(part => part.studioRole === "label")!.required = false; });
  assert.equal(planStudioComponentEdit(created.project, { componentId: source.id, edit: [{ kind: "name", name: "Renamed" }, { kind: "purpose", purpose: "Editor description" }] } as Parameters<typeof planStudioComponentEdit>[1], id).valid, true);
  const accordionTemplate = studioReferenceForCatalog("catalog.accordion")!;
  const accordion = planStudioComponentCreate(project, { catalogId: accordionTemplate.catalogId, referenceTemplateId: accordionTemplate.id }, id);
  const slotSource = structuredClone(accordion.changes.upserts.find(row => row.document.kind === "component")!.document);
  (slotSource.slots as JsonObject[])[0]!.min = 1;
  assert.equal(inspectStudioDocument(slotSource).valid, false, "Unmapped optional-to-required slot changes cannot be smuggled through raw source");
});
