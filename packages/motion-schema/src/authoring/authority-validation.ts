import {
  MOTION_DECLARATION_STAGES,
  MOTION_CSS_PROPERTY_NAME_PATTERN,
  MOTION_DTCG_TYPES,
  MOTION_IDENTIFIER_MAXIMUM_LENGTH,
  MOTION_IDENTIFIER_PATTERN,
  MOTION_PROFILE_ID,
  MOTION_RESOLVED_THEMES,
  MOTION_SCHEMA_VERSION,
  MOTION_SERIALIZER_ID_PATTERN,
  MOTION_STATE_AXES,
  MOTION_STATE_USAGES,
  MOTION_TOKEN_ID_PATTERN,
} from "../constants.js";
import type { MotionAuthoringInput } from "./contracts.js";

type UnknownRecord = Readonly<Record<string, unknown>>;

/** Narrows a JSON-safe object after the outer boundary has rejected accessors and prototypes. */
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Applies the closed-object key rule used by all authority contracts. */
const hasExactKeys = (value: UnknownRecord, required: readonly string[], optional: readonly string[] = []): boolean => {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key));
};

/** Recognizes the shared schema identifier grammar without accepting empty values. */
const isIdentifier = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= MOTION_IDENTIFIER_MAXIMUM_LENGTH && MOTION_IDENTIFIER_PATTERN.test(value);

/** Ensures every array carries distinct primitive identifier values. */
const hasUniqueStrings = (value: readonly string[]): boolean => new Set(value).size === value.length;

/** Requires canonical lexicographic ordering for registry arrays whose order is normative. */
const hasCanonicalIdentifierOrder = (value: readonly string[]): boolean =>
  value.every((entry, index) => index === 0 || value[index - 1]!.localeCompare(entry, "en") < 0);

/** Recognizes the canonical digest spelling accepted by every detached authority. */
const isCanonicalDigest = (value: unknown): value is string =>
  typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);

/** Recognizes the profile's stable three-component version spelling. */
const isVersion = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9]+\.[0-9]+\.[0-9]+$/u.test(value);

/** Validates a closed Effective Property Registry profile provenance record. */
const isProfile = (value: unknown): boolean =>
  isRecord(value)
  && hasExactKeys(value, ["schemaVersion", "id", "webrefPackageVersion", "webrefInputPath", "webrefInputDigest", "generatorVersion", "policySourceDigest"])
  && value["schemaVersion"] === MOTION_SCHEMA_VERSION
  && value["id"] === MOTION_PROFILE_ID
  && isVersion(value["webrefPackageVersion"])
  && value["webrefInputPath"] === "css.json"
  && isCanonicalDigest(value["webrefInputDigest"])
  && isVersion(value["generatorVersion"])
  && isCanonicalDigest(value["policySourceDigest"]);

/** Validates one exact string array used by effective CSS property policy records. */
const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string") && hasUniqueStrings(value);

/** Validates the Token-binding policy nested in one effective CSS property entry. */
const isTokenBindings = (value: unknown): boolean =>
  isRecord(value)
  && hasExactKeys(value, ["directDomains", "templateDomains", "projectors", "allowsTokenNegation"])
  && isStringList(value["directDomains"])
  && isStringList(value["templateDomains"])
  && isStringList(value["projectors"])
  && typeof value["allowsTokenNegation"] === "boolean";

