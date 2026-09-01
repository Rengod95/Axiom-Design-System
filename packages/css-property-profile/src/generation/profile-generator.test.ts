import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import type {
  CSSAppearanceProfileInputManifest,
  EffectiveCSSPropertyRegistry,
  PropertyProfileGenerationInput,
  SparsePropertyPolicySource,
  TokenBindingCatalog,
} from "../contracts.js";
import { loadPinnedWebref } from "../webref/webref-importer.js";
import { diffPropertyProfiles } from "./profile-diff.js";
import { generatePropertyProfile } from "./profile-generator.js";
import { generateCSSPropertyTypes } from "./property-types.js";

const readJson = async <Value>(path: string): Promise<Value> =>
  JSON.parse(await readFile(new URL(`../../../../${path}`, import.meta.url), "utf8")) as Value;

const profileInput = async (): Promise<PropertyProfileGenerationInput> => {
  const [webref, profile, policy, bindings, domains, projectors] = await Promise.all([
    loadPinnedWebref(),
    readJson<CSSAppearanceProfileInputManifest>("spec/css/profile-input-manifest.json"),
    readJson<SparsePropertyPolicySource>("spec/css/sparse-property-policy.json"),
    readJson<TokenBindingCatalog>("spec/css/token-binding-catalog.json"),
    readJson<{ readonly domains: readonly { readonly id: string }[] }>(
      "spec/token/token-domain-registry.json",
    ),
    readJson<{ readonly projectors: readonly { readonly id: string }[] }>(
      "spec/token/composite-token-projector-registry.json",
    ),
  ]);
  return {
    upstreamProperties: webref.properties,
    profile,
    policy,
    bindings,
    tokenDomains: domains.domains.map((entry) => entry.id),
    projectors: projectors.projectors.map((entry) => entry.id),
  };
};

describe("effective CSS property profile generation", () => {
  it("resolves the full pinned registry and required binding families", async () => {
    const result = generatePropertyProfile(await profileInput());
    const property = (name: string) =>
      result.registry.properties.find((entry) => entry.name === name);
    const marginFamily = [
      "margin",
      "margin-block",
      "margin-block-end",
      "margin-block-start",
      "margin-bottom",
      "margin-inline",
      "margin-inline-end",
      "margin-inline-start",
      "margin-left",
      "margin-right",
      "margin-top",
    ];
    const paddingFamily = marginFamily.map((name) => name.replace("margin", "padding"));

    expect(result.registry.properties).toHaveLength(818);
    expect(result.registry.authoringNames["gridTemplateColumns"]).toBe(
      "grid-template-columns",
    );
    expect(result.registry.aliases["-webkit-transform"]).toBe("transform");
    expect(result.registry.customProperties).toContain("--axiom-project-example");
    expect(property("grid-template-columns")?.policy).toMatchObject({
      authoring: "allowed",
      rawCSS: "allowed",
      tokenBindings: { directDomains: [], templateDomains: ["size"] },
    });
    for (const name of marginFamily) {
      expect(property(name)?.policy.tokenBindings).toMatchObject({
        directDomains: ["space"],
        templateDomains: ["space"],
        allowsTokenNegation: true,
      });
    }
    for (const name of paddingFamily) {
      expect(property(name)?.policy.tokenBindings).toMatchObject({
        directDomains: ["space"],
        templateDomains: ["space"],
        allowsTokenNegation: false,
      });
    }
    expect(property("box-shadow")?.policy.tokenBindings).toEqual({
      directDomains: ["shadow"],
      templateDomains: ["blur", "color", "space"],
      projectors: ["css.shadow.v1"],
      allowsTokenNegation: false,
    });
    expect(result.coverage.properties["box-shadow"]).toEqual(
      property("box-shadow")?.policy.tokenBindings,
    );
  });

  it("is deterministic for reordered upstream input", async () => {
    const input = await profileInput();
    expect(
      generatePropertyProfile({
        ...input,
        upstreamProperties: [...input.upstreamProperties].reverse(),
      }),
    ).toEqual(generatePropertyProfile(input));
  });

  it("fails unknown projectors and conflicting sparse policy groups", async () => {
    const input = await profileInput();
    const firstBinding = input.bindings.bindings[0];
    if (firstBinding === undefined) throw new Error("binding fixture is required");
    expect(() =>
      generatePropertyProfile({
        ...input,
        bindings: {
          ...input.bindings,
          bindings: [
            { ...firstBinding, projectors: ["css.missing-projector.v1"] },
            ...input.bindings.bindings.slice(1),
          ],
        },
      }),
    ).toThrow(/AXP1105/);
    expect(() =>
      generatePropertyProfile({
        ...input,
        policy: {
          ...input.policy,
          groups: [
            ...input.policy.groups,
            { id: "paint-conflict", properties: ["background-color"], rawCSS: "allowed" },
          ],
        },
      }),
    ).toThrow(/AXP2003/);
  });

  it("emits pinned authoring types and a deterministic snapshot diff", async () => {
    const result = generatePropertyProfile(await profileInput());
    const generated = generateCSSPropertyTypes(result.registry);
    expect(generated).toContain("AUTO-GENERATED");
    expect(generated).toContain('  | "gridTemplateColumns"');
    expect(generated).toContain('  | "grid-template-columns"');

    const withoutGrid = {
      ...result.registry,
      properties: result.registry.properties.filter(
        (property) => property.name !== "grid-template-columns",
      ),
    } satisfies EffectiveCSSPropertyRegistry;
    expect(diffPropertyProfiles(result.registry, withoutGrid)).toEqual({
      added: [],
      removed: ["grid-template-columns"],
      changed: [],
    });
  });
});
