/** Defines a Button-local N23 applicability failure with a slot absent from the verified Appearance. */
export const BUTTON_UNKNOWN_SLOT_MOTION = {
  id: "button.unknown.pressed",
  recipeId: "button",
  slot: "unknown",
  phases: [{
    phase: "stateChange",
    state: { name: "pressed", from: false, to: true },
    sequence: [{
      at: { kind: "afterPrevious" },
      tracks: [{
        property: "transform",
        allowDiscrete: false,
        keyframes: ["translateY(0)", "translateY(1px)"],
      }],
      transition: { type: "spring", bounce: 0.16, stiffness: 220, damping: 20, mass: 1 },
    }],
  }],
  reducedMotion: { strategy: "disable" },
} as const;
