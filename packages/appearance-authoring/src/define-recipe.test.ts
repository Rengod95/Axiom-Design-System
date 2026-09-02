import { describe, expect, it } from "vitest";
import { RecipeKernelError } from "@axiom/recipe-kernel";

import {
  createCSSRecipeAuthoring,
  CSSRecipeAuthoringError,
  css,
  cssTemplate,
  negateToken,
  token,
} from "./index.js";

const propertyRegistry = {
  schemaVersion: "0.1",
  profile: {
    schemaVersion: "0.1",
    id: "axiom-css",
    webrefPackageVersion: "test",
    webrefInputPath: "test.json",
    webrefInputDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    generatorVersion: "test",
    policySourceDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  properties: [
    {
      name: "color",
      authoringName: "color",
      syntax: "<color>",
      sourceHref: "https://example.test/color",
      status: "standard",
      kind: "longhand",
      inherited: true,
      initialValue: "canvastext",
      longhands: [],
      resetLonghands: [],
      policy: {
        authoring: "allowed",
        valueKinds: ["css", "token", "css-template"],
        tokenBindings: {
          directDomains: [],
          templateDomains: [],
          projectors: [],
          allowsTokenNegation: false,
        },
        rawCSS: "allowed",
        shorthand: "not-applicable",
        portability: "portable-candidate",
        motion: "interpolable",
        security: { resources: "allowed" },
        provenance: [{ source: "test", rule: "test" }],
      },
    },
    {
      name: "background-color",
      authoringName: "backgroundColor",
      syntax: "<color>",
      sourceHref: "https://example.test/background-color",
      status: "standard",
      kind: "longhand",
      inherited: false,
      initialValue: "transparent",
      longhands: [],
      resetLonghands: [],
      policy: {
        authoring: "allowed",
        valueKinds: ["css"],
        tokenBindings: {
          directDomains: [],
          templateDomains: [],
          projectors: [],
          allowsTokenNegation: false,
        },
        rawCSS: "allowed",
        shorthand: "not-applicable",
        portability: "portable-candidate",
        motion: "interpolable",
        security: { resources: "allowed" },
        provenance: [{ source: "test", rule: "test" }],
      },
    },
  ],
  aliases: {},
  authoringNames: { color: "color", backgroundColor: "background-color" },
  customProperties: [],
} as const;

const canonicalStateRegistry = {
  schemaVersion: "0.1",
  states: [
    {
      id: "pressed",
      axis: "state",
      valueType: "boolean",
      applicableComponents: ["button"],
      usage: ["appearance", "behavior"],
    },
  ],
} as const;

const conditionRegistry = {
  schemaVersion: "0.1",
  containers: [{ id: "component", cssName: "axiom-component" }],
  conditions: [{
    id: "preference.reducedMotion",
    kind: "preference",
    feature: "prefers-reduced-motion",
    equals: "reduce",
  }],
} as const;

const enumStateRegistry = {
  ...canonicalStateRegistry,
  states: [
    ...canonicalStateRegistry.states,
    {
      id: "orientation",
      axis: "state",
      valueType: "enum",
      values: ["horizontal", "vertical"],
      applicableComponents: ["button"],
      usage: ["appearance"],
    },
  ],
} as const;

const negationPropertyRegistry = {
  ...propertyRegistry,
  properties: [
    ...propertyRegistry.properties,
    {
      name: "margin",
      authoringName: "margin",
      syntax: "<length-percentage>{1,4}",
      sourceHref: "https://example.test/margin",
      status: "standard",
      kind: "shorthand",
      inherited: false,
      initialValue: "0px",
      longhands: [],
      resetLonghands: [],
      policy: {
        authoring: "allowed",
        valueKinds: ["token"],
        tokenBindings: {
          directDomains: ["space"],
          templateDomains: [],
          projectors: [],
          allowsTokenNegation: true,
        },
        rawCSS: "allowed",
        shorthand: "allowed",
        portability: "portable-candidate",
        motion: "discrete",
        security: { resources: "allowed" },
        provenance: [{ source: "test", rule: "test" }],
      },
    },
    {
      name: "padding",
      authoringName: "padding",
      syntax: "<length-percentage>{1,4}",
      sourceHref: "https://example.test/padding",
      status: "standard",
      kind: "shorthand",
      inherited: false,
      initialValue: "0px",
      longhands: [],
      resetLonghands: [],
      policy: {
        authoring: "allowed",
        valueKinds: ["token"],
        tokenBindings: {
          directDomains: ["space"],
          templateDomains: [],
          projectors: [],
          allowsTokenNegation: false,
        },
        rawCSS: "allowed",
        shorthand: "allowed",
        portability: "portable-candidate",
        motion: "discrete",
        security: { resources: "allowed" },
        provenance: [{ source: "test", rule: "test" }],
      },
    },
  ],
  authoringNames: {
    ...propertyRegistry.authoringNames,
    margin: "margin",
    padding: "padding",
  },
} as const;

describe("CSS Recipe authoring", () => {
  it("preserves restricted Token negation authoring without making the N21 binding decision", () => {
    const authoring = createCSSRecipeAuthoring({
      propertyRegistry: negationPropertyRegistry,
      canonicalStateRegistry,
      conditionRegistry,
    });
    const recipe = authoring.defineRecipe({
      id: "button",
      slots: ["root"],
      base: {
        root: {
          margin: negateToken(token("space.semantic.layout.gutter.md")),
          padding: negateToken(token("space.semantic.layout.gutter.md")),
        },
      },
    } as const);

    expect(recipe.snapshot.base[0]?.style).toEqual({
      margin: {
        kind: "negated-token",
        token: { kind: "token", path: "space.semantic.layout.gutter.md" },
      },
      padding: {
        kind: "negated-token",
        token: { kind: "token", path: "space.semantic.layout.gutter.md" },
      },
    });
  });

  it("rejects a non-Axiom CSS profile before creating an authoring port", () => {
    const incompatibleRegistry = {
      ...propertyRegistry,
      profile: { ...propertyRegistry.profile, id: "other-css" },
    };

    expect(() => createCSSRecipeAuthoring({
      propertyRegistry: incompatibleRegistry as never,
      canonicalStateRegistry,
      conditionRegistry,
    })).toThrow(CSSRecipeAuthoringError);
  });

  it("rejects a CSS template that cannot satisfy the declaration schema without a Token segment", () => {
    expect(() => cssTemplate`calc(1px + 2px)`).toThrow(CSSRecipeAuthoringError);
  });

  it("captures CSS-aware declarations through the structural Kernel without emitting Appearance IR", () => {
    const authoring = createCSSRecipeAuthoring({
      propertyRegistry,
      canonicalStateRegistry,
      conditionRegistry,
    });

    const recipe = authoring.defineRecipe({
      id: "button",
      slots: ["root"],
      base: {
        root: {
          color: css("red"),
        },
      },
      states: [{
        slot: "root",
        state: "pressed",
        cases: [{ equals: true, apply: { color: token("color.semantic.brand") } }],
      }],
      conditions: [{
        when: { all: ["preference.reducedMotion"] },
        apply: {
          root: [{
            property: "color",
            value: cssTemplate`color-mix(in srgb, ${token("color.semantic.brand")} 50%, black)`,
          }],
        },
      }],
    } as const);

    expect(recipe.snapshot.base).toEqual([{ slot: "root", style: { color: { kind: "css", value: "red" } } }]);
    expect(JSON.stringify(recipe)).not.toContain("profileInputDigest");
    expect(JSON.stringify(recipe)).not.toContain("className");
    expect(Object.isFrozen(recipe)).toBe(true);
  });

  it("preserves explicit same-stage declaration order while leaving Token binding semantics for N21", () => {
    const authoring = createCSSRecipeAuthoring({
      propertyRegistry,
      canonicalStateRegistry,
      conditionRegistry,
    });
    const recipe = authoring.defineRecipe({
      id: "button",
      slots: ["root"],
      base: {
        root: [
          { property: "color", value: "red" },
          { property: "color", value: token("color.semantic.brand") },
        ],
      },
    } as const);

    expect(recipe.snapshot.base).toEqual([{
      slot: "root",
      style: [
        { property: "color", value: "red" },
        { property: "color", value: { kind: "token", path: "color.semantic.brand" } },
      ],
    }]);
  });

  it("rejects CSS profile, naming, State, and Condition violations with stable contextual diagnostics", () => {
    const authoring = createCSSRecipeAuthoring({
      propertyRegistry,
      canonicalStateRegistry,
      conditionRegistry,
    });
    const invalid = {
      id: "dialog",
      slots: ["root"],
      base: {
        root: {
          color: css("red !important"),
        },
      },
      states: [{
        slot: "root",
        state: "pressed",
        cases: [{ equals: true, apply: { color: css("red") } }],
      }],
      conditions: [{
        when: { all: ["viewport.width.unknown"] },
        apply: {
          root: [{ property: "backgroundColor", value: css("red") }],
        },
      }],
    } as const;

    expect(() => authoring.defineRecipe(invalid)).toThrow(CSSRecipeAuthoringError);
    try {
      authoring.defineRecipe(invalid);
    } catch (error) {
      expect(error).toBeInstanceOf(CSSRecipeAuthoringError);
      const diagnostics = (error as CSSRecipeAuthoringError).diagnostics;
      expect(diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
        "AXP1202",
        "AXA1001",
        "AXA1003",
        "AXA1005",
      ]));
      expect(diagnostics.find((item) => item.code === "AXP1202")).toMatchObject({
        recipeId: "dialog",
        slot: "root",
        stage: "base",
        property: "color",
        source: "<recipe>",
      });
    }
  });

  it("rejects closed declaration and canonical State errors with their published AXA diagnostics", () => {
    const authoring = createCSSRecipeAuthoring({
      propertyRegistry,
      canonicalStateRegistry: enumStateRegistry,
      conditionRegistry,
    });
    const invalid = {
      id: "button",
      slots: ["root"],
      base: {
        root: {
          backgroundColor: token("color.semantic.brand"),
          color: { kind: "token", path: "", extra: true },
        },
      },
      states: [
        {
          slot: "root",
          state: "unknownState",
          cases: [{ equals: true, apply: { color: css("red") } }],
        },
        {
          slot: "root",
          state: "pressed",
          cases: [{ equals: "yes", apply: { color: css("red") } }],
        },
        {
          slot: "root",
          state: "orientation",
          cases: [{ equals: "diagonal", apply: { color: css("red") } }],
        },
      ],
    } as const;

    expect(() => authoring.defineRecipe(invalid as never)).toThrow(CSSRecipeAuthoringError);
    try {
      authoring.defineRecipe(invalid as never);
    } catch (error) {
      expect(error).toBeInstanceOf(CSSRecipeAuthoringError);
      expect((error as CSSRecipeAuthoringError).diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
        "AXA1002",
        "AXA1004",
        "AXA1006",
        "AXA1007",
      ]));
    }
  });

  it("delegates hostile and callback inputs to the Kernel before CSS traversal while rejecting selectors as property inputs", () => {
    const authoring = createCSSRecipeAuthoring({
      propertyRegistry,
      canonicalStateRegistry,
      conditionRegistry,
    });
    let getterReads = 0;
    const getterStyle = {};
    Object.defineProperty(getterStyle, "color", {
      enumerable: true,
      get: () => {
        getterReads += 1;
        return css("red");
      },
    });
    const inheritedStyle = Object.create({ color: css("red") });
    const cyclicStyle: { color: ReturnType<typeof css>; self?: unknown } = { color: css("red") };
    cyclicStyle.self = cyclicStyle;

    for (const style of [
      getterStyle,
      inheritedStyle,
      cyclicStyle,
      { color: () => css("red") },
    ]) expect(() => authoring.defineRecipe({
      id: "button",
      slots: ["root"],
      base: { root: style },
    } as never)).toThrow(RecipeKernelError);
    expect(getterReads).toBe(0);

    expect(() => authoring.defineRecipe({
      id: "button",
      slots: ["root"],
      base: { root: { ":hover": css("red") } },
    } as never)).toThrow(CSSRecipeAuthoringError);
  });
});
