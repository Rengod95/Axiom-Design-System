import { canonicalJson } from "./canonical-json.ts";
import { isObject } from "./documents.ts";
import { authoringList, foundationReferences, put } from "./foundation-authoring-internal.ts";
import type { JsonObject, ProjectSnapshot } from "./contracts.ts";
import type { FoundationDocument, FoundationToken } from "./foundation-contracts.ts";
import type { FoundationAuthoringEdit } from "./foundation-authoring-contracts.ts";

const copy = <T>(value: T): T => JSON.parse(canonicalJson(value)) as T;
const selected = (foundation: FoundationDocument, id: string): FoundationToken => {
  const token = foundation.tokens.find(item => item.id === id);
  if (!token) throw new Error("Selected token is missing.");
  return token;
};
function changeFields(target: object, edit: object, fields: readonly string[]): void {
  for (const field of fields) if (Object.hasOwn(edit, field)) {
    const value = (edit as Record<string, unknown>)[field];
    if (value === null && field !== "name") delete (target as Record<string, unknown>)[field];
    else put(target, field, value);
  }
}

/** Explicit token/classification operations, with no arbitrary path or opaque-field traversal. */
export function applyFoundationTokenEdit(project: ProjectSnapshot, foundation: FoundationDocument, edit: FoundationAuthoringEdit, createId: () => string): boolean {
  switch (edit.kind) {
    case "token-create": {
      const token: FoundationToken = { id: createId(), name: edit.name, typeRef: { id: edit.type }, value: edit.value };
      changeFields(token, edit, ["description", "domain", "tier"]); foundation.tokens.push(token); return true;
    }
    case "token-update": changeFields(selected(foundation, edit.id), edit, ["name", "description", "domain", "tier", "deprecated"]); return true;
    case "token-alias": selected(foundation, edit.id).value = { ref: { id: edit.targetId, expectedKind: "token" } }; return true;
    case "token-expression": selected(foundation, edit.id).value = edit.value; return true;
    case "token-literal": selected(foundation, edit.id).value = { literal: edit.value }; return true;
    case "token-duplicate": {
      const token = { ...copy(selected(foundation, edit.id)), id: createId(), name: edit.name };
      foundation.tokens.push(token);
      for (const axis of foundation.themeAxes) for (const map of Object.values(axis.overrides ?? {})) if (Object.hasOwn(map, edit.id)) put(map, token.id, copy(map[edit.id]));
      return true;
    }
    case "token-delete": {
      const token = selected(foundation, edit.id), references = foundationReferences(project, foundation).filter(item => item.reference.tokenId === edit.id && item.reference.kind !== "theme-override");
      if (references.length && edit.replacementId === undefined) throw new Error(`Token ${edit.id} is used at ${references[0]!.reference.documentId}${references[0]!.reference.path}; choose an explicit replacement before deletion.`);
      if (edit.replacementId !== undefined) {
        const replacement = selected(foundation, edit.replacementId);
        if (replacement.id === token.id || replacement.typeRef.id !== token.typeRef.id) throw new Error("A replacement must be a different existing token of the same type.");
        for (const reference of references) reference.replace(replacement.id);
      }
      foundation.tokens = foundation.tokens.filter(item => item.id !== edit.id);
      for (const axis of foundation.themeAxes) for (const map of Object.values(axis.overrides ?? {})) delete map[edit.id];
      return true;
    }
    case "classification-create": case "classification-update": case "classification-delete": {
      if (edit.category !== "domain" && edit.category !== "tier") throw new Error("Unknown classification category.");
      if (edit.category === "tier" && ("allowedTypes" in edit || "bindingCategory" in edit)) throw new Error("Allowed token types and binding purpose belong to a domain, not a tier.");
      const field = edit.category === "domain" ? "domains" : "tiers", records = authoringList(foundation[field]);
      if (edit.kind === "classification-create") {
        const item: JsonObject = { id: createId(), name: edit.name };
        changeFields(item, edit, ["description", "allowedTypes", "bindingCategory"]); foundation[field].push(item); return true;
      }
      const item = records.find(record => record.id === edit.id);
      if (!item) throw new Error("Selected classification is missing.");
      if (edit.kind === "classification-update") { changeFields(item, edit, ["name", "description", "allowedTypes", "bindingCategory"]); return true; }
      const uses = foundation.tokens.filter(token => token[edit.category] === edit.id);
      if (uses.length && edit.replacementId === undefined) throw new Error("The classification is assigned to tokens; reclassify them or choose a replacement first.");
      if (edit.replacementId !== undefined) {
        if (edit.replacementId === edit.id || !records.some(record => record.id === edit.replacementId)) throw new Error("Classification replacement must be a different record in the same category.");
        for (const token of uses) token[edit.category] = edit.replacementId;
      }
      foundation[field] = foundation[field].filter(record => !isObject(record) || record.id !== edit.id); return true;
    }
    default: return false;
  }
}
