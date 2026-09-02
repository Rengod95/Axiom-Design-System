import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID,
  SPEC_DIAGNOSTIC_CODE,
} from "../constants.js";
import { canonicalJsonDigest } from "../canonical-json.js";
import { validateMotionIr } from "./motion-ir-validator.js";

const specRoot = fileURLToPath(new URL("../../../../spec/", import.meta.url));
const readSpecJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(`${specRoot}${path}`, "utf8")) as unknown;
const PROFILE_DIGEST = "sha256:b26a0501c6ee972ca343d2f91be620aaef0c719ec5602a2a70f317fd22135d75";
const CONDITION_REGISTRY = {
  schemaVersion: "0.1",
  containers: [{ id: "component", cssName: "axiom-component" }],
  conditions: [{ id: "preference.reducedMotion", kind: "preference", feature: "prefers-reduced-motion", equals: "reduce" }],
} as const;
const CONDITION_DIGEST = canonicalJsonDigest(CONDITION_REGISTRY);

const context = {
  registries: {
    "canonical-state-registry": {
      states: [
        { id: "pressed", usage: ["motion"], valueType: "boolean" },
        { id: "orientation", usage: ["motion"], valueType: "enum", values: ["horizontal", "vertical"] },
      ],
    },
    "condition-registry": CONDITION_REGISTRY,
    "css-profile-input": { id: "axiom-css", webrefInputDigest: PROFILE_DIGEST },
    "css-effective-property-registry": {
      properties: [
        { name: "opacity", policy: { motion: "interpolable" } },
        { name: "display", policy: { motion: "not-animatable" } },
        { name: "visibility", policy: { motion: "discrete" } },
      ],
    },
    [FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID]: {
      contexts: [{
        tokens: [
          { id: "duration.semantic.fast", domain: "duration" },
          { id: "easing.semantic.enter", domain: "easing" },
        ],
      }],
    },
  },
} as const;

const validMotion = {
  schemaVersion: "0.1",
  profile: "axiom-css",
  profileInputDigest: PROFILE_DIGEST,
  conditionRegistryDigest: CONDITION_DIGEST,
  id: "dialog.popup.enter",
  recipeId: "dialog",
  slot: "popup",
  phases: [{
    phase: "enter",
    sequence: [{
      at: { kind: "afterPrevious" },
      tracks: [{
        property: "opacity",
        allowDiscrete: false,
        keyframes: [
          { offset: 0, value: { kind: "css", value: "0" } },
          { offset: 1, value: { kind: "css", value: "1" } },
        ],
      }],
      transition: {
        type: "tween",
        duration: { kind: "token", path: "duration.semantic.fast" },
        easing: { kind: "token", path: "easing.semantic.enter" },
      },
    }],
  }],
  reducedMotion: { strategy: "disable" },
} as const;

