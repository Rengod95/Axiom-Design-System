import { describe, expect, it } from "vitest";
import type { EffectiveCSSPropertyRegistry } from "@axiom/css-property-profile";

import { createMotionAuthoring, defineMotion, token } from "../index.js";

const SHA256_TEST_DIGEST = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const propertyRegistry = {
  schemaVersion: "0.1",
  profile: { schemaVersion: "0.1", id: "axiom-css", webrefPackageVersion: "0.0.0", webrefInputPath: "css.json", webrefInputDigest: SHA256_TEST_DIGEST, generatorVersion: "0.0.0", policySourceDigest: SHA256_TEST_DIGEST },
  properties: [{ name: "opacity", authoringName: "opacity", syntax: "<alpha-value>", sourceHref: "https://example.test/opacity", status: "standard", kind: "longhand", inherited: false, initialValue: "1", longhands: [], resetLonghands: [], policy: { authoring: "allowed", valueKinds: ["css", "token", "css-template"], tokenBindings: { directDomains: ["number"], templateDomains: ["number"], projectors: [], allowsTokenNegation: false }, rawCSS: "allowed", shorthand: "not-applicable", portability: "portable-candidate", motion: "interpolable", security: { resources: "allowed" }, provenance: [{ source: "test", rule: "test" }] } }],
  aliases: {}, authoringNames: { opacity: "opacity" }, customProperties: [],
} as const;

const manifestTokens = [{ id: "number.semantic.opacity.start", domain: "number", tier: "semantic", dtcgType: "number", resolvedValue: 0, source: { file: "test", pointer: "" }, dependencies: [] }, { id: "number.semantic.opacity.end", domain: "number", tier: "semantic", dtcgType: "number", resolvedValue: 1, source: { file: "test", pointer: "" }, dependencies: [] }, { id: "duration.semantic.fast", domain: "duration", tier: "semantic", dtcgType: "duration", resolvedValue: { value: 100, unit: "ms" }, source: { file: "test", pointer: "" }, dependencies: [] }, { id: "easing.semantic.standard", domain: "easing", tier: "semantic", dtcgType: "cubicBezier", resolvedValue: [0, 0, 1, 1], source: { file: "test", pointer: "" }, dependencies: [] }, { id: "breakpoint.semantic.viewport.sm", domain: "breakpoint", tier: "semantic", dtcgType: "dimension", resolvedValue: { value: 40, unit: "rem" }, source: { file: "test", pointer: "" }, dependencies: [] }] as const;
const manifest = { schemaVersion: "0.2", profileVersion: "0.1.0", sourceDigest: SHA256_TEST_DIGEST, contexts: [{ context: { theme: "light" }, tokens: [...manifestTokens].sort((left, right) => left.id.localeCompare(right.id, "en")) }, { context: { theme: "dark" }, tokens: [...manifestTokens].sort((left, right) => left.id.localeCompare(right.id, "en")) }] } as const;
const tokenDomains = { schemaVersion: "0.1", domains: [{ id: "breakpoint", root: "breakpoint", allowedDTCGTypes: ["dimension"], cssSerializers: ["css.test.v1"] }, { id: "duration", root: "duration", allowedDTCGTypes: ["duration"], cssSerializers: ["css.test.v1"] }, { id: "easing", root: "easing", allowedDTCGTypes: ["cubicBezier"], cssSerializers: ["css.test.v1"] }, { id: "number", root: "number", allowedDTCGTypes: ["number"], cssSerializers: ["css.test.v1"], }] } as const;
const states = { schemaVersion: "0.1", states: [{ id: "pressed", axis: "state", valueType: "boolean", applicableComponents: ["button"], usage: ["appearance", "motion"] }, { id: "selected", axis: "state", valueType: "boolean", applicableComponents: ["button"], usage: ["appearance"] }] } as const;
const conditions = { schemaVersion: "0.1", containers: [{ id: "component", cssName: "component" }], conditions: [{ id: "preference.reducedMotion", kind: "preference", feature: "prefers-reduced-motion", equals: "reduce" }, { id: "viewport.width.sm", kind: "viewport", feature: "width", comparison: ">=", value: { kind: "token", path: "breakpoint.semantic.viewport.sm" } }] } as const;
const appearance = { schemaVersion: "0.1", profile: "axiom-css", profileInputDigest: SHA256_TEST_DIGEST, recipeId: "button", slots: ["root"], base: [], variantAxes: [], stateRules: [], compoundRules: [], conditionRules: [] } as const;
const digest = { digestCanonicalJson: (_value: unknown) => SHA256_TEST_DIGEST };
/** Trusted pass-through used only by isolated synchronous Motion transformation unit tests. */
const unitAuthorityValidation = { validateBundle: () => [] } as const;
const expectedDigests = { profileInputDigest: SHA256_TEST_DIGEST, effectivePropertyRegistry: SHA256_TEST_DIGEST, resolvedTokenManifest: SHA256_TEST_DIGEST, tokenDomainRegistry: SHA256_TEST_DIGEST, canonicalStateRegistry: SHA256_TEST_DIGEST, conditionRegistryDigest: SHA256_TEST_DIGEST, appearanceIR: SHA256_TEST_DIGEST } as const;

