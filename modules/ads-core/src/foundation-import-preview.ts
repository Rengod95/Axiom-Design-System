import type { Diagnostic } from "./contracts.ts";
import type { FoundationAuthoringEdit } from "./foundation-authoring-contracts.ts";
import type { FoundationTokenType } from "./foundation-contracts.ts";
import { importDtcgFoundation } from "./foundation-interchange.ts";
import { resolveDtcgResolver } from "./dtcg-resolver.ts";
import { foundationImportPath } from "./foundation-import-identity.ts";

export interface FoundationImportSourcePreview {
  valid: boolean; diagnostics: Diagnostic[]; originalText: string;
  tokens: { path: string; name: string; type: FoundationTokenType }[];
}

/** Parse source before project adoption so an invalid mapping cannot hide the token list needed to repair it. */
export function previewFoundationImportSource(edit: Extract<FoundationAuthoringEdit, { kind: "dtcg-import" }>, createId: () => string, digest: (text: string) => string): FoundationImportSourcePreview {
  const resolution = edit.format === "resolver" ? resolveDtcgResolver(edit.sourceText, edit.inputs, edit.sources) : undefined;
  if (resolution && !resolution.valid) return { valid: false, diagnostics: resolution.diagnostics, originalText: edit.sourceText, tokens: [] };
  const report = importDtcgFoundation(resolution?.tokenText ?? edit.sourceText, { id: "foundation.import-preview", name: "Import preview", revision: "preview", sourceUri: `import:${edit.sourceName}`, createId, digest });
  return { valid: report.valid, diagnostics: report.diagnostics, originalText: edit.sourceText, tokens: (report.document?.tokens ?? []).map(token => ({ path: foundationImportPath(token.name), name: token.name, type: token.typeRef.id })) };
}
