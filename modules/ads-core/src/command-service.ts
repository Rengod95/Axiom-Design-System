import type { Candidate, CommandEnvelope, CommandResult, DocumentEntry, HistoryEntry, JsonObject, KernelServices, KernelState, Principal, ProjectSnapshot, TransactionalStore, UndoEntry } from "./contracts.ts";
import { CODE, KERNEL_FORMAT_VERSION, MAX_BATCH_BYTES, MAX_BATCH_DOCUMENTS, MAX_COMMAND_BYTES, OPERATION_SCOPES, PROTOCOL_VERSION } from "./constants.ts";
import { canonicalJson } from "./canonical-json.ts";
import { isObject, isValidId, parseDocument, validateReferences } from "./documents.ts";
import { KernelError } from "./kernel-error.ts";

const ENVELOPE_FIELDS = new Set(["protocolVersion", "commandId", "actorId", "projectId", "baseRevision", "operation", "payload", "idempotencyKey", "origin", "transactionId", "requestedScopes"]);
const ORIGINS = new Set(["GUI", "internalAI", "externalAPI"]);

function initialState(): KernelState {
  return { formatVersion: KERNEL_FORMAT_VERSION, project: null, candidates: [], receipts: [], undo: [], redo: [], history: [] };
}

function result(status: CommandResult["status"], revision: string | null = null): CommandResult {
  return { status, revision, diagnostics: [], affectedRefs: [], diff: [] };
}

function failure(code: string, message: string, revision: string | null = null, conflict = false): CommandResult {
  return { ...result(conflict ? "conflict" : "rejected", revision), diagnostics: [new KernelError(code, message).toDiagnostic()] };
}

function requirePayload(payload: JsonObject, keys: string[]): void {
  if (Object.keys(payload).some((key) => !keys.includes(key))) throw new KernelError(CODE.PAYLOAD_INVALID, "Payload includes fields outside this bounded operation.");
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new KernelError(CODE.PAYLOAD_INVALID, `${label} must be a nonempty string.`);
  return value;
}

/** Authenticate current authority before any snapshot or receipt is exposed. */
function authorize(principal: Principal, requiredScope: string): void {
  if (!principal || !isValidId(principal.id) || !Array.isArray(principal.scopes) || principal.scopes.some((scope) => typeof scope !== "string")) throw new KernelError(CODE.AUTH_INVALID, "A trusted authenticated principal is required.");
  if (!principal.scopes.includes(requiredScope)) throw new KernelError(CODE.SCOPE_REQUIRED, "Current principal lacks a required scope.");
}

function validateEnvelope(envelope: CommandEnvelope, principal: Principal): string {
  const canonical = canonicalJson(envelope);
  if (new TextEncoder().encode(canonical).length > MAX_COMMAND_BYTES) throw new KernelError(CODE.JSON_LIMIT, "Command exceeds the profile byte limit.");
  if (!isObject(envelope) || Object.keys(envelope).some((key) => !ENVELOPE_FIELDS.has(key))
    || !isValidId(envelope.commandId) || !isValidId(envelope.actorId) || !isValidId(envelope.projectId) || !isValidId(envelope.transactionId)
    || !(envelope.baseRevision === null || isValidId(envelope.baseRevision)) || !isObject(envelope.payload)
    || typeof envelope.operation !== "string" || !Array.isArray(envelope.requestedScopes) || envelope.requestedScopes.some((scope) => typeof scope !== "string")
    || !ORIGINS.has(envelope.origin) || typeof envelope.idempotencyKey !== "string" || !envelope.idempotencyKey.trim()) throw new KernelError(CODE.ENVELOPE_INVALID, "Invalid command envelope.");
  if (envelope.protocolVersion !== PROTOCOL_VERSION) throw new KernelError(CODE.PROTOCOL_UNSUPPORTED, "Unsupported document-kernel protocol version.");
  const scope = Object.hasOwn(OPERATION_SCOPES, envelope.operation) ? OPERATION_SCOPES[envelope.operation] : undefined;
  if (!scope) throw new KernelError(CODE.OPERATION_UNSUPPORTED, "Operation is not implemented by the document-kernel profile.");
  authorize(principal, scope);
  if (envelope.actorId !== principal.id) throw new KernelError(CODE.ACTOR_MISMATCH, "Envelope actor must match the authenticated principal.");
  if (!envelope.requestedScopes.includes(scope) || envelope.requestedScopes.some((requested) => !principal.scopes.includes(requested))) throw new KernelError(CODE.SCOPE_REQUIRED, "Requested scopes are missing or not currently authorized.");
  if (envelope.operation !== "project.create") authorize(principal, "project.read");
  return canonicalJson({ operation: envelope.operation, payload: envelope.payload, baseRevision: envelope.baseRevision, transactionId: envelope.transactionId, requestedScopes: envelope.requestedScopes, protocolVersion: envelope.protocolVersion });
}

