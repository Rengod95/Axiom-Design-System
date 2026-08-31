import { describe, expect, it } from "vitest";
import { projectButtonClassName } from "./button.js";
import { projectSelectClassNames } from "./select.js";

describe("React Aria appearance projections", () => {
  it("projects Button render state without leaking it into recipe variants", () => {
    const defaultClassName = projectButtonClassName({
      tone: "accent",
      size: "md",
      state: {
        isDisabled: false,
        isFocusVisible: false,
        isHovered: false,
        isPressed: false,
      },
    });
    const hoveredClassName = projectButtonClassName({
      tone: "accent",
      size: "md",
      state: {
        isDisabled: false,
        isFocusVisible: false,
        isHovered: true,
        isPressed: false,
      },
    });

    expect(hoveredClassName).not.toBe(defaultClassName);
  });

  it("projects Select root, trigger, and item states independently", () => {
    const classes = projectSelectClassNames({
      size: "md",
      selectState: { isDisabled: false, isInvalid: false, isOpen: true },
      triggerState: {
        isDisabled: false,
        isFocusVisible: true,
        isHovered: false,
      },
      itemState: {
        isDisabled: false,
        isFocused: true,
        isHovered: false,
        isSelected: true,
      },
    });

    expect(classes.trigger).toMatch(/ax_/);
    expect(classes.item).toMatch(/ax_/);
    expect(classes.trigger).not.toBe(classes.item);
  });
});
