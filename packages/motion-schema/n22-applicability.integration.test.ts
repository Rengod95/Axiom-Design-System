import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createAppearanceNormalizer } from "../appearance-normalizer/src/index.js";
import { canonicalJsonDigest, createMotionAuthorityValidationPort, validateSpecificationValue } from "../spec-tooling/src/index.js";
import { digestResolvedTokenManifest } from "../tokens/src/index.js";
import { createMotionAuthoring, token } from "./src/index.js";

const HASH = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SPEC_ROOT = fileURLToPath(new URL("../../spec/", import.meta.url));

/** Reads a checked-in authority only for this cross-package integration test. */
const readAuthority = (relativePath: string): unknown => JSON.parse(readFileSync(
  new URL(`../../${relativePath}`, import.meta.url),
  "utf8",
));

/** Retains array order while producing a content-sensitive canonical digest. */
const canonicalize = (value: unknown): unknown => Array.isArray(value)
  ? value.map(canonicalize)
  : value !== null && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en")).map(([key, nested]) => [key, canonicalize(nested)]))
    : value;

/** Supplies the trusted digest port used by both N22 fixture authorities and N23 applicability binding. */
const digest = { digestCanonicalJson: (value: unknown): string => `sha256:${createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")}` };
const motionDigest = { digestCanonicalJson: canonicalJsonDigest };

/** Freezes a public N21-style test receipt without retaining mutable nested objects. */
const freeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) freeze(nested);
  }
  return value;
};

const propertyRegistry = readAuthority("spec/css/effective-property-registry.json") as never;
const resolvedTokenManifest = readAuthority("spec/token/foundation-resolved-token-manifest.json") as never;
const tokenDomainRegistry = readAuthority("spec/token/token-domain-registry.json") as never;
const projectorRegistry = readAuthority("spec/token/composite-token-projector-registry.json");
const canonicalStateRegistry = readAuthority("spec/state/canonical-state-registry.json") as never;
const conditionRegistry = readAuthority("spec/condition/condition-registry.json") as never;

const recipe = {
  definition: { id: "button", slots: ["root"], source: "recipes/button.ts", base: { root: { display: "block" } } },
  snapshot: { id: "button", slots: ["root"], base: [{ slot: "root", style: { display: "block" } }], variantAxes: [], stateRules: [], compoundVariants: [], conditions: [], source: "recipes/button.ts" },
  tokenBindingReport: { authority: { effectivePropertyRegistry: HASH, resolvedTokenManifest: HASH, tokenDomainRegistry: HASH, projectorRegistry: HASH, canonicalStateRegistry: HASH, conditionRegistry: HASH, profileInputDigest: HASH, manifestSourceDigest: HASH, contexts: [{ theme: "light" }] }, bindings: [] },
} as const;

const appearanceInput = {
  propertyRegistry, canonicalStateRegistry, conditionRegistry,
  tokenValidation: {
    resolvedTokenManifest, tokenDomainRegistry, projectorRegistry,
    authorityDigests: {
      effectivePropertyRegistry: digest.digestCanonicalJson(propertyRegistry),
      resolvedTokenManifest: digestResolvedTokenManifest(resolvedTokenManifest, digest),
      tokenDomainRegistry: digest.digestCanonicalJson(tokenDomainRegistry),
      projectorRegistry: digest.digestCanonicalJson(projectorRegistry),
      canonicalStateRegistry: digest.digestCanonicalJson(canonicalStateRegistry),
      conditionRegistry: digest.digestCanonicalJson(conditionRegistry),
    },
    canonicalDigest: digest,
    conditionOnlyDomains: tokenDomainRegistry.domains.map((domain: { readonly id: string }) => domain.id).filter((id: string) => !["border", "color", "space"].includes(id)),
    serializers: [{
      id: "css.color.v1",
      serialize: (entry: { readonly resolvedValue: unknown }): string => typeof entry.resolvedValue === "object" && entry.resolvedValue !== null && "hex" in entry.resolvedValue
        ? String((entry.resolvedValue as { readonly hex: unknown }).hex)
        : String(entry.resolvedValue),
    }, { id: "css.dimension.v1", serialize: (entry: { readonly resolvedValue: unknown }): string => String(entry.resolvedValue) }],
    projectors: [{ id: "css.border-projector.v1", project: () => [{ property: "border-color", value: "red", source: "token", field: "color" }, { property: "border-style", value: "solid", source: "token", field: "style" }, { property: "border-width", value: "1px", source: "token", field: "width" }] }],
  },
} as const;

