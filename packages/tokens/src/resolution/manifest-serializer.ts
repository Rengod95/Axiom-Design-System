import type { ResolvedTokenManifest, TokenJsonValue } from "../contracts.js";
import { JSON_INDENT_SPACES, STABLE_SORT_LOCALE } from "../constants.js";

const isJsonObject = (
  value: TokenJsonValue,
): value is Readonly<Record<string, TokenJsonValue>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeJson = (value: TokenJsonValue): TokenJsonValue => {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (!isJsonObject(value)) return Object.is(value, -0) ? 0 : value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right, STABLE_SORT_LOCALE))
      .map((key) => [key, normalizeJson(value[key] as TokenJsonValue)]),
  );
};

export const serializeResolvedTokenManifest = (
  manifest: ResolvedTokenManifest,
): string =>
  `${JSON.stringify(
    normalizeJson(manifest as unknown as TokenJsonValue),
    null,
    JSON_INDENT_SPACES,
  )}\n`;
