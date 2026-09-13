import { open, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { IMPORT_LIMITS } from "../../../modules/ads-core/src/index.ts";
import { CLI_DIAGNOSTIC } from "./constants.ts";

const READ_CHUNK_BYTES = 65_536;

function sourceError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

/** Read only regular files, with a fixed allocation ceiling even if a file grows. */
async function readBoundedSource(sourcePath: string, maximumBytes: number): Promise<Buffer> {
  const selected = await stat(sourcePath);
  if (!selected.isFile()) throw sourceError(CLI_DIAGNOSTIC.SOURCE_TYPE, `Source must be a regular file: ${sourcePath}`);
  if (selected.size > maximumBytes) throw sourceError(CLI_DIAGNOSTIC.IMPORT_LIMIT, `Source exceeds the remaining import byte limit: ${sourcePath}`);
  const handle = await open(sourcePath, "r");
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw sourceError(CLI_DIAGNOSTIC.SOURCE_TYPE, `Source must be a regular file: ${sourcePath}`);
    if (before.size > BigInt(maximumBytes)) throw sourceError(CLI_DIAGNOSTIC.IMPORT_LIMIT, `Source exceeds the remaining import byte limit: ${sourcePath}`);
    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      const chunk = Buffer.alloc(Math.min(READ_CHUNK_BYTES, maximumBytes - total + 1));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > maximumBytes) throw sourceError(CLI_DIAGNOSTIC.IMPORT_LIMIT, `Source grew beyond the import byte limit: ${sourcePath}`);
      chunks.push(chunk.subarray(0, bytesRead));
    }
    const after = await handle.stat({ bigint: true });
    if (before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || BigInt(total) !== after.size) {
      throw sourceError(CLI_DIAGNOSTIC.SOURCE_CHANGED, `Source changed while being read; retry with a stable file: ${sourcePath}`);
    }
    return Buffer.concat(chunks, total);
  } finally { await handle.close(); }
}

/** Load sources sequentially within the core's public file and aggregate limits. */
export async function loadSourceFiles(files: readonly string[]): Promise<{ uri: string; content: string }[]> {
  if (files.length === 0 || files.length > IMPORT_LIMITS.maxDocuments) throw sourceError(CLI_DIAGNOSTIC.IMPORT_LIMIT, "Import source count exceeds the bounded profile.");
  const sources: { uri: string; content: string }[] = [];
  let remaining = IMPORT_LIMITS.maxBatchBytes;
  for (const file of files) {
    const sourcePath = resolve(file);
    const bytes = await readBoundedSource(sourcePath, Math.min(IMPORT_LIMITS.maxDocumentBytes, remaining));
    remaining -= bytes.length;
    let content: string;
    try { content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
    catch (cause) { throw Object.assign(new Error(`Source is not valid UTF-8: ${sourcePath}`, { cause }), { code: CLI_DIAGNOSTIC.UTF8 }); }
    sources.push({ uri: pathToFileURL(sourcePath).href, content });
  }
  return sources;
}
