import type { FoundationResolution, FoundationSelection } from "./foundation-contracts.ts";
import { FOUNDATION_CODES } from "./foundation-constants.ts";
import { FoundationCheck, nonblank, own, record } from "./foundation-internal.ts";
import { checkFoundationSnapshot } from "./foundation-validation.ts";
import { evaluateFoundation } from "./foundation-evaluation.ts";

/** Public boundary: both inputs are detached before reading; failures have no usable tokens. */
export function resolveFoundationTokens(document: unknown, selection: FoundationSelection = {}, sourceRef = "memory:foundation"): FoundationResolution {
  const check = new FoundationCheck(sourceRef);
  let result: FoundationResolution = { valid: false, diagnostics: check.diagnostics, foundationId: null, contexts: {}, resolutionOrder: [], tokens: [] };
  try {
    const snapshot = checkFoundationSnapshot(check.snapshot(document), check);
    const selected = check.snapshot(selection, "/selection");
    if (!record(selected) || Object.keys(selected).some(key => key !== "themeSetId" && key !== "contexts") || own(selected, "themeSetId") && !nonblank(selected.themeSetId) || own(selected, "contexts") && (!record(selected.contexts) || !Object.values(selected.contexts).every(nonblank))) check.error("/selection", "Expected an optional ThemeSet ID and a string context map.", FOUNDATION_CODES.CONTEXT);
    if (snapshot && check.valid) result = evaluateFoundation(snapshot, selected as unknown as FoundationSelection, check);
  } catch (error) { check.caught(error); }
  result.valid = check.valid;
  if (!check.valid) result.tokens = [];
  return result;
}
