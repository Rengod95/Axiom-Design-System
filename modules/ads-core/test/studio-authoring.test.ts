import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { canonicalJson, CommandService, MemoryStore, PROTOCOL_VERSION, STUDIO_FORMAT, STUDIO_PROFILE, createStudioStarter, inspectStudioDocument, inspectStudioProject, planStudioEdit } from "../src/index.ts";
import type { AdsDocument, CommandEnvelope, CommandResult, JsonObject, Principal, ProjectSnapshot, StudioEdit, StudioEditPlan, TransactionalStore } from "../src/index.ts";

const OWNER: Principal = { id: "studio.owner", scopes: ["project.read", "project.write", "review.apply"] };
const OTHER: Principal = { id: "studio.other", scopes: [...OWNER.scopes] };
const digest = (text: string): string => createHash("sha256").update(text).digest("hex");
const records = (value: unknown): JsonObject[] => value as JsonObject[];
const brief = (result: CommandResult): string => JSON.stringify({ status: result.status, errors: result.diagnostics.filter(item => item.severity === "error").slice(0, 4) });

async function setup(adoptStarter = true) {
  let sequence = 0;
  const createId = () => `studio.generated.${++sequence}`;
  const store = new MemoryStore();
  const service = new CommandService(store, { createId, digest });
  const current = async () => (await service.getProject(OWNER))?.revision ?? null;
  const envelope = async (operation: string, payload: JsonObject, principal = OWNER): Promise<CommandEnvelope> => {
    const id = createId();
    return { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: principal.id, projectId: "project.studio", baseRevision: await current(), operation, payload, idempotencyKey: id, transactionId: id, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
  };
  const execute = async (operation: string, payload: JsonObject, principal = OWNER) => service.execute(await envelope(operation, payload, principal), principal);
  const project = async () => (await service.getProject(OWNER))!;
  const stage = async (documents: AdsDocument[], mode = "review", format: string = STUDIO_FORMAT) => execute("document.import", { sourceRefs: documents.map(document => ({ uri: `memory:${document.id}`, content: canonicalJson(document), ...(mode === "update" ? { expectedRevision: "source.initial" } : {}) })), formatProfile: format, importMode: mode });
  const stagePlan = async (plan: StudioEditPlan, format: string = STUDIO_FORMAT) => {
    const request = await envelope("document.import", { sourceRefs: plan.updates.map(update => ({ uri: `studio:${update.document.id}`, content: canonicalJson(update.document), expectedRevision: update.expectedRevision })), formatProfile: format, importMode: "update" });
    request.baseRevision = plan.baseRevision;
    return service.execute(request, OWNER);
  };
  const approve = async (candidate: CommandResult) => {
    assert.equal(candidate.status, "reviewRequired", brief(candidate));
    const approved = await execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" });
    assert.equal(approved.status, "accepted", brief(approved)); return approved;
  };
  const adopt = async (candidate: CommandResult) => {
    const approved = await approve(candidate);
    const result = await execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: (await current())! });
    assert.equal(result.status, "accepted", brief(result)); return result;
  };
  await execute("project.create", { name: "Studio" });
  const starter = createStudioStarter("project.studio");
  if (adoptStarter) await adopt(await stage(starter));
  return { createId, store, service, current, envelope, execute, project, stage, stagePlan, approve, adopt, starter };
}

