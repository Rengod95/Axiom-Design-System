import { describe, expect, it } from "vitest";

import { SPEC_DIAGNOSTIC_CODE } from "../constants.js";
import type { SemanticValidationContext } from "../types.js";
import { validateCollisionTrace } from "./collision-trace-validator.js";

const profileDigest = "sha256:b26a0501c6ee972ca343d2f91be620aaef0c719ec5602a2a70f317fd22135d75";

const context: SemanticValidationContext = {
  registries: {
    "css-profile-input": { id: "axiom-css", webrefInputDigest: profileDigest },
  },
};

describe("Collision trace semantic validation", () => {
  it("rejects a forged root profile identity", () => {
    const diagnostics = validateCollisionTrace({
      schemaVersion: "0.1",
      profile: "forged-css",
      profileInputDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      recipeId: "button",
      entries: [],
    }, context);

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.APPEARANCE_PROFILE_MISMATCH,
    );
  });

  it("rejects the forbidden earlier-shorthand to later-longhand reset direction", () => {
    const diagnostics = validateCollisionTrace({
      schemaVersion: "0.1",
      profile: "axiom-css",
      profileInputDigest: profileDigest,
      recipeId: "button",
      entries: [{
        id: "collision-0001",
        relation: "reset-longhand",
        affectedProperty: "background",
        earlier: {
          property: "background",
          origin: { recipeId: "button", slot: "root", stage: "base", source: "button.ts#/base/root/background" },
          policyProvenance: [],
          applicability: { variants: [], states: [] },
        },
        later: {
          property: "background-color",
          origin: { recipeId: "button", slot: "root", stage: "base", source: "button.ts#/base/root/backgroundColor" },
          policyProvenance: [],
          applicability: { variants: [], states: [] },
        },
        winner: "later",
      }],
    }, {
      registries: {
        "css-profile-input": { id: "axiom-css", webrefInputDigest: profileDigest },
        "css-effective-property-registry": {
          properties: [
            { name: "background", policy: { provenance: [] }, longhands: ["background-color"], resetLonghands: ["background-color"] },
            { name: "background-color", policy: { provenance: [] }, longhands: [], resetLonghands: [] },
          ],
        },
      },
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_RELATION_EVIDENCE,
    );
  });
});
