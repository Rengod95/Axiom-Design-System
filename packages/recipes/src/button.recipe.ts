import { tokenRef, type AppearanceStyle } from "@axiom/appearance-schema";
import type { RecipeDefinition } from "./contracts.js";

const rootBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: tokenRef("space.2"),
  borderWidth: tokenRef("border.width.default"),
  borderRadius: tokenRef("radius.md"),
  fontFamily: tokenRef("font.family.sans"),
  fontWeight: tokenRef("font.weight.semibold"),
  lineHeight: tokenRef("font.lineHeight.sm"),
  whiteSpace: "nowrap",
  cursor: "pointer",
  userSelect: "none",
} as const satisfies AppearanceStyle;

export const buttonRecipe = {
  id: "button",
  slots: ["root"],
  base: {
    root: rootBase,
  },
  variants: {
    tone: {
      accent: {
        root: {
          backgroundColor: tokenRef("color.action.background.default"),
          foregroundColor: tokenRef("color.action.foreground.default"),
          borderColor: tokenRef("color.action.background.default"),
        },
      },
      neutral: {
        root: {
          backgroundColor: tokenRef("color.surface.default"),
          foregroundColor: tokenRef("color.text.default"),
          borderColor: tokenRef("color.border.default"),
        },
      },
      danger: {
        root: {
          backgroundColor: tokenRef("color.surface.danger"),
          foregroundColor: tokenRef("color.text.danger"),
          borderColor: tokenRef("color.border.danger"),
        },
      },
    },
    size: {
      sm: {
        root: {
          blockSize: tokenRef("size.control.sm"),
          paddingInline: tokenRef("space.3"),
          fontSize: tokenRef("font.size.sm"),
        },
      },
      md: {
        root: {
          blockSize: tokenRef("size.control.md"),
          paddingInline: tokenRef("space.4"),
          fontSize: tokenRef("font.size.sm"),
        },
      },
      lg: {
        root: {
          blockSize: tokenRef("size.control.lg"),
          paddingInline: tokenRef("space.4"),
          fontSize: tokenRef("font.size.md"),
        },
      },
    },
  },
  defaultVariants: {
    tone: "accent",
    size: "md",
  },
  states: {
    root: {
      hovered: {
        backgroundColor: tokenRef("color.action.background.hover"),
      },
      pressed: {
        backgroundColor: tokenRef("color.action.background.pressed"),
      },
      focusVisible: {
        outlineColor: tokenRef("color.border.focus"),
        outlineWidth: tokenRef("border.width.focus"),
        outlineOffset: tokenRef("space.1"),
      },
      disabled: {
        backgroundColor: tokenRef("color.action.background.disabled"),
        foregroundColor: tokenRef("color.action.foreground.disabled"),
        borderColor: tokenRef("color.action.background.disabled"),
        cursor: "not-allowed",
        opacity: 0.6,
      },
    },
  },
  compoundVariants: [
    {
      when: {
        variants: { tone: "danger" },
        states: { root: ["hovered"] },
      },
      apply: {
        root: {
          backgroundColor: tokenRef("color.primitive.red.600"),
          foregroundColor: tokenRef("color.text.inverse"),
        },
      },
    },
    {
      when: {
        variants: { tone: "neutral" },
        states: { root: ["hovered"] },
      },
      apply: {
        root: {
          backgroundColor: tokenRef("color.surface.hover"),
        },
      },
    },
  ],
} as const satisfies RecipeDefinition;

export type ButtonRecipe = typeof buttonRecipe;
export type ButtonTone = keyof ButtonRecipe["variants"]["tone"];
export type ButtonSize = keyof ButtonRecipe["variants"]["size"];