test("starter adoption requires review and authoring queries keep approvals and other actors private", async () => {
  const h = await setup(false);
  const candidate = await h.stage(h.starter);
  assert.equal(candidate.status, "reviewRequired");
  assert.equal(Object.keys((await h.project()).documents).length, 0);
  const before = await h.service.getAuthoringState(OWNER);
  assert.equal(before.pendingCandidates.length, 1);
  assert.equal((await h.service.getAuthoringState(OTHER)).pendingCandidates.length, 0);
  assert.equal((await h.execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: "not.approved", expectedRevision: (await h.current())! })).status, "rejected");
  const approved = await h.approve(candidate);
  const visible = await h.service.getAuthoringState(OWNER);
  assert.equal(visible.pendingCandidates[0]!.status, "approved");
  assert.equal(canonicalJson(visible).includes(approved.reviewToken!), false);
  assert.equal((await h.execute("transaction.review", { candidateId: candidate.candidateId!, patchDigest: candidate.patchDigest!, decision: "approve" }, OTHER)).status, "rejected");
  const applied = await h.execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: (await h.current())! });
  assert.equal(applied.status, "accepted");
  const project = await h.project();
  assert.equal(Object.keys(project.documents).length, 10);
  assert.ok(Object.values(project.documents).every(entry => entry.validationProfile === STUDIO_PROFILE));
  assert.equal(inspectStudioProject(project).valid, true);
  assert.equal((await h.service.getAuthoringState(OWNER)).undoHandle, applied.undoHandle);
  assert.equal((await h.service.getAuthoringState(OTHER)).undoHandle, undefined);
  await assert.rejects(() => h.service.getAuthoringState({ id: OWNER.id, scopes: [] }), { code: "SCOPE_REQUIRED" });
});

test("one authoring snapshot isolates actor metadata and source data without exposing approvals", async () => {
  const h = await setup(false), candidate = await h.stage(h.starter), approval = await h.approve(candidate);
  for (const actor of [OWNER, OTHER]) {
    const draft = await h.execute("document.import", { sourceRefs: [{ uri: `memory:${actor.id}.draft`, content: `invalid draft for ${actor.id}` }], formatProfile: "ads-envelope", importMode: "draft" }, actor);
    assert.equal(draft.status, "accepted", brief(draft));
  }
  const stored = (await h.store.read())!;
  let reads = 0;
  const adapter: TransactionalStore = { read: async () => { reads++; return stored; }, transact: update => h.store.transact(update) };
  const service = new CommandService(adapter, { createId: h.createId, digest });
  const owner = await service.getAuthoringSnapshot(OWNER);
  assert.equal(reads, 1);
  assert.equal(owner.project!.revision, owner.authoring.revision);
  assert.equal(owner.authoring.pendingCandidates[0]!.id, candidate.candidateId);
  assert.equal(canonicalJson(owner).includes(approval.reviewToken!), false);
  assert.equal(owner.sourceDrafts.length, 1);
  assert.equal(owner.sourceDrafts[0]!.actorId, OWNER.id);
  assert.equal(owner.sourceDrafts[0]!.originalText, `invalid draft for ${OWNER.id}`);
  assert.deepEqual(owner.authoring, await h.service.getAuthoringState(OWNER));
  owner.project!.name = "Detached name";
  owner.authoring.pendingCandidates[0]!.diff.length = 0;
  owner.authoring.pendingCandidates[0]!.diagnostics.length = 0;
  owner.sourceDrafts[0]!.originalText = "Detached draft";
  assert.deepEqual(stored, await h.store.read());
  const other = await service.getAuthoringSnapshot(OTHER);
  assert.deepEqual(other.authoring.pendingCandidates, []);
  assert.equal(other.sourceDrafts.length, 1);
  assert.equal(other.sourceDrafts[0]!.actorId, OTHER.id);
  const applied = await h.execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approval.reviewToken!, expectedRevision: (await h.current())! });
  assert.equal(applied.status, "accepted", brief(applied));
  const adopted = await h.service.getAuthoringSnapshot(OWNER);
  assert.equal(adopted.project!.revision, adopted.authoring.revision);
  assert.ok(adopted.authoring.undoHandle);
  assert.equal((await h.service.getAuthoringSnapshot(OTHER)).authoring.undoHandle, undefined);
});

