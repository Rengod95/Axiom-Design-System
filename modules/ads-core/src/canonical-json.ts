import type { JsonValue } from "./contracts.ts";
import { CODE, MAX_CANONICAL_DEPTH, MAX_DOCUMENT_BYTES, MAX_JSON_DEPTH } from "./constants.ts";
import { KernelError } from "./kernel-error.ts";

const JSON_WHITESPACE = /[\x20\x09\x0a\x0d]/;
const JSON_NUMBER = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/;

/** Sort object keys while preserving arrays; reject non-JSON host objects. */
export function canonicalJson(value: unknown): string {
  const seen = new Set<object>();
  const encode = (item: unknown, depth: number): string => {
    if (depth > MAX_CANONICAL_DEPTH) throw new KernelError(CODE.JSON_LIMIT, "JSON nesting exceeds the profile limit.");
    if (item === null || typeof item === "boolean" || typeof item === "string") return JSON.stringify(item);
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw new KernelError(CODE.JSON_NUMBER, "JSON numbers must be finite.");
      return JSON.stringify(item);
    }
    if (typeof item !== "object" || seen.has(item)) throw new KernelError(CODE.JSON_INVALID, "Expected finite, acyclic JSON data.");
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
    let result: string;
    if (Array.isArray(item)) {
      if (prototype !== Array.prototype) throw new KernelError(CODE.JSON_INVALID, "Custom array prototypes are not JSON data.");
      const length = descriptors.length!.value as number;
      if (keys.length !== length + 1) throw new KernelError(CODE.JSON_INVALID, "Sparse arrays and additional array properties are not JSON data.");
      const values: string[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor) throw new KernelError(CODE.JSON_INVALID, "Sparse arrays are not JSON data.");
        values.push(encode(descriptor.value, depth + 1));
      }
      result = `[${values.join(",")}]`;
    } else {
      result = `{${(keys as string[]).sort().map((key) => `${JSON.stringify(key)}:${encode(descriptors[key]!.value, depth + 1)}`).join(",")}}`;
    }
    seen.delete(item);
    return result;
  };
  return encode(value, 0);
}

/** Parse strict JSON without losing duplicate keys before validation. */
export function parseJson(text: string, maximumBytes = MAX_DOCUMENT_BYTES): JsonValue {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > maximumBytes) throw new KernelError(CODE.JSON_LIMIT, "JSON source exceeds the profile byte limit.");
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
    return result;
  };
  const parsed = value(0);
  whitespace();
  if (offset !== text.length) fail();
  return parsed;
}
