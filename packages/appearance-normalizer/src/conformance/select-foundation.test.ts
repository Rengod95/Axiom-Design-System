import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { CSSRecipeAuthoringError, createCSSRecipeAuthoring } from "@axiom/appearance-authoring";
import { MotionAuthoringError, createMotionAuthoring } from "@axiom/motion-schema";
import { canonicalJson, validateSpecificationValue } from "@axiom/spec-tooling";

import { SELECT_APPEARANCE } from "../../../../fixtures/select/appearance.js";
import { SELECT_POPUP_MOTION } from "../../../../fixtures/select/motion.js";
import { SELECT_INVALID_TOKEN_APPEARANCE } from "../../../../fixtures/select/negative/invalid-token.js";
import { SELECT_RESET_LONGHAND_APPEARANCE } from "../../../../fixtures/select/negative/reset-longhand.js";
import { SELECT_UNKNOWN_SLOT_MOTION } from "../../../../fixtures/select/negative/unknown-slot-motion.js";
import { createAppearanceNormalizer } from "../index.js";
import { createSelectAppearanceInput, createSelectMotionInput } from "./select-authorities.test-support.js";

/** Reads one normalized Select contract fixture for an exact conformance assertion. */
const readFixture = (relativePath: string): unknown => JSON.parse(readFileSync(
  new URL(`../../../../spec/fixtures/${relativePath}`, import.meta.url),
  "utf8",
));
const SPEC_ROOT = fileURLToPath(new URL("../../../../spec/", import.meta.url));
/** Allows two independent authority-port preloads without weakening the global unit-test timeout. */
const SELECT_DETERMINISM_TIMEOUT_MS = 15_000;

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

/** Runs the public N20 through N22 Select path with a fresh cloned authority context. */
const normalizeSelectAppearance = (definition = SELECT_APPEARANCE) => {
  const input = createSelectAppearanceInput();
  const recipe = createCSSRecipeAuthoring(input).defineRecipe(definition);
  const normalized = createAppearanceNormalizer(input).normalize(recipe);
  if (normalized.appearance === undefined) throw new Error(`Expected valid Select Appearance: ${JSON.stringify(normalized.diagnostics)}`);
  return { recipe, normalized };
};

/** Extends one fresh N20→N22 Select result through authenticated N23 Motion authoring. */
const normalizeSelect = async (definition = SELECT_APPEARANCE) => {
  const result = normalizeSelectAppearance(definition);
  return {
    ...result,
    motion: createMotionAuthoring(await createSelectMotionInput(result.normalized.appearance!)).defineMotion(SELECT_POPUP_MOTION),
  };
};

