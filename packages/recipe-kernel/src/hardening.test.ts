import { describe, expect, it } from "vitest";

import {
  createRecipeKernel,
  validateRecipeDefinition,
} from "./index.js";

const kernel = createRecipeKernel<{ readonly marker: string }>();
const defaultKernel = createRecipeKernel();
type OrderedStyle = readonly { readonly property: string; readonly value: string }[];
const orderedKernel = createRecipeKernel<OrderedStyle>();

const definition = (base: unknown) => ({
  id: "button",
  slots: ["root"],
  base: { root: base },
  source: "recipes/root.ts",
});

describe("Recipe Kernel safety boundary", () => {
  it("rejects non-finite values, sparse arrays, symbols, and hidden serialization hooks", () => {
    const sparse = ["safe", , "value"];
    const withSymbol = { marker: "safe", [Symbol("hidden")]: "value" };
    const withToJson = { marker: "original" };
    Object.defineProperty(withToJson, "toJSON", { value: () => ({ marker: "changed" }) });
    const hidden = { marker: "safe" };
    Object.defineProperty(hidden, "hidden", { value: "value" });

    for (const style of [
      { marker: Number.NaN },
      { marker: sparse },
      withSymbol,
      withToJson,
      hidden,
    ]) {
      expect(validateRecipeDefinition(definition(style)).map((diagnostic) => diagnostic.code))
        .toContain("AXR1011");
    }

    const cyclic: { marker: string; self?: unknown } = { marker: "safe" };
    cyclic.self = cyclic;
    expect(validateRecipeDefinition(definition(cyclic)).map((diagnostic) => diagnostic.code)).toContain("AXR1011");
    expect(validateRecipeDefinition(definition({ marker: () => "unsafe" })).map((diagnostic) => diagnostic.code)).toContain("AXR1011");
    expect(validateRecipeDefinition(definition(Object.create({ marker: "inherited" }))).map((diagnostic) => diagnostic.code)).toContain("AXR1011");
  });

  it("never executes getters or serialization hooks while rejecting unsafe input", () => {
    let getterReads = 0;
    const style = {};
    Object.defineProperty(style, "marker", {
      enumerable: true,
      get: () => {
        getterReads += 1;
        return "unsafe";
      },
    });

    expect(() => kernel.define(definition(style))).toThrow("Axiom Recipe Kernel validation failed.");
    expect(getterReads).toBe(0);
  });

  it("rejects Array subclasses before overridden hooks can run", () => {
    let hookCalls = 0;
    class HostileArray extends Array<string> {}
    const values = new HostileArray("safe");
    Object.defineProperty(values, "map", { value: () => { hookCalls += 1; return []; } });
    Object.defineProperty(values, Symbol.iterator, { value: () => { hookCalls += 1; return [][Symbol.iterator](); } });

    expect(validateRecipeDefinition(definition({ marker: values }))).toContainEqual(expect.objectContaining({
      code: "AXR1011",
      location: { file: "<recipe>", pointer: "/base/root/marker" },
    }));
    expect(() => kernel.define(definition({ marker: values }))).toThrow("Axiom Recipe Kernel validation failed.");
    expect(hookCalls).toBe(0);
  });

  it("returns detached plain structural data without callbacks", () => {
    const input = {
      id: "button",
      slots: ["root"],
      base: { root: { marker: "original" } },
    };
    const recipe = kernel.define(input);
    input.base.root.marker = "changed";

    expect(Object.values(recipe).some((value) => typeof value === "function")).toBe(false);
    expect(JSON.parse(JSON.stringify(recipe))).toEqual(recipe);
    expect(recipe.definition.base?.root?.marker).toBe("original");
  });

  it("copies accepted arrays as frozen plain Arrays without using their iterators", () => {
    const values = ["safe"];
    const recipe = defaultKernel.define({
      id: "array-copy",
      slots: ["root"],
      base: { root: { values } },
    });
    const copied = recipe.definition.base?.root?.values;

    expect(copied).toEqual(["safe"]);
    expect(copied).not.toBe(values);
    expect(Object.getPrototypeOf(copied!)).toBe(Array.prototype);
    expect(Object.isFrozen(copied!)).toBe(true);
  });

  it("captures an ordered JSON-safe array style without inspecting its entries", () => {
    const style = [{ property: "color", value: "CanvasText" }] as const;
    const recipe = orderedKernel.define({
      id: "ordered-style",
      slots: ["root"],
      base: { root: style },
    } as const);

    expect(recipe.snapshot.base).toEqual([{ slot: "root", style }]);
    expect(recipe.snapshot.base[0]?.style).not.toBe(style);
    expect(Object.getPrototypeOf(recipe.snapshot.base[0]?.style)).toBe(Array.prototype);
    expect(Object.isFrozen(recipe.snapshot.base[0]?.style)).toBe(true);
  });

  it("turns every malformed nested rule shape into exact diagnostics without throwing", () => {
    const malformed = {
      id: "button",
      slots: ["root"],
      states: [null],
      compoundVariants: [
        null,
        { when: {}, apply: {} },
        { when: { variants: null }, apply: {} },
        { when: { states: { root: { pressed: [true] } } }, apply: {} },
      ],
      conditions: [{
        when: { all: ["screen and (width > 1px)", { any: [] }], extra: true },
        apply: {},
        extra: true,
      }],
    };

    expect(() => validateRecipeDefinition(malformed)).not.toThrow();
    expect(validateRecipeDefinition(malformed).map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["AXR1008", "AXR1007", "AXR1010"]),
    );
  });

  it("rejects raw class-string styles and shared-schema identifier/source violations", () => {
    expect(validateRecipeDefinition({ id: "foo.Bar", slots: ["root"] }).map((diagnostic) => diagnostic.code))
      .toContain("AXR1002");
    expect(validateRecipeDefinition({ id: "button", slots: ["root"], base: { root: "px-2" } }).map((diagnostic) => diagnostic.code))
      .toContain("AXR1001");
    expect(validateRecipeDefinition({ id: "button", slots: ["root"], source: "" })).toContainEqual({
      code: "AXR1012",
      severity: "error",
      phase: "recipe",
      message: "Recipe source must be a non-empty string.",
      location: { file: "<recipe>", pointer: "/source" },
    });
  });

  it("rejects unsafe ordered-array styles before accepting the style fragment", () => {
    const sparse = [{ property: "color", value: "CanvasText" }, ,];
    expect(validateRecipeDefinition({ id: "button", slots: ["root"], base: { root: sparse } })
      .map((diagnostic) => diagnostic.code)).toContain("AXR1011");
  });

  it("uses the nearest valid rule source and escaped JSON Pointer segments", () => {
    const diagnostics = validateRecipeDefinition({
      id: "button",
      slots: ["root"],
      base: { "root/unsafe~slot": { marker: "invalid" } },
      compoundVariants: [{
        source: "recipes/compound.ts",
        when: { variants: { "tone/value": "brand" } },
        apply: { root: { marker: "valid" } },
      }],
      source: "recipes/root.ts",
    });

    expect(diagnostics).toContainEqual({
      code: "AXR1004",
      severity: "error",
      phase: "recipe",
      message: "Recipe references undeclared Slot 'root/unsafe~slot'.",
      location: { file: "recipes/root.ts", pointer: "/base/root~1unsafe~0slot" },
      target: "root/unsafe~slot",
    });
    expect(diagnostics).toContainEqual(expect.objectContaining({
      code: "AXR1007",
      location: { file: "recipes/compound.ts", pointer: "/compoundVariants/0/when/variants/tone~1value" },
    }));
  });
});
