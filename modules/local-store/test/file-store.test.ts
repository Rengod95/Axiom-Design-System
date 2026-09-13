import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, realpath, rm, rmdir, symlink, unlink, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { CommandService, PROTOCOL_VERSION } from "../../ads-core/src/index.ts";
import type { CommandEnvelope, CommandResult, JsonObject, KernelState, Principal } from "../../ads-core/src/index.ts";
import { FileStore, FileStoreError } from "../src/index.ts";

const TEST_PREFIX = "axiom-local-store-";
const ENTRY_URL = new URL("../src/index.ts", import.meta.url).href;
const OWNER: Principal = { id: "owner", scopes: ["project.read", "project.write", "review.apply"] };
const KERNEL_SERVICES = { createId: randomUUID, digest: (text: string) => createHash("sha256").update(text).digest("hex") };

function commandFor(operation: string, payload: JsonObject, baseRevision: string | null): CommandEnvelope {
  const key = randomUUID();
  return { protocolVersion: PROTOCOL_VERSION, commandId: key, actorId: OWNER.id, projectId: "project", baseRevision, operation, payload, idempotencyKey: key, origin: "GUI", transactionId: key, requestedScopes: [operation === "transaction.review" ? "review.apply" : "project.write"] };
}

async function directoryFor(t: TestContext): Promise<string> {
  const parent = await realpath(tmpdir());
  const directory = await mkdtemp(path.join(parent, TEST_PREFIX));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), parent);
    assert.ok(path.basename(directory).startsWith(TEST_PREFIX));
    await rm(directory, { recursive: true, force: true });
  });
  return path.join(directory, "store");
}

function stateNamed(name = "0"): KernelState {
  return { formatVersion: "0.1.0", project: { id: "project", name, revision: `revision-${name}`, documents: {} }, candidates: [], receipts: [], undo: [], redo: [], history: [] };
}

function acceptedState(): KernelState {
  const state = stateNamed("1");
  state.project!.documents.doc = {
    document: { id: "doc", kind: "component", schemaVersion: "1.0.0", revision: "draft", name: "한글", extensions: { unknown: [true, null, 0.5] } },
    originalText: '{\r\n  "name": "한글", "unknown": true\r\n}\n', sourceUri: "provided-source.ads.json", validation: "envelope-only", diagnostics: [],
  };
  state.receipts.push({ projectId: "project", principalId: "owner", key: "request-key", requestDigest: "request-digest", result: { status: "accepted", revision: "revision-1", diagnostics: [], affectedRefs: ["doc"], diff: [{ id: "doc", change: "created" }], undoHandle: "undo-1" } });
  return state;
}

async function persist(store: FileStore, state: KernelState): Promise<void> {
  await store.transact(() => ({ state, changed: true, value: undefined }));
}

async function markerFiles(directory: string): Promise<string[]> {
  return (await readdir(path.join(directory, "commits"))).map(name => path.join(directory, "commits", name));
}

/** Children execute the public adapter, with no mocked filesystem or lock implementation. */
function childWriter(directory: string, fault?: "after-prepare" | "after-marker"): Promise<{ code: number | null; stdout: string; stderr: string; pid: number }> {
  const program = `
    import { FileStore } from ${JSON.stringify(ENTRY_URL)};
    const stage = ${JSON.stringify(fault ?? null)};
    const store = new FileStore(process.argv[1], { lockTimeoutMs: 5000, fault(current) { if (stage === current) process.exit(42); } });
    await store.transact(state => {
      state ??= ${JSON.stringify(stateNamed())};
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
      const next = Number(state.project.name) + 1;
      state.project.name = String(next); state.project.revision = 'revision-' + next;
      state.receipts.push({ projectId: 'project', principalId: 'child', key: String(process.pid), requestDigest: 'digest', result: { status: 'accepted', revision: state.project.revision, diagnostics: [], affectedRefs: [], diff: [] } });
      return { state, changed: true, value: next };
    });
    process.stdout.write('committed');
  `;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "--eval", program, directory], { windowsHide: true });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += String(chunk); });
    child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", code => resolve({ code, stdout, stderr, pid: child.pid! }));
  });
}

