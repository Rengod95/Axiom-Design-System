import { describe, expect, it } from "vitest";

import {
  createResolvedTokenManifestIndex,
  type ResolvedTokenManifest,
} from "../index.js";

const manifest = {
  schemaVersion: "0.2",
  profileVersion: "0.1.0",
  sourceDigest: "sha256:source",
  contexts: [
    { context: { theme: "light" }, tokens: [{ id: "color.semantic.text.default", domain: "color", tier: "semantic", dtcgType: "color", resolvedValue: "red", source: { file: "tokens.json", pointer: "/light" }, dependencies: [] }] },
    { context: { theme: "dark" }, tokens: [{ id: "color.semantic.text.default", domain: "color", tier: "semantic", dtcgType: "color", resolvedValue: "blue", source: { file: "tokens.json", pointer: "/dark" }, dependencies: [] }] },
  ],
} as const satisfies ResolvedTokenManifest;

describe("resolved Token manifest index", () => {
  it("indexes one stable Token identity across every context", () => {
    const index = createResolvedTokenManifestIndex(manifest);
    expect(index.find("color.semantic.text.default")?.entries).toHaveLength(2);
  });

  it("reports duplicate context identities and Token entries", () => {
    const invalid = {
      ...manifest,
      contexts: [
        manifest.contexts[0],
        { ...manifest.contexts[0], tokens: [...manifest.contexts[0].tokens, manifest.contexts[0].tokens[0]] },
      ],
    } as const satisfies ResolvedTokenManifest;

    expect(createResolvedTokenManifestIndex(invalid).diagnostics.map((item) => item.code))
      .toEqual(expect.arrayContaining(["AXT1500", "AXT1301"]));
  });
});