describe("Select Foundation conformance", () => {
  it("retains the authored Select, repeated item, and popup Motion identities", () => {
    expect(SELECT_APPEARANCE.id).toBe("select");
    expect(SELECT_APPEARANCE.slots).toEqual(["root", "trigger", "popup", "item"]);
    expect(SELECT_APPEARANCE.states[4]).toMatchObject({ slot: "item", state: "selected" });
    expect(SELECT_POPUP_MOTION).toMatchObject({ recipeId: "select", slot: "popup" });
  });

  it("drives N20 through N23 into exact Select contracts without collapsing item State", async () => {
    const { recipe, normalized, motion } = await normalizeSelect();
    const appearance = normalized.appearance!;

    expect(appearance).toEqual(readFixture("css-appearance-ir/positive/select.json"));
    expect(motion.motion).toEqual(readFixture("motion-ir/positive/select-popup-enter-exit.json"));
    expect(normalized.trace).toEqual(readFixture("css-collision-trace/positive/select-item-state-overlap.json"));
    const selectedRule = appearance.stateRules.find((rule) => rule.state === "selected");
    expect(selectedRule?.slot).toBe("item");
    expect(selectedRule?.cases.flatMap((stateCase) => stateCase.apply).every((declaration) => declaration.origin.slot === "item")).toBe(true);
    expect(appearance.stateRules.filter((rule) => rule.state === "selected" && rule.slot !== "item")).toEqual([]);
    expect(recipe.tokenBindingReport.bindings.map((binding) => binding.tokens[0]?.serializerId)).toEqual([
      "css.color.v1", "css.dimension.v1", "css.shadow.v1", "css.number.v1", "css.color.v1",
      "css.dimension.v1", "css.dimension.v1", "css.dimension.v1", "css.number.v1", "css.color.v1",
      "css.color.v1", "css.color.v1", "css.color.v1", "css.color.v1", "css.duration.v1",
    ]);
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["AXP1301", "AXP1301"]);
    expect(motion.diagnostics.map((diagnostic) => [diagnostic.code, diagnostic.property])).toEqual([
      ["AXM1012", "opacity"], ["AXM1012", "transform"],
      ["AXM1012", "opacity"], ["AXM1012", "transform"],
    ]);
    expect(normalized.trace.entries.map((entry) => entry.id)).toEqual(["collision-0001", "collision-0002", "collision-0003"]);
    await expectValidArtifact("https://axiom.dev/schemas/css/appearance-ir/0.1", "css-appearance-ir", appearance);
    await expectValidArtifact("https://axiom.dev/schemas/motion/ir/0.1", "motion-ir", motion.motion);
    await expectValidArtifact("https://axiom.dev/schemas/css/collision-trace/0.1", "css-collision-trace", normalized.trace);
    const bundle = { appearance, motion: motion.motion, trace: normalized.trace };
    expect(JSON.parse(canonicalJson(bundle))).toEqual(bundle);
    expect(canonicalJson(bundle)).toBe(canonicalJson(JSON.parse(readFileSync(
      new URL("select-foundation.golden.json", import.meta.url),
      "utf8",
    ))));
    expect(Object.keys(bundle)).toEqual(["appearance", "motion", "trace"]);
  });

  it("rejects a Select Token from the wrong direct CSS domain before normalization", () => {
    const input = createSelectAppearanceInput();
    try {
      createCSSRecipeAuthoring(input).defineRecipe(SELECT_INVALID_TOKEN_APPEARANCE);
      throw new Error("Expected the wrong-domain Select Token to be rejected.");
    } catch (error) {
      expect(error).toBeInstanceOf(CSSRecipeAuthoringError);
      expect((error as CSSRecipeAuthoringError).diagnostics).toEqual([expect.objectContaining({
        code: "AXP1103",
        pointer: "/base/popup/zIndex",
        slot: "popup",
        stage: "base",
        property: "z-index",
        source: "fixtures/select/negative/invalid-token.ts",
        tokenId: "color.component.select.popup.background",
        target: "color.component.select.popup.background",
      })]);
    }
  });

  it("withholds Select Appearance when a later background shorthand resets a longhand", () => {
    const input = createSelectAppearanceInput();
    const recipe = createCSSRecipeAuthoring(input).defineRecipe(SELECT_RESET_LONGHAND_APPEARANCE);
    const normalized = createAppearanceNormalizer(input).normalize(recipe);
    expect(normalized.appearance).toBeUndefined();
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toContain("AXP1302");
    expect(normalized.trace.entries).toEqual([expect.objectContaining({
      id: "collision-0001",
      relation: "reset-longhand",
      affectedProperty: "background-blend-mode",
      winner: "later",
    })]);
    return expectValidArtifact("https://axiom.dev/schemas/css/collision-trace/0.1", "css-collision-trace", normalized.trace);
  });

  it("rejects Select Motion targeting a Slot absent from authenticated Appearance", async () => {
    const { normalized } = normalizeSelectAppearance();
    try {
      createMotionAuthoring(await createSelectMotionInput(normalized.appearance!)).defineMotion(SELECT_UNKNOWN_SLOT_MOTION);
      throw new Error("Expected the unknown Select Slot to be rejected.");
    } catch (error) {
      expect(error).toBeInstanceOf(MotionAuthoringError);
      expect((error as MotionAuthoringError).diagnostics).toEqual([
        expect.objectContaining({ code: "AXM1018", target: "select/unknown" }),
        expect.objectContaining({ code: "AXM1012", property: "opacity" }),
      ]);
    }
  });

  it("is byte-stable across fresh authorities and ordinary declaration-key permutations", async () => {
    const first = await normalizeSelect();
    const second = await normalizeSelect();
    const firstBundle = { appearance: first.normalized.appearance, motion: first.motion.motion, trace: first.normalized.trace };
    const secondBundle = { appearance: second.normalized.appearance, motion: second.motion.motion, trace: second.normalized.trace };
    expect(canonicalJson(firstBundle)).toBe(canonicalJson(secondBundle));

    const permuted = normalizeSelectAppearance({
      ...SELECT_APPEARANCE,
      base: {
        ...SELECT_APPEARANCE.base,
        popup: {
          zIndex: SELECT_APPEARANCE.base.popup.zIndex,
          boxShadow: SELECT_APPEARANCE.base.popup.boxShadow,
          borderRadius: SELECT_APPEARANCE.base.popup.borderRadius,
          backgroundColor: SELECT_APPEARANCE.base.popup.backgroundColor,
        },
      },
    });
    expect(canonicalJson(permuted.normalized.appearance)).toBe(canonicalJson(first.normalized.appearance));
  }, SELECT_DETERMINISM_TIMEOUT_MS);
});
