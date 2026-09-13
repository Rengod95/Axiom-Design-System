import type { AdsDocument, Diagnostic, JsonObject, JsonValue, ProjectSnapshot } from "./contracts.ts";
import type { StudioCategory, StudioUsage, StudioVisualProperty } from "./studio-contracts.ts";
import type { TypeExpression } from "./type-contracts.ts";
import type { StudioMotionTrack } from "./studio-motion.ts";

/** Inventory identity is independent of authoring instances and runtime implementations. */
export interface StudioCatalogEntry {
  id: string; name: string; kind: "component" | "part" | "template" | "utility";
  familyIds: string[]; sourceRows: number[];
  providerVariants: { provider: string; name: string; sourceRow: number }[];
}
export type StudioSemanticKind = "button" | "surface" | "toast" | "text-input" | "textarea" | "number-input"
  | "checkbox" | "radio" | "switch" | "toggle" | "choice-group" | "select" | "combobox" | "token-choice"
  | "slider" | "range-slider" | "rating" | "progress" | "meter" | "loading" | "badge" | "avatar" | "image"
  | "separator" | "tabs" | "accordion" | "dialog" | "popover" | "tooltip" | "menu" | "link" | "navigation"
  | "table" | "list" | "text" | "layout" | "field" | "alert" | "toolbar" | "unsupported";
export interface StudioSemanticDescriptor {
  kind: StudioSemanticKind; purpose: string; role: string;
  /** Names identify required public ports, never a target framework's raw event objects. */
  valueName?: string; requestEvent?: string; collectionName?: string;
  inputType?: "text" | "password" | "search" | "email"; selection?: "single" | "multiple";
  orientation?: "horizontal" | "vertical"; modal?: boolean;
  host: "none" | "collection" | "overlay" | "notification" | "form" | "group";
  contract: "defined" | "unimplemented";
  /** Exact missing obligations; a library entry is not evidence of execution. */
  limitations: string[];
}
export interface StudioCatalogValue {
  name: string; type: TypeExpression; defaultValue: JsonValue; requestEvent?: string;
}
export interface StudioCatalogRecipe {
  entry: StudioCatalogEntry; semantic: StudioSemanticDescriptor;
  parts: { role: string; required: boolean }[];
  values: StudioCatalogValue[];
  events: { name: string; payloadType: TypeExpression }[];
  slots: { role: string; required: boolean }[];
}
export interface StudioCatalogProjection {
  catalogId: string; kind: StudioCatalogEntry["kind"]; familyIds: string[];
  semantic: StudioSemanticDescriptor;
  /** Source contracts, not consumer callbacks or executable expressions. */
  values: JsonObject[]; events: JsonObject[]; variants: JsonObject[]; slots: JsonObject[];
  accessibility: JsonObject; behavior: JsonObject;
}
export type StudioSizePolicy = { mode: "hug" | "fill" } | { mode: "fixed"; value: number };
export type StudioComponentEdit =
  | { kind: "name"; name: string }
  | { kind: "purpose"; purpose: string }
  | { kind: "frame"; category: StudioCategory; frame: { x: number; y: number; width: number; height?: number } }
  | { kind: "part-name"; partId: string; name: string }
  | { kind: "part-text"; partId: string; text: string }
  | { kind: "part-parent"; partId: string; parentId: string }
  | { kind: "part-add"; parentId: string; name: string; role: string }
  | { kind: "part-delete"; partId: string }
  | { kind: "part-order"; parentId: string; childIds: string[] }
  | { kind: "layout"; category: StudioCategory; partId: string; field: "gap" | "padding" | "minHeight" | "axis" | "width" | "height" | "alignment"; value: JsonValue }
  | { kind: "appearance"; category: StudioCategory; partId: string; property: StudioVisualProperty; value: JsonValue }
  | { kind: "appearance-rule"; category: StudioCategory; partId: string; condition: "base" | "outlined" | "disabled" | "pressed"; property: StudioVisualProperty; value: JsonValue | null }
  | { kind: "variant-default"; value: "filled" | "outlined" }
  | { kind: "slot-add"; partId: string; required: boolean; multiple: boolean }
  | { kind: "slot-delete"; slotId: string }
  | { kind: "value-default"; valueId: string; value: JsonValue }
  | { kind: "value-add"; name: string; type: TypeExpression; value: JsonValue; ownership: "consumer" | "local" }
  | { kind: "value-delete"; valueId: string }
  | { kind: "accessibility"; field: "label" | "description"; value: string }
  | { kind: "motion"; field: "durationMs" | "easing"; value: JsonValue }
  | { kind: "motion-track-set"; track: Omit<StudioMotionTrack, "id">; trackId: string | null }
  | { kind: "motion-track-delete"; trackId: string }
  | { kind: "sample-content"; field: "label" | "title" | "body" | "actionLabel" | "closeLabel"; value: string };
export interface StudioComponentPlan {
  valid: boolean; diagnostics: Diagnostic[]; baseRevision: string;
  changes: { upserts: { document: AdsDocument; expectedRevision?: string }[]; deletes: { id: string; expectedKind: string; revision: string }[] };
  impact: StudioUsage[]; project: ProjectSnapshot;
}
