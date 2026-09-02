import { describe, expect, it } from "vitest";

import {
  REQUIRED_CANONICAL_STATE_IDS,
  REQUIRED_CONDITION_IDS,
  SPEC_DIAGNOSTIC_CODE,
} from "../constants.js";
import type { SemanticValidationContext } from "../types.js";
import { validateAppearanceIr } from "./appearance-ir-validator.js";

const declaration = (stage: string, slot = "root") => ({
  property: "display",
  value: { kind: "css", value: "block" },
  important: false,
  origin: { recipeId: "button", slot, stage, source: "button.ts:1" },
});

const context: SemanticValidationContext = {
  registries: {
    "canonical-state-registry": {
      states: REQUIRED_CANONICAL_STATE_IDS.map((id) => ({
        id,
        usage: ["appearance"],
        valueType: id === "orientation" ? "enum" : "boolean",
        ...(id === "orientation" ? { values: ["horizontal", "vertical"] } : {}),
      })),
    },
    "condition-registry": {
      conditions: REQUIRED_CONDITION_IDS.map((id) => ({ id })),
    },
    "css-profile-input": {
      id: "axiom-css",
      webrefInputDigest: "sha256:b26a0501c6ee972ca343d2f91be620aaef0c719ec5602a2a70f317fd22135d75",
    },
  },
};

const validIr = {
  schemaVersion: "0.1",
  profile: "axiom-css",
  profileInputDigest: "sha256:b26a0501c6ee972ca343d2f91be620aaef0c719ec5602a2a70f317fd22135d75",
  recipeId: "button",
  slots: ["root"],
  base: [{ slot: "root", declarations: [declaration("base")] }],
  variantAxes: [{
    name: "tone",
    defaultValue: "neutral",
    values: [
      { value: "neutral", apply: [] },
      { value: "brand", apply: [] },
    ],
  }],
  stateRules: [{
    slot: "root",
    state: "pressed",
    cases: [{ equals: true, apply: [declaration("state")] }],
  }],
  compoundRules: [],
  conditionRules: [{
    when: { all: ["preference.reducedMotion"] },
    apply: [],
  }],
};

describe("Appearance IR semantic validation", () => {
  it("accepts registered slots, variants, states, conditions, and provenance", () => {
    expect(validateAppearanceIr(validIr, context)).toEqual([]);
  });

  it("rejects unknown slots, duplicate values, and invalid defaults", () => {
    const diagnostics = validateAppearanceIr({
      ...validIr,
      base: [{ slot: "label", declarations: [declaration("base", "label")] }],
      variantAxes: [{
        name: "tone",
        defaultValue: "danger",
        values: [
          { value: "neutral", apply: [] },
          { value: "neutral", apply: [] },
        ],
      }],
    }, context);

    expect(diagnostics.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_SLOT,
      SPEC_DIAGNOSTIC_CODE.DUPLICATE_VARIANT_VALUE,
      SPEC_DIAGNOSTIC_CODE.INVALID_VARIANT_DEFAULT,
    ]));
  });

  it("rejects unknown states and declaration provenance mismatches", () => {
    const diagnostics = validateAppearanceIr({
      ...validIr,
      stateRules: [{
        slot: "root",
        state: "isPressed",
        cases: [{ equals: true, apply: [declaration("variant")] }],
      }],
    }, context);

    expect(diagnostics.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_STATE,
      SPEC_DIAGNOSTIC_CODE.APPEARANCE_ORIGIN_MISMATCH,
    ]));
  });

  it("rejects unknown condition IDs", () => {
    const diagnostics = validateAppearanceIr({
      ...validIr,
      conditionRules: [{ when: { all: ["viewport.raw.900px"] }, apply: [] }],
    }, context);

    expect(diagnostics.map((entry) => entry.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.UNKNOWN_CONDITION,
    );
    expect(diagnostics[0]?.location?.pointer).toBe("/conditionRules/0/when/all/0");
  });

  it("rejects state values that violate the canonical State definition", () => {
    const diagnostics = validateAppearanceIr({
      ...validIr,
      stateRules: [
        {
          slot: "root",
          state: "pressed",
          cases: [{ equals: "active", apply: [] }],
        },
        {
          slot: "root",
          state: "orientation",
          cases: [{ equals: "diagonal", apply: [] }],
        },
      ],
    }, context);

    expect(diagnostics.filter(
      (entry) => entry.code === SPEC_DIAGNOSTIC_CODE.INVALID_APPEARANCE_STATE_VALUE,
    )).toHaveLength(2);
  });

  it("rejects a profile or digest that does not match the pinned CSS input", () => {
    const diagnostics = validateAppearanceIr({
      ...validIr,
      profileInputDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }, context);

    expect(diagnostics.map((entry) => entry.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.APPEARANCE_PROFILE_MISMATCH,
    );
  });
});
