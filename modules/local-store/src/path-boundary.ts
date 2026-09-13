import { constants } from "node:fs";
import { lstat, mkdir, open, readdir } from "node:fs/promises";
import path from "node:path";
import { MAX_STATE_BYTES, STORE_ERROR, STORE_FILES, UUID_PATTERN } from "./constants.ts";
import { FileStoreError, hasCode } from "./storage-error.ts";

/** Reject lexical traversal before resolution; this adapter owns a dedicated directory. */
export function storageDirectory(directory: string): string {
  if (!directory || directory.includes("\0") || directory.split(/[\\/]+/).includes("..")) throw new FileStoreError(STORE_ERROR.path, "A storage directory cannot contain parent traversal or a null byte.");
  const resolved = path.resolve(directory);
  if (resolved === path.parse(resolved).root) throw new FileStoreError(STORE_ERROR.path, "A filesystem root cannot be used as a store.");
  return resolved;
}

/** Check every existing ancestor and create only real directories, without recursive symlink following. */
export async function ensureDirectory(directory: string): Promise<void> {
  const parsed = path.parse(directory);
  let current = parsed.root;
  for (const part of directory.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { await mkdir(current); } catch (error) { if (!hasCode(error, "EEXIST")) throw error; }
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new FileStoreError(STORE_ERROR.path, "Storage ancestors must be real directories.");
  }
}

/** Refuse symlinks and non-regular files at every controlled file boundary. */
export async function readRegular(file: string): Promise<Buffer> {
  const stat = await lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new FileStoreError(STORE_ERROR.path, "A controlled storage file is not a regular file.");
  if (stat.size > MAX_STATE_BYTES) throw new FileStoreError(STORE_ERROR.corrupt, "A storage record exceeds the bounded profile size.");
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== stat.dev || opened.ino !== stat.ino) throw new FileStoreError(STORE_ERROR.path, "A storage file changed during its path check.");
    return await handle.readFile();
  } finally { await handle.close(); }
}

/** Unknown files are not silently adopted as storage or treated as user source paths. */
export async function checkRootEntries(directory: string): Promise<void> {
  const allowed: Set<string> = new Set(Object.values(STORE_FILES));
  for (const name of await readdir(directory)) {
    const temporary = name.startsWith(".head-") || name.startsWith(".identity-");
    const identifier = temporary ? name.slice(name.indexOf("-") + 1, -4) : "";
    if (!allowed.has(name) && !(temporary && name.endsWith(".tmp") && UUID_PATTERN.test(identifier))) throw new FileStoreError(STORE_ERROR.path, "The chosen directory contains files outside the storage layout.");
  }
}
