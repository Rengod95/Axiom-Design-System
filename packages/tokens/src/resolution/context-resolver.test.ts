import { describe, expect, it } from "vitest";

import {
  TokenResolutionError,
  type ParsedDtcgDocument,
  type ParsedDtcgToken,
  type ResolverModifierRegistry,
  type TokenContextOverrideDocument,
  type TokenDomainDefinition,
  type TokenJsonValue,
  type TokenResolutionInput,
  type TokenTier,
} from "../contracts.js";
import { resolveTokenContexts } from "./context-resolver.js";
import { serializeResolvedTokenManifest } from "./manifest-serializer.js";

const modifiers: ResolverModifierRegistry = {
  schemaVersion: "0.1",
  modifiers: [{ id: "theme", values: ["light", "dark"] }],
};

const domains: readonly TokenDomainDefinition[] = [
  { id: "border", root: "border", allowedDTCGTypes: ["border"] },
  { id: "borderWidth", root: "borderWidth", allowedDTCGTypes: ["dimension"] },
  { id: "color", root: "color", allowedDTCGTypes: ["color"] },
  { id: "mixed", root: "mixed", allowedDTCGTypes: ["color", "number"] },
  {
    id: "opacity",
    root: "opacity",
    allowedDTCGTypes: ["number"],
    constraints: [{ kind: "numberRange", minimum: 0, maximum: 1 }],
  },
  { id: "size", root: "size", allowedDTCGTypes: ["dimension"] },
  { id: "space", root: "space", allowedDTCGTypes: ["dimension"] },
];

const white = {
  colorSpace: "srgb",
  components: [1, 1, 1],
  alpha: 1,
} as const;

const black = {
  colorSpace: "srgb",
  components: [0, 0, 0],
  alpha: 1,
} as const;

const token = (
  id: string,
  tier: TokenTier,
  value: TokenJsonValue,
  options: {
    readonly domain?: string;
    readonly dtcgType?: ParsedDtcgToken["dtcgType"];
    readonly description?: string;
    readonly file?: string;
  } = {},
): ParsedDtcgToken => {
  const domain = options.domain ?? id.split(".")[0] ?? "color";
  const target = typeof value === "string" ? /^\{([^{}]+)\}$/.exec(value)?.[1] : undefined;
  return {
    id,
    domain,
    tier,
    dtcgType: options.dtcgType ?? "color",
    value,
    source: {
      file: options.file ?? "file:///tokens/base.tokens.json",
      pointer: `/${id.replaceAll(".", "/")}`,
    },
    ...(target === undefined ? {} : { aliasTarget: target }),
    ...(options.description === undefined ? {} : { description: options.description }),
  };
};

const baseTokens = (): readonly ParsedDtcgToken[] => [
  token("color.component.button.root.background.default", "component", "{color.semantic.surface.default}"),
  token("color.primitive.common.white", "primitive", white),
  token("color.primitive.neutral.900", "primitive", black),
  token("color.semantic.surface.default", "semantic", "{color.primitive.common.white}"),
  token("opacity.primitive.disabled", "primitive", 0.4, {
    domain: "opacity",
    dtcgType: "number",
  }),
  token("opacity.semantic.disabled", "semantic", "{opacity.primitive.disabled}", {
    domain: "opacity",
    dtcgType: "number",
  }),
];

const context = (
  theme: "dark" | "light",
  tokens: readonly ParsedDtcgToken[] = [],
): TokenContextOverrideDocument => ({
  schemaVersion: "0.1",
  context: { theme },
  tokens,
});

const input = (
  base: readonly ParsedDtcgToken[] = baseTokens(),
  contexts: readonly TokenContextOverrideDocument[] = [context("dark"), context("light")],
): TokenResolutionInput => ({
  profileVersion: "0.1.0",
  sourceDigest: `sha256:${"a".repeat(64)}`,
  base: { schemaVersion: "0.1", tokens: base },
  contexts,
});

const resolve = (value: TokenResolutionInput) =>
  resolveTokenContexts(value, { domains, modifierRegistry: modifiers });

const diagnosticCodes = (action: () => unknown): readonly string[] => {
  try {
    action();
    throw new Error("negative fixture unexpectedly resolved");
  } catch (error) {
    expect(error).toBeInstanceOf(TokenResolutionError);
    return (error as TokenResolutionError).diagnostics.map((entry) => entry.code);
  }
};

