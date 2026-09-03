/** Defines a Select-local N23 applicability failure with a Slot absent from authenticated Appearance. */
export const SELECT_UNKNOWN_SLOT_MOTION = {
  id: "select.unknown.visibility",
  recipeId: "select",
  slot: "unknown",
  phases: [{
    phase: "enter",
    sequence: [{
      at: { kind: "afterPrevious" },
      tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }],
      transition: {
        type: "tween",
        duration: { kind: "token", path: "duration.semantic.overlay.enter" },
        easing: { kind: "token", path: "easing.semantic.enter" },
      },
    }],
  }],
  reducedMotion: { strategy: "disable" },
} as const;
