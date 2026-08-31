import { tokenRef } from "@axiom/appearance-schema";
import { buttonRecipe } from "@axiom/recipes";
import { describe, expect, it } from "vitest";
import { resolveRecipe } from "./resolve.js";
import { validateRecipeDefinition } from "./validate.js";

describe("resolveRecipe", () => {
  it("uses the canonical merge order", () => {
    const result = resolveRecipe(buttonRecipe, {
      variants: { tone: "danger", size: "sm" },
      states: { root: ["hovered"] },
      adapterExtension: {
        root: { backgroundColor: tokenRef("color.surface.subtle") },
      },
      consumerOverride: {
        root: { backgroundColor: tokenRef("color.surface.default") },
      },
    });

    expect(result.slots.root.backgroundColor).toEqual(
      tokenRef("color.surface.default"),
    );
    expect(
      result.trace
        .filter((entry) => entry.property === "backgroundColor")
        .map((entry) => entry.stage),
    ).toEqual([
      "variant",
      "state",
      "compound",
      "adapter-extension",
      "consumer-override",
    ]);
  });

  it("is independent of caller state ordering", () => {
    const a = resolveRecipe(buttonRecipe, {
      states: { root: ["pressed", "hovered"] },
    });
    const b = resolveRecipe(buttonRecipe, {
      states: { root: ["hovered", "pressed"] },
    });

    expect(a).toEqual(b);
  });

  it("keeps interaction states out of the variant axis", () => {
    expect("hovered" in buttonRecipe.variants).toBe(false);
    expect(buttonRecipe.states.root.hovered).toBeDefined();
  });
});

describe("validateRecipeDefinition", () => {
  it("rejects renderer escape hatches even when input bypasses TypeScript", () => {
    const invalid = {
      ...buttonRecipe,
      base: { root: { className: "bg-blue-600" } },
    } as unknown as typeof buttonRecipe;

    expect(validateRecipeDefinition(invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Renderer escape hatch is forbidden" }),
      ]),
    );
  });
});
