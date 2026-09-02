import { describe, expect, it } from "vitest";

import type { ParsedDtcgDocument } from "@axiom/tokens";

import { digestTokenSources, generateTokenPathTypes } from "./foundation-artifacts.js";

const document: ParsedDtcgDocument = {
  schemaVersion: "0.1",
  tokens: [
    {
      id: "space.semantic.layout.stack.gap.md",
      domain: "space",
      tier: "semantic",
      dtcgType: "dimension",
      value: { value: 16, unit: "px" },
      source: {
        file: "file:///tokens/base.tokens.json",
        pointer: "/space/semantic/layout/stack/gap/md",
      },
    },
    {
      id: "color.primitive.brand.600",
      domain: "color",
      tier: "primitive",
      dtcgType: "color",
      value: { colorSpace: "srgb", components: [0.1, 0.3, 0.8], alpha: 1 },
      source: { file: "file:///tokens/base.tokens.json", pointer: "/color/primitive/brand/600" },
    },
  ],
};

describe("Token Foundation artifact generation", () => {
  it("hashes source inputs independently of caller order", () => {
    const left = { filename: "file:///tokens/a.tokens.json", content: "{}\n" };
    const right = { filename: "file:///tokens/b.tokens.json", content: "{}\n" };

    expect(digestTokenSources([left, right])).toBe(digestTokenSources([right, left]));
    expect(digestTokenSources([left, right])).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("emits stable Domain, tier, and path unions with provenance", () => {
    const digest = `sha256:${"a".repeat(64)}`;
    const generated = generateTokenPathTypes(document, digest);

    expect(generated).toContain("AUTO-GENERATED");
    expect(generated).toContain(`Source digest: ${digest}`);
    expect(generated.indexOf('  | "color"')).toBeLessThan(
      generated.indexOf('  | "space"'),
    );
    expect(generated).toContain('readonly color:\n    | "color.primitive.brand.600";');
    expect(generateTokenPathTypes({ ...document, tokens: [...document.tokens].reverse() }, digest))
      .toBe(generated);
  });
});
