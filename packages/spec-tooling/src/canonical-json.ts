import { createHash } from "node:crypto";

import {
  CANONICAL_DIGEST_ALGORITHM,
  CANONICAL_DIGEST_PREFIX,
  JSON_INDENT_SPACES,
} from "./constants.js";
import type { JsonValue } from "./types.js";

const describe = (value: unknown): string =>
  value === null ? "null" : Array.isArray(value) ? "array" : typeof value;

const canonicalize = (
  value: unknown,
  pointer: string,
  ancestors: WeakSet<object>,
): JsonValue => {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${pointer}: JSON numbers must be finite.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (typeof value !== "object") {
    throw new TypeError(`${pointer}: ${describe(value)} is not JSON-serializable.`);
  }

  if (ancestors.has(value)) {
    throw new TypeError(`${pointer}: cyclic values are not JSON-serializable.`);
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        canonicalize(item, `${pointer}/${index}`, ancestors),
      );
    }

    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${pointer}: only plain objects may be serialized.`);
    }

    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort((left, right) =>
      left < right ? -1 : left > right ? 1 : 0,
    )) {
      const child = (value as Record<string, unknown>)[key];
      result[key] = canonicalize(child, `${pointer}/${escapePointer(key)}`, ancestors);
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
};

const escapePointer = (segment: string): string =>
  segment.replaceAll("~", "~0").replaceAll("/", "~1");

export const canonicalJson = (value: unknown): string =>
  `${JSON.stringify(
    canonicalize(value, "#", new WeakSet<object>()),
    null,
    JSON_INDENT_SPACES,
  )}\n`;

export const canonicalJsonDigest = (value: unknown): string =>
  `${CANONICAL_DIGEST_PREFIX}${createHash(CANONICAL_DIGEST_ALGORITHM)
    .update(canonicalJson(value))
    .digest("hex")}`;
