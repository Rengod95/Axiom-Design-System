import type { FoundationDocument, FoundationThemeSet, FoundationValueSet } from "./foundation-contracts.ts";
import type { FoundationAuthoringEdit } from "./foundation-authoring-contracts.ts";
import { canonicalJson } from "./canonical-json.ts";
import { put } from "./foundation-authoring-internal.ts";

type GroupSource = Pick<FoundationDocument, "themeAxes" | "valueSets" | "resolutionOrder">;

/** Returns effective groups in resolver order, including explicit per-domain replacements. */
export function foundationThemeGroups(document: GroupSource, theme: Pick<FoundationThemeSet, "contexts" | "valueSetIds"> & Partial<FoundationThemeSet>): FoundationValueSet[] {
  const sets = new Map((document.valueSets ?? []).map(group => [group.id, group]));
  const explicit = (theme.valueSetIds ?? []).map(id => sets.get(id)).filter((group): group is FoundationValueSet => !!group);
  const replaced = new Set(explicit.flatMap(group => group.domain ? [group.domain] : []));
  const axes = new Map(document.themeAxes.map(axis => [axis.id, axis]));
  const inherited = document.resolutionOrder.flatMap(id => {
    const axis = axes.get(id), context = theme.contexts[id] ?? axis?.default;
    return context === undefined ? [] : (axis?.valueSetIds?.[context] ?? []).map(groupId => sets.get(groupId)).filter((group): group is FoundationValueSet => !!group && !replaced.has(group.domain ?? ""));
  });
  return [...inherited, ...explicit];
}

/** Converts legacy context overrides without changing token identities, values or source bytes. */
export function migrateFoundationValueSets(document: FoundationDocument, createId: () => string): void {
  const sets = document.valueSets ?? (document.valueSets = []);
  const tokens = new Map(document.tokens.map(token => [token.id, token]));
  const names = new Set(sets.map(group => group.name));
  const freshName = (label: string): string => {
    let name = label, suffix = 2;
    while (names.has(name)) name = `${label} ${suffix++}`;
    names.add(name); return name;
  };
  // Legacy overrides run after all groups on their axis and survive explicit domain replacement.
  // Keep them as ordered, scope-less groups when a scoped group would suppress or reorder them.
  const explicitDomains = new Set(document.themeSets.flatMap(theme => (theme.valueSetIds ?? []).flatMap(id => {
    const domain = sets.find(group => group.id === id)?.domain;
    return domain ? [domain] : [];
  })));
  for (const axis of document.themeAxes) {
    if (axis.default === undefined && axis.contexts[0] !== undefined) axis.default = axis.contexts[0];
    if (!axis.overrides) continue;
    const domains = new Set(Object.values(axis.overrides).flatMap(values => Object.keys(values).map(id => tokens.get(id)?.domain ?? "")));
    const selections = axis.valueSetIds ?? (axis.valueSetIds = Object.create(null) as Record<string, string[]>);
    for (const context of axis.contexts) {
      const selected = selections[context] ?? [];
      for (const domain of domains) {
        const values = Object.fromEntries(Object.entries(axis.overrides[context] ?? {}).filter(([id]) => (tokens.get(id)?.domain ?? "") === domain));
        const ordered = explicitDomains.has(domain) || sets.some(group => selected.includes(group.id) && (group.domain ?? "") === domain);
        if (ordered && !Object.keys(values).length) continue;
        const classification = document.domains.find(item => typeof item === "object" && item !== null && !Array.isArray(item) && item.id === domain);
        const label = classification && typeof classification === "object" && !Array.isArray(classification) && typeof classification.name === "string" ? classification.name : "Values";
        const group: FoundationValueSet = { id: createId(), name: freshName(`${context} · ${label}${ordered ? " · inherited" : ""}`), ...(domain && !ordered ? { domain } : {}), values };
        sets.push(group); selected.push(group.id);
      }
      put(selections, context, selected);
    }
    delete axis.overrides;
  }
}

/** Curated group edits participate in the same reviewed, atomic document transaction as tokens. */
export function applyFoundationValueSetEdit(document: FoundationDocument, edit: FoundationAuthoringEdit, createId: () => string): boolean {
  if (!edit.kind.startsWith("value-set-")) return false;
  const sets = document.valueSets ?? (document.valueSets = []);
  if (edit.kind === "value-set-create") {
    const source = edit.copyFrom === undefined ? undefined : sets.find(group => group.id === edit.copyFrom);
    if (edit.copyFrom !== undefined && !source) throw new Error("The value group to duplicate is missing.");
    const group: FoundationValueSet = { id: createId(), name: edit.name, values: source ? JSON.parse(canonicalJson(source.values)) as FoundationValueSet["values"] : {} };
    const domain = edit.domain ?? source?.domain;
    if (domain !== undefined) group.domain = domain;
    if (edit.description !== undefined) group.description = edit.description;
    sets.push(group); return true;
  }
  if (!("id" in edit)) throw new Error("A value group identity is required.");
  const group = sets.find(item => item.id === edit.id);
  if (!group) throw new Error("The selected value group is missing.");
  switch (edit.kind) {
    case "value-set-update":
      if (edit.name !== undefined) group.name = edit.name;
      if (edit.description === null) delete group.description;
      else if (edit.description !== undefined) group.description = edit.description;
      return true;
    case "value-set-value":
      if (!document.tokens.some(token => token.id === edit.tokenId)) throw new Error("The selected token is missing.");
      if (edit.value === null) delete group.values[edit.tokenId]; else put(group.values, edit.tokenId, edit.value);
      return true;
    case "value-set-delete": {
      const lists = [...document.themeAxes.flatMap(axis => Object.values(axis.valueSetIds ?? {})), ...document.themeSets.map(theme => theme.valueSetIds ?? [])];
      if (lists.some(ids => ids.includes(group.id)) && edit.replacementId === undefined) throw new Error("This value group is connected to a theme. Choose a replacement before deleting it.");
      if (edit.replacementId !== undefined) {
        const replacement = sets.find(item => item.id === edit.replacementId);
        if (!replacement || replacement.id === group.id || replacement.domain !== group.domain) throw new Error("Choose another value group in the same domain.");
        for (const ids of lists) { const replaced = [...new Set(ids.map(id => id === group.id ? replacement.id : id))]; ids.splice(0, ids.length, ...replaced); }
      }
      document.valueSets = sets.filter(item => item.id !== group.id); return true;
    }
    default: return false;
  }
}
