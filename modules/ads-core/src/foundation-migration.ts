import type { JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { FoundationBindingCategory, FoundationDocument, FoundationTokenValue } from "./foundation-contracts.ts";
import type { FoundationAuthoringEdit } from "./foundation-authoring-contracts.ts";
import { authoringList, foundationReferences } from "./foundation-authoring-internal.ts";
import { isObject } from "./documents.ts";
import { applyFoundationStarter, foundationDomainBindings, FOUNDATION_STARTER_DOMAINS, inferFoundationStarterRole } from "./foundation-starters.ts";
import { FOUNDATION_AUTHORING_PROFILE, FOUNDATION_LENGTH_REFERENCE_PX, getFoundationRole, getFoundationRoles, inferFoundationRole } from "./foundation-roles.ts";
import { migrateFoundationValueSets } from "./foundation-value-sets.ts";

const PROPERTY_ROLES: Readonly<Record<string, string>> = {
  background: "color.surface", color: "color.content", borderColor: "color.border", outlineColor: "color.focus",
  gap: "spacing.length", padding: "spacing.length", minHeight: "sizing.length", width: "sizing.length", height: "sizing.length",
  borderRadius: "radius.corner", fontSize: "typography.size", letterSpacing: "typography.tracking", lineHeight: "typography.line-height",
  fontFamily: "typography.family", fontWeight: "typography.weight", borderWidth: "border.width", opacity: "opacity.level",
  boxShadow: "shadow.elevation", zIndex: "layer.order", duration: "motion.duration", delay: "motion.delay", easing: "motion.easing",
};

/** Convert length leaves only; aliases, opaque metadata and border widths are never rewritten. */
function remLengths(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(remLengths);
  if (!isObject(value)) return value;
  if (value.unit === "px" && typeof value.value === "number" && Object.keys(value).length === 2) return { value: value.value / FOUNDATION_LENGTH_REFERENCE_PX, unit: "rem" };
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, remLengths(child)]));
}

