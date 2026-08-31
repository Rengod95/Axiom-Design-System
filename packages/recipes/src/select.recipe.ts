import { tokenRef } from "@axiom/appearance-schema";
import type { RecipeDefinition } from "./contracts.js";

export const selectRecipe = {
  id: "select",
  slots: [
    "root",
    "label",
    "trigger",
    "value",
    "indicator",
    "popover",
    "listbox",
    "item",
  ],
  base: {
    root: {
      display: "inline-flex",
      flexDirection: "column",
      gap: tokenRef("space.1"),
      fontFamily: tokenRef("font.family.sans"),
    },
    label: {
      foregroundColor: tokenRef("color.text.default"),
      fontSize: tokenRef("font.size.sm"),
      fontWeight: tokenRef("font.weight.medium"),
    },
    trigger: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokenRef("space.2"),
      minInlineSize: tokenRef("size.popover.min"),
      paddingInline: tokenRef("space.3"),
      backgroundColor: tokenRef("color.surface.default"),
      foregroundColor: tokenRef("color.text.default"),
      borderColor: tokenRef("color.border.default"),
      borderWidth: tokenRef("border.width.default"),
      borderRadius: tokenRef("radius.md"),
      cursor: "pointer",
    },
    value: {
      flexGrow: 1,
      textAlign: "start",
      whiteSpace: "nowrap",
    },
    indicator: {
      foregroundColor: tokenRef("color.text.muted"),
      fontSize: tokenRef("font.size.sm"),
    },
    popover: {
      minInlineSize: tokenRef("size.popover.min"),
      padding: tokenRef("space.1"),
      backgroundColor: tokenRef("color.surface.default"),
      borderColor: tokenRef("color.border.default"),
      borderWidth: tokenRef("border.width.default"),
      borderRadius: tokenRef("radius.md"),
      overflow: "auto",
    },
    listbox: {
      display: "flex",
      flexDirection: "column",
      gap: tokenRef("space.1"),
    },
    item: {
      display: "flex",
      alignItems: "center",
      minInlineSize: tokenRef("size.popover.min"),
      paddingBlock: tokenRef("space.2"),
      paddingInline: tokenRef("space.3"),
      foregroundColor: tokenRef("color.text.default"),
      borderRadius: tokenRef("radius.sm"),
      cursor: "pointer",
      userSelect: "none",
    },
  },
  variants: {
    size: {
      sm: {
        trigger: {
          blockSize: tokenRef("size.control.sm"),
          fontSize: tokenRef("font.size.sm"),
        },
        item: { fontSize: tokenRef("font.size.sm") },
      },
      md: {
        trigger: {
          blockSize: tokenRef("size.control.md"),
          fontSize: tokenRef("font.size.md"),
        },
        item: { fontSize: tokenRef("font.size.md") },
      },
      lg: {
        trigger: {
          blockSize: tokenRef("size.control.lg"),
          fontSize: tokenRef("font.size.md"),
        },
        item: { fontSize: tokenRef("font.size.md") },
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
  states: {
    root: {
      disabled: { opacity: 0.6 },
      invalid: { foregroundColor: tokenRef("color.text.danger") },
    },
    label: {
      invalid: { foregroundColor: tokenRef("color.text.danger") },
    },
    trigger: {
      hovered: { backgroundColor: tokenRef("color.surface.hover") },
      focusVisible: {
        outlineColor: tokenRef("color.border.focus"),
        outlineWidth: tokenRef("border.width.focus"),
        outlineOffset: tokenRef("space.1"),
      },
      open: { borderColor: tokenRef("color.border.focus") },
      invalid: { borderColor: tokenRef("color.border.danger") },
      disabled: { cursor: "not-allowed" },
    },
    value: {},
    indicator: {
      open: { foregroundColor: tokenRef("color.primitive.blue.600") },
    },
    popover: {},
    listbox: {},
    item: {
      hovered: { backgroundColor: tokenRef("color.surface.hover") },
      focused: { backgroundColor: tokenRef("color.surface.hover") },
      selected: {
        backgroundColor: tokenRef("color.surface.selected"),
        foregroundColor: tokenRef("color.text.inverse"),
      },
      disabled: { cursor: "not-allowed", opacity: 0.4 },
    },
  },
  compoundVariants: [],
} as const satisfies RecipeDefinition;

export type SelectRecipe = typeof selectRecipe;
export type SelectSize = keyof SelectRecipe["variants"]["size"];
export type SelectSlot = SelectRecipe["slots"][number];