/** Produces the N22-owned normalized Appearance authority used by N23. */
const normalizedAppearance = () => {
  const result = createAppearanceNormalizer(appearanceInput).normalize(freeze(recipe));
  const appearance = result.appearance;
  if (appearance === undefined) throw new Error(`N22 test normalizer did not emit CSSAppearanceIR: ${JSON.stringify(result.diagnostics)}`);
  return appearance;
};

/** Produces a single N23 source whose Recipe and Slot can be varied independently. */
const motionSource = (recipeId = "button", slot = "root") => ({
  id: "button.pressed", recipeId, slot,
  phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.enter") } }] }],
  reducedMotion: { strategy: "disable" },
} as const);

/** Creates N23 with an N22 Appearance receipt and an independently testable digest expectation. */
const createN23 = async (appearance = normalizedAppearance(), appearanceIR = motionDigest.digestCanonicalJson(appearance)) => createMotionAuthoring({
  propertyRegistry, resolvedTokenManifest, tokenDomainRegistry, canonicalStateRegistry, conditionRegistry,
  appearance,
  expectedDigests: {
    profileInputDigest: propertyRegistry.profile.webrefInputDigest,
    effectivePropertyRegistry: motionDigest.digestCanonicalJson(propertyRegistry),
    resolvedTokenManifest: digestResolvedTokenManifest(resolvedTokenManifest, motionDigest),
    tokenDomainRegistry: motionDigest.digestCanonicalJson(tokenDomainRegistry),
    canonicalStateRegistry: motionDigest.digestCanonicalJson(canonicalStateRegistry),
    conditionRegistryDigest: motionDigest.digestCanonicalJson(conditionRegistry),
    appearanceIR,
  },
  canonicalDigest: motionDigest, serializers: [],
  authorityValidation: await createMotionAuthorityValidationPort(SPEC_ROOT),
});

/** Captures governed diagnostics without relying on unstable exception strings. */
const errorCodes = (operation: () => unknown): readonly string[] => {
  try { operation(); } catch (error) {
    if (typeof error === "object" && error !== null && "diagnostics" in error && Array.isArray(error.diagnostics)) {
      return error.diagnostics.map((diagnostic) => typeof diagnostic === "object" && diagnostic !== null && "code" in diagnostic ? String(diagnostic.code) : "");
    }
  }
  throw new Error("Expected a MotionAuthoringError.");
};

type AuthorityBundle = {
  propertyRegistry: Record<string, unknown>;
  resolvedTokenManifest: Record<string, unknown>;
  tokenDomainRegistry: Record<string, unknown>;
  canonicalStateRegistry: Record<string, unknown>;
  conditionRegistry: Record<string, unknown>;
  appearance: Record<string, unknown>;
};

/** Clones the actual registered authorities and N22 receipt for one isolated hostile probe. */
const authorityBundle = (): AuthorityBundle => structuredClone({
  propertyRegistry,
  resolvedTokenManifest,
  tokenDomainRegistry,
  canonicalStateRegistry,
  conditionRegistry,
  appearance: normalizedAppearance(),
}) as AuthorityBundle;

