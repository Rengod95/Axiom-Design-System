import type { JsonValue } from "./contracts.ts";
import { CODE, MAX_CANONICAL_BYTES, MAX_CANONICAL_DEPTH, MAX_DOCUMENT_BYTES, MAX_JSON_DEPTH } from "./constants.ts";
import { KernelError } from "./kernel-error.ts";

const JSON_WHITESPACE = /[\x20\x09\x0a\x0d]/;
const JSON_NUMBER = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/;
const MAX_STRING_CACHE_ENTRIES = 4096;
const MAX_STRING_CACHE_CHARACTERS = 4 * 1024 * 1024;

/** Compare decimal values without assuming every finite IEEE-754 conversion is exact. */
function decimalIdentity(literal: string): string {
  const [mantissa = "", exponent = "0"] = literal.toLowerCase().split("e");
  const negative = mantissa.startsWith("-");
  const [whole = "", fraction = ""] = (negative ? mantissa.slice(1) : mantissa).split(".");
  const coefficient = (whole + fraction).replace(/^0+/, "");
  if (!coefficient) return "0";
  const significant = coefficient.replace(/0+$/, "");
  const power = Number(exponent) - fraction.length + coefficient.length - significant.length;
  return `${negative ? "-" : ""}${significant}e${power}`;
}

/** Count exact source UTF-8 without encoding a buffer or replacing invalid UTF-16. */
export function utf8SourceBytes(text: string, maximumBytes: number): number {
  // Each source code unit consumes at least one byte. Never scan a suffix that
  // cannot be reached before the first byte-limit error (one extra unit decides it).
  const end = Number.isNaN(maximumBytes) ? text.length : Math.min(text.length, Math.max(1, Math.floor(maximumBytes) + 1));
  const prefix = end < text.length ? text.slice(0, end) : text;
  const nonAscii = /[\u0080-\uffff]/g;
  let bytes = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = nonAscii.exec(prefix)) !== null) {
    if (match.index > index) {
      bytes += match.index - index;
      if (bytes > maximumBytes) throw new KernelError(CODE.JSON_LIMIT, "JSON source exceeds the profile byte limit.");
    }
    index = match.index + 1;
    const code = text.charCodeAt(match.index);
    if (code >= 0xd800 && code <= 0xdbff) {
      // Read from the original even when the prefix ends inside this pair.
      const low = text.charCodeAt(index);
      if (!(low >= 0xdc00 && low <= 0xdfff)) throw new KernelError(CODE.JSON_INVALID, "Source text contains an unpaired Unicode surrogate and cannot be preserved as UTF-8.");
      index += 1;
      nonAscii.lastIndex = index;
      bytes += 4;
    } else {
      if (code >= 0xdc00 && code <= 0xdfff) throw new KernelError(CODE.JSON_INVALID, "Source text contains an unpaired Unicode surrogate and cannot be preserved as UTF-8.");
      bytes += code < 0x800 ? 2 : 3;
    }
    if (bytes > maximumBytes) throw new KernelError(CODE.JSON_LIMIT, "JSON source exceeds the profile byte limit.");
  }
  if (prefix.length > index) {
    bytes += prefix.length - index;
    if (bytes > maximumBytes) throw new KernelError(CODE.JSON_LIMIT, "JSON source exceeds the profile byte limit.");
  }
  return bytes;
}

/** Count JSON.stringify string bytes, including escapes, before allocating output. */
function stringBytes(text: string, limit: number): number {
  let bytes = 2;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code === 0x22 || code === 0x5c || code === 8 || code === 9 || code === 10 || code === 12 || code === 13) bytes += 2;
    else if (code < 0x20) bytes += 6;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const low = text.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) { bytes += 4; index += 1; }
      else bytes += 6;
    } else if (code >= 0xdc00 && code <= 0xdfff) bytes += 6;
    else bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    if (bytes > limit) throw new KernelError(CODE.JSON_LIMIT, "Canonical JSON exceeds the profile byte limit.");
  }
  return bytes;
}

