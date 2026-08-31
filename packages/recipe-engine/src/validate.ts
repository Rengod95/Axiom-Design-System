import { validateAppearanceStyle } from "@axiom/appearance-schema";
import type { RecipeDefinition, SlotAppearance } from "@axiom/recipes";

export interface RecipeValidationIssue {
  readonly path: string;
  readonly message: string;
}

const disallowedKeys = new Set([
  "className",
  "css",
  "selector",
  "style",
  "render",
  "component",
]);

const validateSerializable = (
  value: unknown,
  path: string,
  issues: RecipeValidationIssue[],
  ancestors: Set<object>,
): void => {
  if (
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint" ||
    value === undefined
  ) {
    issues.push({ path, message: `Non-serializable ${typeof value} value` });
    return;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push({ path, message: "Non-finite number" });
    return;
  }
  if (typeof value !== "object" || value === null) return;
  if (ancestors.has(value)) {
    issues.push({ path, message: "Cyclic value" });
    return;
  }

  ancestors.add(value);
  if (!Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      issues.push({ path, message: "Only plain objects are allowed" });
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (disallowedKeys.has(key)) {
      issues.push({ path: `${path}.${key}`, message: "Renderer escape hatch is forbidden" });
    }
    validateSerializable(child, `${path}.${key}`, issues, ancestors);
  }
  ancestors.delete(value);
};

const validateSlotAppearance = (
  value: SlotAppearance,
  validSlots: ReadonlySet<string>,
  path: string,
  issues: RecipeValidationIssue[],
): void => {
  for (const [slot, appearance] of Object.entries(value)) {
    if (!validSlots.has(slot)) {
      issues.push({ path: `${path}.${slot}`, message: "Unknown recipe slot" });
      continue;
    }
    issues.push(...validateAppearanceStyle(appearance, `${path}.${slot}`));
  }
};

export const validateRecipeDefinition = (
  recipe: RecipeDefinition,
): readonly RecipeValidationIssue[] => {
  const issues: RecipeValidationIssue[] = [];
  validateSerializable(recipe, recipe.id || "recipe", issues, new Set());

  const slots = new Set(recipe.slots);
  if (slots.size !== recipe.slots.length) {
    issues.push({ path: `${recipe.id}.slots`, message: "Slot names must be unique" });
  }
  if (recipe.slots.length === 1 && recipe.slots[0] !== "root") {
    issues.push({
      path: `${recipe.id}.slots[0]`,
      message: "A single-slot recipe must use the root slot",
    });
  }
  if (!slots.has("root")) {
    issues.push({ path: `${recipe.id}.slots`, message: "Every recipe requires a root slot" });
  }

  validateSlotAppearance(recipe.base, slots, `${recipe.id}.base`, issues);

  for (const [variantName, options] of Object.entries(recipe.variants)) {
    if (Object.keys(options).length === 0) {
      issues.push({
        path: `${recipe.id}.variants.${variantName}`,
        message: "A variant requires at least one option",
      });
    }
    for (const [option, appearance] of Object.entries(options)) {
      validateSlotAppearance(
        appearance,
        slots,
        `${recipe.id}.variants.${variantName}.${option}`,
        issues,
      );
    }
  }

  for (const [variantName, option] of Object.entries(recipe.defaultVariants)) {
    if (!recipe.variants[variantName]?.[option]) {
      issues.push({
        path: `${recipe.id}.defaultVariants.${variantName}`,
        message: "Default references an unknown variant option",
      });
    }
  }

  for (const [slot, states] of Object.entries(recipe.states)) {
    if (!slots.has(slot)) {
      issues.push({ path: `${recipe.id}.states.${slot}`, message: "Unknown recipe slot" });
      continue;
    }
    for (const [state, appearance] of Object.entries(states)) {
      issues.push(
        ...validateAppearanceStyle(
          appearance,
          `${recipe.id}.states.${slot}.${state}`,
        ),
      );
    }
  }

  recipe.compoundVariants.forEach((compound, index) => {
    for (const [variantName, option] of Object.entries(
      compound.when.variants ?? {},
    )) {
      if (!recipe.variants[variantName]?.[option]) {
        issues.push({
          path: `${recipe.id}.compoundVariants[${index}].when.variants.${variantName}`,
          message: "Unknown variant condition",
        });
      }
    }
    for (const [slot, states] of Object.entries(compound.when.states ?? {})) {
      for (const state of states) {
        if (!recipe.states[slot]?.[state]) {
          issues.push({
            path: `${recipe.id}.compoundVariants[${index}].when.states.${slot}`,
            message: `Unknown state condition: ${state}`,
          });
        }
      }
    }
    validateSlotAppearance(
      compound.apply,
      slots,
      `${recipe.id}.compoundVariants[${index}].apply`,
      issues,
    );
  });

  return issues;
};

export const assertRecipeDefinition = (
  recipe: RecipeDefinition,
): void => {
  const issues = validateRecipeDefinition(recipe);
  if (issues.length > 0) {
    throw new TypeError(
      issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"),
    );
  }
};
