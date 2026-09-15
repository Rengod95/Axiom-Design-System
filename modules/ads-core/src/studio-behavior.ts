import type { AdsDocument, JsonObject, JsonValue } from "./contracts.ts";
import { canonicalJson } from "./canonical-json.ts";
import { isObject, isValidId } from "./documents.ts";
import { inspectTypedValue } from "./type-validation.ts";
import { getStudioCatalogRecipe } from "./studio-catalog.ts";

export const STUDIO_BEHAVIOR_VERSION = "1.0.0" as const;
export const STUDIO_BEHAVIOR_LIMITS = { rules: 32, actions: 8, text: 2048 } as const;
export const STUDIO_BEHAVIOR_TRIGGERS = ["press", "change", "focus", "blur"] as const;
export type StudioBehaviorScalar = string | number | boolean;
export type StudioBehaviorTrigger = typeof STUDIO_BEHAVIOR_TRIGGERS[number];
export type StudioBehaviorCondition = { valueRef: string; operator: "equals" | "not-equals" | "greater-than" | "less-than"; value: StudioBehaviorScalar };
export type StudioBehaviorAction = { kind: "set"; valueRef: string; value: StudioBehaviorScalar }
  | { kind: "toggle"; valueRef: string } | { kind: "emit"; eventRef: string; payload: JsonValue };
export interface StudioBehaviorRule { id: string; name: string; targetPartRef: string; trigger: StudioBehaviorTrigger; condition: StudioBehaviorCondition | null; actions: StudioBehaviorAction[] }
export interface StudioBehaviorDefinition { version: typeof STUDIO_BEHAVIOR_VERSION; rules: StudioBehaviorRule[] }
export interface StudioBehaviorState { [valueId: string]: StudioBehaviorScalar }
export interface StudioBehaviorInput { targetPartRef: string; trigger: StudioBehaviorTrigger }
export interface StudioBehaviorResult { values: StudioBehaviorState; emissions: { eventRef: string; payload: JsonValue; ruleId: string }[]; matchedRuleIds: string[] }
type Sink = (path: string, message: string) => void;
const rows = (value: unknown): JsonObject[] => Array.isArray(value) ? value.filter(isObject) : [];
const fields = (value: JsonObject, expected: string[]) => Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const scalar = (value: unknown): value is StudioBehaviorScalar => typeof value === "boolean" || typeof value === "string" && value.length <= STUDIO_BEHAVIOR_LIMITS.text || typeof value === "number" && Number.isFinite(value);
export function studioBehaviorValues(document: JsonObject): JsonObject[] { return isObject(document.publicContract) ? rows(document.publicContract.values).filter(value => isObject(value.type) && ["boolean", "string", "number", "enum"].includes(String(value.type.kind)) && scalar(value.defaultValue)) : []; }

/** Protected catalog handlers already own their required requests; a second authored request is ambiguous. */
function semanticRequests(document: JsonObject, trigger: StudioBehaviorTrigger): string[] {
  const catalogId = isObject(document.catalogProfile) && typeof document.catalogProfile.catalogId === "string" ? document.catalogProfile.catalogId : "";
  const recipe = getStudioCatalogRecipe(catalogId); if (!recipe) return [];
  const kind = recipe.semantic.kind;
  if (trigger === "change") return recipe.values.flatMap(value => value.requestEvent ? [value.requestEvent] : []);
  if (trigger === "focus" || trigger === "blur") return kind === "tooltip" ? ["openChangeRequest"] : trigger === "blur" && kind === "number-input" ? ["valueChangeRequest"] : [];
  if (kind === "button" || kind === "surface") return ["activate"];
  if (kind === "toggle") return ["pressedChangeRequest"];
  if (["checkbox", "radio", "switch"].includes(kind)) return ["checkedChangeRequest"];
  if (["number-input", "slider", "range-slider", "rating"].includes(kind)) return ["valueChangeRequest"];
  if (kind === "choice-group" || kind === "select" || kind === "tabs") return ["selectedKeyChangeRequest", "selectedKeysChangeRequest"];
  if (kind === "accordion") return ["expandedKeysChangeRequest"];
  if (kind === "dialog" || kind === "tooltip") return ["openChangeRequest"];
  if (kind === "menu") return ["openChangeRequest", "actionRequest"];
  if (kind === "navigation") return ["currentKeyChangeRequest"];
  if (kind === "alert") return ["dismissRequest"];
  return [];
}