/** Apply only to the detached review candidate; unresolved roles abort the entire transaction. */
export function applyFoundationMigration(project: ProjectSnapshot, document: FoundationDocument, edit: Extract<FoundationAuthoringEdit, { kind: "foundation-migrate" }>, createId: () => string): void {
  if (document.authoringProfile?.id === FOUNDATION_AUTHORING_PROFILE.id && document.authoringProfile.version === FOUNDATION_AUTHORING_PROFILE.version) return;
  for (const mapping of [edit.roles, edit.domains]) if (mapping !== undefined && (!isObject(mapping) || Object.entries(mapping).some(([id, value]) => typeof value !== "string" || !document.tokens.some(token => token.id === id)))) throw new Error("Migration mappings must target existing token identities.");
  const references = foundationReferences(project, document);
  const bindings = foundationDomainBindings(document);
  const suggested = new Map<string, string>();
  for (const token of document.tokens) {
    const category = token.domain ? bindings.get(token.domain)?.category : undefined;
    const explicit = edit.roles?.[token.id] ?? token.role;
    if (explicit !== undefined && !getFoundationRole(explicit)) throw new Error(`Unknown explicit role ${explicit} for ${token.name}. Choose a supported role; no source has been changed.`);
    if (explicit !== undefined && getFoundationRole(explicit)!.type !== token.typeRef.id) throw new Error(`Explicit role ${explicit} is incompatible with ${token.name}. Choose a compatible role; no source has been changed.`);
    const starter = inferFoundationStarterRole(token);
    let role = explicit ? getFoundationRole(explicit) : starter;
    if (!role && category) role = inferFoundationRole(token, category);
    if (!role) {
      const usages = new Set(references.filter(item => item.reference.tokenId === token.id && ["design", "motion"].includes(item.reference.kind)).map(item => PROPERTY_ROLES[item.reference.path.split("/").at(-1)!]).filter((id): id is string => !!id));
      const candidates = [...usages].map(getFoundationRole).filter(candidate => candidate?.type === token.typeRef.id);
      if (candidates.length === 1) role = candidates[0];
      else if (candidates.length > 1 && candidates.every(candidate => candidate?.category === "color")) role = getFoundationRole("color.palette");
      else if (!category) { const byType = getFoundationRoles().filter(candidate => candidate.type === token.typeRef.id); if (byType.length === 1) role = byType[0]; else if (token.typeRef.id === "color") role = getFoundationRole("color.palette"); }
    }
    if (role && role.type === token.typeRef.id) suggested.set(token.id, role.id);
  }
  // Whole-token aliases may inherit proven target roles; property references require an explicit choice.
  for (let pass = 0; pass < document.tokens.length; pass++) {
    let changed = false;
    for (const token of document.tokens) if (!suggested.has(token.id) && "ref" in token.value && token.value.ref.path === undefined) {
      const role = suggested.get(token.value.ref.id);
      if (role) { suggested.set(token.id, role); changed = true; }
    }
    if (!changed) break;
  }
  const unresolved = document.tokens.filter(token => !suggested.has(token.id));
  if (unresolved.length) throw new Error(`Choose a role before migration for ${unresolved.slice(0, 6).map(token => `${token.name} (${token.id})`).join(", ")}${unresolved.length > 6 ? ` and ${unresolved.length - 6} more` : ""}. No source has been changed.`);
  // Explicit/proven starter categories constrain existing domains; display names alone are not authority.
  for (const domain of authoringList(document.domains)) {
    const binding = bindings.get(String(domain.id));
    const members = document.tokens.filter(token => token.domain === domain.id);
    const purposes = new Set(members.map(token => getFoundationRole(suggested.get(token.id)!)!.category));
    const purpose = binding?.category !== "unrestricted" ? binding?.category : undefined;
    const category = purpose ?? (purposes.size === 1 ? [...purposes][0] : undefined);
    if (!category) throw new Error(`Choose a domain purpose for ${String(domain.name ?? domain.id)} before migration.`);
    domain.bindingCategory = category;
    domain.allowedTypes = [...new Set(getFoundationRoles(category).map(role => role.type))];
  }
  applyFoundationStarter(document, { domains: FOUNDATION_STARTER_DOMAINS.map(domain => domain.id) }, createId);
  const domains = authoringList(document.domains);
  const defaultDomains = new Map(domains.map(domain => [domain.bindingCategory as FoundationBindingCategory, String(domain.id)]));
  for (const token of document.tokens) {
    const role = getFoundationRole(suggested.get(token.id) ?? token.role ?? "");
    if (!role) throw new Error(`Choose a supported role for ${token.name}.`);
    token.role = role.id;
    const domain = edit.domains?.[token.id] ?? token.domain ?? defaultDomains.get(role.category);
    if (domain === undefined) throw new Error(`The ${role.category} domain is missing.`);
    token.domain = domain;
    if (role.defaultUnit === "rem") {
      token.value = remLengths(token.value as unknown as JsonValue) as unknown as FoundationTokenValue;
      for (const axis of document.themeAxes) for (const map of Object.values(axis.overrides ?? {})) if (map[token.id]) map[token.id] = remLengths(map[token.id] as unknown as JsonValue) as unknown as FoundationTokenValue;
      for (const group of document.valueSets ?? []) if (group.values[token.id]) group.values[token.id] = remLengths(group.values[token.id] as unknown as JsonValue) as unknown as FoundationTokenValue;
    }
  }
  const tiers = authoringList(document.tiers), primitive = tiers.find(tier => tier.role === "primitive"), semantic = tiers.find(tier => tier.role === "semantic");
  for (const token of document.tokens) if (!token.tier) { const tier = "literal" in token.value ? primitive : semantic; if (typeof tier?.id === "string") token.tier = tier.id; }
  for (const entry of Object.values(project.documents)) if (entry.document.kind === "design" && isObject(entry.document.foundationRef) && entry.document.foundationRef.id === document.id) {
    for (const rule of authoringList(entry.document.layout)) for (const property of ["gap", "padding", "minHeight", "width", "height"]) if (rule[property] !== undefined) rule[property] = remLengths(rule[property]);
    for (const rule of authoringList(entry.document.appearance)) if (isObject(rule.declarations)) for (const property of ["borderRadius", "fontSize", "letterSpacing", "boxShadow"]) if (rule.declarations[property] !== undefined) rule.declarations[property] = remLengths(rule.declarations[property]);
  }
  migrateFoundationValueSets(document, createId);
  document.authoringProfile = { ...FOUNDATION_AUTHORING_PROFILE };
}
