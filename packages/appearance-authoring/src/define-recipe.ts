import {
  CSSGrammarValidator,
  PROPERTY_DIAGNOSTIC_CODE,
  type EffectiveCSSPropertyRegistry,
} from "@axiom/css-property-profile";
import { createRecipeKernel } from "@axiom/recipe-kernel";

import type {
  CSSRecipeAuthoringInput,
  CSSRecipeAuthoringPort,
  CSSRecipeDefinition,
  DefinedCSSRecipe,
} from "./contracts.js";
import {
  CSS_RECIPE_DIAGNOSTIC_PHASE,
  CSS_RECIPE_DIAGNOSTIC_SEVERITY,
  CSS_RECIPE_FALLBACK_SOURCE,
  CSS_RECIPE_PROFILE_ID,
} from "./constants.js";
import { CSSRecipeAuthoringError } from "./contracts.js";
import { validateCSSRecipeDefinition } from "./validation.js";

/** Binds explicit profile registries to a CSS-aware Recipe Kernel without reading repository state. */
export const createCSSRecipeAuthoring = (
  input: CSSRecipeAuthoringInput,
): CSSRecipeAuthoringPort => {
  if (input.propertyRegistry.profile.id !== CSS_RECIPE_PROFILE_ID) throw new CSSRecipeAuthoringError([{
    code: PROPERTY_DIAGNOSTIC_CODE.PROFILE_INPUT_MISMATCH,
    severity: CSS_RECIPE_DIAGNOSTIC_SEVERITY,
    phase: CSS_RECIPE_DIAGNOSTIC_PHASE,
    message: `CSS Recipe authoring requires profile '${CSS_RECIPE_PROFILE_ID}'.`,
    source: CSS_RECIPE_FALLBACK_SOURCE,
    target: input.propertyRegistry.profile.id,
  }]);
  const grammarValidator = new CSSGrammarValidator(input.propertyRegistry as EffectiveCSSPropertyRegistry, {
    ...(input.enabledExperimentalProperties === undefined
      ? {}
      : { enabledExperimentalProperties: input.enabledExperimentalProperties }),
  });
  const kernel = createRecipeKernel();

  return Object.freeze({
    /** Captures only CSS-authoring data that has passed both Kernel and configured profile checks. */
    defineRecipe<const TDefinition extends CSSRecipeDefinition>(
      definition: TDefinition,
    ): DefinedCSSRecipe<TDefinition> {
      const recipe = kernel.define(definition as never);
      validateCSSRecipeDefinition(recipe.definition, input, grammarValidator);
      return recipe as DefinedCSSRecipe<TDefinition>;
    },
  });
};
