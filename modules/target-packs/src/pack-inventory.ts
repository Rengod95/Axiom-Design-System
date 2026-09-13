import { canonicalJson } from "../../ads-core/src/index.ts";
import { TARGET_CODE, TARGET_IDS, TARGET_LIMITS, TARGET_MANIFEST_FILE, TARGET_PACK_VERSION } from "./constants.ts";
import type { SourceFile, TargetDigest, TargetPack } from "./contracts.ts";
import { hashSource, inspectSourceFiles } from "./source-inventory.ts";
import { TargetError } from "./target-error.ts";
import { validatePackShape } from "./manifest-shape.ts";

/** Validate content-addressed files before delivering an externally supplied pack. */
export function inspectTargetPack(input: TargetPack, digest: TargetDigest): TargetPack {
  const snapshot:unknown = JSON.parse(canonicalJson(input, TARGET_LIMITS.maxTotalBytes * 2));validatePackShape(snapshot);
  const pack=snapshot as TargetPack;
  const files = inspectSourceFiles(pack.files);
  if (files.some((file) => file.path.toLowerCase() === TARGET_MANIFEST_FILE)) throw new TargetError(TARGET_CODE.INVALID, "Generated inventory cannot overwrite its manifest");
  if (!Array.isArray(pack.manifest.files) || pack.manifest.files.length !== files.length) throw new TargetError(TARGET_CODE.INVALID, "Manifest file inventory differs from source files");
  for (const file of files) {
    const metadata = pack.manifest.files.filter((item) => item.path === file.path);
    const original = pack.files.find((item) => item.path === file.path);
    if (metadata.length !== 1 || metadata[0]?.digest !== hashSource(file.text, digest) || original?.digest !== metadata[0]?.digest || original?.kind !== metadata[0]?.kind) throw new TargetError(TARGET_CODE.INVALID, "Manifest file digest or kind does not match", file.path);
  }
  pack.files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return pack;
}

/** Include the non-self-referential manifest in an exact output inventory. */
export function getTargetFiles(pack: TargetPack, digest: TargetDigest): SourceFile[] {
  const checked = inspectTargetPack(pack, digest);
  return inspectSourceFiles([...checked.files.map(({ path, text }) => ({ path, text })), { path: TARGET_MANIFEST_FILE, text: `${canonicalJson(checked.manifest)}\n` }]);
}
