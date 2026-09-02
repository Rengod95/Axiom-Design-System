import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";
import { digestResolvedTokenManifest, type ResolvedTokenManifest } from "@axiom/tokens";
import type {
  EffectiveCSSPropertyRegistry,
  SparsePropertyPolicySource,
  TokenBindingCatalog,
} from "@axiom/css-property-profile";

import {
  createCSSRecipeAuthoring,
  cssTemplate,
  negateToken,
  projectToken,
  token,
  validateTokenBinding,
} from "./index.js";

const propertyRegistry = JSON.parse(readFileSync(
    new URL("../../../spec/css/effective-property-registry.json", import.meta.url),
    "utf8",
  )) as EffectiveCSSPropertyRegistry;
const propertyPolicySource = {
  policy: JSON.parse(readFileSync(
    new URL("../../../spec/css/sparse-property-policy.json", import.meta.url),
    "utf8",
  )) as SparsePropertyPolicySource,
  bindings: JSON.parse(readFileSync(
    new URL("../../../spec/css/token-binding-catalog.json", import.meta.url),
    "utf8",
  )) as TokenBindingCatalog,
} as const;

const canonical = (value: unknown): unknown => Array.isArray(value)
  ? value.map(canonical)
  : value !== null && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [key, canonical(item)]))
    : typeof value === "number" && Object.is(value, -0) ? 0 : value;

/** Uses content-sensitive test digests so authority changes cannot be hidden by a constant port. */
const canonicalDigest = {
  digestCanonicalJson: (value: unknown): string => `sha256:${createHash("sha256").update(`${JSON.stringify(canonical(value), null, 2)}\n`).digest("hex")}`,
};

const states = { schemaVersion: "0.1", states: [{
  id: "pressed", axis: "state", valueType: "boolean", applicableComponents: ["button"], usage: ["appearance"],
}] } as const;
const conditions = { schemaVersion: "0.1", containers: [{ id: "component", cssName: "axiom-component" }], conditions: [{
  id: "preference.reducedMotion", kind: "preference", feature: "prefers-reduced-motion", equals: "reduce",
}] } as const;

const entry = (id: string, domain: string, dtcgType: string, resolvedValue: unknown) => ({
  id, domain, tier: "semantic", dtcgType, resolvedValue,
  source: { file: "tokens.json", pointer: `/${id}` }, dependencies: [],
});

const baseManifest = (): ResolvedTokenManifest => ({
  schemaVersion: "0.2", profileVersion: "0.1.0", sourceDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  contexts: [
    { context: { theme: "light" }, tokens: [
      entry("border.semantic.default", "border", "border", { color: "red" }), entry("breakpoint.semantic.sm", "breakpoint", "dimension", "640px"),
      entry("color.semantic.brand", "color", "color", "red"), entry("space.semantic.gutter", "space", "dimension", "8px"),
      entry("transition.semantic.fast", "transition", "transition", { duration: "100ms" }),
    ] },
    { context: { theme: "dark" }, tokens: [
      entry("border.semantic.default", "border", "border", { color: "blue" }), entry("breakpoint.semantic.sm", "breakpoint", "dimension", "640px"),
      entry("color.semantic.brand", "color", "color", "blue"), entry("space.semantic.gutter", "space", "dimension", "12px"),
      entry("transition.semantic.fast", "transition", "transition", { duration: "200ms" }),
    ] },
  ],
} as never);

const domains = { schemaVersion: "0.1", domains: [
  { id: "border", root: "border", allowedDTCGTypes: ["border"], cssSerializers: ["css.border-projector.v1"] },
  { id: "breakpoint", root: "breakpoint", allowedDTCGTypes: ["dimension"], cssSerializers: ["css.dimension.v1"] },
  { id: "color", root: "color", allowedDTCGTypes: ["color"], cssSerializers: ["css.color.v1"] },
  { id: "space", root: "space", allowedDTCGTypes: ["dimension"], cssSerializers: ["css.dimension.v1"] },
  { id: "transition", root: "transition", allowedDTCGTypes: ["transition"], cssSerializers: ["css.transition-projector.v1"] },
] } as const;

