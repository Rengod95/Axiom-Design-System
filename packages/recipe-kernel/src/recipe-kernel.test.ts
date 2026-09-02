import { describe, expect, it } from "vitest";

import {
  RecipeKernelError,
  createRecipeKernel,
  validateRecipeDefinition,
} from "./index.js";
import { matchesRecipeCompound } from "./definition.js";

const kernel = createRecipeKernel();

const buttonDefinition = {
  id: "button",
  slots: ["root", "label"],
  base: {
    root: { display: "inline-flex" },
    label: { whiteSpace: "nowrap" },
  },
  variants: {
    tone: {
      neutral: { root: { color: "CanvasText" } },
      brand: { root: { color: "white" } },
    },
    size: {
      sm: { root: { padding: "0.25rem" } },
      md: { root: { padding: "0.5rem" } },
    },
  },
  defaultVariants: { tone: "neutral" },
  states: [
    {
      slot: "root",
      state: "pressed",
      cases: [{ equals: true, apply: { transform: "translateY(1px)" } }],
    },
  ],
  compoundVariants: [
    {
      when: {
        variants: { tone: ["brand", "neutral"], size: "md" },
        states: { root: { pressed: true } },
      },
      apply: { label: { fontWeight: 700 } },
    },
  ],
  conditions: [
    {
      when: { all: ["viewport.width.md"] },
      apply: { root: { maxWidth: "40rem" } },
    },
  ],
  source: "recipes/button.ts",
} as const;

describe("Recipe Kernel", () => {
  it("preserves literal definitions and source order in a JSON-safe structural snapshot", () => {
    const recipe = kernel.define(buttonDefinition);

    expect(recipe.definition.id).toBe("button");
    expect(recipe.snapshot).toEqual({
      id: "button",
      slots: ["root", "label"],
      base: [
        { slot: "root", style: { display: "inline-flex" } },
        { slot: "label", style: { whiteSpace: "nowrap" } },
      ],
      variantAxes: [
        {
          name: "tone",
          defaultValue: "neutral",
          values: [
            { value: "neutral", apply: [{ slot: "root", style: { color: "CanvasText" } }] },
            { value: "brand", apply: [{ slot: "root", style: { color: "white" } }] },
          ],
        },
        {
          name: "size",
          values: [
            { value: "sm", apply: [{ slot: "root", style: { padding: "0.25rem" } }] },
            { value: "md", apply: [{ slot: "root", style: { padding: "0.5rem" } }] },
          ],
        },
      ],
      stateRules: buttonDefinition.states,
      compoundVariants: buttonDefinition.compoundVariants,
      conditions: buttonDefinition.conditions,
      source: "recipes/button.ts",
    });
    expect(JSON.parse(JSON.stringify(recipe.snapshot))).toEqual(recipe.snapshot);
  });

  it("matches scalar AND and flat per-field OR compound predicates", () => {
    const compound = buttonDefinition.compoundVariants[0];
    if (compound === undefined) throw new Error("compound fixture is required");

    expect(matchesRecipeCompound(compound.when, {
      variants: { tone: "brand", size: "md" },
      states: { root: { pressed: true } },
    })).toBe(true);
    expect(matchesRecipeCompound(compound.when, {
      variants: { tone: "brand", size: "sm" },
      states: { root: { pressed: true } },
    })).toBe(false);
  });

  it("specializes the structural port without adding CSS behavior", () => {
    const kernel = createRecipeKernel<{ readonly marker: "style" }>();
    const recipe = kernel.define({
      id: "structural",
      slots: ["root"],
      base: { root: { marker: "style" } },
    } as const);

    expect(recipe.snapshot.base).toEqual([{ slot: "root", style: { marker: "style" } }]);
  });

  it("reports structural and JSON-safe violations with typed diagnostics", () => {
    const invalid = {
      id: "button",
      slots: ["root", "root"],
      base: { label: { display: "block" } },
      variants: { tone: { neutral: { root: { display: "block" } } } },
      defaultVariants: { tone: "brand" },
      conditions: [{ when: { all: ["@media (width >= 40rem)"] }, apply: {} }],
    };
    const diagnostics = validateRecipeDefinition(invalid);

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "AXR1003",
      "AXR1004",
      "AXR1006",
      "AXR1010",
    ]));
    expect(() => kernel.define(invalid)).toThrow(RecipeKernelError);
  });
});
