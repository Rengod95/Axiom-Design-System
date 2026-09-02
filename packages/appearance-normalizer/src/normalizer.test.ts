import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import type { SparsePropertyPolicySource, TokenBindingCatalog } from "@axiom/css-property-profile";
import { digestResolvedTokenManifest, type ResolvedTokenManifest } from "@axiom/tokens";
import { validateSpecificationValue } from "@axiom/spec-tooling";
import { negateToken, projectToken, token } from "@axiom/appearance-authoring";
import { createAppearanceNormalizer, serializeAppearanceIR } from "./index.js";

const HASH = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const specRoot = fileURLToPath(new URL("../../../spec/", import.meta.url));

/** Reads one repository-owned normative authority for test-only explicit configuration. */
const readAuthority = (relativePath: string): unknown => JSON.parse(readFileSync(
  new URL(`../../../${relativePath}`, import.meta.url),
  "utf8",
));

/** Sorts object keys recursively while preserving every precedence-bearing array. */
const canonical = (value: unknown): unknown => Array.isArray(value)
  ? value.map(canonical)
  : value !== null && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [key, canonical(item)]))
    : typeof value === "number" && Object.is(value, -0) ? 0 : value;

/** Produces content-sensitive test digests so authority mutation cannot be hidden. */
const digest = {
  digestCanonicalJson: (value: unknown): string => `sha256:${createHash("sha256").update(`${JSON.stringify(canonical(value), null, 2)}\n`).digest("hex")}`,
};

const freeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
};

const propertyRegistry = readAuthority("spec/css/effective-property-registry.json") as Record<string, unknown>;
const resolvedTokenManifest = readAuthority("spec/token/foundation-resolved-token-manifest.json") as ResolvedTokenManifest;
const tokenDomainRegistry = readAuthority("spec/token/token-domain-registry.json") as Readonly<{ readonly domains: readonly { readonly id: string; readonly cssSerializers: readonly string[] }[] }>;
const projectorRegistry = readAuthority("spec/token/composite-token-projector-registry.json");
const canonicalStateRegistry = readAuthority("spec/state/canonical-state-registry.json");
const conditionRegistry = readAuthority("spec/condition/condition-registry.json");
const propertyPolicySource = {
  policy: readAuthority("spec/css/sparse-property-policy.json") as SparsePropertyPolicySource,
  bindings: readAuthority("spec/css/token-binding-catalog.json") as TokenBindingCatalog,
} as const;

const recipe = {
  definition: { id: "button", slots: ["root"], source: "recipes/button.ts", base: { root: { display: { kind: "css", value: "block" }, alignItems: { kind: "css", value: "center" } } }, variants: { tone: { neutral: { root: { display: { kind: "css", value: "flex" } } } } }, defaultVariants: { tone: "neutral" } },
  snapshot: {
    id: "button",
    slots: ["root"],
    base: [{ slot: "root", style: { display: { kind: "css", value: "block" }, alignItems: { kind: "css", value: "center" } } }],
    variantAxes: [{ name: "tone", defaultValue: "neutral", values: [{ value: "neutral", apply: [{ slot: "root", style: { display: { kind: "css", value: "flex" } } }] }] }],
    stateRules: [],
    compoundVariants: [],
    conditions: [],
    source: "recipes/button.ts",
  },
  tokenBindingReport: {
    authority: {
      effectivePropertyRegistry: HASH, propertyPolicySource: HASH, resolvedTokenManifest: HASH, tokenDomainRegistry: HASH, projectorRegistry: HASH,
      canonicalStateRegistry: HASH, conditionRegistry: HASH, profileInputDigest: HASH,
      manifestSourceDigest: HASH, contexts: [{ theme: "light" }],
    },
    bindings: [],
  },
} as const;

