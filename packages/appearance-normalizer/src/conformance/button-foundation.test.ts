import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { CSSRecipeAuthoringError, createCSSRecipeAuthoring } from "@axiom/appearance-authoring";
import { MotionAuthoringError, createMotionAuthoring } from "@axiom/motion-schema";
import { canonicalJson, validateSpecificationValue } from "@axiom/spec-tooling";

import { BUTTON_APPEARANCE } from "../../../../fixtures/button/appearance.js";
import { BUTTON_PRESSED_MOTION } from "../../../../fixtures/button/motion.js";
import { BUTTON_INVALID_TOKEN_APPEARANCE } from "../../../../fixtures/button/negative/invalid-token.js";
import { BUTTON_RESET_LONGHAND_APPEARANCE } from "../../../../fixtures/button/negative/reset-longhand.js";
import { BUTTON_UNKNOWN_SLOT_MOTION } from "../../../../fixtures/button/negative/unknown-slot-motion.js";
import { createAppearanceNormalizer } from "../index.js";
import { createButtonAppearanceInput, createButtonMotionInput } from "./button-authorities.test-support.js";

/** Reads a normalized contract fixture only for equality assertions in the Button vertical proof. */
const readFixture = (relativePath: string): unknown => JSON.parse(readFileSync(
  new URL(`../../../../spec/fixtures/${relativePath}`, import.meta.url),
  "utf8",
));
const SPEC_ROOT = fileURLToPath(new URL("../../../../spec/", import.meta.url));

/** Validates one N15, N16, or N22 artifact before and after its JSON transport boundary. */
const expectValidArtifact = async (
  schema: string,
  semanticValidator: "css-appearance-ir" | "css-collision-trace" | "motion-ir",
  artifact: unknown,
): Promise<void> => {
  for (const candidate of [artifact, JSON.parse(JSON.stringify(artifact))]) {
    const result = await validateSpecificationValue(SPEC_ROOT, schema, semanticValidator, candidate);
    expect(result.schemaValid).toBe(true);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
  }
};

/** Runs the full public N20 through N23 path with a fresh cloned authority context. */
const normalizeButton = async (definition = BUTTON_APPEARANCE) => {
  const input = createButtonAppearanceInput();
  const recipe = createCSSRecipeAuthoring(input).defineRecipe(definition);
  const normalized = createAppearanceNormalizer(input).normalize(recipe);
  if (normalized.appearance === undefined) throw new Error("Expected valid Button Appearance.");
  return {
    normalized,
    motion: createMotionAuthoring(await createButtonMotionInput(normalized.appearance)).defineMotion(BUTTON_PRESSED_MOTION),
  };
};

