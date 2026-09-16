import type { JsonObject } from "./contracts.ts";
import type { FoundationDocument } from "./foundation-contracts.ts";
import { isObject, isValidId } from "./documents.ts";
import { decodeFoundationPointer } from "./foundation-references.ts";

export const FOUNDATION_IMPORT_IDENTITY_VERSION = "1.0.0";
export type FoundationImportFormat = "dtcg" | "resolver";

/** DTCG token names contain no literal dots; this records the original path before any display prefix. */
export function foundationImportPath(name: string): string {
  return `/${name.split(".").map(segment => segment.replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}`;
}

/** Read retained source mappings without equating current display names with external identities. */
export function foundationImportIdentities(document: FoundationDocument, uri: string, prefix: string, format: FoundationImportFormat, digest: (text: string) => string): Map<string, string> {
  const identities = new Map<string, string>(), sourceIds = new Map<string, string>();
  let retained = false, mapped = false;
  for (const source of document.originalSources) {
    if (!isObject(source) || source.format !== "dtcg" || source.uri !== uri || (source.importPrefix ?? "") !== prefix || (source.resolver ? "resolver" : "dtcg") !== format) continue;
    retained = true;
    if (source.sourceIdentity === undefined) continue;
    const mapping = source.sourceIdentity;
    if (!isObject(mapping) || mapping.version !== FOUNDATION_IMPORT_IDENTITY_VERSION || mapping.format !== format || !isObject(mapping.tokenIds)) throw new Error("The retained import identity mapping is unsupported or malformed. Restore the source capture before updating.");
    if (typeof source.originalText !== "string" || typeof source.digest !== "string" || digest(source.originalText) !== source.digest) throw new Error("The retained source bytes no longer match their recorded digest. Restore the source capture before updating.");
    mapped = true;
    for (const [path, id] of Object.entries(mapping.tokenIds)) {
      let canonical = false;
      try { canonical = path.startsWith("/") && foundationImportPath(decodeFoundationPointer(path).join(".")) === path; } catch { /* Reject a malformed retained path below. */ }
      if (!canonical || typeof id !== "string" || !isValidId(id)) throw new Error("The retained import identity mapping contains an invalid source path or token ID.");
      if (identities.has(path) && identities.get(path) !== id || sourceIds.has(id) && sourceIds.get(id) !== path) throw new Error("The retained import identity mapping is ambiguous. Resolve its source paths before updating.");
      identities.set(path, id); sourceIds.set(id, path);
    }
  }
  if (retained && !mapped) throw new Error("This older source capture has no stable path-to-token mapping. Import with a new prefix to create an independent copy; a matching name cannot authorize an update.");
  return identities;
}

/** Persist an explicit mapping next to original bytes; token labels may subsequently change independently. */
export function foundationImportIdentity(format: FoundationImportFormat, paths: ReadonlyMap<string, string>): JsonObject {
  return { version: FOUNDATION_IMPORT_IDENTITY_VERSION, format, tokenIds: Object.fromEntries(paths) };
}