/** Validates the closed policy record that governs Motion property capability and value-kind checks. */
const isEffectivePropertyPolicy = (value: unknown): boolean => {
  if (!isRecord(value) || !hasExactKeys(value, ["authoring", "valueKinds", "tokenBindings", "rawCSS", "shorthand", "portability", "motion", "security", "provenance"])) return false;
  const provenance = value["provenance"];
  return ["allowed", "opt-in", "blocked"].includes(value["authoring"] as string)
    && Array.isArray(value["valueKinds"]) && value["valueKinds"].every((kind) => ["css", "token", "css-template"].includes(kind as string)) && hasUniqueStrings(value["valueKinds"] as readonly string[])
    && isTokenBindings(value["tokenBindings"])
    && ["allowed", "warning", "blocked"].includes(value["rawCSS"] as string)
    && ["not-applicable", "allowed", "warning", "blocked"].includes(value["shorthand"] as string)
    && ["portable-candidate", "web-specific", "unknown"].includes(value["portability"] as string)
    && ["interpolable", "discrete", "not-animatable", "unknown"].includes(value["motion"] as string)
    && isRecord(value["security"]) && hasExactKeys(value["security"], ["resources"]) && ["allowed", "reported", "blocked"].includes(value["security"]["resources"] as string)
    && Array.isArray(provenance) && provenance.length > 0 && provenance.every((entry) => isRecord(entry) && hasExactKeys(entry, ["source", "rule"]) && typeof entry["source"] === "string" && entry["source"].length > 0 && typeof entry["rule"] === "string" && entry["rule"].length > 0);
};

/** Validates one closed effective CSS property entry before Motion reads its capability policy. */
const isEffectiveProperty = (value: unknown): boolean =>
  isRecord(value)
  && hasExactKeys(value, ["name", "authoringName", "syntax", "sourceHref", "status", "kind", "inherited", "initialValue", "longhands", "resetLonghands", "policy"], ["legacyAliasOf"])
  && typeof value["name"] === "string" && MOTION_CSS_PROPERTY_NAME_PATTERN.test(value["name"])
  && typeof value["authoringName"] === "string" && /^[A-Za-z][A-Za-z0-9]*$/u.test(value["authoringName"])
  && (typeof value["syntax"] === "string" || value["syntax"] === null)
  && typeof value["sourceHref"] === "string" && value["sourceHref"].startsWith("https://")
  && ["standard", "experimental", "deprecated", "legacy", "vendor"].includes(value["status"] as string)
  && ["longhand", "shorthand"].includes(value["kind"] as string)
  && (typeof value["inherited"] === "boolean" || value["inherited"] === null)
  && (typeof value["initialValue"] === "string" || value["initialValue"] === null)
  && isStringList(value["longhands"])
  && isStringList(value["resetLonghands"])
  && (value["legacyAliasOf"] === undefined || (typeof value["legacyAliasOf"] === "string" && MOTION_CSS_PROPERTY_NAME_PATTERN.test(value["legacyAliasOf"])))
  && isEffectivePropertyPolicy(value["policy"]);

/** Validates the complete Effective Property Registry including closed maps and property identity links. */
const isEffectivePropertyRegistry = (value: unknown): boolean => {
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "profile", "properties", "aliases", "authoringNames", "customProperties"]) || value["schemaVersion"] !== MOTION_SCHEMA_VERSION || !isProfile(value["profile"]) || !Array.isArray(value["properties"]) || value["properties"].length === 0 || !value["properties"].every(isEffectiveProperty) || !isRecord(value["aliases"]) || !isRecord(value["authoringNames"]) || !Array.isArray(value["customProperties"]) || !value["customProperties"].every((name) => typeof name === "string" && /^--[a-z0-9][a-z0-9-]*$/u.test(name)) || !hasUniqueStrings(value["customProperties"] as readonly string[])) return false;
  const names = value["properties"].map((property) => (property as UnknownRecord)["name"] as string);
  const authoringNames = value["properties"].map((property) => (property as UnknownRecord)["authoringName"] as string);
  return hasUniqueStrings(names) && hasUniqueStrings(authoringNames)
    && Object.entries(value["aliases"]).every(([alias, target]) => MOTION_CSS_PROPERTY_NAME_PATTERN.test(alias) && typeof target === "string" && names.includes(target))
    && Object.entries(value["authoringNames"]).every(([authoringName, target]) => /^[A-Za-z][A-Za-z0-9]*$/u.test(authoringName) && typeof target === "string" && names.includes(target));
};