test("persists original text, opaque data and exact receipts across reopen without shared references", async t => {
  const directory = await directoryFor(t);
  const store = new FileStore(directory);
  assert.equal(await store.read(), null);
  const original = acceptedState();
  await persist(store, original);
  original.project!.name = "mutated caller";
  const reopened = new FileStore(directory);
  assert.deepEqual(await reopened.read(), acceptedState());
  const first = await reopened.read();
  first!.receipts[0]!.result.revision = "mutated read";
  assert.deepEqual(await reopened.read(), acceptedState());
  await reopened.transact(state => { state!.project!.name = "uncommitted"; return { state: state!, changed: false, value: "ignored" }; });
  assert.deepEqual(await reopened.read(), acceptedState());
  assert.equal((await markerFiles(directory)).length, 1);
});

test("serializes complete callbacks on the same instance and preserves rejected-call recovery", async t => {
  const store = new FileStore(await directoryFor(t));
  await persist(store, stateNamed());
  await Promise.all(Array.from({ length: 5 }, () => store.transact(state => {
    state!.project!.name = String(Number(state!.project!.name) + 1);
    return { state: state!, changed: true, value: undefined };
  })));
  assert.equal((await store.read())!.project!.name, "5");
  await assert.rejects(store.transact(() => { throw new Error("callback failed"); }), { code: "STORE_IO" });
  assert.equal((await store.read())!.project!.name, "5");
});

test("rejects lossy or malformed state before creating a visible commit", async t => {
  const directory = await directoryFor(t);
  const store = new FileStore(directory);
  for (const invalid of [undefined, { formatVersion: "0.1.0" }, { ...stateNamed(), candidates: [null] }, { ...stateNamed(), extra: Number.NaN }, { ...stateNamed(), extra: undefined }]) {
    await assert.rejects(persist(store, invalid as KernelState), { code: "STORE_STATE" });
    assert.equal(await store.read(), null);
  }
  const accessor = Object.defineProperty(stateNamed(), "extra", { enumerable: true, get() { throw new Error("must not execute"); } });
  await assert.rejects(persist(store, accessor), { code: "STORE_STATE" });
  const cycle = stateNamed() as KernelState & { cycle?: unknown }; cycle.cycle = cycle;
  await assert.rejects(persist(store, cycle), { code: "STORE_STATE" });
  let serializationCalls = 0;
  class HostArray extends Array {
    toJSON() { serializationCalls++; return []; }
  }
  const hostArrayState = stateNamed();
  hostArrayState.candidates = new HostArray();
  await assert.rejects(persist(store, hostArrayState), { code: "STORE_STATE" });
  const customArrayState = stateNamed();
  Object.setPrototypeOf(customArrayState.candidates, Object.create(Array.prototype, { toJSON: { get() { serializationCalls++; throw new Error("must not execute"); } } }));
  await assert.rejects(persist(store, customArrayState), { code: "STORE_STATE" });
  assert.equal(serializationCalls, 0);
  assert.equal(await store.read(), null);
});

test("retains failed preparation and the previous committed state", async t => {
  const directory = await directoryFor(t);
  await persist(new FileStore(directory), stateNamed());
  const faulty = new FileStore(directory, { fault(stage) { if (stage === "after-prepare") throw new Error("interrupted preparation"); } });
  await assert.rejects(persist(faulty, stateNamed("1")), { code: "STORE_IO" });
  assert.deepEqual(await new FileStore(directory).read(), stateNamed());
  assert.equal((await readdir(path.join(directory, "pending"))).length, 2);
  assert.equal((await markerFiles(directory)).length, 1);
});

test("after-marker response loss leaves the original committed receipt available on reopen", async t => {
  const directory = await directoryFor(t);
  const faulty = new FileStore(directory, { fault(stage) { if (stage === "after-marker") throw new Error("response lost"); } });
  await assert.rejects(persist(faulty, acceptedState()), { code: "STORE_IO" });
  assert.deepEqual(await new FileStore(directory).read(), acceptedState());
  assert.equal((await markerFiles(directory)).length, 1);
});

