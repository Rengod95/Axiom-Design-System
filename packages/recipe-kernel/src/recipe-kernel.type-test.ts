import { createRecipeKernel, type RecipeConditionExpression, type RecipeVariantSelection } from "./index.js";

const kernel = createRecipeKernel<{ readonly marker: string }>();
const defaultKernel = createRecipeKernel();

const generatedConditionExpression: RecipeConditionExpression = { all: ["viewport.width.md"] };
void generatedConditionExpression;

interface InterfaceStyle {
  readonly marker: string;
  readonly nested?: { readonly amount: number };
}

type OrderedStyle = readonly { readonly property: string; readonly value: string }[];
const orderedKernel = createRecipeKernel<OrderedStyle>();
const orderedDefinition = orderedKernel.define({
  id: "ordered-style",
  slots: ["root"],
  base: { root: [{ property: "color", value: "CanvasText" }] },
} as const);
const orderedProperty: "color" = orderedDefinition.snapshot.base[0]!.style[0]!.property;
void orderedProperty;

const interfaceKernel = createRecipeKernel<InterfaceStyle>();
interfaceKernel.define({
  id: "interface-style",
  slots: ["root"],
  base: { root: { marker: "safe", nested: { amount: 1 } } },
} as const);

// @ts-expect-error The default Kernel boundary accepts JSON object styles, not class strings.
defaultKernel.define({ id: "class-string", slots: ["root"], base: { root: "px-2" } } as const);

const definition = kernel.define({
  id: "button",
  slots: ["root"],
  variants: {
    tone: {
      neutral: { root: { marker: "neutral" } },
      brand: { root: { marker: "brand" } },
    },
    size: {
      sm: { root: { marker: "sm" } },
      md: { root: { marker: "md" } },
    },
  },
  defaultVariants: { tone: "neutral" },
} as const);

const requiredSize: RecipeVariantSelection<typeof definition.definition> = { size: "md" };
void requiredSize;

// @ts-expect-error size is required because it has no default.
const missingSize: RecipeVariantSelection<typeof definition.definition> = { tone: "brand" };
void missingSize;

const unknownTone: RecipeVariantSelection<typeof definition.definition> = {
  // @ts-expect-error Variant values remain literal-inferred.
  tone: "danger",
  size: "md",
};
void unknownTone;

const literalDefinition = kernel.define({
  id: "valid-slot",
  slots: ["root"],
  base: { root: { marker: "valid" } },
} as const);

const literalSnapshotSlot: "root" = literalDefinition.snapshot.base[0]!.slot;
const literalSnapshotStyle: "valid" = literalDefinition.snapshot.base[0]!.style.marker;
const literalVariantAxis: "tone" | "size" = definition.snapshot.variantAxes[0]!.name;
void literalSnapshotSlot;
void literalSnapshotStyle;
void literalVariantAxis;

// @ts-expect-error Defaults must reference declared literal Variant values.
kernel.define({
  id: "invalid-default-value",
  slots: ["root"],
  variants: { tone: { neutral: { root: { marker: "neutral" } } } },
  defaultVariants: { tone: "brand" },
} as const);

// @ts-expect-error Compound predicates must reference declared literal Variant values.
kernel.define({
  id: "invalid-compound-value",
  slots: ["root"],
  variants: { tone: { neutral: { root: { marker: "neutral" } } } },
  compoundVariants: [{
    when: { variants: { tone: "brand" } },
    apply: { root: { marker: "compound" } },
  }],
} as const);

// @ts-expect-error Slot maps may not reference undeclared Slots.
kernel.define({
  id: "invalid-base-slot",
  slots: ["root"],
  base: { label: { marker: "invalid" } },
} as const);

// @ts-expect-error Variant maps may not reference undeclared Slots.
kernel.define({
  id: "invalid-variant-slot",
  slots: ["root"],
  variants: {
    tone: {
      neutral: {
        label: { marker: "invalid" },
      },
    },
  },
} as const);

// @ts-expect-error State rules may not reference undeclared Slots.
kernel.define({
  id: "invalid-state-slot",
  slots: ["root"],
  states: [{
    slot: "label",
    state: "pressed",
    cases: [{ equals: true, apply: { marker: "invalid" } }],
  }],
} as const);

// @ts-expect-error Compound apply maps may not reference undeclared Slots.
kernel.define({
  id: "invalid-compound-slot",
  slots: ["root"],
  compoundVariants: [{
    when: { variants: { tone: "neutral" } },
    apply: { label: { marker: "invalid" } },
  }],
} as const);

// @ts-expect-error Condition State maps may not reference undeclared Slots.
kernel.define({
  id: "invalid-condition-slot",
  slots: ["root"],
  conditions: [{
    when: { all: ["viewport.width.md"] },
    states: { label: { open: true } },
    apply: { root: { marker: "valid" } },
  }],
} as const);

// @ts-expect-error A Kernel style profile cannot be a class-string type.
createRecipeKernel<string>();

// @ts-expect-error A Kernel style profile cannot contain callback values.
createRecipeKernel<{ readonly marker: () => void }>();

// @ts-expect-error A Kernel style profile cannot contain non-JSON object values.
createRecipeKernel<{ readonly createdAt: Date }>();

// @ts-expect-error Ordered style arrays cannot contain callback values.
createRecipeKernel<readonly (() => void)[]>();
