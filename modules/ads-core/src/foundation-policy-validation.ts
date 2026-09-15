import type { JsonObject, JsonValue } from "./contracts.ts";
import { FOUNDATION_TOKEN_TYPES } from "./foundation-constants.ts";
import { fields, FoundationCheck, nonblank, own, record, stableId } from "./foundation-internal.ts";
import { FOUNDATION_POLICY_PROPERTIES, MAX_FOUNDATION_POLICIES } from "./foundation-policy-contracts.ts";

/** Structural validation only: authored violations must remain editable under SYN03. */
export function checkFoundationPolicies(snapshot: JsonObject, entities: Set<string>, check: FoundationCheck): void {
  if (!Array.isArray(snapshot.policies)) return;
  if (snapshot.policies.length > MAX_FOUNDATION_POLICIES) check.error("/policies", `At most ${MAX_FOUNDATION_POLICIES} policies are supported.`);
  const ids = (key: string) => new Set(Array.isArray(snapshot[key]) ? (snapshot[key] as JsonValue[]).filter(record).map(item => item.id) : []);
  const domains = ids("domains"), tiers = ids("tiers");
  snapshot.policies.forEach((item, index) => {
    const path = `/policies/${index}`; check.step(path);
    if (!record(item)) { check.error(path, "Expected a PolicyRule object."); return; }
    fields(item, ["ruleId", "name", "scope", "predicate", "severity", "rationale", "exceptionRef"], [], path, check);
    if (!stableId(item.ruleId) || entities.has(item.ruleId)) check.error(`${path}/ruleId`, "A policy needs a fresh stable rule identity.");
    else entities.add(item.ruleId);
    if (!nonblank(item.name) || item.name.length > 120 || !nonblank(item.rationale) || item.rationale.length > 2000) check.error(path, "A policy needs a name (up to 120 characters) and rationale (up to 2,000 characters).");
    if (item.severity !== "error" && item.severity !== "warning") check.error(`${path}/severity`, "Choose error or warning severity.");
    if (item.exceptionRef !== null) check.error(`${path}/exceptionRef`, "Approved exception records are not executable yet; exceptionRef must be null.");
    if (!record(item.scope)) check.error(`${path}/scope`, "Expected a policy scope.");
    else if (item.scope.kind === "foundation") fields(item.scope, ["kind"], [], `${path}/scope`, check);
    else if (item.scope.kind === "design") {
      fields(item.scope, ["kind"], ["category", "componentId"], `${path}/scope`, check);
      if (own(item.scope, "category") && item.scope.category !== "Web" && item.scope.category !== "Mobile") check.error(`${path}/scope/category`, "Choose Web or Mobile.");
      if (own(item.scope, "componentId") && !stableId(item.scope.componentId)) check.error(`${path}/scope/componentId`, "Expected a stable component identity.");
    } else check.error(`${path}/scope`, "Choose foundation or design scope.");
    if (!record(item.predicate)) { check.error(`${path}/predicate`, "Expected a declarative predicate."); return; }
    const predicate = item.predicate, at = `${path}/predicate`;
    if (predicate.kind === "token-minimum") {
      fields(predicate, ["kind", "count"], ["type", "domain", "tier"], at, check);
      if (typeof predicate.count !== "number" || !Number.isInteger(predicate.count) || predicate.count < 1 || predicate.count > 4096) check.error(`${at}/count`, "Minimum count must be an integer from 1 to 4096.");
    } else if (predicate.kind === "token-alias") {
      fields(predicate, ["kind", "tier"], ["targetTier", "domain"], at, check);
      if (own(predicate, "targetTier") && !tiers.has(predicate.targetTier)) check.error(`${at}/targetTier`, "Select an existing target tier.");
    } else if (predicate.kind === "token-binding") {
      fields(predicate, ["kind", "properties", "mode"], ["type", "domain", "tier"], at, check);
      if (!Array.isArray(predicate.properties) || !predicate.properties.length || predicate.properties.length > FOUNDATION_POLICY_PROPERTIES.length || new Set(predicate.properties).size !== predicate.properties.length || !predicate.properties.every(value => typeof value === "string" && (FOUNDATION_POLICY_PROPERTIES as readonly string[]).includes(value))) check.error(`${at}/properties`, "Select a nonempty unique list of supported visual, layout or motion properties.");
      if (predicate.mode !== "token-only" && predicate.mode !== "literal-only" && predicate.mode !== "any") check.error(`${at}/mode`, "Choose token-only, literal-only or any binding mode.");
      if (predicate.mode === "literal-only" && ["type", "domain", "tier"].some(key => own(predicate, key))) check.error(at, "Literal-only rules cannot require token classification. Remove those filters or choose token-only.");
    } else check.error(at, "Unsupported policy predicate; executable scripts are not allowed.");
    if (record(item.scope) && (predicate.kind === "token-binding" ? item.scope.kind !== "design" : item.scope.kind !== "foundation")) check.error(`${path}/scope`, "Binding rules use design scope; token inventory and alias rules use Foundation scope.");
    if (own(predicate, "type") && (typeof predicate.type !== "string" || !(FOUNDATION_TOKEN_TYPES as readonly string[]).includes(predicate.type))) check.error(`${at}/type`, "Choose a supported token type.");
    if (own(predicate, "domain") && !domains.has(predicate.domain)) check.error(`${at}/domain`, "Select an existing domain.");
    if (own(predicate, "tier") && !tiers.has(predicate.tier)) check.error(`${at}/tier`, "Select an existing tier.");
  });
}
