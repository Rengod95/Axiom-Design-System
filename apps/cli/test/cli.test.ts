import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { TestContext } from "node:test";
import { FileStore } from "../../../modules/local-store/src/index.ts";
import { CommandService, PROTOCOL_VERSION } from "../../../modules/ads-core/src/index.ts";
import type { CommandEnvelope } from "../../../modules/ads-core/src/index.ts";

const CLI_ENTRY = fileURLToPath(new URL("../src/main.ts", import.meta.url));
const TEMP_PREFIX = "axiom-cli-test-";
interface CliResponse {
  status: string; revision: string; candidateId: string; reviewToken: string;
  project: { documents: Record<string, unknown>; revision: string };
  document: { originalText: string; validation: string; document: Record<string, unknown> };
  candidate: { status: string; diff: unknown[]; approval?: unknown };
  diagnostics: { code: string; phase: string }[];
  history: unknown[];
  validation: string;
  semantics: string;
}

/** Every command launches a fresh process, exercising persisted rather than in-memory state. */
function run(store: string, args: string[], expectedCode = 0): CliResponse {
  const execution = spawnSync(process.execPath, [CLI_ENTRY, "--store", store, ...args], { encoding: "utf8" });
  assert.equal(execution.status, expectedCode, `${args.join(" ")}\nstdout: ${execution.stdout}\nstderr: ${execution.stderr}`);
  const value = JSON.parse(execution.stdout) as CliResponse;
  assert.equal(value.validation, "envelope-only");
  assert.equal(value.semantics, "unverified");
  for (const diagnostic of value.diagnostics ?? []) assert.equal(typeof diagnostic.phase, "string");
  return value;
}

async function workspace(t: TestContext): Promise<{ root: string; store: string }> {
  const temporaryRoot = resolve(tmpdir());
  const root = await mkdtemp(join(temporaryRoot, TEMP_PREFIX));
  t.after(async () => {
    assert.equal(dirname(resolve(root)), temporaryRoot);
    assert.ok(basename(root).startsWith(TEMP_PREFIX));
    await rm(root, { recursive: true, force: true });
  });
  return { root, store: join(root, "store") };
}

function document(id: string, extra: Record<string, unknown> = {}): string {
  return `${JSON.stringify({ id, kind: "component", schemaVersion: "1.0.0", revision: "source-r1", name: `문서 ${id}`, ...extra }, null, 2)}\n`;
}

test("help reports the bounded envelope-only workflow without creating a store", () => {
  const execution = spawnSync(process.execPath, [CLI_ENTRY, "help"], { encoding: "utf8" });
  assert.equal(execution.status, 0);
  assert.match(execution.stdout, /semantics.*Studio/);
  assert.match(execution.stdout, /recover-lock/);
});

test("reviewed import survives reopen and delete can be undone and redone", async (t) => {
  const { root, store } = await workspace(t);
  const source = document("doc-card", { extensions: { "example.vendor": { future: "보존", expression: "do not execute" } } });
  const file = join(root, "card.json");
  await writeFile(file, source, "utf8");
  const initial = run(store, ["init", "--project", "project-demo", "--name", "한글 프로젝트"]);
  assert.equal(initial.status, "accepted");
  const staged = run(store, ["import", file]);
  assert.equal(staged.status, "reviewRequired");
  assert.deepEqual(run(store, ["show"]).project.documents, {});
  const inspected = run(store, ["candidate", staged.candidateId]);
  assert.equal(inspected.candidate.status, "pending");
  assert.equal(inspected.candidate.diff.length, 1);
  assert.equal(inspected.candidate.approval, undefined);
  const reviewed = run(store, ["review", staged.candidateId, "--approve"]);
  assert.ok(reviewed.reviewToken);
  const applied = run(store, ["apply", staged.candidateId, "--token", reviewed.reviewToken]);
  assert.equal(applied.status, "accepted");
  const imported = run(store, ["show", "doc-card"]);
  assert.equal(imported.document.originalText, source);
  assert.equal(imported.document.validation, "envelope-only");
  assert.deepEqual(imported.document.document.extensions, { "example.vendor": { future: "보존", expression: "do not execute" } });
  assert.equal(run(store, ["history"]).history.length, 2);
  run(store, ["delete", "doc-card", "--approve"]);
  assert.equal(run(store, ["show", "doc-card"], 1).diagnostics[0]?.code, "CLI_NOT_FOUND");
  run(store, ["undo"]);
  assert.equal(run(store, ["show", "doc-card"]).document.originalText, source);
  run(store, ["redo"]);
  assert.deepEqual(run(store, ["show"]).project.documents, {});
});

test("deletion protects recognized typed references and permits removing their complete closure", async (t) => {
  const { root, store } = await workspace(t);
  const target = join(root, "target.json");
  const dependent = join(root, "dependent.json");
  await writeFile(target, document("doc-target"));
  await writeFile(dependent, document("doc-dependent", { related: { id: "doc-target", expectedKind: "component" } }));
  run(store, ["init"]);
  run(store, ["import", target, dependent, "--approve"]);
  const before = run(store, ["show"]).project;
  const rejected = run(store, ["delete", "doc-target", "--approve"], 1);
  assert.equal(rejected.status, "rejected");
  assert.ok(rejected.diagnostics.length);
  assert.equal(run(store, ["show"]).project.revision, before.revision);
  run(store, ["delete", "doc-target", "doc-dependent", "--approve"]);
  assert.deepEqual(run(store, ["show"]).project.documents, {});
});