/** Validates one closed Token reference used by Conditions, declarations, and transitions. */
const isTokenReference = (value: unknown): boolean =>
  isRecord(value) && hasExactKeys(value, ["kind", "path"]) && value["kind"] === "token" && typeof value["path"] === "string" && MOTION_TOKEN_ID_PATTERN.test(value["path"]);

/** Validates the closed resolved Token source location shape. */
const isSourceLocation = (value: unknown): boolean =>
  isRecord(value)
  && hasExactKeys(value, ["file", "pointer"], ["line", "column"])
  && typeof value["file"] === "string" && value["file"].length > 0
  && typeof value["pointer"] === "string" && /^(?:|\/.*)$/u.test(value["pointer"])
  && (value["line"] === undefined || (Number.isInteger(value["line"]) && (value["line"] as number) > 0))
  && (value["column"] === undefined || (Number.isInteger(value["column"]) && (value["column"] as number) > 0));

/** Validates all required fields of one resolved Token entry before it can receive a digest. */
const isResolvedTokenEntry = (value: unknown): boolean => {
  if (!isRecord(value) || !hasExactKeys(value, ["id", "domain", "tier", "dtcgType", "resolvedValue", "source", "dependencies"], ["description", "deprecated"])) return false;
  const dependencies = value["dependencies"];
  return typeof value["id"] === "string" && MOTION_TOKEN_ID_PATTERN.test(value["id"])
    && isIdentifier(value["domain"])
    && ["primitive", "semantic", "component"].includes(value["tier"] as string)
    && MOTION_DTCG_TYPES.includes(value["dtcgType"] as never)
    && value["resolvedValue"] !== undefined && !isTokenReference(value["resolvedValue"]) && !(typeof value["resolvedValue"] === "string" && /^\{[^}]+\}$/u.test(value["resolvedValue"]))
    && isSourceLocation(value["source"])
    && Array.isArray(dependencies) && dependencies.every((dependency) => typeof dependency === "string" && MOTION_TOKEN_ID_PATTERN.test(dependency))
    && hasUniqueStrings(dependencies as readonly string[])
    && (value["description"] === undefined || typeof value["description"] === "string")
    && (value["deprecated"] === undefined || typeof value["deprecated"] === "boolean" || typeof value["deprecated"] === "string");
};

/** Validates the complete two-context Resolved Token Manifest contract and immutable cross-context identity. */
const isResolvedManifest = (value: unknown): boolean => {
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "profileVersion", "sourceDigest", "contexts"])) return false;
  const contexts = value["contexts"];
  if (value["schemaVersion"] !== "0.2" || typeof value["profileVersion"] !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u.test(value["profileVersion"]) || typeof value["sourceDigest"] !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value["sourceDigest"]) || !Array.isArray(contexts) || contexts.length !== MOTION_RESOLVED_THEMES.length) return false;
  const identitiesByContext: Array<ReadonlyMap<string, string>> = [];
  const orderedIdsByContext: string[][] = [];
  for (const [index, context] of contexts.entries()) {
    if (!isRecord(context) || !hasExactKeys(context, ["context", "tokens"]) || !isRecord(context["context"]) || !hasExactKeys(context["context"], ["theme"]) || context["context"]["theme"] !== MOTION_RESOLVED_THEMES[index] || !Array.isArray(context["tokens"]) || context["tokens"].length === 0 || !context["tokens"].every(isResolvedTokenEntry)) return false;
    const entries = context["tokens"] as readonly UnknownRecord[];
    const ids = entries.map((entry) => entry["id"] as string);
    if (!hasUniqueStrings(ids) || !hasCanonicalIdentifierOrder(ids)) return false;
    if (entries.some((entry) => (entry["id"] as string).split(".")[0] !== entry["domain"] || (entry["dependencies"] as readonly string[]).some((dependency) => !ids.includes(dependency)))) return false;
    orderedIdsByContext.push(ids);
    identitiesByContext.push(new Map(entries.map((entry) => [entry["id"] as string, `${entry["domain"] as string}\u0000${entry["tier"] as string}\u0000${entry["dtcgType"] as string}`] as const)));
  }
  const [first, second] = identitiesByContext;
  const [firstOrder, secondOrder] = orderedIdsByContext;
  return first !== undefined && second !== undefined && firstOrder !== undefined && secondOrder !== undefined && first.size === second.size && firstOrder.length === secondOrder.length && firstOrder.every((id, index) => secondOrder[index] === id && second.get(id) === first.get(id));
};

