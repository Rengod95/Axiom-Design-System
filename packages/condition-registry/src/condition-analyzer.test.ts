import { describe, expect, it } from "vitest";

import { analyzeConditionPair, analyzeConditionExpression, type ConditionRegistry } from "./index.js";

const registry = {
  schemaVersion: "0.1",
  containers: [{ id: "component", cssName: "axiom-component" }],
  conditions: [
    { id: "viewport.width.md", kind: "viewport", feature: "width", comparison: ">=", value: { kind: "token", path: "breakpoint.md" } },
    { id: "viewport.width.belowMd", kind: "viewport", feature: "width", comparison: "<", value: { kind: "token", path: "breakpoint.md" } },
    { id: "viewport.width.lg", kind: "viewport", feature: "width", comparison: ">=", value: { kind: "token", path: "breakpoint.lg" } },
    { id: "preference.reducedMotion", kind: "preference", feature: "prefers-reduced-motion", equals: "reduce" },
  ],
} as const;

const thresholds = { "breakpoint.md": 48, "breakpoint.lg": 64 } as const;

describe("Condition analysis", () => {
  it("rejects an impossible bounded conjunction", () => {
    expect(analyzeConditionExpression({ all: ["viewport.width.lg", "viewport.width.belowMd"] }, registry, thresholds))
      .toMatchObject({ satisfiable: false });
  });

  it("rejects conflicting values of the same preference feature", () => {
    const preferenceRegistry = {
      ...registry,
      conditions: [
        ...registry.conditions,
        { id: "preference.noReducedMotion", kind: "preference", feature: "prefers-reduced-motion", equals: "no-preference" },
      ],
    } as unknown as ConditionRegistry;

    expect(analyzeConditionExpression(
      { all: ["preference.reducedMotion", "preference.noReducedMotion"] },
      preferenceRegistry,
      thresholds,
    )).toMatchObject({ satisfiable: false });
  });

  it("reports pairwise equivalent, subset, overlap, and disjoint relations deterministically", () => {
    expect(analyzeConditionPair(
      { all: ["viewport.width.md"] },
      { all: ["viewport.width.md"] },
      registry,
      thresholds,
    ).relation).toBe("equivalent");
    expect(analyzeConditionPair(
      { all: ["viewport.width.lg"] },
      { all: ["viewport.width.md"] },
      registry,
      thresholds,
    ).relation).toBe("subset");
    expect(analyzeConditionPair(
      { all: ["viewport.width.md"] },
      { all: ["preference.reducedMotion"] },
      registry,
      thresholds,
    ).relation).toBe("overlap");
    expect(analyzeConditionPair(
      { all: ["viewport.width.md"] },
      { all: ["viewport.width.belowMd"] },
      registry,
      thresholds,
    ).relation).toBe("disjoint");
  });
});
