import type { StudioCatalogEntry, StudioCatalogRecipe, StudioCatalogValue, StudioSemanticDescriptor, StudioSemanticKind } from "./studio-catalog-contracts.ts";
import type { JsonValue } from "./contracts.ts";
import type { TypeExpression } from "./type-contracts.ts";
import { STUDIO_CATALOG_ENTRIES } from "./studio-catalog-data.ts";

const STRING: TypeExpression = { kind: "string" }, BOOLEAN: TypeExpression = { kind: "boolean" }, NUMBER: TypeExpression = { kind: "number" };
const EMPTY: TypeExpression = { kind: "record", fields: {}, required: [], additionalFields: "reject" };
const ITEM: TypeExpression = { kind: "record", fields: { key: STRING, label: STRING, disabled: BOOLEAN }, required: ["key", "label", "disabled"], additionalFields: "reject" };
const ITEMS: TypeExpression = { kind: "list", items: ITEM };
const DEFAULT_ITEMS: JsonValue = [{ key: "first", label: "First", disabled: false }, { key: "second", label: "Second", disabled: false }, { key: "third", label: "Third", disabled: false }];
const BASIC: Readonly<Record<string, StudioSemanticKind>> = {
  command: "button", surface: "surface", "toast-system": "toast", "binary-choice": "checkbox", "choice-group": "choice-group",
  "text-field": "text-input", "number-field": "number-input", "list-choice": "select", "query-choice": "combobox", "token-choice": "token-choice",
  "range-control": "slider", progress: "progress", measurement: "meter", loading: "loading", content: "text", image: "image", separator: "separator",
  tabs: "tabs", disclosure: "accordion", "modal-task": "dialog", "floating-surface": "popover", "context-help": "tooltip", "command-menu": "menu",
  navigation: "navigation", tabular: "table", layout: "layout", "field-container": "field", "status-message": "alert", "control-group": "toolbar",
};
const SPECIAL: Readonly<Record<string, StudioSemanticKind>> = {
  switch: "switch", radio: "radio", toggle: "toggle", togglebutton: "toggle", chip: "toggle", textarea: "textarea", passwordinput: "text-input", searchfield: "text-input",
  rangeslider: "range-slider", rating: "rating", badge: "badge", avatar: "avatar", list: "list", datalist: "list", timeline: "list",
  anchor: "link", link: "link", navlink: "link", dialog: "dialog", drawer: "dialog", sheet: "dialog", modal: "dialog", alertdialog: "dialog",
  accordion: "accordion", disclosure: "accordion", collapse: "accordion", collapsible: "accordion", spoiler: "accordion", hovercard: "popover", previewcard: "popover",
};
const UNIMPLEMENTED = new Set(["copybutton", "inputotp", "otpfield", "pininput", "jsoninput", "maskinput", "numberformatter", "rollingnumber", "angleslider", "floatingwindow", "colorswatch", "themeicon", "backgroundimage", "floatingindicator", "loadingoverlay", "navigationprogress", "gridlist", "hierarchical-choice", "tree", "burger", "stepper", "tableofcontents", "navigationmenu", "affix", "aspectratio"]);

/** Complete catalog inventory; each call returns detached records so callers cannot mutate shared policy. */
export function listStudioCatalog(): readonly StudioCatalogEntry[] { return structuredClone(STUDIO_CATALOG_ENTRIES); }
/** Find a canonical ID without case folding or merging provider semantics. */
export function getStudioCatalogEntry(id: string): StudioCatalogEntry | null {
  if (typeof id !== "string") return null;
  const entry = STUDIO_CATALOG_ENTRIES.find(item => item.id === id);
  return entry ? structuredClone(entry) : null;
}

