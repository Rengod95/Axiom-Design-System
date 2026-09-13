import type { Diagnostic } from "./contracts.ts";

/** The closed ADR-0012 declaration profile; values themselves remain raw JSON. */
export type TypeExpression =
  | { kind: "boolean" | "string" | "number" }
  | { kind: "enum"; values: string[] }
  | { kind: "record"; fields: Record<string, TypeExpression>; required: string[]; additionalFields: "reject" | "preserve-opaque" }
  | { kind: "list"; items: TypeExpression }
  | { kind: "nullable"; inner: TypeExpression };

export interface TypeValidationReport { valid: boolean; diagnostics: Diagnostic[] }