/** Validates one optional Domain numeric constraint without accepting open forms. */
const isDomainConstraint = (value: unknown): boolean => {
  if (!isRecord(value) || typeof value["kind"] !== "string") return false;
  if (value["kind"] === "numberRange") return hasExactKeys(value, ["kind"], ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "integer"])
    && [value["minimum"], value["maximum"], value["exclusiveMinimum"], value["exclusiveMaximum"]].every((entry) => entry === undefined || (typeof entry === "number" && Number.isFinite(entry)))
    && (value["integer"] === undefined || typeof value["integer"] === "boolean");
  if (value["kind"] === "dimensionRange") return hasExactKeys(value, ["kind"], ["minimum", "exclusiveMinimum"])
    && [value["minimum"], value["exclusiveMinimum"]].every((entry) => entry === undefined || (typeof entry === "number" && Number.isFinite(entry)));
  return value["kind"] === "durationRange" && hasExactKeys(value, ["kind"], ["minimumMilliseconds"])
    && (value["minimumMilliseconds"] === undefined || (typeof value["minimumMilliseconds"] === "number" && Number.isFinite(value["minimumMilliseconds"]) && value["minimumMilliseconds"] >= 0));
};

/** Validates the Token Domain Registry including Domain uniqueness and serializer identity. */
const isTokenDomainRegistry = (value: unknown): boolean => {
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "domains"]) || value["schemaVersion"] !== "0.1" || !Array.isArray(value["domains"]) || value["domains"].length === 0) return false;
  const ids: string[] = [];
  for (const domain of value["domains"]) {
    if (!isRecord(domain) || !hasExactKeys(domain, ["id", "root", "allowedDTCGTypes", "cssSerializers"], ["constraints"]) || !isIdentifier(domain["id"]) || domain["id"] !== domain["root"] || !Array.isArray(domain["allowedDTCGTypes"]) || domain["allowedDTCGTypes"].length === 0 || !domain["allowedDTCGTypes"].every((type) => MOTION_DTCG_TYPES.includes(type as never)) || !hasUniqueStrings(domain["allowedDTCGTypes"] as readonly string[]) || !Array.isArray(domain["cssSerializers"]) || domain["cssSerializers"].length === 0 || !domain["cssSerializers"].every((id) => typeof id === "string" && MOTION_SERIALIZER_ID_PATTERN.test(id)) || !hasUniqueStrings(domain["cssSerializers"] as readonly string[]) || (domain["constraints"] !== undefined && (!Array.isArray(domain["constraints"]) || !domain["constraints"].every(isDomainConstraint)))) return false;
    ids.push(domain["id"] as string);
  }
  return hasUniqueStrings(ids) && hasCanonicalIdentifierOrder(ids) && value["domains"].every((domain) => {
    const allowed = (domain as UnknownRecord)["allowedDTCGTypes"] as readonly string[];
    const constraints = (domain as UnknownRecord)["constraints"] as readonly UnknownRecord[] | undefined;
    return constraints === undefined || constraints.every((constraint) => constraint["kind"] === "numberRange" ? allowed.includes("number") : constraint["kind"] === "dimensionRange" ? allowed.includes("dimension") : allowed.includes("duration"));
  });
};

/** Checks one State value against its closed registry definition. */
const isStateValue = (state: UnknownRecord, value: unknown): boolean =>
  state["valueType"] === "boolean" ? typeof value === "boolean"
    : typeof value === "string" && Array.isArray(state["values"]) && state["values"].includes(value);

