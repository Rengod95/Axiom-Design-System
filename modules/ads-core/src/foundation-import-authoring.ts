import type { FoundationDocument } from "./foundation-contracts.ts";
import type { FoundationAuthoringEdit } from "./foundation-authoring-contracts.ts";
import { importDtcgFoundation } from "./foundation-interchange.ts";
import { foundationValueReferences } from "./foundation-references.ts";
import { isObject } from "./documents.ts";
import { put } from "./foundation-authoring-internal.ts";
import { resolveDtcgResolver } from "./dtcg-resolver.ts";
import { canonicalJson } from "./canonical-json.ts";

/** Add/update semantics are explicit; references map to the retained project identities. */
export function applyDtcgImport(foundation: FoundationDocument, edit: Extract<FoundationAuthoringEdit, { kind: "dtcg-import" }>, createId: () => string, digest?: (text: string) => string): void {
  if (!digest) throw new Error("DTCG import requires an explicit host digest service.");
  if (!["keep", "update", "reject"].includes(edit.conflicts) || typeof edit.sourceName !== "string" || !edit.sourceName.trim() || edit.sourceName.length > 240 || edit.prefix !== undefined && (typeof edit.prefix !== "string" || !/^[^.$\s{}][^.{}]*(?:\.[^.$\s{}][^.{}]*)*$/.test(edit.prefix))) throw new Error("Invalid import name, prefix or conflict choice.");
  if (edit.format !== undefined && edit.format !== "dtcg" && edit.format !== "resolver") throw new Error("Unknown import format.");
  if (edit.format !== "resolver" && (edit.inputs !== undefined || edit.sources !== undefined)) throw new Error("Context choices and source files require Resolver format.");
  const resolution = edit.format === "resolver" ? resolveDtcgResolver(edit.sourceText, edit.inputs, edit.sources) : undefined;
  if (resolution && !resolution.valid) throw new Error(resolution.diagnostics.map(item => item.message).join("; "));
  const imported = importDtcgFoundation(resolution?.tokenText ?? edit.sourceText, { id: foundation.id, name: foundation.name, revision: foundation.revision, sourceUri: `import:${edit.sourceName}`, createId, digest });
  if (!imported.valid || !imported.document) throw new Error(imported.diagnostics.filter(item => item.severity === "error").slice(0, 4).map(item => `${item.path}: ${item.message}`).join("; "));
  const existing = new Map(foundation.tokens.map(token => [token.name, token])), identities = new Map<string, string>();
  for (const token of imported.document.tokens) {
    token.name = edit.prefix ? `${edit.prefix}.${token.name}` : token.name;
    const previous = existing.get(token.name);
    if (previous && (previous.typeRef.id !== token.typeRef.id || edit.conflicts === "reject")) throw new Error(`Token ${token.name} already exists${previous.typeRef.id !== token.typeRef.id ? " with another type" : ""}. Choose another prefix or conflict policy.`);
    identities.set(token.id, previous?.id ?? token.id);
  }
  for (const token of imported.document.tokens) {
    for (const { ref } of foundationValueReferences(token.value)) ref.id = identities.get(ref.id)!;
    const previous = existing.get(token.name);
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
    if (!foundation.originalSources.some(item => isObject(item) && item.digest === original.digest && item.uri === original.uri && item.importPrefix === original.importPrefix && canonicalJson(item.resolver ?? null) === canonicalJson(original.resolver ?? null))) foundation.originalSources.push(original);
  }
}
