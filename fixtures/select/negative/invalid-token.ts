/** Defines a Select-local wrong-domain direct Token binding for the N21 boundary regression. */
export const SELECT_INVALID_TOKEN_APPEARANCE = {
  id: "select-invalid-token",
  slots: ["popup"],
  source: "fixtures/select/negative/invalid-token.ts",
  base: {
    popup: { zIndex: { kind: "token", path: "color.component.select.popup.background" } },
  },
} as const;
