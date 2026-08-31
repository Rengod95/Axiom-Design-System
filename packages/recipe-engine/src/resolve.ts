import type {
  AppearancePropertyName,
  AppearanceStyle,
  AppearanceValue,
  MutableAppearanceStyle,
} from "@axiom/appearance-schema";
import type {
  RecipeDefinition,
  RecipeResolutionInput,
  SlotAppearance,
} from "@axiom/recipes";
import { assertRecipeDefinition } from "./validate.js";

export type MergeStage =
  | "base"
  | "variant"
  | "state"
  | "compound"
  | "adapter-extension"
  | "consumer-override";

export interface ResolutionTraceEntry {
  readonly stage: MergeStage;
  readonly source: string;
  readonly slot: string;
  readonly property: AppearancePropertyName;
  readonly value: AppearanceValue<AppearancePropertyName>;
}

export interface RecipeResolution<TSlot extends string = string> {
  readonly recipeId: string;
  readonly variants: Readonly<Record<string, string>>;
  readonly states: Readonly<Record<string, readonly string[]>>;
  readonly slots: Readonly<Record<TSlot, AppearanceStyle>>;
  readonly trace: readonly ResolutionTraceEntry[];
}

const compoundMatches = (
  variants: Readonly<Record<string, string>>,
  states: Readonly<Record<string, readonly string[]>>,
  condition: {
    readonly variants?: Readonly<Record<string, string>>;
    readonly states?: Readonly<Record<string, readonly string[]>>;
  },
): boolean =>
  Object.entries(condition.variants ?? {}).every(
    ([variant, option]) => variants[variant] === option,
  ) &&
  Object.entries(condition.states ?? {}).every(([slot, expected]) =>
    expected.every((state) => states[slot]?.includes(state) === true),
  );

export const resolveRecipe = <TRecipe extends RecipeDefinition>(
  recipe: TRecipe,
  input: RecipeResolutionInput<TRecipe> = {},
): RecipeResolution<TRecipe["slots"][number]> => {
  assertRecipeDefinition(recipe);

  const selectedVariants: Record<string, string> = {};
  for (const [variantName, options] of Object.entries(recipe.variants)) {
    const requested = (input.variants as Record<string, string> | undefined)?.[
      variantName
    ];
    const selected = requested ?? recipe.defaultVariants[variantName];
    if (!selected || !options[selected]) {
      throw new RangeError(
        `Recipe ${recipe.id} has no ${variantName} option named ${String(selected)}`,
      );
    }
    selectedVariants[variantName] = selected;
  }

  const selectedStates: Record<string, readonly string[]> = {};
  for (const slot of recipe.slots) {
    const requested =
      (input.states as Record<string, readonly string[]> | undefined)?.[slot] ?? [];
    const requestedSet = new Set(requested);
    const stateDefinitions = recipe.states[slot] ?? {};
    for (const state of requested) {
      if (!stateDefinitions[state]) {
        throw new RangeError(`Recipe ${recipe.id} slot ${slot} has no ${state} state`);
      }
    }
    selectedStates[slot] = Object.keys(stateDefinitions).filter((state) =>
      requestedSet.has(state),
    );
  }

  const slots = Object.fromEntries(
    recipe.slots.map((slot) => [slot, {} as MutableAppearanceStyle]),
  ) as Record<string, MutableAppearanceStyle>;
  const trace: ResolutionTraceEntry[] = [];

  const merge = (stage: MergeStage, source: string, styles: SlotAppearance): void => {
    for (const slot of recipe.slots) {
      const appearance = styles[slot];
      if (!appearance) continue;
      for (const [property, value] of Object.entries(appearance) as [
        AppearancePropertyName,
        AppearanceValue<AppearancePropertyName>,
      ][]) {
        slots[slot]![property] = value as never;
        trace.push({ stage, source, slot, property, value });
      }
    }
  };

  merge("base", "base", recipe.base);

  for (const [variantName, options] of Object.entries(recipe.variants)) {
    const option = selectedVariants[variantName]!;
    merge("variant", `${variantName}.${option}`, options[option]!);
  }

  for (const slot of recipe.slots) {
    for (const state of selectedStates[slot] ?? []) {
      merge("state", `${slot}.${state}`, {
        [slot]: recipe.states[slot]![state]!,
      });
    }
  }

  recipe.compoundVariants.forEach((compound, index) => {
    if (compoundMatches(selectedVariants, selectedStates, compound.when)) {
      merge("compound", `compoundVariants[${index}]`, compound.apply);
    }
  });

  merge(
    "adapter-extension",
    "adapterExtension",
    (input.adapterExtension ?? {}) as SlotAppearance,
  );
  merge(
    "consumer-override",
    "consumerOverride",
    (input.consumerOverride ?? {}) as SlotAppearance,
  );

  return {
    recipeId: recipe.id,
    variants: selectedVariants,
    states: selectedStates,
    slots: slots as Record<TRecipe["slots"][number], AppearanceStyle>,
    trace,
  };
};
