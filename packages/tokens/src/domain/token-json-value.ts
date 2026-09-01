import type { TokenJsonObject, TokenJsonValue } from "../contracts.js";

export const isTokenJsonObject = (
  value: TokenJsonValue,
): value is TokenJsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
