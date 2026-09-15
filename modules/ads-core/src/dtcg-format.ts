import type { JsonObject, JsonValue } from "./contracts.ts";
import type { FoundationToken, FoundationTokenType, FoundationTokenValue } from "./foundation-contracts.ts";
import { FoundationCheck, own, pointer, record } from "./foundation-internal.ts";
import { FOUNDATION_TOKEN_TYPES } from "./foundation-constants.ts";
import { decodeFoundationPointer, foundationPointerValue } from "./foundation-references.ts";

export const dtcgName = (name: string): boolean => name.length > 0 && !name.startsWith("$") && !/[.{}]/.test(name);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const token = (value: unknown): boolean => record(value) && own(value, "$value");
const supported = (value: unknown): value is FoundationTokenType => typeof value === "string" && (FOUNDATION_TOKEN_TYPES as readonly string[]).includes(value);
const pathName = (path: string[]) => path.join(".");
const pathPointer = (path: string[]) => path.reduce((at, key) => pointer(at, key), "");

/** Group merge replaces a token atomically; it never combines two partial token records. */
export function mergeDtcgGroups(base: JsonObject, next: JsonObject): JsonObject {
  const result = clone(base);
  for (const [key, value] of Object.entries(next)) {
    const previous = own(result, key) ? result[key] : undefined;
    const merged = !key.startsWith("$") && record(previous) && record(value) && !token(previous) && !token(value) ? mergeDtcgGroups(previous, value) : clone(value);
    Object.defineProperty(result, key, { value: merged, enumerable: true, writable: true, configurable: true });
  }
  return result;
}

/** Import resolves local group inheritance while retaining live, stable token/property edges. */
export function readDtcgTokens(source: JsonObject, createId: () => string, check: FoundationCheck): { tokens: FoundationToken[]; groups: JsonObject } {
  const groups: JsonObject = Object.create(null), cache = new Map<string, JsonObject>(), active = new Set<string>();
  const group = (input: JsonObject, path: string[], depth: number): JsonObject => {
    const at = pathPointer(path); check.step(at);
    if (depth > 64 || active.has(at)) throw new Error(`Circular or excessive group inheritance at ${at}.`);
    if (cache.has(at)) return clone(cache.get(at)!);
    if (token(input)) throw new Error(`Expected a group at ${at}.`);
    active.add(at);
    let result: JsonObject = Object.create(null);
    if (own(input, "$extends")) {
      const ref = input.$extends;
      const targetPath = typeof ref === "string" && /^\{[^{}]+\}$/.test(ref) ? ref.slice(1, -1).split(".") : typeof ref === "string" && ref.startsWith("#/") ? decodeFoundationPointer(ref.slice(1)) : null;
      if (!targetPath) throw new Error(`Invalid local group reference at ${at}/$extends.`);
      const target = foundationPointerValue(source, pathPointer(targetPath));
      if (!record(target) || token(target)) throw new Error(`Group reference at ${at} must target a group.`);
      result = group(target, targetPath, depth + 1);
    }
    const local = clone(input); delete local.$extends;
    result = check.snapshot(mergeDtcgGroups(result, local), at) as JsonObject;
    for (const [key, value] of Object.entries(result)) if (!key.startsWith("$") && record(value) && !token(value)) result[key] = group(value, [...path, key], depth + 1);
    active.delete(at); cache.set(at, clone(result)); return result;
  };
  const expanded = group(source, [], 0);
  const entries: { path: string[]; source: JsonObject; type?: FoundationTokenType; deprecated?: boolean | string; id: string }[] = [];
  const walk = (current: JsonObject, path: string[], inheritedType?: FoundationTokenType, inheritedDeprecated?: boolean | string): void => {
    const at = pathPointer(path); check.step(at);
    const type = current.$type === undefined ? inheritedType : supported(current.$type) ? current.$type : undefined;
    if (current.$type !== undefined && !supported(current.$type)) throw new Error(`Unsupported token type at ${at}/$type.`);
    if (current.$description !== undefined && typeof current.$description !== "string" || current.$extensions !== undefined && !record(current.$extensions)) throw new Error(`Invalid description or extensions at ${at}.`);
    if (current.$deprecated !== undefined && typeof current.$deprecated !== "boolean" && typeof current.$deprecated !== "string") throw new Error(`Invalid deprecation at ${at}.`);
    const deprecated = current.$deprecated === undefined ? inheritedDeprecated : current.$deprecated as boolean | string;
    const groupFields: JsonObject = Object.create(null);
    for (const [key, value] of Object.entries(current)) {
      if (["$type", "$description", "$deprecated", "$extensions"].includes(key)) { groupFields[key] = value; continue; }
      if (key !== "$root" && !dtcgName(key)) throw new Error(`Invalid DTCG name ${key} at ${at}.`);
      if (!record(value)) throw new Error(`Expected a group or token at ${pointer(at, key)}.`);
      if (token(value)) {
        for (const field of Object.keys(value)) if (!["$type", "$value", "$description", "$deprecated", "$extensions"].includes(field)) throw new Error(`Unsupported token property ${field} at ${pointer(at, key)}.`);
        if (value.$description !== undefined && typeof value.$description !== "string" || value.$extensions !== undefined && !record(value.$extensions) || value.$deprecated !== undefined && typeof value.$deprecated !== "boolean" && typeof value.$deprecated !== "string") throw new Error(`Invalid token metadata at ${pointer(at, key)}.`);
        if (value.$type !== undefined && !supported(value.$type)) throw new Error(`Unsupported type at ${pointer(at, key)}.`);
        const ownType = value.$type === undefined ? type : value.$type as FoundationTokenType;
        const ownDeprecated = value.$deprecated === undefined ? deprecated : value.$deprecated as boolean | string;
        entries.push({ path: [...path, key], source: value, ...(ownType ? { type: ownType } : {}), ...(ownDeprecated !== undefined ? { deprecated: ownDeprecated } : {}), id: createId() });
      } else { if (key === "$root") throw new Error(`$root must be a token at ${at}.`); walk(value, [...path, key], type, deprecated); }
    }
    if (path.length && Object.keys(groupFields).length) groups[at] = groupFields;
  };
  walk(expanded, []);
  const byName = new Map(entries.map(entry => [pathName(entry.path), entry])), byPointer = new Map(entries.map(entry => [pathPointer(entry.path), entry]));
  const reference = (raw: JsonValue): { entry: typeof entries[number]; path?: string } | null => {
    if (typeof raw === "string" && /^\{[^{}]+\}$/.test(raw)) {
      const entry = byName.get(raw.slice(1, -1)); if (!entry) throw new Error(`Missing token alias ${raw}.`); return { entry };
    }
    if (record(raw) && own(raw, "$ref")) {
      if (Object.keys(raw).length !== 1 || typeof raw.$ref !== "string" || !raw.$ref.startsWith("#/")) throw new Error("Token property references require one local $ref.");
      const parts = decodeFoundationPointer(decodeURIComponent(raw.$ref.slice(1))), boundary = parts.indexOf("$value");
      if (boundary < 0) throw new Error("This editable import supports JSON pointers into token $value; other document locations remain unsupported.");
      const entry = byPointer.get(pathPointer(parts.slice(0, boundary)));
      if (!entry) throw new Error(`Missing property reference ${raw.$ref}.`);
      return { entry, ...(boundary < parts.length - 1 ? { path: pathPointer(parts.slice(boundary + 1)) } : {}) };
    }
    return null;
  };
  const infer = (entry: typeof entries[number], visited = new Set<string>()): FoundationTokenType => {
    check.step(pathPointer(entry.path));
    if (entry.type) return entry.type;
    if (visited.size >= 64) throw new Error("Token type inheritance exceeds 64 references.");
    if (visited.has(entry.id)) throw new Error(`Circular token type inference at ${pathName(entry.path)}.`);
    visited.add(entry.id); const ref = reference(entry.source.$value!);
    if (!ref || ref.path !== undefined) throw new Error(`Token ${pathName(entry.path)} requires an explicit or inherited type.`);
    return entry.type = infer(ref.entry, visited);
  };
  const convert = (value: JsonValue): { value: JsonValue; references: boolean } => {
    const ref = reference(value);
    if (ref) return { value: { ref: { id: ref.entry.id, expectedKind: "token", ...(ref.path !== undefined ? { path: ref.path } : {}) } }, references: true };
    let references = false;
    if (Array.isArray(value)) { const array = value.map(item => { const next = convert(item); references ||= next.references; return next.value; }); return { value: array, references }; }
    if (record(value)) {
      const result: JsonObject = Object.create(null);
      for (const [key, item] of Object.entries(value)) { const next = convert(item); result[key] = next.value; references ||= next.references; }
      return { value: result, references };
    }
    return { value, references: false };
  };
  const tokens = entries.map(entry => {
    check.step(pathPointer(entry.path)); const next = convert(entry.source.$value!), whole = record(next.value) && own(next.value, "ref");
    const value = whole ? next.value as unknown as FoundationTokenValue : next.references ? { composite: next.value } : { literal: next.value };
    return { id: entry.id, name: pathName(entry.path), typeRef: { id: infer(entry) }, value, ...(entry.source.$description !== undefined ? { description: entry.source.$description as string } : {}), ...(entry.deprecated !== undefined ? { deprecated: entry.deprecated } : {}), ...(entry.source.$extensions !== undefined ? { extensions: entry.source.$extensions as JsonObject } : {}) };
  });
  return { tokens, groups };
}

