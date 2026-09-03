import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { CSSRecipeAuthoringInput, TokenCssSerializer } from "@axiom/appearance-authoring";
import type { CanonicalStateRegistry, ConditionRegistry } from "@axiom/condition-registry";
import type { CSSAppearanceIR } from "@axiom/motion-schema";
import { canonicalJsonDigest, createMotionAuthorityValidationPort } from "@axiom/spec-tooling";
import { digestResolvedTokenManifest, type ResolvedTokenEntry, type ResolvedTokenManifest, type TokenDomainRegistry } from "@axiom/tokens";

/** Reads one checked-in authority for Foundation conformance tests without adding production repository I/O. */
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

/** Detaches one checked-in authority so every conformance run receives independently mutable input. */
const cloneAuthority = <T>(authority: T): T => structuredClone(authority);

/** Creates a fresh, mutually consistent authority set for one public Foundation pipeline execution. */
const createFreshAuthorities = () => ({
  propertyRegistry: cloneAuthority(propertyRegistry),
  resolvedTokenManifest: cloneAuthority(resolvedTokenManifest),
  tokenDomainRegistry: cloneAuthority(tokenDomainRegistry),
  projectorRegistry: cloneAuthority(projectorRegistry),
  canonicalStateRegistry: cloneAuthority(canonicalStateRegistry),
  conditionRegistry: cloneAuthority(conditionRegistry),
});

/** Serializes a DTCG dimension or duration solely for cross-context CSS grammar validation. */
const serializeUnitValue = (entry: ResolvedTokenEntry): string => {
  const value = entry.resolvedValue;
  return typeof value === "object" && value !== null && "value" in value && "unit" in value
    ? `${String(value.value)}${String(value.unit)}`
    : String(value);
};

/** Serializes an explicit color fallback solely for cross-context CSS grammar validation. */
const serializeColor = (entry: ResolvedTokenEntry): string => {
  const value = entry.resolvedValue;
  return typeof value === "object" && value !== null && "hex" in value ? String(value.hex) : String(value);
};

/** Serializes scalar Token values solely for cross-context CSS grammar validation. */
const serializeNumber = (entry: ResolvedTokenEntry): string => String(entry.resolvedValue);

/** Serializes a grammar-valid shadow while the authored Appearance retains its unresolved Token reference. */
const serializeShadow = (_entry: ResolvedTokenEntry): string => "0 0.25rem 0.75rem rgb(0 0 0 / 0.16)";

const FOUNDATION_SERIALIZERS: readonly TokenCssSerializer[] = [
  { id: "css.color.v1", serialize: serializeColor },
  { id: "css.dimension.v1", serialize: serializeUnitValue },
  { id: "css.duration.v1", serialize: serializeUnitValue },
  { id: "css.number.v1", serialize: serializeNumber },
  { id: "css.shadow.v1", serialize: serializeShadow },
];

/** Supplies explicit N20/N21 authorities and only the serializers needed by one conformance fixture. */
export const createFoundationAppearanceInput = (executionDomains: readonly string[]) => {
  const authorities = createFreshAuthorities();
  const serializerIds = new Set(
    authorities.tokenDomainRegistry.domains
      .filter((domain) => executionDomains.includes(domain.id))
      .flatMap((domain) => domain.cssSerializers),
  );
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
      conditionOnlyDomains: authorities.tokenDomainRegistry.domains
        .map((domain) => domain.id)
        .filter((id) => !executionDomains.includes(id)),
      serializers: FOUNDATION_SERIALIZERS.filter((serializer) => serializerIds.has(serializer.id)),
      projectors: [],
    },
  } as const;
};

/** Supplies the explicit N23 authority bundle binding Motion to one authenticated Appearance result. */
export const createFoundationMotionInput = async (appearance: CSSAppearanceIR) => {
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