/** A recipe supplies editable contracts. Target realization is a separate, explicit capability. */
export function getStudioCatalogRecipe(id: string): StudioCatalogRecipe | null {
  const entry = getStudioCatalogEntry(id); if (!entry) return null;
  const name = id.slice("catalog.".length), family = entry.familyIds[0]!.split("/")[1]!;
  let kind = SPECIAL[name] ?? BASIC[family] ?? "unsupported";
  if (UNIMPLEMENTED.has(name) || UNIMPLEMENTED.has(family) || entry.kind !== "component") kind = "unsupported";
  const semantic: StudioSemanticDescriptor = { kind, purpose: entry.name, role: "group", host: "none", contract: kind === "unsupported" ? "unimplemented" : "defined", limitations: [] };
  if (kind === "unsupported") semantic.limitations.push(`${entry.name} requires its own ${family} interaction, data and accessibility realization; authoring does not execute it.`);
  const values: StudioCatalogValue[] = [], events: StudioCatalogRecipe["events"] = [];
  let roles = ["root", "body"], slotRoles = ["body"];
  const value = (name: string, type: TypeExpression, defaultValue: JsonValue, requestEvent?: string): void => {
    values.push({ name, type, defaultValue, ...(requestEvent ? { requestEvent } : {}) });
    if (requestEvent) events.push({ name: requestEvent, payloadType: { kind: "record", fields: { value: type }, required: ["value"], additionalFields: "reject" } });
  };
  const controlled = (name: string, type: TypeExpression, defaultValue: JsonValue): void => { semantic.valueName = name; semantic.requestEvent = `${name}ChangeRequest`; value(name, type, defaultValue, semantic.requestEvent); };
  const collection = (): void => { semantic.collectionName = "items"; value("items", ITEMS, DEFAULT_ITEMS); };
  const availability = (): void => { value("disabled", BOOLEAN, false); };
  switch (kind) {
    case "button": roles = ["root", "label"]; slotRoles = []; semantic.role = "button"; availability(); events.push({ name: "activate", payloadType: EMPTY }); break;
    case "surface": roles = ["root", "header", "body", "actions"]; slotRoles = ["header", "body", "actions"]; break;
    case "toast": roles = ["root", "body", "close"]; semantic.role = "status"; semantic.host = "notification"; controlled("open", BOOLEAN, true); break;
    case "text-input": case "textarea":
      roles = ["root", "label", "input", "description", "error"]; slotRoles = []; semantic.role = "textbox"; semantic.inputType = name === "passwordinput" ? "password" : name === "searchfield" ? "search" : "text";
      controlled("value", STRING, ""); value("placeholder", STRING, "Enter text"); value("readOnly", BOOLEAN, false); value("invalid", BOOLEAN, false); availability(); break;
    case "number-input":
      roles = ["root", "label", "input", "decrement", "increment", "description"]; slotRoles = []; semantic.role = "spinbutton";
      controlled("value", { kind: "nullable", inner: NUMBER }, 0); value("draft", STRING, "0", "draftChangeRequest"); value("min", NUMBER, 0); value("max", NUMBER, 100); value("step", NUMBER, 1); availability();
      semantic.limitations.push("Draft text and committed number are distinct; invalid partial text never commits a coerced number."); break;
    case "checkbox": case "radio": case "switch": case "toggle":
      roles = ["root", "control", "indicator", "label"]; slotRoles = []; semantic.role = kind === "toggle" ? "button" : kind;
      controlled(kind === "toggle" ? "pressed" : "checked", BOOLEAN, false); availability();
      if (kind === "checkbox") value("indeterminate", BOOLEAN, false);
      if (kind === "radio") { semantic.host = "group"; value("groupName", STRING, "choices"); value("itemKey", STRING, "first"); }
      break;
    case "choice-group": case "select": case "combobox": case "token-choice":
      roles = ["root", "label", "trigger", "list", "item", "description"]; slotRoles = []; collection(); semantic.host = "collection";
      semantic.selection = kind === "token-choice" || name === "checkboxgroup" || name === "togglegroup" || name === "togglebuttongroup" ? "multiple" : "single";
      semantic.role = kind === "choice-group" ? name === "radiogroup" ? "radiogroup" : "group" : "combobox";
      controlled(semantic.selection === "multiple" ? "selectedKeys" : "selectedKey", semantic.selection === "multiple" ? { kind: "list", items: STRING } : { kind: "nullable", inner: STRING }, semantic.selection === "multiple" ? [] : "first");
      if (kind === "combobox" || kind === "token-choice") value("query", STRING, "", "queryChangeRequest");
      availability(); break;
    case "slider": case "range-slider": case "rating":
      roles = ["root", "label", "track", "thumb", "value"]; slotRoles = []; semantic.role = "slider";
      controlled("value", kind === "range-slider" ? { kind: "list", items: NUMBER } : NUMBER, kind === "range-slider" ? [20, 80] : kind === "rating" ? 3 : 50);
      value("min", NUMBER, kind === "rating" ? 1 : 0); value("max", NUMBER, kind === "rating" ? 5 : 100); value("step", NUMBER, 1); availability(); break;
    case "progress": case "meter": roles = ["root", "label", "track", "indicator", "value"]; slotRoles = []; semantic.role = kind === "meter" ? "meter" : "progressbar";
      value("value", NUMBER, 50); value("min", NUMBER, 0); value("max", NUMBER, 100); if (kind === "progress") value("indeterminate", BOOLEAN, false); break;
    case "loading": roles = ["root", "indicator", "label"]; slotRoles = []; semantic.role = "status"; value("loading", BOOLEAN, true); break;
    case "badge": case "text": roles = ["root", "body"]; slotRoles = []; value("text", STRING, entry.name); semantic.role = name === "title" ? "heading" : name === "code" || name === "codehighlight" ? "code" : "text"; break;
    case "avatar": case "image": roles = ["root", "image", "fallback"]; slotRoles = []; semantic.role = "img"; value("src", STRING, ""); value("alt", STRING, entry.name); value("fallback", STRING, name === "avatar" ? "AX" : "Image"); break;
    case "separator": roles = ["root"]; slotRoles = []; semantic.role = "separator"; semantic.orientation = "horizontal"; value("orientation", { kind: "enum", values: ["horizontal", "vertical"] }, "horizontal"); break;
    case "tabs": roles = ["root", "list", "trigger", "panel"]; slotRoles = ["panel"]; semantic.role = "tablist"; semantic.host = "collection"; collection(); controlled("selectedKey", STRING, "first"); break;
    case "accordion": roles = ["root", "item", "header", "trigger", "indicator", "panel"]; slotRoles = ["panel"]; semantic.role = "group"; semantic.host = "collection"; collection(); controlled("expandedKeys", { kind: "list", items: STRING }, ["first"]); value("multiple", BOOLEAN, name === "accordion"); break;
    case "dialog": case "popover": case "tooltip":
      roles = kind === "tooltip" ? ["root", "trigger", "content"] : ["root", "trigger", "backdrop", "title", "body", "close"];
      slotRoles = kind === "tooltip" ? ["content"] : ["body"]; semantic.role = kind === "tooltip" ? "tooltip" : name === "alertdialog" ? "alertdialog" : "dialog";
      semantic.modal = kind === "dialog"; semantic.host = "overlay"; controlled("open", BOOLEAN, false);
      if (kind === "tooltip") semantic.limitations.push("Tooltip is passive descriptive text, not an interactive hover card or focusable popup."); break;
    case "menu": roles = ["root", "trigger", "list", "item"]; slotRoles = []; semantic.role = "menu"; semantic.host = "overlay"; collection(); controlled("open", BOOLEAN, false); events.push({ name: "actionRequest", payloadType: { kind: "record", fields: { key: STRING }, required: ["key"], additionalFields: "reject" } }); break;
    case "link": roles = ["root", "label"]; slotRoles = []; semantic.role = "link"; value("href", STRING, "#destination"); break;
    case "navigation": roles = ["root", "list", "item"]; slotRoles = []; semantic.role = "navigation"; collection(); controlled("currentKey", STRING, "first"); break;
    case "table": roles = ["root", "header", "row", "cell"]; slotRoles = []; semantic.role = "table"; value("columns", ITEMS, [{ key: "name", label: "Name", disabled: false }, { key: "value", label: "Value", disabled: false }]); value("rows", { kind: "list", items: { kind: "record", fields: { key: STRING, cells: { kind: "list", items: STRING } }, required: ["key", "cells"], additionalFields: "reject" } }, [{ key: "first", cells: ["First", "100"] }]); break;
    case "list": roles = ["root", "item"]; slotRoles = []; semantic.role = "list"; collection(); break;
    case "layout": roles = ["root", "body"]; semantic.role = "group"; break;
    case "field": roles = ["root", "label", "body", "description", "error"]; semantic.role = name === "fieldset" ? "group" : "presentation"; semantic.host = "form"; value("invalid", BOOLEAN, false); value("required", BOOLEAN, false); break;
    case "alert": roles = ["root", "title", "body", "close"]; semantic.role = "status"; value("dismissible", BOOLEAN, false); events.push({ name: "dismissRequest", payloadType: EMPTY }); break;
    case "toolbar": roles = ["root", "body"]; semantic.role = name === "toolbar" ? "toolbar" : "group"; semantic.host = name === "toolbar" ? "group" : "none"; break;
    case "unsupported": break;
  }
  // Similar provider catalog names may require stronger contracts than their broad family.
  if (["hovercard", "previewcard", "previewtrigger"].includes(name)) { semantic.kind = "popover"; semantic.role = "dialog"; semantic.modal = false; semantic.limitations = ["Interactive preview uses an explicit nonmodal popup; it is not a tooltip."]; }
  return { entry, semantic, parts: roles.map(role => ({ role, required: role === "root" || !(kind === "accordion" && role === "item") && !["description", "error", "header", "actions", "fallback"].includes(role) })), values, events, slots: slotRoles.map(role => ({ role, required: role === "body" })) };
}
