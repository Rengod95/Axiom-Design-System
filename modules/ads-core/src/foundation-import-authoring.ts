import type { FoundationDocument } from "./foundation-contracts.ts";
import type { FoundationAuthoringEdit } from "./foundation-authoring-contracts.ts";
import { importDtcgFoundation } from "./foundation-interchange.ts";
import { foundationValueReferences } from "./foundation-references.ts";
import { isObject } from "./documents.ts";
import { put } from "./foundation-authoring-internal.ts";
import { resolveDtcgResolver } from "./dtcg-resolver.ts";
import { canonicalJson } from "./canonical-json.ts";
import { foundationImportIdentities, foundationImportIdentity, foundationImportPath } from "./foundation-import-identity.ts";
import { getFoundationRole } from "./foundation-roles.ts";

/** Source URI/prefix/path mappings own update identity; current token labels never authorize a merge. */
export function applyDtcgImport(foundation: FoundationDocument, edit: Extract<FoundationAuthoringEdit, { kind: "dtcg-import" }>, createId: () => string, digest?: (text: string) => string): void {
  if (!digest) throw new Error("DTCG import requires an explicit host digest service.");
  if (!["keep", "update", "reject"].includes(edit.conflicts) || typeof edit.sourceName !== "string" || !edit.sourceName.trim() || edit.sourceName.length > 240 || edit.prefix !== undefined && (typeof edit.prefix !== "string" || !/^[^.$\s{}][^.{}]*(?:\.[^.$\s{}][^.{}]*)*$/.test(edit.prefix))) throw new Error("Invalid import name, prefix or conflict choice.");
  if (edit.format !== undefined && edit.format !== "dtcg" && edit.format !== "resolver") throw new Error("Unknown import format.");
  if (edit.format !== "resolver" && (edit.inputs !== undefined || edit.sources !== undefined)) throw new Error("Context choices and source files require Resolver format.");
  const resolution = edit.format === "resolver" ? resolveDtcgResolver(edit.sourceText, edit.inputs, edit.sources) : undefined;
  if (resolution && !resolution.valid) throw new Error(resolution.diagnostics.map(item => item.message).join("; "));
  const imported = importDtcgFoundation(resolution?.tokenText ?? edit.sourceText, { id: foundation.id, name: foundation.name, revision: foundation.revision, sourceUri: `import:${edit.sourceName}`, createId, digest });
  if (!imported.valid || !imported.document) throw new Error(imported.diagnostics.filter(item => item.severity === "error").slice(0, 4).map(item => `${item.path}: ${item.message}`).join("; "));
  const format = edit.format ?? "dtcg", uri = `import:${edit.sourceName}`, prefix = edit.prefix ?? "";
  const retained = foundationImportIdentities(foundation, uri, prefix, format, digest);
  const existing = new Map(foundation.tokens.map(token => [token.name, token])), byId = new Map(foundation.tokens.map(token => [token.id, token]));
  const identities = new Map<string, string>(), sourcePaths = new Map<string, string>();
  const paths = new Set(imported.document.tokens.map(token => foundationImportPath(token.name)));
  if (edit.mappings !== undefined && (!isObject(edit.mappings) || Object.entries(edit.mappings).some(([path, value]) => !paths.has(path) || !isObject(value) || Object.keys(value).some(key => !["role", "domain", "tier"].includes(key)) || typeof value.role !== "string" || typeof value.domain !== "string" || value.tier !== undefined && typeof value.tier !== "string"))) throw new Error("Import mappings must name existing source paths and explicit role/domain identities.");
  const domains = new Map(foundation.domains.filter(isObject).map(domain => [domain.id, domain])), tiers = new Set(foundation.tiers.filter(isObject).map(tier => tier.id));
  for (const token of imported.document.tokens) {
    const path = foundationImportPath(token.name), retainedId = retained.get(path);
    token.name = edit.prefix ? `${edit.prefix}.${token.name}` : token.name;
    const previous = retainedId ? byId.get(retainedId) : undefined;
    if (retainedId && !previous) throw new Error(`The token mapped from ${path} was removed. Restore that token or choose a new import prefix; it will not be silently recreated.`);
    if (previous && (previous.typeRef.id !== token.typeRef.id || edit.conflicts === "reject")) throw new Error(`Source token ${path} already exists${previous.typeRef.id !== token.typeRef.id ? " with another type" : ""}. Choose another prefix or conflict policy.`);
    if (!previous && existing.has(token.name)) throw new Error(`Token ${token.name} belongs to another source or was authored locally. A matching name is not identity; choose a distinct import prefix.`);
    const mapping = edit.mappings?.[path];
    if (mapping) {
      const role = getFoundationRole(mapping.role), domain = domains.get(mapping.domain);
      if (!role || role.type !== token.typeRef.id || role.category !== domain?.bindingCategory || !Array.isArray(domain.allowedTypes) || !domain.allowedTypes.includes(token.typeRef.id) || mapping.tier !== undefined && !tiers.has(mapping.tier)) throw new Error(`The mapping for ${path} must use a compatible role, domain purpose, value type and existing layer.`);
      if (previous && (mapping.role !== previous.role || mapping.domain !== previous.domain || mapping.tier !== undefined && mapping.tier !== previous.tier)) throw new Error(`Reimport preserves the classification of ${path}. Change that token explicitly before assigning another import mapping.`);
      if (!previous) { token.role = mapping.role; token.domain = mapping.domain; if (mapping.tier !== undefined) token.tier = mapping.tier; }
    } else if (!previous && foundation.authoringProfile) throw new Error(`Choose a domain and role for source path ${path} before importing into this Axiom Foundation.`);
    identities.set(token.id, previous?.id ?? token.id);
    sourcePaths.set(path, previous?.id ?? token.id);
  }
  for (const token of imported.document.tokens) {
    for (const { ref } of foundationValueReferences(token.value)) ref.id = identities.get(ref.id)!;
    const previous = byId.get(identities.get(token.id)!);
    if (!previous) foundation.tokens.push(token);
    else if (edit.conflicts === "update") {
      previous.value = token.value;
      for (const key of ["description", "extensions", "deprecated"] as const) {
        if (token[key] === undefined) delete previous[key]; else put(previous, key, token[key]);
      }
    }
  }
  const original = imported.document.originalSources[0]!;
  if (isObject(original)) {
    if (resolution) original.resolver = { sourceText: edit.sourceText, sources: edit.sources ?? {}, inputs: resolution.inputs, order: resolution.order, digest: digest(edit.sourceText) };
    if (edit.prefix && isObject(original.groups)) original.groups = Object.fromEntries(Object.entries(original.groups).map(([path, value]) => [`/${edit.prefix!.split(".").map(key => key.replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}${path}`, value]));
    original.importPrefix = edit.prefix ?? "";
    original.sourceIdentity = foundationImportIdentity(format, sourcePaths);
    if (!foundation.originalSources.some(item => isObject(item) && item.digest === original.digest && item.uri === original.uri && item.importPrefix === original.importPrefix && canonicalJson(item.resolver ?? null) === canonicalJson(original.resolver ?? null))) foundation.originalSources.push(original);
  }
}
