import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { CSSRecipeAuthoringInput } from "@axiom/appearance-authoring";
import type { CanonicalStateRegistry, ConditionRegistry } from "@axiom/condition-registry";
import type { CSSAppearanceIR } from "@axiom/motion-schema";
import { canonicalJsonDigest, createMotionAuthorityValidationPort } from "@axiom/spec-tooling";
import { digestResolvedTokenManifest, type ResolvedTokenManifest, type TokenDomainRegistry } from "@axiom/tokens";

/** Reads checked-in authorities only for the Button conformance test; production boundaries receive explicit values and ports. */
const readAuthority = (relativePath: string): unknown => JSON.parse(readFileSync(
  new URL(`../../../../${relativePath}`, import.meta.url),
  "utf8",
));

const propertyRegistry = readAuthority("spec/css/effective-property-registry.json") as CSSRecipeAuthoringInput["propertyRegistry"];
const resolvedTokenManifest = readAuthority("spec/token/foundation-resolved-token-manifest.json") as ResolvedTokenManifest;
const tokenDomainRegistry = readAuthority("spec/token/token-domain-registry.json") as TokenDomainRegistry;
const projectorRegistry = readAuthority("spec/token/composite-token-projector-registry.json") as never;
const canonicalStateRegistry = readAuthority("spec/state/canonical-state-registry.json") as CanonicalStateRegistry;
const conditionRegistry = readAuthority("spec/condition/condition-registry.json") as ConditionRegistry;
const SPEC_ROOT = fileURLToPath(new URL("../../../../spec/", import.meta.url));

/** Detaches one checked-in authority so each conformance run owns independent mutable input values. */
const cloneAuthority = <T>(authority: T): T => structuredClone(authority);

/** Creates a fresh set of real normative authority values for one public pipeline execution. */
const createFreshAuthorities = () => ({
  propertyRegistry: cloneAuthority(propertyRegistry),
  resolvedTokenManifest: cloneAuthority(resolvedTokenManifest),
  tokenDomainRegistry: cloneAuthority(tokenDomainRegistry),
  projectorRegistry: cloneAuthority(projectorRegistry),
  canonicalStateRegistry: cloneAuthority(canonicalStateRegistry),
  conditionRegistry: cloneAuthority(conditionRegistry),
});

/** Supplies exact explicit N20/N21 authority inputs for the Button-only Appearance proof. */
export const createButtonAppearanceInput = () => {
  const authorities = createFreshAuthorities();
  return {
  propertyRegistry: authorities.propertyRegistry,
  canonicalStateRegistry: authorities.canonicalStateRegistry,
  conditionRegistry: authorities.conditionRegistry,
  tokenValidation: {
    resolvedTokenManifest: authorities.resolvedTokenManifest,
    tokenDomainRegistry: authorities.tokenDomainRegistry,
    projectorRegistry: authorities.projectorRegistry,
    authorityDigests: {
      effectivePropertyRegistry: canonicalJsonDigest(authorities.propertyRegistry),
      resolvedTokenManifest: digestResolvedTokenManifest(authorities.resolvedTokenManifest, { digestCanonicalJson: canonicalJsonDigest }),
      tokenDomainRegistry: canonicalJsonDigest(authorities.tokenDomainRegistry),
      projectorRegistry: canonicalJsonDigest(authorities.projectorRegistry),
      canonicalStateRegistry: canonicalJsonDigest(authorities.canonicalStateRegistry),
      conditionRegistry: canonicalJsonDigest(authorities.conditionRegistry),
    },
    canonicalDigest: { digestCanonicalJson: canonicalJsonDigest },
    conditionOnlyDomains: authorities.tokenDomainRegistry.domains.map((domain: { readonly id: string }) => domain.id).filter((id: string) => !["color", "duration"].includes(id)),
    serializers: [{
      id: "css.color.v1",
      serialize: (entry: { readonly resolvedValue: unknown }) => typeof entry.resolvedValue === "object" && entry.resolvedValue !== null && "hex" in entry.resolvedValue
        ? String((entry.resolvedValue as Readonly<{ readonly hex: unknown }>).hex)
        : String(entry.resolvedValue),
    }, {
      id: "css.duration.v1",
      serialize: (entry: { readonly resolvedValue: unknown }) => {
        const value = entry.resolvedValue;
        return typeof value === "object" && value !== null && "value" in value && "unit" in value
          ? `${String((value as Readonly<{ readonly value: unknown }>).value)}${String((value as Readonly<{ readonly unit: unknown }>).unit)}`
          : String(value);
      },
    }],
    projectors: [],
  },
} as const;
};

/** Supplies the explicit N23 authority bundle that binds Button Motion to one normalized Appearance result. */
export const createButtonMotionInput = async (appearance: CSSAppearanceIR) => {
  const authorities = createFreshAuthorities();
  return {
  propertyRegistry: authorities.propertyRegistry,
  resolvedTokenManifest: authorities.resolvedTokenManifest,
  tokenDomainRegistry: authorities.tokenDomainRegistry,
  canonicalStateRegistry: authorities.canonicalStateRegistry,
  conditionRegistry: authorities.conditionRegistry,
  appearance,
  expectedDigests: {
    profileInputDigest: authorities.propertyRegistry.profile.webrefInputDigest,
    effectivePropertyRegistry: canonicalJsonDigest(authorities.propertyRegistry),
    resolvedTokenManifest: digestResolvedTokenManifest(authorities.resolvedTokenManifest, { digestCanonicalJson: canonicalJsonDigest }),
    tokenDomainRegistry: canonicalJsonDigest(authorities.tokenDomainRegistry),
    canonicalStateRegistry: canonicalJsonDigest(authorities.canonicalStateRegistry),
    conditionRegistryDigest: canonicalJsonDigest(authorities.conditionRegistry),
    appearanceIR: canonicalJsonDigest(appearance),
  },
  canonicalDigest: { digestCanonicalJson: canonicalJsonDigest },
  authorityValidation: await createMotionAuthorityValidationPort(SPEC_ROOT),
  serializers: [],
} as const;
};