/** Reject incompatible persisted formats rather than silently starting over. */
function checkedState(state: KernelState | null): KernelState {
  if (state === null) return initialState();
  if (state.formatVersion !== KERNEL_FORMAT_VERSION || !Array.isArray(state.candidates) || !Array.isArray(state.receipts)
    || !Array.isArray(state.undo) || !Array.isArray(state.redo) || !Array.isArray(state.history)) throw new KernelError(CODE.STATE_INVALID, "Invalid or unsupported kernel state.");
  if (state.project && (!isValidId(state.project.id) || !isValidId(state.project.revision) || !isObject(state.project.documents))) throw new KernelError(CODE.STATE_INVALID, "Invalid project snapshot.");
  return structuredClone(state);
}

/** Reduce commands atomically through a persistence adapter; no domain execution. */
export class CommandService {
  #store: TransactionalStore;
  #services: KernelServices;
  constructor(store: TransactionalStore, services: KernelServices) { this.#store = store; this.#services = services; }

  /** Return exact authorized receipts before create/stale checks; persist before success. */
  async execute(input: CommandEnvelope, identity: Principal): Promise<CommandResult> {
    let envelope: CommandEnvelope;
    let principal: Principal;
    let digest: string;
    try {
      const request = validateEnvelope(input, identity);
      envelope = structuredClone(input);
      principal = structuredClone(identity);
      digest = this.#services.digest(request);
    } catch (error) {
      if (error instanceof KernelError) return failure(error.code, error.message);
      throw error;
    }
    return this.#store.transact((stored) => {
      const state = checkedState(stored);
      const old = state.receipts.find((receipt) => receipt.projectId === envelope.projectId && receipt.principalId === principal.id && receipt.key === envelope.idempotencyKey);
      if (old) {
        try { authorize(principal, "project.read"); }
        catch (error) {
          if (!(error instanceof KernelError)) throw error;
          return { state, changed: false, value: failure(error.code, error.message) };
        }
        return { state, changed: false, value: old.requestDigest === digest ? structuredClone(old.result) : failure(CODE.IDEMPOTENCY_CONFLICT, "Idempotency key belongs to a different request.", state.project?.revision ?? null, true) };
      }
      let outcome: CommandResult;
      try { outcome = this.#reduce(state, envelope, principal); }
      catch (error) {
        if (!(error instanceof KernelError)) throw error;
        // A rejected reducer must never publish partially modified candidates or state.
        return { state: checkedState(stored), changed: false, value: failure(error.code, error.message, state.project?.revision ?? null, error.code === CODE.REVISION_CONFLICT) };
      }
      if (!state.project) return { state, changed: false, value: outcome };
      state.receipts.push({ projectId: envelope.projectId, principalId: principal.id, key: envelope.idempotencyKey, requestDigest: digest, result: structuredClone(outcome) });
      return { state, changed: true, value: structuredClone(outcome) };
    });
  }