test("an invalid UTF-8 or JSON batch leaves the previous project revision intact", async (t) => {
  const { root, store } = await workspace(t);
  const valid = join(root, "valid.json");
  const invalid = join(root, "invalid.json");
  const invalidEncoding = join(root, "invalid-encoding.json");
  await writeFile(valid, document("doc-valid"));
  await writeFile(invalid, "{ invalid");
  await writeFile(invalidEncoding, Buffer.from([0xc3, 0x28]));
  const initial = run(store, ["init"]);
  assert.equal(run(store, ["import", valid, invalid, "--approve"], 1).status, "rejected");
  assert.equal(run(store, ["show"]).project.revision, initial.revision);
  const encodingFailure = run(store, ["import", invalidEncoding], 1).diagnostics[0];
  assert.equal(encodingFailure?.code, "CLI_UTF8");
  assert.equal(encodingFailure?.phase, "parse");
  assert.deepEqual(run(store, ["show"]).project.documents, {});
});

test("a stale approval cannot overwrite an intervening applied document", async (t) => {
  const { root, store } = await workspace(t);
  const first = join(root, "first.json");
  const second = join(root, "second.json");
  await writeFile(first, document("doc-first"));
  await writeFile(second, document("doc-second"));
  run(store, ["init"]);
  const staged = run(store, ["import", first]);
  const approval = run(store, ["review", staged.candidateId, "--approve"]);
  run(store, ["import", second, "--approve"]);
  const stale = run(store, ["apply", staged.candidateId, "--token", approval.reviewToken], 3);
  assert.equal(stale.status, "conflict");
  assert.deepEqual(Object.keys(run(store, ["show"]).project.documents), ["doc-second"]);
});

test("rejection preserves drafts and usage errors cannot imply approval", async (t) => {
  const { root, store } = await workspace(t);
  const file = join(root, "draft.json");
  await writeFile(file, document("doc-draft"));
  run(store, ["init"]);
  const staged = run(store, ["import", file]);
  run(store, ["review", staged.candidateId, "--approve", "--reject"], 2);
  assert.equal(run(store, ["candidate", staged.candidateId]).candidate.status, "pending");
  run(store, ["review", staged.candidateId, "--reject"]);
  assert.equal(run(store, ["candidate", staged.candidateId]).candidate.status, "rejected");
  assert.deepEqual(run(store, ["show"]).project.documents, {});
  run(store, ["undo"], 1);
  run(store, ["nonsense"], 2);
  assert.equal(run(store, ["init", "--approve"], 2).diagnostics[0]?.phase, "command");
});

test("CLI reports an active writer conflict and cannot recover a live process lock", async (t) => {
  const { store } = await workspace(t);
  run(store, ["init"]);
  let releaseWriter!: () => void;
  let markPrepared!: () => void;
  const held = new Promise<void>((done) => { releaseWriter = done; });
  const prepared = new Promise<void>((done) => { markPrepared = done; });
  const writer = new FileStore(store, { fault: async (stage) => {
    if (stage === "after-prepare") { markPrepared(); await held; }
  } });
  const writing = writer.transact((state) => {
    assert.ok(state);
    return { state, value: undefined, changed: true };
  });
  try {
    await prepared;
    const locked = run(store, ["show"], 3).diagnostics[0];
    assert.equal(locked?.code, "STORE_LOCKED");
    assert.equal(locked?.phase, "state");
    assert.equal(run(store, ["recover-lock"], 3).diagnostics[0]?.code, "STORE_LOCKED");
  } finally { releaseWriter(); await writing; }
  assert.deepEqual(run(store, ["show"]).project.documents, {});
});

test("persisted command receipts replay after CLI edits and still require current authority", async (t) => {
  const { root, store } = await workspace(t);
  const principal = { id: "local-owner", scopes: ["project.read", "project.write", "review.apply"] };
  const services = { createId: () => `replay-${randomUUID()}`, digest: (text: string) => createHash("sha256").update(text).digest("hex") };
  const create: CommandEnvelope = {
    protocolVersion: PROTOCOL_VERSION, commandId: "create-once", actorId: principal.id, projectId: "project-replay",
    baseRevision: null, operation: "project.create", payload: { name: "Replay" }, idempotencyKey: "create-once",
    origin: "externalAPI", transactionId: "create-once", requestedScopes: ["project.write"],
  };
  const original = await new CommandService(new FileStore(store), services).execute(create, principal);
  assert.equal(original.status, "accepted");
  const file = join(root, "later.json");
  await writeFile(file, document("doc-later"));
  run(store, ["import", file, "--approve"]);
  const reopened = new CommandService(new FileStore(store), services);
  assert.deepEqual(await reopened.execute(create, principal), original);
  const conflicting = await reopened.execute({ ...create, payload: { name: "Conflicting replay" } }, principal);
  assert.equal(conflicting.diagnostics[0]?.code, "IDEMPOTENCY_CONFLICT");
  const revoked = await reopened.execute(create, { id: principal.id, scopes: ["project.write"] });
  assert.equal(revoked.status, "rejected");
  assert.equal(revoked.diagnostics[0]?.code, "SCOPE_REQUIRED");
  assert.equal(run(store, ["history"]).history.length, 2);
  assert.deepEqual(Object.keys(run(store, ["show"]).project.documents), ["doc-later"]);
});
