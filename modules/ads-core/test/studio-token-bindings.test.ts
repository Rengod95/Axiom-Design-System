import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, CommandService, createStudioStarter, FOUNDATION_STARTER_DOMAINS, inspectFoundationAuthoring, inspectFoundationDocument, inspectStudioProject, inspectStudioTokenBindingIssues, isStudioTokenCompatible, MemoryStore, planFoundationEdit, planStudioComponentCreate, planStudioComponentEdit, planStudioEdit, planStudioTokenBindingRepair, PROTOCOL_VERSION, resolveFoundationTokens, STUDIO_FORMAT, STUDIO_PROFILE } from "../src/index.ts";
import type { FoundationDocument, JsonObject, Principal, ProjectSnapshot, StudioMotionTrack, StudioTokenBindingProperty, StudioVisualProperty } from "../src/index.ts";

const OPTIONS = { domains: FOUNDATION_STARTER_DOMAINS.map(domain => domain.id) };
const SOURCE = "foundation.system", COMPONENT = "component.button", PART = "component.button.root", DESIGN = "design.button.web";
const records = (value: unknown): JsonObject[] => value as JsonObject[];
const source = (project: ProjectSnapshot) => project.documents[SOURCE]!.document as FoundationDocument;
const explain = (report: { diagnostics: unknown[] }) => JSON.stringify(report.diagnostics);
function fixture() {
  let sequence = 0; const id = () => `binding.test.${++sequence}`;
  const documents = createStudioStarter("project.binding", OPTIONS);
  const project: ProjectSnapshot = { id: "project.binding", name: "Binding", revision: "initial", documents: Object.fromEntries(documents.map(document => [document.id, { document, originalText: canonicalJson(document), sourceUri: "memory:binding", validation: "envelope-only", validationProfile: STUDIO_PROFILE, diagnostics: [] }])) };
  // These tests pin the pre-adoption domain contract. Explicit role policy is covered separately.
  delete source(project).authoringProfile;
  for (const token of source(project).tokens) delete token.role;
  const token = (name: string) => source(project).tokens.find(token => token.name === name)!;
  return { project, id, token };
}
const declarations = (project: ProjectSnapshot) => records(project.documents[DESIGN]!.document.appearance)[0]!.declarations as JsonObject;

test("binding eligibility separates shared dimension/number types by purpose in both themes", () => {
  const { project } = fixture();
  const cases: [string, StudioTokenBindingProperty, StudioTokenBindingProperty[]][] = [
    ["radius.control", "borderRadius", ["fontSize", "gap", "borderWidth", "minHeight"]],
    ["space.2", "gap", ["borderRadius", "fontSize", "minHeight"]],
    ["size.44", "minHeight", ["gap", "fontSize", "borderWidth"]],
    ["stroke.width.1", "borderWidth", ["borderRadius", "gap", "fontSize"]],
    ["font.size.16", "fontSize", ["borderRadius", "gap", "borderWidth"]],
    ["font.lineHeight.tight", "lineHeight", ["opacity"]],
    ["alpha.opaque", "opacity", ["lineHeight"]],
    ["z.base", "lineHeight", ["opacity", "lineHeight"]],
  ];
  for (const themeSetId of ["theme.light", "theme.dark"]) {
    const resolution = resolveFoundationTokens(source(project), { themeSetId }); assert.equal(resolution.valid, true, explain(resolution));
    for (const [name, compatible, incompatible] of cases) {
      const token = resolution.tokens.find(token => token.name === name)!;
      if (name !== "z.base") assert.equal(isStudioTokenCompatible(token, compatible), true, name);
      for (const property of incompatible) assert.equal(isStudioTokenCompatible(token, property), false, `${name} → ${property}`);
    }
  }
});

test("component and source mutation paths atomically reject incompatible domains", () => {
  const { project, id, token } = fixture(), before = canonicalJson(project);
  const cases: [StudioVisualProperty, string][] = [["borderRadius", "space.2"], ["fontSize", "radius.control"], ["borderWidth", "size.44"], ["opacity", "z.base"], ["lineHeight", "alpha.opaque"], ["letterSpacing", "space.2"]];
  for (const [property, name] of cases) {
    const bad = planStudioComponentEdit(project, { componentId: COMPONENT, edit: { kind: "appearance", category: "Web", partId: PART, property, value: { tokenRef: token(name).id } } }, id);
    assert.equal(bad.valid, false, `${property}: ${explain(bad)}`); assert.deepEqual(bad.changes.upserts, []); assert.equal(canonicalJson(bad.project), before);
    assert.ok(bad.diagnostics.some(item => item.code === "STUDIO_TOKEN_BINDING" && item.path?.endsWith(`/${property}`)));
    const direct = planStudioEdit(project, { kind: "appearance", id: COMPONENT, category: "Web", partId: PART, property, value: { tokenRef: token(name).id } }, id);
    assert.equal(direct.valid, false, explain(direct));
  }
  const edited = structuredClone(project.documents[DESIGN]!.document);
  records(edited.layout)[0]!.gap = { tokenRef: token("radius.control").id };
  const rejected = planStudioEdit(project, { kind: "source", id: DESIGN, source: canonicalJson(edited) }, id);
  assert.equal(rejected.valid, false); assert.ok(rejected.diagnostics.some(item => item.code === "STUDIO_TOKEN_BINDING" && item.path === "/layout/0/gap"));
  assert.equal(canonicalJson(project), before);
});