test("CommandService replays original candidate, approval and applied receipts after response loss", async t => {
  const directory = await directoryFor(t);
  const service = new CommandService(new FileStore(directory), KERNEL_SERVICES);
  const created = await service.execute(commandFor("project.create", { name: "Review" }, null), OWNER);
  assert.equal(created.status, "accepted");
  const originalText = '{\r\n  "id": "card", "kind": "component", "schemaVersion": "1.0.0", "revision": "draft", "name": "한글", "extensions": {"opaque": true}\r\n}\n';
  const replayAfterLoss = async (command: CommandEnvelope): Promise<CommandResult> => {
    const faulty = new CommandService(new FileStore(directory, { fault(stage) { if (stage === "after-marker") throw new Error("response lost"); } }), KERNEL_SERVICES);
    await assert.rejects(faulty.execute(command, OWNER), { code: "STORE_IO" });
    const reopened = new FileStore(directory);
    const committed = (await reopened.read())!;
    const original = committed.receipts.find(receipt => receipt.key === command.idempotencyKey)!.result;
    const markers = await markerFiles(directory);
    const replay = await new CommandService(reopened, KERNEL_SERVICES).execute(command, OWNER);
    assert.deepEqual(replay, original);
    assert.deepEqual(await reopened.read(), committed);
    assert.deepEqual(await markerFiles(directory), markers);
    return replay;
  };
  const imported = await replayAfterLoss(commandFor("document.import", { sourceRefs: [{ uri: "memory:card", content: originalText }], formatProfile: "ads-envelope", importMode: "review" }, created.revision!));
  assert.equal(imported.status, "reviewRequired");
  assert.ok(imported.candidateId);
  assert.ok(imported.patchDigest);
  const approved = await replayAfterLoss(commandFor("transaction.review", { candidateId: imported.candidateId!, patchDigest: imported.patchDigest!, decision: "approve" }, created.revision!));
  assert.equal(approved.status, "accepted");
  assert.ok(approved.reviewToken);
  const applied = await replayAfterLoss(commandFor("transaction.apply", { candidateId: imported.candidateId!, approvalToken: approved.reviewToken!, expectedRevision: created.revision! }, created.revision!));
  assert.equal(applied.status, "accepted");
  assert.notEqual(applied.revision, created.revision);
  const final = (await new FileStore(directory).read())!;
  assert.equal(final.project!.documents.card!.originalText, originalText);
  assert.equal(final.project!.revision, applied.revision);
  assert.equal(final.history.length, 2);
  assert.equal(final.undo.length, 1);
  assert.equal(final.receipts.length, 4);
  assert.equal((await markerFiles(directory)).length, 4);
});

test("CommandService preparation interruption leaves only the prior project and permits the same request", async t => {
  const directory = await directoryFor(t);
  const service = new CommandService(new FileStore(directory), KERNEL_SERVICES);
  const created = await service.execute(commandFor("project.create", { name: "Review" }, null), OWNER);
  const before = await new FileStore(directory).read();
  const command = commandFor("document.import", { sourceRefs: [{ uri: "memory:card", content: JSON.stringify({ id: "card", kind: "component", schemaVersion: "1.0.0", revision: "draft", name: "Card" }) }], formatProfile: "ads-envelope", importMode: "review" }, created.revision!);
  const faulty = new CommandService(new FileStore(directory, { fault(stage) { if (stage === "after-prepare") throw new Error("preparation interrupted"); } }), KERNEL_SERVICES);
  await assert.rejects(faulty.execute(command, OWNER), { code: "STORE_IO" });
  assert.deepEqual(await new FileStore(directory).read(), before);
  assert.equal((await markerFiles(directory)).length, 1);
  const retried = await new CommandService(new FileStore(directory), KERNEL_SERVICES).execute(command, OWNER);
  assert.equal(retried.status, "reviewRequired");
  const after = (await new FileStore(directory).read())!;
  assert.deepEqual(after.project, before!.project);
  assert.equal(after.candidates.length, 1);
  assert.equal(after.receipts.length, 2);
  assert.equal(after.history.length, 1);
  assert.equal((await markerFiles(directory)).length, 2);
});