test("authoring snapshots authenticate before I/O and capture actor identity before an awaited read", async () => {
  const h = await setup(false), candidate = await h.stage(h.starter);
  let reads = 0, release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const adapter: TransactionalStore = { read: async () => { reads++; await wait; return h.store.read(); }, transact: update => h.store.transact(update) };
  const service = new CommandService(adapter, { createId: h.createId, digest });
  await assert.rejects(service.getAuthoringSnapshot({ id: OWNER.id, scopes: [] }), { code: "SCOPE_REQUIRED" });
  assert.equal(reads, 0);
  const identity = { ...OWNER }, pending = service.getAuthoringSnapshot(identity);
  assert.equal(reads, 1);
  identity.id = OTHER.id;
  release();
  assert.equal((await pending).authoring.pendingCandidates[0]!.id, candidate.candidateId);
  const empty = new CommandService(new MemoryStore(), { createId: h.createId, digest });
  assert.deepEqual(await empty.getAuthoringSnapshot(OWNER), { project: null, authoring: { revision: null, pendingCandidates: [] }, sourceDrafts: [] });
});

test("token alias/theme edits remain transient until apply and one Undo preserves original source", async () => {
  const h = await setup();
  const before = await h.project();
  const original = before.documents["foundation.system"]!.originalText;
  const plan = planStudioEdit(before, { kind: "token-value", id: "token.accent", value: { literal: { colorSpace: "srgb", components: [1, 0, 0] } } }, h.createId);
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics));
  assert.ok(plan.impact.some(item => item.componentId === "component.button"));
  assert.equal(canonicalJson(await h.project()), canonicalJson(before));
  assert.equal(inspectStudioProject(plan.project).components[0]!.web.parts["component.button.root"]!.base.background, "rgba(255, 0, 0, 1)");
  const applied = await h.adopt(await h.stagePlan(plan, "ads-envelope"));
  const adopted = await h.project();
  assert.equal(adopted.documents["foundation.system"]!.validationProfile, STUDIO_PROFILE);
  assert.equal(adopted.documents["foundation.system"]!.originalText, original);
  const undo = await h.execute("transaction.undo", { undoHandle: applied.undoHandle!, expectedRevision: adopted.revision });
  assert.equal(undo.status, "accepted");
  assert.equal(canonicalJson((await h.project()).documents), canonicalJson(before.documents));
  const redo = await h.execute("transaction.redo", { redoHandle: undo.redoHandle!, expectedRevision: (await h.current())! });
  assert.equal(redo.status, "accepted");
  assert.equal(canonicalJson((await h.project()).documents), canonicalJson(adopted.documents));
});

test("stale editor plans and stale approved candidates cannot overwrite a newer source", async () => {
  const h = await setup(); const before = await h.project();
  const first = planStudioEdit(before, { kind: "component-name", id: "component.button", name: "First" }, h.createId);
  const stale = planStudioEdit(before, { kind: "component-name", id: "component.button", name: "Stale" }, h.createId);
  const staleCandidate = await h.stagePlan(stale); const staleApproval = await h.approve(staleCandidate);
  await h.adopt(await h.stagePlan(first));
  assert.equal((await h.stagePlan(stale)).status, "conflict");
  const rejected = await h.execute("transaction.apply", { candidateId: staleCandidate.candidateId!, approvalToken: staleApproval.reviewToken!, expectedRevision: (await h.current())! });
  assert.equal(rejected.status, "conflict");
  assert.equal((await h.project()).documents["component.button"]!.document.name, "First");
});

test("strong Studio policy survives lower-format update and rejects unsupported used colors before publication", async () => {
  const h = await setup(); const before = await h.project();
  const source = structuredClone(before.documents["foundation.system"]!.document);
  source.revision = h.createId();
  records(source.tokens)[0]!.value = { literal: { colorSpace: "display-p3", components: [0.2, 0.4, 0.6] } };
  assert.equal(inspectStudioDocument(source).valid, true);
  const result = await h.stage([source], "update", "ads-envelope");
  assert.equal(result.status, "rejected", brief(result));
  assert.ok(result.diagnostics.some(item => item.code === "STUDIO_UNSUPPORTED"));
  assert.equal(canonicalJson((await h.project()).documents), canonicalJson(before.documents));
  assert.equal((await h.service.getAuthoringState(OWNER)).pendingCandidates.length, 0);
});

