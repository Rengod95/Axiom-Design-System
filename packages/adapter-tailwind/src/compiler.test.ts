import { tokenRef } from "@axiom/appearance-schema";
import { resolveRecipe } from "@axiom/recipe-engine";
import { buttonRecipe } from "@axiom/recipes";
import { describe, expect, it } from "vitest";
import { atomicClassManifest } from "./generated/atomic-manifest.js";
import {
  collectAppearanceArtifacts,
  compileAppearance,
  compileRecipeResolution,
} from "./compiler.js";

describe("Tailwind adapter compiler", () => {
  it("deduplicates identical atomic values", () => {
    const artifacts = collectAppearanceArtifacts([
      { foregroundColor: tokenRef("color.text.default") },
      { foregroundColor: tokenRef("color.text.default") },
    ]);

    expect(artifacts).toHaveLength(1);
  });

  it("projects a resolved recipe to pre-generated classes", () => {
    const resolution = resolveRecipe(buttonRecipe, {
      variants: { tone: "accent", size: "md" },
      states: { root: ["hovered", "focusVisible"] },
    });
    const classes = compileRecipeResolution(resolution, atomicClassManifest);

    expect(classes.root).toMatch(/ax_/);
    expect(classes.root.split(" ").length).toBe(
      Object.keys(resolution.slots.root).length,
    );
  });

  it("fails closed for values absent from generated artifacts", () => {
    expect(() =>
      compileAppearance(
        { backgroundColor: tokenRef("color.surface.subtle") },
        {},
      ),
    ).toThrow("not emitted");
  });
});