test("legacy starter purpose survives renamed domains without inferring arbitrary names or rewriting source", () => {
  const { project, token } = fixture(), foundation = source(project);
  for (const domain of records(foundation.domains)) { delete domain.bindingCategory; domain.name = `Renamed ${domain.id}`; }
  token("radius.control").name = "corner.brand.action";
  const before = canonicalJson(foundation), report = resolveFoundationTokens(foundation);
  const radius = report.tokens.find(value => value.id === token("corner.brand.action").id)!;
  assert.equal(radius.bindingCategory, "radius"); assert.equal(isStudioTokenCompatible(radius, "fontSize"), false);
  assert.equal(canonicalJson(foundation), before);
  const model = inspectFoundationAuthoring(project);
  assert.equal(model.domains.find(domain => domain.id === radius.domain)!.bindingCategorySource, "starter");
  foundation.domains.push({ id: "radius.looks-authoritative", name: "Radius", allowedTypes: ["dimension"] });
  foundation.tokens.push({ id: "radius.fake", name: "radius.scale.fake", domain: "radius.looks-authoritative", typeRef: { id: "dimension" }, value: { literal: { value: 12, unit: "px" } } });
  const unknown = resolveFoundationTokens(foundation).tokens.find(token => token.id === "radius.fake")!;
  assert.equal(unknown.bindingCategory, undefined); assert.equal(isStudioTokenCompatible(unknown, "fontSize"), true, "a label is not executable purpose");
});

test("custom domains expose explicit purpose independently of labels and preserve unrestricted imports", () => {
  const { project, id, token } = fixture();
  const created = planFoundationEdit(project, { kind: "classification-create", category: "domain", name: "Organic corners", bindingCategory: "radius", allowedTypes: ["dimension"] }, id);
  assert.equal(created.valid, true, explain(created)); const domainId = created.createdIds[0]!;
  const classified = planFoundationEdit(created.project, { kind: "token-update", id: "token.radius", domain: domainId }, id);
  assert.equal(classified.valid, true, explain(classified));
  const renamed = planFoundationEdit(classified.project, { kind: "classification-update", category: "domain", id: domainId, name: "Spacing is only a display label" }, id);
  assert.equal(renamed.valid, true, explain(renamed));
  const resolved = inspectStudioProject(renamed.project).foundation.tokens.find(item => item.id === "token.radius")!;
  assert.equal(resolved.bindingCategory, "radius"); assert.equal(isStudioTokenCompatible(resolved, "gap"), false);
  const wrongPurpose = planFoundationEdit(renamed.project, { kind: "classification-update", category: "domain", id: domainId, bindingCategory: "spacing" }, id);
  assert.equal(wrongPurpose.valid, false, "purpose changes must validate existing component usages"); assert.deepEqual(wrongPurpose.updates, []);
  const unrestricted = planFoundationEdit(renamed.project, { kind: "classification-update", category: "domain", id: domainId, bindingCategory: "unrestricted" }, id);
  assert.equal(unrestricted.valid, true, explain(unrestricted));
  assert.equal(isStudioTokenCompatible(inspectStudioProject(unrestricted.project).foundation.tokens.find(item => item.id === resolved.id)!, "gap"), true);
  for (const edit of [{ kind: "classification-create", category: "domain", name: "Unknown", bindingCategory: "made-up" }, { kind: "classification-create", category: "tier", name: "Misplaced", bindingCategory: "radius" }]) {
    const invalid = planFoundationEdit(project, edit as never, id); assert.equal(invalid.valid, false); assert.deepEqual(invalid.updates, []);
  }
  const invalidSource = structuredClone(source(project)); records(invalidSource.domains)[0]!.bindingCategory = "made-up";
  assert.equal(inspectFoundationDocument(invalidSource).valid, false);
});