test("actual process crashes require explicit dead-PID lock recovery and respect marker commit state", async t => {
  for (const stage of ["after-prepare", "after-marker"] as const) {
    await t.test(stage, async inner => {
      const directory = await directoryFor(inner);
      await persist(new FileStore(directory), stateNamed());
      const child = await childWriter(directory, stage);
      assert.equal(child.code, 42, child.stderr);
      const store = new FileStore(directory, { lockTimeoutMs: 10 });
      await assert.rejects(store.read(), { code: "STORE_LOCKED" });
      await store.recoverLock();
      const state = await store.read();
      assert.equal(state!.project!.name, stage === "after-marker" ? "1" : "0");
      assert.equal(state!.receipts.length, stage === "after-marker" ? 1 : 0);
      assert.equal((await readdir(path.join(directory, "pending"))).length, 2);
    });
  }
});

test("first-write preparation crash remains an empty project with the pending candidate preserved", async t => {
  const directory = await directoryFor(t);
  const child = await childWriter(directory, "after-prepare");
  assert.equal(child.code, 42, child.stderr);
  const store = new FileStore(directory);
  await store.recoverLock();
  assert.equal(await store.read(), null);
  assert.equal((await readdir(path.join(directory, "pending"))).length, 1);
});

test("two real processes serialize writes without lost updates", async t => {
  const directory = await directoryFor(t);
  await persist(new FileStore(directory), stateNamed());
  const children = await Promise.all([childWriter(directory), childWriter(directory)]);
  for (const child of children) assert.equal(child.code, 0, child.stderr);
  const state = await new FileStore(directory).read();
  assert.equal(state!.project!.name, "2");
  assert.equal(state!.receipts.length, 2);
  assert.equal(new Set(state!.receipts.map(receipt => receipt.key)).size, 2);
  assert.equal((await markerFiles(directory)).length, 3);
});

test("never removes live, foreign-host, incomplete or merely old writer locks", async t => {
  const directory = await directoryFor(t);
  const store = new FileStore(directory, { lockTimeoutMs: 0 });
  await store.read();
  const lock = path.join(directory, ".writer.lock");
  const fixtures = [
    JSON.stringify({ hostname: hostname(), pid: process.pid, token: randomUUID(), createdAt: "1970-01-01T00:00:00Z" }),
    JSON.stringify({ hostname: "different-host", pid: process.pid, token: randomUUID(), createdAt: "1970-01-01T00:00:00Z" }),
    `{"hostname":${JSON.stringify(hostname())},"pid":${process.pid},"pid":99999999,"token":${JSON.stringify(randomUUID())},"createdAt":"1970-01-01T00:00:00Z"}`,
    "",
  ];
  for (const fixture of fixtures) {
    await writeFile(lock, fixture);
    await assert.rejects(store.read(), { code: "STORE_LOCKED" });
    await assert.rejects(store.recoverLock(), { code: "STORE_LOCKED" });
    assert.equal(await readFile(lock, "utf8"), fixture);
  }
  await unlink(lock);
  assert.equal(await store.read(), null);
});