/** Validates the Canonical State Registry including axis/value/consumer semantics. */
const isCanonicalStateRegistry = (value: unknown): boolean => {
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "states"]) || value["schemaVersion"] !== "0.2" || !Array.isArray(value["states"]) || value["states"].length === 0) return false;
  const ids: string[] = [];
  for (const state of value["states"]) {
    if (!isRecord(state) || !hasExactKeys(state, ["id", "axis", "valueType", "applicableComponents", "usage"], ["values"]) || !isIdentifier(state["id"]) || !MOTION_STATE_AXES.includes(state["axis"] as never) || (state["valueType"] !== "boolean" && state["valueType"] !== "enum") || !Array.isArray(state["applicableComponents"]) || state["applicableComponents"].length === 0 || !state["applicableComponents"].every(isIdentifier) || !hasUniqueStrings(state["applicableComponents"] as readonly string[]) || !Array.isArray(state["usage"]) || state["usage"].length === 0 || !state["usage"].every((usage) => MOTION_STATE_USAGES.includes(usage as never)) || !hasUniqueStrings(state["usage"] as readonly string[]) || !state["usage"].some((usage) => usage === "appearance" || usage === "motion")) return false;
    if (state["valueType"] === "enum" && (!Array.isArray(state["values"]) || state["values"].length < 2 || !state["values"].every(isIdentifier) || !hasUniqueStrings(state["values"] as readonly string[]))) return false;
    if (state["valueType"] === "boolean" && state["values"] !== undefined) return false;
    if (state["axis"] === "lifecycle" && state["valueType"] !== "boolean") return false;
    ids.push(state["id"] as string);
  }
  return hasUniqueStrings(ids) && hasCanonicalIdentifierOrder(ids);
};

/** Validates a registered Condition expression without compiling CSS. */
const isConditionExpression = (value: unknown, conditions: ReadonlySet<string>): boolean => {
  if (!isRecord(value) || !hasExactKeys(value, ["all"]) || !Array.isArray(value["all"]) || value["all"].length === 0 || value["all"].length > 12) return false;
  return value["all"].every((clause) => typeof clause === "string" ? conditions.has(clause) : isRecord(clause) && hasExactKeys(clause, ["any"]) && Array.isArray(clause["any"]) && clause["any"].length > 0 && clause["any"].length <= 8 && clause["any"].every((id) => typeof id === "string" && conditions.has(id)) && hasUniqueStrings(clause["any"] as readonly string[]))
    && new Set(value["all"].map((clause) => JSON.stringify(clause))).size === value["all"].length;
};

/** Validates the Condition Registry including container references and the mandatory reduced-motion identity. */
const isConditionRegistry = (value: unknown, manifest?: unknown): boolean => {
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "containers", "conditions"]) || value["schemaVersion"] !== "0.1" || !Array.isArray(value["containers"]) || value["containers"].length === 0 || !Array.isArray(value["conditions"]) || value["conditions"].length === 0) return false;
  const containerIds: string[] = [];
  for (const container of value["containers"]) {
    if (!isRecord(container) || !hasExactKeys(container, ["id", "cssName"]) || !isIdentifier(container["id"]) || typeof container["cssName"] !== "string" || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(container["cssName"])) return false;
    containerIds.push(container["id"] as string);
  }
  if (!hasUniqueStrings(containerIds) || !hasCanonicalIdentifierOrder(containerIds)) return false;
  const conditionIds: string[] = [];
  for (const condition of value["conditions"]) {
    if (!isRecord(condition) || typeof condition["kind"] !== "string") return false;
    if (condition["kind"] === "preference") {
      if (!hasExactKeys(condition, ["id", "kind", "feature", "equals"]) || condition["id"] !== "preference.reducedMotion" || condition["feature"] !== "prefers-reduced-motion" || condition["equals"] !== "reduce") return false;
    } else {
      const required = condition["kind"] === "container" ? ["id", "kind", "feature", "comparison", "value", "container"] : ["id", "kind", "feature", "comparison", "value"];
      const validKind = condition["kind"] === "container" || condition["kind"] === "viewport";
      const validContainer = condition["kind"] !== "container" || (String(condition["id"]).startsWith("container.inline.") && condition["feature"] === "inline-size" && containerIds.includes(condition["container"] as string));
      const validViewport = condition["kind"] !== "viewport" || (String(condition["id"]).startsWith("viewport.width.") && condition["feature"] === "width");
      if (!hasExactKeys(condition, required) || !isIdentifier(condition["id"]) || !validKind || !validContainer || !validViewport || (condition["comparison"] !== "<" && condition["comparison"] !== ">=") || !isTokenReference(condition["value"])) return false;
      if (manifest !== undefined) {
        const found = ((manifest as UnknownRecord)["contexts"] as readonly UnknownRecord[]).map((context) => ((context["tokens"] as readonly UnknownRecord[]).find((token) => token["id"] === (condition["value"] as UnknownRecord)["path"])));
        if (!String((condition["value"] as UnknownRecord)["path"]).startsWith("breakpoint.") || found.some((token) => token === undefined || token["domain"] !== "breakpoint" || token["dtcgType"] !== "dimension")) return false;
      }
    }
    conditionIds.push(condition["id"] as string);
  }
  return hasUniqueStrings(conditionIds) && hasCanonicalIdentifierOrder(conditionIds) && conditionIds.includes("preference.reducedMotion");
};

