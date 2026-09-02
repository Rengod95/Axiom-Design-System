import {
  RECIPE_KERNEL_DIAGNOSTIC_CODE,
  RECIPE_KERNEL_DIAGNOSTIC_PHASE,
  RECIPE_KERNEL_DIAGNOSTIC_SEVERITY,
  RECIPE_KERNEL_ERROR_MESSAGE,
} from "./constants.js";
import type { ConditionExpression } from "@axiom/condition-registry";

/** A source location retained by structural validation diagnostics. */
export interface RecipeKernelSourceLocation {
  readonly file: string;
  readonly pointer: string;
}

/** A stable structural diagnostic emitted by the Recipe Kernel. */
export interface RecipeKernelDiagnostic {
  readonly code: typeof RECIPE_KERNEL_DIAGNOSTIC_CODE[keyof typeof RECIPE_KERNEL_DIAGNOSTIC_CODE];
  readonly severity: typeof RECIPE_KERNEL_DIAGNOSTIC_SEVERITY;
  readonly phase: typeof RECIPE_KERNEL_DIAGNOSTIC_PHASE;
  readonly message: string;
  readonly location: RecipeKernelSourceLocation;
  readonly target?: string;
}

/** A recursively JSON-safe value accepted by the structural Kernel boundary. */
export type RecipeKernelJsonValue =
  | boolean | null | number | string
  | readonly RecipeKernelJsonValue[]
  | { readonly [key: string]: RecipeKernelJsonValue };

/** A structural object or ordered-array style fragment before JSON safety is checked. */
export type RecipeStyleFragment = object;

type RecipeStyleValueIsJsonSafe<TValue> =
  Exclude<TValue, undefined> extends boolean | null | number | string ? true
    : Exclude<TValue, undefined> extends (...args: never[]) => unknown ? false
      : Exclude<TValue, undefined> extends readonly (infer TItem)[] ? RecipeStyleValueIsJsonSafe<TItem>
        : Exclude<TValue, undefined> extends object ? RecipeStyleObjectIsJsonSafe<Exclude<TValue, undefined>>
          : false;
type RecipeStyleObjectIsJsonSafe<TObject extends object> = false extends {
  readonly [TKey in keyof TObject]: RecipeStyleValueIsJsonSafe<TObject[TKey]>;
}[keyof TObject] ? false : true;
type RecipeStyleIsJsonSafe<TStyle> = TStyle extends readonly (infer TItem)[] ? RecipeStyleValueIsJsonSafe<TItem>
  : TStyle extends (...args: never[]) => unknown ? false
    : TStyle extends object ? RecipeStyleObjectIsJsonSafe<TStyle> : false;

/** Narrows a style generic to a recursively JSON-safe object or ordered array without an index signature. */
export type RecipeStyleConstraint<TStyle> = RecipeStyleIsJsonSafe<TStyle> extends true ? unknown : never;

/** The literal Slot union derived from a definition's slots tuple. */
export type RecipeSlotName<TDefinition> =
  TDefinition extends { readonly slots: readonly (infer TSlot)[] } ? TSlot & string : never;

/** A Slot-keyed style map supplied by the downstream style profile. */
export type RecipeSlotStyleMap<TStyle extends RecipeStyleFragment, TSlot extends string> =
  Partial<Readonly<Record<TSlot, TStyle>>>;

/** A canonical State case attached to one Recipe Slot. */
export interface RecipeStateCase<TStyle extends RecipeStyleFragment> {
  readonly equals: boolean | string;
  readonly apply: TStyle;
}

/** A slot-local State rule retained independently from environment Conditions. */
export interface RecipeStateRule<TStyle extends RecipeStyleFragment, TSlot extends string> {
  readonly slot: TSlot;
  readonly state: string;
  readonly cases: readonly RecipeStateCase<TStyle>[];
  readonly source?: string;
}

/** The N18 generated Condition-expression reference used by structural Recipe rules. */
export type RecipeConditionExpression = ConditionExpression;

/** Variant and State constraints used by a compound structural rule. */
export interface RecipeCompoundPredicate<TSlot extends string> {
  readonly variants?: Readonly<Record<string, string | readonly string[]>>;
  readonly states?: Partial<Readonly<Record<TSlot, Readonly<Record<string, boolean | string>>>>>;
}

