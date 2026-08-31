import { describe, expect, it } from "vitest";
import type { AppearanceStyle } from "./contracts.js";
import { tokenRef } from "./contracts.js";
import { validateAppearanceStyle } from "./validate.js";

describe("AppearanceStyle", () => {
  it("uses explicit serializable token references", () => {
    const style = {
      backgroundColor: tokenRef("color.action.background.default"),
      display: "inline-flex",
    } satisfies AppearanceStyle;

    expect(JSON.parse(JSON.stringify(style))).toEqual(style);
    expect(validateAppearanceStyle(style)).toEqual([]);
  });

  it("rejects renderer escape hatches at runtime", () => {
    expect(validateAppearanceStyle({ className: "bg-blue-600" })).toEqual([
      {
        path: "appearance.className",
        message: "Unknown appearance property",
      },
    ]);
  });
});