/** This optional closed extension never changes the catalog's required semantic behavior profile. */
export function inspectStudioBehavior(document: JsonObject, add: Sink): void {
  if (document.studioBehavior === undefined) return;
  const behavior = document.studioBehavior, values = studioBehaviorValues(document), parts = rows(document.parts);
  const events = isObject(document.publicContract) ? rows(document.publicContract.events) : [];
  if (!isObject(behavior) || !fields(behavior, ["version", "rules"]) || behavior.version !== STUDIO_BEHAVIOR_VERSION || !Array.isArray(behavior.rules) || behavior.rules.length > STUDIO_BEHAVIOR_LIMITS.rules) { add("/studioBehavior", "Behavior requires a supported version and at most 32 rules."); return; }
  const ids = new Set<string>();
  for (const [index, rule] of behavior.rules.entries()) {
    const path = `/studioBehavior/rules/${index}`;
    if (!isObject(rule) || !fields(rule, ["id", "name", "targetPartRef", "trigger", "condition", "actions"]) || !isValidId(rule.id) || ids.has(String(rule.id)) || typeof rule.name !== "string" || !rule.name.trim() || rule.name.length > 80
      || !parts.some(part => part.id === rule.targetPartRef) || typeof rule.trigger !== "string" || !STUDIO_BEHAVIOR_TRIGGERS.some(trigger => trigger === rule.trigger)) { add(path, "A rule needs a unique identity, name, local element and supported input trigger."); continue; }
    ids.add(String(rule.id));
    if (rule.condition !== null) {
      const condition = rule.condition, port = isObject(condition) && values.find(value => value.id === condition.valueRef);
      if (!isObject(condition) || !fields(condition, ["valueRef", "operator", "value"]) || !port || typeof condition.operator !== "string" || !["equals", "not-equals", "greater-than", "less-than"].includes(condition.operator)
        || !scalar(condition.value) || !inspectTypedValue(port.type, condition.value).valid || ["greater-than", "less-than"].includes(condition.operator) && typeof condition.value !== "number") add(`${path}/condition`, "A condition compares an existing scalar value with the same explicit type; ordering requires numbers.");
    }
    if (!Array.isArray(rule.actions) || !rule.actions.length || rule.actions.length > STUDIO_BEHAVIOR_LIMITS.actions) { add(`${path}/actions`, "Use 1–8 ordered UI actions per rule."); continue; }
    for (const [actionIndex, action] of rule.actions.entries()) {
      const actionPath = `${path}/actions/${actionIndex}`;
      if (!isObject(action)) { add(actionPath, "Choose a typed local-value or event action."); continue; }
      if (action.kind === "emit") {
        const event = events.find(event => event.id === action.eventRef);
        if (!fields(action, ["kind", "eventRef", "payload"]) || !event || !inspectTypedValue(event.payloadType, action.payload).valid) add(actionPath, "Emitted payload must match an existing declared event; raw DOM events and arbitrary code are not allowed.");
        else if (semanticRequests(document, rule.trigger as StudioBehaviorTrigger).includes(String(event.name))) add(actionPath, `The built-in ${rule.trigger} interaction already owns ${String(event.name)}. Choose another trigger or a separate event to avoid sending the same request twice.`);
      } else {
        const port = values.find(value => value.id === action.valueRef);
        if (!port || port.ownership !== "local") { add(actionPath, "Only locally owned scalar values can be changed; emit a declared request for a consumer-owned value."); continue; }
        if (action.kind === "set") { if (!fields(action, ["kind", "valueRef", "value"]) || !scalar(action.value) || !inspectTypedValue(port.type, action.value).valid) add(actionPath, "Set requires a literal matching the local value's type."); }
        else if (action.kind !== "toggle" || !fields(action, ["kind", "valueRef"]) || !isObject(port.type) || port.type.kind !== "boolean") add(actionPath, "Toggle requires a local boolean; other actions are unsupported.");
      }
    }
  }
}

export function readStudioBehavior(document: JsonObject): StudioBehaviorDefinition {
  const errors: string[] = []; inspectStudioBehavior(document, (path, message) => errors.push(`${path}: ${message}`));
  if (errors.length) throw new Error(errors.join("\n"));
  return document.studioBehavior === undefined ? { version: STUDIO_BEHAVIOR_VERSION, rules: [] } : structuredClone(document.studioBehavior) as unknown as StudioBehaviorDefinition;
}
export function createStudioBehaviorState(document: JsonObject): StudioBehaviorState {
  return Object.fromEntries(studioBehaviorValues(document).map(value => [String(value.id), value.defaultValue as StudioBehaviorScalar]));
}

