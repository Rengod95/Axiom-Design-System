import { canonicalJson } from "../../ads-core/src/index.ts";
import { TARGET_CODE, TARGET_PACK_VERSION } from "./constants.ts";
import type { FileAction, SourceFile, TargetDigest, TargetPack, UpgradeFile, UpgradePlan } from "./contracts.ts";
import { getTargetFiles, inspectTargetPack } from "./pack-inventory.ts";
import { hashSource, inspectSourceFiles } from "./source-inventory.ts";
import { TargetError } from "./target-error.ts";

/** Compare immutable old generation, observed user bytes and new generation at whole-file granularity. */
export function planUpgrade(baseline: TargetPack, current: readonly SourceFile[], next: TargetPack, digest: TargetDigest): UpgradePlan {
  const previous = inspectTargetPack(baseline, digest); const target = inspectTargetPack(next, digest);
  if (previous.manifest.target.id !== target.manifest.target.id || previous.manifest.source.projectId !== target.manifest.source.projectId) throw new TargetError(TARGET_CODE.INVALID, "An upgrade must retain its target profile and source project identity");
  const oldFiles = new Map(getTargetFiles(previous, digest).map((file) => [file.path, file.text]));
  const currentFiles = new Map(inspectSourceFiles(current).map((file) => [file.path, file.text]));
  const nextFiles = new Map(getTargetFiles(target, digest).map((file) => [file.path, file.text]));
  const names = [...new Set([...oldFiles.keys(), ...currentFiles.keys(), ...nextFiles.keys()])].sort();
  const files: UpgradeFile[] = names.map((path) => {
    const baseline = oldFiles.get(path) ?? null; const current = currentFiles.get(path) ?? null; const generated = nextFiles.get(path) ?? null;
    let action: FileAction;
    if (current === generated) action = "unchanged";
    else if (baseline === generated) action = "preserve";
    else if (current === baseline) action = generated === null ? "delete" : current === null ? "create" : "replace";
    else action = "conflict";
    return { path, action, baseline, current, generated, baselineDigest: baseline === null ? null : hashSource(baseline, digest), currentDigest: current === null ? null : hashSource(current, digest), generatedDigest: generated === null ? null : hashSource(generated, digest) };
  });
  const body = { formatVersion: TARGET_PACK_VERSION, target: target.manifest.target.id, fromSourceRevision: previous.manifest.source.revision, toSourceRevision: target.manifest.source.revision, files, conflicts: files.filter((item) => item.action === "conflict").map((item) => item.path) };
  return { ...body, digest: hashSource(canonicalJson(body), digest) };
}