/** Validates a declaration value's closed CSS literal, direct Token, or Token-bearing template form. */
const isDeclarationValue = (value: unknown): boolean => {
  if (isTokenReference(value)) return true;
  if (!isRecord(value) || typeof value["kind"] !== "string") return false;
  if (value["kind"] === "css") return hasExactKeys(value, ["kind", "value"]) && typeof value["value"] === "string" && /\S/u.test(value["value"]);
  return value["kind"] === "css-template" && hasExactKeys(value, ["kind", "parts"]) && Array.isArray(value["parts"]) && value["parts"].length > 0 && value["parts"].every((part) => typeof part === "string" || isTokenReference(part)) && value["parts"].some(isTokenReference);
};

/** Validates one N15 declaration origin against its containing Appearance slot and stage. */
const isOrigin = (value: unknown, recipeId: string, slots: readonly string[], expectedSlot: string, expectedStage: string): boolean =>
  isRecord(value) && hasExactKeys(value, ["recipeId", "slot", "source", "stage"])
  && value["recipeId"] === recipeId && value["slot"] === expectedSlot && slots.includes(expectedSlot)
  && typeof value["source"] === "string" && /\S/u.test(value["source"])
  && value["stage"] === expectedStage && MOTION_DECLARATION_STAGES.includes(expectedStage as never);

/** Validates ordered declaration lists without inferring property or origin defaults. */
const isDeclarationList = (value: unknown, recipeId: string, slots: readonly string[], expectedSlot: string, expectedStage: string): boolean =>
  Array.isArray(value) && value.every((declaration) => isRecord(declaration) && hasExactKeys(declaration, ["property", "value", "important", "origin"]) && typeof declaration["property"] === "string" && MOTION_CSS_PROPERTY_NAME_PATTERN.test(declaration["property"]) && declaration["important"] === false && isDeclarationValue(declaration["value"]) && isOrigin(declaration["origin"], recipeId, slots, expectedSlot, expectedStage));

/** Validates one slot declaration record against declared Appearance slots. */
const isSlotRecord = (value: unknown, recipeId: string, slots: readonly string[], expectedStage: string): boolean =>
  isRecord(value) && hasExactKeys(value, ["slot", "declarations"]) && typeof value["slot"] === "string" && slots.includes(value["slot"]) && isDeclarationList(value["declarations"], recipeId, slots, value["slot"], expectedStage);

/** Rejects duplicate slots within one N15 Appearance declaration stage. */
const hasUniqueSlotRecords = (value: readonly unknown[]): boolean => {
  const slots = value.map((record) => isRecord(record) ? record["slot"] : undefined);
  return slots.every((slot): slot is string => typeof slot === "string") && hasUniqueStrings(slots as readonly string[]);
};