describe("Motion IR semantic validation", () => {
  it("accepts a profile-bound Motion IR with registered state, properties, and timing Tokens", () => {
    expect(validateMotionIr(validMotion, context)).toEqual([]);
  });

  it("requires stateChange targets to declare Motion usage in the canonical registry", () => {
    const diagnostics = validateMotionIr({
      ...validMotion,
      phases: [{
        phase: "stateChange",
        state: { name: "pressed", from: false, to: true },
        sequence: validMotion.phases[0].sequence,
      }],
    }, {
      ...context,
      registries: {
        ...context.registries,
        "canonical-state-registry": {
          states: [{ id: "pressed", usage: ["appearance"], valueType: "boolean" }],
        },
      },
    });

    expect(diagnostics.map((entry) => entry.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.UNKNOWN_MOTION_STATE,
    );
  });

  it("rejects non-animatable and unapproved discrete tracks", () => {
    const diagnostics = validateMotionIr({
      ...validMotion,
      phases: [{
        ...validMotion.phases[0],
        sequence: [{
          ...validMotion.phases[0].sequence[0],
          tracks: [
            { ...validMotion.phases[0].sequence[0].tracks[0], property: "display" },
            { ...validMotion.phases[0].sequence[0].tracks[0], property: "visibility" },
          ],
        }],
      }],
    }, context);

    expect(diagnostics.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      SPEC_DIAGNOSTIC_CODE.MOTION_PROPERTY_NOT_ANIMATABLE,
      SPEC_DIAGNOSTIC_CODE.DISCRETE_MOTION_OPT_IN_REQUIRED,
    ]));
  });

  it("warns when an explicitly approved discrete track is retained for backend review", () => {
    const diagnostics = validateMotionIr({
      ...validMotion,
      phases: [{
        ...validMotion.phases[0],
        sequence: [{
          ...validMotion.phases[0].sequence[0],
          tracks: [{
            ...validMotion.phases[0].sequence[0].tracks[0],
            property: "visibility",
            allowDiscrete: true,
          }],
        }],
      }],
    }, context);

    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: SPEC_DIAGNOSTIC_CODE.DISCRETE_MOTION_OPT_IN_ACCEPTED,
        severity: "warning",
      }),
    ]));
  });

  it("rejects a state transition, Token, or offset that violates its source authority", () => {
    const diagnostics = validateMotionIr({
      ...validMotion,
      phases: [{
        phase: "stateChange",
        state: { name: "orientation", from: "sideways", to: "vertical" },
        sequence: [{
          ...validMotion.phases[0].sequence[0],
          tracks: [{
            ...validMotion.phases[0].sequence[0].tracks[0],
            keyframes: [
              { offset: 0.5, value: { kind: "css", value: "0" } },
              { offset: 0.25, value: { kind: "css", value: "1" } },
            ],
          }],
          transition: {
            ...validMotion.phases[0].sequence[0].transition,
            duration: { kind: "token", path: "easing.semantic.enter" },
          },
        }],
      }],
    }, context);

    expect(diagnostics.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      SPEC_DIAGNOSTIC_CODE.INVALID_MOTION_STATE_VALUE,
      SPEC_DIAGNOSTIC_CODE.INVALID_MOTION_KEYFRAME_OFFSET,
      SPEC_DIAGNOSTIC_CODE.MOTION_TOKEN_DOMAIN_MISMATCH,
    ]));
  });

  it("enforces CSS grammar, value kinds, and configured Token bindings for every keyframe", async () => {
    const [stateRegistry, conditionRegistry, profile, propertyRegistry, tokenManifest] = await Promise.all([
      readSpecJson("state/canonical-state-registry.json"),
      readSpecJson("condition/condition-registry.json"),
      readSpecJson("css/profile-input-manifest.json"),
      readSpecJson("css/effective-property-registry.json"),
      readSpecJson("token/foundation-resolved-token-manifest.json"),
    ]);
    const profileContext = {
      registries: {
        "canonical-state-registry": stateRegistry,
        "condition-registry": conditionRegistry,
        "css-profile-input": profile,
        "css-effective-property-registry": propertyRegistry,
        [FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID]: tokenManifest,
      },
    };
    const validTrack = validMotion.phases[0].sequence[0].tracks[0];
    const validSegment = validMotion.phases[0].sequence[0];
    const invalidGrammar = {
      ...validMotion,
      conditionRegistryDigest: canonicalJsonDigest(conditionRegistry),
      phases: [{
        ...validMotion.phases[0],
        sequence: [{
          ...validSegment,
          tracks: [{
            ...validTrack,
            keyframes: [
              { ...validTrack.keyframes[0], value: { kind: "css", value: "green" } },
              validTrack.keyframes[1],
            ],
          }],
        }],
      }],
    };
    const illegalTokenBinding = {
      ...validMotion,
      conditionRegistryDigest: canonicalJsonDigest(conditionRegistry),
      phases: [{
        ...validMotion.phases[0],
        sequence: [{
          ...validSegment,
          tracks: [{
            ...validTrack,
            property: "transform",
            keyframes: [
              { ...validTrack.keyframes[0], value: { kind: "token", path: "opacity.semantic.visible" } },
              validTrack.keyframes[1],
            ],
          }],
        }],
      }],
    };

    expect(validateMotionIr(invalidGrammar, profileContext).map((entry) => entry.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.MOTION_KEYFRAME_GRAMMAR_MISMATCH,
    );
    expect(validateMotionIr(illegalTokenBinding, profileContext).map((entry) => entry.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.MOTION_KEYFRAME_TOKEN_BINDING_INVALID,
    );
  });
});