/** A compound rule with AND between fields and flat OR arrays inside a field. */
export interface RecipeCompoundVariant<TStyle extends RecipeStyleFragment, TSlot extends string> {
  readonly when: RecipeCompoundPredicate<TSlot>;
  readonly apply: RecipeSlotStyleMap<TStyle, TSlot>;
  readonly source?: string;
}

/** A registered-environment Condition rule whose apply map remains slot-local. */
export interface RecipeConditionRule<TStyle extends RecipeStyleFragment, TSlot extends string> {
  readonly when: RecipeConditionExpression;
  readonly variants?: Readonly<Record<string, string | readonly string[]>>;
  readonly states?: Partial<Readonly<Record<TSlot, Readonly<Record<string, boolean | string>>>>>;
  readonly apply: RecipeSlotStyleMap<TStyle, TSlot>;
  readonly source?: string;
}

/** The renderer-neutral Recipe definition accepted by a specialized port. */
export interface RecipeKernelDefinition<
  TStyle extends RecipeStyleFragment,
  TSlots extends readonly string[] = readonly string[],
> {
  readonly id: string;
  readonly slots: TSlots;
  readonly base?: RecipeSlotStyleMap<TStyle, TSlots[number]>;
  readonly variants?: Readonly<Record<string, Readonly<Record<string, RecipeSlotStyleMap<TStyle, TSlots[number]>>>>>;
  readonly defaultVariants?: Readonly<Record<string, string>>;
  readonly states?: readonly RecipeStateRule<TStyle, TSlots[number]>[];
  readonly compoundVariants?: readonly RecipeCompoundVariant<TStyle, TSlots[number]>[];
  readonly conditions?: readonly RecipeConditionRule<TStyle, TSlots[number]>[];
  readonly source?: string;
}

type RecipeVariantMap<TDefinition> =
  TDefinition extends { readonly variants?: infer TVariants }
    ? TVariants extends Readonly<Record<string, unknown>> ? TVariants : {} : {};
type RecipeDefaultVariantMap<TDefinition> =
  TDefinition extends { readonly defaultVariants?: infer TDefaults }
    ? TDefaults extends Readonly<Record<string, unknown>> ? TDefaults : {} : {};
type RecipeVariantAxisName<TDefinition> = keyof RecipeVariantMap<TDefinition> & string;
type RecipeVariantValue<TDefinition, TAxis extends RecipeVariantAxisName<TDefinition>> =
  keyof RecipeVariantMap<TDefinition>[TAxis] & string;

/** Infers required and defaulted Variant selections from a literal definition. */
export type RecipeVariantSelection<TDefinition extends RecipeKernelDefinition<RecipeStyleFragment>> = {
  readonly [TAxis in RecipeVariantAxisName<TDefinition> as
    TAxis extends keyof RecipeDefaultVariantMap<TDefinition> ? never : TAxis]:
    RecipeVariantValue<TDefinition, TAxis>;
} & {
  readonly [TAxis in RecipeVariantAxisName<TDefinition> as
    TAxis extends keyof RecipeDefaultVariantMap<TDefinition> ? TAxis : never]?:
    RecipeVariantValue<TDefinition, TAxis>;
};

/** A source-order-preserving Slot and style pair in the Kernel snapshot. */
export interface RecipeSlotStyleRecord<TStyle extends RecipeStyleFragment, TSlot extends string> {
  readonly slot: TSlot;
  readonly style: TStyle;
}

/** A source-order-preserving Variant value in the Kernel snapshot. */
export interface RecipeVariantValueSnapshot<TStyle extends RecipeStyleFragment, TSlot extends string> {
  readonly value: string;
  readonly apply: readonly RecipeSlotStyleRecord<TStyle, TSlot>[];
}

/** A source-order-preserving Variant axis in the Kernel snapshot. */
export interface RecipeVariantAxisSnapshot<TStyle extends RecipeStyleFragment, TSlot extends string> {
  readonly name: string;
  readonly defaultValue?: string;
  readonly values: readonly RecipeVariantValueSnapshot<TStyle, TSlot>[];
}

type SlotStyleRecords<TMap, TStyle extends RecipeStyleFragment, TSlot extends string> =
  TMap extends Readonly<Record<string, unknown>>
    ? { readonly [TKey in keyof TMap & TSlot]: RecipeSlotStyleRecord<Extract<TMap[TKey], TStyle>, TKey> }[keyof TMap & TSlot]
    : RecipeSlotStyleRecord<TStyle, TSlot>;
