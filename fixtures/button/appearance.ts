/** Defines the Button-only authored Appearance input consumed by the N20→N22 conformance proof. */
export const BUTTON_APPEARANCE = {
  id: "button",
  slots: ["root", "label"],
  source: "fixtures/button/appearance.ts",
  base: {
    root: {
      border: { kind: "css", value: "1px solid transparent" },
      display: { kind: "css", value: "inline-flex" },
    },
  },
  variants: {
    tone: {
      neutral: {
        root: { opacity: { kind: "css", value: "1" } },
      },
      brand: {
        root: { backgroundColor: { kind: "token", path: "color.semantic.fill.brand.default" } },
      },
    },
  },
  defaultVariants: { tone: "neutral" },
  states: [{
    slot: "root",
    state: "pressed",
    cases: [{
      equals: true,
      apply: {
        borderColor: { kind: "token", path: "color.semantic.fill.brand.default" },
        transform: { kind: "css", value: "translateY(1px)" },
      },
    }],
  }],
  compoundVariants: [{
    when: { variants: { tone: "brand" }, states: { root: { pressed: true } } },
    apply: { label: { color: { kind: "token", path: "color.semantic.text.onBrand" } } },
  }],
  conditions: [{
    when: { all: ["preference.reducedMotion"] },
    variants: { tone: ["neutral", "brand"] },
    apply: { root: { transitionDuration: { kind: "token", path: "duration.semantic.instant" } } },
  }],
} as const;