/** Checks whether a Canonical State may govern the detached Appearance Recipe or exact Slot target. */
const isAppearanceApplicableState = (state: UnknownRecord | undefined, recipeId: string, slot: string): boolean =>
  state !== undefined
  && Array.isArray(state["usage"])
  && state["usage"].includes("appearance")
  && Array.isArray(state["applicableComponents"])
  && (state["applicableComponents"].includes(recipeId) || state["applicableComponents"].includes(`${recipeId}.${slot}`));

/** Validates Variant and State selection maps against their declared Appearance axes. */
const isSelection = (value: unknown, variants: ReadonlyMap<string, ReadonlySet<string>>, states: ReadonlyMap<string, UnknownRecord>, slots: readonly string[], recipeId: string, kind: "variants" | "states"): boolean => {
  if (!isRecord(value) || Object.keys(value).length === 0) return false;
  return Object.entries(value).every(([name, selection]) => isIdentifier(name) && (kind === "variants"
    ? variants.has(name) && (typeof selection === "string" ? variants.get(name)?.has(selection) === true : Array.isArray(selection) && selection.length > 0 && selection.every((entry) => typeof entry === "string" && variants.get(name)?.has(entry) === true) && hasUniqueStrings(selection as readonly string[]))
    : isRecord(selection) && Object.keys(selection).length > 0 && Object.entries(selection).every(([stateName, stateValue]) => slots.includes(name) && isAppearanceApplicableState(states.get(stateName), recipeId, name) && isStateValue(states.get(stateName)!, stateValue))));
};

