import { describe, expect, it } from "vitest";
import type { DtcgGroup } from "./contracts.js";
import { resolveTokens } from "./resolver.js";

describe("resolveTokens", () => {
  it("resolves aliases without losing the semantic token path", () => {
    const source = {
      color: {
        $type: "color",
        blue: { $value: "#2563eb" },
        action: { $value: "{color.blue}" },
      },
    } satisfies DtcgGroup;

    expect(resolveTokens(source)["color.action"]).toMatchObject({
      path: "color.action",
      type: "color",
      value: "#2563eb",
      cssVariable: "--axiom-color-action",
    });
  });

  it("rejects cycles", () => {
    const source = {
      color: {
        $type: "color",
        a: { $value: "{color.b}" },
        b: { $value: "{color.a}" },
      },
    } satisfies DtcgGroup;

    expect(() => resolveTokens(source)).toThrow("Circular token alias");
  });
});
