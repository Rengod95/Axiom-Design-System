import type { Diagnostic, JsonValue } from "./contracts.ts";
import type { FoundationAxis, FoundationBindingCategory, FoundationSelection, FoundationThemeSet, FoundationToken, FoundationTokenType, FoundationTokenValue, FoundationValueSet, FoundationAuthoringProfile } from "./foundation-contracts.ts";
import type { StudioEditPlan, StudioUsage } from "./studio-contracts.ts";
import type { FoundationStarterOptions } from "./foundation-starters.ts";

export type FoundationClassificationKind = "domain" | "tier";
export interface FoundationTokenChanges { name?: string; description?: string | null; deprecated?: boolean | string | null; domain?: string | null; tier?: string | null; role?: string | null }
export interface FoundationImportMapping { role: string; domain: string; tier?: string }
export type FoundationAuthoringEdit =
  | { kind: "dtcg-import"; sourceText: string; sourceName: string; conflicts: "keep" | "update" | "reject"; prefix?: string; format?: "dtcg" | "resolver"; inputs?: Record<string, string>; sources?: Record<string, string>; mappings?: Record<string, FoundationImportMapping> }
  | ({ kind: "template-apply" } & FoundationStarterOptions)
  | { kind: "token-create"; name: string; type: FoundationTokenType; value: FoundationTokenValue; description?: string; domain?: string; tier?: string; role?: string }
  | { kind: "foundation-migrate"; roles?: Record<string, string>; domains?: Record<string, string> }
  | { kind: "value-set-create"; name: string; domain?: string; description?: string; copyFrom?: string }
  | { kind: "value-set-update"; id: string; name?: string; description?: string | null }
  | { kind: "value-set-delete"; id: string; replacementId?: string }
  | { kind: "value-set-value"; id: string; tokenId: string; value: FoundationTokenValue | null }
  | ({ kind: "token-update"; id: string } & FoundationTokenChanges)
  | { kind: "token-delete"; id: string; replacementId?: string }
  | { kind: "token-duplicate"; id: string; name: string }
  | { kind: "token-alias"; id: string; targetId: string }
  | { kind: "token-expression"; id: string; value: FoundationTokenValue }
  | { kind: "token-literal"; id: string; value: JsonValue }
  | { kind: "classification-create"; category: FoundationClassificationKind; name: string; description?: string; allowedTypes?: FoundationTokenType[]; bindingCategory?: FoundationBindingCategory }
  | { kind: "classification-update"; category: FoundationClassificationKind; id: string; name?: string; description?: string | null; allowedTypes?: FoundationTokenType[] | null; bindingCategory?: FoundationBindingCategory | null }
  | { kind: "classification-delete"; category: FoundationClassificationKind; id: string; replacementId?: string }
  | { kind: "theme-axis-create"; name: string; contexts: string[]; default: string; description?: string }
  | { kind: "theme-axis-update"; id: string; name?: string; description?: string | null; default?: string }
  | { kind: "theme-axis-delete"; id: string }
  | { kind: "theme-context-add"; axisId: string; name: string; copyFrom?: string }
  | { kind: "theme-context-rename"; axisId: string; context: string; name: string }
  | { kind: "theme-context-delete"; axisId: string; context: string; replacement?: string }
  | { kind: "theme-set-create"; name: string; contexts: Record<string, string>; description?: string; valueSetIds?: string[] }
  | { kind: "theme-set-update"; id: string; name?: string; description?: string | null; contexts?: Record<string, string>; valueSetIds?: string[] }
  | { kind: "theme-set-delete"; id: string }
  | { kind: "theme-override-set"; axisId: string; context: string; id: string; value: FoundationTokenValue }
  | { kind: "theme-override-remove"; axisId: string; context: string; id: string }
  | { kind: "theme-order"; axisIds: string[] };

/** The caller adopts updates through document.import update and review/apply, never directly. */
export interface FoundationEditPlan extends StudioEditPlan { createdIds: string[]; selection: FoundationSelection }
export interface FoundationClassification { id: string; name: string; description?: string; allowedTypes?: FoundationTokenType[]; tokenCount: number; bindingCategory?: FoundationBindingCategory; bindingCategorySource?: "explicit" | "starter"; role?: string; order?: number }
export interface FoundationReference {
  tokenId: string; documentId: string; path: string;
  kind: "alias" | "theme-alias" | "theme-override" | "design" | "motion";
  ownerTokenId?: string; componentId?: string; partId?: string; axisId?: string; context?: string; valueSetId?: string;
}
export interface FoundationTokenRow extends FoundationToken {
  resolvedValue?: JsonValue; aliasTarget: string | null; dependentAliases: string[];
  aliasChain: string[]; overrideTrace: { axisId: string; context: string; path: string }[];
  references: FoundationReference[]; usages: StudioUsage[]; inUse: boolean;
}
export interface FoundationAuthoringFilter { query?: string; type?: FoundationTokenType; domain?: string | null; tier?: string | null; aliasesOnly?: boolean }
export interface FoundationAuthoringProjection {
  valid: boolean; diagnostics: Diagnostic[]; foundationId: string | null; revision: string | null;
  tokens: FoundationTokenRow[]; totalTokens: number; matchingTokens: number;
  domains: FoundationClassification[]; tiers: FoundationClassification[];
  valueSets: FoundationValueSet[]; authoringProfile?: FoundationAuthoringProfile;
  axes: FoundationAxis[]; themeSets: FoundationThemeSet[]; contexts: Record<string, string>; resolutionOrder: string[];
  references: FoundationReference[]; referenceScope: "known-studio";
}