const projectorRegistry = { schemaVersion: "0.1", projectors: [
  { id: "css.border-projector.v1", domain: "border", dtcgType: "border", outputProperties: ["border-color", "border-style", "border-width"], version: "1.0.0" },
  { id: "css.transition-projector.v1", domain: "transition", dtcgType: "transition", outputProperties: ["transition-delay", "transition-duration", "transition-property", "transition-timing-function"], version: "1.0.0" },
] } as const;

const defaultProjectors = () => [
  { id: "css.border-projector.v1", project: (_resolved: { readonly resolvedValue: unknown }) => [
    { property: "border-color", value: "red", source: "token", field: "color" },
    { property: "border-style", value: "solid", source: "token", field: "style" },
    { property: "border-width", value: "1px", source: "token", field: "width" },
  ] },
  { id: "css.transition-projector.v1", project: (_resolved: { readonly resolvedValue: unknown }, parameters: { readonly properties: readonly string[] }) => [
    { property: "transition-delay", value: "0ms", source: "token", field: "delay" },
    { property: "transition-duration", value: "100ms", source: "token", field: "duration" },
    { property: "transition-property", value: parameters.properties.join(", "), source: "parameters", field: "properties" },
    { property: "transition-timing-function", value: "ease", source: "token", field: "timingFunction" },
  ] },
];

const fixture = (overrides: Record<string, unknown> = {}) => {
  const resolvedTokenManifest = (overrides.manifest ?? baseManifest()) as ResolvedTokenManifest;
  const tokenDomainRegistry = (overrides.domains ?? domains) as never;
  const authorityDigests = {
    effectivePropertyRegistry: canonicalDigest.digestCanonicalJson(propertyRegistry),
    propertyPolicySource: canonicalDigest.digestCanonicalJson(propertyPolicySource),
    resolvedTokenManifest: digestResolvedTokenManifest(resolvedTokenManifest, canonicalDigest as never),
    tokenDomainRegistry: canonicalDigest.digestCanonicalJson(tokenDomainRegistry),
    projectorRegistry: canonicalDigest.digestCanonicalJson(projectorRegistry),
    canonicalStateRegistry: canonicalDigest.digestCanonicalJson(states),
    conditionRegistry: canonicalDigest.digestCanonicalJson(conditions),
    ...(overrides.authorityDigests as object ?? {}),
  };
  return {
    propertyRegistry, canonicalStateRegistry: states, conditionRegistry: conditions,
    ...(overrides.enabledExperimentalProperties === undefined ? {} : { enabledExperimentalProperties: overrides.enabledExperimentalProperties }),
    tokenValidation: {
      resolvedTokenManifest, tokenDomainRegistry, projectorRegistry,
      propertyPolicySource: (overrides.propertyPolicySource ?? propertyPolicySource) as never,
      authorityDigests,
      canonicalDigest: (overrides.canonicalDigest ?? canonicalDigest) as never,
      serializers: (overrides.serializers ?? [
        { id: "css.color.v1", serialize: (resolved: { readonly resolvedValue: unknown }) => String(resolved.resolvedValue) },
        { id: "css.dimension.v1", serialize: (resolved: { readonly resolvedValue: unknown }) => String(resolved.resolvedValue) },
      ]) as never,
      projectors: (overrides.projectors ?? defaultProjectors()) as never,
    },
  } as never;
};

/** Creates detached authority data so semantic probes can recompute every declared digest. */
const semanticFixture = (): Record<string, unknown> => {
  const input = fixture() as unknown as Record<string, unknown>;
  input["propertyRegistry"] = structuredClone(input["propertyRegistry"]);
  input["canonicalStateRegistry"] = structuredClone(input["canonicalStateRegistry"]);
  input["conditionRegistry"] = structuredClone(input["conditionRegistry"]);
  const validation = input["tokenValidation"] as Record<string, unknown>;
  input["tokenValidation"] = {
    ...validation,
    resolvedTokenManifest: structuredClone(validation["resolvedTokenManifest"]),
    tokenDomainRegistry: structuredClone(validation["tokenDomainRegistry"]),
    projectorRegistry: structuredClone(validation["projectorRegistry"]),
    propertyPolicySource: structuredClone(validation["propertyPolicySource"]),
    authorityDigests: { ...(validation["authorityDigests"] as Record<string, unknown>) },
  };
  return input;
};

