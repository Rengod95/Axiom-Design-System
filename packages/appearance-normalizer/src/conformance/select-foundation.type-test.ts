import type { DefinedCSSRecipe } from "@axiom/appearance-authoring";
import type { CollisionTrace, DefinedMotion, MotionIR } from "@axiom/motion-schema";

import { SELECT_APPEARANCE } from "../../../../fixtures/select/appearance.js";
import { SELECT_POPUP_MOTION } from "../../../../fixtures/select/motion.js";
import type { AppearanceNormalizationResult } from "../index.js";

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Assert<Condition extends true> = Condition;

declare const recipe: DefinedCSSRecipe<typeof SELECT_APPEARANCE>;
declare const motion: DefinedMotion<typeof SELECT_POPUP_MOTION>;
declare const normalized: AppearanceNormalizationResult;

type SelectSlots = typeof recipe.definition.slots[number];
type SelectVariantAxes = keyof typeof recipe.definition.variants;
type SelectSizeValues = keyof typeof recipe.definition.variants.size;
type _slotsAreExact = Assert<Equal<SelectSlots, "root" | "trigger" | "popup" | "item">>;
type _variantAxesAreExact = Assert<Equal<SelectVariantAxes, "size">>;
type _sizeValuesAreExact = Assert<Equal<SelectSizeValues, "md">>;
type _motionSlotIsExact = Assert<Equal<typeof motion.definition.slot, "popup">>;

const item: SelectSlots = "item";
const popup: SelectSlots = "popup";
const medium: SelectSizeValues = "md";
// @ts-expect-error Select uses the canonical item Slot, not the stale option alias.
const staleOption: SelectSlots = "option";
// @ts-expect-error Select declares no tone Variant axis.
const unknownAxis: SelectVariantAxes = "tone";
// @ts-expect-error The N25 fixture intentionally declares only the md size value.
const unknownSize: SelectSizeValues = "lg";

const selectId: "select" = SELECT_APPEARANCE.id;
const defaultSize: "md" = SELECT_APPEARANCE.defaultVariants.size;
const selectedState: "selected" = SELECT_APPEARANCE.states[4].state;
const reducedMotionCondition: "preference.reducedMotion" = SELECT_APPEARANCE.conditions[0].when.all[0];
const motionId: "select.popup.visibility" = SELECT_POPUP_MOTION.id;
const motionRecipe: "select" = SELECT_POPUP_MOTION.recipeId;
const motionSlot: "popup" = SELECT_POPUP_MOTION.slot;
const appearance = normalized.appearance;
const trace: CollisionTrace = normalized.trace;
const motionIr: MotionIR = motion.motion;
const bundle: Readonly<{ readonly appearance: typeof appearance; readonly motion: MotionIR; readonly trace: CollisionTrace }> = {
  appearance,
  motion: motionIr,
  trace,
};

void item;
void popup;
void medium;
void staleOption;
void unknownAxis;
void unknownSize;
void selectId;
void defaultSize;
void selectedState;
void reducedMotionCondition;
void motionId;
void motionRecipe;
void motionSlot;
void bundle;
