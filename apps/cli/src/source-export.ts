import { lstat, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";
import type { SourceExport } from "../../../modules/ads-core/src/index.ts";
import { CLI_DIAGNOSTIC } from "./constants.ts";

const EXPORT_FILES = { original: "original.json", normalized: "normalized.json", manifest: "manifest.json" } as const;
const JSON_INDENT = 2;

function pathError(message: string): Error { return Object.assign(new Error(message), { code: CLI_DIAGNOSTIC.EXPORT_PATH }); }

/** Refuse traversal and existing links before creating a single fresh output directory. */
async function createExportDirectory(requested: string): Promise<string> {
  if (requested.split(/[\\/]/u).includes("..")) throw pathError("Export directory cannot contain parent traversal segments.");
  const directory = resolve(requested);
  let ancestor = dirname(directory);
  while (true) {
    const info = await lstat(ancestor);
    if (info.isSymbolicLink() || !info.isDirectory()) throw pathError("Export ancestors must be ordinary existing directories.");
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  if (directory === parse(directory).root) throw pathError("Choose a fresh directory below an existing parent.");
  try { await mkdir(directory); }
  catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "EEXIST") throw pathError("Export directory already exists; choose a fresh directory.");
    throw cause;
  }
  return directory;
}

/** Write exact source bytes and canonical bytes; a manifest is emitted only after both succeed. */
export async function writeSourceExport(requested: string, source: SourceExport): Promise<Record<string, unknown>> {
  const directory = await createExportDirectory(requested);
  const identity = await lstat(directory, { bigint: true });
  const writeFresh = async (name: string, text: string): Promise<void> => {
    const current = await lstat(directory, { bigint: true });
    if (current.isSymbolicLink() || !current.isDirectory() || current.dev !== identity.dev || current.ino !== identity.ino) throw pathError("Export directory changed during the write; partial output may remain.");
    await writeFile(join(directory, name), text, { encoding: "utf8", flag: "wx" });
  };
  await writeFresh(EXPORT_FILES.original, source.original.text);
  await writeFresh(EXPORT_FILES.normalized, source.normalized.text);
  const manifest = {
    documentId: source.documentId, revision: source.revision, projectRevision: source.projectRevision,
    canonicalProfile: source.canonicalProfile, hashAlgorithm: source.hashAlgorithm,
    original: { file: EXPORT_FILES.original, uri: source.original.uri, digest: source.original.digest },
    normalized: { file: EXPORT_FILES.normalized, digest: source.normalized.digest },
    diagnostics: source.diagnostics, validation: source.validation, semantics: source.semantics,
    ...(source.validationProfile === undefined ? {} : { validationProfile: source.validationProfile }),
  };
  await writeFresh(EXPORT_FILES.manifest, `${JSON.stringify(manifest, null, JSON_INDENT)}\n`);
  return { directory, ...manifest };
}
