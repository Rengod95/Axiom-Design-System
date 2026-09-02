import {
  CSSGrammarValidator,
  validateTokenBinding as validatePropertyTokenBinding,
  type EffectiveCSSPropertyRegistry,
  type EffectiveCSSPropertyEntry,
} from "@axiom/css-property-profile";
import {
  createResolvedTokenManifestIndex,
  digestResolvedTokenManifest,
  type ResolvedTokenEntry,
  type TokenJsonValue,
} from "@axiom/tokens";
import type { CSSDeclarationValue, TokenReference } from "@axiom/motion-schema";

import {
  CSS_RECIPE_DIAGNOSTIC_CODE,
  CSS_RECIPE_DIAGNOSTIC_PHASE,
  CSS_RECIPE_DIAGNOSTIC_SEVERITY,
  CSS_RECIPE_IDENTIFIER_PATTERN,
  CSS_RECIPE_NEGATED_TOKEN_KIND,
  CSS_RECIPE_PROFILE_VERSION_PATTERN,
  CSS_RECIPE_PROPERTY_NAME_PATTERN,
  CSS_RECIPE_SEMVER_PATTERN,
  CSS_RECIPE_SERIALIZER_ID_PATTERN,
  CSS_RECIPE_SHA256_DIGEST_PATTERN,
  CSS_RECIPE_TOKEN_ID_PATTERN,
  CSS_RECIPE_TOKEN_PROJECTOR_KIND,
} from "./constants.js";
import {
  CSSRecipeAuthoringError,
  type CSSAuthoringValue,
  type CSSRecipeAuthoringInput,
  type CSSRecipeDiagnostic,
  type ProjectedTokenBlueprint,
  type TokenBindingDeclarationPath,
  type TokenBindingReport,
  type CSSRecipeDefinition,
  type ValidatedTokenBinding,
} from "./contracts.js";

type UnknownRecord = Record<string, unknown>;

/** Returns whether a captured authoring value is a plain record. */
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Checks the common stable identifier schema without consulting runtime spec files. */
const isIdentifier = (value: unknown): value is string => typeof value === "string" && value.length <= 160 && CSS_RECIPE_IDENTIFIER_PATTERN.test(value);

/** Returns whether a supplied authority record has only enumerable data properties. */
const isPlainRecord = (value: unknown): value is UnknownRecord => {
  if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length > 0) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value)).every((descriptor) => descriptor.enumerable && "value" in descriptor);
};

/** Checks an exact schema-shaped record without invoking accessors or inherited members. */
const hasKeys = (
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is UnknownRecord => isPlainRecord(value) && required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));

/** Checks recursively JSON-safe manifest data without accepting executable or exotic values. */
const isTokenJson = (value: unknown): value is TokenJsonValue => {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return Object.getPrototypeOf(value) === Array.prototype && Object.keys(value).length === value.length && value.every(isTokenJson);
  return isPlainRecord(value) && Object.values(value).every(isTokenJson);
};

/** Verifies the resolved-manifest schema shape before indexing or digesting it. */
const hasCanonicalManifestOrder = (manifest: UnknownRecord): boolean => {
  const contexts = manifest["contexts"] as readonly UnknownRecord[];
  const light = contexts[0] as UnknownRecord;
  const dark = contexts[1] as UnknownRecord;
  const lightTokens = light["tokens"] as readonly UnknownRecord[];
  const darkTokens = dark["tokens"] as readonly UnknownRecord[];
  const lightIds = lightTokens.map((entry) => entry["id"]);
  const darkIds = darkTokens.map((entry) => entry["id"]);
  return (light["context"] as UnknownRecord)["theme"] === "light" && (dark["context"] as UnknownRecord)["theme"] === "dark" && isOrderedIdentifiers(lightIds) && isOrderedIdentifiers(darkIds) && lightIds.join("|") === darkIds.join("|");
};

const isResolvedManifest = (value: unknown): boolean => hasKeys(value, ["schemaVersion", "profileVersion", "sourceDigest", "contexts"]) && value["schemaVersion"] === "0.2" && typeof value["profileVersion"] === "string" && CSS_RECIPE_PROFILE_VERSION_PATTERN.test(value["profileVersion"]) && typeof value["sourceDigest"] === "string" && CSS_RECIPE_SHA256_DIGEST_PATTERN.test(value["sourceDigest"]) && Array.isArray(value["contexts"]) && value["contexts"].length === 2 && value["contexts"].every((context) => hasKeys(context, ["context", "tokens"]) && hasKeys(context["context"], ["theme"]) && (context["context"]["theme"] === "light" || context["context"]["theme"] === "dark") && Array.isArray(context["tokens"]) && context["tokens"].length > 0 && context["tokens"].every((entry) => hasKeys(entry, ["id", "domain", "tier", "dtcgType", "resolvedValue", "source", "dependencies"], ["description", "deprecated"]) && typeof entry["id"] === "string" && CSS_RECIPE_TOKEN_ID_PATTERN.test(entry["id"]) && isIdentifier(entry["domain"]) && (["primitive", "semantic", "component"] as readonly unknown[]).includes(entry["tier"]) && (["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"] as readonly unknown[]).includes(entry["dtcgType"]) && isTokenJson(entry["resolvedValue"]) && hasKeys(entry["source"], ["file", "pointer"], ["line", "column"]) && typeof entry["source"]["file"] === "string" && entry["source"]["file"].length > 0 && typeof entry["source"]["pointer"] === "string" && /^(?:|\/.*)$/.test(entry["source"]["pointer"]) && (entry["source"]["line"] === undefined || Number.isInteger(entry["source"]["line"]) && (entry["source"]["line"] as number) >= 1) && (entry["source"]["column"] === undefined || Number.isInteger(entry["source"]["column"]) && (entry["source"]["column"] as number) >= 1) && Array.isArray(entry["dependencies"]) && entry["dependencies"].every((dependency) => typeof dependency === "string" && CSS_RECIPE_TOKEN_ID_PATTERN.test(dependency)) && new Set(entry["dependencies"] as readonly string[]).size === entry["dependencies"].length && (entry["description"] === undefined || typeof entry["description"] === "string") && (entry["deprecated"] === undefined || typeof entry["deprecated"] === "boolean" || typeof entry["deprecated"] === "string"))) && hasCanonicalManifestOrder(value);

