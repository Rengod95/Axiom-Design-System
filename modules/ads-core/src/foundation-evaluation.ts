import { foundationValueReferences, foundationPointerValue, mapFoundationExpression } from "./foundation-references.ts";
import { checkFoundationValue } from "./foundation-values.ts";
import { TypeInputError } from "./type-input.ts";
import type { JsonValue } from "./contracts.ts";
import type { FoundationDocument, FoundationOverrideTrace, FoundationResolution, FoundationSelection, FoundationThemeSet, FoundationTokenValue } from "./foundation-contracts.ts";
import { FOUNDATION_CODES } from "./foundation-constants.ts";
import { FoundationCheck, own, pointer } from "./foundation-internal.ts";
import { foundationDomainBindings } from "./foundation-starters.ts";
import { getFoundationRole } from "./foundation-roles.ts";
import { inspectFoundationRoleValue } from "./foundation-role-values.ts";

/** Iterative topology covers whole and property/composite edges without call-stack growth. */
export function checkAliasCycles(values: ReadonlyMap<string, FoundationTokenValue>, check: FoundationCheck, path: string): string[] {
  const state = new Map<string, number>(), order: string[] = [];
  for (const id of values.keys()) {
    if (state.get(id) === 2) continue;
    const stack: { id: string; exit: boolean }[] = [{ id, exit: false }];
    while (stack.length) {
      check.step(path); const item = stack.pop()!;
      if (item.exit) { state.set(item.id, 2); order.push(item.id); continue; }
      if (state.get(item.id) === 2) continue;
      if (state.get(item.id) === 1) { check.error(path, `Token alias cycle reaches ${item.id}.`, FOUNDATION_CODES.CYCLE); return []; }
      const value = values.get(item.id);
      if (!value) { check.error(path, `Referenced token ${item.id} is missing.`, FOUNDATION_CODES.ALIAS); return []; }
      state.set(item.id, 1); stack.push({ id: item.id, exit: true });
      for (const reference of foundationValueReferences(value).reverse()) stack.push({ id: reference.ref.id, exit: false });
    }
  }
  return order;
}

/** Shared expression composition for resolution and selected-context reference exports.
 * Inputs must already be detached, shape-checked and have complete selected contexts.
 */
export function composeFoundationExpressions(document: FoundationDocument, contexts: Record<string, string>, theme: FoundationThemeSet | undefined, check: FoundationCheck) {
  const axes = new Map(document.themeAxes.map(axis => [axis.id, axis]));
  const values = new Map(document.tokens.map(token => [token.id, token.value]));
  const traces = new Map<string, FoundationOverrideTrace[]>();
  const paths = new Map(document.tokens.map((token, index) => [token.id, `/tokens/${index}/value`]));
  const groups = new Map((document.valueSets ?? []).map((group, index) => [group.id, { group, index }]));
  const replacedDomains = new Set((theme?.valueSetIds ?? []).flatMap(id => groups.get(id)?.group.domain ? [groups.get(id)!.group.domain!] : []));
  const applyGroup = (id: string, axisId: string, context: string): void => {
    const entry = groups.get(id);
    if (!entry) { check.error("/valueSets", "Selected value group is missing.", FOUNDATION_CODES.CONTEXT); return; }
    for (const [tokenId, value] of Object.entries(entry.group.values)) {
      const path = pointer(`/valueSets/${entry.index}/values`, tokenId);
      check.step(path); values.set(tokenId, value); paths.set(tokenId, path);
      const trace = traces.get(tokenId) ?? [];
      trace.push({ axisId, context, path, valueSetId: id }); traces.set(tokenId, trace);
    }
  };
  for (const axisId of document.resolutionOrder) {
    const axis = axes.get(axisId)!;
    const context = contexts[axisId]!;
    for (const id of axis.valueSetIds?.[context] ?? []) if (!replacedDomains.has(groups.get(id)?.group.domain ?? "")) applyGroup(id, axisId, context);
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
  for (const id of theme?.valueSetIds ?? []) applyGroup(id, theme!.id, "theme");
  return { values, traces, paths };
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
  const { values, traces, paths } = composeFoundationExpressions(document, contexts, theme, check);
  const order = checkAliasCycles(values, check, "/tokens");
  const hasExpressions = [...values.values()].some(value => "composite" in value || "ref" in value && value.ref.path !== undefined);
  if (!check.valid || !includeTokens && !hasExpressions && !document.authoringProfile) { result.valid = check.valid; return result; }
  const resolved = new Map<string, { value: JsonValue; chain: string[]; trace: FoundationOverrideTrace[] }>();
  const tokenById = new Map(document.tokens.map(token => [token.id, token]));
  for (const id of order) {
    const source = values.get(id)!, chain = new Set<string>(), trace = [...(traces.get(id) ?? [])];
    const reference = (ref: { id: string; path?: string }): JsonValue => {
      const target = resolved.get(ref.id);
      if (!target) throw new Error(`Cannot resolve token ${ref.id}.`);
      check.step(paths.get(id)!); chain.add(ref.id);
      for (const ancestor of target.chain) { check.step(paths.get(id)!); chain.add(ancestor); }
      for (const item of target.trace) { check.step(paths.get(id)!); if (!trace.some(previous => previous.path === item.path)) trace.push(item); }
      return ref.path === undefined ? target.value : foundationPointerValue(target.value, ref.path);
    };
    try {
      const value = "literal" in source ? source.literal : "ref" in source ? reference(source.ref) : mapFoundationExpression(source.composite, reference);
      if ("composite" in source || "ref" in source && source.ref.path !== undefined) checkFoundationValue(tokenById.get(id)!.typeRef.id, value, paths.get(id)!, check);
      const role = document.authoringProfile && tokenById.get(id)!.role ? getFoundationRole(tokenById.get(id)!.role!) : undefined;
      if (role) inspectFoundationRoleValue(role, { literal: value }, paths.get(id)!, tokenById, (path, message) => check.error(path, message));
      resolved.set(id, { value, chain: [...chain], trace });
    } catch (error) { if (error instanceof TypeInputError) throw error; check.error(paths.get(id)!, error instanceof Error ? error.message : "Cannot resolve expression.", FOUNDATION_CODES.ALIAS); return result; }
  }
  if (!check.valid) return result;
  const domainBindings = includeTokens ? foundationDomainBindings(document) : new Map();
  if (includeTokens) for (const token of document.tokens) {
    const value = resolved.get(token.id)!;
    let origin = token.id;
    while (true) { check.step(paths.get(origin)!); const source = values.get(origin)!; if (!("ref" in source) || source.ref.path !== undefined) break; origin = source.ref.id; }
    const category = token.domain ? domainBindings.get(token.domain)?.category : undefined;
    result.tokens.push({ id: token.id, name: token.name, type: token.typeRef.id, value: value.value, aliasChain: value.chain, sourcePath: paths.get(origin)!, overrideTrace: value.trace,
      ...(token.domain ? { domain: token.domain } : {}), ...(category ? { bindingCategory: category } : {}), ...(token.role ? { role: token.role } : {}) });
  }
  result.valid = check.valid; return result;
}
