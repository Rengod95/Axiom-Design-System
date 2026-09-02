import { RecipeKernelError } from "./contracts.js";
import type {
  DefinedRecipe,
  RecipeKernelDefinition,
  RecipeKernelPort,
  RecipeStyleConstraint,
  RecipeStyleFragment,
} from "./contracts.js";
import { createRecipeKernelSnapshot } from "./definition.js";
import { copyRecipeDefinition, validateRecipeDefinition } from "./validation.js";

/** Creates a generic Recipe Kernel port specialized by a JSON-object style profile. */
export const createRecipeKernel = <TStyle extends RecipeStyleFragment = RecipeStyleFragment>(
  ..._styleConstraint: RecipeStyleConstraint<TStyle> extends never ? [never] : []
): RecipeKernelPort<TStyle> => ({
  define<const TDefinition extends RecipeKernelDefinition<TStyle>>(
    definition: TDefinition,
  ): DefinedRecipe<TStyle, TDefinition> {
    const diagnostics = validateRecipeDefinition(definition);
    if (diagnostics.length > 0) throw new RecipeKernelError(diagnostics);
    const capturedDefinition = copyRecipeDefinition(definition);
    return Object.freeze({
      definition: capturedDefinition,
      snapshot: Object.freeze(createRecipeKernelSnapshot<TStyle, TDefinition>(capturedDefinition)),
    });
  },
});
