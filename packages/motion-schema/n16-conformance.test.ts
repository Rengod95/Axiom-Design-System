import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import Ajv2020, { type AnySchema } from "../spec-tooling/node_modules/ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import { createMotionAuthoring, token } from "./src/index.js";
import { canonicalJsonDigest, createMotionAuthorityValidationPort } from "../spec-tooling/src/index.js";
import { validateMotionIr } from "../spec-tooling/src/semantic/motion-ir-validator.js";
import { digestResolvedTokenManifest } from "../tokens/src/index.js";

const SPEC_ROOT = fileURLToPath(new URL("../../spec/", import.meta.url));
const SHA256_TEST_DIGEST = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const propertyRegistry = {
  schemaVersion: "0.1",
  profile: { schemaVersion: "0.1", id: "axiom-css", webrefPackageVersion: "0.0.0", webrefInputPath: "css.json", webrefInputDigest: SHA256_TEST_DIGEST, generatorVersion: "0.0.0", policySourceDigest: SHA256_TEST_DIGEST },
  properties: [{ name: "opacity", authoringName: "opacity", syntax: "<alpha-value>", sourceHref: "https://example.test/opacity", status: "standard", kind: "longhand", inherited: false, initialValue: "1", longhands: [], resetLonghands: [], policy: { authoring: "allowed", valueKinds: ["css", "token", "css-template"], tokenBindings: { directDomains: ["number"], templateDomains: ["number"], projectors: [], allowsTokenNegation: false }, rawCSS: "allowed", shorthand: "not-applicable", portability: "portable-candidate", motion: "interpolable", security: { resources: "allowed" }, provenance: [{ source: "test", rule: "test" }] } }],
  aliases: {}, authoringNames: { opacity: "opacity" }, customProperties: [],
} as const;

const manifestTokens = [{ id: "duration.semantic.fast", domain: "duration", tier: "semantic", dtcgType: "duration", resolvedValue: { value: 100, unit: "ms" }, source: { file: "test", pointer: "" }, dependencies: [] }, { id: "easing.semantic.standard", domain: "easing", tier: "semantic", dtcgType: "cubicBezier", resolvedValue: [0, 0, 1, 1], source: { file: "test", pointer: "" }, dependencies: [] }] as const;
const manifest = { schemaVersion: "0.2", profileVersion: "0.1.0", sourceDigest: SHA256_TEST_DIGEST, contexts: [{ context: { theme: "light" }, tokens: manifestTokens }, { context: { theme: "dark" }, tokens: manifestTokens }] } as const;
const tokenDomains = { schemaVersion: "0.1", domains: [{ id: "duration", root: "duration", allowedDTCGTypes: ["duration"], cssSerializers: ["css.test.v1"] }, { id: "easing", root: "easing", allowedDTCGTypes: ["cubicBezier"], cssSerializers: ["css.test.v1"] }] } as const;
const states = { schemaVersion: "0.2", states: [{ id: "pressed", axis: "state", valueType: "boolean", applicableComponents: ["button"], usage: ["appearance", "motion"] }] } as const;
const conditions = { schemaVersion: "0.1", containers: [{ id: "component", cssName: "component" }], conditions: [{ id: "preference.reducedMotion", kind: "preference", feature: "prefers-reduced-motion", equals: "reduce" }] } as const;
const appearance = { schemaVersion: "0.1", profile: "axiom-css", profileInputDigest: SHA256_TEST_DIGEST, recipeId: "button", slots: ["root"], base: [], variantAxes: [], stateRules: [], compoundRules: [], conditionRules: [] } as const;

/** Creates N23 input whose expected digests bind the exact test authorities. */
const createAuthoring = async () => createMotionAuthoring({
  propertyRegistry, resolvedTokenManifest: manifest, tokenDomainRegistry: tokenDomains,
  canonicalStateRegistry: states, conditionRegistry: conditions, appearance,
  expectedDigests: {
    profileInputDigest: SHA256_TEST_DIGEST,
    effectivePropertyRegistry: canonicalJsonDigest(propertyRegistry),
    resolvedTokenManifest: digestResolvedTokenManifest(manifest, { digestCanonicalJson: canonicalJsonDigest }),
    tokenDomainRegistry: canonicalJsonDigest(tokenDomains),
    canonicalStateRegistry: canonicalJsonDigest(states),
    conditionRegistryDigest: canonicalJsonDigest(conditions),
    appearanceIR: canonicalJsonDigest(appearance),
  },
  canonicalDigest: { digestCanonicalJson: canonicalJsonDigest },
  authorityValidation: await createMotionAuthorityValidationPort(SPEC_ROOT),
  serializers: [{ id: "css.test.v1", serialize: (entry) => String(entry.resolvedValue) }],
});

/** Compiles the complete checked-in schema graph exactly as the N16 harness does. */
const createN16SchemaValidator = async () => {
  const manifestSource = JSON.parse(await readFile(`${SPEC_ROOT}manifest.json`, "utf8")) as { readonly schemas: readonly { readonly id: string; readonly path: string }[] };
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
  for (const entry of manifestSource.schemas) {
    const schema = JSON.parse(await readFile(`${SPEC_ROOT}${entry.path}`, "utf8")) as AnySchema;
    ajv.addSchema(schema, entry.id);
  }
  const validate = ajv.getSchema("https://axiom.dev/schemas/motion/ir/0.1");
  if (validate === undefined) throw new Error("N16 Motion IR schema was not registered.");
  return validate;
};

describe("N23 N16 conformance", () => {
  it("emits Motion IR that passes the checked-in N16 schema and semantic validator before and after JSON round-trip", async () => {
    const motion = (await createAuthoring()).defineMotion({
      id: "button.conformance", recipeId: "button", slot: "root",
      phases: [{ phase: "enter", sequence: [{ at: { kind: "afterPrevious" }, tracks: [{ property: "opacity", allowDiscrete: false, keyframes: ["0", "1"] }], transition: { type: "tween", duration: token("duration.semantic.fast"), easing: token("easing.semantic.standard") } }] }],
      reducedMotion: { strategy: "disable" },
    } as const).motion;
    const validateSchema = await createN16SchemaValidator();
    const context = { registries: { "css-profile-input": { id: "axiom-css", webrefInputDigest: SHA256_TEST_DIGEST }, "condition-registry": conditions, "css-effective-property-registry": propertyRegistry, "foundation-resolved-token-manifest": manifest } };

    expect(validateSchema(motion), JSON.stringify(validateSchema.errors)).toBe(true);
    expect(validateMotionIr(motion, context)).toEqual([]);
    const roundTrip = JSON.parse(JSON.stringify(motion));
    expect(validateSchema(roundTrip), JSON.stringify(validateSchema.errors)).toBe(true);
    expect(validateMotionIr(roundTrip, context)).toEqual([]);
  });
});
