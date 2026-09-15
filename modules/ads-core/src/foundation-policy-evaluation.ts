import type { JsonObject, JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { FoundationToken, FoundationTokenValue } from "./foundation-contracts.ts";
import type { FoundationPolicyReport, FoundationPolicyRule, FoundationPolicyViolation } from "./foundation-policy-contracts.ts";
import { MAX_FOUNDATION_POLICY_VIOLATIONS } from "./foundation-policy-contracts.ts";
import { authoringFoundation, authoringList, authoringPointer, captureAuthoringProject } from "./foundation-authoring-internal.ts";
import { inspectFoundationDocument } from "./foundation-validation.ts";
import { foundationValueReferences } from "./foundation-references.ts";
import { isObject } from "./documents.ts";

interface Site { documentId: string; componentId: string; partId: string; property: string; value: JsonValue; path: string; category?: "Web" | "Mobile" }
function bindingSites(project: ProjectSnapshot, foundationId: string): Site[] {
  const sites: Site[] = [];
  for (const { document } of Object.values(project.documents)) {
    if (document.kind === "design" && isObject(document.foundationRef) && document.foundationRef.id === foundationId && isObject(document.componentRef)) {
      const category = document.category === "Mobile" ? "Mobile" : "Web";
      const collect = (property: string, value: JsonValue | undefined, path: string, partId: JsonValue | undefined) => {
        if (value !== undefined) sites.push({ documentId: document.id, componentId: String((document.componentRef as JsonObject).id), partId: String(partId), category, property, value, path });
      };
      authoringList(document.layout).forEach((row, index) => { for (const property of ["gap", "padding", "minHeight"]) collect(property, row[property], `/layout/${index}/${property}`, row.targetPartRef); });
      authoringList(document.appearance).forEach((row, index) => { if (isObject(row.declarations)) for (const [property, value] of Object.entries(row.declarations)) collect(property, value, `/appearance/${index}/declarations/${authoringPointer(property)}`, row.targetPartRef); });
    }
    if (document.kind === "component") authoringList(document.motion).forEach((row, index) => {
      const collect = (property: string, value: JsonValue | undefined, path: string) => { if (value !== undefined) sites.push({ documentId: document.id, componentId: document.id, partId: String(row.targetPartRef), property, value, path }); };
      collect("motionDelay", row.delay, `/motion/${index}/delay`);
      if (isObject(row.timing)) { collect("motionDuration", row.timing.duration, `/motion/${index}/timing/duration`); collect("motionEasing", row.timing.easing, `/motion/${index}/timing/easing`); }
    });
  }
  return sites;
}
const matching = (token: FoundationToken, predicate: { type?: string; domain?: string; tier?: string }) =>
  (predicate.type === undefined || token.typeRef.id === predicate.type) && (predicate.domain === undefined || token.domain === predicate.domain) && (predicate.tier === undefined || token.tier === predicate.tier);

/** Read-only policy evaluation. Error violations block delivery, never drafting or Undo. */
export function inspectFoundationPolicies(input: ProjectSnapshot): FoundationPolicyReport {
  try {
    const project = captureAuthoringProject(input), foundation = authoringFoundation(project), structural = inspectFoundationDocument(foundation);
    if (!structural.valid) return { valid: false, canDeliver: false, rules: [], violations: [], diagnostics: structural.diagnostics, evaluatedSites: 0 };
    const rules = foundation.policies as unknown as FoundationPolicyRule[], violations: FoundationPolicyViolation[] = [];
    const tokens = new Map(foundation.tokens.map(token => [token.id, token])), sites = bindingSites(project, foundation.id);
    let evaluatedSites = 0, errorCount = 0, overflow = false;
    const add = (rule: FoundationPolicyRule, target: Omit<FoundationPolicyViolation, "ruleId" | "ruleName" | "severity" | "rationale">) => {
      if (rule.severity === "error") errorCount++;
      if (violations.length >= MAX_FOUNDATION_POLICY_VIOLATIONS) { overflow = true; return; }
      violations.push({ ruleId: rule.ruleId, ruleName: rule.name, severity: rule.severity, rationale: rule.rationale, ...target });
    };
    for (const rule of rules) {
      const predicate = rule.predicate;
      if (predicate.kind === "token-minimum") {
        const count = foundation.tokens.filter(token => matching(token, predicate) && !token.deprecated).length; evaluatedSites += foundation.tokens.length;
        if (count < predicate.count) add(rule, { documentId: foundation.id, path: "/tokens", message: `Needs at least ${predicate.count} matching non-deprecated tokens; ${count} available.` });
      } else if (predicate.kind === "token-alias") {
        const inspect = (token: FoundationToken, value: FoundationTokenValue, path: string) => {
          evaluatedSites++; const refs = foundationValueReferences(value);
          if (!refs.length || predicate.targetTier !== undefined && refs.some(ref => tokens.get(ref.ref.id)?.tier !== predicate.targetTier)) add(rule, { documentId: foundation.id, tokenId: token.id, path, message: `${token.name} must reference ${predicate.targetTier ? "the selected tier" : "another token"}.` });
        };
        foundation.tokens.forEach((token, index) => {
          if (!matching(token, predicate)) return;
          inspect(token, token.value, `/tokens/${index}/value`);
          foundation.themeAxes.forEach((axis, axisIndex) => { for (const [context, overrides] of Object.entries(axis.overrides ?? {})) if (overrides[token.id]) inspect(token, overrides[token.id]!, `/themeAxes/${axisIndex}/overrides/${authoringPointer(context)}/${authoringPointer(token.id)}`); });
        });
      } else if (rule.scope.kind === "design") {
        const scope = rule.scope;
        if (scope.componentId && !Object.values(project.documents).some(entry => entry.document.kind === "component" && entry.document.id === scope.componentId)) add(rule, { documentId: foundation.id, path: `/policies/${rules.indexOf(rule)}/scope/componentId`, message: "The scoped component no longer exists. Select a component or broaden the rule." });
        for (const site of sites) {
          if (scope.componentId && scope.componentId !== site.componentId || scope.category && site.category !== undefined && scope.category !== site.category || !predicate.properties.includes(site.property)) continue;
          evaluatedSites++;
          const tokenId = isObject(site.value) && typeof site.value.tokenRef === "string" ? site.value.tokenRef : undefined;
          const token = tokenId ? tokens.get(tokenId) : undefined;
          let message: string | undefined;
          if (predicate.mode === "token-only" && !tokenId) message = `${site.property} uses a literal. Bind a token that satisfies this rule.`;
          else if (predicate.mode === "literal-only" && tokenId) message = `${site.property} must use an explicit literal.`;
          else if (tokenId && (!token || !matching(token, predicate))) message = `${site.property} references a token outside the required type, domain or tier.`;
          if (message) { const { property: _property, value: _value, ...target } = site; add(rule, { ...target, ...(tokenId ? { tokenId } : {}), message }); }
        }
      }
    }
    const diagnostics = violations.map(item => ({ code: "FOUNDATION_POLICY_VIOLATION", phase: "document" as const, severity: item.severity, sourceRef: item.documentId, path: item.path, message: `${item.ruleName}: ${item.message} ${item.rationale}` }));
    if (overflow) diagnostics.push({ code: "FOUNDATION_POLICY_LIMIT", phase: "document", severity: errorCount ? "error" : "warning", sourceRef: foundation.id, path: "/policies", message: `More than ${MAX_FOUNDATION_POLICY_VIOLATIONS} violations exist. Repair the listed rules to reveal the remaining findings.` });
    return { valid: true, canDeliver: errorCount === 0, rules, violations, diagnostics, evaluatedSites };
  } catch { return { valid: false, canDeliver: false, rules: [], violations: [], diagnostics: [{ code: "FOUNDATION_POLICY_INVALID", phase: "document", severity: "error", sourceRef: "memory:policies", path: "", message: "Policy evaluation requires one valid Foundation in a bounded project." }], evaluatedSites: 0 }; }
}
