import { defineMotion, token } from "../index.js";

const source = defineMotion({
  id: "button.press",
  recipeId: "button",
  slot: "root",
  phases: [{
    phase: "stateChange",
    state: { name: "pressed", from: false, to: true },
    sequence: [{
      at: { kind: "afterPrevious" },
      tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }],
      transition: {
        type: "tween",
        duration: token("duration.semantic.fast"),
        easing: token("easing.semantic.standard"),
      },
    }],
  }],
  reducedMotion: { strategy: "disable" },
} as const);

const firstValue = source.phases[0].sequence[0].tracks[0].keyframes[0];
const exactLiteral: "0" = firstValue;
const exactId: "button.press" = source.id;
const exactTokenPath: "duration.semantic.fast" = source.phases[0].sequence[0].transition.duration.path;
const exactPhase: "stateChange" = source.phases[0].phase;
const exactState: "pressed" = source.phases[0].state.name;
const exactReducedStrategy: "disable" = source.reducedMotion.strategy;

void exactLiteral;
void exactId;
void exactTokenPath;
void exactPhase;
void exactState;
void exactReducedStrategy;
