import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CONDITION_REGISTRY_ID,
  FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID,
  REQUIRED_CANONICAL_STATE_IDS,
  REQUIRED_CONDITION_IDS,
  SPEC_DIAGNOSTIC_CODE,
} from "./constants.js";
import { runSemanticValidator } from "./semantic-validators.js";

const specRoot = fileURLToPath(new URL("../../../spec/", import.meta.url));

const readSpecJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(`${specRoot}${path}`, "utf8")) as unknown;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const idsFrom = (value: unknown, key: string): readonly string[] => {
  if (!isRecord(value) || !Array.isArray(value[key])) return [];
  return value[key]
    .filter(isRecord)
    .map((entry) => entry["id"])
    .filter((id): id is string => typeof id === "string");
};

describe("State and Condition registry semantics", () => {
  it("materializes the complete canonical State and Condition vocabularies", async () => {
    const [stateRegistry, conditionRegistry] = await Promise.all([
      readSpecJson("state/canonical-state-registry.json"),
      readSpecJson("condition/condition-registry.json"),
    ]);

    expect(idsFrom(stateRegistry, "states")).toEqual(REQUIRED_CANONICAL_STATE_IDS);
    expect(idsFrom(conditionRegistry, "conditions")).toEqual(REQUIRED_CONDITION_IDS);
  });

  it("rejects a breakpoint Token whose resolved value varies by theme", async () => {
    const [conditionRegistry, resolvedManifestValue] = await Promise.all([
      readSpecJson("condition/condition-registry.json"),
      readSpecJson("token/foundation-resolved-token-manifest.json"),
    ]);
    const resolvedManifest = structuredClone(resolvedManifestValue);
    expect(isRecord(resolvedManifest) && Array.isArray(resolvedManifest["contexts"])).toBe(true);
    if (!isRecord(resolvedManifest) || !Array.isArray(resolvedManifest["contexts"])) return;
    const darkContext = resolvedManifest["contexts"][1];
    if (!isRecord(darkContext) || !Array.isArray(darkContext["tokens"])) return;
    const breakpoint = darkContext["tokens"].find(
      (token) => isRecord(token) && token["id"] === "breakpoint.semantic.viewport.sm",
    );
    if (!isRecord(breakpoint) || !isRecord(breakpoint["resolvedValue"])) return;
    breakpoint["resolvedValue"]["value"] = 41;

    const diagnostics = runSemanticValidator(
      "condition-registry",
      conditionRegistry,
      {
        registries: {
          [FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID]: resolvedManifest,
        },
      },
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.THEME_VARIANT_BREAKPOINT,
    );
  });

  it("rejects provably contradictory ranges and accepts a satisfiable OR clause", async () => {
    const [conditionRegistry, resolvedManifest] = await Promise.all([
      readSpecJson("condition/condition-registry.json"),
      readSpecJson("token/foundation-resolved-token-manifest.json"),
    ]);
    const context = {
      registries: {
        [CONDITION_REGISTRY_ID]: conditionRegistry,
        [FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID]: resolvedManifest,
      },
    };

    const contradictory = runSemanticValidator(
      "condition-expression",
      { all: ["viewport.width.md", "viewport.width.belowSm"] },
      context,
    );
    const satisfiable = runSemanticValidator(
      "condition-expression",
      {
        all: [
          { any: ["viewport.width.md", "viewport.width.belowSm"] },
          "viewport.width.sm",
        ],
      },
      context,
    );

    expect(contradictory.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.CONTRADICTORY_CONDITION_RANGE,
    );
    expect(satisfiable).toEqual([]);
  });
});