/** Verifies a closed Domain Registry without importing or reading the normative spec at runtime. */
const isDomainConstraint = (value: unknown): boolean => isPlainRecord(value) && (value["kind"] === "numberRange" && hasKeys(value, ["kind"], ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "integer"]) && ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"].every((key) => value[key] === undefined || typeof value[key] === "number" && Number.isFinite(value[key])) && (value["integer"] === undefined || typeof value["integer"] === "boolean") || value["kind"] === "dimensionRange" && hasKeys(value, ["kind"], ["minimum", "exclusiveMinimum"]) && ["minimum", "exclusiveMinimum"].every((key) => value[key] === undefined || typeof value[key] === "number" && Number.isFinite(value[key])) || value["kind"] === "durationRange" && hasKeys(value, ["kind"], ["minimumMilliseconds"]) && (value["minimumMilliseconds"] === undefined || typeof value["minimumMilliseconds"] === "number" && Number.isFinite(value["minimumMilliseconds"]) && value["minimumMilliseconds"] >= 0));

/** Verifies a closed Domain Registry without importing or reading the normative spec at runtime. */
const isDomainRegistry = (value: unknown): boolean => hasKeys(value, ["schemaVersion", "domains"]) && value["schemaVersion"] === "0.1" && Array.isArray(value["domains"]) && isOrderedIdentifiers(value["domains"].map((domain) => isPlainRecord(domain) ? domain["id"] : "")) && value["domains"].every((domain) => hasKeys(domain, ["id", "root", "allowedDTCGTypes", "cssSerializers"], ["constraints"]) && isIdentifier(domain["id"]) && domain["root"] === domain["id"] && Array.isArray(domain["allowedDTCGTypes"]) && domain["allowedDTCGTypes"].length > 0 && domain["allowedDTCGTypes"].every((type) => (["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"] as readonly unknown[]).includes(type)) && new Set(domain["allowedDTCGTypes"] as readonly string[]).size === domain["allowedDTCGTypes"].length && Array.isArray(domain["cssSerializers"]) && domain["cssSerializers"].length > 0 && domain["cssSerializers"].every((id) => typeof id === "string" && CSS_RECIPE_SERIALIZER_ID_PATTERN.test(id)) && new Set(domain["cssSerializers"] as readonly string[]).size === domain["cssSerializers"].length && (domain["constraints"] === undefined || Array.isArray(domain["constraints"]) && domain["constraints"].every(isDomainConstraint)));

/** Verifies a closed projector registry before executable projector ports are exposed. */
const isProjectorRegistry = (value: unknown): boolean => hasKeys(value, ["schemaVersion", "projectors"]) && value["schemaVersion"] === "0.1" && Array.isArray(value["projectors"]) && isOrderedIdentifiers(value["projectors"].map((projector) => isPlainRecord(projector) ? projector["id"] : "")) && value["projectors"].every((projector) => hasKeys(projector, ["id", "domain", "dtcgType", "outputProperties", "version"]) && typeof projector["id"] === "string" && CSS_RECIPE_SERIALIZER_ID_PATTERN.test(projector["id"]) && isIdentifier(projector["domain"]) && (["border", "gradient", "shadow", "transition", "typography"] as readonly unknown[]).includes(projector["dtcgType"]) && typeof projector["version"] === "string" && CSS_RECIPE_SEMVER_PATTERN.test(projector["version"]) && Array.isArray(projector["outputProperties"]) && projector["outputProperties"].length > 0 && projector["outputProperties"].every((property) => typeof property === "string" && CSS_RECIPE_PROPERTY_NAME_PATTERN.test(property)) && new Set(projector["outputProperties"] as readonly string[]).size === projector["outputProperties"].length);

/** Verifies the closed catalog whose bindings own condition-only Domain semantics. */
const isTokenBindingCatalog = (value: unknown): boolean => hasKeys(value, ["schemaVersion", "conditionOnlyDomains", "bindings"]) && value["schemaVersion"] === "0.1" && isUniqueStrings(value["conditionOnlyDomains"], 0) && (value["conditionOnlyDomains"] as readonly string[]).every(isIdentifier) && Array.isArray(value["bindings"]) && value["bindings"].length > 0 && value["bindings"].every((binding) => hasKeys(binding, ["id", "directDomains", "templateDomains", "projectors", "allowsTokenNegation"], ["properties", "expandShorthands"]) && isIdentifier(binding["id"]) && (binding["properties"] !== undefined || binding["expandShorthands"] !== undefined) && ["properties", "expandShorthands"].every((key) => binding[key] === undefined || isUniqueStrings(binding[key], 0) && (binding[key] as readonly string[]).every((property) => CSS_RECIPE_PROPERTY_NAME_PATTERN.test(property))) && ["directDomains", "templateDomains"].every((key) => isUniqueStrings(binding[key], 0) && (binding[key] as readonly string[]).every(isIdentifier)) && isUniqueStrings(binding["projectors"], 0) && (binding["projectors"] as readonly string[]).every((id) => CSS_RECIPE_SERIALIZER_ID_PATTERN.test(id)) && typeof binding["allowsTokenNegation"] === "boolean");

/** Verifies the exact canonical object used by P3 to derive `policySourceDigest`. */
const isPropertyPolicySource = (value: unknown): boolean => hasKeys(value, ["policy", "bindings"]) && hasKeys(value["policy"], ["schemaVersion", "defaults", "groups", "overrides", "blockedProperties", "customProperties"]) && value["policy"]["schemaVersion"] === "0.1" && isTokenJson(value["policy"]) && isTokenBindingCatalog(value["bindings"]);

/** Verifies the profile's direct/template/projector Token policy subrecord. */
const isTokenBindings = (value: unknown): boolean => hasKeys(value, ["directDomains", "templateDomains", "projectors", "allowsTokenNegation"]) && ["directDomains", "templateDomains", "projectors"].every((key) => Array.isArray(value[key]) && value[key].every((entry: unknown) => typeof entry === "string")) && typeof value["allowsTokenNegation"] === "boolean";

/** Verifies one closed effective CSS policy entry, including Token bindings and provenance. */
const isPropertyPolicy = (value: unknown): boolean => hasKeys(value, ["authoring", "valueKinds", "tokenBindings", "rawCSS", "shorthand", "portability", "motion", "security", "provenance"]) && (value["authoring"] === "allowed" || value["authoring"] === "opt-in" || value["authoring"] === "blocked") && isUniqueStrings(value["valueKinds"]) && (value["valueKinds"] as readonly string[]).every((kind) => kind === "css" || kind === "token" || kind === "css-template") && isTokenBindings(value["tokenBindings"]) && (["allowed", "warning", "blocked"] as readonly unknown[]).includes(value["rawCSS"]) && (["not-applicable", "allowed", "warning", "blocked"] as readonly unknown[]).includes(value["shorthand"]) && (["portable-candidate", "web-specific", "unknown"] as readonly unknown[]).includes(value["portability"]) && (["interpolable", "discrete", "not-animatable", "unknown"] as readonly unknown[]).includes(value["motion"]) && hasKeys(value["security"], ["resources"]) && (["allowed", "reported", "blocked"] as readonly unknown[]).includes(value["security"]["resources"]) && Array.isArray(value["provenance"]) && value["provenance"].length > 0 && value["provenance"].every((entry) => hasKeys(entry, ["source", "rule"]) && typeof entry["source"] === "string" && entry["source"].length > 0 && typeof entry["rule"] === "string" && entry["rule"].length > 0);

