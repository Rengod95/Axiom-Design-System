import { createHash } from "node:crypto";
import { canonicalJson, createStudioStarter } from "../../ads-core/src/index.ts";
import type { ProjectSnapshot } from "../../ads-core/src/index.ts";

export const DIGEST = (text: string): string => createHash("sha256").update(text).digest("hex");
/** Use the public, accepted starter contract as an independently editable fixture. */
export function projectFixture(): ProjectSnapshot {
  return { id: "project.targets", name: "Target checks", revision: "revision.initial", documents: Object.fromEntries(createStudioStarter("project.targets").map((document) => [document.id, { document, originalText: canonicalJson(document), sourceUri: `memory:${document.id}`, validation: "envelope-only", validationProfile: "foundation-studio", diagnostics: [] }])) };
}