/** Creates a deterministic authority bundle and permits one expected-identity mismatch per matrix case. */
const createAuthoring = (
  registry: EffectiveCSSPropertyRegistry = propertyRegistry,
  expected: Partial<typeof expectedDigests> = {},
) => createMotionAuthoring({
  propertyRegistry: registry, resolvedTokenManifest: manifest,
  tokenDomainRegistry: tokenDomains, canonicalStateRegistry: states, conditionRegistry: conditions, appearance,
  expectedDigests: { ...expectedDigests, ...expected }, canonicalDigest: digest,
  authorityValidation: unitAuthorityValidation,
  serializers: [{ id: "css.test.v1", serialize: (entry) => String(entry.resolvedValue) }],
});

/** Creates a self-consistently rehashed authority bundle for hostile construction-time validation probes. */
const createAuthoringWithAuthorities = (overrides: Readonly<Record<string, unknown>>) => createMotionAuthoring({
  propertyRegistry, resolvedTokenManifest: manifest, tokenDomainRegistry: tokenDomains,
  canonicalStateRegistry: states, conditionRegistry: conditions, appearance,
  expectedDigests, canonicalDigest: digest, authorityValidation: unitAuthorityValidation, serializers: [{ id: "css.test.v1", serialize: (entry: { readonly resolvedValue: unknown }) => String(entry.resolvedValue) }],
  ...overrides,
} as never);

/** Creates a fresh valid N23 source so matrix cases change only one contract rule. */
const source = () => ({
  id: "button.matrix", recipeId: "button", slot: "root",
  phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }],
  reducedMotion: { strategy: "disable" },
} as const);

/** Captures the governed code instead of coupling matrix assertions to messages. */
const errorCodes = (operation: () => unknown): readonly string[] => {
  try {
    operation();
  } catch (error) {
    if (typeof error === "object" && error !== null && "diagnostics" in error && Array.isArray(error.diagnostics)) {
      return error.diagnostics.map((entry) => typeof entry === "object" && entry !== null && "code" in entry ? String(entry.code) : "");
    }
  }
  throw new Error("Expected MotionAuthoringError");
};