  /** Read only through a currently authorized principal, returning isolated data. */
  async getProject(principal: Principal): Promise<ProjectSnapshot | null> {
    authorize(principal, "project.read");
    return structuredClone(checkedState(await this.#store.read()).project);
  }

  /** Return one source-preserving unverified document, or null when absent. */
  async getDocument(id: string, principal: Principal): Promise<DocumentEntry | null> {
    const project = await this.getProject(principal);
    return project && Object.hasOwn(project.documents, id) ? structuredClone(project.documents[id]!) : null;
  }

  /** History records document revisions; candidate approvals do not invent revisions. */
  async getHistory(principal: Principal): Promise<HistoryEntry[]> {
    authorize(principal, "project.read");
    return structuredClone(checkedState(await this.#store.read()).history);
  }

  #id(): string {
    const id = this.#services.createId();
    if (!isValidId(id)) throw new KernelError(CODE.STATE_INVALID, "Identity service returned an invalid identifier.");
    return id;
  }

  #candidateDigest(candidate: Pick<Candidate, "projectId" | "baseRevision" | "documents" | "diff">): string {
    return this.#services.digest(canonicalJson({ projectId: candidate.projectId, baseRevision: candidate.baseRevision, documents: candidate.documents, diff: candidate.diff }));
  }

  #reduce(state: KernelState, envelope: CommandEnvelope, principal: Principal): CommandResult {
    if (envelope.operation === "project.create") {
      if (state.project) return failure(CODE.PROJECT_EXISTS, "Project already exists.", state.project.revision, true);
      if (envelope.baseRevision !== null) return failure(CODE.REVISION_CONFLICT, "Only project.create accepts a null base, and creation requires it.", null, true);
      requirePayload(envelope.payload, ["name"]);
      const name = requireText(envelope.payload.name, "Project name");
      const revision = this.#id();
      state.project = { id: envelope.projectId, name, revision, documents: {} };
      state.history.push({ revision, parentRevision: null, actorId: principal.id, operation: envelope.operation, transactionId: envelope.transactionId, affectedRefs: [envelope.projectId] });
      return { ...result("accepted", revision), affectedRefs: [envelope.projectId] };
    }
    const project = state.project;
    if (!project) return failure(CODE.PROJECT_MISSING, "Create a project before authoring documents.");
    if (project.id !== envelope.projectId) return failure(CODE.PROJECT_MISMATCH, "Command addresses a different project.");
    if (envelope.baseRevision !== project.revision) return failure(CODE.REVISION_CONFLICT, "Base revision is stale or null.", project.revision, true);
    switch (envelope.operation) {
      case "document.import": return this.#import(state, project, envelope, principal);
      case "entity.delete": return this.#delete(state, project, envelope, principal);
      case "transaction.review": return this.#review(state, project, envelope, principal);
      case "transaction.apply": return this.#apply(state, project, envelope, principal);
      case "transaction.undo": return this.#restore(state, project, envelope, principal, false);
      case "transaction.redo": return this.#restore(state, project, envelope, principal, true);
      default: return failure(CODE.OPERATION_UNSUPPORTED, "Unsupported operation.", project.revision);
    }
  }

  #propose(state: KernelState, project: ProjectSnapshot, principal: Principal, documents: Record<string, DocumentEntry>, diff: CommandResult["diff"]): CommandResult {
    const diagnostics = [...Object.values(documents).flatMap((entry) => entry.diagnostics), ...validateReferences(documents, project.id)];
    const candidate: Candidate = { id: this.#id(), projectId: project.id, baseRevision: project.revision, digest: "", actorId: principal.id, documents, diff, diagnostics, status: "pending" };
    candidate.digest = this.#candidateDigest(candidate);
    if (state.candidates.some((item) => item.id === candidate.id)) throw new KernelError(CODE.STATE_INVALID, "Identity collision.");
    state.candidates.push(candidate);
    return { ...result("reviewRequired", project.revision), candidateId: candidate.id, patchDigest: candidate.digest, diagnostics, affectedRefs: diff.map((entry) => entry.id), diff };
  }

  #import(state: KernelState, project: ProjectSnapshot, envelope: CommandEnvelope, principal: Principal): CommandResult {
    const payload = envelope.payload;
    requirePayload(payload, ["sourceRefs", "formatProfile", "importMode"]);
    if (payload.formatProfile !== "ads-envelope" || payload.importMode !== "review" || !Array.isArray(payload.sourceRefs)
      || !payload.sourceRefs.length || payload.sourceRefs.length > MAX_BATCH_DOCUMENTS) throw new KernelError(CODE.PAYLOAD_INVALID, "Import requires a bounded ads-envelope source batch in review mode.");
    const documents = structuredClone(project.documents);
    const diff: CommandResult["diff"] = [];
    let bytes = 0;
    for (const source of payload.sourceRefs) {
      if (!isObject(source)) throw new KernelError(CODE.PAYLOAD_INVALID, "Import source must contain URI and content.");
      requirePayload(source, ["uri", "content"]);
      const content = requireText(source.content, "Source content");
      const uri = requireText(source.uri, "Source URI");
      bytes += new TextEncoder().encode(content).length;
      if (bytes > MAX_BATCH_BYTES) throw new KernelError(CODE.JSON_LIMIT, "Import batch exceeds the profile byte limit.");
      const entry = parseDocument(content, uri);
      const id = entry.document.id;
      if (id === project.id || Object.hasOwn(documents, id)) throw new KernelError(CODE.DOCUMENT_EXISTS, "Duplicate document identity; implicit overwrite is not supported.");
      documents[id] = entry;
      diff.push({ id, change: "created" });
    }
    return this.#propose(state, project, principal, documents, diff);
  }

