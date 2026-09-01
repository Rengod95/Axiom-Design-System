import type { ResolvedTokenManifestV02, TokenJsonValue } from "./contracts.js";

const isJsonObject = (
  value: TokenJsonValue,
): value is Readonly<Record<string, TokenJsonValue>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeJson = (value: TokenJsonValue): TokenJsonValue => {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (!isJsonObject(value)) return Object.is(value, -0) ? 0 : value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((key) => [key, normalizeJson(value[key] as TokenJsonValue)]),
  );
};

export const serializeResolvedTokenManifestV02 = (
  manifest: ResolvedTokenManifestV02,
): string => `${JSON.stringify(normalizeJson(manifest as unknown as TokenJsonValue), null, 2)}\n`;
