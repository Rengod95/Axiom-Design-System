import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { CSSRecipeAuthoringInput } from "@axiom/appearance-authoring";
import type { CanonicalStateRegistry, ConditionRegistry } from "@axiom/condition-registry";
import type { SparsePropertyPolicySource, TokenBindingCatalog } from "@axiom/css-property-profile";
import type { CSSAppearanceIR } from "@axiom/motion-schema";
import { canonicalJsonDigest, createMotionAuthorityValidationPort } from "@axiom/spec-tooling";
import {
  digestResolvedTokenManifest,
  type CompositeTokenProjectorRegistry,
  type ResolvedTokenEntry,
  type ResolvedTokenManifest,
  type TokenDomainRegistry,
} from "@axiom/tokens";

const SPEC_ROOT = fileURLToPath(new URL("../../../../spec/", import.meta.url));

/** Reads checked-in authorities only for the Button conformance test; production boundaries receive explicit values and ports. */
const readAuthority = (relativePath: string): unknown => JSON.parse(readFileSync(
  new URL(`../../../../${relativePath}`, import.meta.url),
  "utf8",
));

const propertyRegistry = readAuthority("spec/css/effective-property-registry.json") as CSSRecipeAuthoringInput["propertyRegistry"];
const resolvedTokenManifest = readAuthority("spec/token/foundation-resolved-token-manifest.json") as ResolvedTokenManifest;
const tokenDomainRegistry = readAuthority("spec/token/token-domain-registry.json") as TokenDomainRegistry;
const projectorRegistry = readAuthority("spec/token/composite-token-projector-registry.json") as CompositeTokenProjectorRegistry;
const canonicalStateRegistry = readAuthority("spec/state/canonical-state-registry.json") as CanonicalStateRegistry;
const conditionRegistry = readAuthority("spec/condition/condition-registry.json") as ConditionRegistry;
const propertyPolicySource = {
  policy: readAuthority("spec/css/sparse-property-policy.json") as SparsePropertyPolicySource,
  bindings: readAuthority("spec/css/token-binding-catalog.json") as TokenBindingCatalog,
} as const;

/** Serializes every scalar Token family needed by the Button proof through its registered CSS port. */
const serializeToken = (serializerId: string, entry: ResolvedTokenEntry): string => {
  const value = entry.resolvedValue;
  if (serializerId === "css.color.v1" && typeof value === "object" && value !== null && "colorSpace" in value && "components" in value) {
    const color = value as Readonly<{ readonly colorSpace: string; readonly components: readonly (number | string)[]; readonly alpha?: number }>;
    return `${color.colorSpace}(${color.components.join(" ")}${color.alpha === undefined || color.alpha === 1 ? "" : ` / ${color.alpha}`})`;
  }
  if ((serializerId === "css.dimension.v1" || serializerId === "css.duration.v1") && typeof value === "object" && value !== null && "value" in value && "unit" in value) {
    const measured = value as Readonly<{ readonly value: number; readonly unit: string }>;
    return `${measured.value}${measured.unit}`;
  }
  if (serializerId === "css.cubic-bezier.v1" && Array.isArray(value)) return `cubic-bezier(${value.join(", ")})`;
  if (serializerId === "css.font-family.v1" && Array.isArray(value)) return value.join(", ");
  if (["css.font-weight.v1", "css.number.v1", "css.stroke-style.v1"].includes(serializerId) && ["number", "string"].includes(typeof value)) return String(value);
  throw new Error(`Button conformance serializer '${serializerId}' cannot serialize the supplied Token.`);
};

const projectorIds = new Set(projectorRegistry.projectors.map((descriptor) => descriptor.id));
const serializers = [...new Set(tokenDomainRegistry.domains.flatMap((domain) => domain.cssSerializers))]
  .filter((id) => !projectorIds.has(id))
  .map((id) => ({ id, serialize: (entry: ResolvedTokenEntry): string => serializeToken(id, entry) }));
const projectors = projectorRegistry.projectors.map(({ id }) => ({
  id,
  project: () => [],
}));

/** Supplies exact explicit N20/N21 authority inputs for the Button-only Appearance proof. */
export const createButtonAppearanceInput = () => ({
  propertyRegistry,
  canonicalStateRegistry,
  conditionRegistry,
  tokenValidation: {
    resolvedTokenManifest,
    tokenDomainRegistry,
    projectorRegistry,
    authorityDigests: {
      effectivePropertyRegistry: canonicalJsonDigest(propertyRegistry),
      propertyPolicySource: canonicalJsonDigest(propertyPolicySource),
      resolvedTokenManifest: digestResolvedTokenManifest(resolvedTokenManifest, { digestCanonicalJson: canonicalJsonDigest }),
      tokenDomainRegistry: canonicalJsonDigest(tokenDomainRegistry),
      projectorRegistry: canonicalJsonDigest(projectorRegistry),
      canonicalStateRegistry: canonicalJsonDigest(canonicalStateRegistry),
      conditionRegistry: canonicalJsonDigest(conditionRegistry),
    },
    canonicalDigest: { digestCanonicalJson: canonicalJsonDigest },
    propertyPolicySource,
    serializers,
    projectors,
  },
} as const);

/** Supplies the explicit N23 authority bundle that binds Button Motion to one normalized Appearance result. */
export const createButtonMotionInput = async (appearance: CSSAppearanceIR) => ({
  propertyRegistry,
  resolvedTokenManifest,
  tokenDomainRegistry,
  canonicalStateRegistry,
  conditionRegistry,
  appearance,
  expectedDigests: {
    profileInputDigest: propertyRegistry.profile.webrefInputDigest,
    effectivePropertyRegistry: canonicalJsonDigest(propertyRegistry),
    resolvedTokenManifest: digestResolvedTokenManifest(resolvedTokenManifest, { digestCanonicalJson: canonicalJsonDigest }),
    tokenDomainRegistry: canonicalJsonDigest(tokenDomainRegistry),
    canonicalStateRegistry: canonicalJsonDigest(canonicalStateRegistry),
    conditionRegistryDigest: canonicalJsonDigest(conditionRegistry),
    appearanceIR: canonicalJsonDigest(appearance),
  },
  canonicalDigest: { digestCanonicalJson: canonicalJsonDigest },
  authorityValidation: await createMotionAuthorityValidationPort(SPEC_ROOT),
  serializers: [],
} as const);
