import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import type { StudioSemanticKind } from "./studio-catalog-contracts.ts";
import { catalogObjects } from "./studio-catalog-validation.ts";

type BaselineBinding = (property: "color" | "background" | "borderColor" | "borderRadius" | "fontSize", fallback: JsonValue) => JsonValue;
const px = (value: number): JsonObject => ({ value, unit: "px" });
const neutral = (value: number): JsonObject => ({ colorSpace: "srgb", components: [value, value, value], alpha: 1 });
const transparent: JsonObject = { colorSpace: "srgb", components: [0, 0, 0], alpha: 0 };
const FOCUSED: readonly StudioSemanticKind[] = ["button", "toggle", "text-input", "textarea", "number-input", "select", "checkbox", "radio", "switch", "tabs", "surface"];

/** Seed editable Axiom designs once at creation; never decorate or migrate an adopted source. */
export function applyCatalogDesignBaseline(design: AdsDocument, kind: StudioSemanticKind, parts: JsonObject[], id: () => string, binding: BaselineBinding): void {
  if (!FOCUSED.includes(kind)) return;
  const appearances = catalogObjects(design.appearance), layouts = catalogObjects(design.layout);
  const part = (role: string) => parts.find(part => part.studioRole === role);
  const layout = (role: string) => layouts.find(layout => layout.targetPartRef === part(role)?.id);
  const rootRule = appearances.find(rule => rule.targetPartRef === part("root")?.id)!;
  const root = rootRule.declarations as JsonObject;
  const rule = (role: string, declarations: JsonObject, condition: "base" | "outlined" | "disabled" | "pressed" = "base") => {
    const target = part(role); if (!target) return;
    appearances.push({ id: id(), targetPartRef: target.id!, variants: condition === "outlined" ? { variant: "outlined" } : {}, states: condition === "disabled" || condition === "pressed" ? { [condition]: true } : {}, declarations, explicitPriority: 0, refines: [] });
  };
  const control = (role: string, multiline = false) => {
    rule(role, { background: binding("background", neutral(1)), color: binding("color", neutral(.1)), borderColor: binding("borderColor", neutral(.8)), borderWidth: px(1), borderRadius: binding("borderRadius", px(8)), fontSize: binding("fontSize", px(14)), lineHeight: 1.5 });
    const item = layout(role);
    if (item) { item.padding = px(10); item.minHeight = px(multiline ? 96 : 40); item.size = { width: { mode: "fill" } }; }
  };
  if (["button", "toggle", "surface"].includes(kind)) {
    root.borderWidth = px(0);
    rule("root", { background: transparent, borderColor: binding("borderColor", neutral(.8)), borderWidth: px(1) }, "outlined");
  }
  if (kind !== "surface" && kind !== "tabs") rule("root", { opacity: .45 }, "disabled");
  // Native system controls own their internal geometry/paint. Preserve that explicit capability boundary.
  if (design.category !== "Web") { design.appearance = appearances; return; }
  if (["button", "toggle"].includes(kind)) {
    root.fontWeight = 500; root.lineHeight = 1.4;
    const item = layout("root"); if (item) item.alignment = "center";
    rule("root", { opacity: .8 }, "pressed");
  }
  if (["text-input", "textarea", "number-input", "select"].includes(kind)) {
    const item = layout("root"); if (item) item.gap = px(6);
    control(kind === "select" ? "trigger" : "input", kind === "textarea");
    rule("label", { fontSize: px(12), fontWeight: 500, lineHeight: 1.4 });
    rule("description", { fontSize: px(12), lineHeight: 1.5 });
    if (kind === "number-input") for (const role of ["increment", "decrement"]) {
      rule(role, { background: binding("background", neutral(1)), borderColor: binding("borderColor", neutral(.8)), borderWidth: px(1), borderRadius: binding("borderRadius", px(8)) });
      const item = layout(role); if (item) { item.size = { width: { mode: "fixed", value: px(40) } }; item.minHeight = px(40); item.alignment = "center"; }
    }
  }
  if (["checkbox", "radio", "switch"].includes(kind)) {
    const item = layout("root"); if (item) item.alignment = "center";
    rule("label", { fontSize: binding("fontSize", px(14)), lineHeight: 1.5 });
  }
  if (kind === "tabs") {
    const list = layout("list"); if (list) { list.axis = "horizontal"; list.gap = px(4); list.padding = px(4); }
    rule("list", { background: binding("background", neutral(1)), borderWidth: px(0), borderRadius: binding("borderRadius", px(8)) });
    rule("trigger", { borderWidth: px(0), borderRadius: binding("borderRadius", px(8)), fontWeight: 500, lineHeight: 1.4 });
    const trigger = layout("trigger"); if (trigger) { trigger.padding = px(8); trigger.minHeight = px(36); trigger.alignment = "center"; }
    const panel = layout("panel"); if (panel) { panel.padding = px(12); panel.minHeight = px(72); }
  }
  if (kind === "surface") {
    rule("header", { fontSize: px(18), fontWeight: 600, lineHeight: 1.35 });
    rule("body", { fontSize: binding("fontSize", px(14)), lineHeight: 1.55 });
    const actions = layout("actions"); if (actions) { actions.axis = "horizontal"; actions.gap = px(8); }
  }
  design.appearance = appearances;
}
