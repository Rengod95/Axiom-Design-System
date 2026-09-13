/** Browser-neutral contracts for the bounded document-kernel profile. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export type AdsDocument = JsonObject & { id: string; kind: string; schemaVersion: string; revision: string; name: string };

export type DiagnosticPhase = "parse" | "envelope" | "authorization" | "command" | "reference" | "review" | "history" | "document" | "state";
export interface Diagnostic { code: string; phase: DiagnosticPhase; severity: "info" | "warning" | "error"; message: string; sourceRef?: string }
export interface DocumentEntry { document: AdsDocument; originalText: string; sourceUri: string; validation: "envelope-only"; diagnostics: Diagnostic[] }
export interface ProjectSnapshot { id: string; name: string; revision: string; documents: Record<string, DocumentEntry> }
export interface Principal { id: string; scopes: readonly string[] }
export interface CommandEnvelope {
  protocolVersion: string; commandId: string; actorId: string; projectId: string;
  baseRevision: string | null; operation: string; payload: JsonObject; idempotencyKey: string;
  origin: "GUI" | "internalAI" | "externalAPI"; transactionId: string; requestedScopes: string[];
}
export interface CommandResult {
  status: "accepted" | "reviewRequired" | "conflict" | "rejected";
  revision: string | null; diagnostics: Diagnostic[]; affectedRefs: string[];
  diff: { id: string; change: "created" | "deleted" | "restored" }[];
  candidateId?: string; patchDigest?: string; reviewToken?: string; undoHandle?: string; redoHandle?: string;
}
export interface Receipt { projectId: string; principalId: string; key: string; requestDigest: string; result: CommandResult }
export interface Candidate {
  id: string; projectId: string; baseRevision: string; digest: string; actorId: string;
  documents: Record<string, DocumentEntry>; diff: CommandResult["diff"]; diagnostics: Diagnostic[];
  status: "pending" | "approved" | "applied" | "rejected";
  approval?: { principalId: string; token: string; digest: string; baseRevision: string };
}
export interface UndoEntry { handle: string; actorId: string; applicableRevision: string; before: Record<string, DocumentEntry>; after: Record<string, DocumentEntry> }
export interface HistoryEntry { revision: string; parentRevision: string | null; actorId: string; operation: string; transactionId: string; affectedRefs: string[] }
export interface KernelState {
  formatVersion: string; project: ProjectSnapshot | null; candidates: Candidate[];
  receipts: Receipt[]; undo: UndoEntry[]; redo: UndoEntry[]; history: HistoryEntry[];
}
export interface StoreUpdate<T> { state: KernelState; value: T; changed: boolean }
/** The adapter serializes the complete callback and persists before resolving. */
export interface TransactionalStore {
  read(): Promise<KernelState | null>;
  transact<T>(update: (state: KernelState | null) => StoreUpdate<T>): Promise<T>;
}
export interface KernelServices { createId(): string; digest(text: string): string }
