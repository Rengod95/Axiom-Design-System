import { canonicalJson, getStudioCatalogRecipe, semanticElementContent, semanticParentRole } from "../../ads-core/src/index.ts";
import type { StudioComponent, StudioSemanticKind } from "../../ads-core/src/index.ts";
import type { TargetId } from "./contracts.ts";
import { TARGET_CODE } from "./constants.ts";
import { TargetError } from "./target-error.ts";

const WEB: readonly StudioSemanticKind[] = ["button", "surface", "text-input", "textarea", "number-input", "checkbox", "radio", "switch", "toggle", "choice-group", "select", "slider", "range-slider", "rating", "progress", "meter", "loading", "badge", "avatar", "image", "separator", "tabs", "accordion", "dialog", "tooltip", "menu", "link", "table", "list", "text", "layout", "field", "alert", "toolbar", "navigation"];
const NATIVE_REACT: readonly StudioSemanticKind[] = ["button", "surface", "text-input", "textarea", "checkbox", "switch", "toggle", "choice-group", "select", "progress", "loading", "badge", "separator", "tabs", "accordion", "dialog", "list", "text", "layout", "field", "alert", "navigation"];
const SWIFT: readonly StudioSemanticKind[] = ["button", "surface", "text-input", "textarea", "switch", "toggle", "select", "slider", "progress", "loading", "badge", "separator", "list", "text", "layout", "field", "alert", "navigation"];
const COMPOSE: readonly StudioSemanticKind[] = [...SWIFT.filter(kind => kind !== "slider"), "checkbox"];
const UNMAPPED_WEB_PARTS: Partial<Record<StudioSemanticKind, readonly string[]>> = {
  "text-input": ["error"], textarea: ["error"], toggle: ["control", "indicator"],
  "choice-group": ["trigger"], select: ["list", "item"], slider: ["track", "thumb"],
  rating: ["label", "track", "thumb", "value"], progress: ["track"], meter: ["track"], dialog: ["backdrop"],
};
/** Source-generation capabilities, not compiler/device or accessibility certification. */
export const CATALOG_TARGET_KINDS: Readonly<Record<TargetId, readonly StudioSemanticKind[]>> = { react: WEB, "react-native": NATIVE_REACT, swiftui: SWIFT, compose: COMPOSE };

