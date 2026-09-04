import { describe, expect, it } from "vitest";

import { createRecipeKernel } from "../index.js";
import { matchesRecipeCompound } from "../definition.js";

const kernel = createRecipeKernel();
type OrderedFragment = readonly { readonly entry: string }[];
const orderedKernel = createRecipeKernel<OrderedFragment>();

describe("Recipe Kernel structural conformance", () => {
  it("captures Button as a defaulted and required Variant definition", () => {
    const button = kernel.define({
      id: "button",
      slots: ["root"],
      base: { root: { structural: "button" } },
      variants: {
        tone: {
          neutral: { root: { structural: "neutral" } },
          danger: { root: { structural: "danger" } },
        },
        size: {
          sm: { root: { structural: "small" } },
          md: { root: { structural: "medium" } },
        },
      },
      defaultVariants: { tone: "neutral" },
      states: [{
        slot: "root",
        state: "pressed",
        cases: [{ equals: true, apply: { structural: "pressed" } }],
      }],
      compoundVariants: [{
        when: { variants: { tone: ["neutral", "danger"], size: "md" } },
        apply: { root: { structural: "compound" } },
      }],
    } as const);

    expect(button.snapshot.variantAxes.map((axis) => axis.name)).toEqual(["tone", "size"]);
    expect(button.snapshot.variantAxes[0]?.defaultValue).toBe("neutral");
    expect(button.snapshot.stateRules[0]?.slot).toBe("root");
  });

  it("captures Select's repeated item Slot independently of other Slots", () => {
    const select = kernel.define({
      id: "select",
      slots: ["root", "trigger", "popup", "item"],
      base: {
        root: { structural: "root" },
        trigger: { structural: "trigger" },
        popup: { structural: "popup" },
        item: { structural: "item" },
      },
      states: [
        {
          slot: "trigger",
          state: "open",
          cases: [{ equals: true, apply: { structural: "open" } }],
        },
        {
          slot: "item",
          state: "selected",
          cases: [{ equals: true, apply: { structural: "selected" } }],
        },
      ],
      compoundVariants: [{
        when: { states: { item: { selected: true } } },
        apply: { item: { structural: "selected-compound" } },
      }],
    } as const);

    expect(select.snapshot.slots).toEqual(["root", "trigger", "popup", "item"]);
    expect(matchesRecipeCompound(select.snapshot.compoundVariants[0]!.when, {
      variants: {},
      states: { item: { selected: true } },
    })).toBe(true);
  });

  it("keeps Dialog Conditions separate from state and emits no class or CSS output", () => {
    const dialog = kernel.define({
      id: "dialog",
      slots: ["root", "backdrop", "popup"],
      base: {
        root: { structural: "root" },
        backdrop: { structural: "backdrop" },
        popup: { structural: "popup" },
      },
      states: [{
        slot: "popup",
        state: "open",
        cases: [{ equals: true, apply: { structural: "visible" } }],
      }],
      conditions: [{
        when: { all: ["container.inline.wide"] },
        states: { popup: { open: true } },
        apply: { popup: { structural: "wide" } },
      }],
    } as const);

    expect(dialog.snapshot.conditions[0]?.when).toEqual({ all: ["container.inline.wide"] });
    expect(Object.keys(dialog)).toEqual(["definition", "snapshot"]);
    expect(JSON.stringify(dialog.snapshot)).not.toContain("className");
  });

  it("retains ordered style fragments as opaque structural data", () => {
    const dialog = orderedKernel.define({
      id: "dialog-ordered",
      slots: ["root", "popup"],
      base: { root: [{ entry: "first" }], popup: [{ entry: "second" }] },
      conditions: [{
        when: { all: ["container.inline.wide"] },
        apply: { popup: [{ entry: "condition" }] },
      }],
    } as const);

    expect(dialog.snapshot.base).toEqual([
      { slot: "root", style: [{ entry: "first" }] },
      { slot: "popup", style: [{ entry: "second" }] },
    ]);
    expect(dialog.snapshot.conditions[0]?.apply.popup).toEqual([{ entry: "condition" }]);
  });
});
