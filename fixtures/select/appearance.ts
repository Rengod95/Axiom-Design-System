/** Defines the Select-only authored Appearance input consumed by the N20→N22 conformance proof. */
export const SELECT_APPEARANCE = {
  id: "select",
  slots: ["root", "trigger", "popup", "item"],
  source: "fixtures/select/appearance.ts",
  base: {
    root: { display: { kind: "css", value: "grid" } },
    trigger: {
      display: { kind: "css", value: "inline-flex" },
      border: { kind: "css", value: "1px solid transparent" },
    },
    popup: {
      backgroundColor: { kind: "token", path: "color.component.select.popup.background" },
      borderRadius: { kind: "token", path: "radius.component.select.popup" },
      boxShadow: { kind: "token", path: "shadow.component.select.popup" },
      zIndex: { kind: "token", path: "layer.semantic.dropdown" },
    },
    item: { color: { kind: "token", path: "color.component.select.item.text" } },
  },
  variants: {
    size: {
      md: {
        trigger: { minBlockSize: { kind: "token", path: "size.component.select.trigger.block.md" } },
        item: {
          paddingInline: { kind: "token", path: "space.component.select.item.padding.inline.md" },
          paddingBlock: { kind: "token", path: "space.component.select.item.padding.block.md" },
        },
      },
    },
  },
  defaultVariants: { size: "md" },
  states: [{
    slot: "root",
    state: "disabled",
    cases: [{ equals: true, apply: { opacity: { kind: "token", path: "opacity.semantic.disabled" } } }],
  }, {
    slot: "trigger",
    state: "open",
    cases: [{ equals: true, apply: { borderColor: { kind: "token", path: "color.component.select.trigger.border.default" } } }],
  }, {
    slot: "trigger",
    state: "focusVisible",
    cases: [{ equals: true, apply: { outlineColor: { kind: "token", path: "color.semantic.focus.ring" } } }],
  }, {
    slot: "item",
    state: "hovered",
    cases: [{ equals: true, apply: { backgroundColor: { kind: "token", path: "color.component.select.item.background.hovered" } } }],
  }, {
    slot: "item",
    state: "selected",
    cases: [{
      equals: true,
      apply: {
        backgroundColor: { kind: "token", path: "color.semantic.selection.background" },
        color: { kind: "token", path: "color.semantic.selection.text" },
      },
    }],
  }],
  conditions: [{
    when: { all: ["preference.reducedMotion"] },
    states: { trigger: { open: true } },
    apply: { popup: { transitionDuration: { kind: "token", path: "duration.semantic.instant" } } },
  }],
} as const;
