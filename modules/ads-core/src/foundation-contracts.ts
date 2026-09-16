import type { AdsDocument, Diagnostic, JsonObject, JsonValue } from "./contracts.ts";

/** DTCG 2025.10 value inspection; this is not a claim of full interchange conformance. */
export type FoundationTokenType = "color" | "dimension" | "fontFamily" | "fontWeight" | "duration" | "cubicBezier" | "number" | "strokeStyle" | "border" | "transition" | "shadow" | "gradient" | "typography";
/** Stable authoring purpose; display labels and token paths are not binding authority. */
export type FoundationBindingCategory = "color" | "spacing" | "sizing" | "radius" | "border" | "shadow" | "typography" | "motion" | "opacity" | "gradient" | "layer" | "unrestricted";
export type FoundationTokenValue = { literal: JsonValue } | { ref: { id: string; expectedKind: "token"; path?: string } } | { composite: JsonValue };
export interface FoundationToken { id: string; name: string; typeRef: { id: FoundationTokenType }; value: FoundationTokenValue; description?: string; deprecated?: boolean | string; domain?: string; tier?: string; role?: string; metadata?: JsonObject; extensions?: JsonObject }
/** Reusable values for existing token identities; the group name is never a token namespace. */
export interface FoundationValueSet { id: string; name: string; domain?: string; description?: string; values: Record<string, FoundationTokenValue> }
export interface FoundationAxis { id: string; name?: string; description?: string; contexts: string[]; scope: { id: string; expectedKind: "foundation"; revision?: string }; default?: string; overrides?: Record<string, Record<string, FoundationTokenValue>>; valueSetIds?: Record<string, string[]> }
export interface FoundationThemeSet { id: string; name?: string; description?: string; contexts: Record<string, string>; valueSetIds?: string[]; resolutionProfile: { id: "axiom.resolver.explicit-order"; expectedKind: "resolutionProfile"; version: "1.0.0" } }
export interface FoundationAuthoringProfile { id: "axiom.foundation"; version: "1.0.0" }
export type FoundationDocument = AdsDocument & { studioProfile: { id: "axiom.studio"; version: "0.1.0" }; authoringProfile?: FoundationAuthoringProfile; tokens: FoundationToken[]; domains: JsonValue[]; tiers: JsonValue[]; valueSets?: FoundationValueSet[]; themeAxes: FoundationAxis[]; themeSets: FoundationThemeSet[]; policies: JsonValue[]; originalSources: JsonValue[]; resolutionOrder: string[] };
export interface FoundationSelection { themeSetId?: string; contexts?: Record<string, string> }
export interface FoundationReport { valid: boolean; diagnostics: Diagnostic[] }
export interface FoundationOverrideTrace { axisId: string; context: string; path: string; valueSetId?: string }
export interface ResolvedFoundationToken { id: string; name: string; type: FoundationTokenType; value: JsonValue; aliasChain: string[]; sourcePath: string; overrideTrace: FoundationOverrideTrace[]; domain?: string; bindingCategory?: FoundationBindingCategory; role?: string }
export interface FoundationResolution extends FoundationReport { foundationId: string | null; contexts: Record<string, string>; resolutionOrder: string[]; tokens: ResolvedFoundationToken[] }

/** Original exchange bytes remain available even when executable import is unsupported. */
export interface FoundationExchangeReport extends FoundationReport { originalText: string; formatVersion: "2025.10"; document?: FoundationDocument }
export interface FoundationExchangeOptions { id: string; name: string; revision: string; sourceUri: string; createId(): string; digest(text: string): string }
export interface FoundationExchangeExport extends FoundationReport { text?: string; mode: "original" | "authored" }