/** Recomputes every expected identity from the exact detached authority bundle. */
const expectedDigestsFor = (bundle: AuthorityBundle) => ({
  profileInputDigest: (bundle.propertyRegistry["profile"] as Record<string, unknown>)["webrefInputDigest"] as string,
  effectivePropertyRegistry: motionDigest.digestCanonicalJson(bundle.propertyRegistry),
  resolvedTokenManifest: digestResolvedTokenManifest(bundle.resolvedTokenManifest as never, motionDigest),
  tokenDomainRegistry: motionDigest.digestCanonicalJson(bundle.tokenDomainRegistry),
  canonicalStateRegistry: motionDigest.digestCanonicalJson(bundle.canonicalStateRegistry),
  conditionRegistryDigest: motionDigest.digestCanonicalJson(bundle.conditionRegistry),
  appearanceIR: motionDigest.digestCanonicalJson(bundle.appearance),
});

/** Constructs real-port N23 authoring over a bundle whose expected digests were just recomputed. */
const createN23ForBundle = async (
  bundle: AuthorityBundle,
  authorityValidation?: { readonly validateBundle: (snapshot: Record<string, unknown>) => readonly unknown[] },
) => {
  const port = authorityValidation ?? await createMotionAuthorityValidationPort(SPEC_ROOT);
  return createMotionAuthoring({
    ...bundle,
    expectedDigests: expectedDigestsFor(bundle),
    canonicalDigest: motionDigest,
    serializers: [],
    authorityValidation: port,
  } as never);
};

/** Locates the same resolved Token in both contexts so cross-context mutations stay self-consistent. */
const contextTokens = (bundle: AuthorityBundle, id: string): Record<string, unknown>[] =>
  ((bundle.resolvedTokenManifest["contexts"] as Record<string, unknown>[]).map((context) =>
    (context["tokens"] as Record<string, unknown>[]).find((entry) => entry["id"] === id),
  ).filter((entry): entry is Record<string, unknown> => entry !== undefined));

/** Adds one closed declaration record with origin evidence to a chosen Appearance stage. */
const appearanceRecord = (stage: string, slot = "root") => ({
  slot,
  declarations: [{
    property: "display",
    value: { kind: "css", value: "block" },
    important: false,
    origin: { recipeId: "button", slot, stage, source: "recipes/button.ts#/base/root/display" },
  }],
});

