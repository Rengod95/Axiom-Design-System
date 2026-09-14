import type { JsonObject, JsonValue } from "./contracts.ts";
import type { FoundationTokenValue } from "./foundation-contracts.ts";
import { record, own, pointer } from "./foundation-internal.ts";

/** References are executable only inside the explicitly tagged value, never metadata. */
export function foundationValueReferences(value: FoundationTokenValue): { ref: { id: string; expectedKind: "token"; path?: string }; path: string }[] {
  const found: ReturnType<typeof foundationValueReferences> = [];
  const visit = (item: JsonValue, path: string): void => {
    if (record(item) && own(item, "ref")) { if (record(item.ref)) found.push({ ref: item.ref as { id: string; expectedKind: "token"; path?: string }, path: `${path}/ref` }); return; }
    if (Array.isArray(item)) item.forEach((child, index) => visit(child, `${path}/${index}`));
    else if (record(item)) for (const [key, child] of Object.entries(item)) visit(child, pointer(path, key));
  };
  if ("ref" in value) found.push({ ref: value.ref, path: "/ref" });
  else if ("composite" in value) visit(value.composite, "/composite");
  return found;
}

export function decodeFoundationPointer(path: string): string[] {
  if (path === "") return [];
  if (!path.startsWith("/") || /~(?![01])/.test(path)) throw new Error("Use an RFC 6901 pointer beginning with / and escaped ~0 or ~1.");
  return path.slice(1).split("/").map(key => key.replaceAll("~1", "/").replaceAll("~0", "~"));
}
export function foundationPointerValue(value: JsonValue, path: string): JsonValue {
  let current = value;
  for (const key of decodeFoundationPointer(path)) {
    if (Array.isArray(current) && !/^(0|[1-9]\d*)$/.test(key) || !record(current) && !Array.isArray(current) || !own(current as object, key)) throw new Error(`Referenced property ${path} does not exist.`);
    current = (current as JsonObject)[key]!;
  }
  return current;
}

export function mapFoundationExpression(value: JsonValue, resolve: (ref: { id: string; expectedKind: "token"; path?: string }) => JsonValue): JsonValue {
  if (record(value) && own(value, "ref")) return resolve(value.ref as { id: string; expectedKind: "token"; path?: string });
  if (Array.isArray(value)) return value.map(item => mapFoundationExpression(item, resolve));
  if (record(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapFoundationExpression(item, resolve)]));
  return value;
}
