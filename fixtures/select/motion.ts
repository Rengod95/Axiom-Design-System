/** Defines the Select popup enter/exit Motion source consumed by the N23 conformance proof. */
export const SELECT_POPUP_MOTION = {
  id: "select.popup.visibility",
  recipeId: "select",
  slot: "popup",
  phases: [{
    phase: "enter",
    sequence: [{
      at: { kind: "afterPrevious" },
      tracks: [{
        property: "opacity",
        allowDiscrete: false,
        keyframes: ["0", "1"],
      }, {
        property: "transform",
        allowDiscrete: false,
        keyframes: ["translateY(-4px) scale(0.98)", "translateY(0) scale(1)"],
      }],
      transition: {
        type: "tween",
        duration: { kind: "token", path: "duration.semantic.overlay.enter" },
        easing: { kind: "token", path: "easing.semantic.enter" },
      },
    }],
  }, {
    phase: "exit",
    sequence: [{
      at: { kind: "afterPrevious" },
      tracks: [{
        property: "opacity",
        allowDiscrete: false,
        keyframes: ["1", "0"],
      }, {
        property: "transform",
        allowDiscrete: false,
        keyframes: ["translateY(0) scale(1)", "translateY(-2px) scale(0.98)"],
      }],
      transition: {
        type: "tween",
        duration: { kind: "token", path: "duration.semantic.overlay.exit" },
        easing: { kind: "token", path: "easing.semantic.exit" },
      },
    }],
  }],
  reducedMotion: { strategy: "disable" },
} as const;
