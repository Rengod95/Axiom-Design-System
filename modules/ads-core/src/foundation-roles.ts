import type { JsonValue } from "./contracts.ts";
import type { FoundationBindingCategory, FoundationDocument, FoundationToken } from "./foundation-contracts.ts";
import { record, pointer } from "./foundation-internal.ts";
import { FOUNDATION_AUTHORING_PROFILE, FOUNDATION_REQUIRED_CATEGORIES, FOUNDATION_ROLE_REGISTRY } from "./foundation-role-registry.ts";
import type { FoundationRole } from "./foundation-role-registry.ts";
import { inspectFoundationRoleValue } from "./foundation-role-values.ts";
import type { FoundationRoleIssueSink } from "./foundation-role-values.ts";

export { FOUNDATION_AUTHORING_PROFILE, FOUNDATION_REQUIRED_CATEGORIES, FOUNDATION_LENGTH_REFERENCE_PX } from "./foundation-role-registry.ts";
export type { FoundationRole } from "./foundation-role-registry.ts";
export interface FoundationReadinessIssue { path: string; message: string }
export interface FoundationReadiness { ready: boolean; adopted: boolean; issues: FoundationReadinessIssue[] }
const ROLE_BY_ID = new Map(FOUNDATION_ROLE_REGISTRY.map(role => [role.id, role]));

/** Return detached role specifications for authoring controls; edits cannot change validation authority. */
export function getFoundationRoles(category?: FoundationBindingCategory): FoundationRole[] {
  return structuredClone(FOUNDATION_ROLE_REGISTRY.filter(role => category === undefined || role.category === category));
}

/** Return one detached known role, or undefined for an unsupported role ID. */
export function getFoundationRole(id: string): FoundationRole | undefined {
  const role = ROLE_BY_ID.get(id); return role ? structuredClone(role) : undefined;
}

/** Infer suggestions only from explicit role/type/category; ambiguous legacy tokens remain unclassified. */
export function inferFoundationRole(token: Pick<FoundationToken, "typeRef" | "role">, category: FoundationBindingCategory): FoundationRole | undefined {
  if (token.role) { const role = ROLE_BY_ID.get(token.role); return role?.category === category && role.type === token.typeRef.id ? structuredClone(role) : undefined; }
  const candidates = FOUNDATION_ROLE_REGISTRY.filter(role => role.category === category && role.type === token.typeRef.id);
  return candidates.length === 1 ? structuredClone(candidates[0]!) : undefined;
}

/** Return a fresh role default; unknown roles have no implicit generic fallback. */
export function getFoundationRoleDefaultValue(roleId: string): JsonValue | undefined {
  const role = ROLE_BY_ID.get(roleId); return role ? structuredClone(role.defaultValue) : undefined;
}

/** Inspect a shape-validated Foundation against Axiom readiness without changing legacy source validity. */
export function getFoundationReadiness(document: FoundationDocument): FoundationReadiness {
  const issues: FoundationReadinessIssue[] = [], add: FoundationRoleIssueSink = (path, message) => { issues.push({ path, message }); };
  const domains = new Map(document.domains.filter(record).map(domain => [domain.id, domain]));
  const present = new Set(document.domains.filter(record).map(domain => domain.bindingCategory));
  for (const category of FOUNDATION_REQUIRED_CATEGORIES) if (!present.has(category)) add("/domains", `Required ${category} domain is missing.`);
  document.domains.forEach((domain, index) => {
    if (!record(domain)) return;
    const roles = FOUNDATION_ROLE_REGISTRY.filter(role => role.category === domain.bindingCategory);
    const types = new Set(roles.map(role => role.type));
    if (!roles.length) add(`/domains/${index}/bindingCategory`, "Choose a supported domain purpose; display names do not declare value permissions.");
    if (!Array.isArray(domain.allowedTypes) || !domain.allowedTypes.length || domain.allowedTypes.some(type => !types.has(type as FoundationRole["type"]))) add(`/domains/${index}/allowedTypes`, "Domain types must be explicitly restricted to its role registry.");
  });
  const byId = new Map(document.tokens.map(token => [token.id, token]));
  const coverage = new Set<string>();
  document.tokens.forEach((token, index) => {
    const path = `/tokens/${index}`, domain = token.domain ? domains.get(token.domain) : undefined;
    const role = token.role ? ROLE_BY_ID.get(token.role) : undefined;
    if (!domain) add(`${path}/domain`, "Assign a domain before adopting the Axiom authoring profile.");
    if (!role) { add(`${path}/role`, "Assign an explicit supported token role; names are not role evidence."); return; }
    if (role.category !== domain?.bindingCategory) add(`${path}/role`, "Token role must belong to its declared domain purpose.");
    if (role.type !== token.typeRef.id) add(`${path}/typeRef`, `${role.label} requires the ${role.type} value type.`);
    if (role.category === domain?.bindingCategory && role.type === token.typeRef.id && !token.deprecated) coverage.add(role.id);
    inspectFoundationRoleValue(role, token.value, `${path}/value`, byId, add);
  });
  for (const role of FOUNDATION_ROLE_REGISTRY) if (role.required && !coverage.has(role.id)) add("/tokens", `Required ${role.label} role (${role.id}) is missing.`);
  document.themeAxes.forEach((axis, index) => {
    if (!axis.default) add(`/themeAxes/${index}/default`, "Axiom authoring requires an explicit default for every theme axis.");
    for (const [context, values] of Object.entries(axis.overrides ?? {})) for (const [id, value] of Object.entries(values)) {
      const token = byId.get(id), role = token?.role ? ROLE_BY_ID.get(token.role) : undefined;
      if (role) inspectFoundationRoleValue(role, value, pointer(pointer(`/themeAxes/${index}/overrides`, context), id), byId, add);
    }
  });
  document.valueSets?.forEach((set, index) => {
    for (const [id, value] of Object.entries(set.values)) {
      const token = byId.get(id), role = token?.role ? ROLE_BY_ID.get(token.role) : undefined;
      if (role) inspectFoundationRoleValue(role, value, pointer(`/valueSets/${index}/values`, id), byId, add);
    }
  });
  const adopted = document.authoringProfile?.id === FOUNDATION_AUTHORING_PROFILE.id && document.authoringProfile.version === FOUNDATION_AUTHORING_PROFILE.version;
  return { ready: issues.length === 0, adopted, issues };
}

/** Enforce readiness only after explicit profile adoption; external DTCG and legacy documents stay readable. */
export function inspectFoundationProfile(document: FoundationDocument, add: FoundationRoleIssueSink): void {
  if (!document.authoringProfile) return;
  if (document.authoringProfile.id !== FOUNDATION_AUTHORING_PROFILE.id || document.authoringProfile.version !== FOUNDATION_AUTHORING_PROFILE.version) { add("/authoringProfile", "Unsupported Axiom authoring profile."); return; }
  for (const issue of getFoundationReadiness(document).issues) add(issue.path, issue.message);
}
