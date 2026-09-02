import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import type { SparsePropertyPolicySource, TokenBindingCatalog } from "@axiom/css-property-profile";

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

/** Retains array order while matching Axiom's canonical JSON normalization. */
const canonicalize = (value: unknown): unknown => Array.isArray(value)
  ? value.map(canonicalize)
  : value !== null && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, nested]) => [key, canonicalize(nested)]))
    : typeof value === "number" && Object.is(value, -0) ? 0 : value;

/** Supplies the trusted digest port used by both N22 fixture authorities and N23 applicability binding. */
const digest = { digestCanonicalJson: (value: unknown): string => `sha256:${createHash("sha256").update(`${JSON.stringify(canonicalize(value), null, 2)}\n`).digest("hex")}` };
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
const propertyPolicySource = {
  policy: readAuthority("spec/css/sparse-property-policy.json") as SparsePropertyPolicySource,
  bindings: readAuthority("spec/css/token-binding-catalog.json") as TokenBindingCatalog,
} as const;

const recipe = {
  definition: { id: "button", slots: ["root"], source: "recipes/button.ts", base: { root: { display: "block" } } },
  snapshot: { id: "button", slots: ["root"], base: [{ slot: "root", style: { display: "block" } }], variantAxes: [], stateRules: [], compoundVariants: [], conditions: [], source: "recipes/button.ts" },
  tokenBindingReport: { authority: { effectivePropertyRegistry: HASH, propertyPolicySource: HASH, resolvedTokenManifest: HASH, tokenDomainRegistry: HASH, projectorRegistry: HASH, canonicalStateRegistry: HASH, conditionRegistry: HASH, profileInputDigest: HASH, manifestSourceDigest: HASH, contexts: [{ theme: "light" }] }, bindings: [] },
} as const;

const appearanceInput = {
  propertyRegistry, canonicalStateRegistry, conditionRegistry,
  tokenValidation: {
    resolvedTokenManifest, tokenDomainRegistry, projectorRegistry,
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
    serializers: [...new Set(tokenDomainRegistry.domains.flatMap((domain: { readonly cssSerializers: readonly string[] }) => domain.cssSerializers))]
      .filter((id) => !(projectorRegistry as Readonly<{ readonly projectors: readonly { readonly id: string }[] }>).projectors.some((entry) => entry.id === id))
      .map((id) => ({ id, serialize: (entry: { readonly resolvedValue: unknown }): string => id === "css.color.v1" && typeof entry.resolvedValue === "object" && entry.resolvedValue !== null && "hex" in entry.resolvedValue
        ? String((entry.resolvedValue as { readonly hex: unknown }).hex)
        : String(entry.resolvedValue) })),
    projectors: (projectorRegistry as Readonly<{ readonly projectors: readonly { readonly id: string }[] }>).projectors.map(({ id }) => ({ id, project: () => id === "css.border-projector.v1" ? [{ property: "border-color", value: "red", source: "token" as const, field: "color" }, { property: "border-style", value: "solid", source: "token" as const, field: "style" }, { property: "border-width", value: "1px", source: "token" as const, field: "width" }] : [] })),
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
});
