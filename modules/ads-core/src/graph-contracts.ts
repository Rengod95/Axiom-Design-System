import type { Diagnostic } from "./contracts.ts";

/** Identity locations are evidence for the covered graph, not runtime capability. */
export interface LocalEntity {
  id: string;
  kind: string;
  ownerDocumentId: string | null;
  ownerRevision: string | null;
  path: string;
  source: "document" | "nested" | "project-scope";
  validation: "structural" | "envelope-only" | "unverified";
}

export type LocalReferenceStatus = "resolved" | "unverified" | "missing" | "kind-mismatch" | "revision-mismatch" | "owner-mismatch" | "ambiguous" | "invalid";

/** A pinned nested reference uses its owner's source revision. */
export interface LocalReference {
  ownerDocumentId: string;
  path: string;
  id: string;
  expectedKind: string;
  revision?: string;
  version?: string;
  status: LocalReferenceStatus;
  resolvedTarget?: LocalEntity;
}

export interface LocalReferenceReport {
  valid: boolean;
  diagnostics: Diagnostic[];
  entities: LocalEntity[];
  references: LocalReference[];
}
