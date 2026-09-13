import { canonicalJson } from "../../ads-core/src/index.ts";
import { DIGEST_PATTERN, TARGET_CODE, TARGET_FILE_PATTERN, TARGET_LIMITS, TARGET_RESERVED_NAME } from "./constants.ts";
import type { SourceFile, TargetDigest } from "./contracts.ts";
import { TargetError } from "./target-error.ts";

/** Restrict output paths to portable relative files; Windows aliases are rejected on every host. */
export function validateSourcePath(path: string): void {
  if (typeof path !== "string" || path.length > 240 || !TARGET_FILE_PATTERN.test(path) || path.split("/").some((part) => part === "." || part === ".." || part.endsWith(".") || TARGET_RESERVED_NAME.test(part))) throw new TargetError(TARGET_CODE.INVALID, "Output path is not a portable relative file", typeof path==="string"?path:undefined);
}

/** Snapshot descriptor-checked input before reading its fields; enforce byte and collision limits. */
export function inspectSourceFiles(input: readonly SourceFile[]): SourceFile[] {
  const snapshot: unknown = JSON.parse(canonicalJson(input, TARGET_LIMITS.maxTotalBytes * 2));
  if (!Array.isArray(snapshot) || snapshot.length > TARGET_LIMITS.maxFiles) throw new TargetError(TARGET_CODE.LIMIT, "Source file inventory exceeds the supported count");
  const names = new Set<string>(); let total = 0;
  const files: SourceFile[] = [];
  for (const item of snapshot as unknown[]) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new TargetError(TARGET_CODE.INVALID, "Source file entry must be an object");
    const value = item as Record<string, unknown>;
    if (typeof value.path !== "string" || typeof value.text !== "string") throw new TargetError(TARGET_CODE.INVALID, "Source files require a path and UTF-8 text");
    validateSourcePath(value.path);
    const key = value.path.toLowerCase();
    if (names.has(key) || [...names].some((name) => key.startsWith(`${name}/`) || name.startsWith(`${key}/`))) throw new TargetError(TARGET_CODE.INVALID, "Source paths collide", value.path);
    names.add(key);
    if (/\p{Surrogate}/u.test(value.text)) throw new TargetError(TARGET_CODE.INVALID, "Source text contains an unpaired UTF-16 surrogate", value.path);
    const bytes = new TextEncoder().encode(value.text).length;
    total += bytes;
    if (bytes > TARGET_LIMITS.maxFileBytes || total > TARGET_LIMITS.maxTotalBytes) throw new TargetError(TARGET_CODE.LIMIT, "Source file bytes exceed the delivery limit", value.path);
    files.push({ path: value.path, text: value.text });
  }
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

/** Require the injected host digest to implement the manifest's lowercase SHA-256 contract. */
export function hashSource(text: string, digest: TargetDigest): string {
  const value = digest(text);
  if (!DIGEST_PATTERN.test(value)) throw new TargetError(TARGET_CODE.INVALID, "Digest service must return lowercase SHA-256");
  return value;
}
