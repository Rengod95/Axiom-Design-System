import type { AdsDocument, Diagnostic, JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { FoundationResolution, FoundationSelection } from "./foundation-contracts.ts";
import type { StudioCatalogProjection, StudioSizePolicy } from "./studio-catalog-contracts.ts";
import type { ResolvedStudioMotion } from "./studio-motion.ts";

/** Executable editor profile; unrelated Foundation contracts remain separately tracked. */
export type StudioArchetype = "button" | "card" | "toast" | "catalog";
export interface StudioDocumentReport { profile: "foundation-studio"; valid: boolean; diagnostics: Diagnostic[]; checkedRecords: string[]; unverifiedTypes: string[] }
export type StudioCategory = "Web" | "Mobile";
export type StudioPartRole = string;
export type StudioVisualProperty = "background" | "color" | "borderColor" | "borderWidth" | "borderRadius" | "fontSize" | "opacity" | "fontFamily" | "fontWeight" | "lineHeight" | "letterSpacing" | "boxShadow" | "backgroundImage" | "borderStyle" | "border" | "typography" | "transitionDuration" | "transitionTimingFunction" | "transition";
/** Numeric lengths retain the existing px representation; rem remains relative until a target resolves it. */
export type StudioLength = number | `${number}rem`;
export interface StudioStyle { background?: string; color?: string; borderColor?: string; borderWidth?: StudioLength; borderRadius?: StudioLength; fontSize?: StudioLength; opacity?: number; fontFamily?: string; fontWeight?: number; lineHeight?: number; letterSpacing?: StudioLength; boxShadow?: string; backgroundImage?: string; borderStyle?: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "outset" | "inset"; transitionDelay?: string; transitionDuration?: string; transitionTimingFunction?: string }
export interface StudioPart { id: string; name: string; parent: string | null; role: StudioPartRole; text?: string; required?: boolean; elementKind?: "box" | "frame" | "text" }
export interface StudioPartPresentation {
  base: StudioStyle; outlined: StudioStyle; disabled: StudioStyle; pressed: StudioStyle;
  combinations: Record<"filled" | "outlined" | "filled-disabled" | "outlined-disabled" | "filled-pressed" | "outlined-pressed", StudioStyle>;
  provenance: Record<string, { documentId: string; path: string; tokenId?: string }>;
}
export interface StudioLayout {
  mode?: "stack" | "free"; position?: { x: number; y: number };
  axis: "horizontal" | "vertical"; gap: StudioLength; padding: StudioLength; minHeight: StudioLength;
  childOrder: string[];
  width?: StudioSizePolicy; height?: StudioSizePolicy; alignment?: "start" | "center" | "end" | "stretch";
}
export interface StudioDesign {
  referenceLayout?: Record<string, string[]>;
  id: string; category: StudioCategory;
  /** Optional, closed HTML mapping for layout definitions. Logical Parts remain platform independent. */
  elements?: Record<string, "div" | "section" | "article" | "header" | "footer" | "span" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "code">;
  parts: Record<string, StudioPartPresentation>;
  layout: Record<string, StudioLayout>;
  editorFrame?: { x: number; y: number; width: number; height?: number };
}
export interface StudioComponent {
  id: string; name: string; archetype: StudioArchetype; purpose: string; parts: StudioPart[];
  catalog?: StudioCatalogProjection;
  instances?: import("./studio-composition.ts").StudioInstanceProjection[];
  behavior?: import("./studio-behavior.ts").StudioBehaviorDefinition;
  sampleContent: { label: string; title: string; body: string; actionLabel: string; closeLabel: string };
  defaults: { disabled: boolean; open: boolean; variant: "filled" | "outlined" };
  motion: { durationMs: number; reducedDurationMs: number; cleanupMs: number; easing?: string };
  motionTracks?: ResolvedStudioMotion[];
  web: StudioDesign; mobile: StudioDesign;
}
export interface StudioUsage { componentId: string; partId: string; documentId: string; path: string }
export interface StudioTokenBindingIssue extends StudioUsage { property: string; tokenId: string; compatibleTokenIds: string[] }
export interface StudioTokenBindingReplacement { documentId: string; path: string; tokenId: string; replacementTokenId: string | null }
export interface StudioProjection {
  valid: boolean; diagnostics: Diagnostic[]; projectId: string; revision: string;
  /** Canonical adopted document snapshot, excluding private candidates and receipts. */
  sourceText: string;
  foundation: FoundationResolution; components: StudioComponent[];
  usages: Record<string, StudioUsage[]>;
  capabilities: { editor: "implemented"; targets: readonly ["react", "react-native", "swiftui", "compose"]; nativeExecution: "unverified" };
}
export type StudioEdit =
  | { kind: "token-value"; id: string; value: JsonValue }
  | { kind: "token-rename"; id: string; name: string }
  | { kind: "token-create"; name: string; type: string; value: JsonValue }
  | { kind: "theme-value"; axisId: string; context: string; id: string; value: JsonValue }
  | { kind: "sample-content"; id: string; field: keyof StudioComponent["sampleContent"]; value: string }
  | { kind: "component-name"; id: string; name: string }
  | { kind: "layout"; id: string; category: StudioCategory; partId: string; field: "gap" | "padding" | "minHeight" | "axis"; value: string | number }
  | { kind: "appearance"; id: string; category: StudioCategory; partId: string; property: StudioVisualProperty; value: JsonValue }
  | { kind: "source"; id: string; source: string };
export interface StudioEditPlan {
  valid: boolean; diagnostics: Diagnostic[]; baseRevision: string;
  updates: { document: AdsDocument; expectedRevision: string }[];
  impact: StudioUsage[];
  /** Transient complete graph for preview. No persistence has occurred. */
  project: ProjectSnapshot;
}
export type StudioSelection = FoundationSelection;
