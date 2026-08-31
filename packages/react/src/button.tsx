import { atomicClassManifest, compileRecipeResolution } from "@axiom/adapter-tailwind";
import type { AppearanceStyle } from "@axiom/appearance-schema";
import { activeStates, buttonStateOrder } from "@axiom/behavior";
import { resolveRecipe } from "@axiom/recipe-engine";
import {
  buttonRecipe,
  type ButtonSize,
  type ButtonTone,
} from "@axiom/recipes";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  type ButtonRenderProps,
} from "react-aria-components";

export interface ButtonProps
  extends Omit<AriaButtonProps, "className" | "style"> {
  readonly tone?: ButtonTone;
  readonly size?: ButtonSize;
  readonly appearanceOverride?: AppearanceStyle;
}

export interface ButtonAppearanceProjection {
  readonly tone: ButtonTone;
  readonly size: ButtonSize;
  readonly state: Pick<
    ButtonRenderProps,
    "isHovered" | "isPressed" | "isFocusVisible" | "isDisabled"
  >;
  readonly appearanceOverride?: AppearanceStyle;
}

export const projectButtonClassName = ({
  tone,
  size,
  state,
  appearanceOverride,
}: ButtonAppearanceProjection): string => {
  const states = activeStates(buttonStateOrder, {
    hovered: state.isHovered,
    pressed: state.isPressed,
    focusVisible: state.isFocusVisible,
    disabled: state.isDisabled,
  });
  const resolution = resolveRecipe(buttonRecipe, {
    variants: { tone, size },
    states: { root: states },
    ...(appearanceOverride === undefined
      ? {}
      : { consumerOverride: { root: appearanceOverride } }),
  });
  return compileRecipeResolution(resolution, atomicClassManifest).root;
};

export const Button = ({
  tone = "accent",
  size = "md",
  appearanceOverride,
  ...props
}: ButtonProps) => (
  <AriaButton
    {...props}
    className={(state) =>
      projectButtonClassName({
        tone,
        size,
        state,
        ...(appearanceOverride === undefined ? {} : { appearanceOverride }),
      })
    }
  />
);
