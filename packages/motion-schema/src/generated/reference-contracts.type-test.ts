import type { CollisionTrace, CSSAppearanceIR, MotionIR } from "./reference-contracts.js";

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

const collisionTrace = {
  schemaVersion: "0.1",
  profile: "axiom-css",
  profileInputDigest: "sha256:example",
  recipeId: "button",
  entries: [{
    id: "collision-0001",
    relation: "condition-overlap",
    conditionRelation: "overlap",
    affectedProperty: "color",
    earlier: {
      property: "color",
      origin: { recipeId: "button", slot: "root", stage: "condition", source: "button.ts#/conditions/0" },
      policyProvenance: [{ source: "status-default", rule: "standard" }],
      applicability: { variants: [], states: [], condition: { all: ["viewport.width.sm"] } },
    },
    later: {
      property: "color",
      origin: { recipeId: "button", slot: "root", stage: "condition", source: "button.ts#/conditions/1" },
      policyProvenance: [{ source: "status-default", rule: "standard" }],
      applicability: { variants: [], states: [], condition: { all: ["viewport.width.md"] } },
    },
    winner: "later",
  }],
} as const satisfies CollisionTrace;

void collisionTrace;

const incompleteCollisionTrace = {
  ...collisionTrace,
  entries: [{
    ...collisionTrace.entries[0],
    earlier: collisionTrace.entries[0].earlier.origin,
  }],
};

// @ts-expect-error Collision declarations require property, policy, and applicability evidence.
const invalidCollisionTrace: CollisionTrace = incompleteCollisionTrace;

void invalidCollisionTrace;

const misplacedConditionRelation = {
  ...collisionTrace,
  entries: [{
    ...collisionTrace.entries[0],
    relation: "same-property",
  }],
};

// @ts-expect-error Only Condition-overlap entries may carry a Condition relation.
const invalidRelationTrace: CollisionTrace = misplacedConditionRelation;

void invalidRelationTrace;

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