/** Verifies the effective property registry needed by public profile policy and grammar validators. */
const isPropertyRegistry = (value: unknown): boolean => hasKeys(value, ["schemaVersion", "profile", "properties", "aliases", "authoringNames", "customProperties"]) && value["schemaVersion"] === "0.1" && hasKeys(value["profile"], ["schemaVersion", "id", "webrefPackageVersion", "webrefInputPath", "webrefInputDigest", "generatorVersion", "policySourceDigest"]) && value["profile"]["schemaVersion"] === "0.1" && value["profile"]["id"] === "axiom-css" && Object.values(value["profile"]).every((item) => typeof item === "string" && item.length > 0) && typeof value["profile"]["webrefInputDigest"] === "string" && CSS_RECIPE_SHA256_DIGEST_PATTERN.test(value["profile"]["webrefInputDigest"]) && typeof value["profile"]["policySourceDigest"] === "string" && CSS_RECIPE_SHA256_DIGEST_PATTERN.test(value["profile"]["policySourceDigest"]) && Array.isArray(value["properties"]) && value["properties"].length > 0 && value["properties"].every((property) => hasKeys(property, ["name", "authoringName", "syntax", "sourceHref", "status", "kind", "inherited", "initialValue", "longhands", "resetLonghands", "policy"], ["legacyAliasOf"]) && typeof property["name"] === "string" && property["name"].length > 0 && typeof property["authoringName"] === "string" && property["authoringName"].length > 0 && (typeof property["syntax"] === "string" || property["syntax"] === null) && typeof property["sourceHref"] === "string" && property["sourceHref"].startsWith("https://") && (["standard", "experimental", "deprecated", "legacy", "vendor"] as readonly unknown[]).includes(property["status"]) && (property["kind"] === "longhand" || property["kind"] === "shorthand") && (typeof property["inherited"] === "boolean" || property["inherited"] === null) && (typeof property["initialValue"] === "string" || property["initialValue"] === null) && isUniqueStrings(property["longhands"], 0) && isUniqueStrings(property["resetLonghands"], 0) && (property["legacyAliasOf"] === undefined || typeof property["legacyAliasOf"] === "string") && isPropertyPolicy(property["policy"])) && isPlainRecord(value["aliases"]) && Object.values(value["aliases"]).every((entry) => typeof entry === "string") && isPlainRecord(value["authoringNames"]) && Object.values(value["authoringNames"]).every((entry) => typeof entry === "string") && isUniqueStrings(value["customProperties"], 0);

/** Returns whether an array contains unique non-empty string entries. */
const isUniqueStrings = (value: unknown, minimum = 1): value is readonly string[] => Array.isArray(value) && value.length >= minimum && value.every((entry) => typeof entry === "string" && entry.length > 0) && new Set(value).size === value.length;

/** Verifies deterministically ordered unique identifier collections owned by registries. */
const isOrderedIdentifiers = (value: unknown, minimum = 1): value is readonly string[] => isUniqueStrings(value, minimum) && value.every(isIdentifier) && value.every((entry, index, entries) => index === 0 || entries[index - 1]!.localeCompare(entry, "en") <= 0);

/** Verifies the canonical State Registry's closed discriminated State records. */
const isCanonicalStateRegistry = (value: unknown): boolean => hasKeys(value, ["schemaVersion", "states"]) && value["schemaVersion"] === "0.1" && Array.isArray(value["states"]) && isOrderedIdentifiers(value["states"].map((state) => isPlainRecord(state) ? state["id"] : "")) && value["states"].every((state) => hasKeys(state, ["id", "axis", "valueType", "applicableComponents", "usage"], ["values"]) && isIdentifier(state["id"]) && (state["axis"] === "lifecycle" || state["axis"] === "state") && (state["valueType"] === "boolean" || state["valueType"] === "enum") && isUniqueStrings(state["applicableComponents"]) && (state["applicableComponents"] as readonly string[]).every(isIdentifier) && isUniqueStrings(state["usage"]) && (state["usage"] as readonly string[]).some((usage) => usage === "appearance" || usage === "motion") && (state["usage"] as readonly string[]).every((usage) => usage === "appearance" || usage === "behavior" || usage === "motion") && (state["valueType"] === "enum" ? isUniqueStrings(state["values"], 2) && (state["values"] as readonly string[]).every(isIdentifier) : state["values"] === undefined) && (state["axis"] !== "lifecycle" || state["valueType"] === "boolean"));

/** Verifies registered Container and discriminated viewport/container/preference Conditions. */
const isConditionRegistry = (value: unknown, manifest: UnknownRecord): boolean => {
  if (!hasKeys(value, ["schemaVersion", "containers", "conditions"]) || value["schemaVersion"] !== "0.1" || !Array.isArray(value["containers"]) || !isOrderedIdentifiers(value["containers"].map((container) => isPlainRecord(container) ? container["id"] : "")) || !value["containers"].every((container) => hasKeys(container, ["id", "cssName"]) && isIdentifier(container["id"]) && typeof container["cssName"] === "string" && CSS_RECIPE_PROPERTY_NAME_PATTERN.test(container["cssName"])) || !Array.isArray(value["conditions"]) || !isOrderedIdentifiers(value["conditions"].map((condition) => isPlainRecord(condition) ? condition["id"] : ""))) return false;
  const containerIds = new Set(value["containers"].map((container) => (container as UnknownRecord)["id"]));
  const breakpointTokens = new Set(((manifest["contexts"] as readonly UnknownRecord[])[0]?.["tokens"] as readonly UnknownRecord[]).filter((token) => token["domain"] === "breakpoint" && token["tier"] === "semantic").map((token) => token["id"]));
  return value["conditions"].every((condition) => {
  if (!isPlainRecord(condition) || typeof condition["kind"] !== "string") return false;
  if (condition["kind"] === "preference") return hasKeys(condition, ["id", "kind", "feature", "equals"]) && condition["id"] === "preference.reducedMotion" && condition["feature"] === "prefers-reduced-motion" && condition["equals"] === "reduce";
  const isContainer = condition["kind"] === "container";
  return hasKeys(condition, ["id", "kind", "feature", "comparison", "value"], isContainer ? ["container"] : []) && isIdentifier(condition["id"]) && (condition["kind"] === "viewport" || isContainer) && typeof condition["id"] === "string" && condition["id"].startsWith(isContainer ? "container." : "viewport.") && condition["feature"] === (isContainer ? "inline-size" : "width") && (condition["comparison"] === "<" || condition["comparison"] === ">=") && hasKeys(condition["value"], ["kind", "path"]) && condition["value"]["kind"] === "token" && typeof condition["value"]["path"] === "string" && CSS_RECIPE_TOKEN_ID_PATTERN.test(condition["value"]["path"]) && breakpointTokens.has(condition["value"]["path"]) && (!isContainer || isIdentifier(condition["container"]) && containerIds.has(condition["container"]));
  });
};

