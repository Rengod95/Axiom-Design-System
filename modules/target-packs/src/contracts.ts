import type { Diagnostic, JsonValue, StudioSelection } from "../../ads-core/src/index.ts";
import type { TARGET_IDS } from "./constants.ts";

export type TargetId = typeof TARGET_IDS[number];
export type TargetDigest = (text: string) => string;
export interface SourceFile { path: string; text: string }
export interface TargetFile extends SourceFile { kind: "source" | "style" | "configuration" | "documentation"; digest: string }
export interface TargetManifest {
  formatVersion: string; generator: { id: string; version: string };
  source: { projectId: string; revision: string; digest: string; themeContexts: Record<string, string> };
  target: { id: TargetId; version: string; dependencies: Record<string, string>; licenses: Record<string, string> };
  files: { path: string; digest: string; kind: TargetFile["kind"] }[];
  publicApiMap: Record<string, string>; capabilities: string[]; limitations: string[];
  verification: { generated: "passed"; typechecked: "not-run"; runtime: "not-run" };
  conversionPolicy: { color: string; dimension: string; motion: string };
}
export interface TargetPack { manifest: TargetManifest; files: TargetFile[]; diagnostics: Diagnostic[] }
export interface TargetGeneration { valid: boolean; diagnostics: Diagnostic[]; pack?: TargetPack }
export interface TargetOptions { target: TargetId; packageName?: string; selection?: StudioSelection }
export type FileAction = "create" | "replace" | "delete" | "preserve" | "unchanged" | "conflict";
export interface UpgradeFile {
  path: string; action: FileAction;
  baseline: string | null; current: string | null; generated: string | null;
  baselineDigest: string | null; currentDigest: string | null; generatedDigest: string | null;
}
/** All observed current files are bound to the digest, including preserved user files. */
export interface UpgradePlan {
  formatVersion: string; target: TargetId; fromSourceRevision: string; toSourceRevision: string;
  files: UpgradeFile[]; conflicts: string[]; digest: string;
}
/** Resolved visual values are primitive or DTCG values; target mapping remains explicit. */
export type TargetValue = JsonValue;