describe("Token tier graph and context resolver", () => {
  it("resolves light/dark contexts deterministically through Semantic and Component aliases", () => {
    const darkOverride = token(
      "color.semantic.surface.default",
      "semantic",
      "{color.primitive.neutral.900}",
      { file: "file:///tokens/theme-dark.tokens.json" },
    );
    const result = resolve(input(baseTokens(), [context("dark", [darkOverride]), context("light")]));

    expect(result.manifest.contexts.map((entry) => entry.context)).toEqual([
      { theme: "light" },
      { theme: "dark" },
    ]);
    const light = result.manifest.contexts[0];
    const dark = result.manifest.contexts[1];
    expect(light?.tokens.map((entry) => entry.id)).toEqual(
      [...(light?.tokens.map((entry) => entry.id) ?? [])].sort(),
    );
    expect(
      light?.tokens.find(
        (entry) => entry.id === "color.component.button.root.background.default",
      )?.resolvedValue,
    ).toEqual(white);
    expect(
      dark?.tokens.find(
        (entry) => entry.id === "color.component.button.root.background.default",
      )?.resolvedValue,
    ).toEqual(black);
    expect(
      dark?.tokens.find((entry) => entry.id === "color.semantic.surface.default"),
    ).toMatchObject({
      dependencies: ["color.primitive.neutral.900"],
      source: { file: "file:///tokens/theme-dark.tokens.json" },
    });
    expect(JSON.parse(JSON.stringify(result.manifest))).toEqual(result.manifest);

    const reordered = resolve(
      input([...baseTokens()].reverse(), [context("light"), context("dark", [darkOverride])]),
    );
    expect(reordered).toEqual(result);
    expect(serializeResolvedTokenManifest(reordered.manifest)).toBe(
      serializeResolvedTokenManifest(result.manifest),
    );
    expect(serializeResolvedTokenManifest(result.manifest).endsWith("\n")).toBe(true);
  });

  it("emits review information for a described Component context exception", () => {
    const override = token(
      "color.component.button.root.background.default",
      "component",
      "{color.semantic.surface.default}",
      {
        description: "Dark theme preserves the Button contrast contract.",
        file: "file:///tokens/theme-dark.tokens.json",
      },
    );
    const result = resolve(input(baseTokens(), [context("light"), context("dark", [override])]));
    expect(result.diagnostics).toMatchObject([
      { code: "AXT1506", severity: "info", tokenId: override.id },
    ]);
  });

  it("resolves typed references nested inside a DTCG composite", () => {
    const compositeBase = [
      token("border.semantic.control", "semantic", {
        color: "{color.primitive.neutral.900}",
        width: "{borderWidth.primitive.thin}",
        style: "solid",
      }, { domain: "border", dtcgType: "border" }),
      token("borderWidth.primitive.thin", "primitive", { value: 1, unit: "px" }, {
        domain: "borderWidth",
        dtcgType: "dimension",
      }),
      token("color.primitive.neutral.900", "primitive", black),
    ];
    const result = resolve(input(compositeBase));
    expect(result.manifest.contexts[0]?.tokens[0]).toMatchObject({
      id: "border.semantic.control",
      dependencies: ["borderWidth.primitive.thin", "color.primitive.neutral.900"],
      resolvedValue: {
        color: black,
        width: { value: 1, unit: "px" },
        style: "solid",
      },
    });
  });

  it.each([
    {
      name: "unknown alias target",
      code: "AXT1400",
      base: [token("color.semantic.missing", "semantic", "{color.primitive.missing}")],
    },
    {
      name: "Primitive to Semantic edge",
      code: "AXT1401",
      base: [
        token("color.primitive.invalid", "primitive", "{color.semantic.value}"),
        token("color.semantic.value", "semantic", white),
      ],
    },
    {
      name: "Component explicit base value",
      code: "AXT1405",
      base: [token("color.component.button.root.invalid", "component", white)],
    },
    {
      name: "whole-alias Domain mismatch",
      code: "AXT1402",
      base: [
        token("size.semantic.control", "semantic", "{space.primitive.scale.4}", {
          domain: "size",
          dtcgType: "dimension",
        }),
        token("space.primitive.scale.4", "primitive", { value: 16, unit: "px" }, {
          domain: "space",
          dtcgType: "dimension",
        }),
      ],
    },
    {
      name: "whole-alias DTCG type mismatch",
      code: "AXT1403",
      base: [
        token("mixed.primitive.paint", "primitive", white, {
          domain: "mixed",
          dtcgType: "color",
        }),
        token("mixed.semantic.amount", "semantic", "{mixed.primitive.paint}", {
          domain: "mixed",
          dtcgType: "number",
        }),
      ],
    },
    {
      name: "alias cycle",
      code: "AXT1404",
      base: [
        token("color.semantic.a", "semantic", "{color.semantic.b}"),
        token("color.semantic.b", "semantic", "{color.semantic.a}"),
      ],
    },
  ])("rejects $name", ({ base, code }) => {
    expect(diagnosticCodes(() => resolve(input(base)))).toContain(code);
  });

  it("requires every registered light/dark context", () => {
    expect(diagnosticCodes(() => resolve(input(baseTokens(), [context("light")])))).toContain(
      "AXT1501",
    );
  });

  it.each([
    {
      name: "new Token",
      code: "AXT1502",
      override: token("color.semantic.new", "semantic", white),
    },
    {
      name: "Primitive Token",
      code: "AXT1503",
      override: token("color.primitive.common.white", "primitive", black),
    },
    {
      name: "changed invariant",
      code: "AXT1504",
      override: {
        ...token("color.semantic.surface.default", "semantic", black),
        domain: "space",
      } as ParsedDtcgToken,
    },
    {
      name: "undocumented Component exception",
      code: "AXT1505",
      override: token(
        "color.component.button.root.background.default",
        "component",
        "{color.semantic.surface.default}",
      ),
    },
    {
      name: "resolved Domain range violation",
      code: "AXT1202",
      override: token("opacity.semantic.disabled", "semantic", 1.5, {
        domain: "opacity",
        dtcgType: "number",
      }),
    },
  ])("rejects context override with $name", ({ override, code }) => {
    expect(
      diagnosticCodes(() =>
        resolve(input(baseTokens(), [context("light"), context("dark", [override])])),
      ),
    ).toContain(code);
  });
});
