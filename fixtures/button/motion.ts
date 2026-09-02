/** Defines the Button pressed-state Motion source consumed by the N23 conformance proof. */
export const BUTTON_PRESSED_MOTION = {
  id: "button.root.pressed",
  recipeId: "button",
  slot: "root",
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