type VariantAxes<TVariants, TDefaults, TStyle extends RecipeStyleFragment, TSlot extends string> =
  TVariants extends Readonly<Record<string, unknown>>
    ? { readonly [TAxis in keyof TVariants & string]: {
        readonly name: TAxis;
        readonly defaultValue?: TAxis extends keyof TDefaults ? Extract<TDefaults[TAxis], string> : never;
        readonly values: readonly (TVariants[TAxis] extends Readonly<Record<string, unknown>>
          ? { readonly [TValue in keyof TVariants[TAxis] & string]: {
              readonly value: TValue;
              readonly apply: readonly SlotStyleRecords<TVariants[TAxis][TValue], TStyle, TSlot>[];
            } }[keyof TVariants[TAxis] & string]
          : RecipeVariantValueSnapshot<TStyle, TSlot>)[];
      } }[keyof TVariants & string]
    : RecipeVariantAxisSnapshot<TStyle, TSlot>;
type DefinitionField<TDefinition, TKey extends PropertyKey, TFallback> =
  TDefinition extends { readonly [TProperty in TKey]?: infer TValue } ? TValue extends readonly unknown[] ? TValue[number] : TValue : TFallback;

/** A JSON-safe structural snapshot, deliberately not CSS Appearance IR. */
export type RecipeKernelSnapshot<
  TStyle extends RecipeStyleFragment,
  TSlot extends string,
  TDefinition extends RecipeKernelDefinition<TStyle> = RecipeKernelDefinition<TStyle, readonly TSlot[]>,
> = {
  readonly id: string;
  readonly slots: readonly TSlot[];
  readonly base: readonly SlotStyleRecords<TDefinition extends { readonly base?: infer TValue } ? TValue : undefined, TStyle, TSlot>[];
  readonly variantAxes: readonly VariantAxes<RecipeVariantMap<TDefinition>, RecipeDefaultVariantMap<TDefinition>, TStyle, TSlot>[];
  readonly stateRules: readonly DefinitionField<TDefinition, "states", RecipeStateRule<TStyle, TSlot>>[];
  readonly compoundVariants: readonly DefinitionField<TDefinition, "compoundVariants", RecipeCompoundVariant<TStyle, TSlot>>[];
  readonly conditions: readonly DefinitionField<TDefinition, "conditions", RecipeConditionRule<TStyle, TSlot>>[];
  readonly source?: string;
};

/** A validated definition and detached, callback-free structural snapshot. */
export interface DefinedRecipe<
  TStyle extends RecipeStyleFragment,
  TDefinition extends RecipeKernelDefinition<TStyle>,
> {
  readonly definition: TDefinition;
  readonly snapshot: RecipeKernelSnapshot<TStyle, RecipeSlotName<TDefinition>, TDefinition>;
}

type SlotMapIsValid<TValue, TSlot extends string> = TValue extends undefined ? true
  : TValue extends Readonly<Record<PropertyKey, unknown>>
    ? Exclude<keyof TValue, TSlot> extends never ? true : false : false;
type VariantMapsAreValid<TValue, TSlot extends string> = TValue extends undefined ? true
  : TValue extends Readonly<Record<string, unknown>>
    ? false extends {
        readonly [TAxis in keyof TValue]: TValue[TAxis] extends Readonly<Record<string, infer TApply>>
          ? SlotMapIsValid<TApply, TSlot> : false;
      }[keyof TValue] ? false : true : false;
type StateRulesAreValid<TValue, TSlot extends string> = TValue extends undefined ? true
  : TValue extends readonly (infer TRule)[]
    ? false extends (TRule extends { readonly slot: infer TRuleSlot }
        ? TRuleSlot extends TSlot ? true : false : false) ? false : true : false;
type RuleMapsAreValid<TValue, TSlot extends string> = TValue extends undefined ? true
  : TValue extends readonly (infer TRule)[]
    ? false extends (TRule extends { readonly apply: infer TApply }
        ? SlotMapIsValid<TApply, TSlot> : false) ? false : true : false;
type RuleStateMapsAreValid<TValue, TSlot extends string> = TValue extends undefined ? true
  : TValue extends readonly (infer TRule)[]
    ? false extends (TRule extends { readonly when: { readonly states?: infer TStates } }
        ? SlotMapIsValid<TStates, TSlot>
        : TRule extends { readonly states?: infer TStates } ? SlotMapIsValid<TStates, TSlot> : true)
      ? false : true : false;
