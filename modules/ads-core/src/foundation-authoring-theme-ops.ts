import { canonicalJson } from "./canonical-json.ts";
import { put } from "./foundation-authoring-internal.ts";
import { FOUNDATION_RESOLVER_ID, FOUNDATION_RESOLVER_VERSION } from "./foundation-constants.ts";
import type { FoundationAxis, FoundationDocument, FoundationSelection, FoundationThemeSet } from "./foundation-contracts.ts";
import type { FoundationAuthoringEdit } from "./foundation-authoring-contracts.ts";

const copy = <T>(value: T): T => JSON.parse(canonicalJson(value)) as T;
function axisFor(foundation: FoundationDocument, id: string): FoundationAxis {
  const axis = foundation.themeAxes.find(item => item.id === id);
  if (!axis) throw new Error("Selected theme axis is missing.");
  return axis;
}
function contextFor(axis: FoundationAxis, name: string): void { if (!axis.contexts.includes(name)) throw new Error("Selected context is not declared by its axis."); }
function freshContext(axis: FoundationAxis, name: string): void { if (typeof name !== "string" || !name.trim() || axis.contexts.includes(name)) throw new Error("A context needs a unique nonblank name within its axis."); }
function describe(target: object, edit: { name?: string; description?: string | null }): void {
  if (Object.hasOwn(edit, "name")) put(target, "name", edit.name);
  if (Object.hasOwn(edit, "description")) { if (edit.description === null) delete (target as { description?: string }).description; else put(target, "description", edit.description); }
}

/** Own axis/context maps are edited explicitly together, including the caller's transient selection. */
export function applyFoundationThemeEdit(foundation: FoundationDocument, edit: FoundationAuthoringEdit, createId: () => string, selection: FoundationSelection): void {
  switch (edit.kind) {
    case "theme-axis-create": {
      const axis: FoundationAxis = { id: createId(), name: edit.name, contexts: edit.contexts, default: edit.default, scope: { id: foundation.id, expectedKind: "foundation" } };
      describe(axis, edit); foundation.themeAxes.push(axis); foundation.resolutionOrder.push(axis.id);
      for (const theme of foundation.themeSets) put(theme.contexts, axis.id, edit.default);
      return;
    }
    case "theme-axis-update": {
      const axis = axisFor(foundation, edit.id); describe(axis, edit);
      if (edit.default !== undefined) { contextFor(axis, edit.default); axis.default = edit.default; } return;
    }
    case "theme-axis-delete": {
      axisFor(foundation, edit.id);
      foundation.themeAxes = foundation.themeAxes.filter(axis => axis.id !== edit.id);
      foundation.resolutionOrder = foundation.resolutionOrder.filter(id => id !== edit.id);
      for (const theme of foundation.themeSets) delete theme.contexts[edit.id];
      if (selection.contexts) delete selection.contexts[edit.id]; return;
    }
    case "theme-context-add": {
      const axis = axisFor(foundation, edit.axisId); freshContext(axis, edit.name);
      if (edit.copyFrom !== undefined) {
        contextFor(axis, edit.copyFrom);
        if (axis.overrides && Object.hasOwn(axis.overrides, edit.copyFrom)) put(axis.overrides, edit.name, copy(axis.overrides[edit.copyFrom]));
      }
      axis.contexts.push(edit.name); return;
    }
    case "theme-context-rename": {
      const axis = axisFor(foundation, edit.axisId); contextFor(axis, edit.context);
      if (edit.name === edit.context) return;
      freshContext(axis, edit.name); axis.contexts = axis.contexts.map(value => value === edit.context ? edit.name : value);
      if (axis.default === edit.context) axis.default = edit.name;
      if (axis.overrides && Object.hasOwn(axis.overrides, edit.context)) { put(axis.overrides, edit.name, axis.overrides[edit.context]); delete axis.overrides[edit.context]; }
      for (const theme of foundation.themeSets) if (theme.contexts[axis.id] === edit.context) put(theme.contexts, axis.id, edit.name);
      if (selection.contexts?.[axis.id] === edit.context) put(selection.contexts, axis.id, edit.name); return;
    }
    case "theme-context-delete": {
      const axis = axisFor(foundation, edit.axisId); contextFor(axis, edit.context);
      if (axis.contexts.length <= 1) throw new Error("An axis must retain at least one context; remove the axis explicitly instead.");
      const used = axis.default === edit.context || foundation.themeSets.some(theme => theme.contexts[axis.id] === edit.context) || selection.contexts?.[axis.id] === edit.context;
      if (used && edit.replacement === undefined) throw new Error("The context is selected by a default, named set or current view; choose a replacement before deletion.");
      if (edit.replacement !== undefined) { contextFor(axis, edit.replacement); if (edit.replacement === edit.context) throw new Error("Context replacement must be a different context."); }
      axis.contexts = axis.contexts.filter(value => value !== edit.context);
      if (axis.overrides) delete axis.overrides[edit.context];
      if (axis.default === edit.context) axis.default = edit.replacement!;
      for (const theme of foundation.themeSets) if (theme.contexts[axis.id] === edit.context) put(theme.contexts, axis.id, edit.replacement!);
      if (selection.contexts?.[axis.id] === edit.context) put(selection.contexts, axis.id, edit.replacement!); return;
    }
    case "theme-set-create": {
      const theme: FoundationThemeSet = { id: createId(), name: edit.name, contexts: edit.contexts, resolutionProfile: { id: FOUNDATION_RESOLVER_ID, expectedKind: "resolutionProfile", version: FOUNDATION_RESOLVER_VERSION } };
      describe(theme, edit); foundation.themeSets.push(theme); return;
    }
    case "theme-set-update": {
      const theme = foundation.themeSets.find(item => item.id === edit.id); if (!theme) throw new Error("Selected ThemeSet is missing.");
      describe(theme, edit); if (edit.contexts !== undefined) theme.contexts = edit.contexts; return;
    }
    case "theme-set-delete": {
      if (!foundation.themeSets.some(item => item.id === edit.id)) throw new Error("Selected ThemeSet is missing.");
      foundation.themeSets = foundation.themeSets.filter(theme => theme.id !== edit.id);
      if (selection.themeSetId === edit.id) { const replacement = foundation.themeSets[0]; if (replacement) selection.themeSetId = replacement.id; else delete selection.themeSetId; } return;
    }
    case "theme-override-set": case "theme-override-remove": {
      const axis = axisFor(foundation, edit.axisId); contextFor(axis, edit.context);
      if (!foundation.tokens.some(token => token.id === edit.id)) throw new Error("Theme override token is missing.");
      if (edit.kind === "theme-override-remove") { const values = axis.overrides && Object.hasOwn(axis.overrides, edit.context) ? axis.overrides[edit.context] : undefined; if (values) delete values[edit.id]; return; }
      const overrides = axis.overrides ?? (axis.overrides = Object.create(null) as NonNullable<FoundationAxis["overrides"]>);
      if (!Object.hasOwn(overrides, edit.context)) put(overrides, edit.context, Object.create(null));
      put(overrides[edit.context]!, edit.id, edit.value); return;
    }
    case "theme-order": foundation.resolutionOrder = edit.axisIds; return;
    default: throw new Error("Unsupported Foundation authoring operation.");
  }
}
