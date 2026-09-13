import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FileStore } from "../src/index.ts";

const ENTRY_URL = new URL("../src/index.ts", import.meta.url).href;

function constrainedChild(program: string, directory: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--max-old-space-size=32", "--input-type=module", "--eval", program, directory], { windowsHide: true, timeout: 5_000 });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += String(chunk); });
    child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", code => resolve({ code, stdout, stderr }));
  });
}

test("reopen validates an entire history without retaining every historical snapshot in heap", async t => {
  const parent = await realpath(tmpdir());
  const directory = await mkdtemp(path.join(parent, "axiom-local-store-resource-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), parent);
    assert.ok(path.basename(directory).startsWith("axiom-local-store-resource-"));
    await rm(directory, { recursive: true, force: true });
  });
  await new FileStore(directory).read();
  const identity = JSON.parse(await readFile(path.join(directory, "store.json"), "utf8"));
  const content = "x".repeat(1024 * 1024);
  let parentCommitId: string | null = null;
  let firstPayload = "";
  // Build a valid history directly, avoiding the writer's repeated recovery work.
  // The aggregate parsed snapshots exceed the child's heap; any one snapshot fits.
  for (let index = 0; index < 48; index++) {
    const bytes = JSON.stringify({ formatVersion: "0.1.0", project: { id: "project", name: content, revision: `revision-${index}`, documents: {} }, candidates: [], receipts: [], undo: [], redo: [], history: [] });
    const payloadHash = createHash("sha256").update(bytes).digest("hex");
    const payload = path.join(directory, "objects", `${payloadHash}.json`);
    await writeFile(payload, bytes);
    firstPayload ||= payload;
    const commitId = randomUUID();
    await writeFile(path.join(directory, "commits", `${commitId}.json`), JSON.stringify({ ...identity, commitId, parentCommitId, payloadHash }));
    parentCommitId = commitId;
  }
  await writeFile(path.join(directory, "HEAD.json"), JSON.stringify({ ...identity, commitId: parentCommitId }));
  const program = `import { FileStore } from ${JSON.stringify(ENTRY_URL)}; const state = await new FileStore(process.argv[1]).read(); process.stdout.write(state.project.revision);`;
  const child = await constrainedChild(program, directory);
  assert.equal(child.code, 0, child.stderr);
  assert.equal(child.stdout, "revision-47");
  // Memory reduction must not skip integrity checks on old commits.
  await writeFile(firstPayload, "damaged old snapshot");
  await assert.rejects(new FileStore(directory).read(), { code: "STORE_CORRUPT" });
});

test("compact shared data which would expand beyond the payload bound rejects before serialization", async t => {
  const parent = await realpath(tmpdir());
  const directory = await mkdtemp(path.join(parent, "axiom-local-store-resource-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), parent);
    assert.ok(path.basename(directory).startsWith("axiom-local-store-resource-"));
    await rm(directory, { recursive: true, force: true });
  });
  const program = `
    import { FileStore } from ${JSON.stringify(ENTRY_URL)};
    let branch = { text: 'x'.repeat(1024) };
    for (let index = 0; index < 30; index++) branch = { left: branch, right: branch };
    const state = { formatVersion: '0.1.0', project: null, candidates: [], receipts: [], undo: [], redo: [], history: [], extra: branch };
    const store = new FileStore(process.argv[1]);
    try { await store.transact(() => ({ state, changed: true, value: null })); throw new Error('oversized state was accepted'); }
    catch (error) { if (error.code !== 'STORE_STATE') throw error; }
    if (await store.read() !== null) throw new Error('rejected state became visible');
    process.stdout.write('bounded rejection');
  `;
  const child = await constrainedChild(program, directory);
  assert.equal(child.code, 0, child.stderr);
  assert.equal(child.stdout, "bounded rejection");
});
