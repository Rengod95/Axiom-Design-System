import { canonicalJson, CommandService, createStudioStarter, inspectStudioProject, planStudioEdit, PROTOCOL_VERSION } from "../../../modules/ads-core/src/index.ts";
import type { CommandEnvelope, CommandResult, Diagnostic, JsonObject, KernelServices, Principal, ProjectSnapshot, StudioEdit, StudioEditPlan, StudioProjection, StudioSelection } from "../../../modules/ads-core/src/index.ts";
import type { MessageKey } from "./locales.ts";

export const STUDIO_PRINCIPAL: Principal = { id: "studio.local", scopes: ["project.read", "project.write", "review.apply"] };
export interface ReviewSummary { id: string; baseRevision: string; digest: string; status: string; diff: CommandResult["diff"]; diagnostics: Diagnostic[] }
export interface AuthoringView { revision: string | null; pendingCandidates: ReviewSummary[]; undoHandle?: string; redoHandle?: string }
export interface StudioState {
  loading: boolean; busy: boolean; project: ProjectSnapshot | null; projection: StudioProjection | null;
  plan: StudioEditPlan | null; selection: StudioSelection; authoring: AuthoringView;
  candidate: ReviewSummary | null; buffers: Record<string, string>; pendingBuffers: string[];
  diagnostics: Diagnostic[]; error: string | null; message: MessageKey | null; retryable: boolean;
}
interface Retry { command: CommandEnvelope; after: (result: CommandResult) => Promise<void> }
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
  #intents: StudioEdit[] = [];
  #state: StudioState = { loading: true, busy: false, project: null, projection: null, plan: null, selection: {}, authoring: { revision: null, pendingCandidates: [] }, candidate: null, buffers: {}, pendingBuffers: [], diagnostics: [], error: null, message: null, retryable: false };

  constructor(service: CommandService, services: KernelServices, principal = STUDIO_PRINCIPAL) { this.#service = service; this.#services = services; this.#principal = principal; }
  getSnapshot = (): StudioState => this.#state;
  subscribe = (listener: () => void): (() => void) => { this.#listeners.add(listener); return () => { this.#listeners.delete(listener); }; };
  get dirty(): boolean { return this.#state.plan !== null || this.#state.pendingBuffers.length > 0 || this.#state.error === "STUDIO_INPUT_INVALID"; }
  inputError(): void { if (!this.#state.busy && !this.#retry && !this.#state.candidate) this.#patch({ error: "STUDIO_INPUT_INVALID", message: "invalidValue" }); }
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
  async #load(clearDraft = false): Promise<void> {
    const project = await this.#service.getProject(this.#principal);
    const authoring = await this.#service.getAuthoringState(this.#principal);
    if (!clearDraft && this.dirty && project?.revision !== this.#state.project?.revision) {
      this.#patch({ authoring, error: "REVISION_CONFLICT", message: "conflict" });
      return;
    }
    const shown = !clearDraft && this.#state.plan ? this.#state.plan.project : project;
    const projection = shown && Object.keys(shown.documents).length ? inspectStudioProject(shown, this.#state.selection) : null;
    this.#patch({ project, authoring, projection, diagnostics: projection?.diagnostics ?? [], ...(clearDraft ? { plan: null, candidate: null, buffers: {}, pendingBuffers: [] } : {}) });
    if (clearDraft) this.#intents = [];
  }
  connect(): Promise<void> { return this.#run(() => this.#load()); }
  refresh(): Promise<void> {
    if (this.dirty || this.#state.candidate || this.#retry) return Promise.resolve();
    return this.#run(() => this.#load());
  }
  retry(): Promise<void> { const retry = this.#retry; return retry ? this.#run(() => this.#send(retry.command, retry.after), true) : this.refresh(); }

  createProject(name: string): Promise<void> {
    if (this.#state.project && Object.keys(this.#state.project.documents).length) return Promise.resolve();
    return this.#run(async () => {
      const start = async (): Promise<void> => {
        const project = this.#state.project;
        if (!project) throw new Error("Project creation failed.");
        const documents = createStudioStarter(project.id);
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
    if (this.#state.busy || this.#retry || !this.#state.project || this.#state.candidate) return;
    try {
      const working = this.#state.plan?.project ?? this.#state.project;
      const next = planStudioEdit(working, edit, () => this.#services.createId(), this.#state.selection);
      if (!next.valid) { this.#patch({ diagnostics: next.diagnostics, error: "STUDIO_EDIT_INVALID", message: "invalidValue" }); return; }
      if (edit.kind !== "source" && next.updates.some(update => this.#state.pendingBuffers.includes(update.document.id))) {
        this.#patch({ error: "STUDIO_INPUT_INVALID", message: "previewSource" }); return;
      }
      const base = this.#state.project;
      const updates = Object.values(next.project.documents).filter(entry => {
        const previous = base.documents[entry.document.id];
        return previous && canonicalJson(previous.document) !== canonicalJson(entry.document);
      }).map(entry => ({ document: entry.document, expectedRevision: base.documents[entry.document.id]!.document.revision }));
      const impact = [...new Map([...(this.#state.plan?.impact ?? []), ...next.impact].map(usage => [canonicalJson(usage), usage])).values()];
      const plan: StudioEditPlan = { ...next, baseRevision: base.revision, updates, impact };
      const previousIntent = this.#intents.at(-1), key = intentKey(edit);
      if (previousIntent && key !== null && key === intentKey(previousIntent)) this.#intents[this.#intents.length - 1] = edit;
      else this.#intents.push(edit);
      const buffers = { ...this.#state.buffers };
      if (edit.kind === "source") buffers[edit.id] = edit.source;
      else for (const update of updates) if (!this.#state.pendingBuffers.includes(update.document.id)) delete buffers[update.document.id];
      this.#patch({ plan, projection: inspectStudioProject(plan.project, this.#state.selection), buffers, pendingBuffers: edit.kind === "source" ? this.#state.pendingBuffers.filter(id => id !== edit.id) : this.#state.pendingBuffers, diagnostics: next.diagnostics, error: null, message: null });
    } catch { this.#patch({ error: "STUDIO_EDIT_INVALID", message: "invalidValue" }); }
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
      if (!plan?.valid || !project || !plan.updates.length || this.#state.pendingBuffers.length || this.#state.error) return;
      const sourceRefs = plan.updates.map(({ document, expectedRevision }) => ({ uri: project.documents[document.id]?.currentSourceUri ?? project.documents[document.id]?.sourceUri ?? `axiom:studio/${document.id}`, content: JSON.stringify(document, null, 2), expectedRevision }));
      await this.#send(this.#command("document.import", { sourceRefs, formatProfile: "ads-studio", importMode: "update" }, project.id, plan.baseRevision), async result => {
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
    return this.#run(async () => {
      const intents = [...this.#intents], buffers = this.#state.buffers, pendingBuffers = this.#state.pendingBuffers;
      await this.#load(true);
      // This is an explicit new comparison, not automatic conflict resolution.
      this.#patch({ busy: false });
      for (const intent of intents) this.edit(intent);
      this.#patch({ busy: true, buffers, pendingBuffers, message: "reviewPending" });
    });
  }
  undo(): Promise<void> { return this.#history("undo"); }
  redo(): Promise<void> { return this.#history("redo"); }
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
