import { atomicClassManifest, compileRecipeResolution } from "@axiom/adapter-tailwind";
import type { AppearanceStyle } from "@axiom/appearance-schema";
import {
  activeStates,
  selectItemStateOrder,
  selectRootStateOrder,
  selectTriggerStateOrder,
} from "@axiom/behavior";
import { resolveRecipe } from "@axiom/recipe-engine";
import {
  selectRecipe,
  type SelectSize,
  type SelectSlot,
} from "@axiom/recipes";
import type { ReactNode } from "react";
import {
  Button as AriaButton,
  Label as AriaLabel,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  Popover as AriaPopover,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  type ButtonRenderProps,
  type ListBoxItemRenderProps,
  type SelectProps as AriaSelectProps,
  type SelectRenderProps,
} from "react-aria-components";

export interface SelectOption {
  readonly id: string | number;
  readonly label: string;
  readonly disabled?: boolean;
}

export type SelectAppearanceOverrides = Readonly<
  Partial<Record<SelectSlot, AppearanceStyle>>
>;

export interface SelectProps
  extends Omit<
    AriaSelectProps<SelectOption>,
    "children" | "className" | "style"
  > {
  readonly label: ReactNode;
  readonly items: readonly SelectOption[];
  readonly size?: SelectSize;
  readonly appearanceOverrides?: SelectAppearanceOverrides;
}

interface SelectProjectionInput {
  readonly size: SelectSize;
  readonly selectState: Pick<
    SelectRenderProps,
    "isDisabled" | "isInvalid" | "isOpen"
  >;
  readonly triggerState?: Pick<
    ButtonRenderProps,
    "isHovered" | "isFocusVisible" | "isDisabled"
  >;
  readonly itemState?: Pick<
    ListBoxItemRenderProps,
    "isHovered" | "isFocused" | "isSelected" | "isDisabled"
  >;
  readonly appearanceOverrides?: SelectAppearanceOverrides;
}

export const projectSelectClassNames = ({
  size,
  selectState,
  triggerState,
  itemState,
  appearanceOverrides,
}: SelectProjectionInput): Readonly<Record<SelectSlot, string>> => {
  const rootStates = activeStates(selectRootStateOrder, {
    disabled: selectState.isDisabled,
    invalid: selectState.isInvalid,
  });
  const triggerStates = activeStates(selectTriggerStateOrder, {
    hovered: triggerState?.isHovered ?? false,
    focusVisible: triggerState?.isFocusVisible ?? false,
    open: selectState.isOpen,
    invalid: selectState.isInvalid,
    disabled: triggerState?.isDisabled ?? selectState.isDisabled,
  });
  const itemStates = activeStates(selectItemStateOrder, {
    hovered: itemState?.isHovered ?? false,
    focused: itemState?.isFocused ?? false,
    selected: itemState?.isSelected ?? false,
    disabled: itemState?.isDisabled ?? false,
  });

  const resolution = resolveRecipe(selectRecipe, {
    variants: { size },
    states: {
      root: rootStates,
      label: selectState.isInvalid ? ["invalid"] : [],
      trigger: triggerStates,
      value: [],
      indicator: selectState.isOpen ? ["open"] : [],
      popover: [],
      listbox: [],
      item: itemStates,
    },
    ...(appearanceOverrides === undefined
      ? {}
      : { consumerOverride: appearanceOverrides }),
  });
  return compileRecipeResolution(resolution, atomicClassManifest);
};

export const Select = ({
  label,
  items,
  size = "md",
  appearanceOverrides,
  ...props
}: SelectProps) => (
  <AriaSelect
    {...props}
    className={(selectState) =>
      projectSelectClassNames({
        size,
        selectState,
        ...(appearanceOverrides === undefined ? {} : { appearanceOverrides }),
      }).root
    }
  >
    {(selectState) => {
      const classes = projectSelectClassNames({
        size,
        selectState,
        ...(appearanceOverrides === undefined ? {} : { appearanceOverrides }),
      });

      return (
        <>
          <AriaLabel className={classes.label}>{label}</AriaLabel>
          <AriaButton
            className={(triggerState) =>
              projectSelectClassNames({
                size,
                selectState,
                triggerState,
                ...(appearanceOverrides === undefined
                  ? {}
                  : { appearanceOverrides }),
              }).trigger
            }
          >
            <AriaSelectValue<SelectOption> className={classes.value} />
            <span aria-hidden="true" className={classes.indicator}>
              ▾
            </span>
          </AriaButton>
          <AriaPopover className={classes.popover}>
            <AriaListBox<SelectOption>
              className={classes.listbox}
              items={items}
            >
              {(item) => (
                <AriaListBoxItem<SelectOption>
                  id={item.id}
                  textValue={item.label}
                  {...(item.disabled === undefined
                    ? {}
                    : { isDisabled: item.disabled })}
                  className={(itemState) =>
                    projectSelectClassNames({
                      size,
                      selectState,
                      itemState,
                      ...(appearanceOverrides === undefined
                        ? {}
                        : { appearanceOverrides }),
                    }).item
                  }
                >
                  {item.label}
                </AriaListBoxItem>
              )}
            </AriaListBox>
          </AriaPopover>
        </>
      );
    }}
  </AriaSelect>
);
