import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CommandService, KernelError, PROTOCOL_VERSION } from "../../../modules/ads-core/src/index.ts";
import type { Candidate, CommandEnvelope, CommandResult, JsonObject, ProjectSnapshot } from "../../../modules/ads-core/src/index.ts";
import { FileStore } from "../../../modules/local-store/src/index.ts";
import { checkOptions, CliUsageError, parseArguments } from "./arguments.ts";
import { CLI_DIAGNOSTIC, CLI_DIAGNOSTIC_PHASE, CLI_HELP, CLI_OUTPUT_CONTEXT, EXIT_CODE, LOCAL_ID_PREFIX, LOCAL_PRINCIPAL, SUPPORTED_COMMANDS } from "./constants.ts";

const JSON_INDENT = 2;
const IMPORT_FORMAT = "ads-envelope";
const IMPORT_MODE = "review";
const MAX_ARGUMENTS = Number.MAX_SAFE_INTEGER;

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

/** The explicit --approve path still performs ordinary review and apply commands. */
async function approveAndApply(service: CommandService, store: FileStore, candidateId: string): Promise<CommandResult> {
  const candidate = await inspectCandidate(store, candidateId);
  process.stderr.write(`${JSON.stringify({ review: candidateView(candidate) }, null, JSON_INDENT)}\n`);
  const reviewed = await service.execute(makeEnvelope(candidate.projectId, candidate.baseRevision, "transaction.review", {
    candidateId, patchDigest: candidate.digest, decision: "approve",
  }), LOCAL_PRINCIPAL);
  if (reviewed.status !== "accepted" || !reviewed.reviewToken) return reviewed;
  return service.execute(makeEnvelope(candidate.projectId, candidate.baseRevision, "transaction.apply", {
    candidateId, approvalToken: reviewed.reviewToken, expectedRevision: candidate.baseRevision,
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
    if (!SUPPORTED_COMMANDS.some((command) => command === input.command)) throw new CliUsageError(`Unknown command: ${input.command}`);
    const storeDirectory = input.options.store;
    if (typeof storeDirectory !== "string") throw new CliUsageError("Choose a local project directory with --store <directory>");
    const store = new FileStore(resolve(storeDirectory));
    const service = new CommandService(store, { createId: createLocalId, digest: (text) => createHash("sha256").update(text, "utf8").digest("hex") });

    if (input.command === "recover-lock") {
      checkOptions(input, [], 0, 0);
      await store.recoverLock();
      writeResult({ status: "accepted", action: "recover-lock" });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "init") {
      checkOptions(input, ["project", "name"], 0, 0);
      const id = typeof input.options.project === "string" ? input.options.project : createLocalId();
      const name = typeof input.options.name === "string" ? input.options.name : "Untitled Axiom project";
      const result = await service.execute(makeEnvelope(id, null, "project.create", { name }), LOCAL_PRINCIPAL);
      writeResult({ projectId: id, ...result });
      return resultExitCode(result);
    }
    if (input.command === "show") {
      checkOptions(input, [], 0, 1);
      if (input.positional[0]) {
        const document = await service.getDocument(input.positional[0], LOCAL_PRINCIPAL);
        if (!document) throw Object.assign(new Error(`Document not found: ${input.positional[0]}`), { code: CLI_DIAGNOSTIC.NOT_FOUND });
        writeResult({ document });
      } else writeResult({ project: await requireProject(service) });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "history") {
      checkOptions(input, [], 0, 0);
      await requireProject(service);
      writeResult({ history: await service.getHistory(LOCAL_PRINCIPAL) });
      return EXIT_CODE.SUCCESS;
    }
    if (input.command === "candidate") {
      checkOptions(input, [], 1, 1);
      writeResult({ candidate: candidateView(await inspectCandidate(store, input.positional[0]!)) });
      return EXIT_CODE.SUCCESS;
    }

    const project = await requireProject(service);
    let result: CommandResult;
    if (input.command === "import") {
      checkOptions(input, ["approve"], 1, MAX_ARGUMENTS);
      const sourceRefs = await Promise.all(input.positional.map(async (file) => {
        const sourcePath = resolve(file);
        const bytes = await readFile(sourcePath);
        let content: string;
        try { content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
        catch (cause) { throw Object.assign(new Error(`Source is not valid UTF-8: ${sourcePath}`, { cause }), { code: CLI_DIAGNOSTIC.UTF8 }); }
        return { uri: pathToFileURL(sourcePath).href, content };
      }));
      result = await service.execute(makeEnvelope(project.id, project.revision, "document.import", { sourceRefs, formatProfile: IMPORT_FORMAT, importMode: IMPORT_MODE }), LOCAL_PRINCIPAL);
      if (input.options.approve && result.status === "reviewRequired" && result.candidateId) result = await approveAndApply(service, store, result.candidateId);
    } else if (input.command === "delete") {
      checkOptions(input, ["approve"], 1, MAX_ARGUMENTS);
      const refs = await Promise.all(input.positional.map(async (id) => {
        const entry = await service.getDocument(id, LOCAL_PRINCIPAL);
        if (!entry) throw Object.assign(new Error(`Document not found: ${id}`), { code: CLI_DIAGNOSTIC.NOT_FOUND });
        return { id, expectedKind: entry.document.kind };
      }));
      result = await service.execute(makeEnvelope(project.id, project.revision, "entity.delete", { refs }), LOCAL_PRINCIPAL);
      if (input.options.approve && result.status === "reviewRequired" && result.candidateId) result = await approveAndApply(service, store, result.candidateId);
    } else if (input.command === "review") {
      checkOptions(input, ["approve", "reject"], 1, 1);
      if (Boolean(input.options.approve) === Boolean(input.options.reject)) throw new CliUsageError("Choose exactly one of --approve or --reject for review");
      const candidate = await inspectCandidate(store, input.positional[0]!);
      process.stderr.write(`${JSON.stringify({ review: candidateView(candidate) }, null, JSON_INDENT)}\n`);
      result = await service.execute(makeEnvelope(project.id, candidate.baseRevision, "transaction.review", {
        candidateId: candidate.id, patchDigest: candidate.digest, decision: input.options.approve ? "approve" : "reject",
      }), LOCAL_PRINCIPAL);
    } else if (input.command === "apply") {
      checkOptions(input, ["approve", "token"], 1, 1);
      if (Boolean(input.options.approve) === Boolean(input.options.token)) throw new CliUsageError("Choose exactly one of --approve or --token for apply");
      const candidate = await inspectCandidate(store, input.positional[0]!);
      result = input.options.approve ? await approveAndApply(service, store, candidate.id) : await service.execute(makeEnvelope(project.id, candidate.baseRevision, "transaction.apply", {
        candidateId: candidate.id, approvalToken: String(input.options.token), expectedRevision: candidate.baseRevision,
      }), LOCAL_PRINCIPAL);
    } else if (input.command === "undo" || input.command === "redo") {
      checkOptions(input, [], 0, 1);
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