/** Creates a contextual N21 diagnostic without changing a profile-owned diagnostic code. */
const diagnostic = (
  code: string,
  message: string,
  path: TokenBindingDeclarationPath,
  property?: EffectiveCSSPropertyEntry,
  tokenId?: string,
): CSSRecipeDiagnostic => ({
  code,
  severity: CSS_RECIPE_DIAGNOSTIC_SEVERITY,
  phase: CSS_RECIPE_DIAGNOSTIC_PHASE,
  message,
  source: path.source,
  recipeId: path.recipeId,
  slot: path.slot,
  stage: path.stage,
  property: property?.name ?? path.property,
  pointer: path.pointer,
  declarationIndex: path.declarationIndex,
  ...(tokenId === undefined ? {} : { tokenId }),
  ...(property === undefined ? {} : { provenance: property.policy.provenance }),
});

/** Resolves one canonical property entry for the declaration-aware semantic boundary. */
const propertyFor = (
  input: CSSRecipeAuthoringInput,
  path: TokenBindingDeclarationPath,
): EffectiveCSSPropertyEntry | CSSRecipeDiagnostic => {
  const property = input.propertyRegistry.properties.find((entry) => entry.name === path.property);
  return property ?? diagnostic("AXP1001", `Unknown CSS property '${path.property}'.`, path);
};

/** Reads a closed Token Reference from an N20 authoring value. */
const tokenReference = (value: unknown): TokenReference | undefined =>
  isRecord(value) && value["kind"] === "token" && typeof value["path"] === "string"
    ? value as TokenReference
    : undefined;

/** Returns all Token References embedded by one closed N20 declaration value. */
const referencesIn = (value: CSSAuthoringValue): readonly TokenReference[] => {
  const direct = tokenReference(value);
  if (direct !== undefined) return [direct];
  const record = isRecord(value as unknown) ? value as unknown as UnknownRecord : undefined;
  if (record === undefined) return [];
  if (record["kind"] === CSS_RECIPE_NEGATED_TOKEN_KIND) {
    const reference = tokenReference(record["token"]);
    return reference === undefined ? [] : [reference];
  }
  if (record["kind"] === CSS_RECIPE_TOKEN_PROJECTOR_KIND) {
    const reference = tokenReference(record["token"]);
    return reference === undefined ? [] : [reference];
  }
  if (record["kind"] !== "css-template" || !Array.isArray(record["parts"])) return [];
  return record["parts"].flatMap((part) => {
    const reference = tokenReference(part);
    return reference === undefined ? [] : [reference];
  });
};

/** Ensures a caller-supplied manifest entry exists once per context with immutable identity. */
const resolveEntries = (
  input: CSSRecipeAuthoringInput,
  reference: TokenReference,
  path: TokenBindingDeclarationPath,
): { readonly entries: readonly ResolvedTokenEntry[]; readonly domain: string; readonly dtcgType: string } | CSSRecipeDiagnostic => {
  const index = createResolvedTokenManifestIndex(input.tokenValidation.resolvedTokenManifest);
  const indexed = index.find(reference.path);
  if (index.diagnostics.some((item) => item.code === "AXT1501" && item.tokenId === reference.path)) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_UNRESOLVED,
    `Token '${reference.path}' must resolve in every configured context.`,
    path,
    undefined,
    reference.path,
  );
  if (index.diagnostics.length > 0) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_IDENTITY_MISMATCH,
    `Resolved Token Manifest is not context-complete for Token '${reference.path}'.`,
    path,
  );
  if (indexed === undefined || indexed.entries.length !== input.tokenValidation.resolvedTokenManifest.contexts.length) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_UNRESOLVED,
    `Token '${reference.path}' must resolve in every configured context.`,
    path,
    undefined,
    reference.path,
  );
  const first = indexed.entries[0];
  if (first === undefined || indexed.entries.some((entry) => entry.domain !== first.domain || entry.tier !== first.tier || entry.dtcgType !== first.dtcgType)) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_IDENTITY_MISMATCH,
    `Token '${reference.path}' changes identity across resolved contexts.`,
    path,
    undefined,
    reference.path,
  );
  return { entries: indexed.entries, domain: first.domain, dtcgType: first.dtcgType };
};

/** Checks domain/type membership and selects the exact registered serializer needed for one Token. */
const serializerFor = (
  input: CSSRecipeAuthoringInput,
  domainId: string,
  dtcgType: string,
  path: TokenBindingDeclarationPath,
): { readonly id: string; readonly serialize: (entry: ResolvedTokenEntry) => string } | CSSRecipeDiagnostic => {
  const domain = input.tokenValidation.tokenDomainRegistry.domains.find((entry) => entry.id === domainId && entry.root === domainId);
  if (domain === undefined || input.tokenValidation.propertyPolicySource.bindings.conditionOnlyDomains.includes(domainId) || !domain.allowedDTCGTypes.includes(dtcgType as never)) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_DOMAIN_INVALID,
    `Token Domain '${domainId}' does not accept DTCG type '${dtcgType}'.`,
    path,
  );
  const serializer = input.tokenValidation.serializers.find((entry) => domain.cssSerializers.includes(entry.id));
  if (serializer === undefined) return diagnostic(
    "AXP1104",
    `Token Domain '${domainId}' has no configured registered CSS serializer.`,
    path,
  );
  return serializer;
};

