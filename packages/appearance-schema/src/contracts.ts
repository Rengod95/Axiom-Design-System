import type { TokenPathByType, TokenType } from "@axiom/tokens";
import type {
  AppearancePropertyName,
  AppearancePropertyRegistry,
} from "./registry.js";

type PathForTokenType<TType extends TokenType> = TokenPathByType[TType];

export interface TokenReference<TType extends TokenType = TokenType> {
  readonly $type: "token";
  readonly path: PathForTokenType<TType>;
}

type AcceptedTokenType<TKey extends AppearancePropertyName> =
  AppearancePropertyRegistry[TKey]["tokenTypes"][number];

type AcceptedLiteral<TKey extends AppearancePropertyName> =
  AppearancePropertyRegistry[TKey]["literals"][number];

export type AppearanceValue<TKey extends AppearancePropertyName> =
  | AcceptedLiteral<TKey>
  | TokenReference<AcceptedTokenType<TKey>>;

export type AppearanceStyle = Readonly<{
  [TKey in AppearancePropertyName]?: AppearanceValue<TKey>;
}>;

export type MutableAppearanceStyle = {
  -readonly [TKey in AppearancePropertyName]?: AppearanceValue<TKey>;
};

export const tokenRef = <TType extends TokenType>(
  path: PathForTokenType<TType>,
): TokenReference<TType> => ({ $type: "token", path });

export const isTokenReference = (value: unknown): value is TokenReference =>
  typeof value === "object" &&
  value !== null &&
  "$type" in value &&
  value.$type === "token" &&
  "path" in value &&
  typeof value.path === "string";
