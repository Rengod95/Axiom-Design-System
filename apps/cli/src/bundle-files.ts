import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BUNDLE_MANIFEST_FILE, BUNDLE_LIMITS, canonicalJson, decodeProjectBundle, KernelError, parseJson, validateProjectBundleManifest } from "../../../modules/ads-core/src/index.ts";
import type { JsonObject, ProjectBundle } from "../../../modules/ads-core/src/index.ts";

const MANIFEST = BUNDLE_MANIFEST_FILE;
const READ_CHUNK_BYTES = 65_536;
const digest = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");
function fail(message: string, code = "BUNDLE_INVALID"): never { throw new KernelError(code, message); }
type Identity = { path: string; dev: bigint; ino: bigint };

async function directoryIdentity(path: string): Promise<Identity> {
  const current = await lstat(path, { bigint: true });
  if (current.isSymbolicLink() || !current.isDirectory()) fail("Bundle ancestors must be ordinary directories.");
  return { path, dev: current.dev, ino: current.ino };
}
async function ancestorIdentities(directory: string): Promise<Identity[]> {
  const identities: Identity[] = [];
  let current = directory;
  while (true) {
    identities.push(await directoryIdentity(current));
    const parent = dirname(current);
    if (parent === current) return identities;
    current = parent;
  }
}
async function checkDirectories(identities: Identity[]): Promise<void> {
  for (const expected of identities) {
    const actual = await directoryIdentity(expected.path);
    if (actual.dev !== expected.dev || actual.ino !== expected.ino) fail("Bundle directory changed during I/O.");
  }
}
function selectedPath(requested: string): string {
  if (requested.split(/[\\/]/u).includes("..")) fail("Bundle paths cannot contain parent traversal.");
  return resolve(requested);
}
function sameFile(left: { dev: bigint; ino: bigint; size: bigint; mtimeNs: bigint; ctimeNs: bigint }, right: typeof left): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

/** Snapshot one regular file through a bounded handle; reject links and replacement/growth. */
async function readStable(path: string, limit: number, directories: Identity[]): Promise<{ text: string; bytes: number }> {
  await checkDirectories(directories);
  const selected = await lstat(path, { bigint: true });
  if (selected.isSymbolicLink() || !selected.isFile()) fail("Bundle inputs must be ordinary regular files.");
  if (selected.size > BigInt(limit)) fail("Bundle source exceeds its byte limit.", "BUNDLE_LIMIT");
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    const before = await handle.stat({ bigint: true });
    const openedPath = await lstat(path, { bigint: true });
    if (!before.isFile() || openedPath.isSymbolicLink() || !sameFile(selected, before) || !sameFile(before, openedPath)) fail("Bundle source changed before reading.");
    await checkDirectories(directories);
    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      const chunk = Buffer.alloc(Math.min(READ_CHUNK_BYTES, limit - total + 1));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > limit) fail("Bundle source grew beyond its byte limit.", "BUNDLE_LIMIT");
      chunks.push(chunk.subarray(0, bytesRead));
    }
    const after = await handle.stat({ bigint: true });
    const current = await lstat(path, { bigint: true });
    if (current.isSymbolicLink() || !sameFile(before, after) || !sameFile(after, current) || after.size !== BigInt(total)) fail("Bundle source changed during reading.");
    await checkDirectories(directories);
    try { return { text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks, total)), bytes: total }; }
    catch { return fail("Bundle source is not valid UTF-8."); }
  } finally { await handle.close(); }
}

/** Fixed files in a fresh directory; the manifest only appears after all data files succeed. */
export async function writeProjectBundle(requested: string, bundle: ProjectBundle): Promise<{ directory: string; manifestPath: string; bundleDigest: string }> {
  const directory = selectedPath(requested);
  if (directory === parse(directory).root) fail("Choose a fresh bundle directory below an existing parent.");
  const uri = pathToFileURL(join(directory, MANIFEST)).href;
  const snapshot = JSON.parse(canonicalJson(bundle, BUNDLE_LIMITS.maxPayloadBytes)) as ProjectBundle;
  const manifest = validateProjectBundleManifest(snapshot.manifest, digest);
  decodeProjectBundle({ uri, ...snapshot }, { ...manifest.project, documents: {} }, digest);
  const parents = await ancestorIdentities(dirname(directory));
  await checkDirectories(parents);
  await mkdir(directory, { mode: 0o700 });
  const directories = [await directoryIdentity(directory), ...parents];
  const write = async (name: string, content: string): Promise<void> => {
    await checkDirectories(directories);
    await writeFile(join(directory, name), content, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await checkDirectories(directories);
  };
  for (const record of manifest.documents) {
    await write(record.original.file, snapshot.files[record.original.file]!);
    await write(record.normalized.file, snapshot.files[record.normalized.file]!);
  }
  const manifestPath = join(directory, MANIFEST);
  await write(MANIFEST, `${canonicalJson(manifest)}\n`);
  return { directory, manifestPath, bundleDigest: manifest.bundleDigest };
}

/** Read a selected local bundle only; URI metadata is never interpreted as an input path. */
export async function readProjectBundle(requested: string): Promise<ProjectBundle & { uri: string }> {
  const manifestPath = selectedPath(requested);
  if (basename(manifestPath) !== MANIFEST) fail("Select the bundle's manifest.json file.");
  const directory = dirname(manifestPath);
  const directories = await ancestorIdentities(directory);
  const manifestSource = await readStable(manifestPath, BUNDLE_LIMITS.maxPayloadBytes, directories);
  const manifest = validateProjectBundleManifest(parseJson(manifestSource.text, BUNDLE_LIMITS.maxPayloadBytes), digest);
  const expected = new Set([MANIFEST, ...manifest.documents.flatMap((record) => [record.original.file, record.normalized.file])]);
  const checkListing = async (): Promise<void> => {
    const names = await readdir(directory);
    if (names.length !== expected.size || names.some((name) => !expected.has(name))) fail("Bundle contains missing or unlisted files.");
  };
  await checkListing();
  const files: Record<string, string> = {};
  let remaining = BUNDLE_LIMITS.maxCombinedBytes;
  for (const record of manifest.documents) {
    for (const name of [record.original.file, record.normalized.file]) {
      const source = await readStable(join(directory, name), Math.min(BUNDLE_LIMITS.maxFileBytes, remaining), directories);
      files[name] = source.text;
      remaining -= source.bytes;
    }
  }
  // Catch manifest replacement while its listed files were being read.
  const finalManifest = await readStable(manifestPath, BUNDLE_LIMITS.maxPayloadBytes, directories);
  if (finalManifest.text !== manifestSource.text) fail("Bundle manifest changed while reading its sources.");
  await checkListing();
  await checkDirectories(directories);
  const source = { uri: pathToFileURL(manifestPath).href, manifest, files };
  decodeProjectBundle(source as JsonObject, { ...manifest.project, documents: {} }, digest);
  return source;
}