/** Verifies all explicit authority identities before any Token value is accepted. */
const authorityDiagnostic = (
  input: CSSRecipeAuthoringInput,
  path: TokenBindingDeclarationPath,
): CSSRecipeDiagnostic | undefined => {
  try {
    const candidate = (input as Readonly<{ readonly tokenValidation?: unknown }>).tokenValidation;
    if (!hasKeys(candidate, ["resolvedTokenManifest", "tokenDomainRegistry", "projectorRegistry", "propertyPolicySource", "authorityDigests", "canonicalDigest", "serializers", "projectors"]) || !hasKeys(candidate["canonicalDigest"], ["digestCanonicalJson"]) || typeof candidate["canonicalDigest"]["digestCanonicalJson"] !== "function" || !hasKeys(candidate["authorityDigests"], ["effectivePropertyRegistry", "propertyPolicySource", "resolvedTokenManifest", "tokenDomainRegistry", "projectorRegistry", "canonicalStateRegistry", "conditionRegistry"]) || !Object.values(candidate["authorityDigests"]).every((value) => typeof value === "string" && CSS_RECIPE_SHA256_DIGEST_PATTERN.test(value)) || !Array.isArray(candidate["serializers"]) || !candidate["serializers"].every((serializer) => hasKeys(serializer, ["id", "serialize"]) && typeof serializer["id"] === "string" && CSS_RECIPE_SERIALIZER_ID_PATTERN.test(serializer["id"]) && typeof serializer["serialize"] === "function") || !Array.isArray(candidate["projectors"]) || !candidate["projectors"].every((projector) => hasKeys(projector, ["id", "project"]) && typeof projector["id"] === "string" && CSS_RECIPE_SERIALIZER_ID_PATTERN.test(projector["id"]) && typeof projector["project"] === "function")) return diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.AUTHORITY_DIGEST_MISMATCH,
      "N21 Token validation requires complete explicit authority identities and execution ports.",
      path,
    );
  } catch {
    return diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.AUTHORITY_DIGEST_MISMATCH,
      "N21 authority digest port is not safely readable.",
      path,
    );
  }
  try {
  const typedConfig = input.tokenValidation;
  const { canonicalDigest, authorityDigests, propertyPolicySource, resolvedTokenManifest, tokenDomainRegistry, projectorRegistry } = typedConfig;
  const configShapeInvalid = !isPropertyRegistry(input.propertyRegistry) || !isPropertyPolicySource(propertyPolicySource) || !isCanonicalStateRegistry(input.canonicalStateRegistry) || !isResolvedManifest(resolvedTokenManifest) || !isConditionRegistry(input.conditionRegistry, resolvedTokenManifest as unknown as UnknownRecord) || !isDomainRegistry(tokenDomainRegistry) || !isProjectorRegistry(projectorRegistry);
  if (configShapeInvalid) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.AUTHORITY_DIGEST_MISMATCH,
    "N21 Token validation configuration is not schema-faithful or complete.",
    path,
  );
  const manifestIndex = createResolvedTokenManifestIndex(resolvedTokenManifest);
  if (manifestIndex.diagnostics.some((item) => item.code === "AXT1501")) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_UNRESOLVED,
    "Resolved Token Manifest is not complete across its configured contexts.",
    path,
  );
  if (manifestIndex.diagnostics.length > 0) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_IDENTITY_MISMATCH,
    "Resolved Token Manifest has duplicate or identity-drifting entries.",
    path,
  );
  let actual: Record<keyof typeof authorityDigests, string>;
  try {
    const digest = (value: unknown): string => canonicalDigest.digestCanonicalJson(value as TokenJsonValue);
    actual = {
      effectivePropertyRegistry: digest(input.propertyRegistry),
      propertyPolicySource: digest(propertyPolicySource),
      resolvedTokenManifest: digestResolvedTokenManifest(resolvedTokenManifest, canonicalDigest),
      tokenDomainRegistry: digest(tokenDomainRegistry),
      projectorRegistry: digest(projectorRegistry),
      canonicalStateRegistry: digest(input.canonicalStateRegistry),
      conditionRegistry: digest(input.conditionRegistry),
    };
  } catch {
    return diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.AUTHORITY_DIGEST_MISMATCH,
      "N21 canonical digest port threw while verifying explicit authorities.",
      path,
    );
  }
  const serializerIds = typedConfig.serializers.map((entry) => entry.id);
  const projectorIds = typedConfig.projectors.map((entry) => entry.id);
  const conditionOnlyDomains = propertyPolicySource.bindings.conditionOnlyDomains;
  const invalidConditionOnlyDomains = conditionOnlyDomains.some((domain) => !tokenDomainRegistry.domains.some((entry) => entry.id === domain));
  if (invalidConditionOnlyDomains) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.AUTHORITY_DIGEST_MISMATCH,
    "N21 condition-only Domain configuration is not unique or registered.",
    path,
  );
  const hasInvalidPorts = new Set(serializerIds).size !== serializerIds.length || new Set(projectorIds).size !== projectorIds.length || new Set(tokenDomainRegistry.domains.map((domain) => domain.id)).size !== tokenDomainRegistry.domains.length || new Set(projectorRegistry.projectors.map((descriptor) => descriptor.id)).size !== projectorRegistry.projectors.length || serializerIds.some((id) => !tokenDomainRegistry.domains.some((domain) => domain.cssSerializers.includes(id))) || projectorIds.some((id) => !projectorRegistry.projectors.some((descriptor) => descriptor.id === id && tokenDomainRegistry.domains.some((domain) => domain.id === descriptor.domain && domain.cssSerializers.includes(id))));
  if (hasInvalidPorts) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_SERIALIZER_INVALID,
    "Configured Token serializer or projector ports do not match registered identities.",
    path,
  );
  const missingExecutionPort = tokenDomainRegistry.domains.some((domain) => !conditionOnlyDomains.includes(domain.id) && !domain.cssSerializers.some((id: string) => serializerIds.includes(id) || projectorIds.includes(id)));
  if (missingExecutionPort) return diagnostic(
    "AXP1104",
    "A registered Token Domain has no configured serializer or composite projector port.",
    path,
  );
  if (actual.propertyPolicySource !== input.propertyRegistry.profile.policySourceDigest) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.AUTHORITY_DIGEST_MISMATCH,
    "N21 CSS policy source does not match the Effective Property Registry provenance.",
    path,
  );
  const mismatch = Object.entries(actual).find(([key, value]) => value !== authorityDigests[key as keyof typeof authorityDigests]);
  return mismatch === undefined ? undefined : diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.AUTHORITY_DIGEST_MISMATCH,
    `N21 authority digest mismatch for '${mismatch[0]}'.`,
    path,
  );
  } catch {
    return diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_SERIALIZER_INVALID,
      "Configured Token authority ports are not safely readable.",
      path,
    );
  }
};

/** Reuses the public property-policy check and maps its first failure into N20 diagnostic context. */
const propertyDiagnostics = (
  input: CSSRecipeAuthoringInput,
  property: EffectiveCSSPropertyEntry,
  path: TokenBindingDeclarationPath,
  mode: "direct" | "template" | "projector",
  domain: string,
  projector?: string,
  negated?: boolean,
): readonly CSSRecipeDiagnostic[] => validatePropertyTokenBinding(input.propertyRegistry, {
  property: property.name,
  mode,
  ...(mode === "projector" && projector !== undefined ? { projector } : mode === "projector" ? {} : { domain }),
  ...(negated === true ? { negated } : {}),
}).map((item) => diagnostic(
  negated === true && item.code === "AXP1102"
    ? CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_NEGATION_INVALID
    : item.code,
  item.message,
  path,
  property,
));

