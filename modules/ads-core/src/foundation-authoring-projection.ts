import { canonicalJson } from "./canonical-json.ts";
import { isObject } from "./documents.ts";
import { FOUNDATION_TOKEN_TYPES } from "./foundation-constants.ts";
import { inspectFoundationDocument } from "./foundation-validation.ts";
import { inspectStudioProject } from "./studio-projection.ts";
import { studioDiagnostic } from "./studio-validation.ts";
import { authoringFoundation, authoringList, captureAuthoringProject, foundationReferences } from "./foundation-authoring-internal.ts";
import type { JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { FoundationSelection, FoundationTokenType } from "./foundation-contracts.ts";
import type { FoundationAuthoringFilter, FoundationAuthoringProjection, FoundationClassification, FoundationTokenRow } from "./foundation-authoring-contracts.ts";

const empty = (): FoundationAuthoringProjection => ({ valid: false, diagnostics: [], foundationId: null, revision: null, tokens: [], totalTokens: 0, matchingTokens: 0, domains: [], tiers: [], axes: [], themeSets: [], contexts: {}, resolutionOrder: [], references: [], referenceScope: "known-studio" });

/** Search and reverse references describe known source locations and the selected resolved context separately. */
export function inspectFoundationAuthoring(input: ProjectSnapshot, selection: FoundationSelection = {}, filterInput: FoundationAuthoringFilter = {}): FoundationAuthoringProjection {
  const result = empty();
  try {
    const project = captureAuthoringProject(input), foundation = authoringFoundation(project);
    const filter: unknown = JSON.parse(canonicalJson(filterInput));
    if (!isObject(filter) || Object.keys(filter).some(key => !["query", "type", "domain", "tier", "aliasesOnly"].includes(key))
      || filter.query !== undefined && typeof filter.query !== "string" || filter.type !== undefined && !FOUNDATION_TOKEN_TYPES.includes(filter.type as FoundationTokenType)
      || ["domain", "tier"].some(key => filter[key] !== undefined && filter[key] !== null && typeof filter[key] !== "string") || filter.aliasesOnly !== undefined && typeof filter.aliasesOnly !== "boolean") throw new Error("Invalid Foundation search filter.");
    const document = inspectFoundationDocument(foundation, foundation.id);
    const canReduceContexts = document.diagnostics.length > 0 && document.diagnostics.every(item => item.code === "FOUNDATION_LIMIT" && item.path === "/themeAxes");
    if (!document.valid && !canReduceContexts) { result.diagnostics = document.diagnostics; return result; }
    const studio = inspectStudioProject(project, selection);
    result.valid = studio.valid; result.diagnostics = studio.diagnostics;
    result.foundationId = foundation.id; result.revision = foundation.revision;
    result.axes = foundation.themeAxes; result.themeSets = foundation.themeSets;
    result.contexts = studio.foundation.contexts; result.resolutionOrder = foundation.resolutionOrder;
    const references = foundationReferences(project, foundation).map(item => item.reference);
    result.references = references;
    const counts = { domain: new Map<string, number>(), tier: new Map<string, number>() };
    for (const token of foundation.tokens) for (const field of ["domain", "tier"] as const) { const id = token[field]; if (id !== undefined) counts[field].set(id, (counts[field].get(id) ?? 0) + 1); }
    const classify = (items: JsonValue[], field: "domain" | "tier"): FoundationClassification[] => authoringList(items).map(item => ({
      id: String(item.id), name: typeof item.name === "string" ? item.name : String(item.id),
      ...(typeof item.description === "string" ? { description: item.description } : {}),
      ...(field === "domain" && Array.isArray(item.allowedTypes) ? { allowedTypes: item.allowedTypes as FoundationTokenType[] } : {}),
      tokenCount: counts[field].get(String(item.id)) ?? 0,
    }));
    result.domains = classify(foundation.domains, "domain"); result.tiers = classify(foundation.tiers, "tier");
    const domainNames = new Map(result.domains.map(item => [item.id, item.name])), tierNames = new Map(result.tiers.map(item => [item.id, item.name]));
    const resolved = new Map(studio.foundation.tokens.map(token => [token.id, token]));
    const byTarget = new Map<string, typeof references>();
    for (const reference of references) { const values = byTarget.get(reference.tokenId) ?? []; values.push(reference); byTarget.set(reference.tokenId, values); }
    const rows: FoundationTokenRow[] = foundation.tokens.map(token => {
      const tokenReferences = byTarget.get(token.id) ?? [], value = resolved.get(token.id);
      return { ...token, ...(value ? { resolvedValue: value.value } : {}), aliasTarget: "ref" in token.value ? token.value.ref.id : null,
        dependentAliases: [...new Set(tokenReferences.filter(item => item.kind === "alias" || item.kind === "theme-alias").map(item => item.ownerTokenId!))],
        aliasChain: value?.aliasChain ?? [], overrideTrace: value?.overrideTrace ?? [], references: tokenReferences, usages: studio.usages[token.id] ?? [],
        inUse: tokenReferences.some(item => item.kind !== "theme-override"),
      };
    });
    const query = String(filter.query ?? "").trim().toLowerCase();
    result.totalTokens = rows.length;
    result.tokens = rows.filter(token => (filter.type === undefined || token.typeRef.id === filter.type) && (filter.domain === undefined || (token.domain ?? null) === filter.domain)
      && (filter.tier === undefined || (token.tier ?? null) === filter.tier) && (!filter.aliasesOnly || token.aliasTarget !== null)
      && (!query || [token.id, token.name, token.description ?? "", token.typeRef.id, domainNames.get(token.domain ?? "") ?? "", tierNames.get(token.tier ?? "") ?? ""].some(value => value.toLowerCase().includes(query))));
    result.matchingTokens = result.tokens.length;
    return result;
  } catch (error) { result.diagnostics = [studioDiagnostic("memory:foundation-authoring", "", error instanceof Error ? error.message : "Invalid Foundation authoring input.")]; return result; }
}
