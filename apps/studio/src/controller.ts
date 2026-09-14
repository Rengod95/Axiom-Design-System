import { canonicalJson, CommandService, createStudioStarter, inspectStudioProject, planStudioEdit, planFoundationEdit, planStudioComponentCreate, planStudioComponentDuplicate, planStudioComponentDelete, planStudioComponentBatch, PROTOCOL_VERSION } from "../../../modules/ads-core/src/index.ts";
import type { CommandEnvelope, CommandResult, Diagnostic, JsonObject, KernelServices, Principal, ProjectSnapshot, StudioEdit, StudioEditPlan, StudioProjection, StudioSelection, FoundationAuthoringEdit, StudioComponentEdit, StudioComponentPlan } from "../../../modules/ads-core/src/index.ts";
import type { MessageKey } from "./locales.ts";
import type { FoundationStarterOptions } from "../../../modules/ads-core/src/index.ts";

export const STUDIO_PRINCIPAL: Principal = { id: "studio.local", scopes: ["project.read", "project.write", "review.apply"] };
export interface ReviewSummary { id: string; baseRevision: string; digest: string; status: string; diff: CommandResult["diff"]; diagnostics: Diagnostic[] }
export interface AuthoringView { revision: string | null; pendingCandidates: ReviewSummary[]; undoHandle?: string; redoHandle?: string }
export interface WorkbenchPlan extends StudioEditPlan { changes?: StudioComponentPlan["changes"] }
export interface StudioState {
  loading: boolean; busy: boolean; project: ProjectSnapshot | null; projection: StudioProjection | null;
  plan: WorkbenchPlan | null; selection: StudioSelection; authoring: AuthoringView;
  candidate: ReviewSummary | null; buffers: Record<string, string>; pendingBuffers: string[];
  diagnostics: Diagnostic[]; error: string | null; message: MessageKey | null; retryable: boolean;
}
interface Retry { command: CommandEnvelope; after: (result: CommandResult) => Promise<void> }
interface EditIntent { key: string | null; sourceEdit?: { id: string; source: string }; plan(project: ProjectSnapshot, selection: StudioSelection): StudioEditPlan | StudioComponentPlan }
const intentKey = (edit: StudioEdit): string | null => {
  if (edit.kind === "token-create") return null;
  return canonicalJson(Object.fromEntries(Object.entries(edit).filter(([key]) => !["value", "name", "source"].includes(key))));
};

/** Browser views observe this controller; only the public command service writes ADS. */
export class StudioController {
  readonly #service: CommandService;
  readonly #services: KernelServices;
  readonly #principal: Principal;
  readonly #listeners = new Set<() => void>();
  #retry: Retry | null = null;
  #intents: EditIntent[] = [];
  #draftHistory: { state: StudioState; intents: EditIntent[] }[] = [];
  #draftFuture: { state: StudioState; intents: EditIntent[] }[] = [];
  #refreshing: Promise<void> | null = null;
  #state: StudioState = { loading: true, busy: false, project: null, projection: null, plan: null, selection: {}, authoring: { revision: null, pendingCandidates: [] }, candidate: null, buffers: {}, pendingBuffers: [], diagnostics: [], error: null, message: null, retryable: false };

