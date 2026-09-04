/** Defines a Button-local directional reset conflict for the N22 boundary regression. */
export const BUTTON_RESET_LONGHAND_APPEARANCE = {
  id: "button-reset-longhand",
  slots: ["root"],
  source: "fixtures/button/negative/reset-longhand.ts",
  base: {
    root: [
      { property: "background-blend-mode", value: { kind: "css", value: "multiply" } },
      { property: "background", value: { kind: "css", value: "none" } },
    ],
  },
} as const;
