import type { Diagnostic, JsonValue } from "./contracts.ts";
import { CODE } from "./constants.ts";
import generatedValidator from "./generated/document-envelope.ts";

interface SchemaError { instancePath: string; keyword: string; message?: string; params: { missingProperty?: string } }
interface EnvelopeValidator { (value: JsonValue): boolean; errors: SchemaError[] | null }
const validate = generatedValidator as unknown as EnvelopeValidator;
const POINTER_ESCAPE = /[~/]/g;

/** Validate plain parsed JSON without coercion, property removal or runtime compilation. */
export function envelopeDiagnostics(value: JsonValue, sourceUri: string): Diagnostic[] {
  if (validate(value)) return [];
  return (validate.errors ?? []).map((error) => {
    const missing = error.params.missingProperty;
    const path = missing === undefined ? error.instancePath : `${error.instancePath}/${missing.replace(POINTER_ESCAPE, (character) => character === "~" ? "~0" : "~1")}`;
    return { code: CODE.DOCUMENT_INVALID, phase: "envelope", severity: "error", sourceRef: sourceUri, path, message: `Document envelope ${path || "/"}: ${error.message ?? error.keyword}.` };
  });
}