  constructor(service: CommandService, services: KernelServices, principal = STUDIO_PRINCIPAL) { this.#service = service; this.#services = services; this.#principal = principal; }
  getSnapshot = (): StudioState => this.#state;
  subscribe = (listener: () => void): (() => void) => { this.#listeners.add(listener); return () => { this.#listeners.delete(listener); }; };
  get #unplannedInput(): boolean { return this.#state.pendingBuffers.length > 0 || this.#state.error === "STUDIO_INPUT_INVALID" || this.#state.error === "STUDIO_EDIT_INVALID"; }
  get dirty(): boolean { return this.#state.plan !== null || this.#unplannedInput; }
  get canUndo(): boolean { return !this.#state.busy && !this.#retry && !this.#state.candidate && !this.#unplannedInput && (this.#draftHistory.length > 0 || !this.dirty && Boolean(this.#state.authoring.undoHandle)); }
  get canRedo(): boolean { return !this.#state.busy && !this.#retry && !this.#state.candidate && !this.#unplannedInput && (this.#draftFuture.length > 0 || !this.dirty && Boolean(this.#state.authoring.redoHandle)); }
  inputError(): void { if (!this.#state.busy && !this.#retry && !this.#state.candidate) this.#patch({ error: "STUDIO_INPUT_INVALID", message: "invalidValue" }); }
  clearInputError(): void {
    if (!["STUDIO_INPUT_INVALID", "STUDIO_EDIT_INVALID"].includes(this.#state.error ?? "") || this.#state.pendingBuffers.length) return;
    this.#patch({ error: null, message: null, diagnostics: this.#state.projection?.diagnostics ?? [] });
  }
  #patch(patch: Partial<StudioState>): void { this.#state = { ...this.#state, ...patch }; for (const listener of this.#listeners) listener(); }
  #command(operation: string, payload: JsonObject, projectId = this.#state.project?.id, baseRevision: string | null = this.#state.project?.revision ?? null): CommandEnvelope {
    if (!projectId) throw new Error("Project identity is unavailable.");
    const id = this.#services.createId();
    return { protocolVersion: PROTOCOL_VERSION, commandId: id, actorId: this.#principal.id, projectId, baseRevision, operation, payload, idempotencyKey: id, transactionId: id, origin: "GUI", requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
  }
  async #send(command: CommandEnvelope, after: Retry["after"]): Promise<void> {
    this.#retry = { command, after };
    const result = await this.#service.execute(command, this.#principal);
    this.#retry = null;
    if (result.status === "rejected" || result.status === "conflict") {
      this.#patch({ diagnostics: result.diagnostics, error: result.status === "conflict" ? "REVISION_CONFLICT" : result.diagnostics[0]?.code ?? "COMMAND_REJECTED", message: result.status === "conflict" ? "conflict" : "unknownError" });
      return;
    }
    await after(result);
  }
  async #run(action: () => Promise<void>, replay = false): Promise<void> {
    if (this.#state.busy || this.#retry && !replay) return;
    this.#patch({ busy: true, error: null, message: null });
    try { await action(); }
    catch (error) { this.#patch({ error: error instanceof Error && "code" in error ? String(error.code) : "STUDIO_OPERATION_FAILED", message: "unknownError", retryable: this.#retry !== null }); }
    finally { this.#patch({ busy: false, loading: false, retryable: this.#retry !== null }); }
  }
  async #load(clearDraft = false, isCurrent: () => boolean = () => true): Promise<void> {
    // These public queries are separate reads. Never pair an old document snapshot with new history handles.
    let project = await this.#service.getProject(this.#principal);
    let authoring = await this.#service.getAuthoringState(this.#principal);
    for (let attempt = 1; isCurrent() && authoring.revision !== (project?.revision ?? null) && attempt < 3; attempt++) {
      project = await this.#service.getProject(this.#principal);
      authoring = await this.#service.getAuthoringState(this.#principal);
    }
    if (!isCurrent()) return;
    if (authoring.revision !== (project?.revision ?? null)) throw Object.assign(new Error("Project changed during the snapshot read."), { code: "REVISION_CONFLICT" });
    if (!clearDraft && this.dirty && project?.revision !== this.#state.project?.revision) {
      this.#patch({ authoring, error: "REVISION_CONFLICT", message: "conflict" });
      return;
    }
    const changedBase = project?.revision !== this.#state.project?.revision;
    const shown = !clearDraft && this.#state.plan ? this.#state.plan.project : project;
    const projection = shown && Object.keys(shown.documents).length ? inspectStudioProject(shown, this.#state.selection) : null;
    if (clearDraft || changedBase) { this.#intents = []; this.#draftHistory = []; this.#draftFuture = []; }
    this.#patch({ project, authoring, projection, diagnostics: projection?.diagnostics ?? [], ...(clearDraft ? { plan: null, candidate: null, buffers: {}, pendingBuffers: [] } : {}) });
  }
  connect(): Promise<void> { return this.#run(() => this.#load()); }
  refresh(): Promise<void> {
    if (this.dirty || this.#state.candidate || this.#retry || this.#state.busy) return Promise.resolve();
    // A read on window focus must not disable every editing control or claim it is saving.
    if (this.#refreshing) return this.#refreshing;
    const started = this.#state;
    this.#refreshing = this.#load(false, () => this.#state === started).catch(() => { if (this.#state === started) this.#patch({ error: "STUDIO_REFRESH_FAILED", message: "unknownError" }); }).finally(() => { this.#refreshing = null; });
    return this.#refreshing;
  }
  retry(): Promise<void> { const retry = this.#retry; return retry ? this.#run(() => this.#send(retry.command, retry.after), true) : this.refresh(); }

  createProject(name: string, starter?: FoundationStarterOptions): Promise<void> {
    if (this.#state.project && Object.keys(this.#state.project.documents).length) return Promise.resolve();
    return this.#run(async () => {
      const start = async (): Promise<void> => {
        const project = this.#state.project;
        if (!project) throw new Error("Project creation failed.");
        const documents = createStudioStarter(project.id, starter);
        const command = this.#command("document.import", { sourceRefs: documents.map(document => ({ uri: `axiom:starter/${document.id}`, content: JSON.stringify(document, null, 2) })), formatProfile: "ads-studio", importMode: "review" });
        await this.#send(command, async result => { await this.#approve(this.#summary(result, project.revision)); });
      };
      if (this.#state.project) { await start(); return; }
      const projectId = this.#services.createId();
      await this.#send(this.#command("project.create", { name: name.trim() }, projectId, null), async () => { await this.#load(true); await start(); });
    });
  }

  setSelection(selection: StudioSelection): void {
    const project = this.#state.plan?.project ?? this.#state.project;
    const projection = project ? inspectStudioProject(project, selection) : null;
    this.#patch({ selection, projection, diagnostics: projection?.diagnostics ?? [] });
  }

  edit(edit: StudioEdit): void {
    const intent = this.#intent(intentKey(edit), (project, selection, ids) => planStudioEdit(project, edit, ids, selection));
    if (edit.kind === "source") intent.sourceEdit = { id: edit.id, source: edit.source };
    this.#editIntent(intent);
  }
  foundation(edit: FoundationAuthoringEdit | FoundationAuthoringEdit[]): string[] {
    let created: string[] = [];
    const accepted = this.#editIntent(this.#intent(null, (project, selection, ids) => { const plan = planFoundationEdit(project, edit, ids, selection, this.#services.digest); created = plan.createdIds; return plan; }));
    return accepted ? created : [];
  }
  previewFoundation(edit: FoundationAuthoringEdit) {
    const project = this.#state.plan?.project ?? this.#state.project;
    if (!project) return null;
    let next = 0;
    // Preview identities are isolated from the host allocator and never persisted.
    return planFoundationEdit(project, edit, () => `preview.import.${++next}`, this.#state.selection, this.#services.digest);
  }
  createComponent(catalogId: string, name?: string): void { this.#editIntent(this.#intent(null, (project, _selection, ids) => planStudioComponentCreate(project, { catalogId, ...(name ? { name } : {}) }, ids))); }
  duplicateComponent(componentId: string, name?: string): void { this.#editIntent(this.#intent(null, (project, _selection, ids) => planStudioComponentDuplicate(project, { componentId, ...(name ? { name } : {}) }, ids))); }
  deleteComponent(componentId: string): void { this.#editIntent({ key: null, plan: project => planStudioComponentDelete(project, { componentId }) }); }
  component(edits: { componentId: string; edit: StudioComponentEdit }[]): void { this.#editIntent(this.#intent(null, (project, _selection, ids) => planStudioComponentBatch(project, { edits }, ids))); }
  #intent(key: string | null, plan: (project: ProjectSnapshot, selection: StudioSelection, createId: () => string) => StudioEditPlan | StudioComponentPlan): EditIntent {
    const ids: string[] = [];
    return { key, plan: (project, selection) => { let index = 0; return plan(project, selection, () => { const at = index++; return ids[at] ?? (ids[at] = this.#services.createId()); }); } };
  }
  #editIntent(intent: EditIntent, replay = false): boolean {
    if (this.#state.busy && !replay || this.#retry || !this.#state.project || this.#state.candidate) return false;
    const sourceEdit = intent.sourceEdit;
    try {
      const working = this.#state.plan?.project ?? this.#state.project;
      const next = intent.plan(working, this.#state.selection);
      if (!next.valid) { this.#patch({ diagnostics: next.diagnostics, error: "STUDIO_EDIT_INVALID", message: "invalidValue" }); return false; }
      const nextUpdates = "changes" in next ? next.changes.upserts : next.updates;
      if (!nextUpdates.length && !("changes" in next && next.changes.deletes.length)) {
        this.#patch({ diagnostics: next.diagnostics, error: null, message: null, ...(sourceEdit ? { buffers: { ...this.#state.buffers, [sourceEdit.id]: sourceEdit.source }, pendingBuffers: this.#state.pendingBuffers.filter(id => id !== sourceEdit.id) } : {}) });
        return true;
      }
      const touched = new Set([...nextUpdates.map(update => update.document.id), ...Object.keys(working.documents).filter(id => !Object.hasOwn(next.project.documents, id))]);
      if (this.#state.pendingBuffers.some(id => id !== sourceEdit?.id && touched.has(id))) {
        this.#patch({ error: "STUDIO_INPUT_INVALID", message: "previewSource" }); return false;
      }
      const base = this.#state.project;
      const updates = Object.values(next.project.documents).filter(entry => {
        const previous = base.documents[entry.document.id];
        return !previous || canonicalJson(previous.document) !== canonicalJson(entry.document);
      }).map(entry => ({ document: entry.document, expectedRevision: base.documents[entry.document.id]?.document.revision ?? "" }));
      const deletes = Object.values(base.documents).filter(entry => !next.project.documents[entry.document.id]).map(entry => ({ id: entry.document.id, expectedKind: entry.document.kind, revision: entry.document.revision }));
      const impact = [...new Map([...(this.#state.plan?.impact ?? []), ...next.impact].map(usage => [canonicalJson(usage), usage])).values()];
      const mixed = deletes.length > 0 || updates.some(update => !update.expectedRevision);
      const plan: WorkbenchPlan = { valid: next.valid, diagnostics: next.diagnostics, project: next.project, baseRevision: base.revision, updates, impact, ...(mixed ? { changes: { upserts: updates.map(({ document, expectedRevision }) => ({ document, ...(expectedRevision ? { expectedRevision } : {}) })), deletes } } : {}) };
      const previousIntent = this.#intents.at(-1), key = intent.key;
      const coalesce = previousIntent && key !== null && key === previousIntent.key && !this.#draftFuture.length;
      if (!coalesce) this.#draftHistory.push({ state: { ...this.#state, busy: false }, intents: [...this.#intents] });
      if (this.#draftHistory.length > 100) this.#draftHistory.shift();
      this.#draftFuture = [];
      if (coalesce) this.#intents[this.#intents.length - 1] = intent;
      else this.#intents.push(intent);
      const buffers = { ...this.#state.buffers };
      if (sourceEdit) buffers[sourceEdit.id] = sourceEdit.source;
      else for (const update of updates) if (!this.#state.pendingBuffers.includes(update.document.id)) delete buffers[update.document.id];
      const selection = "selection" in next ? next.selection as StudioSelection : this.#state.selection;
      const hasChanges = updates.length > 0 || deletes.length > 0;
      if (!hasChanges) this.#intents = [];
      this.#patch({ plan: hasChanges ? plan : null, selection, projection: inspectStudioProject(plan.project, selection), buffers, pendingBuffers: sourceEdit ? this.#state.pendingBuffers.filter(id => id !== sourceEdit.id) : this.#state.pendingBuffers, diagnostics: next.diagnostics, error: null, message: null });
      return true;
    } catch { this.#patch({ error: "STUDIO_EDIT_INVALID", message: "invalidValue" }); return false; }
  }
  setBuffer(id: string, source: string): void {
    if (this.#state.busy || this.#retry || this.#state.candidate) return;
    this.#patch({ buffers: { ...this.#state.buffers, [id]: source }, pendingBuffers: [...new Set([...this.#state.pendingBuffers, id])], error: null });
  }
  previewBuffer(id: string): void { const source = this.#state.buffers[id]; if (source !== undefined) this.edit({ kind: "source", id, source }); }
  captureBuffer(id: string): Promise<void> {
    return this.#run(async () => {
      const source = this.#state.buffers[id];
      if (source === undefined) return;
      await this.#send(this.#command("document.import", { sourceRefs: [{ uri: `axiom:studio-draft/${id}`, content: source }], formatProfile: "ads-studio", importMode: "draft" }), async () => { this.#patch({ message: "draftCaptured" }); });
    });
  }
  #summary(result: CommandResult, baseRevision: string): ReviewSummary {
    if (result.status !== "reviewRequired" || !result.candidateId || !result.patchDigest) throw new Error("A reviewed proposal was not produced.");
    return { id: result.candidateId, digest: result.patchDigest, baseRevision, status: "pending", diff: result.diff, diagnostics: result.diagnostics };
  }
  review(): Promise<void> {
    if (this.#state.error || this.#state.pendingBuffers.length) return Promise.resolve();
    return this.#run(async () => {
      const { plan, project } = this.#state;
      if (!plan?.valid || !project || !plan.updates.length && !plan.changes?.deletes.length || this.#state.pendingBuffers.length || this.#state.error) return;
      const sourceRefs = plan.updates.map(({ document, expectedRevision }) => ({ uri: project.documents[document.id]?.currentSourceUri ?? project.documents[document.id]?.sourceUri ?? `axiom:studio/${document.id}`, content: JSON.stringify(document, null, 2), expectedRevision }));
      const payload: JsonObject = plan.changes ? { sourceRefs: plan.changes.upserts.map(({ document, expectedRevision }) => ({ uri: `axiom:studio/${document.id}`, content: JSON.stringify(document, null, 2), ...(expectedRevision ? { expectedRevision } : {}) })), deleteRefs: plan.changes.deletes, formatProfile: "ads-studio", importMode: "change" } : { sourceRefs, formatProfile: "ads-studio", importMode: "update" };
      await this.#send(this.#command("document.import", payload, project.id, plan.baseRevision), async result => {
        this.#patch({ candidate: this.#summary(result, plan.baseRevision), message: "reviewPending" });
      });
    });
  }
  resume(candidate: ReviewSummary): void {
    if (this.#state.busy || this.dirty) return;
    this.#patch({ candidate, ...(candidate.baseRevision !== this.#state.project?.revision ? { error: "REVISION_CONFLICT", message: "conflict" as const } : {}) });
  }
  approve(): Promise<void> { return this.#run(async () => { if (this.#state.candidate) await this.#approve(this.#state.candidate); }); }
  async #approve(candidate: ReviewSummary): Promise<void> {
    await this.#send(this.#command("transaction.review", { candidateId: candidate.id, patchDigest: candidate.digest, decision: "approve" }, undefined, candidate.baseRevision), async review => {
      if (!review.reviewToken) throw new Error("Review did not return an approval token.");
      await this.#send(this.#command("transaction.apply", { candidateId: candidate.id, approvalToken: review.reviewToken, expectedRevision: candidate.baseRevision }, undefined, candidate.baseRevision), async () => { await this.#load(true); this.#patch({ message: "changed" }); });
    });
  }
  discard(): Promise<void> {
    return this.#run(async () => {
      const candidate = this.#state.candidate;
      if (candidate) await this.#send(this.#command("transaction.review", { candidateId: candidate.id, patchDigest: candidate.digest, decision: "reject" }), async () => { await this.#load(true); });
      else await this.#load(true);
    });
  }
  rebase(): Promise<void> {
    const previous = this.#state, intents = [...this.#intents], history = [...this.#draftHistory], future = [...this.#draftFuture];
    return this.#run(async () => {
      await this.#load(true);
      // This is an explicit new comparison, not automatic conflict resolution.
      // A selected context/set may itself be created or renamed by a later intent.
      this.#patch({ selection: {} });
      for (const intent of intents) {
        if (this.#editIntent(intent, true)) continue;
        const { authoring, diagnostics } = this.#state;
        this.#intents = intents; this.#draftHistory = history; this.#draftFuture = future;
        this.#patch({ ...previous, busy: true, authoring, diagnostics, error: "REVISION_CONFLICT", message: "conflict" });
        return;
      }
      const shown = this.#state.plan?.project ?? this.#state.project;
      const selected = shown ? inspectStudioProject(shown, previous.selection) : null;
      this.#patch({ ...(selected?.valid ? { selection: previous.selection, projection: selected } : {}), buffers: previous.buffers, pendingBuffers: previous.pendingBuffers, ...(previous.error === "STUDIO_INPUT_INVALID" || previous.error === "STUDIO_EDIT_INVALID" ? { error: previous.error, message: "invalidValue" as const } : { message: "reviewPending" as const }) });
    });
  }
  undo(): Promise<void> { return this.#draftStep("undo") ? Promise.resolve() : this.#history("undo"); }
  redo(): Promise<void> { return this.#draftStep("redo") ? Promise.resolve() : this.#history("redo"); }
  #draftStep(kind: "undo" | "redo"): boolean {
    if (this.#state.busy || this.#retry || this.#state.candidate || this.#unplannedInput) return false;
    const source = kind === "undo" ? this.#draftHistory : this.#draftFuture, destination = kind === "undo" ? this.#draftFuture : this.#draftHistory;
    const previous = source.pop(); if (!previous) return false;
    destination.push({ state: this.#state, intents: this.#intents }); this.#intents = previous.intents;
    this.#patch({ ...previous.state, authoring: this.#state.authoring, ...(this.#state.error === "REVISION_CONFLICT" ? { error: "REVISION_CONFLICT", message: "conflict" as const } : { message: kind === "undo" ? "undone" : "redone" }) }); return true;
  }
  #history(kind: "undo" | "redo"): Promise<void> {
    if (this.dirty || this.#state.candidate) return Promise.resolve();
    return this.#run(async () => {
      if (this.dirty || this.#state.candidate) return;
      const handle = kind === "undo" ? this.#state.authoring.undoHandle : this.#state.authoring.redoHandle;
      if (!handle) return;
      const payload = kind === "undo" ? { undoHandle: handle, expectedRevision: this.#state.project!.revision } : { redoHandle: handle, expectedRevision: this.#state.project!.revision };
      await this.#send(this.#command(`transaction.${kind}`, payload), async () => { await this.#load(true); this.#patch({ message: kind === "undo" ? "undone" : "redone" }); });
    });
  }
  exportProject() { return this.#service.exportBundle(this.#principal); }
  exportSource(id: string) { return this.#service.exportDocument(id, this.#principal); }
}