test("semantic alias use follows its own domain rather than its primitive dependency", () => {
  const { project, id, token } = fixture();
  const alias = planFoundationEdit(project, { kind: "token-alias", id: token("radius.control").id, targetId: token("space.2").id }, id);
  assert.equal(alias.valid, true, explain(alias));
  const report = inspectStudioProject(alias.project), exposed = report.foundation.tokens.find(item => item.id === token("radius.control").id)!;
  assert.ok(exposed.aliasChain.includes(token("space.2").id)); assert.equal(exposed.bindingCategory, "radius");
  assert.equal(isStudioTokenCompatible(exposed, "borderRadius"), true); assert.equal(isStudioTokenCompatible(exposed, "gap"), false);
});

test("existing incompatible bindings remain inspectable and only a complete repair can be proposed", () => {
  const { project, id, token } = fixture(); declarations(project).borderRadius = { tokenRef: token("space.2").id };
  const before = canonicalJson(project), invalid = inspectStudioProject(project);
  assert.equal(invalid.valid, false); assert.ok(invalid.components.some(item => item.id === COMPONENT));
  assert.ok(invalid.diagnostics.some(item => item.code === "STUDIO_TOKEN_BINDING")); assert.equal(canonicalJson(project), before);
  const unrelated = planStudioComponentEdit(project, { componentId: COMPONENT, edit: { kind: "name", name: "Unrelated edit" } }, id);
  assert.equal(unrelated.valid, false); assert.deepEqual(unrelated.changes.upserts, []); assert.equal(canonicalJson(unrelated.project), before);
  const repair = planStudioComponentEdit(project, { componentId: COMPONENT, edit: { kind: "appearance", category: "Web", partId: PART, property: "borderRadius", value: { tokenRef: token("radius.control").id } } }, id);
  assert.equal(repair.valid, true, explain(repair)); assert.equal(repair.changes.upserts.length, 1); assert.equal(canonicalJson(project), before);
  const brokenShape = structuredClone(project); brokenShape.documents[COMPONENT]!.document.parts = [];
  assert.equal(planStudioComponentEdit(brokenShape, { componentId: COMPONENT, edit: { kind: "name", name: "Cannot bypass shape validation" } }, id).valid, false);
});

test("multi-component binding repair collects all sites without accepting partial or forged paths", () => {
  const { project, id, token } = fixture();
  for (const kind of ["button", "card"]) (records(project.documents[`design.${kind}.web`]!.document.appearance)[0]!.declarations as JsonObject).borderRadius = { tokenRef: token("space.2").id };
  const before = canonicalJson(project), issues = inspectStudioTokenBindingIssues(project);
  assert.equal(issues.length, 2); assert.equal(canonicalJson(project), before, "opening a repair is read-only");
  const replacements = issues.map(issue => ({ documentId: issue.documentId, path: issue.path, tokenId: issue.tokenId, replacementTokenId: token("radius.control").id }));
  for (const choices of [replacements.slice(0, 1), [replacements[0]!, replacements[0]!], replacements.map(item => ({ ...item, path: "/metadata/tokenRef" })), replacements.map(item => ({ ...item, replacementTokenId: token("space.2").id }))]) {
    const rejected = planStudioTokenBindingRepair(project, choices, id); assert.equal(rejected.valid, false); assert.deepEqual(rejected.updates, []); assert.equal(canonicalJson(rejected.project), before);
  }
  const repaired = planStudioTokenBindingRepair(project, replacements, id);
  assert.equal(repaired.valid, true, explain(repaired)); assert.equal(repaired.updates.length, 2); assert.equal(inspectStudioTokenBindingIssues(repaired.project).length, 0);
  for (const update of repaired.updates) { assert.equal(update.expectedRevision, project.documents[update.document.id]!.document.revision); assert.equal(repaired.project.documents[update.document.id]!.originalText, project.documents[update.document.id]!.originalText); }
  assert.equal(canonicalJson(project), before);
});