const input = {
  propertyRegistry,
  canonicalStateRegistry,
  conditionRegistry,
  tokenValidation: {
    resolvedTokenManifest,
    tokenDomainRegistry,
    projectorRegistry,
    authorityDigests: {
      effectivePropertyRegistry: digest.digestCanonicalJson(propertyRegistry),
      propertyPolicySource: digest.digestCanonicalJson(propertyPolicySource),
      resolvedTokenManifest: digestResolvedTokenManifest(resolvedTokenManifest, digest),
      tokenDomainRegistry: digest.digestCanonicalJson(tokenDomainRegistry),
      projectorRegistry: digest.digestCanonicalJson(projectorRegistry),
      canonicalStateRegistry: digest.digestCanonicalJson(canonicalStateRegistry),
      conditionRegistry: digest.digestCanonicalJson(conditionRegistry),
    },
    canonicalDigest: digest,
    propertyPolicySource,
    serializers: [...new Set(tokenDomainRegistry.domains.flatMap((domain) => domain.cssSerializers))]
      .filter((id) => !(projectorRegistry as Readonly<{ readonly projectors: readonly { readonly id: string }[] }>).projectors.some((entry) => entry.id === id))
      .map((id) => ({ id, serialize: (entry: { readonly resolvedValue: unknown }): string => id === "css.color.v1" && typeof entry.resolvedValue === "object" && entry.resolvedValue !== null && "hex" in entry.resolvedValue
        ? String((entry.resolvedValue as { readonly hex: unknown }).hex)
        : String(entry.resolvedValue) })),
    projectors: (projectorRegistry as Readonly<{ readonly projectors: readonly { readonly id: string }[] }>).projectors.map(({ id }) => ({ id, project: () => id === "css.border-projector.v1" ? [{ property: "border-color", value: "red", source: "token" as const, field: "color" }, { property: "border-style", value: "solid", source: "token" as const, field: "style" }, { property: "border-width", value: "1px", source: "token" as const, field: "width" }] : [] })),
  },
} as const;

/** Asserts that a runtime collision trace remains valid under public schema and semantic authorities. */
const expectValidTrace = async (trace: unknown): Promise<void> => {
  for (const candidate of [trace, JSON.parse(JSON.stringify(trace))]) await expect(validateSpecificationValue(
    specRoot,
    "https://axiom.dev/schemas/css/collision-trace/0.1",
    "css-collision-trace",
    candidate,
  )).resolves.toMatchObject({ schemaValid: true, diagnostics: [] });
};