/** Recomputes all explicit authorities after a semantic probe changes its detached input. */
const recomputeAuthorityDigests = (input: Record<string, unknown>): void => {
  const validation = input["tokenValidation"] as Record<string, unknown>;
  const digests = validation["authorityDigests"] as Record<string, string>;
  const manifest = validation["resolvedTokenManifest"] as ResolvedTokenManifest;
  digests["effectivePropertyRegistry"] = canonicalDigest.digestCanonicalJson(input["propertyRegistry"]);
  digests["propertyPolicySource"] = canonicalDigest.digestCanonicalJson(validation["propertyPolicySource"]);
  digests["resolvedTokenManifest"] = digestResolvedTokenManifest(manifest, canonicalDigest as never);
  digests["tokenDomainRegistry"] = canonicalDigest.digestCanonicalJson(validation["tokenDomainRegistry"]);
  digests["projectorRegistry"] = canonicalDigest.digestCanonicalJson(validation["projectorRegistry"]);
  digests["canonicalStateRegistry"] = canonicalDigest.digestCanonicalJson(input["canonicalStateRegistry"]);
  digests["conditionRegistry"] = canonicalDigest.digestCanonicalJson(input["conditionRegistry"]);
};

const path = (property: string) => ({ recipeId: "button", slot: "root", stage: "base" as const, property, source: "tokens.test.ts", pointer: `/base/root/${property}`, declarationIndex: 0 });
const reference = (id: string) => ({ kind: "token" as const, path: id });
const codeFor = (input: unknown, property: string, value: unknown): string | undefined => validateTokenBinding(input as never, { path: path(property), value } as never).diagnostics[0]?.code;

describe("Token projector authoring", () => {
  it("creates a closed authoring-only projector value", () => {
    expect(projectToken(token("shadow.semantic.raised"), { projector: "css.shadow.v1" })).toEqual({ kind: "token-projector", token: { kind: "token", path: "shadow.semantic.raised" }, projector: "css.shadow.v1" });
  });
});

