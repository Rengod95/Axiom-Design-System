import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, lstat, mkdir, mkdtemp, open, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import type { TestContext } from "node:test";
import { exportProjectBundle, KernelError, parseDocument } from "../../../modules/ads-core/src/index.ts";
import { readProjectBundle, writeProjectBundle } from "../src/bundle-files.ts";

const digest = (text: string): string => createHash("sha256").update(text).digest("hex");
async function workspace(t: TestContext): Promise<string> {
  const parent = resolve(tmpdir());
  const root = await mkdtemp(join(parent, "axiom-bundle-test-"));
  t.after(async () => {
    assert.equal(dirname(resolve(root)), parent);
    assert.ok(basename(root).startsWith("axiom-bundle-test-"));
    await rm(root, { recursive: true, force: true });
  });
  return root;
}
function bundle() {
  const card = parseDocument('{"id":"unsafe:/id","kind":"component","schemaVersion":"future","revision":"r1","name":"Card","extensions":{"opaque":true}}', "https://never-fetch.invalid/private");
  card.originalText = "\uFEFFmalformed 원문\r\n";
  return exportProjectBundle({ id: "project", name: "Project", revision: "local-r1", documents: { "unsafe:/id": card } }, digest);
}

test("fixed filenames preserve raw UTF-8 originals and normalize no source path into a filesystem target", async (t) => {
  const root = await workspace(t);
  const original = bundle();
  const output = await writeProjectBundle(join(root, "export"), original);
  assert.equal(output.manifestPath, join(root, "export", "manifest.json"));
  assert.deepEqual(await readFile(join(output.directory, "document-0000-original.json")), Buffer.from(original.files["document-0000-original.json"]!, "utf8"));
  const restored = await readProjectBundle(output.manifestPath);
  assert.deepEqual(restored.manifest, original.manifest);
  assert.deepEqual(restored.files, original.files);
  assert.match(restored.uri, /^file:/);
  await assert.rejects(() => writeProjectBundle(output.directory, original));
});

test("unlisted/missing files and raw invalid UTF-8 fail before a command can consume a bundle", async (t) => {
  const root = await workspace(t);
  const unlisted = await writeProjectBundle(join(root, "extra"), bundle());
  await writeFile(join(unlisted.directory, "private.txt"), "do not import");
  await assert.rejects(() => readProjectBundle(unlisted.manifestPath), (error: unknown) => error instanceof KernelError && error.code === "BUNDLE_INVALID" && error.toDiagnostic().phase === "document" && /unlisted/.test(error.message));
  const missing = await writeProjectBundle(join(root, "missing"), bundle());
  await rm(join(missing.directory, "document-0000-original.json"));
  await assert.rejects(() => readProjectBundle(missing.manifestPath), /missing/);
  const binary = await writeProjectBundle(join(root, "binary"), bundle());
  await writeFile(join(binary.directory, "document-0000-original.json"), Buffer.from([0xff]));
  await assert.rejects(() => readProjectBundle(binary.manifestPath), /UTF-8/);
});

test("duplicate manifest keys, file hash changes and digest-valid unsafe paths are rejected", async (t) => {
  const root = await workspace(t);
  const duplicate = await writeProjectBundle(join(root, "duplicate"), bundle());
  const manifest = await readFile(duplicate.manifestPath, "utf8");
  await writeFile(duplicate.manifestPath, manifest.replace('"version":"1.0.0"', '"version":"1.0.0","version":"1.0.0"'));
  await assert.rejects(() => readProjectBundle(duplicate.manifestPath), /Duplicate/);
  const tampered = await writeProjectBundle(join(root, "tampered"), bundle());
  await writeFile(join(tampered.directory, "document-0000-original.json"), "edited bytes");
  await assert.rejects(() => readProjectBundle(tampered.manifestPath), /digest/);
  const unsafe = bundle();
  unsafe.manifest.documents[0]!.original.file = "../outside.json";
  const { bundleDigest: _digest, ...unsigned } = unsafe.manifest;
  const { canonicalJson } = await import("../../../modules/ads-core/src/index.ts");
  unsafe.manifest.bundleDigest = digest(canonicalJson(unsigned));
  await assert.rejects(() => writeProjectBundle(join(root, "unsafe"), unsafe), /numeric slots/);
  await assert.rejects(() => lstat(join(root, "unsafe")), { code: "ENOENT" });
});

