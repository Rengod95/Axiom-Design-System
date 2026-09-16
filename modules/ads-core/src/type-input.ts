import { CODE, MAX_DOCUMENT_BYTES, MAX_JSON_DEPTH } from "./constants.ts";
import type { JsonValue } from "./contracts.ts";

/** Shared budget includes input copying, declaration traversal and value matching. */
export const MAX_TYPE_STEPS = 65_536;
export class TypeInputError extends Error {
  readonly code: string;
  readonly path: string;
  constructor(code: string, path: string, message: string) { super(message); this.code = code; this.path = path; }
}
export const typePointer = (path: string, key: string): string => `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
export class TypeBudget {
  private steps = 0;
  private readonly maxSteps: number;
  constructor(maxSteps = MAX_TYPE_STEPS) { this.maxSteps = maxSteps; }
  step(path: string): void {
    if (++this.steps > this.maxSteps) throw new TypeInputError(CODE.JSON_LIMIT, path, "Type inspection exceeds its work limit.");
  }
}

/** Snapshot own JSON data without invoking accessors or user toJSON methods. */
export function snapshotTypeInput(value: unknown, path: string, budget: TypeBudget): JsonValue {
  let bytes = 0;
  const active = new Set<object>();
  const add = (amount: number, at: string): void => {
    bytes += amount;
    if (bytes > MAX_DOCUMENT_BYTES) throw new TypeInputError(CODE.JSON_LIMIT, at, "Type inspection input exceeds its byte limit.");
  };
  const string = (text: string, at: string): void => {
    add(2, at);
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      if (code === 34 || code === 92 || code === 8 || code === 9 || code === 10 || code === 12 || code === 13) add(2, at);
      else if (code < 32) add(6, at);
      else if (code >= 0xd800 && code <= 0xdbff) {
        const low = text.charCodeAt(index + 1);
        if (low >= 0xdc00 && low <= 0xdfff) { add(4, at); index++; } else add(6, at);
      } else if (code >= 0xdc00 && code <= 0xdfff) add(6, at);
      else add(code < 128 ? 1 : code < 2048 ? 2 : 3, at);
    }
  };
  const reject = (at: string, message = "Expected plain, finite, acyclic JSON data."): never => { throw new TypeInputError(CODE.JSON_INVALID, at, message); };
  const copy = (item: unknown, at: string, depth: number): JsonValue => {
    budget.step(at);
    if (depth > MAX_JSON_DEPTH) throw new TypeInputError(CODE.JSON_LIMIT, at, "Type inspection input exceeds its depth limit.");
    if (typeof item === "string") { string(item, at); return item; }
    if (item === null || typeof item === "boolean") { add(item === null || item === true ? 4 : 5, at); return item; }
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw new TypeInputError(CODE.JSON_NUMBER, at, "JSON numbers must be finite.");
      add(JSON.stringify(item).length, at); return item;
    }
    if (typeof item !== "object" || active.has(item)) return reject(at);
    const array = Array.isArray(item);
    const prototype = Object.getPrototypeOf(item);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) return reject(at, "Host objects and custom prototypes are not JSON data.");
    const descriptors = Object.getOwnPropertyDescriptors(item);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length > MAX_TYPE_STEPS) throw new TypeInputError(CODE.JSON_LIMIT, at, "Type inspection input exceeds its work limit.");
    for (const key of keys) {
      if (typeof key !== "string") return reject(at, "Symbol properties are not JSON data.");
      const descriptor = descriptors[key]!;
      if (!("value" in descriptor) || (!descriptor.enumerable && !(array && key === "length"))) return reject(typePointer(at, key), "Accessors and hidden properties are not JSON data.");
    }
    active.add(item);
    add(2, at);
    if (array) {
      const length = descriptors.length!.value as number;
      if (keys.length !== length + 1) return reject(at, "Sparse arrays and additional array properties are not JSON data.");
      const result: JsonValue[] = [];
      for (let index = 0; index < length; index++) {
        const child = descriptors[String(index)];
        if (!child) return reject(typePointer(at, String(index)), "Sparse arrays are not JSON data.");
        if (index) add(1, at);
        result.push(copy(child.value, typePointer(at, String(index)), depth + 1));
      }
      active.delete(item); return result;
    }
    const result: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index] as string;
      string(key, at); add(index ? 2 : 1, at);
      result[key] = copy(descriptors[key]!.value, typePointer(at, key), depth + 1);
    }
    active.delete(item); return result;
  };
  return copy(value, path, 0);
}