test("atomic repair includes layout, conditional appearance and motion leaves while retaining reference pins", () => {
  const { project, id, token } = fixture(), created = planStudioComponentCreate(project, { catalogId: "catalog.box" }, id);
  assert.equal(created.valid, true, explain(created));
  const working = created.project, component = created.changes.upserts.find(item => item.document.kind === "component")!.document, owned = working.documents[component.id]!.document;
  const partId = String(records(owned.parts)[0]!.id), duration = source(working).tokens.find(item => item.name === "duration.200")!;
  source(working).domains.push({ id: "repair.nonmotion", name: "Other timings", bindingCategory: "spacing", allowedTypes: ["duration"] }); duration.domain = "repair.nonmotion";
  owned.motion = [{ id: "repair.track", targetPartRef: partId, trigger: "enter", property: "opacity", keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 1 }], timing: { kind: "tween", duration: { tokenRef: duration.id }, easing: [.2, 0, 0, 1] }, delay: { tokenRef: duration.id }, interruption: "replace-from-current", reducedAlternative: { kind: "snap", value: 1 } }];
  const pinned = Object.values(working.documents).find(entry => entry.document.kind === "design" && (entry.document.componentRef as JsonObject).id === component.id)!.document;
  (pinned.componentRef as JsonObject).revision = owned.revision;
  records(working.documents[DESIGN]!.document.layout)[0]!.gap = { tokenRef: token("radius.control").id };
  (records(working.documents[DESIGN]!.document.appearance)[1]!.declarations as JsonObject).borderRadius = { tokenRef: token("space.2").id };
  const before = canonicalJson(working), issues = inspectStudioTokenBindingIssues(working);
  assert.deepEqual(new Set(issues.map(issue => issue.property)), new Set(["gap", "borderRadius", "motionDuration", "motionDelay"]));
  const repaired = planStudioTokenBindingRepair(working, issues.map(issue => ({ documentId: issue.documentId, path: issue.path, tokenId: issue.tokenId, replacementTokenId: null })), id);
  assert.equal(repaired.valid, true, explain(repaired)); assert.equal(canonicalJson(working), before);
  assert.equal((repaired.project.documents[pinned.id]!.document.componentRef as JsonObject).revision, repaired.project.documents[component.id]!.document.revision);
  assert.notEqual(repaired.project.documents[component.id]!.document.revision, owned.revision);
  assert.equal(inspectStudioTokenBindingIssues(repaired.project).length, 0);
});

test("motion binding purpose is enforced by the component plan", () => {
  const { project, id, token } = fixture(), duration = token("duration.200");
  source(project).domains.push({ id: "timing.wrong-purpose", name: "Not motion", allowedTypes: ["duration"], bindingCategory: "spacing" }); duration.domain = "timing.wrong-purpose";
  const created = planStudioComponentCreate(project, { catalogId: "catalog.box" }, id); assert.equal(created.valid, true, explain(created));
  const component = created.changes.upserts.find(item => item.document.kind === "component")!.document, root = String(records(component.parts)[0]!.id);
  const track: Omit<StudioMotionTrack, "id"> = { targetPartRef: root, trigger: "enter", property: "opacity", keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 1 }], timing: { kind: "tween", duration: { tokenRef: duration.id }, easing: [.2, 0, 0, 1] }, delay: { value: 0, unit: "ms" }, interruption: "replace-from-current", reducedAlternative: { kind: "snap", value: 1 } };
  const invalid = planStudioComponentEdit(created.project, { componentId: component.id, edit: { kind: "motion-track-set", track, trackId: null } }, id);
  assert.equal(invalid.valid, false); assert.ok(invalid.diagnostics.some(item => item.code === "STUDIO_TOKEN_BINDING")); assert.deepEqual(invalid.changes.upserts, []);
});

test("authoritative import rejects bypassed domain bindings without candidates or document mutation", async () => {
  const { project, id, token } = fixture(), owner: Principal = { id: "binding.owner", scopes: ["project.read", "project.write", "review.apply"] };
  const service = new CommandService(new MemoryStore(), { createId: id, digest: text => createHash("sha256").update(text).digest("hex") });
  const execute = async (operation: string, payload: JsonObject) => { const key = id(); return service.execute({ protocolVersion: PROTOCOL_VERSION, commandId: key, actorId: owner.id, projectId: project.id, baseRevision: (await service.getProject(owner))?.revision ?? null, operation, payload, idempotencyKey: key, transactionId: key, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] }, owner); };
  assert.equal((await execute("project.create", { name: project.name })).status, "accepted");
  const candidate = await execute("document.import", { sourceRefs: Object.values(project.documents).map(entry => ({ uri: entry.sourceUri, content: canonicalJson(entry.document) })), formatProfile: STUDIO_FORMAT, importMode: "review" });
  assert.equal(candidate.status, "reviewRequired", explain(candidate));
  const approval = await execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
  assert.equal((await execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approval.reviewToken!, expectedRevision: (await service.getProject(owner))!.revision })).status, "accepted");
  const before = (await service.getProject(owner))!, changed = structuredClone(before.documents[DESIGN]!.document);
  changed.revision = id(); (records(changed.appearance)[0]!.declarations as JsonObject).borderRadius = { tokenRef: token("space.2").id };
  const rejected = await execute("document.import", { sourceRefs: [{ uri: "memory:bypass", content: canonicalJson(changed), expectedRevision: before.documents[DESIGN]!.document.revision }], formatProfile: "ads-envelope", importMode: "update" });
  assert.equal(rejected.status, "rejected", explain(rejected)); assert.ok(rejected.diagnostics.some(item => item.code === "STUDIO_TOKEN_BINDING"));
  assert.equal(canonicalJson(await service.getProject(owner)), canonicalJson(before)); assert.equal((await service.getAuthoringState(owner)).pendingCandidates.length, 0);
});