  #delete(state: KernelState, project: ProjectSnapshot, envelope: CommandEnvelope, principal: Principal): CommandResult {
    requirePayload(envelope.payload, ["refs"]);
    const refs = envelope.payload.refs;
    if (!Array.isArray(refs) || !refs.length || refs.length > MAX_BATCH_DOCUMENTS) throw new KernelError(CODE.PAYLOAD_INVALID, "Deletion requires a bounded nonempty Ref list.");
    const documents = structuredClone(project.documents);
    const diff: CommandResult["diff"] = [];
    for (const ref of refs) {
      if (!isObject(ref) || !isValidId(ref.id) || typeof ref.expectedKind !== "string") throw new KernelError(CODE.REFERENCE_INVALID, "Deletion requires typed document references.");
      requirePayload(ref, ["id", "expectedKind", "revision"]);
      const entry = Object.hasOwn(documents, ref.id) ? documents[ref.id] : undefined;
      if (!entry) throw new KernelError(CODE.DOCUMENT_MISSING, "Deletion target does not exist or is duplicated.");
      if (entry.document.kind !== ref.expectedKind) throw new KernelError(CODE.REFERENCE_KIND, "Deletion target kind does not match.");
      if (ref.revision !== undefined && ref.revision !== entry.document.revision) throw new KernelError(CODE.REFERENCE_REVISION, "Deletion target revision does not match.");
      delete documents[ref.id];
      diff.push({ id: ref.id, change: "deleted" });
    }
    return this.#propose(state, project, principal, documents, diff);
  }

  /** Candidate visibility and approval are principal-bound even within one project. */
  #findCandidate(state: KernelState, project: ProjectSnapshot, principal: Principal, candidateId: unknown): Candidate {
    const candidate = state.candidates.find((item) => item.id === candidateId && item.projectId === project.id && item.actorId === principal.id);
    if (!candidate) throw new KernelError(CODE.CANDIDATE_MISSING, "Candidate is unavailable to the current principal.");
    if (candidate.baseRevision !== project.revision) throw new KernelError(CODE.REVISION_CONFLICT, "Candidate base is stale; prepare and review a new candidate.");
    if (candidate.digest !== this.#candidateDigest(candidate)) throw new KernelError(CODE.DIGEST_MISMATCH, "Candidate contents no longer match the reviewed digest.");
    return candidate;
  }

  #review(state: KernelState, project: ProjectSnapshot, envelope: CommandEnvelope, principal: Principal): CommandResult {
    requirePayload(envelope.payload, ["candidateId", "patchDigest", "decision"]);
    const candidate = this.#findCandidate(state, project, principal, envelope.payload.candidateId);
    if (candidate.status !== "pending") throw new KernelError(CODE.CANDIDATE_STATE, "Only a pending candidate can receive a new review decision.");
    if (envelope.payload.patchDigest !== candidate.digest) throw new KernelError(CODE.DIGEST_MISMATCH, "Review digest does not match the candidate.");
    if (envelope.payload.decision === "reject") {
      candidate.status = "rejected";
      return { ...result("accepted", project.revision), candidateId: candidate.id, patchDigest: candidate.digest };
    }
    if (envelope.payload.decision !== "approve") throw new KernelError(CODE.PAYLOAD_INVALID, "Review decision must be approve or reject.");
    const token = this.#id();
    candidate.approval = { principalId: principal.id, token, digest: candidate.digest, baseRevision: project.revision };
    candidate.status = "approved";
    return { ...result("accepted", project.revision), candidateId: candidate.id, patchDigest: candidate.digest, reviewToken: token };
  }

  #apply(state: KernelState, project: ProjectSnapshot, envelope: CommandEnvelope, principal: Principal): CommandResult {
    requirePayload(envelope.payload, ["candidateId", "approvalToken", "expectedRevision"]);
    if (envelope.payload.expectedRevision !== project.revision) return failure(CODE.REVISION_CONFLICT, "Apply expected revision is stale.", project.revision, true);
    const candidate = this.#findCandidate(state, project, principal, envelope.payload.candidateId);
    const approval = candidate.approval;
    authorize(principal, "review.apply");
    if (candidate.status !== "approved" || !approval || approval.principalId !== principal.id || approval.token !== envelope.payload.approvalToken
      || approval.digest !== candidate.digest || approval.baseRevision !== project.revision) throw new KernelError(CODE.APPROVAL_INVALID, "A current principal-bound approval is required.");
    validateReferences(candidate.documents, project.id);
    const before = structuredClone(project.documents);
    const revision = this.#commit(state, project, envelope, principal, candidate.documents, candidate.diff.map((entry) => entry.id));
    const undoHandle = this.#id();
    state.undo.push({ handle: undoHandle, actorId: principal.id, applicableRevision: revision, before, after: structuredClone(project.documents) });
    state.redo = [];
    candidate.status = "applied";
    return { ...result("accepted", revision), candidateId: candidate.id, patchDigest: candidate.digest, undoHandle, diff: candidate.diff, affectedRefs: candidate.diff.map((entry) => entry.id), diagnostics: candidate.diagnostics };
  }

  #commit(state: KernelState, project: ProjectSnapshot, envelope: CommandEnvelope, principal: Principal, documents: Record<string, DocumentEntry>, affectedRefs: string[]): string {
    const previous = project.revision;
    const revision = this.#id();
    if (state.history.some((entry) => entry.revision === revision)) throw new KernelError(CODE.STATE_INVALID, "Revision identity collision.");
    project.documents = structuredClone(documents);
    project.revision = revision;
    state.history.push({ revision, parentRevision: previous, actorId: principal.id, operation: envelope.operation, transactionId: envelope.transactionId, affectedRefs });
    return revision;
  }

  /** Only the top current inverse can run; a new revision cannot hide an overwrite. */
  #restore(state: KernelState, project: ProjectSnapshot, envelope: CommandEnvelope, principal: Principal, isRedo: boolean): CommandResult {
    const handleName = isRedo ? "redoHandle" : "undoHandle";
    requirePayload(envelope.payload, [handleName, "expectedRevision"]);
    const from = isRedo ? state.redo : state.undo;
    const to = isRedo ? state.undo : state.redo;
    const entry = from.at(-1);
    if (!entry || entry.handle !== envelope.payload[handleName] || entry.actorId !== principal.id
      || entry.applicableRevision !== project.revision || envelope.payload.expectedRevision !== project.revision) return failure(CODE.HISTORY_CONFLICT, "Undo/redo is not applicable to the current history.", project.revision, true);
    const expected = isRedo ? entry.before : entry.after;
    if (canonicalJson(expected) !== canonicalJson(project.documents)) return failure(CODE.HISTORY_CONFLICT, "Current documents differ from the expected history snapshot.", project.revision, true);
    const documents = isRedo ? entry.after : entry.before;
    validateReferences(documents, project.id);
    const affectedRefs = [...new Set([...Object.keys(expected), ...Object.keys(documents)])].filter((id) => canonicalJson(expected[id] ?? null) !== canonicalJson(documents[id] ?? null));
    const revision = this.#commit(state, project, envelope, principal, documents, affectedRefs);
    from.pop();
    const oppositeHandle = this.#id();
    const inverse: UndoEntry = { ...structuredClone(entry), handle: oppositeHandle, applicableRevision: revision };
    to.push(inverse);
    const next = from.at(-1);
    if (next) next.applicableRevision = revision;
    const response: CommandResult = { ...result("accepted", revision), affectedRefs, diff: affectedRefs.map((id) => ({ id, change: Object.hasOwn(documents, id) ? "restored" : "deleted" })) };
    if (isRedo) response.undoHandle = oppositeHandle; else response.redoHandle = oppositeHandle;
    return response;
  }
}
