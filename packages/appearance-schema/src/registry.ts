import type { TokenType } from "@axiom/tokens";

export interface AppearancePropertyDefinition {
  readonly tokenTypes: readonly TokenType[];
  readonly literals: readonly (string | number)[];
}

export const appearancePropertyRegistry = {
  display: {
    tokenTypes: [],
    literals: ["none", "block", "flex", "inline-flex", "grid"],
  },
  position: {
    tokenTypes: [],
    literals: ["static", "relative", "absolute", "fixed"],
  },
  insetBlockStart: { tokenTypes: ["dimension"], literals: [] },
  insetInlineEnd: { tokenTypes: ["dimension"], literals: [] },
  alignItems: {
    tokenTypes: [],
    literals: ["stretch", "flex-start", "center", "flex-end"],
  },
  justifyContent: {
    tokenTypes: [],
    literals: ["flex-start", "center", "flex-end", "space-between"],
  },
  flexDirection: {
    tokenTypes: [],
    literals: ["row", "column"],
  },
  flexGrow: { tokenTypes: ["number"], literals: [0, 1] },
  gap: { tokenTypes: ["dimension"], literals: [] },
  minInlineSize: { tokenTypes: ["dimension"], literals: [] },
  blockSize: { tokenTypes: ["dimension"], literals: [] },
  inlineSize: { tokenTypes: ["dimension"], literals: [] },
  paddingBlock: { tokenTypes: ["dimension"], literals: [] },
  paddingInline: { tokenTypes: ["dimension"], literals: [] },
  padding: { tokenTypes: ["dimension"], literals: [] },
  backgroundColor: { tokenTypes: ["color"], literals: ["transparent"] },
  foregroundColor: { tokenTypes: ["color"], literals: ["currentColor"] },
  borderColor: { tokenTypes: ["color"], literals: ["transparent"] },
  borderWidth: { tokenTypes: ["dimension"], literals: [] },
  borderRadius: { tokenTypes: ["dimension"], literals: [] },
  outlineColor: { tokenTypes: ["color"], literals: ["transparent"] },
  outlineWidth: { tokenTypes: ["dimension"], literals: [] },
  outlineOffset: { tokenTypes: ["dimension"], literals: [] },
  fontFamily: { tokenTypes: ["fontFamily"], literals: [] },
  fontSize: { tokenTypes: ["dimension"], literals: [] },
  fontWeight: { tokenTypes: ["fontWeight"], literals: [] },
  lineHeight: { tokenTypes: ["number", "dimension"], literals: ["normal"] },
  textAlign: { tokenTypes: [], literals: ["start", "center", "end"] },
  whiteSpace: { tokenTypes: [], literals: ["normal", "nowrap"] },
  cursor: {
    tokenTypes: [],
    literals: ["default", "pointer", "not-allowed"],
  },
  opacity: { tokenTypes: ["number"], literals: [0, 0.4, 0.6, 1] },
  overflow: { tokenTypes: [], literals: ["visible", "hidden", "auto"] },
  userSelect: { tokenTypes: [], literals: ["auto", "none", "text"] },
} as const satisfies Record<string, AppearancePropertyDefinition>;

export type AppearancePropertyRegistry = typeof appearancePropertyRegistry;
export type AppearancePropertyName = keyof AppearancePropertyRegistry;