test("deleting a required design or Foundation fails on the complete unchanged dependent graph", async () => {
  const h = await setup(); const before = await h.project();
  for (const [id, kind] of [["foundation.system", "foundation"], ["design.button.mobile", "design"]]) {
    const result = await h.execute("entity.delete", { refs: [{ id: id!, expectedKind: kind! }] });
    assert.equal(result.status, "rejected", id);
    assert.equal(canonicalJson((await h.project()).documents), canonicalJson(before.documents));
  }
});

test("new Foundation reference revision pins are checked by the authoritative stage boundary", async () => {
  const h = await setup(); const project = await h.project();
  const design = structuredClone(project.documents["design.button.web"]!.document);
  design.revision = h.createId();
  (design.foundationRef as JsonObject).revision = "stale.foundation.revision";
  const result = await h.stage([design], "update");
  assert.equal(result.status, "rejected", brief(result));
  assert.ok(result.diagnostics.some(item => item.severity === "error"));
});

test("direct project projection rejects mismatched component Ref kind and stale component pins", async () => {
  const h = await setup();
  for (const fields of [{ expectedKind: "foundation" }, { revision: "stale.component.revision" }]) {
    const project = await h.project();
    Object.assign(project.documents["design.button.web"]!.document.componentRef as JsonObject, fields);
    assert.equal(inspectStudioProject(project).valid, false, JSON.stringify(fields));
  }
});

test("malformed editor inputs and unknown edit kinds return invalid reports without touching source", async () => {
  const h = await setup(); const project = await h.project(); const before = canonicalJson(project);
  assert.doesNotThrow(() => assert.equal(inspectStudioDocument({ ...h.starter[1], publicContract: { values: [], events: [], variants: [{}] } }).valid, false));
  const cycle = {} as ProjectSnapshot; (cycle as unknown as { cycle: unknown }).cycle = cycle;
  assert.doesNotThrow(() => assert.equal(inspectStudioProject(cycle).valid, false));
  assert.doesNotThrow(() => assert.equal(planStudioEdit(project, { kind: "unknown", id: "component.button" } as unknown as StudioEdit, h.createId).valid, false));
  assert.doesNotThrow(() => assert.equal(planStudioEdit(project, null as unknown as StudioEdit, h.createId).valid, false));
  assert.equal(canonicalJson(project), before);
});

test("apply and Undo recheck Studio obligations even when an internally corrupted snapshot has a matching digest", async () => {
  const h = await setup(); const before = await h.project();
  const plan = planStudioEdit(before, { kind: "component-name", id: "component.button", name: "Reviewed" }, h.createId);
  const candidate = await h.stagePlan(plan);
  await h.store.transact(state => {
    const stored = state!.candidates.find(item => item.id === candidate.candidateId)!;
    const entry = stored.documents["component.card"]!;
    entry.document.slots = []; entry.currentText = canonicalJson(entry.document);
    stored.digest = digest(canonicalJson({ projectId: stored.projectId, baseRevision: stored.baseRevision, documents: stored.documents, diff: stored.diff }));
    candidate.patchDigest = stored.digest;
    return { state: state!, value: null, changed: true };
  });
  const approval = await h.approve(candidate);
  const rejected = await h.execute("transaction.apply", { candidateId: candidate.candidateId!, approvalToken: approval.reviewToken!, expectedRevision: before.revision });
  assert.equal(rejected.status, "rejected", brief(rejected));
  assert.equal(canonicalJson((await h.project()).documents), canonicalJson(before.documents));
  const adopted = await h.adopt(await h.stagePlan(plan));
  await h.store.transact(state => {
    const entry = state!.undo.at(-1)!.before["component.card"]!;
    entry.document.slots = []; entry.currentText = canonicalJson(entry.document);
    return { state: state!, value: null, changed: true };
  });
  const undo = await h.execute("transaction.undo", { undoHandle: adopted.undoHandle!, expectedRevision: (await h.current())! });
  assert.equal(undo.status, "rejected", brief(undo));
  assert.equal((await h.project()).documents["component.button"]!.document.name, "Reviewed");
});