/** Validates serialized values against the configured property grammar in every Token context. */
const validateGrammar = (
  grammar: CSSGrammarValidator,
  property: EffectiveCSSPropertyEntry,
  values: readonly string[],
  path: TokenBindingDeclarationPath,
): readonly CSSRecipeDiagnostic[] => values.flatMap((value) => {
  const result = grammar.validate(property.name, value);
  return result.valid ? [] : result.diagnostics.map((item) => diagnostic(item.code, item.message, path, property));
});

/** Validates one direct, template, or negated Token declaration and yields source-ordered evidence. */
const validateReferenceValue = (
  input: CSSRecipeAuthoringInput,
  grammar: CSSGrammarValidator,
  property: EffectiveCSSPropertyEntry,
  path: TokenBindingDeclarationPath,
  value: CSSAuthoringValue,
): { readonly binding: ValidatedTokenBinding; readonly diagnostics: readonly CSSRecipeDiagnostic[] } | { readonly diagnostics: readonly CSSRecipeDiagnostic[] } => {
  const references = referencesIn(value);
  const record = isRecord(value as unknown) ? value as unknown as UnknownRecord : undefined;
  const isNegated = record?.["kind"] === CSS_RECIPE_NEGATED_TOKEN_KIND;
  const isTemplate = record?.["kind"] === "css-template";
  const mode = isNegated || isTemplate ? "template" : "direct";
  const diagnostics: CSSRecipeDiagnostic[] = [];
  const resolved = references.map((reference) => ({ reference, result: resolveEntries(input, reference, path) }));
  for (const item of resolved) if ("code" in item.result) diagnostics.push(item.result);
  if (diagnostics.length > 0) return { diagnostics };
  const entries = resolved.map((item) => ({ reference: item.reference, result: item.result as Exclude<typeof item.result, CSSRecipeDiagnostic> }));
  for (const item of entries) {
    const serializer = serializerFor(input, item.result.domain, item.result.dtcgType, path);
    if ("code" in serializer) diagnostics.push(serializer);
    else diagnostics.push(...propertyDiagnostics(input, property, path, mode, item.result.domain, undefined, isNegated));
  }
  if (diagnostics.length > 0) return { diagnostics };
  const serializers = entries.map((item) => serializerFor(input, item.result.domain, item.result.dtcgType, path) as Exclude<ReturnType<typeof serializerFor>, CSSRecipeDiagnostic>);
  const synthetic = isNegated
    ? "calc(0px - var(--generated-token))"
    : isTemplate
      ? (value as { readonly parts: readonly (string | TokenReference)[] }).parts.map((part) => typeof part === "string" ? part : "var(--generated-token)").join("")
      : undefined;
  if (synthetic !== undefined) diagnostics.push(...validateGrammar(grammar, property, [synthetic], path));
  if (diagnostics.length > 0) return { diagnostics };
  let perContext: readonly string[];
  try {
    perContext = input.tokenValidation.resolvedTokenManifest.contexts.map((_, contextIndex) => {
      const serialized = entries.map((item, index) => serializers[index]?.serialize(item.result.entries[contextIndex]!));
      if (serialized.some((item) => typeof item !== "string")) throw new TypeError("Token serializer must return a string.");
      if (isNegated) return `calc(0px - ${serialized[0] ?? ""})`;
      if (!isTemplate) return serialized[0] ?? "";
      const parts = (value as { readonly parts: readonly (string | TokenReference)[] }).parts;
      let referenceIndex = 0;
      return parts.map((part) => typeof part === "string" ? part : serialized[referenceIndex++] ?? "").join("");
    });
  } catch {
    return { diagnostics: [diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_SERIALIZER_INVALID, "Configured Token serializer threw while serializing a resolved Token.", path, property)] };
  }
  diagnostics.push(...validateGrammar(grammar, property, perContext, path));
  if (diagnostics.length > 0) return { diagnostics };
  const first = entries[0];
  if (first === undefined) return { diagnostics: [diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_UNRESOLVED, "Token declaration has no Token Reference.", path, property)] };
  return {
    binding: Object.freeze({
      path: Object.freeze({ ...path }),
      mode: isNegated ? "negated-template" : isTemplate ? "template" : "direct",
      tokens: Object.freeze(entries.map((item, index) => Object.freeze({
        tokenId: item.reference.path,
        domain: item.result.domain,
        dtcgType: item.result.dtcgType,
        serializerId: serializers[index]!.id,
      }))),
    }),
    diagnostics: [],
  };
};

/** Copies one JSON-safe Token value into a detached immutable projector input. */
const detachTokenJson = (value: TokenJsonValue): TokenJsonValue => {
  if (Array.isArray(value)) return Object.freeze(value.map(detachTokenJson));
  if (value !== null && typeof value === "object") return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, detachTokenJson(item)]),
  ));
  return value;
};

/** Copies one resolved entry so separate projector calls receive identical detached data. */
const detachResolvedEntry = (entry: ResolvedTokenEntry): ResolvedTokenEntry => Object.freeze({
  ...entry,
  resolvedValue: detachTokenJson(entry.resolvedValue),
  source: Object.freeze({ ...entry.source }),
  dependencies: Object.freeze([...entry.dependencies]),
});

/** Compares closed projected records without relying on object identity or serialization hooks. */
const sameProjectedOutputs = (
  left: readonly (readonly import("./contracts.js").ProjectedTokenDeclaration[])[],
  right: readonly (readonly import("./contracts.js").ProjectedTokenDeclaration[])[],
): boolean => left.length === right.length && left.every((output, contextIndex) => output.length === right[contextIndex]?.length && output.every((entry, index) => {
  const other = right[contextIndex]?.[index];
  return other !== undefined && entry.property === other.property && entry.source === other.source && entry.field === other.field && entry.value === other.value;
}));