describe("createAppearanceNormalizer", () => {
  it("normalizes deterministic base then variant declarations from an N21 receipt", () => {
    const result = createAppearanceNormalizer(input).normalize(freeze(recipe));
    expect(result.diagnostics).toEqual([]);
    expect(result.trace.entries.map((entry) => entry.relation)).toEqual(["same-property"]);
    expect(result.trace.entries[0]).toMatchObject({
      id: "collision-0001",
      affectedProperty: "display",
      earlier: {
        property: "display",
        policyProvenance: [{ source: "status-default", rule: "standard" }],
        applicability: { variants: [], states: [] },
      },
      later: {
        property: "display",
        policyProvenance: [{ source: "status-default", rule: "standard" }],
        applicability: { variants: [{ axis: "tone", values: ["neutral"] }], states: [] },
      },
    });
    expect(Object.isFrozen(result.trace.entries[0]?.earlier.applicability)).toBe(true);
    expect(result.appearance?.base[0]?.declarations.map((declaration) => declaration.property)).toEqual(["align-items", "display"]);
    expect(result.appearance?.variantAxes[0]?.values[0]?.apply[0]?.declarations[0]?.origin.stage).toBe("variant");
    expect(serializeAppearanceIR(result.appearance!)).toBe(serializeAppearanceIR(createAppearanceNormalizer(input).normalize(freeze({ ...recipe })).appearance!));
  });

  it("ignores a forged stale receipt and derives a fresh N21 receipt", () => {
    const stale = { ...recipe, tokenBindingReport: { ...recipe.tokenBindingReport, authority: { ...recipe.tokenBindingReport.authority, profileInputDigest: "sha256:stale" } } };
    const result = createAppearanceNormalizer(input).normalize(freeze(stale));
    expect(result.appearance).toBeDefined();
    expect(result.trace.entries.map((entry) => entry.relation)).toEqual(["same-property"]);
    expect(result.diagnostics).toEqual([]);
  });

  it("rejects a changed condition-only policy even when its supplied digest is recomputed", () => {
    const changedPolicySource = structuredClone(propertyPolicySource) as {
      bindings: { conditionOnlyDomains: string[] };
    };
    changedPolicySource.bindings.conditionOnlyDomains = ["color"];
    const changedInput = {
      ...input,
      tokenValidation: {
        ...input.tokenValidation,
        propertyPolicySource: changedPolicySource,
        authorityDigests: {
          ...input.tokenValidation.authorityDigests,
          propertyPolicySource: digest.digestCanonicalJson(changedPolicySource),
        },
      },
    };

    const result = createAppearanceNormalizer(changedInput as never).normalize(freeze(recipe));
    expect(result.appearance).toBeUndefined();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["AXN2002"]);
  });

  it("does not trust a forged projector blueprint", () => {
    const projected = {
      ...recipe,
      definition: { ...recipe.definition, base: { root: { color: { kind: "token", path: "color.semantic.fill.brand.default" } } } },
      tokenBindingReport: {
        ...recipe.tokenBindingReport,
        bindings: [{
          path: { recipeId: "button", slot: "root", stage: "base", property: "color", declarationIndex: 0 },
          projectedDeclarations: [{ property: "background-color", source: "token", field: "color", value: { kind: "token", path: "color.semantic.fill.brand.default" } }],
        }],
      },
    };
    const result = createAppearanceNormalizer(input).normalize(freeze(projected));
    expect(result.diagnostics).toEqual([]);
    expect(result.appearance?.base[0]?.declarations.map((declaration) => declaration.property)).toEqual(["color"]);
  });

  it("does not trust a forged unfrozen receipt before artifact construction", () => {
    const result = createAppearanceNormalizer(input).normalize({ ...recipe });
    expect(result.appearance).toBeDefined();
    expect(result.diagnostics).toEqual([]);
  });

  it("lowers ordinary authored CSS strings to the closed N15 CSS literal", () => {
    const stringRecipe = { ...recipe, definition: { ...recipe.definition, base: { root: { display: "block" } } } };
    const result = createAppearanceNormalizer(input).normalize(freeze(stringRecipe));
    expect(result.appearance?.base[0]?.declarations[0]?.value).toEqual({ kind: "css", value: "block" });
  });

  it("canonicalizes object declaration keys while retaining repeatable serialized output", () => {
    const reordered = { ...recipe, definition: { ...recipe.definition, base: { root: { alignItems: "center", display: "block" } } } };
    const first = createAppearanceNormalizer(input).normalize(freeze(reordered));
    const second = createAppearanceNormalizer(input).normalize(freeze({ ...reordered }));
    expect(first.appearance?.base[0]?.declarations.map((declaration) => declaration.property)).toEqual(["align-items", "display"]);
    expect(serializeAppearanceIR(first.appearance!)).toBe(serializeAppearanceIR(second.appearance!));
  });

  it("canonicalizes Appearance object keys while preserving declared array order", () => {
    const canonicalOrder = {
      schemaVersion: "0.1", profile: "axiom-css", profileInputDigest: "sha256:test", recipeId: "button",
      slots: ["root", "icon"], base: [], variantAxes: [], stateRules: [], compoundRules: [], conditionRules: [],
    };
    const permutedObjectKeys = {
      conditionRules: [], compoundRules: [], stateRules: [], variantAxes: [], base: [], slots: ["root", "icon"],
      recipeId: "button", profileInputDigest: "sha256:test", profile: "axiom-css", schemaVersion: "0.1",
    };
    const permutedArray = { ...permutedObjectKeys, slots: ["icon", "root"] };

    expect(serializeAppearanceIR(canonicalOrder as never)).toBe(serializeAppearanceIR(permutedObjectKeys as never));
    expect(serializeAppearanceIR(canonicalOrder as never)).not.toBe(serializeAppearanceIR(permutedArray as never));
  });

  it("schema- and semantic-validates normalized Appearance and trace before and after JSON round-trip", async () => {
    const result = createAppearanceNormalizer(input).normalize(freeze(recipe));
    const appearance = result.appearance!;
    const trace = result.trace;
    const artifacts = [
      ["https://axiom.dev/schemas/css/appearance-ir/0.1", "css-appearance-ir", appearance],
      ["https://axiom.dev/schemas/css/collision-trace/0.1", "css-collision-trace", trace],
    ] as const;

    for (const [schema, semanticValidator, artifact] of artifacts) {
      await expect(validateSpecificationValue(specRoot, schema, semanticValidator, artifact)).resolves.toMatchObject({ schemaValid: true, diagnostics: [] });
      const serialized = schema.endsWith("appearance-ir/0.1") ? serializeAppearanceIR(artifact as never) : JSON.stringify(artifact);
      await expect(validateSpecificationValue(specRoot, schema, semanticValidator, JSON.parse(serialized))).resolves.toMatchObject({ schemaValid: true, diagnostics: [] });
    }
  });

  it("returns a frozen typed failure for malformed public input", () => {
    const result = createAppearanceNormalizer(input).normalize(null as never);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["AXN2002"]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("preserves the complete Base → Variant → State → Compound → Condition IR stage order", async () => {
    const staged = {
      ...recipe,
      definition: {
        ...recipe.definition,
        states: [{ slot: "root", state: "pressed", cases: [{ equals: true, apply: { opacity: "0.8" } }] }],
        compoundVariants: [{ when: { variants: { tone: "neutral" } }, apply: { root: { display: "block" } } }],
        conditions: [{ when: { all: ["preference.reducedMotion"] }, apply: { root: { display: "block" } } }],
      },
    };
    const normalized = createAppearanceNormalizer(input).normalize(freeze(staged));
    expect(normalized.diagnostics).toEqual([]);
    const appearance = normalized.appearance;
    expect(appearance?.base).toHaveLength(1);
    expect(appearance?.variantAxes).toHaveLength(1);
    expect(appearance?.stateRules).toHaveLength(1);
    expect(appearance?.compoundRules).toHaveLength(1);
    expect(appearance?.conditionRules).toHaveLength(1);
    expect(appearance?.stateRules[0]?.cases[0]?.apply[0]?.origin.stage).toBe("state");
    expect(appearance?.compoundRules[0]?.apply[0]?.declarations[0]?.origin.stage).toBe("compound");
    expect(appearance?.conditionRules[0]?.apply[0]?.declarations[0]?.origin.stage).toBe("condition");
    await expectValidTrace(normalized.trace);
  });

  it("withholds Appearance IR for a contradictory registered viewport Condition", async () => {
    const contradictory = { ...recipe, definition: { ...recipe.definition, conditions: [{ when: { all: ["viewport.width.lg", "viewport.width.belowMd"] }, apply: { root: { display: "block" } } }] } };
    const result = createAppearanceNormalizer(input).normalize(freeze(contradictory));
    expect(result.appearance).toBeUndefined();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("AXC1102");
    await expectValidTrace(result.trace);
  });

  it("keeps repeated Variant projector bindings distinct by exact declaration pointer", () => {
    const projected = { ...recipe, definition: { ...recipe.definition, variants: { tone: { first: { root: { border: projectToken(token("border.semantic.control"), { projector: "css.border-projector.v1" }) } }, second: { root: { border: projectToken(token("border.semantic.control"), { projector: "css.border-projector.v1" }) } } } }, defaultVariants: { tone: "first" } } };
    const result = createAppearanceNormalizer(input).normalize(freeze(projected));
    expect(result.diagnostics).toEqual([]);
    expect(result.appearance?.variantAxes[0]?.values.flatMap((value) => value.apply[0]?.declarations.map((declaration) => declaration.property))).toEqual(["border-color", "border-style", "border-width", "border-color", "border-style", "border-width"]);
  });

  it("lowers permitted Token negation to the exact N21 template", () => {
    const negated = { ...recipe, definition: { ...recipe.definition, base: { root: { marginLeft: negateToken(token("space.semantic.layout.gutter.md")) } } } };
    const result = createAppearanceNormalizer(input).normalize(freeze(negated));
    expect(result.appearance?.base[0]?.declarations[0]?.value).toEqual({ kind: "css-template", parts: ["calc(0px - ", { kind: "token", path: "space.semantic.layout.gutter.md" }, ")"] });
  });

  it("preserves ordered-array declaration origins and intentional shorthand override order", async () => {
    const ordered = { ...recipe, definition: { ...recipe.definition, base: { root: [
      { property: "border", value: { kind: "css", value: "1px solid red" } },
      { property: "border-color", value: { kind: "token", path: "color.semantic.fill.brand.default" } },
    ] } } };
    const result = createAppearanceNormalizer(input).normalize(freeze(ordered));
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    expect(result.appearance?.base[0]?.declarations.map((declaration) => declaration.origin.source)).toEqual([
      "recipes/button.ts#/base/root/0/value", "recipes/button.ts#/base/root/1/value",
    ]);
    expect(result.trace.entries.find((entry) => entry.relation === "shorthand-longhand")?.affectedProperty).toBe("border-color");
    await expectValidTrace(result.trace);
  });

  it("treats only a later resetting shorthand as a blocking reset-longhand conflict", async () => {
    const reset = { ...recipe, definition: { ...recipe.definition, base: { root: [{ property: "background-blend-mode", value: "multiply" }, { property: "background", value: "none" }] } } };
    const result = createAppearanceNormalizer(input).normalize(freeze(reset));
    expect(result.appearance).toBeUndefined();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("AXP1302");
    expect(result.trace.entries.find((entry) => entry.relation === "reset-longhand")?.affectedProperty).toBe("background-blend-mode");
    await expectValidTrace(result.trace);
  });

  it("allows a later explicit longhand override after a shorthand", async () => {
    const override = { ...recipe, definition: { ...recipe.definition, base: { root: [{ property: "background", value: "none" }, { property: "background-blend-mode", value: "multiply" }] } } };
    const result = createAppearanceNormalizer(input).normalize(freeze(override));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("AXP1302");
    expect(result.appearance).toBeDefined();
    await expectValidTrace(result.trace);
  });

  it("records the earlier longhand when a later shorthand contains it", async () => {
    const laterShorthand = { ...recipe, definition: { ...recipe.definition, base: { root: [
      { property: "border-color", value: { kind: "token", path: "color.semantic.fill.brand.default" } },
      { property: "border", value: { kind: "css", value: "1px solid red" } },
    ] } } };
    const result = createAppearanceNormalizer(input).normalize(freeze(laterShorthand));
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    expect(result.trace.entries.find((entry) => entry.relation === "shorthand-longhand")?.affectedProperty).toBe("border-color");
    await expectValidTrace(result.trace);
  });

  it("warns for simultaneous cross-axis Variant winners", () => {
    const crossAxis = { ...recipe, definition: { ...recipe.definition, variants: { tone: { neutral: { root: { display: "flex" } } }, density: { compact: { root: { display: "grid" } } } }, defaultVariants: { tone: "neutral", density: "compact" } } };
    const result = createAppearanceNormalizer(input).normalize(freeze(crossAxis));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("AXP1301");
    expect(result.trace.entries.some((entry) => entry.relation === "same-property")).toBe(true);
  });

  it("warns for simultaneous independent State winners", () => {
    const states = { ...recipe, definition: { ...recipe.definition, states: [
      { slot: "root", state: "pressed", cases: [{ equals: true, apply: { display: "flex" } }] },
      { slot: "root", state: "disabled", cases: [{ equals: true, apply: { display: "none" } }] },
    ] } };
    const result = createAppearanceNormalizer(input).normalize(freeze(states));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("AXP1301");
  });

  it("records overlapping Compound predicates that target the same declaration", async () => {
    const compounds = { ...recipe, definition: { ...recipe.definition, compoundVariants: [
      { when: { variants: { tone: "neutral" } }, apply: { root: { display: "flex" } } },
      { when: { variants: { tone: "neutral" } }, apply: { root: { display: "grid" } } },
    ] } };
    const result = createAppearanceNormalizer(input).normalize(freeze(compounds));
    const compoundPair = result.trace.entries.filter((entry) => entry.relation === "same-property" && entry.earlier.origin.stage === "compound" && entry.later.origin.stage === "compound");
    expect(compoundPair).toHaveLength(1);
    expect(compoundPair[0]?.earlier.applicability.variants).toEqual([{ axis: "tone", values: ["neutral"] }]);
    expect(compoundPair[0]?.later.applicability.variants).toEqual([{ axis: "tone", values: ["neutral"] }]);
    await expectValidTrace(result.trace);
  });

  it("suppresses mutually exclusive Compound predicates", async () => {
    const compounds = { ...recipe, definition: { ...recipe.definition, compoundVariants: [
      { when: { variants: { tone: "neutral" } }, apply: { root: { display: "flex" } } },
      { when: { variants: { tone: "other" } }, apply: { root: { display: "grid" } } },
    ] } };
    const result = createAppearanceNormalizer(input).normalize(freeze(compounds));
    expect(result.trace.entries.some((entry) => entry.relation === "same-property" && entry.earlier.origin.stage === "compound" && entry.later.origin.stage === "compound")).toBe(false);
    await expectValidTrace(result.trace);
  });

  it("records satisfiable independent Condition collisions with relation evidence", async () => {
    const conditions = { ...recipe, definition: { ...recipe.definition, conditions: [
      { when: { all: ["preference.reducedMotion"] }, apply: { root: { display: "flex" } } },
      { when: { all: ["viewport.width.md"] }, apply: { root: { display: "grid" } } },
    ] } };
    const result = createAppearanceNormalizer(input).normalize(freeze(conditions));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("AXC1103");
    expect(result.trace.entries.find((entry) => entry.relation === "condition-overlap")?.conditionRelation).toBe("overlap");
    await expectValidTrace(result.trace);
  });

  it.each([
    ["equivalent", "preference.reducedMotion", "preference.reducedMotion", "equivalent"],
    ["subset", "viewport.width.lg", "viewport.width.md", "subset"],
  ])("records %s Condition relation evidence", async (_name, left, right, relation) => {
    const conditions = { ...recipe, definition: { ...recipe.definition, conditions: [
      { when: { all: [left] }, apply: { root: { display: "flex" } } },
      { when: { all: [right] }, apply: { root: { display: "grid" } } },
    ] } };
    const result = createAppearanceNormalizer(input).normalize(freeze(conditions));
    expect(result.trace.entries.find((entry) => entry.relation === "condition-overlap")?.conditionRelation).toBe(relation);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("AXC1103");
    await expectValidTrace(result.trace);
  });

  it("suppresses disjoint Condition collisions", async () => {
    const conditions = { ...recipe, definition: { ...recipe.definition, conditions: [
      { when: { all: ["viewport.width.lg"] }, apply: { root: { display: "flex" } } },
      { when: { all: ["viewport.width.belowMd"] }, apply: { root: { display: "grid" } } },
    ] } };
    const result = createAppearanceNormalizer(input).normalize(freeze(conditions));
    expect(result.trace.entries.some((entry) => entry.relation === "condition-overlap")).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("AXC1103");
    await expectValidTrace(result.trace);
  });

});
