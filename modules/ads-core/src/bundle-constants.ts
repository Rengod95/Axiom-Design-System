/** ADR-0012's bounded, source-preserving project transfer format. */
export const BUNDLE_FORMAT = "ads-project-bundle" as const;
export const BUNDLE_VERSION = "1.0.0" as const;
export const BUNDLE_MANIFEST_FILE = "manifest.json" as const;
export const BUNDLE_LIMITS = Object.freeze({ maxDocuments: 64, maxFileBytes: 1_048_576, maxCombinedBytes: 4_194_304, maxPayloadBytes: 8_388_608 });

/** Names are positional transport slots, never document IDs or external paths. */
export function bundleFileName(index: number, source: "original" | "normalized"): string {
  return `document-${String(index).padStart(4, "0")}-${source}.json`;
}