/** Preflight expanded bytes and depth, then emit sorted JSON from checked data only. */
export function canonicalJson(value: unknown, maximumBytes = MAX_CANONICAL_BYTES): string {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1 || maximumBytes > MAX_CANONICAL_BYTES) throw new KernelError(CODE.JSON_LIMIT, "Invalid canonical byte limit.");
  interface Shape { bytes: number; height: number }
  interface Container extends Shape { array: boolean; children: [string, unknown][] }
  const seen = new Set<object>();
  const containers = new Map<object, Container>();
  // Per-call only. Reserve both the source key and an upper bound for its quoted
  // UTF-16 output: at most 4 Mi characters (8 MiB), plus 4096 bounded map entries.
  // Quoting is still deferred until the complete shape/byte/depth preflight passes.
  const strings = new Map<string, { bytes: number; quoted?: string }>();
  let stringCharacters = 0;
  const inspectString = (text: string): number => {
    const cached = strings.get(text);
    if (cached) return cached.bytes;
    const bytes = stringBytes(text, maximumBytes);
    const reserved = text.length + bytes;
    if (strings.size < MAX_STRING_CACHE_ENTRIES && stringCharacters + reserved <= MAX_STRING_CACHE_CHARACTERS) {
      strings.set(text, { bytes });
      stringCharacters += reserved;
    }
    return bytes;
  };
  const quoteString = (text: string): string => {
    const cached = strings.get(text);
    if (!cached) return JSON.stringify(text);
    return cached.quoted ??= JSON.stringify(text);
  };
  const bounded = (bytes: number): number => {
    if (bytes > maximumBytes) throw new KernelError(CODE.JSON_LIMIT, "Canonical JSON exceeds the profile byte limit.");
    return bytes;
  };
  const inspect = (item: unknown, depth: number): Shape => {
    if (depth > MAX_CANONICAL_DEPTH) throw new KernelError(CODE.JSON_LIMIT, "JSON nesting exceeds the profile limit.");
    if (typeof item === "string") return { bytes: bounded(inspectString(item)), height: 0 };
    if (item === null || typeof item === "boolean") return { bytes: bounded(JSON.stringify(item).length), height: 0 };
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw new KernelError(CODE.JSON_NUMBER, "JSON numbers must be finite.");
      return { bytes: bounded(JSON.stringify(item).length), height: 0 };
    }
    if (typeof item !== "object" || seen.has(item)) throw new KernelError(CODE.JSON_INVALID, "Expected finite, acyclic JSON data.");
    const cached = containers.get(item);
    if (cached) {
      if (depth + cached.height > MAX_CANONICAL_DEPTH) throw new KernelError(CODE.JSON_LIMIT, "JSON nesting exceeds the profile limit.");
      return cached;
    }
    const prototype = Object.getPrototypeOf(item);
    if (!Array.isArray(item) && prototype !== Object.prototype && prototype !== null) throw new KernelError(CODE.JSON_INVALID, "Host objects are not JSON data.");
    const descriptors = Object.getOwnPropertyDescriptors(item);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string")) throw new KernelError(CODE.JSON_INVALID, "Symbol properties are not JSON data.");
    for (const key of keys as string[]) {
      const descriptor = descriptors[key]!;
      if (!("value" in descriptor) || (!descriptor.enumerable && !(Array.isArray(item) && key === "length"))) throw new KernelError(CODE.JSON_INVALID, "Accessors and hidden properties are not JSON data.");
    }
    seen.add(item);
    const children: [string, unknown][] = [];
    if (Array.isArray(item)) {
      if (prototype !== Array.prototype) throw new KernelError(CODE.JSON_INVALID, "Custom array prototypes are not JSON data.");
      const length = descriptors.length!.value as number;
      if (keys.length !== length + 1) throw new KernelError(CODE.JSON_INVALID, "Sparse arrays and additional array properties are not JSON data.");
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor) throw new KernelError(CODE.JSON_INVALID, "Sparse arrays are not JSON data.");
        children.push([String(index), descriptor.value]);
      }
    } else {
      for (const key of (keys as string[]).sort()) children.push([key, descriptors[key]!.value]);
    }
    let bytes = bounded(2 + Math.max(0, children.length - 1));
    let height = 0;
    for (const [key, child] of children) {
      const shape = inspect(child, depth + 1);
      bytes = bounded(bytes + shape.bytes + (Array.isArray(item) ? 0 : inspectString(key) + 1));
      height = Math.max(height, shape.height + 1);
    }
    const container: Container = { bytes, height, array: Array.isArray(item), children };
    containers.set(item, container);
    seen.delete(item);
    return container;
  };
  inspect(value, 0);
  const output: string[] = [];
  let fragments: string[] = [];
  const append = (fragment: string): void => {
    fragments.push(fragment);
    if (fragments.length === 1024) { output.push(fragments.join("")); fragments = []; }
  };
  const emit = (item: unknown): void => {
    if (typeof item === "string") { append(quoteString(item)); return; }
    if (item === null || typeof item !== "object") { append(JSON.stringify(item)!); return; }
    const container = containers.get(item)!;
    append(container.array ? "[" : "{");
    container.children.forEach(([key, child], index) => {
      if (index) append(",");
      if (!container.array) { append(quoteString(key)); append(":"); }
      emit(child);
    });
    append(container.array ? "]" : "}");
  };
  emit(value);
  output.push(fragments.join(""));
  return output.join("");
}

