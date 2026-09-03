/** Defines a Select-local directional reset conflict for the N22 boundary regression. */
export const SELECT_RESET_LONGHAND_APPEARANCE = {
  id: "select-reset-longhand",
  slots: ["popup"],
  source: "fixtures/select/negative/reset-longhand.ts",
  base: {
    popup: [
      { property: "background-blend-mode", value: { kind: "css", value: "multiply" } },
      { property: "background", value: { kind: "css", value: "none" } },
    ],
  },
} as const;
