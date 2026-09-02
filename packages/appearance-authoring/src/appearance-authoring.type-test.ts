import {
  createCSSRecipeAuthoring,
  css,
  cssTemplate,
  negateToken,
  projectToken,
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
  properties: [],
  aliases: {},
  authoringNames: {},
  customProperties: [],
} as const;

const canonicalStateRegistry = {
  schemaVersion: "0.1",
  states: [{
    id: "pressed",
    axis: "state",
    valueType: "boolean",
    applicableComponents: ["button"],
    usage: ["appearance"],
  }],
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

const authoring = createCSSRecipeAuthoring({
  propertyRegistry,
  canonicalStateRegistry,
  conditionRegistry,
  tokenValidation: {} as never,
});

authoring.defineRecipe({
  id: "button",
  slots: ["root"],
  base: { root: { color: css("red") } },
} as const);

const literalToken = token("space.semantic.layout.gutter.md");
const literalTokenPath: "space.semantic.layout.gutter.md" = literalToken.path;
const literalCSS = css("calc(100% - 1rem)");
const literalCSSValue: "calc(100% - 1rem)" = literalCSS.value;
const literalNegatedToken = negateToken(literalToken);
const literalNegatedTokenPath: "space.semantic.layout.gutter.md" =
  literalNegatedToken.token.path;
const literalTemplate = cssTemplate`calc(100% - ${literalToken})`;
const literalTemplateTokenPath: "space.semantic.layout.gutter.md" =
  (null as unknown as Extract<
    (typeof literalTemplate.parts)[number],
    { readonly kind: "token" }
  >).path;

void literalTokenPath;
void literalCSSValue;
void literalNegatedTokenPath;
void literalTemplateTokenPath;

projectToken(token("shadow.semantic.raised"), { projector: "css.shadow.v1" });
projectToken(token("transition.semantic.fast"), {
  projector: "css.transition-projector.v1",
  parameters: { properties: ["color"] },
});

// @ts-expect-error The transition projector requires its explicit property list.
projectToken(token("transition.semantic.fast"), { projector: "css.transition-projector.v1" });

// @ts-expect-error Non-transition projectors do not accept parameters.
projectToken(token("shadow.semantic.raised"), { projector: "css.shadow.v1", parameters: { properties: ["color"] } });

// @ts-expect-error Projector options are an authoring-only closed object.
projectToken(token("shadow.semantic.raised"), { projector: "css.shadow.v1", extra: true });

authoring.defineRecipe({
  id: "button",
  slots: ["root"],
  base: { root: { margin: negateToken(token("space.semantic.layout.gutter.md")) } },
} as const);

// @ts-expect-error Negation only accepts an explicit Token Reference.
negateToken(css("1rem"));

authoring.defineRecipe({
  id: "button",
  slots: ["root"],
  states: [{
    slot: "root",
    // @ts-expect-error CSS Recipes use N18 generated canonical State IDs.
    state: "unknownState",
    cases: [{ equals: true, apply: { color: css("red") } }],
  }],
} as const);

authoring.defineRecipe({
  id: "button",
  slots: ["root"],
  conditions: [{
    when: {
      // @ts-expect-error CSS Recipes use N18 generated Condition IDs.
      all: ["viewport.width.unknown"],
    },
    apply: { root: { color: css("red") } },
  }],
} as const);

authoring.defineRecipe({
  id: "button",
  slots: ["root"],
  base: { root: {
    // @ts-expect-error CSS object fragments are restricted to generated camel-case property keys.
    unknownGeneratedProperty: css("red"),
  } },
} as const);

authoring.defineRecipe({
  id: "button",
  slots: ["root"],
  base: {
    // @ts-expect-error Slot style fragments cannot be class strings.
    root: "px-2",
  },
} as const);

// @ts-expect-error Token references require a string path.
token(42);
