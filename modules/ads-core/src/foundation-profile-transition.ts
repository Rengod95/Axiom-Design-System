import type { AdsDocument, DocumentEntry, JsonObject } from "./contracts.ts";
import { canonicalJson } from "./canonical-json.ts";
import { CODE } from "./constants.ts";
import { KernelError } from "./kernel-error.ts";

/** Ordinary source updates cannot silently opt an adopted Foundation out of its value policy.
 * History restoration validates its recorded snapshot separately; it is not a source update.
 */
export function assertFoundationProfileTransition(before: AdsDocument, after: JsonObject): void {
  if (before.kind !== "foundation" || before.authoringProfile === undefined) return;
  if (canonicalJson(before.authoringProfile) !== canonicalJson(after.authoringProfile ?? null)) {
    throw new KernelError(CODE.MIGRATION_UNSUPPORTED, "An adopted Foundation profile cannot be removed or changed by a source update. Use the recorded migration Undo to restore the previous snapshot.");
  }
}

/** Recheck the source-update rule when proposing and applying a candidate, including persisted candidates. */
export function assertFoundationProfileTransitions(before: Record<string, DocumentEntry>, after: Record<string, DocumentEntry>): void {
  for (const [id, entry] of Object.entries(before)) if (after[id]) assertFoundationProfileTransition(entry.document, after[id]!.document);
}