test("source symlinks and directory junctions are rejected", async (t) => {
  const root = await workspace(t);
  const target = await writeProjectBundle(join(root, "target"), bundle());
  const linked = join(root, "linked");
  await symlink(target.directory, linked, "junction");
  await assert.rejects(() => readProjectBundle(join(linked, "manifest.json")), /ordinary directories/);
  await assert.rejects(() => writeProjectBundle(join(linked, "new-export"), bundle()), /ordinary directories/);
  // A directory at a listed file slot is also rejected without reading it.
  const file = join(target.directory, "document-0000-original.json");
  await rm(file);
  await mkdir(file);
  await assert.rejects(() => readProjectBundle(target.manifestPath), /regular files/);
});

test("empty bundles use the same fresh-directory manifest-last contract", async (t) => {
  const root = await workspace(t);
  const empty = exportProjectBundle({ id: "empty", name: "Empty", revision: "r1", documents: {} }, digest);
  const output = await writeProjectBundle(join(root, "empty"), empty);
  assert.deepEqual((await readProjectBundle(output.manifestPath)).files, {});
  await assert.rejects(() => writeProjectBundle(`${root}/../escape`, empty), /traversal/);
});

test("export snapshots the validated caller data before asynchronous filesystem work", async (t) => {
  const root = await workspace(t);
  const input = bundle();
  const original = structuredClone(input);
  const writing = writeProjectBundle(join(root, "isolated"), input);
  input.files["document-0000-original.json"] = "mutated after validation";
  input.manifest.project.name = "Mutated";
  const output = await writing;
  const read = await readProjectBundle(output.manifestPath);
  assert.deepEqual(read.files, original.files);
  assert.deepEqual(read.manifest, original.manifest);
});

test("a source that changes between real handle reads is rejected", async (t) => {
  const root = await workspace(t);
  const original = bundle();
  const record = original.manifest.documents[0]!;
  original.files[record.original.file] = "A".repeat(131_072);
  record.original.digest = digest(original.files[record.original.file]!);
  const { bundleDigest: _digest, ...unsigned } = original.manifest;
  const { canonicalJson } = await import("../../../modules/ads-core/src/index.ts");
  original.manifest.bundleDigest = digest(canonicalJson(unsigned));
  const output = await writeProjectBundle(join(root, "changing"), original);
  const sourcePath = join(output.directory, record.original.file);
  const probe = await open(sourcePath, "r");
  const prototype = Object.getPrototypeOf(probe) as { read: (buffer: Buffer, offset: number, length: number, position: number | null) => Promise<{ bytesRead: number; buffer: Buffer }> };
  await probe.close();
  const read = prototype.read;
  let changed = false;
  t.mock.method(prototype, "read", async function (this: unknown, buffer: Buffer, offset: number, length: number, position: number | null) {
    const result = await read.call(this, buffer, offset, length, position);
    if (!changed && result.bytesRead > 0 && buffer[0] === 65) {
      changed = true;
      await appendFile(sourcePath, "B");
    }
    return result;
  });
  await assert.rejects(() => readProjectBundle(output.manifestPath), /changed during reading/);
  assert.equal(changed, true);
});

test("bundle export never reads an untrusted accessor or Proxy get trap", async (t) => {
  const root = await workspace(t);
  let reads = 0;
  const proxy = new Proxy(bundle(), { get() { reads += 1; throw new Error("Proxy get must not run"); } });
  const output = await writeProjectBundle(join(root, "proxy"), proxy);
  assert.equal((await readProjectBundle(output.manifestPath)).manifest.project.id, "project");
  const accessor = Object.defineProperty({}, "manifest", { enumerable: true, get() { reads += 1; return {}; } });
  await assert.rejects(() => writeProjectBundle(join(root, "accessor"), accessor as ReturnType<typeof bundle>));
  assert.equal(reads, 0);
});
