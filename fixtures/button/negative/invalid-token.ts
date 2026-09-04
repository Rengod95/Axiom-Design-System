/** Defines a Button-local invalid direct Token binding for the N21 boundary regression. */
export const BUTTON_INVALID_TOKEN_APPEARANCE = {
  id: "button-invalid-token",
  slots: ["root"],
  source: "fixtures/button/negative/invalid-token.ts",
  base: {
    root: {
      color: { kind: "token", path: "duration.semantic.instant" },
    },
  },
} as const;
