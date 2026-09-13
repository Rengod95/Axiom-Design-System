import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { CommandService, KernelError, parseDocument, PROTOCOL_VERSION, STRUCTURAL_FORMAT } from "../../../modules/ads-core/src/index.ts";
import type { Candidate, CommandEnvelope, CommandResult, JsonObject, ProjectSnapshot } from "../../../modules/ads-core/src/index.ts";
import { FileStore } from "../../../modules/local-store/src/index.ts";
import { CliUsageError, parseArguments, validateArguments } from "./arguments.ts";
import { CLI_DIAGNOSTIC, CLI_DIAGNOSTIC_PHASE, CLI_HELP, CLI_OUTPUT_CONTEXT, EXIT_CODE, LOCAL_ID_PREFIX, LOCAL_PRINCIPAL } from "./constants.ts";
import { loadSourceFiles } from "./source-files.ts";
import { writeSourceExport } from "./source-export.ts";

const JSON_INDENT = 2;
const IMPORT_FORMAT = "ads-envelope";

/** Tag locally generated UUID identities while retaining their random uniqueness. */
function createLocalId(): string { return `${LOCAL_ID_PREFIX}-${randomUUID()}`; }

function writeResult(value: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ ...CLI_OUTPUT_CONTEXT, ...value }, null, JSON_INDENT)}\n`);
}

function resultExitCode(result: CommandResult): number {
  return result.status === "conflict" ? EXIT_CODE.CONFLICT : result.status === "rejected" ? EXIT_CODE.FAILURE : EXIT_CODE.SUCCESS;
}

/** Build local commands with a trusted principal; payloads never select their authority. */
function makeEnvelope(projectId: string, baseRevision: string | null, operation: string, payload: JsonObject): CommandEnvelope {
  return {
    protocolVersion: PROTOCOL_VERSION, commandId: createLocalId(), actorId: LOCAL_PRINCIPAL.id,
    projectId, baseRevision, operation, payload, idempotencyKey: randomUUID(), origin: "externalAPI",
    transactionId: createLocalId(), requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"],
  };
}

/** Candidate inspection stays in the trusted local adapter and omits approval tokens. */
async function inspectCandidate(store: FileStore, id: string): Promise<Candidate> {
  const candidate = (await store.read())?.candidates.find((item) => item.id === id);
  if (!candidate) throw Object.assign(new Error(`Candidate not found: ${id}`), { code: CLI_DIAGNOSTIC.NOT_FOUND });
  return candidate;
}

function candidateView(candidate: Candidate): Record<string, unknown> {
  return { id: candidate.id, baseRevision: candidate.baseRevision, patchDigest: candidate.digest, status: candidate.status, diff: candidate.diff, diagnostics: candidate.diagnostics };
}

/** Explicit approval can resume a stored approval, always through the guarded apply command. */
async function approveAndApply(service: CommandService, store: FileStore, candidateId: string): Promise<CommandResult> {
  const candidate = await inspectCandidate(store, candidateId);
  process.stderr.write(`${JSON.stringify({ review: candidateView(candidate) }, null, JSON_INDENT)}\n`);
  let approvalToken = candidate.status === "approved" && candidate.approval?.principalId === LOCAL_PRINCIPAL.id ? candidate.approval.token : undefined;
  if (!approvalToken) {
    const reviewed = await service.execute(makeEnvelope(candidate.projectId, candidate.baseRevision, "transaction.review", {
      candidateId, patchDigest: candidate.digest, decision: "approve",
    }), LOCAL_PRINCIPAL);
    if (reviewed.status !== "accepted" || !reviewed.reviewToken) return reviewed;
    approvalToken = reviewed.reviewToken;
  }
  return service.execute(makeEnvelope(candidate.projectId, candidate.baseRevision, "transaction.apply", {
    candidateId, approvalToken, expectedRevision: candidate.baseRevision,
  }), LOCAL_PRINCIPAL);
}

async function requireProject(service: CommandService): Promise<ProjectSnapshot> {
  const project = await service.getProject(LOCAL_PRINCIPAL);
  if (!project) throw Object.assign(new Error("No project exists in this store; run init first"), { code: CLI_DIAGNOSTIC.NOT_FOUND });
  return project;
}

/** Execute the bounded local authoring workflow and return a stable process exit code. */
export async function runCli(args: readonly string[]): Promise<number> {
  try {
    const input = parseArguments(args);
    if (input.command === "help" || input.options.help) { process.stdout.write(CLI_HELP); return EXIT_CODE.SUCCESS; }
    validateArguments(input);
    const storeDirectory = input.options.store;
    if (typeof storeDirectory !== "string") throw new CliUsageError("Choose a local project directory with --store <directory>");
    const store = new FileStore(resolve(storeDirectory));
    const service = new CommandService(store, { createId: createLocalId, digest: (text) => createHash("sha256").update(text, "utf8").digest("hex") });

    if (input.command === "recover-lock") {
      await store.recoverLock();
      writeResult({ status: "accepted", action: "recover-lock" });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "init") {
      const id = typeof input.options.project === "string" ? input.options.project : createLocalId();
      const name = typeof input.options.name === "string" ? input.options.name : "Untitled Axiom project";
      const result = await service.execute(makeEnvelope(id, null, "project.create", { name }), LOCAL_PRINCIPAL);
      writeResult({ projectId: id, ...result });
      return resultExitCode(result);
    }
    if (input.command === "show") {
      if (input.positional[0]) {
        const document = await service.getDocument(input.positional[0], LOCAL_PRINCIPAL);
        if (!document) throw Object.assign(new Error(`Document not found: ${input.positional[0]}`), { code: CLI_DIAGNOSTIC.NOT_FOUND });
        writeResult({ document });
      } else writeResult({ project: await requireProject(service) });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "history") {
      await requireProject(service);
      writeResult({ history: await service.getHistory(LOCAL_PRINCIPAL) });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "candidate") {
      writeResult({ candidate: candidateView(await inspectCandidate(store, input.positional[0]!)) });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "drafts") {
      const drafts = await service.listDrafts(LOCAL_PRINCIPAL);
      writeResult({ drafts: drafts.map(({ originalText: _originalText, ...summary }) => summary) });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "draft") {
      const draft = await service.getDraft(input.positional[0]!, LOCAL_PRINCIPAL);
      if (!draft) throw Object.assign(new Error(`Draft not found: ${input.positional[0]}`), { code: CLI_DIAGNOSTIC.NOT_FOUND });
      writeResult({ draft });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "diagnostics") {
      writeResult({ ...await service.getDiagnostics(LOCAL_PRINCIPAL) });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "validate") {
      await requireProject(service);
      const structure = await service.inspectStructure(LOCAL_PRINCIPAL);
      writeResult({ structure });
      return structure.valid ? EXIT_CODE.SUCCESS : EXIT_CODE.FAILURE;
    }
    if (input.command === "export") {
      const source = await service.exportDocument(input.positional[0]!, LOCAL_PRINCIPAL);
      if (!source) throw Object.assign(new Error(`Document not found: ${input.positional[0]}`), { code: CLI_DIAGNOSTIC.NOT_FOUND });
      writeResult({ status: "accepted", export: await writeSourceExport(String(input.options.out), source) });
      return EXIT_CODE.SUCCESS;
    }

    const project = await requireProject(service);
    let result: CommandResult;
    if (input.command === "import" || input.command === "update") {
      const sources = await loadSourceFiles(input.positional);
      const sourceRefs = sources.map((source): JsonObject => {
        const ref: JsonObject = { ...source };
        if (typeof input.options["draft-id"] === "string") ref.draftId = input.options["draft-id"];
        if (input.command === "update") {
          const parsed = parseDocument(source.content, source.uri).document;
          const existing = Object.hasOwn(project.documents, parsed.id) ? project.documents[parsed.id] : undefined;
          if (!existing) throw Object.assign(new Error(`Document not found for update: ${parsed.id}`), { code: CLI_DIAGNOSTIC.NOT_FOUND });
          ref.expectedRevision = existing.document.revision;
        }
        return ref;
      });
      const importMode = input.command === "update" ? "update" : input.options.draft ? "draft" : "review";
      const formatProfile = input.options.structural ? STRUCTURAL_FORMAT : IMPORT_FORMAT;
      result = await service.execute(makeEnvelope(project.id, project.revision, "document.import", { sourceRefs, formatProfile, importMode }), LOCAL_PRINCIPAL);
      if (input.options.approve && result.status === "reviewRequired" && result.candidateId) result = await approveAndApply(service, store, result.candidateId);
    } else if (input.command === "delete") {
      const refs = input.positional.map((id) => {
        const entry = Object.hasOwn(project.documents, id) ? project.documents[id] : undefined;
        if (!entry) throw Object.assign(new Error(`Document not found: ${id}`), { code: CLI_DIAGNOSTIC.NOT_FOUND });
        return { id, expectedKind: entry.document.kind };
      });
      result = await service.execute(makeEnvelope(project.id, project.revision, "entity.delete", { refs }), LOCAL_PRINCIPAL);
      if (input.options.approve && result.status === "reviewRequired" && result.candidateId) result = await approveAndApply(service, store, result.candidateId);
    } else if (input.command === "review") {
      const candidate = await inspectCandidate(store, input.positional[0]!);
      process.stderr.write(`${JSON.stringify({ review: candidateView(candidate) }, null, JSON_INDENT)}\n`);
      result = await service.execute(makeEnvelope(project.id, candidate.baseRevision, "transaction.review", {
        candidateId: candidate.id, patchDigest: candidate.digest, decision: input.options.approve ? "approve" : "reject",
      }), LOCAL_PRINCIPAL);
    } else if (input.command === "apply") {
      const candidate = await inspectCandidate(store, input.positional[0]!);
      result = input.options.approve ? await approveAndApply(service, store, candidate.id) : await service.execute(makeEnvelope(project.id, candidate.baseRevision, "transaction.apply", {
        candidateId: candidate.id, approvalToken: String(input.options.token), expectedRevision: candidate.baseRevision,
      }), LOCAL_PRINCIPAL);
    } else if (input.command === "undo" || input.command === "redo") {
      const state = await store.read();
      const handle = input.positional[0] ?? state?.[input.command].at(-1)?.handle;
      if (!handle) throw Object.assign(new Error(`No ${input.command} is available`), { code: CLI_DIAGNOSTIC.NOT_FOUND });
      const handleField = input.command === "undo" ? "undoHandle" : "redoHandle";
      result = await service.execute(makeEnvelope(project.id, project.revision, `transaction.${input.command}`, { [handleField]: handle, expectedRevision: project.revision }), LOCAL_PRINCIPAL);
    } else throw new CliUsageError(`Unknown command: ${input.command}`);
    writeResult({ ...result });
    return resultExitCode(result);
  } catch (error: unknown) {
    const problem = error instanceof Error ? error : new Error("Unknown local failure");
    const code = error instanceof CliUsageError ? CLI_DIAGNOSTIC.USAGE : "code" in problem && typeof problem.code === "string" ? problem.code : CLI_DIAGNOSTIC.IO;
    const phase = Object.hasOwn(CLI_DIAGNOSTIC_PHASE, code) ? CLI_DIAGNOSTIC_PHASE[code]! : "state";
    const diagnostic = problem instanceof KernelError ? problem.toDiagnostic() : { code, phase, severity: "error", message: problem.message };
    writeResult({ status: "rejected", diagnostics: [diagnostic] });
    return error instanceof CliUsageError ? EXIT_CODE.USAGE : code === "STORE_LOCKED" ? EXIT_CODE.CONFLICT : EXIT_CODE.FAILURE;
  }
}