/** Stable ADS identities are converted back to current token paths at export time. */
export function writeDtcgValue(value: FoundationTokenValue, names: ReadonlyMap<string, string>): JsonValue {
  const reference = (ref: { id: string; path?: string }): JsonValue => {
    const name = names.get(ref.id); if (!name) throw new Error("Missing export reference.");
    return ref.path === undefined ? `{${name}}` : { $ref: `#${pathPointer(name.split("."))}/$value${ref.path}` };
  };
  const convert = (item: JsonValue): JsonValue => record(item) && own(item, "ref") ? reference(item.ref as { id: string; path?: string }) : Array.isArray(item) ? item.map(convert) : record(item) ? Object.fromEntries(Object.entries(item).map(([key, child]) => [key, convert(child)])) : item;
  return "literal" in value ? value.literal : "ref" in value ? reference(value.ref) : convert(value.composite);
}

export function putDtcgToken(output: JsonObject, name: string, value: JsonObject): void {
  const path = name.split(".");
  if (!path.every((key, index) => dtcgName(key) || key === "$root" && index === path.length - 1)) throw new Error(`Token ${name} is not a valid DTCG path.`);
  let current = output;
  for (const key of path.slice(0, -1)) {
    if (own(current, key) && (!record(current[key]) || token(current[key]))) throw new Error(`Token/group path collision at ${name}.`);
    if (!own(current, key)) Object.defineProperty(current, key, { value: Object.create(null), enumerable: true, writable: true, configurable: true });
    current = current[key] as JsonObject;
  }
  const key = path.at(-1)!;
  if (own(current, key)) throw new Error(`Duplicate token/group path ${name}.`);
  Object.defineProperty(current, key, { value, enumerable: true, writable: true, configurable: true });
}