describe("Motion authoring", () => {
  it("normalizes two literal keyframes with explicit provenance", () => {
    const authoring = createAuthoring();

    const result = authoring.defineMotion({
      id: "button.press", recipeId: "button", slot: "root",
      phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }],
      reducedMotion: { strategy: "disable" },
    } as const);

    expect(result.motion).toMatchObject({ recipeId: "button", slot: "root", profileInputDigest: SHA256_TEST_DIGEST, phases: [{ sequence: [{ tracks: [{ keyframes: [{ offset: 0, value: { kind: "css", value: "0" } }, { offset: 1, value: { kind: "css", value: "1" } }] }] }] }] });
    expect(Object.isFrozen(result.motion)).toBe(true);
  });

  it("retains direct Token keyframes after validating each serialized context", () => {
    const result = createAuthoring().defineMotion({
      id: "button.tokens", recipeId: "button", slot: "root",
      phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: [token("number.semantic.opacity.start"), token("number.semantic.opacity.end")] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }],
      reducedMotion: { strategy: "disable" },
    } as const);

    expect(result.motion.phases[0]?.sequence[0]?.tracks[0]?.keyframes[0]?.value).toEqual(token("number.semantic.opacity.start"));
  });

  it("rejects three shorthand keyframes because intermediate offsets are never inferred", () => {
    expect(() => createAuthoring().defineMotion({
      id: "button.invalid-offsets", recipeId: "button", slot: "root",
      phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "0.5", "1"] as unknown as readonly ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }],
      reducedMotion: { strategy: "disable" },
    } as const)).toThrowError(/validation failed/);
  });

  it("rejects an invalid CSS literal with the grammar diagnostic", () => {
    try {
      createAuthoring().defineMotion({
        id: "button.invalid-css", recipeId: "button", slot: "root",
        phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["not-an-opacity", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }],
        reducedMotion: { strategy: "disable" },
      } as const);
      throw new Error("expected MotionAuthoringError");
    } catch (error) {
      expect(error).toMatchObject({ diagnostics: expect.arrayContaining([expect.objectContaining({ code: "AXM1004" })]) });
    }
  });

  it("validates template Token bindings while grammar-checking a synthetic CSS variable", () => {
    const result = createAuthoring().defineMotion({
      id: "button.template", recipeId: "button", slot: "root",
      phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: [{ kind: "css-template", parts: ["", token("number.semantic.opacity.start"), ""] }, { kind: "css-template", parts: ["", token("number.semantic.opacity.end"), ""] }] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }],
      reducedMotion: { strategy: "disable" },
    } as const);

    expect(result.motion.phases[0]?.sequence[0]?.tracks[0]?.keyframes).toHaveLength(2);
  });

  it("rejects a duration field that references a Token from another Domain", () => {
    try {
      createAuthoring().defineMotion({
        id: "button.invalid-duration", recipeId: "button", slot: "root",
        phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("number.semantic.opacity.start"), easing: token("easing.semantic.standard") } }] }],
        reducedMotion: { strategy: "disable" },
      } as const);
      throw new Error("expected MotionAuthoringError");
    } catch (error) {
      expect(error).toMatchObject({ diagnostics: expect.arrayContaining([expect.objectContaining({ code: "AXM1008" })]) });
    }
  });

  it("requires discrete opt-in and preserves the accepted opt-in as a warning", () => {
    const discreteRegistry = {
      ...propertyRegistry,
      properties: [{ ...propertyRegistry.properties[0], policy: { ...propertyRegistry.properties[0].policy, motion: "discrete" } }],
    } as const;
    const definition = {
      id: "button.discrete", recipeId: "button", slot: "root",
      phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }],
      reducedMotion: { strategy: "disable" },
    } as const;
    expect(() => createAuthoring(discreteRegistry).defineMotion(definition)).toThrowError(/validation failed/);
    const accepted = createAuthoring(discreteRegistry).defineMotion({ ...definition, phases: [{ ...definition.phases[0], sequence: [{ ...definition.phases[0].sequence[0], tracks: [{ ...definition.phases[0].sequence[0].tracks[0], allowDiscrete: true }] }] }] });
    expect(accepted.diagnostics).toContainEqual(expect.objectContaining({ code: "AXM1015", severity: "warning" }));
  });

  it("rejects an open invalid segment position without invoking a source getter", () => {
    let getterReads = 0;
    const at = {
      kind: "absolute",
      seconds: -1,
      get extra() { getterReads += 1; return "must-not-run"; },
    };
    const source = {
      id: "button.closed-input", recipeId: "button", slot: "root",
      phases: [{ phase: "enter", sequence: [{ at, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }],
      reducedMotion: { strategy: "disable" },
    };

    try {
      createAuthoring().defineMotion(source as never);
      throw new Error("expected MotionAuthoringError");
    } catch (error) {
      expect(error).toMatchObject({ name: "MotionAuthoringError", diagnostics: expect.arrayContaining([expect.objectContaining({ code: "AXM2001" })]) });
    }
    expect(getterReads).toBe(0);
    expect(Object.isFrozen(source)).toBe(false);
  });

  it("constructs byte-stable closed Motion IR across source key permutations and JSON round-trips", () => {
    const transition = { easing: token("easing.semantic.standard"), duration: token("duration.semantic.fast"), type: "tween" } as const;
    const source = { reducedMotion: { strategy: "disable" }, slot: "root", recipeId: "button", id: "button.stable", phases: [{ sequence: [{ transition, tracks: [{ keyframes: ["0", "1"], allowDiscrete: false, property: "opacity" }], at: { kind: "afterPrevious" } }], phase: "enter" }] } as const;
    const first = createAuthoring().defineMotion(source).motion;
    const second = createAuthoring().defineMotion({ id: "button.stable", recipeId: "button", slot: "root", phases: source.phases, reducedMotion: source.reducedMotion }).motion;

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(Object.keys(first)).toEqual(["schemaVersion", "profile", "profileInputDigest", "conditionRegistryDigest", "id", "recipeId", "slot", "phases", "reducedMotion"]);
  });

  it("retains shorthand source literals in defineMotion while normalizing only the emitted IR", () => {
    const source = { id: "button.capture", recipeId: "button", slot: "root", phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }], reducedMotion: { strategy: "disable" } } as const;
    const captured = defineMotion(source);
    const result = createAuthoring().defineMotion(source);
    expect(captured.phases[0].sequence[0].tracks[0].keyframes[0]).toBe("0");
    expect(result.definition.phases[0].sequence[0].tracks[0].keyframes[0]).toBe("0");
    expect(result.motion.phases[0]?.sequence[0]?.tracks[0]?.keyframes[0]?.offset).toBe(0);
  });

  it("rejects sparse arrays and accepts closed CSS literal objects", () => {
    const sparse = { id: "button.sparse", recipeId: "button", slot: "root", phases: Array(1), reducedMotion: { strategy: "disable" } };
    expect(() => createAuthoring().defineMotion(sparse as never)).toThrowError(/validation failed/);
    const result = createAuthoring().defineMotion({ id: "button.css-object", recipeId: "button", slot: "root", phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: [{ kind: "css", value: "0" }, { kind: "css", value: "1" }] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }], reducedMotion: { strategy: "disable" } } as const);
    expect(result.motion.phases[0]?.sequence[0]?.tracks[0]?.keyframes[0]?.value).toEqual({ kind: "css", value: "0" });
  });

  it("routes missing reduced motion and malformed unused authorities through governed diagnostics", () => {
    const source = { id: "button.no-reduced", recipeId: "button", slot: "root", phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }] };
    try { createAuthoring().defineMotion(source as never); throw new Error("expected"); } catch (error) { expect(error).toMatchObject({ diagnostics: expect.arrayContaining([expect.objectContaining({ code: "AXM1007" })]) }); }
    const invalid = createMotionAuthoring({ propertyRegistry: { garbage: true } as never, resolvedTokenManifest: { garbage: true } as never, tokenDomainRegistry: { garbage: true } as never, canonicalStateRegistry: { garbage: true } as never, conditionRegistry: { garbage: true } as never, appearance, expectedDigests, canonicalDigest: digest, authorityValidation: unitAuthorityValidation, serializers: [] });
    expect(() => invalid.defineMotion({ id: "button.authority", recipeId: "button", slot: "root", phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }], reducedMotion: { strategy: "disable" } } as const)).toThrowError(/validation failed/);
  });

  it.each([
    ["one-context resolved manifest", { resolvedTokenManifest: { ...manifest, contexts: [manifest.contexts[0]] } }],
    ["cross-context Token identity mismatch", { resolvedTokenManifest: { ...manifest, contexts: [manifest.contexts[0], { ...manifest.contexts[1], tokens: [{ ...manifest.contexts[1].tokens[0], domain: "duration" }, ...manifest.contexts[1].tokens.slice(1)] }] } }],
    ["malformed Token Domain entry", { tokenDomainRegistry: { ...tokenDomains, domains: [{ id: "number", root: "number", allowedDTCGTypes: ["number"] }] } }],
    ["malformed Canonical State entry", { canonicalStateRegistry: { ...states, states: [{ ...states.states[0], valueType: "enum", values: [] }] } }],
    ["empty Condition containers", { conditionRegistry: { ...conditions, containers: [] } }],
    ["schema-invalid N22 Appearance declaration", { appearance: { ...appearance, base: [{}] } }],
  ] as const)("rejects a self-consistently rehashed %s before unused authority digest comparison", (_name, overrides) => {
    expect(errorCodes(() => createAuthoringWithAuthorities(overrides).defineMotion(source()))).toContain("AXM2004");
  });

  it.each([
    ["extra Effective Property Registry root key", { propertyRegistry: { ...propertyRegistry, forbidden: true } }],
    ["dark Token order swap", { resolvedTokenManifest: { ...manifest, contexts: [manifest.contexts[0], { ...manifest.contexts[1], tokens: [...manifest.contexts[1].tokens].reverse() }] } }],
    ["reversed Domain Registry order", { tokenDomainRegistry: { ...tokenDomains, domains: [...tokenDomains.domains].reverse() } }],
    ["reversed Canonical State order", { canonicalStateRegistry: { ...states, states: [...states.states].reverse() } }],
    ["reversed Condition order", { conditionRegistry: { ...conditions, conditions: [...conditions.conditions].reverse() } }],
    ["token-free Appearance template", { appearance: { ...appearance, base: [{ slot: "root", declarations: [{ property: "opacity", value: { kind: "css-template", parts: ["1"] }, important: false, origin: { recipeId: "button", slot: "root", source: "button.ts", stage: "base" } }] }] } }],
    ["Appearance base origin stage", { appearance: { ...appearance, base: [{ slot: "root", declarations: [{ property: "opacity", value: { kind: "css", value: "1" }, important: false, origin: { recipeId: "button", slot: "root", source: "button.ts", stage: "condition" } }] }] } }],
    ["Appearance containing slot mismatch", { appearance: { ...appearance, slots: ["root", "label"], base: [{ slot: "root", declarations: [{ property: "opacity", value: { kind: "css", value: "1" }, important: false, origin: { recipeId: "button", slot: "label", source: "button.ts", stage: "base" } }] }] } }],
    ["Appearance state applicability", { canonicalStateRegistry: { ...states, states: [{ id: "checked", axis: "state", valueType: "boolean", applicableComponents: ["checkbox"], usage: ["appearance"] }] }, appearance: { ...appearance, stateRules: [{ slot: "root", state: "checked", cases: [{ equals: true, apply: [{ property: "opacity", value: { kind: "css", value: "1" }, important: false, origin: { recipeId: "button", slot: "root", source: "button.ts", stage: "state" } }] }] }] } }],
    ["both reversed Token contexts", { resolvedTokenManifest: { ...manifest, contexts: manifest.contexts.map((context) => ({ ...context, tokens: [...context.tokens].reverse() })) } }],
    ["Token id Domain mismatch", { resolvedTokenManifest: { ...manifest, contexts: manifest.contexts.map((context) => ({ ...context, tokens: [{ ...context.tokens[0], domain: "duration" }, ...context.tokens.slice(1)] })) } }],
    ["unknown Token dependency", { resolvedTokenManifest: { ...manifest, contexts: manifest.contexts.map((context) => ({ ...context, tokens: [{ ...context.tokens[0], dependencies: ["number.semantic.missing"] }, ...context.tokens.slice(1)] })) } }],
    ["unresolved Token alias", { resolvedTokenManifest: { ...manifest, contexts: manifest.contexts.map((context) => ({ ...context, tokens: [{ ...context.tokens[0], resolvedValue: { kind: "token", path: "number.semantic.opacity.end" } }, ...context.tokens.slice(1)] })) } }],
    ["Domain constraint type mismatch", { tokenDomainRegistry: { ...tokenDomains, domains: [{ ...tokenDomains.domains[0], constraints: [{ kind: "numberRange" }] }, ...tokenDomains.domains.slice(1)] } }],
    ["Condition id kind mismatch", { conditionRegistry: { ...conditions, conditions: [{ ...conditions.conditions[0], id: "viewport.width.bad" }, ...conditions.conditions.slice(1)] } }],
    ["Condition breakpoint Token mismatch", { conditionRegistry: { ...conditions, conditions: [conditions.conditions[0], { ...conditions.conditions[1], value: token("duration.semantic.fast") }] } }],
    ["duplicate Appearance base slot", { appearance: { ...appearance, base: [{ slot: "root", declarations: [] }, { slot: "root", declarations: [] }] } }],
  ] as const)("returns only AXM2004 for a self-rehashed malformed %s", (_name, overrides) => {
    expect(errorCodes(() => createAuthoringWithAuthorities(overrides).defineMotion(source()))).toEqual(["AXM2004"]);
  });

  it.each([
    "profileInputDigest",
    "effectivePropertyRegistry",
    "resolvedTokenManifest",
    "tokenDomainRegistry",
    "canonicalStateRegistry",
    "conditionRegistryDigest",
    "appearanceIR",
  ] as const)("rejects a mismatched %s authority identity even when the source does not consume it", (field) => {
    const otherDigest = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    expect(errorCodes(() => createAuthoring(propertyRegistry, { [field]: otherDigest } as Partial<typeof expectedDigests>).defineMotion(source()))).toContain(
      field === "profileInputDigest" ? "AXM1010" : field === "conditionRegistryDigest" ? "AXM1011" : field === "appearanceIR" ? "AXM1018" : "AXM2004",
    );
  });

  it("routes explicit offset bounds through AXM1005 after structural capture", () => {
    const source = { id: "button.offset", recipeId: "button", slot: "root", phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: [{ offset: 0, value: "0" }, { offset: 0, value: "0.5" }, { offset: 1, value: "1" }] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }], reducedMotion: { strategy: "disable" } } as const;
    expect(() => createAuthoring().defineMotion(source)).toThrowError(/validation failed/);
    try { createAuthoring().defineMotion(source); } catch (error) { expect(error).toMatchObject({ diagnostics: expect.arrayContaining([expect.objectContaining({ code: "AXM1005" })]) }); }
  });

  it("normalizes explicit three-keyframe authoring without inferring intermediate offsets", () => {
    const definition = source();
    const result = createAuthoring().defineMotion({
      ...definition,
      phases: [{ ...definition.phases[0], sequence: [{ ...definition.phases[0].sequence[0], tracks: [{ ...definition.phases[0].sequence[0].tracks[0], keyframes: [{ offset: 0, value: "0" }, { offset: 0.5, value: "0.5" }, { offset: 1, value: "1" }] }] }] }],
    });
    expect(result.motion.phases[0]?.sequence[0]?.tracks[0]?.keyframes.map((entry) => entry.offset)).toEqual([0, 0.5, 1]);
  });

  it.each([
    ["mixed shorthand and explicit values", ["0", { offset: 1, value: "1" }], "AXM2001"],
    ["duplicate explicit offsets", [{ offset: 0, value: "0" }, { offset: 0, value: "0.5" }, { offset: 1, value: "1" }], "AXM1005"],
    ["non-finite offsets", [{ offset: 0, value: "0" }, { offset: Number.NaN, value: "0.5" }, { offset: 1, value: "1" }], "AXM2001"],
    ["out-of-range offsets", [{ offset: 0, value: "0" }, { offset: 1.1, value: "0.5" }, { offset: 1, value: "1" }], "AXM1005"],
    ["missing zero endpoint", [{ offset: 0.1, value: "0" }, { offset: 0.5, value: "0.5" }, { offset: 1, value: "1" }], "AXM1005"],
    ["missing one endpoint", [{ offset: 0, value: "0" }, { offset: 0.5, value: "0.5" }, { offset: 0.9, value: "1" }], "AXM1005"],
  ] as const)("rejects %s", (_name, keyframes, code) => {
    const definition = source();
    const invalid = { ...definition, phases: [{ ...definition.phases[0], sequence: [{ ...definition.phases[0].sequence[0], tracks: [{ ...definition.phases[0].sequence[0].tracks[0], keyframes }] }] }] };
    expect(errorCodes(() => createAuthoring().defineMotion(invalid as never))).toContain(code);
  });

  it.each([
    ["absolute", { kind: "absolute", seconds: 0 }],
    ["overlapPrevious", { kind: "overlapPrevious", seconds: 0.25 }],
  ] as const)("accepts %s segment positions", (_kind, at) => {
    const definition = source();
    expect(createAuthoring().defineMotion({ ...definition, phases: [{ ...definition.phases[0], sequence: [{ ...definition.phases[0].sequence[0], at }] }] } as never).motion.phases[0]?.sequence[0]?.at).toEqual(at);
  });

  it.each([
    ["negative absolute", { kind: "absolute", seconds: -0.1 }],
    ["zero overlap", { kind: "overlapPrevious", seconds: 0 }],
    ["unknown position", { kind: "parallel" }],
  ] as const)("rejects %s segment positions", (_name, at) => {
    const definition = source();
    expect(errorCodes(() => createAuthoring().defineMotion({ ...definition, phases: [{ ...definition.phases[0], sequence: [{ ...definition.phases[0].sequence[0], at }] }] } as never))).toContain("AXM2001");
  });

  it.each([
    ["requires tween easing", { type: "tween", duration: token("duration.semantic.fast") }],
    ["forbids tween extras", { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard"), bounce: 0.5 }],
    ["requires known transition kind", { type: "backend", duration: token("duration.semantic.fast") }],
  ] as const)("rejects closed transition rule: %s", (_name, transition) => {
    const definition = source();
    expect(errorCodes(() => createAuthoring().defineMotion({ ...definition, phases: [{ ...definition.phases[0], sequence: [{ ...definition.phases[0].sequence[0], transition }] }] } as never))).toContain("AXM2001");
  });

  it.each([
    [{ type: "spring" }],
    [{ type: "spring", duration: token("duration.semantic.fast"), bounce: 0, stiffness: 1, damping: 1, mass: 1 }],
    [{ type: "spring", bounce: 1, stiffness: 0.1, damping: 0.1, mass: 0.1 }],
  ] as const)("accepts bounded spring forms", (transition) => {
    const definition = source();
    expect(createAuthoring().defineMotion({ ...definition, phases: [{ ...definition.phases[0], sequence: [{ ...definition.phases[0].sequence[0], transition }] }] } as never).motion.phases[0]?.sequence[0]?.transition).toEqual(transition);
  });

  it.each([
    [{ type: "spring", bounce: -0.1 }],
    [{ type: "spring", bounce: 1.1 }],
    [{ type: "spring", stiffness: 0 }],
    [{ type: "spring", damping: -1 }],
    [{ type: "spring", mass: Number.NaN }],
  ] as const)("rejects spring bounds", (transition) => {
    const definition = source();
    expect(errorCodes(() => createAuthoring().defineMotion({ ...definition, phases: [{ ...definition.phases[0], sequence: [{ ...definition.phases[0].sequence[0], transition }] }] } as never))).toContain("AXM2001");
  });

  it("validates boolean and enum state transitions while rejecting lifecycle axes", () => {
    const definition = source();
    const booleanPhase = { phase: "stateChange", state: { name: "pressed", from: false, to: true }, sequence: definition.phases[0].sequence } as const;
    expect(createAuthoring().defineMotion({ ...definition, phases: [booleanPhase] }).motion.phases[0]).toMatchObject({ phase: "stateChange", state: { name: "pressed", from: false, to: true } });
    const enumStates = { ...states, states: [{ id: "orientation", axis: "state", valueType: "enum", values: ["horizontal", "vertical"], applicableComponents: ["button"], usage: ["appearance", "motion"] }] } as const;
    const enumPhase = { phase: "stateChange", state: { name: "orientation", from: "horizontal", to: "vertical" }, sequence: definition.phases[0].sequence } as const;
    expect(createMotionAuthoring({ propertyRegistry, resolvedTokenManifest: manifest, tokenDomainRegistry: tokenDomains, canonicalStateRegistry: enumStates, conditionRegistry: conditions, appearance, expectedDigests, canonicalDigest: digest, authorityValidation: unitAuthorityValidation, serializers: [{ id: "css.test.v1", serialize: (entry) => String(entry.resolvedValue) }] }).defineMotion({ ...definition, phases: [enumPhase] }).motion.phases[0]).toMatchObject({ state: { name: "orientation" } });
    const lifecycleStates = { ...states, states: [{ ...states.states[0], axis: "lifecycle" }] } as never;
    const lifecycle = createMotionAuthoring({ propertyRegistry, resolvedTokenManifest: manifest, tokenDomainRegistry: tokenDomains, canonicalStateRegistry: lifecycleStates, conditionRegistry: conditions, appearance, expectedDigests, canonicalDigest: digest, authorityValidation: unitAuthorityValidation, serializers: [{ id: "css.test.v1", serialize: (entry) => String(entry.resolvedValue) }] });
    expect(errorCodes(() => lifecycle.defineMotion({ ...definition, phases: [booleanPhase] }))).toContain("AXM1013");
  });

  it("keeps reduced replacement independent and diagnoses invalid reduction shapes", () => {
    const definition = source();
    const replacement = { phase: "exit", sequence: [{ ...definition.phases[0].sequence[0], transition: { type: "spring", bounce: 0.5 } }] } as const;
    expect(createAuthoring().defineMotion({ ...definition, reducedMotion: { strategy: "replace", phases: [replacement] } }).motion.reducedMotion).toMatchObject({ strategy: "replace", phases: [{ phase: "exit", sequence: [{ transition: { type: "spring" } }] }] });
    expect(errorCodes(() => createAuthoring().defineMotion({ ...definition, reducedMotion: { strategy: "replace", phases: [] } } as never))).toContain("AXM1007");
    expect(errorCodes(() => createAuthoring().defineMotion({ ...definition, reducedMotion: { strategy: "unknown" } } as never))).toContain("AXM1007");
  });

  it("preserves unknown capability warnings and reports serializer grammar or port failures", () => {
    const unknownRegistry = { ...propertyRegistry, properties: [{ ...propertyRegistry.properties[0], policy: { ...propertyRegistry.properties[0].policy, motion: "unknown" } }] } as const;
    expect(createAuthoring(unknownRegistry).defineMotion(source()).diagnostics).toContainEqual(expect.objectContaining({ code: "AXM1012", severity: "warning" }));
    const invalidSerializer = createMotionAuthoring({ propertyRegistry, resolvedTokenManifest: manifest, tokenDomainRegistry: tokenDomains, canonicalStateRegistry: states, conditionRegistry: conditions, appearance, expectedDigests, canonicalDigest: digest, authorityValidation: unitAuthorityValidation, serializers: [{ id: "css.test.v1", serialize: () => "not-an-opacity" }] });
    const direct = { ...source(), phases: [{ ...source().phases[0], sequence: [{ ...source().phases[0].sequence[0], tracks: [{ ...source().phases[0].sequence[0].tracks[0], keyframes: [token("number.semantic.opacity.start"), token("number.semantic.opacity.start")] }] }] }] } as const;
    expect(errorCodes(() => invalidSerializer.defineMotion(direct))).toContain("AXM1004");
    const throwingSerializer = createMotionAuthoring({ propertyRegistry, resolvedTokenManifest: manifest, tokenDomainRegistry: tokenDomains, canonicalStateRegistry: states, conditionRegistry: conditions, appearance, expectedDigests, canonicalDigest: digest, authorityValidation: unitAuthorityValidation, serializers: [{ id: "css.test.v1", serialize: () => { throw new Error("port failure"); } }] });
    expect(errorCodes(() => throwingSerializer.defineMotion(direct))).toContain("AXM2004");
  });

  it("captures executable authority ports and serializers at construction time", () => {
    const canonicalDigest = { digestCanonicalJson: (_value: unknown) => SHA256_TEST_DIGEST };
    const authorityValidation = {
      validateBundle: (_snapshot: unknown): readonly { readonly code: string; readonly message: string }[] => [],
    };
    const serializers = [{ id: "css.test.v1", serialize: (entry: { readonly resolvedValue: unknown }) => String(entry.resolvedValue) }];
    const authoring = createMotionAuthoring({
      propertyRegistry, resolvedTokenManifest: manifest, tokenDomainRegistry: tokenDomains,
      canonicalStateRegistry: states, conditionRegistry: conditions, appearance, expectedDigests,
      canonicalDigest, authorityValidation, serializers,
    });

    canonicalDigest.digestCanonicalJson = () => { throw new Error("mutated digest port"); };
    authorityValidation.validateBundle = () => [{ code: "MUTATED", message: "mutated validator" }];
    serializers[0]!.serialize = () => "not-an-opacity";
    serializers.push({ id: "css.injected.v1", serialize: () => "not-an-opacity" });

    const direct = {
      ...source(),
      phases: [{
        ...source().phases[0],
        sequence: [{
          ...source().phases[0].sequence[0],
          tracks: [{
            ...source().phases[0].sequence[0].tracks[0],
            keyframes: [token("number.semantic.opacity.start"), token("number.semantic.opacity.end")],
          }],
        }],
      }],
    } as const;

    expect(authoring.defineMotion(direct).motion.phases[0]?.sequence[0]?.tracks[0]?.keyframes)
      .toEqual([
        { offset: 0, value: token("number.semantic.opacity.start") },
        { offset: 1, value: token("number.semantic.opacity.end") },
      ]);
  });
});
