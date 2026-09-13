import type { JsonValue } from "./contracts.ts";
import type { FoundationDocument, FoundationOverrideTrace, FoundationResolution, FoundationSelection, FoundationTokenValue } from "./foundation-contracts.ts";
import { FOUNDATION_CODES } from "./foundation-constants.ts";
import { FoundationCheck, own, pointer } from "./foundation-internal.ts";

/** Linear cycle inspection of one concrete effective token graph. */
export function checkAliasCycles(values: ReadonlyMap<string, FoundationTokenValue>, check: FoundationCheck, path: string): void {
  const done = new Set<string>();
  for (const id of values.keys()) {
    if (done.has(id)) continue;
    const active = new Set<string>();
    let current: string | undefined = id;
    while (current !== undefined && !done.has(current)) {
      check.step(path);
      if (active.has(current)) { check.error(path, `Token alias cycle reaches ${current}.`, FOUNDATION_CODES.CYCLE); break; }
      active.add(current);
      const value: FoundationTokenValue | undefined = values.get(current);
      current = value && "ref" in value ? value.ref.id : undefined;
    }
    for (const seen of active) done.add(seen);
  }
}

/** Internal evaluation only accepts a detached, fully shape-checked Foundation. */
export function evaluateFoundation(document: FoundationDocument, selection: FoundationSelection, check: FoundationCheck, includeTokens = true): FoundationResolution {
  const contexts: Record<string, string> = Object.create(null) as Record<string, string>;
  const result: FoundationResolution = { valid: false, diagnostics: check.diagnostics, foundationId: document.id, contexts, resolutionOrder: [...document.resolutionOrder], tokens: [] };
  const axes = new Map(document.themeAxes.map(axis => [axis.id, axis]));
  let theme = undefined;
  if (selection.themeSetId !== undefined) {
    theme = document.themeSets.find(item => item.id === selection.themeSetId);
    if (!theme) check.error("/selection/themeSetId", "Unknown ThemeSet.", FOUNDATION_CODES.CONTEXT);
  }
  if (selection.contexts) for (const id of Object.keys(selection.contexts)) if (!axes.has(id)) check.error(pointer("/selection/contexts", id), "Unknown theme axis.", FOUNDATION_CODES.CONTEXT);
  for (const axis of document.themeAxes) {
    check.step("/themeAxes");
    const context = selection.contexts && own(selection.contexts, axis.id) ? selection.contexts[axis.id] : theme?.contexts[axis.id] ?? axis.default;
    if (context === undefined || !axis.contexts.includes(context)) check.error(pointer("/selection/contexts", axis.id), "Select one declared context for every axis.", FOUNDATION_CODES.CONTEXT);
    else contexts[axis.id] = context;
  }
  if (!check.valid) return result;
  const values = new Map(document.tokens.map(token => [token.id, token.value]));
  const traces = new Map<string, FoundationOverrideTrace[]>();
  const paths = new Map(document.tokens.map((token, index) => [token.id, `/tokens/${index}/value`]));
  for (const axisId of document.resolutionOrder) {
    const axis = axes.get(axisId)!;
    const context = contexts[axisId]!;
    const overrides = axis.overrides?.[context];
    if (!overrides) continue;
    const axisIndex = document.themeAxes.indexOf(axis);
    for (const [tokenId, value] of Object.entries(overrides)) {
      const path = pointer(pointer(`/themeAxes/${axisIndex}/overrides`, context), tokenId);
      check.step(path); values.set(tokenId, value); paths.set(tokenId, path);
      const trace = traces.get(tokenId) ?? [];
      trace.push({ axisId, context, path }); traces.set(tokenId, trace);
    }
  }
  checkAliasCycles(values, check, "/tokens");
  if (!check.valid || !includeTokens) { result.valid = check.valid; return result; }
  for (const token of document.tokens) {
    let value = values.get(token.id)!;
    const chain: string[] = [];
    const overrideTrace: FoundationOverrideTrace[] = [...(traces.get(token.id) ?? [])];
    while ("ref" in value) {
      check.step(paths.get(token.id)!);
      chain.push(value.ref.id); overrideTrace.push(...(traces.get(value.ref.id) ?? []));
      value = values.get(value.ref.id)!;
    }
    // Values are detached snapshots. Preserve DTCG representation (including none,
    // optional alpha, font-weight names and out-of-range gradient source positions).
    result.tokens.push({ id: token.id, name: token.name, type: token.typeRef.id, value: value.literal as JsonValue, aliasChain: chain, sourcePath: paths.get(chain.at(-1) ?? token.id)!, overrideTrace });
  }
  result.valid = check.valid; return result;
}