type DefaultVariantsAreValid<TDefinition> =
  TDefinition extends { readonly defaultVariants?: infer TDefaults }
    ? TDefaults extends undefined ? true
      : TDefaults extends Readonly<Record<string, unknown>>
        ? false extends { readonly [TAxis in keyof TDefaults]:
            TAxis extends keyof RecipeVariantMap<TDefinition>
              ? TDefaults[TAxis] extends keyof RecipeVariantMap<TDefinition>[TAxis] ? true : false
              : false;
          }[keyof TDefaults] ? false : true
        : false
    : true;
type CompoundVariantValueIsValid<TSelected, TCandidates> =
  TSelected extends string ? TSelected extends keyof TCandidates ? true : false
    : TSelected extends readonly (infer TValue)[] ? Exclude<TValue, keyof TCandidates> extends never ? true : false
      : false;
type CompoundPredicateVariantsAreValid<TPredicate, TVariants> =
  TPredicate extends { readonly variants?: infer TSelections }
    ? TSelections extends undefined ? true
      : TSelections extends Readonly<Record<string, unknown>>
        ? false extends { readonly [TAxis in keyof TSelections]:
            TAxis extends keyof TVariants ? CompoundVariantValueIsValid<TSelections[TAxis], TVariants[TAxis]> : false;
          }[keyof TSelections] ? false : true
        : false
    : true;
type CompoundVariantsAreValid<TDefinition> =
  TDefinition extends { readonly compoundVariants?: infer TRules }
    ? TRules extends undefined ? true
      : TRules extends readonly (infer TRule)[]
        ? false extends (TRule extends { readonly when: infer TPredicate }
            ? CompoundPredicateVariantsAreValid<TPredicate, RecipeVariantMap<TDefinition>> : false) ? false : true
        : false
    : true;
type DefinitionSlotsAreValid<TDefinition> =
  SlotMapIsValid<TDefinition extends { readonly base?: infer TValue } ? TValue : undefined, RecipeSlotName<TDefinition>> extends true
  ? VariantMapsAreValid<TDefinition extends { readonly variants?: infer TValue } ? TValue : undefined, RecipeSlotName<TDefinition>> extends true
  ? StateRulesAreValid<TDefinition extends { readonly states?: infer TValue } ? TValue : undefined, RecipeSlotName<TDefinition>> extends true
  ? RuleMapsAreValid<TDefinition extends { readonly compoundVariants?: infer TValue } ? TValue : undefined, RecipeSlotName<TDefinition>> extends true
  ? RuleMapsAreValid<TDefinition extends { readonly conditions?: infer TValue } ? TValue : undefined, RecipeSlotName<TDefinition>> extends true
  ? RuleStateMapsAreValid<TDefinition extends { readonly compoundVariants?: infer TValue } ? TValue : undefined, RecipeSlotName<TDefinition>> extends true
  ? RuleStateMapsAreValid<TDefinition extends { readonly conditions?: infer TValue } ? TValue : undefined, RecipeSlotName<TDefinition>> extends true
  ? DefaultVariantsAreValid<TDefinition> extends true
  ? CompoundVariantsAreValid<TDefinition> extends true ? true : false : false : false : false : false : false : false : false : false;
type DeclaredSlotConstraint<TDefinition> = DefinitionSlotsAreValid<TDefinition> extends true ? unknown : never;

/** The Axiom-owned structural port specialized by a downstream JSON style profile. */
export interface RecipeKernelPort<TStyle extends RecipeStyleFragment = RecipeStyleFragment> {
  /** Validates and captures a literal-preserving renderer-neutral definition. */
  define<const TDefinition extends RecipeKernelDefinition<TStyle>>(
    definition: TDefinition & DeclaredSlotConstraint<TDefinition>,
  ): DefinedRecipe<TStyle, TDefinition>;
}

/** A typed failure that carries every structural Recipe diagnostic. */
export class RecipeKernelError extends Error {
  readonly diagnostics: readonly RecipeKernelDiagnostic[];

  /** Creates an error for one or more structural Recipe diagnostics. */
  constructor(diagnostics: readonly RecipeKernelDiagnostic[], options?: ErrorOptions) {
    super(RECIPE_KERNEL_ERROR_MESSAGE, options);
    this.name = RecipeKernelError.name;
    this.diagnostics = diagnostics;
  }
}