/** Validates the full closed N15 Appearance shape and its State/Condition/slot semantics before digest comparison. */
export const isClosedAppearanceAuthority = (
  value: unknown,
  canonicalStates: unknown,
  conditionRegistry: unknown,
): boolean => {
  if (!isCanonicalStateRegistry(canonicalStates) || !isConditionRegistry(conditionRegistry) || !isRecord(value) || !hasExactKeys(value, ["schemaVersion", "profile", "profileInputDigest", "recipeId", "slots", "base", "variantAxes", "stateRules", "compoundRules", "conditionRules"]) || value["schemaVersion"] !== MOTION_SCHEMA_VERSION || value["profile"] !== MOTION_PROFILE_ID || typeof value["profileInputDigest"] !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value["profileInputDigest"]) || !isIdentifier(value["recipeId"]) || !Array.isArray(value["slots"]) || value["slots"].length === 0 || value["slots"].length > 64 || !value["slots"].every(isIdentifier) || !hasUniqueStrings(value["slots"] as readonly string[])) return false;
  const slots = value["slots"] as readonly string[];
  const recipeId = value["recipeId"] as string;
  const stateMap = new Map(
    ((canonicalStates as UnknownRecord)["states"] as readonly UnknownRecord[])
      .map((state) => [state["id"] as string, state] as const),
  );
  const conditionIds = new Set(((conditionRegistry as UnknownRecord)["conditions"] as readonly UnknownRecord[]).map((condition) => condition["id"] as string));
  const base = value["base"];
  if (!Array.isArray(base) || base.length > 64 || !hasUniqueSlotRecords(base) || !base.every((entry) => isSlotRecord(entry, recipeId, slots, "base"))) return false;
  const axes = value["variantAxes"];
  if (!Array.isArray(axes) || axes.length > 32) return false;
  const variants = new Map<string, ReadonlySet<string>>();
  for (const axis of axes) {
    if (!isRecord(axis) || !hasExactKeys(axis, ["name", "values"], ["defaultValue"]) || !isIdentifier(axis["name"]) || !Array.isArray(axis["values"]) || axis["values"].length === 0 || axis["values"].length > 64 || variants.has(axis["name"])) return false;
    const values = axis["values"];
    const names: string[] = [];
    for (const variant of values) {
      if (!isRecord(variant) || !hasExactKeys(variant, ["value", "apply"]) || !isIdentifier(variant["value"]) || !Array.isArray(variant["apply"]) || variant["apply"].length > 64 || !variant["apply"].every((entry) => isSlotRecord(entry, recipeId, slots, "variant"))) return false;
      names.push(variant["value"] as string);
    }
    if (!hasUniqueStrings(names) || (axis["defaultValue"] !== undefined && (!isIdentifier(axis["defaultValue"]) || !names.includes(axis["defaultValue"] as string)))) return false;
    variants.set(axis["name"] as string, new Set(names));
  }
  const stateRules = value["stateRules"];
  if (!Array.isArray(stateRules) || stateRules.length > 256) return false;
  for (const rule of stateRules) {
    if (!isRecord(rule) || !hasExactKeys(rule, ["slot", "state", "cases"]) || typeof rule["slot"] !== "string" || !slots.includes(rule["slot"]) || typeof rule["state"] !== "string" || !stateMap.has(rule["state"]) || !Array.isArray(rule["cases"]) || rule["cases"].length === 0 || rule["cases"].length > 16) return false;
    const state = stateMap.get(rule["state"] as string)!;
    if (!isAppearanceApplicableState(state, recipeId, rule["slot"] as string) || !rule["cases"].every((stateCase) => isRecord(stateCase) && hasExactKeys(stateCase, ["equals", "apply"]) && isStateValue(state, stateCase["equals"]) && isDeclarationList(stateCase["apply"], recipeId, slots, rule["slot"] as string, "state"))) return false;
  }
  const compoundRules = value["compoundRules"];
  if (!Array.isArray(compoundRules) || compoundRules.length > 256 || !compoundRules.every((rule) => isRecord(rule) && hasExactKeys(rule, ["when", "apply"]) && isRecord(rule["when"]) && hasExactKeys(rule["when"], [], ["variants", "states"]) && Object.keys(rule["when"]).length > 0 && (rule["when"]["variants"] === undefined || isSelection(rule["when"]["variants"], variants, stateMap, slots, recipeId, "variants")) && (rule["when"]["states"] === undefined || isSelection(rule["when"]["states"], variants, stateMap, slots, recipeId, "states")) && Array.isArray(rule["apply"]) && rule["apply"].length > 0 && rule["apply"].length <= 64 && rule["apply"].every((entry) => isSlotRecord(entry, recipeId, slots, "compound")))) return false;
  const conditionRules = value["conditionRules"];
  return Array.isArray(conditionRules) && conditionRules.length <= 256 && conditionRules.every((rule) => isRecord(rule) && hasExactKeys(rule, ["when", "apply"], ["variants", "states"]) && isConditionExpression(rule["when"], conditionIds) && (rule["variants"] === undefined || isSelection(rule["variants"], variants, stateMap, slots, recipeId, "variants")) && (rule["states"] === undefined || isSelection(rule["states"], variants, stateMap, slots, recipeId, "states")) && Array.isArray(rule["apply"]) && rule["apply"].length > 0 && rule["apply"].length <= 64 && rule["apply"].every((entry) => isSlotRecord(entry, recipeId, slots, "condition")));
};

/** Validates every required N23 registry and N22 artifact structurally and semantically before digest comparison. */
export const hasValidMotionAuthorityShapes = (input: MotionAuthoringInput): boolean =>
  isEffectivePropertyRegistry(input.propertyRegistry)
  && isResolvedManifest(input.resolvedTokenManifest)
  && isTokenDomainRegistry(input.tokenDomainRegistry)
  && isCanonicalStateRegistry(input.canonicalStateRegistry)
  && isConditionRegistry(input.conditionRegistry, input.resolvedTokenManifest)
  && isClosedAppearanceAuthority(input.appearance, input.canonicalStateRegistry, input.conditionRegistry)
  && input.resolvedTokenManifest.contexts.every((context) => context.tokens.every((entry) => input.tokenDomainRegistry.domains.some((domain) => domain.id === entry.domain && domain.allowedDTCGTypes.includes(entry.dtcgType))));
