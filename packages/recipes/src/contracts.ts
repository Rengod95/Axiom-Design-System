import type { AppearanceStyle } from "@axiom/appearance-schema";

export type SlotAppearance = Readonly<Record<string, AppearanceStyle>>;

export type VariantDefinitions = Readonly<
  Record<string, Readonly<Record<string, SlotAppearance>>>
>;

export type StateDefinitions = Readonly<
  Record<string, Readonly<Record<string, AppearanceStyle>>>
>;

export interface CompoundCondition {
  readonly variants?: Readonly<Record<string, string>>;
  readonly states?: Readonly<Record<string, readonly string[]>>;
}

export interface CompoundVariant {
  readonly when: CompoundCondition;
  readonly apply: SlotAppearance;
}

export interface RecipeDefinition {
  readonly id: string;
  readonly slots: readonly [string, ...string[]];
  readonly base: SlotAppearance;
  readonly variants: VariantDefinitions;
  readonly defaultVariants: Readonly<Record<string, string>>;
  readonly states: StateDefinitions;
  readonly compoundVariants: readonly CompoundVariant[];
}

export type RecipeSlot<TRecipe extends RecipeDefinition> =
  TRecipe["slots"][number];

export type RecipeVariantSelection<TRecipe extends RecipeDefinition> = Readonly<{
  [TVariant in keyof TRecipe["variants"]]?: keyof TRecipe["variants"][TVariant] &
    string;
}>;

export type RecipeStateSelection<TRecipe extends RecipeDefinition> = Readonly<
  {
    [TSlot in RecipeSlot<TRecipe>]?: readonly (
      TSlot extends keyof TRecipe["states"]
        ? keyof TRecipe["states"][TSlot] & string
        : never
    )[];
  }
>;

export interface RecipeResolutionInput<TRecipe extends RecipeDefinition> {
  readonly variants?: RecipeVariantSelection<TRecipe>;
  readonly states?: RecipeStateSelection<TRecipe>;
  readonly adapterExtension?: Partial<
    Record<RecipeSlot<TRecipe>, AppearanceStyle>
  >;
  readonly consumerOverride?: Partial<
    Record<RecipeSlot<TRecipe>, AppearanceStyle>
  >;
}
