import type { AdsDocument, Diagnostic, JsonObject, JsonValue } from "./contracts.ts";

/** DTCG 2025.10 value inspection; this is not a claim of full interchange conformance. */
export type FoundationTokenType = "color" | "dimension" | "fontFamily" | "fontWeight" | "duration" | "cubicBezier" | "number" | "strokeStyle" | "border" | "transition" | "shadow" | "gradient" | "typography";
export type FoundationTokenValue = { literal: JsonValue } | { ref: { id: string; expectedKind: "token" } };
export interface FoundationToken { id: string; name: string; typeRef: { id: FoundationTokenType }; value: FoundationTokenValue; description?: string; domain?: string; tier?: string; metadata?: JsonObject; extensions?: JsonObject }
export interface FoundationAxis { id: string; name?: string; description?: string; contexts: string[]; scope: { id: string; expectedKind: "foundation"; revision?: string }; default?: string; overrides?: Record<string, Record<string, FoundationTokenValue>> }
export interface FoundationThemeSet { id: string; name?: string; description?: string; contexts: Record<string, string>; resolutionProfile: { id: "axiom.resolver.explicit-order"; expectedKind: "resolutionProfile"; version: "1.0.0" } }
export type FoundationDocument = AdsDocument & { studioProfile: { id: "axiom.studio"; version: "0.1.0" }; tokens: FoundationToken[]; domains: JsonValue[]; tiers: JsonValue[]; themeAxes: FoundationAxis[]; themeSets: FoundationThemeSet[]; policies: JsonValue[]; originalSources: JsonValue[]; resolutionOrder: string[] };
export interface FoundationSelection { themeSetId?: string; contexts?: Record<string, string> }
export interface FoundationReport { valid: boolean; diagnostics: Diagnostic[] }
export interface FoundationOverrideTrace { axisId: string; context: string; path: string }
export interface ResolvedFoundationToken { id: string; name: string; type: FoundationTokenType; value: JsonValue; aliasChain: string[]; sourcePath: string; overrideTrace: FoundationOverrideTrace[] }
export interface FoundationResolution extends FoundationReport { foundationId: string | null; contexts: Record<string, string>; resolutionOrder: string[]; tokens: ResolvedFoundationToken[] }

/** Original exchange bytes remain available even when executable import is unsupported. */
export interface FoundationExchangeReport extends FoundationReport { originalText: string; formatVersion: "2025.10"; document?: FoundationDocument }
export interface FoundationExchangeOptions { id: string; name: string; revision: string; sourceUri: string; createId(): string; digest(text: string): string }
export interface FoundationExchangeExport extends FoundationReport { text?: string; mode: "original" | "authored" }