/** Validates parameters, identity, order, and context outputs for one composite Token projector. */
const validateProjectorValue = (
  input: CSSRecipeAuthoringInput,
  grammar: CSSGrammarValidator,
  property: EffectiveCSSPropertyEntry,
  path: TokenBindingDeclarationPath,
  value: CSSAuthoringValue,
): { readonly binding: ValidatedTokenBinding; readonly diagnostics: readonly CSSRecipeDiagnostic[] } | { readonly diagnostics: readonly CSSRecipeDiagnostic[] } => {
  const record = isRecord(value as unknown) ? value as unknown as UnknownRecord : undefined;
  if (record === undefined || record["kind"] !== CSS_RECIPE_TOKEN_PROJECTOR_KIND || typeof record["projector"] !== "string") return { diagnostics: [diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_PROJECTOR_INVALID, "A projector declaration must use a closed Token projector value.", path, property)] };
  const reference = tokenReference(record["token"]);
  const descriptor = input.tokenValidation.projectorRegistry.projectors.find((entry) => entry.id === record["projector"]);
  const resolved = reference === undefined ? undefined : resolveEntries(input, reference, path);
  if (reference === undefined || descriptor === undefined || resolved === undefined || "code" in resolved) return { diagnostics: [resolved !== undefined && "code" in resolved ? resolved : diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_PROJECTOR_INVALID, "Projector identity or Token Reference is invalid.", path, property)] };
  const domain = input.tokenValidation.tokenDomainRegistry.domains.find((entry) => entry.id === resolved.domain);
  const projector = input.tokenValidation.projectors.find((entry) => entry.id === descriptor.id);
  const parameters = record["parameters"];
  const parameterRecord = isRecord(parameters) ? parameters as Readonly<Record<string, TokenJsonValue>> : undefined;
  const transition = descriptor.id === "css.transition-projector.v1";
  const validTransitionParameters = transition && parameterRecord !== undefined && Object.keys(parameterRecord).length === 1 && Array.isArray(parameterRecord["properties"]) && parameterRecord["properties"].length > 0 && parameterRecord["properties"].every((entry) => typeof entry === "string" && input.propertyRegistry.properties.some((propertyEntry) => propertyEntry.name === entry)) && new Set(parameterRecord["properties"] as readonly string[]).size === parameterRecord["properties"].length;
  if (domain === undefined || domain.root !== resolved.domain || descriptor.domain !== resolved.domain || descriptor.dtcgType !== resolved.dtcgType || !domain.cssSerializers.includes(descriptor.id) || projector === undefined || (transition ? !validTransitionParameters : parameters !== undefined)) return { diagnostics: [diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_PROJECTOR_INVALID, "Projector identity, anchor, Domain, DTCG type, serializer membership, or parameters are invalid.", path, property)] };
  const policy = propertyDiagnostics(input, property, path, "projector", resolved.domain, descriptor.id);
  if (policy.length > 0) return { diagnostics: policy };
  let outputs: readonly (readonly import("./contracts.js").ProjectedTokenDeclaration[])[];
  try {
    const project = (): readonly (readonly import("./contracts.js").ProjectedTokenDeclaration[])[] => resolved.entries.map((entry: ResolvedTokenEntry) => projector.project(
      detachResolvedEntry(entry),
      parameterRecord === undefined ? undefined : detachTokenJson(parameterRecord) as Readonly<Record<string, TokenJsonValue>>,
    ));
    outputs = project();
    if (!sameProjectedOutputs(outputs, project())) return { diagnostics: [diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_PROJECTOR_OUTPUT_INVALID,
      "Configured Token projector returned different output for identical detached input.",
      path,
      property,
    )] };
  } catch {
    return { diagnostics: [diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_PROJECTOR_OUTPUT_INVALID, "Configured Token projector threw while producing a declaration output.", path, property)] };
  }
  const expected = descriptor.outputProperties;
  const baselineShape = (outputs[0] ?? []).map((entry) => `${entry.property}|${entry.source}|${entry.field}`).join("|");
  const sameOrder = outputs.every((output: readonly import("./contracts.js").ProjectedTokenDeclaration[]) => output.map((entry) => entry.property).join("|") === expected.join("|") && output.map((entry) => `${entry.property}|${entry.source}|${entry.field}`).join("|") === baselineShape);
  const validOutput = outputs.every((output: readonly import("./contracts.js").ProjectedTokenDeclaration[]) => output.length === expected.length && output.every((entry, index) => entry.property === expected[index] && descriptor.outputProperties.includes(entry.property) && typeof entry.value === "string" && typeof entry.field === "string" && entry.field.length > 0 && (entry.source === "token" || (transition && entry.source === "parameters"))));
  if (!sameOrder || !validOutput) return { diagnostics: [diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_PROJECTOR_OUTPUT_INVALID, "Projector output must exactly match the registered ordered output properties.", path, property)] };
  const parameterStable = outputs.every((output) => output.every((entry, index) => entry.source !== "parameters" || entry.value === outputs[0]?.[index]?.value));
  if (!parameterStable) return { diagnostics: [diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_PROJECTOR_OUTPUT_INVALID, "Parameter-derived projector declarations must remain byte-identical across contexts.", path, property)] };
  const outputDiagnostics = outputs.flatMap((output: readonly import("./contracts.js").ProjectedTokenDeclaration[]) => output.flatMap((entry, outputIndex) => {
    const outputPath: TokenBindingDeclarationPath = {
      ...path,
      property: entry.property,
      pointer: `${path.pointer}/projected/${outputIndex}`,
      declarationIndex: outputIndex,
    };
    const outputProperty = input.propertyRegistry.properties.find((candidate) => candidate.name === entry.property);
    if (outputProperty === undefined) return [diagnostic("AXP1001", `Unknown projected CSS property '${entry.property}'.`, outputPath, property)];
    const authoringAllowed = outputProperty.policy.authoring === "allowed" || outputProperty.policy.authoring === "opt-in" && input.enabledExperimentalProperties?.includes(outputProperty.name) === true;
    const requiredValueKind = entry.source === "token" ? "token" : "css";
    if (!authoringAllowed || !outputProperty.policy.valueKinds.includes(requiredValueKind) || outputProperty.policy.security.resources === "blocked" && /url\(/i.test(entry.value)) return [diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_PROJECTOR_OUTPUT_INVALID, `Projected declaration '${entry.property}' violates effective authoring, value-kind, or resource policy.`, outputPath, outputProperty)];
    return validateGrammar(grammar, outputProperty, [entry.value], outputPath);
  }));
  if (outputDiagnostics.length > 0) return { diagnostics: outputDiagnostics };
  const blueprints: readonly ProjectedTokenBlueprint[] = Object.freeze((outputs[0] ?? []).map((entry: import("./contracts.js").ProjectedTokenDeclaration) => {
    const value: CSSDeclarationValue = entry.source === "token"
      ? Object.freeze({ kind: "token", path: reference.path })
      : Object.freeze({ kind: "css", value: entry.value });
    return Object.freeze({ property: entry.property, source: entry.source, field: entry.field, value });
  }));
  return { binding: Object.freeze({ path: Object.freeze({ ...path }), mode: "projector", tokens: Object.freeze([Object.freeze({ tokenId: reference.path, domain: resolved.domain, dtcgType: resolved.dtcgType, serializerId: descriptor.id })]), projectorId: descriptor.id, projectorVersion: descriptor.version, projectedDeclarations: blueprints }), diagnostics: [] };
};

