import { describe, expect, it } from "vitest";

import {
  REQUIRED_SEMANTIC_COLOR_ROLE_IDS,
  SPEC_DIAGNOSTIC_CODE,
} from "../constants.js";
import { runSemanticValidator } from "../semantic-validators.js";

const colorRoles = REQUIRED_SEMANTIC_COLOR_ROLE_IDS.map((id) => ({
  id,
  purpose: `${id} purpose`,
}));

describe("semantic Token vocabulary", () => {
  it("rejects duplicate family paths with different descriptions", () => {
    const diagnostics = runSemanticValidator("semantic-token-vocabulary", {
      colorRoles,
      extendedScaleFamilies: [],
      orderedScaleFamilies: [],
      spaceFamilies: [
        { path: "space.semantic.layout.gutter", purpose: "Container gutter." },
        { path: "space.semantic.layout.gutter", purpose: "Column gutter." },
      ],
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.DUPLICATE_SEMANTIC_VOCABULARY_PATH,
    );
  });

  it("requires the complete ordered top-level color role set", () => {
    const diagnostics = runSemanticValidator("semantic-token-vocabulary", {
      colorRoles: colorRoles.slice(0, 3),
      extendedScaleFamilies: [],
      orderedScaleFamilies: [],
      spaceFamilies: [],
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.SEMANTIC_COLOR_ROLE_SET,
    );
  });

  it("rejects non-deterministic family path order", () => {
    const diagnostics = runSemanticValidator("semantic-token-vocabulary", {
      colorRoles,
      extendedScaleFamilies: [],
      orderedScaleFamilies: [],
      spaceFamilies: [
        { path: "space.semantic.layout.stack.gap", purpose: "Stack gap." },
        { path: "space.semantic.layout.gutter", purpose: "Container gutter." },
      ],
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.SEMANTIC_VOCABULARY_ORDER,
    );
  });
});
