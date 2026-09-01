import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DTCG_TYPES,
  TokenParseError,
  type TokenDomainDefinition,
  type TokenSourceDocument,
} from "@axiom/tokens";

import { createTerrazzoTokenParser } from "./terrazzo-token-parser.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const positiveRoot = new URL("../../../fixtures/token/dtcg/positive/", import.meta.url);
const negativeRoot = new URL("../../../fixtures/token/dtcg/negative/", import.meta.url);

const registry = JSON.parse(
  await readFile(new URL("../../../spec/token/token-domain-registry.json", import.meta.url), "utf8"),
) as { readonly domains: readonly TokenDomainDefinition[] };

const parser = createTerrazzoTokenParser({ domains: registry.domains });

const source = async (url: URL): Promise<TokenSourceDocument> => ({
  filename: url,
  content: await readFile(url, "utf8"),
});

describe("Terrazzo TokenParserPort adapter", () => {
  it("parses all 13 DTCG 2025.10 types into Axiom-owned records", async () => {
    const filenames = (await readdir(positiveRoot))
      .filter((filename) => filename !== "alias.tokens.json")
      .sort();
    const documents = await Promise.all(
      filenames.map((filename) => source(new URL(filename, positiveRoot))),
    );
    const result = await parser.parse(documents);

    expect(result.schemaVersion).toBe("0.1");
    expect(result.tokens).toHaveLength(13);
    expect([...new Set(result.tokens.map((token) => token.dtcgType))].sort()).toEqual(
      [...DTCG_TYPES].sort(),
    );
    expect(result.tokens.map((token) => token.id)).toEqual(
      [...result.tokens.map((token) => token.id)].sort(),
    );

    const roundTrip = JSON.parse(JSON.stringify(result)) as typeof result;
    expect(roundTrip).toEqual(result);
    expect(JSON.stringify(result)).not.toContain("originalValue");
    expect(JSON.stringify(result)).not.toContain('"node"');
    expect(JSON.stringify(result)).not.toContain('"group"');
  });

  it("preserves a whole-token alias without resolving it", async () => {
    const result = await parser.parse([
      await source(new URL("alias.tokens.json", positiveRoot)),
    ]);

    expect(result.tokens.find((token) => token.tier === "semantic")).toMatchObject({
      id: "color.semantic.accent",
      aliasTarget: "color.primitive.brand",
      value: "{color.primitive.brand}",
    });
  });

  it("is deterministic when source input order changes", async () => {
    const color = await source(new URL("color.tokens.json", positiveRoot));
    const dimension = await source(new URL("dimension.tokens.json", positiveRoot));

    await expect(parser.parse([color, dimension])).resolves.toEqual(
      await parser.parse([dimension, color]),
    );
  });

  it.each([
    ["unknown-domain.tokens.json", "AXT1103"],
    ["missing-tier.tokens.json", "AXT1100"],
    ["domain-type-mismatch.tokens.json", "AXT1201"],
    ["invalid-dimension.tokens.json", "AXT0002"],
    ["terrazzo-extension-em.tokens.json", "AXT1203"],
    ["unsupported-extension-type.tokens.json", "AXT1200"],
    ["invalid-opacity-range.tokens.json", "AXT1202"],
    ["invalid-layer-integer.tokens.json", "AXT1202"],
    ["negative-space.tokens.json", "AXT1202"],
  ])("rejects %s with %s", async (filename, code) => {
    try {
      await parser.parse([await source(new URL(filename, negativeRoot))]);
      throw new Error("negative fixture unexpectedly parsed");
    } catch (error) {
      expect(error).toBeInstanceOf(TokenParseError);
      expect((error as TokenParseError).diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code })]),
      );
    }
  });

  it("does not derive Token identity from filesystem paths", async () => {
    const original = await source(new URL("color.tokens.json", positiveRoot));
    const relocated: TokenSourceDocument = {
      ...original,
      filename: pathToFileURL(`${repositoryRoot}/arbitrary/location/source.tokens.json`),
    };

    const result = await parser.parse([relocated]);
    expect(result.tokens[0]?.id).toBe("color.primitive.sample");
  });
});