/** Parse strict JSON without losing duplicate keys before validation. */
export function parseJson(text: string, maximumBytes = MAX_DOCUMENT_BYTES): JsonValue {
  if (typeof text !== "string" || !Number.isSafeInteger(maximumBytes) || maximumBytes < 1) throw new KernelError(CODE.JSON_LIMIT, "Invalid JSON source or byte limit.");
  utf8SourceBytes(text, maximumBytes);
  let offset = 0;
  const fail = (): never => { throw new KernelError(CODE.JSON_INVALID, `Invalid JSON at character ${offset}.`); };
  const whitespace = (): void => { while (offset < text.length && JSON_WHITESPACE.test(text[offset]!)) offset += 1; };
  const string = (): string => {
    const start = offset;
    if (text[offset++] !== '"') return fail();
    while (offset < text.length) {
      const character = text[offset++];
      if (character === '"') {
        try { return JSON.parse(text.slice(start, offset)) as string; } catch { return fail(); }
      }
      if (character === "\\") offset += 1;
    }
    return fail();
  };
  const value = (depth: number): JsonValue => {
    if (depth > MAX_JSON_DEPTH) throw new KernelError(CODE.JSON_LIMIT, "JSON nesting exceeds the profile limit.");
    whitespace();
    const character = text[offset];
    if (character === '"') return string();
    if (character === "{") {
      offset += 1;
      whitespace();
      const object: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
      if (text[offset] === "}") { offset += 1; return object; }
      for (;;) {
        whitespace();
        const key = string();
        if (Object.hasOwn(object, key)) throw new KernelError(CODE.JSON_DUPLICATE, "Duplicate JSON object key.");
        whitespace();
        if (text[offset++] !== ":") return fail();
        object[key] = value(depth + 1);
        whitespace();
        const delimiter = text[offset++];
        if (delimiter === "}") return object;
        if (delimiter !== ",") return fail();
      }
    }
    if (character === "[") {
      offset += 1;
      whitespace();
      const array: JsonValue[] = [];
      if (text[offset] === "]") { offset += 1; return array; }
      for (;;) {
        array.push(value(depth + 1));
        whitespace();
        const delimiter = text[offset++];
        if (delimiter === "]") return array;
        if (delimiter !== ",") return fail();
      }
    }
    for (const [literal, result] of [["true", true], ["false", false], ["null", null]] as const) {
      if (text.startsWith(literal, offset)) { offset += literal.length; return result; }
    }
    const number = JSON_NUMBER.exec(text.slice(offset));
    if (!number) return fail();
    offset += number[0].length;
    const result = Number(number[0]);
    if (!Number.isFinite(result)) throw new KernelError(CODE.JSON_NUMBER, "JSON numbers must be finite.");
    if (decimalIdentity(number[0]) !== decimalIdentity(JSON.stringify(result))) throw new KernelError(CODE.JSON_NUMBER, "JSON number conversion would change its decimal value; preserve the source as a draft.");
    return result;
  };
  const parsed = value(0);
  whitespace();
  if (offset !== text.length) fail();
  return parsed;
}