describe("N21 authority and resolved-manifest boundary", () => {
  it("accepts condition-only policy only through the authenticated CSS policy source", () => {
    const input = fixture() as unknown as Record<string, unknown>;
    const validation = input["tokenValidation"] as Record<string, unknown>;
    validation["propertyPolicySource"] = propertyPolicySource;
    delete validation["conditionOnlyDomains"];
    const digests = validation["authorityDigests"] as Record<string, string>;
    digests["propertyPolicySource"] = canonicalDigest.digestCanonicalJson(propertyPolicySource);

    expect(codeFor(input, "color", reference("color.semantic.brand"))).toBeUndefined();
    expect(codeFor(input, "width", reference("breakpoint.semantic.sm"))).toBe("AXA1104");
  });

  it("rejects changed condition-only policy under the previous authority digest", () => {
    const input = fixture() as unknown as Record<string, unknown>;
    const validation = input["tokenValidation"] as Record<string, unknown>;
    validation["propertyPolicySource"] = structuredClone(propertyPolicySource);
    delete validation["conditionOnlyDomains"];
    const digests = validation["authorityDigests"] as Record<string, string>;
    digests["propertyPolicySource"] = canonicalDigest.digestCanonicalJson(propertyPolicySource);
    const source = validation["propertyPolicySource"] as {
      bindings: { conditionOnlyDomains: string[] };
    };
    source.bindings.conditionOnlyDomains = ["color"];

    expect(codeFor(input, "color", reference("color.semantic.brand"))).toBe("AXA1101");
  });

  it("rejects the former free condition-only configuration input", () => {
    const input = fixture() as unknown as Record<string, unknown>;
    const validation = input["tokenValidation"] as Record<string, unknown>;
    validation["conditionOnlyDomains"] = ["breakpoint"];

    expect(codeFor(input, "color", reference("color.semantic.brand"))).toBe("AXA1101");
  });

  it.each([
    ["content-sensitive authority mismatch", fixture({ authorityDigests: { tokenDomainRegistry: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" } }), "AXA1101"],
    ["missing Token validation config", { ...fixture(), tokenValidation: undefined }, "AXA1101"],
    ["missing serializer ports", fixture({ serializers: [] }), "AXP1104"],
    ["throwing digest port", fixture({ canonicalDigest: { digestCanonicalJson: () => { throw new Error("digest"); } } }), "AXA1101"],
  ])("returns a typed diagnostic for %s", (_name, input, expected) => expect(codeFor(input, "color", reference("color.semantic.brand"))).toBe(expected));

  it("rejects incomplete authority ports while constructing the authoring boundary", () => {
    expect(() => createCSSRecipeAuthoring(fixture({ serializers: [] }))).toThrow("Axiom CSS Recipe authoring validation failed.");
  });

  it.each([
    ["a discriminated Domain constraint", (input: Record<string, unknown>) => { const tokenValidation = input["tokenValidation"] as Record<string, unknown>; const domains = tokenValidation["tokenDomainRegistry"] as Record<string, unknown>; domains["domains"] = [{ id: "color", root: "color", allowedDTCGTypes: ["color"], cssSerializers: ["css.color.v1"], constraints: [{ kind: "unknown" }] }]; }],
    ["a nested property-policy provenance record", (input: Record<string, unknown>) => { const registry = input["propertyRegistry"] as Record<string, unknown>; const properties = registry["properties"] as Array<Record<string, unknown>>; const policy = properties[0]!["policy"] as Record<string, unknown>; policy["provenance"] = [{}]; }],
    ["a State enum without its values", (input: Record<string, unknown>) => { const states = input["canonicalStateRegistry"] as Record<string, unknown>; states["states"] = [{ id: "orientation", axis: "state", valueType: "enum", applicableComponents: ["button"], usage: ["appearance"] }]; }],
    ["a preference Condition without its discriminator fields", (input: Record<string, unknown>) => { const conditions = input["conditionRegistry"] as Record<string, unknown>; conditions["conditions"] = [{ id: "preference.reducedMotion", kind: "preference", feature: "prefers-reduced-motion" }]; }],
    ["a malformed resolved-manifest digest", (input: Record<string, unknown>) => { const tokenValidation = input["tokenValidation"] as Record<string, unknown>; const manifest = tokenValidation["resolvedTokenManifest"] as Record<string, unknown>; manifest["sourceDigest"] = "sha256:short"; }],
    ["a non-HTTPS effective-property source", (input: Record<string, unknown>) => { const registry = input["propertyRegistry"] as Record<string, unknown>; const properties = registry["properties"] as Array<Record<string, unknown>>; properties[0]!["sourceHref"] = "http://example.test/property"; }],
    ["an invalid projector semantic version", (input: Record<string, unknown>) => { const tokenValidation = input["tokenValidation"] as Record<string, unknown>; const projectors = tokenValidation["projectorRegistry"] as Record<string, unknown>; projectors["projectors"] = [{ id: "css.border-projector.v1", domain: "border", dtcgType: "border", outputProperties: ["border-color"], version: "1.0" }]; }],
  ])("rejects forged nested %s at construction", (_name, corrupt) => {
    const input = { ...fixture() } as unknown as Record<string, unknown>;
    const registry = input["propertyRegistry"] as Record<string, unknown>;
    input["propertyRegistry"] = {
      ...registry,
      properties: (registry["properties"] as readonly Record<string, unknown>[]).map((property) => ({
        ...property,
        policy: { ...(property["policy"] as Record<string, unknown>) },
      })),
    };
    const statesInput = input["canonicalStateRegistry"] as Record<string, unknown>;
    input["canonicalStateRegistry"] = { ...statesInput, states: [...(statesInput["states"] as readonly unknown[])] };
    const conditionsInput = input["conditionRegistry"] as Record<string, unknown>;
    input["conditionRegistry"] = { ...conditionsInput, containers: [...(conditionsInput["containers"] as readonly unknown[])], conditions: [...(conditionsInput["conditions"] as readonly unknown[])] };
    const validation = input["tokenValidation"] as Record<string, unknown>;
    const domainRegistry = validation["tokenDomainRegistry"] as Record<string, unknown>;
    const projectorRegistry = validation["projectorRegistry"] as Record<string, unknown>;
    const manifest = validation["resolvedTokenManifest"] as Record<string, unknown>;
    input["tokenValidation"] = { ...validation, tokenDomainRegistry: { ...domainRegistry, domains: [...(domainRegistry["domains"] as readonly unknown[])] }, projectorRegistry: { ...projectorRegistry, projectors: [...(projectorRegistry["projectors"] as readonly unknown[])] }, resolvedTokenManifest: { ...manifest, contexts: [...(manifest["contexts"] as readonly unknown[])] } };
    corrupt(input);
    expect(() => createCSSRecipeAuthoring(input as never)).toThrow("Axiom CSS Recipe authoring validation failed.");
  });

  it.each([
    ["a non-SemVer manifest profile version", (input: Record<string, unknown>) => { ((input["tokenValidation"] as Record<string, unknown>)["resolvedTokenManifest"] as Record<string, unknown>)["profileVersion"] = "2026"; }],
    ["dark-before-light contexts", (input: Record<string, unknown>) => { const manifest = (input["tokenValidation"] as Record<string, unknown>)["resolvedTokenManifest"] as Record<string, unknown>; manifest["contexts"] = [...(manifest["contexts"] as readonly unknown[])].reverse(); }],
    ["a reversed dark Token sequence", (input: Record<string, unknown>) => { const contexts = ((input["tokenValidation"] as Record<string, unknown>)["resolvedTokenManifest"] as Record<string, unknown>)["contexts"] as Array<Record<string, unknown>>; const dark = contexts[1]!; dark["tokens"] = [...(dark["tokens"] as readonly unknown[])].reverse(); }],
    ["a descending Domain registry", (input: Record<string, unknown>) => { const registry = (input["tokenValidation"] as Record<string, unknown>)["tokenDomainRegistry"] as Record<string, unknown>; registry["domains"] = [...(registry["domains"] as readonly unknown[])].reverse(); }],
    ["a descending projector registry", (input: Record<string, unknown>) => { const registry = (input["tokenValidation"] as Record<string, unknown>)["projectorRegistry"] as Record<string, unknown>; registry["projectors"] = [...(registry["projectors"] as readonly unknown[])].reverse(); }],
    ["an invalid State applicable component identifier", (input: Record<string, unknown>) => { (input["canonicalStateRegistry"] as Record<string, unknown>)["states"] = [{ id: "pressed", axis: "state", valueType: "boolean", applicableComponents: ["Button"], usage: ["appearance"] }]; }],
    ["an invalid State enum value identifier", (input: Record<string, unknown>) => { (input["canonicalStateRegistry"] as Record<string, unknown>)["states"] = [{ id: "orientation", axis: "state", valueType: "enum", applicableComponents: ["button"], usage: ["appearance"], values: ["horizontal", "Vertical"] }]; }],
    ["an unknown condition container", (input: Record<string, unknown>) => { (input["conditionRegistry"] as Record<string, unknown>)["conditions"] = [{ id: "container.width.sm", kind: "container", container: "missing", feature: "inline-size", comparison: ">=", value: { kind: "token", path: "breakpoint.semantic.sm" } }]; }],
    ["a condition identifier with the wrong kind prefix", (input: Record<string, unknown>) => { (input["conditionRegistry"] as Record<string, unknown>)["conditions"] = [{ id: "viewport.width.sm", kind: "container", container: "component", feature: "inline-size", comparison: ">=", value: { kind: "token", path: "breakpoint.semantic.sm" } }]; }],
    ["a viewport condition that references a non-breakpoint Token", (input: Record<string, unknown>) => { (input["conditionRegistry"] as Record<string, unknown>)["conditions"] = [{ id: "viewport.width.sm", kind: "viewport", feature: "width", comparison: ">=", value: { kind: "token", path: "color.semantic.brand" } }]; }],
    ["duplicate condition-only Domains", (input: Record<string, unknown>) => { const validation = input["tokenValidation"] as Record<string, unknown>; const source = validation["propertyPolicySource"] as Record<string, unknown>; const bindings = source["bindings"] as Record<string, unknown>; bindings["conditionOnlyDomains"] = ["color", "color"]; }],
    ["a condition-only Domain outside the effective CSS policy source", (input: Record<string, unknown>) => { const validation = input["tokenValidation"] as Record<string, unknown>; const source = validation["propertyPolicySource"] as Record<string, unknown>; const bindings = source["bindings"] as Record<string, unknown>; bindings["conditionOnlyDomains"] = ["color"]; }],
  ])("rejects semantic authority corruption even after matching digests are recomputed", (_name, corrupt) => {
    const input = semanticFixture();
    corrupt(input);
    recomputeAuthorityDigests(input);
    expect(codeFor(input, "color", reference("color.semantic.brand"))).toBe("AXA1101");
  });

  it("binds the full effective property registry identity, not only profile metadata", () => {
    const input = semanticFixture();
    const property = ((input["propertyRegistry"] as Record<string, unknown>)["properties"] as Array<Record<string, unknown>>).find((entry) => (entry["policy"] as Record<string, unknown>)["authoring"] === "allowed")!;
    (property["policy"] as Record<string, unknown>)["authoring"] = "blocked";
    recomputeAuthorityDigests(input);
    const validation = input["tokenValidation"] as Record<string, unknown>;
    const original = fixture() as unknown as { tokenValidation: { authorityDigests: { effectivePropertyRegistry: string } } };
    (validation["authorityDigests"] as Record<string, string>)["effectivePropertyRegistry"] = original.tokenValidation.authorityDigests.effectivePropertyRegistry;
    expect(codeFor(input, "color", reference("color.semantic.brand"))).toBe("AXA1101");
  });

  it.each([
    ["a context missing both required nested fields", (input: { tokenValidation: { resolvedTokenManifest: { contexts: unknown } } }) => { input.tokenValidation.resolvedTokenManifest.contexts = [{}]; }],
    ["a Token entry missing its required nested source and identity fields", (input: { tokenValidation: { resolvedTokenManifest: { contexts: unknown } } }) => { input.tokenValidation.resolvedTokenManifest.contexts = [{ context: { theme: "light" }, tokens: [{}] }, { context: { theme: "dark" }, tokens: [{}] }]; }],
  ])("rejects %s before exposing a Token-free authoring port", (_name, corrupt) => {
    const input = fixture() as unknown as { tokenValidation: { resolvedTokenManifest: { contexts: unknown } } };
    corrupt(input);
    expect(() => createCSSRecipeAuthoring(input as never)).toThrow("Axiom CSS Recipe authoring validation failed.");
    try {
      createCSSRecipeAuthoring(input as never);
    } catch (error) {
      expect((error as { diagnostics: readonly { code: string }[] }).diagnostics[0]?.code).toBe("AXA1101");
    }
  });

  it("maps a throwing canonical digest method getter to the authority diagnostic", () => {
    const digest = {};
    Object.defineProperty(digest, "digestCanonicalJson", {
      get: () => { throw new Error("digest getter"); },
    });
    expect(codeFor(fixture({ canonicalDigest: digest }), "color", reference("color.semantic.brand"))).toBe("AXA1101");
  });

  it.each([
    ["missing dark Token", (() => { const manifest = baseManifest(); manifest.contexts[1] = { ...manifest.contexts[1]!, tokens: manifest.contexts[1]!.tokens.filter((item) => item.id !== "color.semantic.brand") }; return fixture({ manifest }); })(), "AXA1101"],
    ["duplicate context", (() => { const manifest = baseManifest(); manifest.contexts = [manifest.contexts[0]!, manifest.contexts[0]!]; return fixture({ manifest }); })(), "AXA1101"],
    ["duplicate Token", (() => { const manifest = baseManifest(); manifest.contexts[0] = { ...manifest.contexts[0]!, tokens: [...manifest.contexts[0]!.tokens, manifest.contexts[0]!.tokens[0]!] }; return fixture({ manifest }); })(), "AXA1101"],
    ["identity drift", (() => { const manifest = baseManifest(); manifest.contexts[1] = { ...manifest.contexts[1]!, tokens: manifest.contexts[1]!.tokens.map((item) => item.id === "color.semantic.brand" ? { ...item, domain: "space", dtcgType: "dimension" } : item) }; return fixture({ manifest }); })(), "AXA1103"],
  ])("rejects manifest %s", (_name, input, expected) => expect(codeFor(input, "color", reference("color.semantic.brand"))).toBe(expected));
});

describe("N21 direct, template, and negation semantics", () => {
  it.each([
    ["direct success", fixture(), "color", reference("color.semantic.brand"), undefined],
    ["wrong direct Domain", fixture(), "color", reference("space.semantic.gutter"), "AXP1103"],
    ["condition-only Domain", fixture(), "width", reference("breakpoint.semantic.sm"), "AXA1104"],
    ["serializer throw", fixture({ serializers: [{ id: "css.color.v1", serialize: () => { throw new Error("serializer"); } }, { id: "css.dimension.v1", serialize: () => "8px" }] }), "color", reference("color.semantic.brand"), "AXA1105"],
    ["one-context grammar failure", fixture({ serializers: [{ id: "css.color.v1", serialize: (resolved: { readonly resolvedValue: unknown }) => resolved.resolvedValue === "blue" ? "not-a-color(" : "red" }, { id: "css.dimension.v1", serialize: () => "8px" }] }), "color", reference("color.semantic.brand"), "AXP1201"],
  ])("validates %s", (_name, input, property, value, expected) => expect(codeFor(input, property, value)).toBe(expected));

  it("validates every Token in a mixed-domain template synthetically and per context", () => {
    const value = cssTemplate`0 ${reference("space.semantic.gutter") as never} 1px ${reference("color.semantic.brand") as never}`;
    const result = validateTokenBinding(fixture(), { path: path("box-shadow"), value } as never);
    expect(result.diagnostics).toEqual([]);
    expect(result.binding?.tokens.map((item) => item.domain)).toEqual(["space", "color"]);
  });

  it.each([["margin", undefined], ["inset-inline-start", undefined], ["padding-inline", "AXA1106"], ["gap", "AXA1106"]])("uses exact negation policy for %s", (property, expected) => expect(codeFor(fixture(), property, negateToken(reference("space.semantic.gutter") as never))).toBe(expected));
});

describe("N21 composite projector semantics", () => {
  const border = () => ({ kind: "token-projector", token: reference("border.semantic.default"), projector: "css.border-projector.v1" });
  const transition = (parameters: unknown = { properties: ["opacity"] }) => ({ kind: "token-projector", token: reference("transition.semantic.fast"), projector: "css.transition-projector.v1", parameters });

  it("accepts border and transition anchors that are not projected output properties", () => {
    const borderResult = validateTokenBinding(fixture(), { path: path("border"), value: border() } as never);
    const transitionResult = validateTokenBinding(fixture(), { path: path("transition"), value: transition() } as never);
    expect(borderResult.diagnostics).toEqual([]);
    expect(borderResult.binding?.tokens[0]?.serializerId).toBe("css.border-projector.v1");
    expect(Object.isFrozen(borderResult.binding?.tokens[0] ?? {})).toBe(true);
    expect(Object.isFrozen(borderResult.binding?.projectedDeclarations?.[0]?.value ?? {})).toBe(true);
    expect(transitionResult.diagnostics).toEqual([]);
    expect(transitionResult.binding?.projectedDeclarations?.find((item) => item.property === "transition-property")?.value).toEqual({ kind: "css", value: "opacity" });
  });

  it.each([
    ["unknown id", fixture(), "border", { ...border(), projector: "css.unknown.v1" }],
    ["wrong Domain", fixture(), "border", { ...border(), token: reference("color.semantic.brand") }],
    ["missing transition parameters", fixture(), "transition", { ...transition(), parameters: undefined }],
    ["extra transition parameters", fixture(), "transition", { ...transition(), parameters: { properties: ["opacity"], extra: true } }],
    ["duplicate transition property", fixture(), "transition", transition({ properties: ["opacity", "opacity"] })],
  ])("rejects projector %s", (_name, input, property, value) => expect(codeFor(input, property, value)).toBe("AXA1107"));

  it("rejects outer and nested excess projector keys before semantic execution", () => {
    const authoring = createCSSRecipeAuthoring(fixture());
    expect(() => authoring.defineRecipe({
      id: "button", slots: ["root"], base: { root: { border: {
        ...border(), extra: true, token: { ...reference("border.semantic.default"), extra: true },
      } } },
    } as never)).toThrow("Axiom CSS Recipe authoring validation failed.");
  });

  it.each([
    ["throw", () => { throw new Error("projector"); }],
    ["extra", () => [...defaultProjectors()[0]!.project({ resolvedValue: "red" }), { property: "color", value: "red", source: "token", field: "extra" }]],
    ["reordered", () => [...defaultProjectors()[0]!.project({ resolvedValue: "red" })].reverse()],
    ["empty field", () => defaultProjectors()[0]!.project({ resolvedValue: "red" }).map((item, index) => index === 0 ? { ...item, field: "" } : item)],
  ])("rejects invalid projector output %s", (_name, output) => {
    const ports = defaultProjectors(); ports[0] = { ...ports[0]!, project: output as never };
    expect(codeFor(fixture({ projectors: ports }), "border", border())).toBe("AXA1108");
  });

  it("rejects context-varying field metadata, parameter output, and grammar violations", () => {
    const configurations = [
      ["border", border(), "AXA1108", (ports: ReturnType<typeof defaultProjectors>) => { ports[0] = { ...ports[0]!, project: (resolved) => defaultProjectors()[0]!.project(resolved).map((item) => ({ ...item, field: (resolved.resolvedValue as { readonly color: string }).color === "blue" ? "other" : item.field })) }; }],
      ["transition", transition(), "AXA1108", (ports: ReturnType<typeof defaultProjectors>) => { ports[1] = { ...ports[1]!, project: (resolved, parameters) => defaultProjectors()[1]!.project(resolved, parameters).map((item) => item.source === "parameters" ? { ...item, value: (resolved.resolvedValue as { readonly duration: string }).duration === "200ms" ? "color" : item.value } : item) }; }],
      ["border", border(), "AXP1201", (ports: ReturnType<typeof defaultProjectors>) => { ports[0] = { ...ports[0]!, project: (resolved) => defaultProjectors()[0]!.project(resolved).map((item) => item.property === "border-width" ? { ...item, value: "not-a-length(" } : item) }; }],
    ];
    for (const [property, value, expected, configure] of configurations) { const ports = defaultProjectors(); configure(ports); expect(codeFor(fixture({ projectors: ports }), property as string, value)).toBe(expected); }
  });

  it("attaches a projected-output pointer and property to output diagnostics", () => {
    const ports = defaultProjectors();
    ports[0] = { ...ports[0]!, project: (resolved) => defaultProjectors()[0]!.project(resolved).map((item) => item.property === "border-width" ? { ...item, value: "not-a-length(" } : item) };
    const result = validateTokenBinding(fixture({ projectors: ports }), { path: path("border"), value: border() } as never);
    expect(result.diagnostics[0]).toMatchObject({ code: "AXP1201", property: "border-width", pointer: "/base/root/border/projected/2", declarationIndex: 2 });
  });

  it("rejects a projector that changes a same-input output on repeat invocation", () => {
    let invocation = 0;
    const ports = defaultProjectors();
    ports[0] = {
      ...ports[0]!,
      project: () => {
        const value = invocation < 2 ? "red" : "blue";
        invocation += 1;
        return [
          { property: "border-color", value, source: "token", field: "color" },
          { property: "border-style", value: "solid", source: "token", field: "style" },
          { property: "border-width", value: "1px", source: "token", field: "width" },
        ];
      },
    };
    expect(codeFor(fixture({ projectors: ports }), "border", border())).toBe("AXA1108");
  });
});

describe("N21 detached report provenance", () => {
  it("freezes detached receipt evidence and uses declaration-index pointers for repeated entries", () => {
    const definition = { id: "button", slots: ["root"], base: { root: [
      { property: "color", value: reference("color.semantic.brand") }, { property: "color", value: reference("color.semantic.brand") },
    ] } } as const;
    const recipe = createCSSRecipeAuthoring(fixture()).defineRecipe(definition as never);
    expect(recipe.tokenBindingReport.bindings.map((binding) => binding.path.pointer)).toEqual(["/base/root/0/value", "/base/root/1/value"]);
    expect(Object.isFrozen(recipe.tokenBindingReport)).toBe(true);
    expect(Object.isFrozen(recipe.tokenBindingReport.bindings)).toBe(true);
    expect(Object.isFrozen(recipe.tokenBindingReport.bindings[0]?.path)).toBe(true);
    expect(Object.isFrozen(recipe.tokenBindingReport.authority.contexts)).toBe(true);
    expect(recipe.tokenBindingReport.authority.manifestSourceDigest).toBe("sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(recipe.tokenBindingReport.authority.effectivePropertyRegistry).toBe(canonicalDigest.digestCanonicalJson(propertyRegistry));
    expect(recipe.tokenBindingReport.authority.propertyPolicySource).toBe(propertyRegistry.profile.policySourceDigest);
    (definition.base.root as unknown as Array<{ value: unknown }>)[0]!.value = reference("space.semantic.gutter");
    expect(recipe.tokenBindingReport.bindings[0]?.tokens[0]?.tokenId).toBe("color.semantic.brand");
  });
});