/** Every declared field must have a known realization; no generic fallback emits unrelated controls. */
export function inspectCatalogTarget(component: StudioComponent, target: TargetId): void {
  const catalog = component.catalog, recipe = catalog && getStudioCatalogRecipe(catalog.catalogId);
  const fail = (message: string): never => { throw new TargetError(TARGET_CODE.UNSUPPORTED, message, component.id); };
  if (!catalog || !recipe) throw new TargetError(TARGET_CODE.UNSUPPORTED, "Missing catalog source contract", component.id);
  if (component.instances?.some(instance => instance.status !== "current")) fail("Review stale instance versions before export.");
  if (target !== "react" && (component.instances?.length || component.behavior?.rules.length || Object.values(component.mobile.layout).some(layout => layout.mode === "free"))) fail("Authored composition, behavior and free layout need an explicit native mapping.");
  if (component.motionTracks?.length) fail("Authored motion tracks are available in Studio preview; this target still requires an explicit motion runtime mapping.");
  if (["catalog.grid", "catalog.simplegrid", "catalog.center", "catalog.space", "catalog.highlight", "catalog.codehighlight", "catalog.ringprogress", "catalog.semicircleprogress"].includes(catalog.catalogId)) fail("This catalog variant requires its own track/geometry/content realization; the broad family emitter cannot substitute a different presentation.");
  if (catalog.semantic.contract !== "defined" || !CATALOG_TARGET_KINDS[target].includes(catalog.semantic.kind)) fail(`Catalog ${catalog.catalogId} has no implemented ${target} realization.`);
  const customLayout = target === "react" && catalog.semantic.kind === "layout";
  const authoredWeb = target === "react";
  if (target !== "react" && Object.keys(component.mobile.elements ?? {}).length) fail("Authored HTML element semantics need a dedicated native realization before output.");
  if (!customLayout && component.parts.some(part => part.text !== undefined && !(authoredWeb && part.elementKind))) fail("Authored per-Part text needs an explicit target content mapping.");
  if (!customLayout && component.parts.some(part => !recipe.parts.some(expected => expected.role === part.role) && !(authoredWeb && part.elementKind))) fail("Custom logical parts require a target mapping before output.");
  if (catalog.events.length !== recipe.events.length || catalog.values.length !== recipe.values.length && !(target === "react" && catalog.values.filter(value => !recipe.values.some(required => required.name === value.name)).every(value => value.ownership === "local" && typeof value.type === "object" && value.type !== null && !Array.isArray(value.type) && ["string", "number", "boolean", "enum"].includes(String(value.type.kind))))) fail("Additional public values/events require explicit target API and behavior mappings.");
  if (!authoredWeb && catalog.slots.length !== recipe.slots.length) fail("Additional content slots require explicit target content mappings.");
  if (!customLayout && catalog.slots.some(slot => !recipe.slots.some(expected => component.parts.find(part => part.id === slot.ownerPartRef)?.role === expected.role) && !component.parts.find(part => part.id === slot.ownerPartRef)?.elementKind)) fail("Additional content slots require an authored element owner and an explicit target mapping.");
  for (const expected of recipe.slots) {
    const part = component.parts.find(part => part.role === expected.role)!;
    const slots = catalog.slots.filter(slot => slot.ownerPartRef === part.id);
    if (!customLayout && (slots.length !== 1 || slots[0]!.min !== (expected.required ? 1 : 0) || slots[0]!.max !== "unbounded")) fail("Content slot ownership/cardinality must match the implemented catalog API.");
  }
  if (component.motion.durationMs !== 160 || component.motion.reducedDurationMs !== 0 || component.motion.cleanupMs !== 500 || component.motion.easing !== "ease-out") fail("Catalog motion authoring is preserved, but customized timelines/easing need a target motion mapping before output.");
  if (target === "react") {
    for (const part of component.parts.filter(part => !part.elementKind)) {
      if (component.parts.some(child => child.parent === part.id && child.elementKind) && semanticElementContent(catalog.semantic.kind, part.role) === "none") fail(`The ${part.role} anchor cannot render authored content.`);
    }
    for (const part of component.parts.filter(part => UNMAPPED_WEB_PARTS[catalog.semantic.kind]?.includes(part.role))) {
      const layout = component.web.layout[part.id]!, appearance = component.web.parts[part.id]!;
      if (Object.values(appearance.combinations).some(style => Object.keys(style).length > 0) || layout.padding || layout.gap || layout.minHeight || layout.width || layout.height || layout.alignment) fail(`Logical ${part.role} is platform-owned in this HTML control; edited paint/layout needs an explicit mapping.`);
    }
    if (catalog.semantic.kind === "table" && component.parts.some(part => component.web.layout[part.id]!.axis !== "vertical" || component.web.layout[part.id]!.alignment)) fail("Native HTML table layout cannot adopt stack-axis or cross-axis alignment changes.");
  }
  if (catalog.semantic.kind === "rating") {
    const values = new Map(catalog.values.map(value => [value.name, value.defaultValue]));
    if (values.get("min") !== 1 || values.get("step") !== 1 || typeof values.get("max") !== "number" || Number(values.get("max")) > 10) fail("Rating source requires 1–10 discrete whole-star values for this realization.");
  }
  if (target !== "react") {
    // Native system controls retain platform-owned inner appearance; arbitrary per-part paint cannot be silently dropped.
    const design = component.mobile;
    for (const part of component.parts.filter(part => part.role !== "root")) {
      const layout = design.layout[part.id]!, appearance = design.parts[part.id]!;
      if (Object.values(appearance.combinations).some(style => Object.keys(style).length > 0) || layout.padding || layout.gap || layout.minHeight || layout.width || layout.height || layout.alignment) fail("This native catalog profile currently maps authored root visuals; edited internal-part paint/layout requires a dedicated native mapping.");
    }
    const root = component.parts.find(part => part.role === "root")!;
    if ((target === "swiftui" || target === "compose") && design.layout[root.id]?.alignment) fail("This SwiftUI/Compose catalog profile does not map explicit cross-axis alignment yet.");
    // Native pressed feedback remains system-owned. A source override needs a dedicated interaction adapter.
    for (const variant of ["filled", "outlined"] as const) {
      if (canonicalJson(design.parts[root.id]!.combinations[`${variant}-pressed`]) !== canonicalJson(design.parts[root.id]!.combinations[variant])) fail("Custom pressed visuals are not mapped by this native catalog control profile.");
    }
  }
  if (target !== "react") {
    const root = component.parts.find(part => part.role === "root")!;
    const flat = component.parts.every(part => part === root || part.parent === root.id);
    const roles = component.parts.map(part => part.role);
    for (const part of component.parts) {
      const actualParent = component.parts.find(parent => parent.id === part.parent)?.role ?? null;
      const expectedParent = flat ? part === root ? null : "root" : semanticParentRole(catalog.semantic.kind, part.role, roles);
      if (actualParent !== expectedParent) fail("The semantic anchor tree needs an explicit native interpretation.");
      const expectedChildren = recipe.parts.filter(child => roles.includes(child.role) && (flat ? child.role === "root" ? null : "root" : semanticParentRole(catalog.semantic.kind, child.role, roles)) === part.role).map(child => component.parts.find(candidate => candidate.role === child.role)!.id);
      if (canonicalJson(component.mobile.layout[part.id]?.childOrder) !== canonicalJson(expectedChildren)) fail("Logical part order needs an explicit native interpretation.");
    }
  }
  if (target === "react" && !customLayout) for (const part of component.parts.filter(part => recipe.parts.some(anchor => anchor.role === part.role))) {
    const actual = component.parts.find(parent => parent.id === part.parent)?.role ?? null;
    const expected = semanticParentRole(catalog.semantic.kind, part.role, component.parts.map(item => item.role));
    if (actual !== expected && actual !== "root") fail("The authored semantic anchor tree differs from the implemented compound anatomy.");
  }
}
