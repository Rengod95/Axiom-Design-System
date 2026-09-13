import type { ValidationProfile } from "./contracts.ts";
import type { BUNDLE_FORMAT, BUNDLE_VERSION } from "./bundle-constants.ts";

export type DigestService = (text: string) => string;
export type ProjectBundleDocument = {
  id: string; kind: string; revision: string; validationProfile?: ValidationProfile;
  original: { file: string; uri: string; digest: string };
  normalized: { file: string; digest: string };
};
export type ProjectBundleManifest = {
  format: typeof BUNDLE_FORMAT; version: typeof BUNDLE_VERSION;
  project: { id: string; name: string; revision: string };
  canonicalProfile: "1.0.0"; hashAlgorithm: "sha256";
  documents: ProjectBundleDocument[]; bundleDigest: string;
};
export type ProjectBundle = { manifest: ProjectBundleManifest; files: Record<string, string> };
export type ProjectBundleSource = ProjectBundle & { uri: string };
