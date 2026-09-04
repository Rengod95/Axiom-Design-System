import { BUTTON_APPEARANCE } from "../../../../fixtures/button/appearance.js";
import { BUTTON_PRESSED_MOTION } from "../../../../fixtures/button/motion.js";
import type { DefinedCSSRecipe } from "@axiom/appearance-authoring";
import type { AppearanceNormalizationResult } from "../index.js";
import type { CollisionTrace, DefinedMotion, MotionIR } from "@axiom/motion-schema";

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Assert<Condition extends true> = Condition;

declare const recipe: DefinedCSSRecipe<typeof BUTTON_APPEARANCE>;
declare const motion: DefinedMotion<typeof BUTTON_PRESSED_MOTION>;
declare const normalized: AppearanceNormalizationResult;

type ButtonSlots = typeof recipe.definition.slots[number];
type ButtonVariantAxes = keyof typeof recipe.definition.variants;
type ButtonToneValues = keyof typeof recipe.definition.variants.tone;
type _slotsAreExact = Assert<Equal<ButtonSlots, "root" | "label">>;
type _variantAxesAreExact = Assert<Equal<ButtonVariantAxes, "tone">>;
type _toneValuesAreExact = Assert<Equal<ButtonToneValues, "neutral" | "brand">>;
type _motionSlotIsExact = Assert<Equal<typeof motion.definition.slot, "root">>;

const root: ButtonSlots = "root";
const label: ButtonSlots = "label";
const neutral: ButtonToneValues = "neutral";
const brand: ButtonToneValues = "brand";
// @ts-expect-error Button has no icon Slot.
const unknownSlot: ButtonSlots = "icon";
// @ts-expect-error Button declares no size Variant axis.
const unknownAxis: ButtonVariantAxes = "size";
// @ts-expect-error Button tone has no danger Variant value.
const unknownTone: ButtonToneValues = "danger";

const buttonId: "button" = BUTTON_APPEARANCE.id;
const buttonSlot: "root" | "label" = BUTTON_APPEARANCE.slots[0];
const tone: "neutral" | "brand" = BUTTON_APPEARANCE.defaultVariants.tone;
const pressedState: "pressed" = BUTTON_PRESSED_MOTION.phases[0].state.name;
const motionRecipe: "button" = BUTTON_PRESSED_MOTION.recipeId;
const reducedMotionCondition: "preference.reducedMotion" = BUTTON_APPEARANCE.conditions[0].when.all[0];
const appearance = normalized.appearance;
const trace: CollisionTrace = normalized.trace;
const motionIr: MotionIR = motion.motion;
const bundle: Readonly<{ readonly appearance: typeof appearance; readonly motion: MotionIR; readonly trace: CollisionTrace }> = {
  appearance,
  motion: motionIr,
  trace,
};

void buttonId;
void buttonSlot;
void tone;
void pressedState;
void motionRecipe;
void reducedMotionCondition;
void root;
void label;
void neutral;
void brand;
void unknownSlot;
void unknownAxis;
void unknownTone;
void bundle;
