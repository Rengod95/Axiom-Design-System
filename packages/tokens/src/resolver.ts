import type {
  DtcgGroup,
  DtcgToken,
  ResolvedToken,
  ResolvedTokenMap,
  TokenType,
  TokenValue,
} from "./contracts.js";

interface UnresolvedToken {
  readonly path: string;
  readonly type: TokenType;
  readonly value: TokenValue | `{${string}}`;
  readonly description?: string;
}

const isToken = (value: unknown): value is DtcgToken =>
  typeof value === "object" && value !== null && "$value" in value;

const isAlias = (value: unknown): value is `{${string}}` =>
  typeof value === "string" && /^\{[^{}]+\}$/.test(value);

const aliasPath = (alias: `{${string}}`): string => alias.slice(1, -1);

export const tokenPathToCssVariable = (path: string): `--axiom-${string}` =>
  `--axiom-${path.replaceAll(".", "-")}`;

const flatten = (
  group: DtcgGroup,
  inheritedType: TokenType | undefined,
  segments: readonly string[],
  output: Map<string, UnresolvedToken>,
): void => {
  const groupType = group.$type ?? inheritedType;

  for (const [key, child] of Object.entries(group)) {
    if (key.startsWith("$")) continue;
    if (typeof child !== "object" || child === null) {
      throw new TypeError(`Invalid DTCG node at ${[...segments, key].join(".")}`);
    }

    const pathSegments = [...segments, key];
    if (isToken(child)) {
      const type = child.$type ?? groupType;
      if (!type) throw new TypeError(`Token ${pathSegments.join(".")} has no $type`);

      const path = pathSegments.join(".");
      output.set(path, {
        path,
        type,
        value: child.$value,
        ...(child.$description === undefined
          ? {}
          : { description: child.$description }),
      });
      continue;
    }

    flatten(child, groupType, pathSegments, output);
  }
};

const valueMatchesType = (type: TokenType, value: unknown): boolean => {
  switch (type) {
    case "color":
      return typeof value === "string";
    case "dimension":
      return (
        typeof value === "object" &&
        value !== null &&
        "value" in value &&
        typeof value.value === "number" &&
        "unit" in value &&
        (value.unit === "px" || value.unit === "rem")
      );
    case "fontFamily":
      return (
        typeof value === "string" ||
        (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
      );
    case "fontWeight":
    case "number":
      return typeof value === "number";
  }
};

export const resolveTokens = (source: DtcgGroup): ResolvedTokenMap => {
  const unresolved = new Map<string, UnresolvedToken>();
  flatten(source, undefined, [], unresolved);

  const resolved = new Map<string, ResolvedToken>();
  const resolving = new Set<string>();

  const resolveOne = (path: string): ResolvedToken => {
    const cached = resolved.get(path);
    if (cached) return cached;

    const token = unresolved.get(path);
    if (!token) throw new ReferenceError(`Unknown token alias: ${path}`);
    if (resolving.has(path)) {
      throw new TypeError(`Circular token alias detected at ${path}`);
    }

    resolving.add(path);
    const referenced = isAlias(token.value)
      ? resolveOne(aliasPath(token.value))
      : undefined;
    const value = referenced?.value ?? token.value;

    if (referenced && referenced.type !== token.type) {
      throw new TypeError(
        `Token ${path} (${token.type}) aliases ${referenced.path} (${referenced.type})`,
      );
    }
    if (!valueMatchesType(token.type, value)) {
      throw new TypeError(`Token ${path} has an invalid ${token.type} value`);
    }

    const result: ResolvedToken = {
      path,
      type: token.type,
      value: value as TokenValue,
      cssVariable: tokenPathToCssVariable(path),
      ...(token.description === undefined ? {} : { description: token.description }),
    };
    resolving.delete(path);
    resolved.set(path, result);
    return result;
  };

  return Object.fromEntries(
    [...unresolved.keys()].sort().map((path) => [path, resolveOne(path)]),
  );
};

export const tokenValueToCss = (token: ResolvedToken): string => {
  switch (token.type) {
    case "dimension": {
      const dimension = token.value as { value: number; unit: string };
      return `${dimension.value}${dimension.unit}`;
    }
    case "fontFamily":
      return Array.isArray(token.value)
        ? token.value.map((value) => JSON.stringify(value)).join(", ")
        : String(token.value);
    default:
      return String(token.value);
  }
};
