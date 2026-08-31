import { describe, expect, it } from "vitest";
import { activeStates, buttonStateOrder } from "./contracts.js";

describe("activeStates", () => {
  it("normalizes renderer state into contract order", () => {
    expect(
      activeStates(buttonStateOrder, {
        disabled: false,
        focusVisible: true,
        hovered: true,
        pressed: false,
      }),
    ).toEqual(["hovered", "focusVisible"]);
  });
});
