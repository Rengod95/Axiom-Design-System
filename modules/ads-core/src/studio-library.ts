import type { StudioCatalogEntry } from "./studio-catalog-contracts.ts";
import { STUDIO_CATALOG_ENTRIES } from "./studio-catalog-data.ts";

/** Display aliases only. Saved source identities and provider contracts are never migrated by browsing. */
export const STUDIO_LIBRARY_ALIASES: Readonly<Record<string, string>> = {
  "catalog.breadcrumbs": "catalog.breadcrumb",
  "catalog.anchor": "catalog.link",
  "catalog.togglebutton": "catalog.toggle",
  "catalog.togglebuttongroup": "catalog.togglegroup",
  "catalog.divider": "catalog.separator",
  "catalog.progressbar": "catalog.progress",
  "catalog.numberinput": "catalog.numberfield",
  "catalog.splitter": "catalog.resizable",
  "catalog.emptystate": "catalog.empty",
  "catalog.disclosuregroup": "catalog.accordion",
  "catalog.disclosure": "catalog.collapsible",
  "catalog.dropdownmenu": "catalog.menu",
  "catalog.textinput": "catalog.textfield",
  "catalog.filebutton": "catalog.filetrigger",
};

export interface StudioLibraryEntry extends StudioCatalogEntry {
  aliases: { id: string; name: string }[];
}

/** One discovery row per interchangeable purpose, retaining each original provider design. */
export function listStudioLibrary(): readonly StudioLibraryEntry[] {
  return STUDIO_CATALOG_ENTRIES.filter(entry => !Object.hasOwn(STUDIO_LIBRARY_ALIASES, entry.id)).map(entry => {
    const aliases = STUDIO_CATALOG_ENTRIES.filter(candidate => STUDIO_LIBRARY_ALIASES[candidate.id] === entry.id);
    const sources = [entry, ...aliases];
    return structuredClone({ ...entry, aliases: aliases.map(alias => ({ id: alias.id, name: alias.name })),
      familyIds: [...new Set(sources.flatMap(source => source.familyIds))],
      sourceRows: sources.flatMap(source => source.sourceRows).sort((a, b) => a - b),
      providerVariants: sources.flatMap(source => source.providerVariants).sort((a, b) => a.sourceRow - b.sourceRow),
    });
  });
}

export function studioLibraryIdentity(catalogId: string): string {
  return Object.hasOwn(STUDIO_LIBRARY_ALIASES, catalogId) ? STUDIO_LIBRARY_ALIASES[catalogId]! : catalogId;
}
