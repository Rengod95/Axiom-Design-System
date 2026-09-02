import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";

import type {
  ParsedDtcgDocument,
  ResolvedTokenManifest,
  TokenDomainDefinition,
} from "@axiom/tokens";
import { isTokenJsonObject } from "@axiom/tokens";

import { FOUNDATION_POLICY_DIAGNOSTIC_CODE } from "./constants.js";
import {
  validateFoundationTokenPolicy,
  type FoundationTokenPolicy,
} from "./foundation-policy.js";
import { createTerrazzoTokenParser } from "./terrazzo-token-parser.js";

const repositoryFile = (path: string): URL =>
  new URL(`../../../${path}`, import.meta.url);

const readJson = async <Value>(path: string): Promise<Value> =>
  JSON.parse(await readFile(repositoryFile(path), "utf8")) as Value;

let document: ParsedDtcgDocument;
let manifest: ResolvedTokenManifest;
let policy: FoundationTokenPolicy;

beforeAll(async () => {
  const [domains, source, resolvedManifest, foundationPolicy] = await Promise.all([
    readJson<{ readonly domains: readonly TokenDomainDefinition[] }>(
      "spec/token/token-domain-registry.json",
    ),
    readFile(repositoryFile("tokens/base.tokens.json"), "utf8"),
    readJson<ResolvedTokenManifest>("spec/token/foundation-resolved-token-manifest.json"),
    readJson<FoundationTokenPolicy>("spec/token/foundation-token-policy.json"),
  ]);
  document = await createTerrazzoTokenParser({ domains: domains.domains }).parse([
    {
      filename: new URL("file:///tokens/base.tokens.json"),
      content: source,
    },
  ]);
  manifest = resolvedManifest;
  policy = foundationPolicy;
});

describe("Token Foundation policy", () => {
  it("pins the semantic vocabulary registry", () => {
    expect(policy.semanticVocabularyRegistry).toBe("semantic-token-vocabulary");
  });

  it("accepts the normative production corpus in every theme context", () => {
    expect(validateFoundationTokenPolicy(document, manifest, policy)).toEqual([]);
    expect(document.tokens.filter((token) =>
      token.id.startsWith("color.semantic.action.") ||
      token.id === "color.semantic.surface.sunken" ||
      /^color\.primitive\.[a-z]+\.(?:0|950|1000)$/.test(token.id)
    )).toEqual([]);
  });

  it("rejects semantic primitive names and unregistered scale entries", () => {
    const token = document.tokens.find((entry) => entry.id === "space.primitive.scale.1");
    if (token === undefined) throw new Error("Space scale fixture is required.");
    const diagnostics = validateFoundationTokenPolicy(
      {
        ...document,
        tokens: [
          ...document.tokens,
          { ...token, id: "space.primitive.disabled" },
        ],
      },
      manifest,
      policy,
    );
    expect(diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.SEMANTIC_PRIMITIVE_NAME,
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SPACE_SCALE,
      ]),
    );
  });

  it("rejects missing palette shades, broken space rhythm, and typography gaps", () => {
    const tokens = document.tokens
      .filter((entry) => entry.id !== "color.primitive.brand.500")
      .filter((entry) => entry.id !== "typography.semantic.heading.h6.bold")
      .map((entry) =>
        entry.id === "space.primitive.scale.1"
          ? { ...entry, value: { value: 0.3, unit: "rem" } }
          : entry,
      );
    const diagnostics = validateFoundationTokenPolicy(
      { ...document, tokens },
      manifest,
      policy,
    );
    expect(diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.MISSING_REQUIRED_TOKEN,
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_SPACE_SCALE,
      ]),
    );
  });

  it("rejects non-canonical colors, missing common endpoints, and extra shades", () => {
    const brand = document.tokens.find((entry) => entry.id === "color.primitive.brand.500");
    const white = document.tokens.find((entry) => entry.id === "color.primitive.common.white");
    if (brand === undefined || white === undefined) {
      throw new Error("Canonical color fixtures are required.");
    }
    const diagnostics = validateFoundationTokenPolicy(
      {
        ...document,
        tokens: [
          ...document.tokens
            .filter((entry) => entry.id !== white.id)
            .map((entry) => entry.id === brand.id
              ? {
                  ...entry,
                  value: {
                    colorSpace: "srgb",
                    components: [0.1, 0.2, 0.3],
                    alpha: 1,
                  },
                }
              : entry),
          { ...brand, id: "color.primitive.brand.950" },
        ],
      },
      manifest,
      policy,
    );
    expect(diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.MISSING_REQUIRED_TOKEN,
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_SCALE,
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_PROFILE,
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_FALLBACK,
      ]),
    );
  });

  it("rejects an explicit non-canonical color in a theme override", () => {
    const semantic = document.tokens.find(
      (entry) => entry.id === "color.semantic.text.tertiary",
    );
    if (semantic === undefined) throw new Error("Semantic color fixture is required.");
    const diagnostics = validateFoundationTokenPolicy(
      document,
      manifest,
      policy,
      [{
        schemaVersion: document.schemaVersion,
        tokens: [{
          ...semantic,
          value: {
            colorSpace: "srgb",
            components: [0.1, 0.2, 0.3],
            alpha: 1,
          },
        }],
      }],
    );
    expect(diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_PROFILE,
        FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_FALLBACK,
      ]),
    );
  });

  it("rejects an invalid fallback nested inside a composite color value", () => {
    const shadow = document.tokens.find(
      (entry) => entry.id === "shadow.primitive.level.1",
    );
    if (shadow === undefined || !isTokenJsonObject(shadow.value)) {
      throw new Error("Shadow color fixture is required.");
    }
    const shadowValue = shadow.value;
    const color = shadowValue["color"];
    if (color === undefined || !isTokenJsonObject(color)) {
      throw new Error("Nested shadow color is required.");
    }
    const diagnostics = validateFoundationTokenPolicy(
      {
        ...document,
        tokens: document.tokens.map((entry) => entry.id === shadow.id
          ? {
              ...entry,
              value: {
                ...shadowValue,
                color: { ...color, hex: "#ffffff" },
              },
            }
          : entry),
      },
      manifest,
      policy,
    );
    expect(diagnostics.some(
      (entry) => entry.code === FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_COLOR_FALLBACK,
    )).toBe(true);
  });

  it("rejects a theme contrast regression", () => {
    const contexts = manifest.contexts.map((context, contextIndex) => ({
      ...context,
      tokens: context.tokens.map((token) =>
        contextIndex === 0 && token.id === "color.semantic.text.primary"
          ? {
              ...token,
              resolvedValue: context.tokens.find(
                (entry) => entry.id === "color.semantic.background.canvas",
              )?.resolvedValue ?? token.resolvedValue,
            }
          : token,
      ),
    }));
    const diagnostics = validateFoundationTokenPolicy(
      document,
      { ...manifest, contexts },
      policy,
    );
    expect(diagnostics.some(
      (entry) => entry.code === FOUNDATION_POLICY_DIAGNOSTIC_CODE.INVALID_CONTRAST,
    )).toBe(true);
  });
});
