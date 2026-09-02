import { createHash } from "node:crypto";

import {
  CANONICAL_DIGEST_ALGORITHM,
  CANONICAL_DIGEST_PREFIX,
  JSON_INDENT_SPACES,
} from "../constants.js";
import { compareStableStrings } from "./stable-string-order.js";

const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value !== "object" || value === null) {
    return typeof value === "number" && Object.is(value, -0) ? 0 : value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => compareStableStrings(left, right))
      .map(([key, child]) => [key, normalize(child)]),
  );
};

export const serializeCanonicalJson = (value: unknown): string =>
  `${JSON.stringify(normalize(value), null, JSON_INDENT_SPACES)}\n`;

export const digestCanonicalJson = (value: unknown): string =>
  `${CANONICAL_DIGEST_PREFIX}${createHash(CANONICAL_DIGEST_ALGORITHM)
    .update(serializeCanonicalJson(value))
    .digest("hex")}`;