test("all six variant-state presentations retain complete styles and reject combination-only conflicts", async () => {
  const h = await setup(); const project = await h.project();
  const design = project.documents["design.button.web"]!.document;
  records(design.appearance).push(
    { id: "rule.filled", targetPartRef: "component.button.root", variants: { variant: "filled" }, states: {}, declarations: { fontSize: { value: 18, unit: "px" } }, explicitPriority: 0, refines: [] },
    { id: "rule.disabled", targetPartRef: "component.button.root", variants: {}, states: { disabled: true }, declarations: { opacity: 0.4 }, explicitPriority: 0, refines: [] },
    { id: "rule.pressed", targetPartRef: "component.button.root", variants: {}, states: { pressed: true }, declarations: { opacity: 0.8 }, explicitPriority: 0, refines: [] },
  );
  const projection = inspectStudioProject(project);
  assert.equal(projection.valid, true, JSON.stringify(projection.diagnostics));
  const styles = projection.components.find(component => component.id === "component.button")!.web.parts["component.button.root"]!.combinations;
  assert.deepEqual(Object.keys(styles).sort(), ["filled", "filled-disabled", "filled-pressed", "outlined", "outlined-disabled", "outlined-pressed"]);
  assert.equal(styles["filled-disabled"].fontSize, 18);
  assert.equal(styles["filled-disabled"].opacity, 0.4);
  assert.equal(styles["outlined-disabled"].fontSize, 16);
  assert.equal(styles["outlined-disabled"].opacity, 0.4);
  assert.equal(styles["outlined-pressed"].opacity, 0.8);
  assert.equal(styles["outlined-disabled"].background, styles.outlined.background);
  records(design.appearance).push({ id: "rule.outlined.opacity", targetPartRef: "component.button.root", variants: { variant: "outlined" }, states: {}, declarations: { opacity: 0.9 }, explicitPriority: 0, refines: [] });
  assert.equal(inspectStudioProject(project).valid, false);
  design.revision = h.createId();
  assert.equal((await h.stage([design], "update")).status, "rejected");
});

test("prototype-named theme contexts are ordinary own data during planning and source adoption", async () => {
  const h = await setup(); const initial = await h.project();
  const foundation = structuredClone(initial.documents["foundation.system"]!.document);
  const axis = records(foundation.themeAxes)[0]!;
  (axis.contexts as string[]).push("__proto__", "constructor");
  foundation.revision = h.createId();
  await h.adopt(await h.stage([foundation], "update"));
  const project = await h.project();
  const beforePrototype = Object.getOwnPropertyDescriptors(Object.prototype);
  const plan = planStudioEdit(project, { kind: "theme-value", axisId: "axis.scheme", context: "__proto__", id: "token.accent", value: { literal: { colorSpace: "srgb", components: [0, 1, 0] } } }, h.createId, { contexts: { "axis.scheme": "__proto__" } });
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics));
  const changedAxis = records(plan.updates[0]!.document.themeAxes)[0]!;
  assert.equal(Object.hasOwn(changedAxis.overrides as JsonObject, "__proto__"), true);
  assert.equal(Object.getPrototypeOf(Object.prototype), null);
  assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), beforePrototype);
  await h.adopt(await h.stagePlan(plan));
  assert.equal(inspectStudioProject(await h.project(), { contexts: { "axis.scheme": "__proto__" } }).components.find(item => item.archetype === "button")!.web.parts["component.button.root"]!.base.background, "rgba(0, 255, 0, 1)");
});