describe("N23 N22 Appearance applicability", () => {
  it.each([
    ["manifest contexts reversed", (bundle: Record<string, unknown>) => ({ ...bundle, resolvedTokenManifest: { ...(bundle.resolvedTokenManifest as Record<string, unknown>), contexts: [...((bundle.resolvedTokenManifest as { contexts: readonly unknown[] }).contexts)].reverse() } })],
    ["Domain Registry reversed", (bundle: Record<string, unknown>) => ({ ...bundle, tokenDomainRegistry: { ...(bundle.tokenDomainRegistry as Record<string, unknown>), domains: [...((bundle.tokenDomainRegistry as { domains: readonly unknown[] }).domains)].reverse() } })],
    ["State Registry reversed", (bundle: Record<string, unknown>) => ({ ...bundle, canonicalStateRegistry: { ...(bundle.canonicalStateRegistry as Record<string, unknown>), states: [...((bundle.canonicalStateRegistry as { states: readonly unknown[] }).states)].reverse() } })],
    ["Condition Registry reversed", (bundle: Record<string, unknown>) => ({ ...bundle, conditionRegistry: { ...(bundle.conditionRegistry as Record<string, unknown>), conditions: [...((bundle.conditionRegistry as { conditions: readonly unknown[] }).conditions)].reverse() } })],
    ["Appearance duplicate base slot", (bundle: Record<string, unknown>) => ({ ...bundle, appearance: { ...(bundle.appearance as Record<string, unknown>), base: [{ slot: "root", declarations: [] }, { slot: "root", declarations: [] }] } })],
  ] as const)("pinned authority port rejects hostile %s against the supplied bundle", async (_name, mutate) => {
    const port = await createMotionAuthorityValidationPort(SPEC_ROOT);
    const bundle = {
      propertyRegistry,
      resolvedTokenManifest,
      tokenDomainRegistry,
      canonicalStateRegistry,
      conditionRegistry,
      appearance: normalizedAppearance(),
    } as Record<string, unknown>;
    expect(port.validateBundle(mutate(bundle))).not.toEqual([]);
  });

  it("accepts N22-normalized Appearance for the matching Recipe and Slot and emits N16 schema-valid Motion IR", async () => {
    const result = (await createN23()).defineMotion(motionSource());
    expect(result.motion).toMatchObject({ recipeId: "button", slot: "root" });
    const specification = await validateSpecificationValue(
      SPEC_ROOT,
      "https://axiom.dev/schemas/motion/ir/0.1",
      "motion-ir",
      result.motion,
    );
    expect(specification.schemaValid).toBe(true);
    expect(specification.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    const roundTrip = await validateSpecificationValue(
      SPEC_ROOT,
      "https://axiom.dev/schemas/motion/ir/0.1",
      "motion-ir",
      JSON.parse(JSON.stringify(result.motion)),
    );
    expect(roundTrip.schemaValid).toBe(true);
    expect(roundTrip.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
  });

  it("rejects a forged N22 Appearance digest before Motion IR output", async () => {
    const authoring = await createN23(undefined, HASH);
    expect(errorCodes(() => authoring.defineMotion(motionSource()))).toContain("AXM1018");
  });

  it("rejects forged Appearance recipe identity before Motion IR output", async () => {
    const normalized = normalizedAppearance();
    const appearance = {
      ...normalized,
      recipeId: "forged",
      base: normalized.base.map((record) => ({
        ...record,
        declarations: record.declarations.map((declaration) => ({
          ...declaration,
          origin: { ...declaration.origin, recipeId: "forged" },
        })),
      })),
    };
    const authoring = await createN23(appearance);
    expect(errorCodes(() => authoring.defineMotion(motionSource()))).toContain("AXM1018");
  });

  it("rejects Motion sources that target an unknown N22 Appearance Slot", async () => {
    const authoring = await createN23();
    expect(errorCodes(() => authoring.defineMotion(motionSource("button", "icon")))).toContain("AXM1018");
  });

  it.each([
    ["a one-context resolved manifest", (bundle: AuthorityBundle) => {
      const manifest = bundle.resolvedTokenManifest;
      manifest["contexts"] = (manifest["contexts"] as unknown[]).slice(0, 1);
    }],
    ["both reversed context Token arrays", (bundle: AuthorityBundle) => {
      for (const context of bundle.resolvedTokenManifest["contexts"] as Record<string, unknown>[]) {
        context["tokens"] = [...(context["tokens"] as unknown[])].reverse();
      }
    }],
    ["a dark-context Token swap", (bundle: AuthorityBundle) => {
      const contexts = bundle.resolvedTokenManifest["contexts"] as Record<string, unknown>[];
      const dark = contexts[1]!;
      const tokens = [...(dark["tokens"] as unknown[])];
      [tokens[0], tokens[1]] = [tokens[1]!, tokens[0]!];
      dark["tokens"] = tokens;
    }],
    ["a Token ID Domain mismatch", (bundle: AuthorityBundle) => {
      for (const entry of contextTokens(bundle, "color.semantic.fill.brand.default")) entry["domain"] = "space";
    }],
    ["a Token ID tier mismatch", (bundle: AuthorityBundle) => {
      for (const entry of contextTokens(bundle, "color.semantic.fill.brand.default")) entry["tier"] = "primitive";
    }],
    ["an unknown Token dependency", (bundle: AuthorityBundle) => {
      for (const entry of contextTokens(bundle, "color.semantic.fill.brand.default")) entry["dependencies"] = ["number.semantic.missing"];
    }],
    ["a top-level unresolved alias", (bundle: AuthorityBundle) => {
      for (const entry of contextTokens(bundle, "color.semantic.fill.brand.default")) entry["resolvedValue"] = "{number.semantic.opacity.end}";
    }],
    ["a nested unresolved alias", (bundle: AuthorityBundle) => {
      for (const entry of contextTokens(bundle, "color.semantic.fill.brand.default")) entry["resolvedValue"] = { nested: ["{number.semantic.opacity.end}"] };
    }],
    ["a malformed Domain entry", (bundle: AuthorityBundle) => {
      (bundle.tokenDomainRegistry["domains"] as unknown[])[0] = {};
    }],
    ["a Domain missing allowed DTCG types", (bundle: AuthorityBundle) => {
      delete (bundle.tokenDomainRegistry["domains"] as Record<string, unknown>[])[0]!["allowedDTCGTypes"];
    }],
    ["a Domain root mismatch", (bundle: AuthorityBundle) => {
      (bundle.tokenDomainRegistry["domains"] as Record<string, unknown>[])[0]!["root"] = "not-the-domain";
    }],
    ["a Domain constraint/DTCG mismatch", (bundle: AuthorityBundle) => {
      const domain = (bundle.tokenDomainRegistry["domains"] as Record<string, unknown>[]).find((entry) => entry["id"] === "breakpoint")!;
      domain["constraints"] = [{ kind: "numberRange", minimum: 0 }];
    }],
    ["a Domain minimum/exclusiveMinimum conflict", (bundle: AuthorityBundle) => {
      const domain = (bundle.tokenDomainRegistry["domains"] as Record<string, unknown>[]).find((entry) => entry["id"] === "opacity")!;
      domain["constraints"] = [{ kind: "numberRange", minimum: 0, exclusiveMinimum: 0 }];
    }],
    ["a malformed State entry", (bundle: AuthorityBundle) => {
      bundle.canonicalStateRegistry["states"] = [{}];
    }],
    ["a reversed State Registry", (bundle: AuthorityBundle) => {
      bundle.canonicalStateRegistry["states"] = [...(bundle.canonicalStateRegistry["states"] as unknown[])].reverse();
    }],
    ["an Appearance-inapplicable checked State", (bundle: AuthorityBundle) => {
      bundle.appearance["stateRules"] = [{ slot: "root", state: "checked", cases: [{ equals: true, apply: appearanceRecord("state")["declarations"] }] }];
    }],
    ["empty Condition containers", (bundle: AuthorityBundle) => {
      bundle.conditionRegistry["containers"] = [];
    }],
    ["a reversed Condition Registry", (bundle: AuthorityBundle) => {
      bundle.conditionRegistry["conditions"] = [...(bundle.conditionRegistry["conditions"] as unknown[])].reverse();
    }],
    ["a Condition ID/kind mismatch", (bundle: AuthorityBundle) => {
      const conditions = bundle.conditionRegistry["conditions"] as Record<string, unknown>[];
      const viewport = conditions.find((entry) => entry["kind"] === "viewport")!;
      viewport["id"] = "container.inline.bad";
    }],
    ["a breakpoint Condition with another Domain", (bundle: AuthorityBundle) => {
      const conditions = bundle.conditionRegistry["conditions"] as Record<string, unknown>[];
      const viewport = conditions.find((entry) => entry["kind"] === "viewport")!;
      viewport["value"] = { kind: "token", path: "duration.semantic.fast" };
    }],
    ["a breakpoint Condition with another DTCG type", (bundle: AuthorityBundle) => {
      for (const entry of contextTokens(bundle, "breakpoint.semantic.viewport.sm")) entry["dtcgType"] = "number";
    }],
    ["a px breakpoint value", (bundle: AuthorityBundle) => {
      for (const entry of contextTokens(bundle, "breakpoint.semantic.viewport.sm")) entry["resolvedValue"] = { value: 40, unit: "px" };
    }],
    ["a negative rem breakpoint value", (bundle: AuthorityBundle) => {
      for (const entry of contextTokens(bundle, "breakpoint.semantic.viewport.sm")) entry["resolvedValue"] = { value: -1, unit: "rem" };
    }],
    ["a theme-varying breakpoint value", (bundle: AuthorityBundle) => {
      contextTokens(bundle, "breakpoint.semantic.viewport.sm")[1]!["resolvedValue"] = { value: 41, unit: "rem" };
    }],
    ["an extra Effective Registry root", (bundle: AuthorityBundle) => {
      bundle.propertyRegistry["forbidden"] = true;
    }],
    ["an invalid Appearance base record", (bundle: AuthorityBundle) => {
      bundle.appearance["base"] = [{}];
    }],
    ["a forged Appearance origin stage", (bundle: AuthorityBundle) => {
      bundle.appearance["base"] = [appearanceRecord("condition")];
    }],
    ["a forged Appearance origin slot", (bundle: AuthorityBundle) => {
      bundle.appearance["slots"] = ["root", "label"];
      bundle.appearance["base"] = [appearanceRecord("base", "label")];
      ((bundle.appearance["base"] as Record<string, unknown>[])[0]!["declarations"] as Record<string, unknown>[])[0]!["origin"] = { recipeId: "button", slot: "root", stage: "base", source: "recipes/button.ts#/base/root/display" };
    }],
    ["a tokenless Appearance template", (bundle: AuthorityBundle) => {
      const record = appearanceRecord("base");
      (record.declarations[0] as Record<string, unknown>)["value"] = { kind: "css-template", parts: ["block"] };
      bundle.appearance["base"] = [record];
    }],
    ["a duplicate Appearance base Slot", (bundle: AuthorityBundle) => {
      bundle.appearance["base"] = [appearanceRecord("base"), appearanceRecord("base")];
    }],
    ["a duplicate Appearance Variant Slot", (bundle: AuthorityBundle) => {
      bundle.appearance["variantAxes"] = [{
        name: "tone",
        defaultValue: "neutral",
        values: [{ value: "neutral", apply: [appearanceRecord("variant"), appearanceRecord("variant")] }],
      }];
    }],
    ["a duplicate Appearance Compound Slot", (bundle: AuthorityBundle) => {
      bundle.appearance["variantAxes"] = [{
        name: "tone",
        defaultValue: "neutral",
        values: [{ value: "neutral", apply: [appearanceRecord("variant")] }],
      }];
      bundle.appearance["compoundRules"] = [{
        when: { variants: { tone: "neutral" } },
        apply: [appearanceRecord("compound"), appearanceRecord("compound")],
      }];
    }],
    ["a duplicate Appearance Condition Slot", (bundle: AuthorityBundle) => {
      bundle.appearance["conditionRules"] = [{ when: { all: ["preference.reducedMotion"] }, apply: [appearanceRecord("condition"), appearanceRecord("condition")] }];
    }],
  ] as const)("rejects %s through the real authority port and only AXM2004 through authoring", async (_name, mutate) => {
    const bundle = authorityBundle();
    mutate(bundle);
    const port = await createMotionAuthorityValidationPort(SPEC_ROOT);
    expect(port.validateBundle(bundle)).not.toEqual([]);
    const authoring = await createN23ForBundle(bundle, port);
    expect(errorCodes(() => authoring.defineMotion(motionSource()))).toEqual(["AXM2004"]);
  });

  it("maps a throwing real-port substitute to AXM2004 only", async () => {
    const authoring = await createN23ForBundle(authorityBundle(), {
      validateBundle: () => { throw new Error("port failure"); },
    });
    expect(errorCodes(() => authoring.defineMotion(motionSource()))).toEqual(["AXM2004"]);
  });

  it("captures authority values and expected digests before callers can mutate either input", async () => {
    const bundle = authorityBundle();
    const expectedDigests = expectedDigestsFor(bundle);
    const authoring = createMotionAuthoring({
      ...bundle,
      expectedDigests,
      canonicalDigest: motionDigest,
      serializers: [],
      authorityValidation: await createMotionAuthorityValidationPort(SPEC_ROOT),
    } as never);
    bundle.propertyRegistry["forbidden"] = true;
    expectedDigests.effectivePropertyRegistry = HASH;
    expect(authoring.defineMotion(motionSource()).motion).toMatchObject({ recipeId: "button", slot: "root" });
  });
});
