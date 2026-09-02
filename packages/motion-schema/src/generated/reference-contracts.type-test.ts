import type { CSSAppearanceIR, MotionIR } from "./reference-contracts.js";

const appearance = {
  schemaVersion: "0.1",
  profile: "axiom-css",
  profileInputDigest: "sha256:example",
  recipeId: "button",
  slots: ["root"],
  base: [],
  variantAxes: [],
  stateRules: [],
  compoundRules: [],
  conditionRules: [],
} as const satisfies CSSAppearanceIR;

const motion = {
  schemaVersion: "0.1",
  profile: "axiom-css",
  profileInputDigest: "sha256:example",
  conditionRegistryDigest: "sha256:example",
  id: "button.root.pressed",
  recipeId: "button",
  slot: "root",
  phases: [{
    phase: "stateChange",
    state: { name: "pressed", from: false, to: true },
    sequence: [{
      at: { kind: "afterPrevious" },
      tracks: [{
        property: "opacity",
        allowDiscrete: false,
        keyframes: [
          { offset: 0, value: { kind: "css", value: "0" } },
          { offset: 1, value: { kind: "css", value: "1" } },
        ],
      }],
      transition: {
        type: "tween",
        duration: { kind: "token", path: "duration.semantic.fast" },
        easing: { kind: "token", path: "easing.semantic.enter" },
      },
    }],
  }],
  reducedMotion: { strategy: "disable" },
} as const satisfies MotionIR;

void appearance;
void motion;

const missingDiscreteDecision = {
  ...motion,
  phases: [{
    phase: "enter",
    sequence: [{
      at: { kind: "afterPrevious" },
      tracks: [{
        property: "opacity",
        keyframes: [],
      }],
      transition: { type: "spring" },
    }],
  }],
} as const;

// @ts-expect-error Motion tracks require the N16 allowDiscrete decision.
const invalidMotion: MotionIR = missingDiscreteDecision;

void invalidMotion;