describe("Button Foundation conformance", () => {
  it("retains the authored Button identities used by the vertical proof", () => {
    expect(BUTTON_APPEARANCE.id).toBe("button");
    expect(BUTTON_PRESSED_MOTION.recipeId).toBe("button");
  });

  it("drives the public N20 through N23 path into the existing Button contracts", async () => {
    const appearanceInput = createButtonAppearanceInput();
    let recipe;
    try {
      recipe = createCSSRecipeAuthoring(appearanceInput).defineRecipe(BUTTON_APPEARANCE);
    } catch (error) {
      const diagnostics = typeof error === "object" && error !== null && "diagnostics" in error ? error.diagnostics : error;
      throw new Error(`Button Recipe definition failed: ${JSON.stringify(diagnostics)}`);
    }
    const normalized = createAppearanceNormalizer(appearanceInput).normalize(recipe);
    if (normalized.appearance === undefined) throw new Error(`Button Appearance normalization failed: ${JSON.stringify(normalized.diagnostics)}`);
    const motion = createMotionAuthoring(await createButtonMotionInput(normalized.appearance)).defineMotion(BUTTON_PRESSED_MOTION);

    expect(normalized.appearance).toEqual(readFixture("css-appearance-ir/positive/button.json"));
    expect(motion.motion).toEqual(readFixture("motion-ir/positive/button-pressed-state-change.json"));
    expect(normalized.trace).toEqual(readFixture("css-collision-trace/positive/button-shorthand-longhand.json"));
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toContain("AXP1301");
    expect(motion.diagnostics).toEqual([expect.objectContaining({ code: "AXM1012", severity: "warning" })]);
    expect(normalized.trace.entries[0]?.id).toBe("collision-0001");
    await expectValidArtifact("https://axiom.dev/schemas/css/appearance-ir/0.1", "css-appearance-ir", normalized.appearance);
    await expectValidArtifact("https://axiom.dev/schemas/motion/ir/0.1", "motion-ir", motion.motion);
    await expectValidArtifact("https://axiom.dev/schemas/css/collision-trace/0.1", "css-collision-trace", normalized.trace);
    const bundle = { appearance: normalized.appearance, motion: motion.motion, trace: normalized.trace };
    expect(JSON.parse(canonicalJson(bundle))).toEqual(bundle);
    expect(canonicalJson(bundle)).toBe(canonicalJson(JSON.parse(readFileSync(
      new URL("button-foundation.golden.json", import.meta.url),
      "utf8",
    ))));
  });

  it("rejects a Button Token from the wrong direct CSS domain before normalization", () => {
    const input = createButtonAppearanceInput();
    try {
      createCSSRecipeAuthoring(input).defineRecipe(BUTTON_INVALID_TOKEN_APPEARANCE);
      throw new Error("Expected the wrong-domain Button Token to be rejected.");
    } catch (error) {
      expect(error).toBeInstanceOf(CSSRecipeAuthoringError);
      expect((error as CSSRecipeAuthoringError).diagnostics).toEqual([expect.objectContaining({
        code: "AXP1103",
        pointer: "/base/root/color",
        slot: "root",
        stage: "base",
        property: "color",
        source: "fixtures/button/negative/invalid-token.ts",
        tokenId: "duration.semantic.instant",
        target: "duration.semantic.instant",
      })]);
    }
  });

  it("withholds Button Appearance IR when a later shorthand resets an earlier longhand", () => {
    const input = createButtonAppearanceInput();
    const recipe = createCSSRecipeAuthoring(input).defineRecipe(BUTTON_RESET_LONGHAND_APPEARANCE);
    const normalized = createAppearanceNormalizer(input).normalize(recipe);
    expect(normalized.appearance).toBeUndefined();
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toContain("AXP1302");
    expect(normalized.trace).toEqual({
      schemaVersion: "0.1",
      profile: "axiom-css",
      profileInputDigest: "sha256:b26a0501c6ee972ca343d2f91be620aaef0c719ec5602a2a70f317fd22135d75",
      recipeId: "button-reset-longhand",
      entries: [{
        id: "collision-0001",
        relation: "reset-longhand",
        affectedProperty: "background-blend-mode",
        earlier: {
          property: "background-blend-mode",
          origin: {
            recipeId: "button-reset-longhand",
            slot: "root",
            stage: "base",
            source: "fixtures/button/negative/reset-longhand.ts#/base/root/0/value",
          },
          policyProvenance: [{ rule: "standard", source: "status-default" }],
          applicability: { variants: [], states: [] },
        },
        later: {
          property: "background",
          origin: {
            recipeId: "button-reset-longhand",
            slot: "root",
            stage: "base",
            source: "fixtures/button/negative/reset-longhand.ts#/base/root/1/value",
          },
          policyProvenance: [{ rule: "standard", source: "status-default" }],
          applicability: { variants: [], states: [] },
        },
        winner: "later",
      }],
    });
    return expectValidArtifact("https://axiom.dev/schemas/css/collision-trace/0.1", "css-collision-trace", normalized.trace);
  });

  it("rejects Button Motion that targets a slot absent from the authenticated Appearance", async () => {
    const input = createButtonAppearanceInput();
    const recipe = createCSSRecipeAuthoring(input).defineRecipe(BUTTON_APPEARANCE);
    const normalized = createAppearanceNormalizer(input).normalize(recipe);
    if (normalized.appearance === undefined) throw new Error("Expected valid Button Appearance.");
    try {
      createMotionAuthoring(await createButtonMotionInput(normalized.appearance)).defineMotion(BUTTON_UNKNOWN_SLOT_MOTION);
      throw new Error("Expected the unknown Button slot to be rejected.");
    } catch (error) {
      expect(error).toBeInstanceOf(MotionAuthoringError);
      expect((error as MotionAuthoringError).diagnostics).toEqual([
        {
          code: "AXM1018",
          severity: "error",
          phase: "motionAuthoring",
          source: "<motion>",
          target: "button/unknown",
          message: "Motion Recipe 'button' and Slot 'unknown' must be present in the authenticated N22 Appearance artifact.",
        },
        {
          code: "AXM1012",
          severity: "warning",
          phase: "motionAuthoring",
          source: "<motion>",
          property: "transform",
          message: "Property 'transform' requires backend capability validation.",
        },
      ]);
    }
  });

  it("is repeatable across fresh authority contexts and insensitive to ordinary declaration-object key order", async () => {
    const first = await normalizeButton();
    const second = await normalizeButton();
    expect(canonicalJson({
      appearance: first.normalized.appearance,
      motion: first.motion.motion,
      trace: first.normalized.trace,
    })).toBe(canonicalJson({
      appearance: second.normalized.appearance,
      motion: second.motion.motion,
      trace: second.normalized.trace,
    }));

    const permuted = await normalizeButton({
      ...BUTTON_APPEARANCE,
      base: {
        root: {
          display: { kind: "css", value: "inline-flex" },
          border: { kind: "css", value: "1px solid transparent" },
        },
      },
    });
    expect(canonicalJson(permuted.normalized.appearance)).toBe(canonicalJson(first.normalized.appearance));
  });
});