/** No host APIs, recursion, clocks or evaluation. Conditions read the pre-event snapshot; actions apply in source order. */
export function executeStudioBehavior(definition: StudioBehaviorDefinition, state: StudioBehaviorState, input: StudioBehaviorInput, localIds: string[]): StudioBehaviorResult {
  const values = { ...state }, emissions: StudioBehaviorResult["emissions"] = [], matchedRuleIds: string[] = [];
  if (definition.rules.length > 32) throw new Error("Behavior rule budget exceeded.");
  for (const rule of definition.rules) {
    if (rule.targetPartRef !== input.targetPartRef || rule.trigger !== input.trigger) continue;
    const condition = rule.condition;
    if (condition) {
      if (!Object.hasOwn(state, condition.valueRef)) throw new Error("Behavior state is missing a declared value.");
      const current = state[condition.valueRef], expected = condition.value;
      const matches = condition.operator === "equals" ? current === expected : condition.operator === "not-equals" ? current !== expected
        : condition.operator === "greater-than" ? typeof current === "number" && typeof expected === "number" && current > expected
        : condition.operator === "less-than" && typeof current === "number" && typeof expected === "number" && current < expected;
      if (!matches) continue;
    }
    if (!rule.actions.length || rule.actions.length > 8) throw new Error("Behavior action budget exceeded.");
    matchedRuleIds.push(rule.id);
    for (const action of rule.actions) {
      if (action.kind === "emit") { emissions.push({ eventRef: action.eventRef, payload: JSON.parse(JSON.stringify(action.payload)) as JsonValue, ruleId: rule.id }); continue; }
      if (!Object.hasOwn(values, action.valueRef) || !localIds.includes(action.valueRef)) throw new Error("Behavior cannot write an external or unknown value.");
      if (action.kind === "toggle") { if (typeof values[action.valueRef] !== "boolean") throw new Error("Toggle needs a boolean state value."); values[action.valueRef] = !values[action.valueRef]; }
      else if (action.kind === "set" && typeof values[action.valueRef] === typeof action.value && (typeof action.value !== "number" || Number.isFinite(action.value))) values[action.valueRef] = action.value;
      else throw new Error("Behavior action has an invalid value type.");
    }
  }
  return { values, emissions, matchedRuleIds };
}

/** Public simulation boundary validates authored data and runtime values before the atomic step. */
export function dispatchStudioBehavior(document: JsonObject, state: StudioBehaviorState, input: StudioBehaviorInput): StudioBehaviorResult {
  const definition = readStudioBehavior(document), ports = studioBehaviorValues(document);
  if (!isObject(input) || !fields(input, ["targetPartRef", "trigger"]) || !rows(document.parts).some(part => part.id === input.targetPartRef) || !STUDIO_BEHAVIOR_TRIGGERS.includes(input.trigger)) throw new Error("Choose an existing element and supported trigger.");
  if (!isObject(state) || Object.keys(state).length !== ports.length || ports.some(port => !Object.hasOwn(state, String(port.id)) || !inspectTypedValue(port.type, state[String(port.id)]).valid)) throw new Error("Behavior runtime values must match the complete scalar contract.");
  return executeStudioBehavior(definition, state, input, ports.filter(port => port.ownership === "local").map(port => String(port.id)));
}

/** Called only on a detached reviewed candidate; public mutation validation owns IDs and source revisions. */
export function mutateStudioBehavior(document: AdsDocument, definition: StudioBehaviorDefinition | null): void {
  if (definition === null) { delete document.studioBehavior; return; }
  const source = JSON.parse(canonicalJson(definition)) as JsonObject;
  const candidate = { ...document, studioBehavior: source }, messages: string[] = [];
  inspectStudioBehavior(candidate, (path, message) => messages.push(`${path}: ${message}`));
  if (messages.length) throw new Error(messages.join("\n"));
  document.studioBehavior = source;
}

/** Generator embeds this Axiom-owned pure implementation, never user-authored executable text. */
export function studioBehaviorRuntimeSource(): string { return executeStudioBehavior.toString(); }

/** Duplicate only known references. An event payload remains opaque authored data even if it resembles an ID. */
export function remapStudioBehavior(document: AdsDocument, ids: ReadonlyMap<string, string>, id: () => string): void {
  if (document.studioBehavior === undefined) return;
  const definition = structuredClone(document.studioBehavior) as unknown as StudioBehaviorDefinition;
  for (const rule of definition.rules) {
    rule.id = id(); rule.targetPartRef = ids.get(rule.targetPartRef) ?? rule.targetPartRef;
    if (rule.condition) rule.condition.valueRef = ids.get(rule.condition.valueRef) ?? rule.condition.valueRef;
    for (const action of rule.actions) if (action.kind === "emit") action.eventRef = ids.get(action.eventRef) ?? action.eventRef; else action.valueRef = ids.get(action.valueRef) ?? action.valueRef;
  }
  document.studioBehavior = definition as unknown as JsonObject;
}
