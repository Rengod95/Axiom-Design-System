import { canonicalJson, parseJson } from "./canonical-json.ts";
import type { Diagnostic, JsonObject, JsonValue } from "./contracts.ts";
import { FoundationCheck, record, own } from "./foundation-internal.ts";
import { foundationPointerValue } from "./foundation-references.ts";
import { mergeDtcgGroups } from "./dtcg-format.ts";

export interface DtcgResolverReport {
  valid: boolean; diagnostics: Diagnostic[]; tokenText?: string;
  modifiers: { name: string; contexts: string[]; default?: string }[];
  inputs: Record<string, string>; order: { name: string; type: "set" | "modifier"; context?: string }[];
}

/** Resolves a supplied document set only. No network, filesystem or ambient resource access. */
export function resolveDtcgResolver(text: string, inputsInput: Record<string, string> = {}, sourcesInput: Record<string, string> = {}): DtcgResolverReport {
  const check = new FoundationCheck("memory:dtcg-resolver"), result: DtcgResolverReport = { valid: false, diagnostics: check.diagnostics, modifiers: [], inputs: {}, order: [] };
  try {
    const root = check.snapshot(parseJson(text)), inputs = check.snapshot(inputsInput), sources = check.snapshot(sourcesInput);
    if (!record(root) || root.version !== "2025.10" || !Array.isArray(root.resolutionOrder) || !root.resolutionOrder.length) throw new Error("Resolver requires version 2025.10 and a nonempty resolutionOrder array.");
    if (!record(inputs) || !Object.values(inputs).every(value => typeof value === "string") || !record(sources) || !Object.values(sources).every(value => typeof value === "string") || Object.keys(sources).length > 32) throw new Error("Supply string context choices and at most 32 named JSON source files.");
    for (const key of ["sets", "modifiers"]) if (root[key] !== undefined && !record(root[key])) throw new Error(`${key} must be an object.`);
    const files = new Map<string, JsonValue>([["/resolver.json", root]]);
    for (const [name, content] of Object.entries(sources)) {
      const supplied = new URL(name, "https://axiom.invalid/");
      if (supplied.origin !== "https://axiom.invalid" || supplied.search || supplied.hash) throw new Error("Source names must be local paths without query or fragment.");
      const path = supplied.pathname;
      if (files.has(path)) throw new Error(`Duplicate source path ${name}.`);
      files.set(path, check.snapshot(parseJson(content as string)));
    }
    const references = new Set<string>();
    const dereference = (value: JsonValue, file: string, allowModifier: boolean, depth = 0): { value: JsonValue; file: string; pointer: string } => {
      check.step(file);
      if (depth > 64) throw new Error("Resolver reference depth exceeds 64.");
      if (!record(value) || !own(value, "$ref")) return { value, file, pointer: "" };
      if (typeof value.$ref !== "string") throw new Error("Resolver $ref must be a string.");
      const url = new URL(value.$ref, `https://axiom.invalid${file}`);
      if (url.origin !== "https://axiom.invalid" || url.search) throw new Error("External URLs are not fetched. Supply local JSON source names.");
      const path = decodeURIComponent(url.hash.slice(1)), key = `${url.pathname}#${path}`;
      if (path.startsWith("/resolutionOrder") && (path.length === 16 || path[16] === "/")) throw new Error("References into resolutionOrder are forbidden.");
      if (!allowModifier && (path === "/modifiers" || path.startsWith("/modifiers/"))) throw new Error("Only resolutionOrder may reference a modifier.");
      if (references.has(key)) throw new Error(`Circular resolver reference ${key}.`);
      if (!files.has(url.pathname)) throw new Error(`Missing supplied source ${url.pathname}.`);
      references.add(key);
      const target = dereference(foundationPointerValue(files.get(url.pathname)!, path), url.pathname, allowModifier, depth + 1);
      const siblings = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "$ref"));
      if (Object.keys(siblings).length && !record(target.value)) throw new Error("Reference overrides require an object target.");
      references.delete(key);
      return { value: Object.keys(siblings).length ? { ...(target.value as JsonObject), ...siblings } : target.value, file: target.file, pointer: target.pointer || path };
    };
    const definition = (value: JsonValue, kind: "set" | "modifier", name: string): JsonObject => {
      if (!record(value)) throw new Error(`${name} must be a ${kind} object.`);
      if (value.description !== undefined && typeof value.description !== "string" || value.$extensions !== undefined && !record(value.$extensions)) throw new Error(`Invalid ${name} metadata.`);
      if (kind === "set") { if (!Array.isArray(value.sources)) throw new Error(`Set ${name} requires sources.`); }
      else {
        if (!record(value.contexts) || !Object.keys(value.contexts).length || !Object.values(value.contexts).every(Array.isArray)) throw new Error(`Modifier ${name} requires nonempty contexts with source arrays.`);
        if (value.default !== undefined && (typeof value.default !== "string" || !own(value.contexts, value.default))) throw new Error(`Invalid default context for ${name}.`);
      }
      return value;
    };
    const activeSources = new Set<JsonObject>();
    const source = (raw: JsonValue, file: string, depth = 0): JsonObject => {
      check.step(file);
      if (depth > 64) throw new Error("Nested resolver sets exceed 64.");
      const resolved = dereference(raw, file, false), value = resolved.value;
      if (!record(value)) throw new Error("A token source must be an object.");
      if (record(value.contexts) && Object.values(value.contexts).every(Array.isArray)) throw new Error("A set or context cannot include another modifier.");
      if (activeSources.has(value)) throw new Error("Circular set source reference.");
      activeSources.add(value);
      let output: JsonObject = Object.create(null);
      if (Array.isArray(value.sources)) { const set = definition(value, "set", "Referenced set"); for (const item of set.sources as JsonValue[]) output = check.snapshot(mergeDtcgGroups(output, source(item, resolved.file, depth + 1))) as JsonObject; }
      else output = value;
      activeSources.delete(value); return output;
    };
    // Inspect every declared source/context, including choices outside the active input.
    for (const [name, raw] of Object.entries(record(root.sets) ? root.sets : {})) {
      const resolved = dereference(raw, "/resolver.json", false), set = definition(resolved.value, "set", name);
      for (const item of set.sources as JsonValue[]) source(item, resolved.file);
    }
    for (const [name, raw] of Object.entries(record(root.modifiers) ? root.modifiers : {})) {
      const resolved = dereference(raw, "/resolver.json", false), modifier = definition(resolved.value, "modifier", name);
      for (const list of Object.values(modifier.contexts as JsonObject)) for (const item of list as JsonValue[]) source(item, resolved.file);
    }
    const names = new Set<string>(), entries: { name: string; type: "set" | "modifier"; definition: JsonObject; file: string }[] = [];
    for (const raw of root.resolutionOrder) {
      if (!record(raw)) throw new Error("Each resolution step must be an object.");
      const resolved = dereference(raw, "/resolver.json", true);
      const keys = resolved.pointer ? resolved.pointer.split("/").slice(1).map(key => key.replaceAll("~1", "/").replaceAll("~0", "~")) : [];
      const kind = keys[0] === "sets" ? "set" : keys[0] === "modifiers" ? "modifier" : resolved.value && record(resolved.value) ? resolved.value.type : undefined;
      const name = record(resolved.value) && typeof resolved.value.name === "string" ? resolved.value.name : keys.length === 2 ? keys[1] : undefined;
      if ((kind !== "set" && kind !== "modifier") || !name?.trim() || names.has(name)) throw new Error("Resolution steps need unique names and a set/modifier type.");
      names.add(name); const current = definition(resolved.value, kind, name);
      entries.push({ name, type: kind, definition: current, file: resolved.file });
      const lists = kind === "set" ? [current.sources] : Object.values(current.contexts as JsonObject);
      for (const list of lists) for (const item of list as JsonValue[]) source(item, resolved.file);
      if (kind === "modifier") result.modifiers.push({ name, contexts: Object.keys(current.contexts as JsonObject), ...(typeof current.default === "string" ? { default: current.default } : {}) });
    }
    for (const key of Object.keys(inputs)) if (!result.modifiers.some(item => item.name === key)) throw new Error(`Unknown modifier input ${key}. Context inputs are case-sensitive.`);
    let output: JsonObject = Object.create(null);
    for (const entry of entries) {
      let list: JsonValue[];
      if (entry.type === "set") list = entry.definition.sources as JsonValue[];
      else {
        const context = own(inputs, entry.name) ? inputs[entry.name] : entry.definition.default, contexts = entry.definition.contexts as JsonObject;
        if (typeof context !== "string" || !own(contexts, context)) throw new Error(`Choose a valid context for ${entry.name}.`);
        Object.defineProperty(result.inputs, entry.name, { value: context, enumerable: true }); list = contexts[context] as JsonValue[];
      }
      for (const item of list) output = check.snapshot(mergeDtcgGroups(output, source(item, entry.file))) as JsonObject;
      result.order.push({ name: entry.name, type: entry.type, ...(entry.type === "modifier" ? { context: result.inputs[entry.name]! } : {}) });
    }
    result.tokenText = canonicalJson(check.snapshot(output)); result.valid = true;
  } catch (error) { check.error("", error instanceof Error ? error.message : "Invalid resolver input."); }
  return result;
}
