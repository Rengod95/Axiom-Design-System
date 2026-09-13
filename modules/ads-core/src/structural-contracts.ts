import type { Diagnostic } from "./contracts.ts";

/** These reports certify only the constraints of the named structural profile. */
export interface StructuralReport {
  profile: "foundation-structural";
  valid: boolean;
  diagnostics: Diagnostic[];
  checkedRecords: string[];
  unverifiedTypes: string[];
}

/** Generated coverage metadata follows only declared structure, never unknown payloads. */
export type StructuralShape =
  | { readonly kind: "record"; readonly name: string }
  | { readonly kind: "array"; readonly items: StructuralShape; readonly nonempty: boolean }
  | { readonly kind: "map"; readonly keyType: string; readonly values: StructuralShape }
  | { readonly kind: "scalar"; readonly name: string }
  | { readonly kind: "enum"; readonly values: readonly (string | null)[] }
  | { readonly kind: "union"; readonly options: readonly StructuralShape[] }
  | { readonly kind: "opaque"; readonly name: string };

export interface StructuralField {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly shape: StructuralShape;
}

export interface StructuralRecord {
  readonly name: string;
  readonly ownerDocumentId: string;
  readonly fields: readonly StructuralField[];
}
