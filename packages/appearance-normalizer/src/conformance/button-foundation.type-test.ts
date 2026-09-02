import type { CSSRecipeDefinition } from "@axiom/appearance-authoring";
import type { MotionDefinition } from "@axiom/motion-schema";

import { BUTTON_APPEARANCE } from "../../../../fixtures/button/appearance.js";
import { BUTTON_PRESSED_MOTION } from "../../../../fixtures/button/motion.js";

const appearanceContract: CSSRecipeDefinition = BUTTON_APPEARANCE;
const motionContract: MotionDefinition = BUTTON_PRESSED_MOTION;

const buttonId: "button" = BUTTON_APPEARANCE.id;
const buttonSlot: "root" | "label" = BUTTON_APPEARANCE.slots[0];
const tone: "neutral" | "brand" = BUTTON_APPEARANCE.defaultVariants.tone;
const pressedState: "pressed" = BUTTON_PRESSED_MOTION.phases[0].state.name;
const motionRecipe: "button" = BUTTON_PRESSED_MOTION.recipeId;
const reducedMotionCondition: "preference.reducedMotion" = BUTTON_APPEARANCE.conditions[0].when.all[0];

void buttonId;
void buttonSlot;
void tone;
void pressedState;
void motionRecipe;
void reducedMotionCondition;
void appearanceContract;
void motionContract;
