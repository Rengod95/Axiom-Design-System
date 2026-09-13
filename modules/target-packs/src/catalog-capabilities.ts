import { canonicalJson, getStudioCatalogRecipe } from "../../ads-core/src/index.ts";
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
  if (["catalog.grid", "catalog.simplegrid", "catalog.center", "catalog.space", "catalog.highlight", "catalog.codehighlight", "catalog.ringprogress", "catalog.semicircleprogress"].includes(catalog.catalogId)) fail("This catalog variant requires its own track/geometry/content realization; the broad family emitter cannot substitute a different presentation.");
  if (catalog.semantic.contract !== "defined" || !CATALOG_TARGET_KINDS[target].includes(catalog.semantic.kind)) fail(`Catalog ${catalog.catalogId} has no implemented ${target} realization.`);
  if (component.parts.length !== recipe.parts.length || component.parts.some(part => !recipe.parts.some(expected => expected.role === part.role))) fail("Custom logical parts require a target mapping before output.");
  if (catalog.values.length !== recipe.values.length || catalog.events.length !== recipe.events.length) fail("Additional public values/events require explicit target API and behavior mappings.");
  if (catalog.slots.length !== recipe.slots.length) fail("Additional content slots require explicit target content mappings.");
  for (const expected of recipe.slots) {
    const part = component.parts.find(part => part.role === expected.role)!;
    const slots = catalog.slots.filter(slot => slot.ownerPartRef === part.id);
    if (slots.length !== 1 || slots[0]!.min !== (expected.required ? 1 : 0) || slots[0]!.max !== "unbounded") fail("Content slot ownership/cardinality must match the implemented catalog API.");
  }
  if (component.motion.durationMs !== 160 || component.motion.reducedDurationMs !== 0 || component.motion.cleanupMs !== 500 || component.motion.easing !== "ease-out") fail("Catalog motion authoring is preserved, but customized timelines/easing need a target motion mapping before output.");
  if (target === "react") {
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
  for (const targetDesign of [target === "react" ? component.web : component.mobile]) {
    const root = component.parts.find(part => part.role === "root")!;
    const expected = recipe.parts.filter(part => part.role !== "root").map(expected => component.parts.find(part => part.role === expected.role)!.id);
    if (canonicalJson(targetDesign.layout[root.id]?.childOrder) !== canonicalJson(expected)) fail("Logical part order needs an explicit target interpretation.");
  }
}
