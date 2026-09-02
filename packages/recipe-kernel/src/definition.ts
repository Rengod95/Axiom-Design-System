import type {
  RecipeCompoundPredicate,
  RecipeKernelDefinition,
  RecipeKernelSnapshot,
  RecipeSlotName,
  RecipeSlotStyleMap,
  RecipeSlotStyleRecord,
  RecipeStyleFragment,
  RecipeVariantAxisSnapshot,
} from "./contracts.js";

/** Converts a Slot map to an explicit array while retaining validated source order. */
const snapshotSlotStyles = <TStyle extends RecipeStyleFragment, TSlot extends string>(
  styles: RecipeSlotStyleMap<TStyle, TSlot> | undefined,
): readonly RecipeSlotStyleRecord<TStyle, TSlot>[] =>
  Object.entries(styles ?? {}).map(([slot, style]) => ({ slot: slot as TSlot, style: style as TStyle }));

/** Converts Variant maps to explicit ordered axes and values without CSS normalization. */
const snapshotVariants = <TStyle extends RecipeStyleFragment, TSlots extends readonly string[]>(
  definition: RecipeKernelDefinition<TStyle, TSlots>,
): readonly RecipeVariantAxisSnapshot<TStyle, TSlots[number]>[] =>
  Object.entries(definition.variants ?? {}).map(([name, values]) => ({
    name,
    ...(definition.defaultVariants?.[name] === undefined ? {} : { defaultValue: definition.defaultVariants[name] }),
    values: Object.entries(values).map(([value, apply]) => ({ value, apply: snapshotSlotStyles(apply) })),
  }));

/** Builds the callback-free, source-order-preserving Kernel snapshot. */
export const createRecipeKernelSnapshot = <
  TStyle extends RecipeStyleFragment,
  TDefinition extends RecipeKernelDefinition<TStyle>,
>(definition: TDefinition): RecipeKernelSnapshot<TStyle, RecipeSlotName<TDefinition>, TDefinition> => ({
  id: definition.id,
  slots: [...definition.slots] as unknown as readonly RecipeSlotName<TDefinition>[],
  base: snapshotSlotStyles(definition.base) as unknown as RecipeKernelSnapshot<TStyle, RecipeSlotName<TDefinition>, TDefinition>["base"],
  variantAxes: snapshotVariants(definition) as unknown as RecipeKernelSnapshot<TStyle, RecipeSlotName<TDefinition>, TDefinition>["variantAxes"],
  stateRules: [...(definition.states ?? [])] as unknown as RecipeKernelSnapshot<TStyle, RecipeSlotName<TDefinition>, TDefinition>["stateRules"],
  compoundVariants: [...(definition.compoundVariants ?? [])] as unknown as RecipeKernelSnapshot<TStyle, RecipeSlotName<TDefinition>, TDefinition>["compoundVariants"],
  conditions: [...(definition.conditions ?? [])] as unknown as RecipeKernelSnapshot<TStyle, RecipeSlotName<TDefinition>, TDefinition>["conditions"],
  ...(definition.source === undefined ? {} : { source: definition.source }),
});

/** Matches a validated compound predicate with AND across fields and flat OR arrays. */
export const matchesRecipeCompound = <TSlot extends string>(
  predicate: RecipeCompoundPredicate<TSlot>,
  selection: {
    readonly variants: Readonly<Record<string, string | undefined>>;
    readonly states: Partial<Readonly<Record<TSlot, Readonly<Record<string, boolean | string | undefined>>>>>;
  },
): boolean => {
  const variantsMatch = Object.entries(predicate.variants ?? {}).every(([axis, expected]) => {
    const actual = selection.variants[axis];
    return typeof expected === "string" ? actual === expected : expected.includes(actual ?? "");
  });
  return variantsMatch && (Object.entries(predicate.states ?? {}) as unknown as readonly [
    TSlot, Readonly<Record<string, boolean | string>>,
  ][]).every(([slot, expectedStates]) =>
    Object.entries(expectedStates).every(([state, expected]) => selection.states[slot]?.[state] === expected));
};
