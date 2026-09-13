import { canonicalJson } from "../../../modules/ads-core/src/index.ts";
import type { JsonValue } from "../../../modules/ads-core/src/index.ts";

export interface ReviewField { path: string; before?: JsonValue; after?: JsonValue }
/** A bounded presentation of the approved field diff. The full field remains available. */
export function summarizeField(field: ReviewField): ReviewField[] {
  const result: ReviewField[] = [];
  let remaining = 512;
  const visit = (before: JsonValue | undefined, after: JsonValue | undefined, path: string, depth: number): void => {
    if (before === undefined && after === undefined || before !== undefined && after !== undefined && canonicalJson(before) === canonicalJson(after)) return;
    if (--remaining < 0 || depth > 12 || result.length >= 64) throw new Error("Show the complete field instead.");
    if (before !== null && after !== null && typeof before === "object" && typeof after === "object" && Array.isArray(before) === Array.isArray(after)) {
      if (Array.isArray(before) && Array.isArray(after)) {
        if (before.length !== after.length || before.length > 64) { result.push({ path, before, after }); return; }
        for (let index = 0; index < before.length; index++) visit(before[index], after[index], `${path}/${index}`, depth + 1);
      } else if (!Array.isArray(before) && !Array.isArray(after)) {
        for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) visit(before[key], after[key], `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`, depth + 1);
      }
    } else result.push({ path, ...(before === undefined ? {} : { before }), ...(after === undefined ? {} : { after }) });
  };
  try { visit(field.before, field.after, field.path, 0); return result; } catch { return [field]; }
}