/** Validates one complete N20 Token-bearing declaration using explicit N21 authorities. */
export const validateTokenBinding = (
  input: CSSRecipeAuthoringInput,
  candidate: Readonly<{ readonly path: TokenBindingDeclarationPath; readonly value: CSSAuthoringValue }>,
): { readonly binding?: ValidatedTokenBinding; readonly diagnostics: readonly CSSRecipeDiagnostic[] } => {
  const authority = authorityDiagnostic(input, candidate.path);
  if (authority !== undefined) return { diagnostics: [authority] };
  const property = propertyFor(input, candidate.path);
  if ("code" in property) return { diagnostics: [property] };
  const grammarRegistry: EffectiveCSSPropertyRegistry = Object.freeze({
    ...input.propertyRegistry,
    properties: Object.freeze(input.propertyRegistry.properties.map((entry) => Object.freeze({
      ...entry,
      policy: Object.freeze({ ...entry.policy, rawCSS: "allowed" as const }),
    }))),
  });
  const grammar = new CSSGrammarValidator(grammarRegistry, {
    allowCustomPropertyReferences: true,
    ...(input.enabledExperimentalProperties === undefined ? {} : { enabledExperimentalProperties: input.enabledExperimentalProperties }),
  });
  const candidateRecord = isRecord(candidate.value as unknown) ? candidate.value as unknown as UnknownRecord : undefined;
  try {
    const result = candidateRecord?.["kind"] === CSS_RECIPE_TOKEN_PROJECTOR_KIND
      ? validateProjectorValue(input, grammar, property, candidate.path, candidate.value)
      : validateReferenceValue(input, grammar, property, candidate.path, candidate.value);
    return "binding" in result ? { binding: result.binding as ValidatedTokenBinding, diagnostics: result.diagnostics } : result;
  } catch {
    return { diagnostics: [diagnostic(
      candidateRecord?.["kind"] === CSS_RECIPE_TOKEN_PROJECTOR_KIND
        ? CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_PROJECTOR_OUTPUT_INVALID
        : CSS_RECIPE_DIAGNOSTIC_CODE.TOKEN_SERIALIZER_INVALID,
      "Configured Token execution port returned unreadable output.",
      candidate.path,
      property,
    )] };
  }
};

/** Verifies injected N21 authority ports before an authoring port is exposed to callers. */
export const validateTokenBindingConfiguration = (
  input: CSSRecipeAuthoringInput,
): readonly CSSRecipeDiagnostic[] => {
  const path: TokenBindingDeclarationPath = {
    recipeId: "<configuration>",
    slot: "<configuration>",
    stage: "base",
    property: "<authority>",
    source: "<configuration>",
    pointer: "",
    declarationIndex: 0,
  };
  const authority = authorityDiagnostic(input, path);
  return authority === undefined ? [] : [authority];
};

/** Escapes one authoring key for the stable structural pointer carried in N21 evidence. */
const escapePointerSegment = (value: string): string => value.replaceAll("~", "~0").replaceAll("/", "~1");

/** Traverses N20's preserved stage order and returns a detached N21 semantic receipt. */
export const validateTokenBindings = (
  definition: CSSRecipeDefinition,
  input: CSSRecipeAuthoringInput,
): TokenBindingReport => {
  const fallbackPath: TokenBindingDeclarationPath = {
    recipeId: definition.id,
    slot: "<recipe>",
    stage: "base",
    property: "<authority>",
    source: definition.source ?? "<recipe>",
    pointer: "",
    declarationIndex: 0,
  };
  const authority = authorityDiagnostic(input, fallbackPath);
  if (authority !== undefined) throw new CSSRecipeAuthoringError([authority]);
  const diagnostics: CSSRecipeDiagnostic[] = [];
  const bindings: ValidatedTokenBinding[] = [];
  const validateStyle = (
    style: unknown,
    slot: string,
    stage: TokenBindingDeclarationPath["stage"],
    source: string,
    pointer: string,
  ): void => {
    const declarations = Array.isArray(style)
      ? style.map((entry, index) => isRecord(entry) ? { property: entry["property"], value: entry["value"], declarationIndex: index } : undefined)
      : isRecord(style)
        ? Object.entries(style).map(([property, value], index) => ({ property, value, declarationIndex: index }))
        : [];
    for (const declaration of declarations) {
      if (declaration === undefined || typeof declaration.property !== "string") continue;
      const property = Array.isArray(style)
        ? declaration.property
        : input.propertyRegistry.authoringNames[declaration.property] ?? declaration.property;
      const value = declaration.value as CSSAuthoringValue;
      if (referencesIn(value).length === 0) continue;
      const candidate = validateTokenBinding(input, {
        path: {
          recipeId: definition.id,
          slot,
          stage,
          property,
          source,
          pointer: Array.isArray(style)
            ? `${pointer}/${declaration.declarationIndex}/value`
            : `${pointer}/${escapePointerSegment(declaration.property)}`,
          declarationIndex: declaration.declarationIndex,
        },
        value,
      });
      diagnostics.push(...candidate.diagnostics);
      if (candidate.binding !== undefined) bindings.push(candidate.binding);
    }
  };
  const validateApply = (apply: unknown, stage: TokenBindingDeclarationPath["stage"], source: string, pointer: string): void => {
    if (!isRecord(apply)) return;
    for (const [slot, style] of Object.entries(apply)) validateStyle(style, slot, stage, source, `${pointer}/${escapePointerSegment(slot)}`);
  };
  validateApply(definition.base, "base", definition.source ?? "<recipe>", "/base");
  for (const [axis, values] of Object.entries(definition.variants ?? {})) if (isRecord(values)) for (const [value, apply] of Object.entries(values)) validateApply(apply, "variant", definition.source ?? "<recipe>", `/variants/${escapePointerSegment(axis)}/${escapePointerSegment(value)}`);
  for (const [index, rule] of (definition.states ?? []).entries()) for (const [caseIndex, stateCase] of rule.cases.entries()) validateStyle(stateCase.apply, rule.slot, "state", rule.source ?? definition.source ?? "<recipe>", `/states/${index}/cases/${caseIndex}/apply`);
  for (const [index, rule] of (definition.compoundVariants ?? []).entries()) validateApply(rule.apply, "compound", rule.source ?? definition.source ?? "<recipe>", `/compoundVariants/${index}/apply`);
  for (const [index, rule] of (definition.conditions ?? []).entries()) validateApply(rule.apply, "condition", rule.source ?? definition.source ?? "<recipe>", `/conditions/${index}/apply`);
  if (diagnostics.length > 0) throw new CSSRecipeAuthoringError(diagnostics);
  return Object.freeze({
    authority: Object.freeze({
      ...input.tokenValidation.authorityDigests,
      profileInputDigest: input.propertyRegistry.profile.webrefInputDigest,
      manifestSourceDigest: input.tokenValidation.resolvedTokenManifest.sourceDigest,
      contexts: Object.freeze(input.tokenValidation.resolvedTokenManifest.contexts.map((entry) => Object.freeze({ ...entry.context }))),
    }),
    bindings: Object.freeze(bindings),
  });
};
