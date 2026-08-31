export const tokenTypes = [
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "number",
] as const;

export type TokenType = (typeof tokenTypes)[number];

export type DimensionValue = Readonly<{
  value: number;
  unit: "px" | "rem";
}>;

export type TokenValueByType = Readonly<{
  color: string;
  dimension: DimensionValue;
  fontFamily: string | readonly string[];
  fontWeight: number;
  number: number;
}>;

export type TokenValue<TType extends TokenType = TokenType> =
  TokenValueByType[TType];

export interface DtcgToken<TType extends TokenType = TokenType> {
  readonly $type?: TType;
  readonly $value: TokenValue<TType> | `{${string}}`;
  readonly $description?: string;
}

export interface DtcgGroup {
  readonly $type?: TokenType;
  readonly $description?: string;
  readonly [key: string]: DtcgGroup | DtcgToken | TokenType | string | undefined;
}

export interface ResolvedToken<TType extends TokenType = TokenType> {
  readonly path: string;
  readonly type: TType;
  readonly value: TokenValue<TType>;
  readonly cssVariable: `--axiom-${string}`;
  readonly description?: string;
}

export type ResolvedTokenMap = Readonly<Record<string, ResolvedToken>>;