test("malformed JSON enum objects produce diagnostics and capturable drafts instead of primitive-coercion exceptions", async () => {
  const h = await setup(false);
  const hostile = { toString: null, valueOf: null };
  const component = structuredClone(h.starter.find(item => item.id === "component.button")!);
  records((component.publicContract as JsonObject).variants)[0]!.default = hostile;
  const designMutations: ((document: AdsDocument) => void)[] = [
    document => { records(document.nodeMappings)[0]!.role = hostile; },
    document => { records(document.layout)[0]!.axis = hostile; },
    document => { (records(document.appearance)[0]!.variants as JsonObject).variant = hostile; },
  ];
  const invalid = [component, ...designMutations.map(mutate => { const document = structuredClone(h.starter.find(item => item.id === "design.button.web")!); mutate(document); return document; })];
  for (const document of invalid) assert.doesNotThrow(() => assert.equal(inspectStudioDocument(document).valid, false));
  const original = canonicalJson(component);
  const captured = await h.execute("document.import", { sourceRefs: [{ uri: "studio:broken-enum", content: original }], formatProfile: STUDIO_FORMAT, importMode: "draft" });
  assert.equal(captured.status, "accepted", brief(captured));
  const draft = (await h.service.listDrafts(OWNER))[0]!;
  assert.equal(draft.validation, "invalid"); assert.equal(draft.validationProfile, STUDIO_PROFILE); assert.equal(draft.originalText, original);
  const rejected = await h.stage([component]);
  assert.equal(rejected.status, "rejected", brief(rejected));
  assert.equal(Object.keys((await h.project()).documents).length, 0);
  const repaired = await h.execute("document.import", { sourceRefs: h.starter.map(document => ({ uri: `studio:${document.id}`, content: canonicalJson(document), ...(document.id === component.id ? { draftId: draft.id } : {}) })), formatProfile: STUDIO_FORMAT, importMode: "review" });
  await h.adopt(repaired);
  assert.equal((await h.project()).documents[component.id]!.originalText, original);
  assert.equal(inspectStudioProject(await h.project()).valid, true);
});

test("Studio graph rejects oversized theme evaluation sets before they can become candidates", async () => {
  const h = await setup(); const before = await h.project();
  const foundation = structuredClone(before.documents["foundation.system"]!.document);
  const sample = records(foundation.themeSets)[0]!;
  foundation.themeSets = Array.from({ length: 33 }, (_, index) => ({ ...sample, id: `theme.bound.${index}` }));
  foundation.revision = h.createId();
  const report = inspectStudioDocument(foundation);
  assert.equal(report.valid, false);
  assert.ok(report.diagnostics.some(item => item.path === "/themeSets" && item.severity === "error"));
  const projection = inspectStudioProject({ ...before, documents: { ...before.documents, [foundation.id]: { ...before.documents[foundation.id]!, document: foundation } } });
  assert.equal(projection.valid, false); assert.deepEqual(projection.components, []);
  assert.equal((await h.stage([foundation], "update")).status, "rejected");
});

test("public projection rejects malformed project headers and cross-component duplicate stable IDs", async () => {
  const h = await setup(); const project = await h.project();
  for (const patch of [{ id: "__proto__" }, { revision: 42 }, { name: null }]) assert.equal(inspectStudioProject({ ...project, ...patch } as ProjectSnapshot).valid, false, JSON.stringify(patch));
  for (const entry of Object.values(project.documents)) if (entry.document.id === "component.card" || entry.document.id.startsWith("design.card.")) {
    entry.document = JSON.parse(canonicalJson(entry.document).replaceAll('"component.card.body"', '"component.button.label"')) as AdsDocument;
    entry.currentText = canonicalJson(entry.document);
  }
  assert.equal(inspectStudioProject(project).valid, false, "Stable IDs must remain globally unambiguous in direct target input.");
});