test("rejects corrupt committed payloads, markers, missing data and ambiguous chains", async t => {
  for (const damage of ["payload-digest", "marker-json", "missing-marker", "missing-payload", "missing-identity", "invalid-state", "duplicate-key", "invalid-utf8", "branch", "marker-traversal"]) {
    await t.test(damage, async inner => {
      const directory = await directoryFor(inner);
      await persist(new FileStore(directory), stateNamed());
      const file = (await markerFiles(directory))[0]!;
      const marker = JSON.parse(await readFile(file, "utf8")) as Record<string, string | null>;
      const payload = path.join(directory, "objects", `${marker.payloadHash}.json`);
      if (damage === "payload-digest") await writeFile(payload, (await readFile(payload, "utf8")) + " ");
      if (damage === "marker-json") await writeFile(file, "{");
      if (damage === "missing-marker") await unlink(file);
      if (damage === "missing-payload") await unlink(payload);
      if (damage === "missing-identity") await unlink(path.join(directory, "store.json"));
      if (damage === "invalid-state") {
        const invalid = JSON.stringify({ formatVersion: "0.1.0", project: null });
        const hash = createHash("sha256").update(invalid).digest("hex");
        await writeFile(path.join(directory, "objects", `${hash}.json`), invalid);
        marker.payloadHash = hash; await writeFile(file, JSON.stringify(marker));
      }
      if (damage === "duplicate-key" || damage === "invalid-utf8") {
        const original = await readFile(payload);
        const invalid = damage === "duplicate-key" ? Buffer.from(original.toString("utf8").replace('"formatVersion":"0.1.0"', '"formatVersion":"other","formatVersion":"0.1.0"')) : Buffer.concat([original.subarray(0, 1), Buffer.from('"bad":"'), Buffer.from([0xff]), Buffer.from('",'), original.subarray(1)]);
        const hash = createHash("sha256").update(invalid).digest("hex");
        await writeFile(path.join(directory, "objects", `${hash}.json`), invalid);
        marker.payloadHash = hash; await writeFile(file, JSON.stringify(marker));
      }
      if (damage === "branch") {
        const id = randomUUID();
        await writeFile(path.join(directory, "commits", `${id}.json`), JSON.stringify({ ...marker, commitId: id }));
      }
      if (damage === "marker-traversal") { marker.payloadHash = "../../outside"; await writeFile(file, JSON.stringify(marker)); }
      await assert.rejects(new FileStore(directory).read(), { code: "STORE_CORRUPT" });
    });
  }
});

test("recovers the last unique complete chain when the advisory head lags", async t => {
  const directory = await directoryFor(t);
  const store = new FileStore(directory);
  await persist(store, stateNamed());
  const previousHead = await readFile(path.join(directory, "HEAD.json"));
  await persist(store, stateNamed("1"));
  await writeFile(path.join(directory, "HEAD.json"), previousHead);
  assert.deepEqual(await new FileStore(directory).read(), stateNamed("1"));
});

test("rejects traversal and dedicated-directory violations without changing user files", async t => {
  const directory = await directoryFor(t);
  assert.throws(() => new FileStore(`${directory}/child/../escape`), { code: "STORE_PATH" });
  assert.throws(() => new FileStore(path.parse(directory).root), { code: "STORE_PATH" });
  await new FileStore(directory).read();
  await writeFile(path.join(directory, "user-source.ts"), "do not alter");
  await assert.rejects(new FileStore(directory).read(), { code: "STORE_PATH" });
  assert.equal(await readFile(path.join(directory, "user-source.ts"), "utf8"), "do not alter");
});

test("rejects root and controlled-directory symlinks where the OS allows their creation", async t => {
  for (const scope of ["root", "commits"] as const) {
    await t.test(scope, async inner => {
      const directory = await directoryFor(inner);
      await persist(new FileStore(directory), stateNamed());
      const link = scope === "root" ? path.join(path.dirname(directory), "linked-store") : path.join(directory, "commits");
      const target = scope === "root" ? directory : path.join(directory, "objects");
      if (scope === "commits") {
        for (const file of await markerFiles(directory)) await unlink(file);
        await rmdir(link);
      }
      try { await symlink(target, link, "junction"); }
      catch (error) { if (error instanceof Error && "code" in error && ["EPERM", "ENOSYS", "EACCES"].includes(String(error.code))) { inner.skip("The OS denied symlink creation."); return; } throw error; }
      await assert.rejects(new FileStore(scope === "root" ? link : directory).read(), error => error instanceof FileStoreError && error.code === "STORE_PATH");
    });
  }
});
