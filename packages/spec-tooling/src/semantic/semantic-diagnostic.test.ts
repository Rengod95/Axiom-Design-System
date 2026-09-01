import { describe, expect, it } from "vitest";

import { CONDITION_DIAGNOSTIC_PHASE } from "../constants.js";
import { createSemanticDiagnosticFactory } from "./semantic-diagnostic.js";

describe("semantic diagnostic factory", () => {
  it("applies the owned phase and common in-memory location shape", () => {
    const diagnostic = createSemanticDiagnosticFactory(
      CONDITION_DIAGNOSTIC_PHASE,
    );

    expect(diagnostic("AXC1000", "Invalid Condition.", "/conditions/0")).toEqual({
      code: "AXC1000",
      severity: "error",
      phase: "condition",
      message: "Invalid Condition.",
      location: { file: "<memory>", pointer: "/conditions/0" },
    });
  });
});
