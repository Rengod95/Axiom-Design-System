export interface BehaviorContract<
  TCapability extends string,
  TState extends string,
> {
  readonly id: string;
  readonly capabilities: readonly TCapability[];
  readonly observableStates: readonly TState[];
}

export const buttonBehaviorContract = {
  id: "button",
  capabilities: ["press", "keyboardActivation", "focus", "disabled"],
  observableStates: ["hovered", "pressed", "focusVisible", "disabled"],
} as const satisfies BehaviorContract<string, string>;

export const selectBehaviorContract = {
  id: "select",
  capabilities: [
    "singleSelection",
    "keyboardNavigation",
    "typeahead",
    "focusManagement",
    "labeling",
    "validation",
    "disabled",
  ],
  observableStates: [
    "hovered",
    "focused",
    "focusVisible",
    "open",
    "selected",
    "invalid",
    "disabled",
  ],
} as const satisfies BehaviorContract<string, string>;

export interface ButtonBehaviorSnapshot {
  readonly hovered: boolean;
  readonly pressed: boolean;
  readonly focusVisible: boolean;
  readonly disabled: boolean;
}

export interface SelectRootBehaviorSnapshot {
  readonly disabled: boolean;
  readonly invalid: boolean;
}

export interface SelectTriggerBehaviorSnapshot
  extends SelectRootBehaviorSnapshot {
  readonly hovered: boolean;
  readonly focusVisible: boolean;
  readonly open: boolean;
}

export interface SelectItemBehaviorSnapshot {
  readonly hovered: boolean;
  readonly focused: boolean;
  readonly selected: boolean;
  readonly disabled: boolean;
}

export const activeStates = <TState extends string>(
  order: readonly TState[],
  snapshot: Readonly<Record<TState, boolean>>,
): readonly TState[] => order.filter((state) => snapshot[state]);

export const buttonStateOrder = [
  "hovered",
  "pressed",
  "focusVisible",
  "disabled",
] as const;

export const selectRootStateOrder = ["disabled", "invalid"] as const;
export const selectTriggerStateOrder = [
  "hovered",
  "focusVisible",
  "open",
  "invalid",
  "disabled",
] as const;
export const selectItemStateOrder = [
  "hovered",
  "focused",
  "selected",
  "disabled",
] as const;
