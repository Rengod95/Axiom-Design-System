import {
  analyzeConditionPair,
  type ConditionExpression,
  type ConditionRegistry,
  type ConditionThresholds,
} from "@axiom/condition-registry";

import {
  SPEC_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
} from "../constants.js";
import type {
  Diagnostic,
  SemanticValidationContext,
} from "../types.js";
import {
  isUnknownRecord,
  type UnknownRecord,
} from "../validation/unknown-record.js";
import { createSemanticDiagnosticFactory } from "./semantic-diagnostic.js";

const collisionDiagnostic = createSemanticDiagnosticFactory("normalization");

const stageOrder = new Map([
  ["base", 0],
  ["variant", 1],
  ["state", 2],
  ["compound", 3],
  ["condition", 4],
]);

const propertyEntries = (
  context: SemanticValidationContext | undefined,
): ReadonlyMap<string, UnknownRecord> => {
  const registry = context?.registries["css-effective-property-registry"];
  if (!isUnknownRecord(registry) || !Array.isArray(registry["properties"])) return new Map();
  return new Map(registry["properties"].filter(isUnknownRecord).flatMap((property) =>
    typeof property["name"] === "string" ? [[property["name"], property]] : []));
};

/** Verifies that the trace root names the exact pinned CSS profile authority. */
const validateProfileIdentity = (
  value: UnknownRecord,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  const profile = context?.registries["css-profile-input"];
  if (!isUnknownRecord(profile)) return [];
  if (value["profile"] === profile["id"] && value["profileInputDigest"] === profile["webrefInputDigest"]) return [];
  return [collisionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.APPEARANCE_PROFILE_MISMATCH,
    "Collision trace profile identity must match the pinned CSS profile input.",
    "/profileInputDigest",
  )];
};

const conditionThresholds = (
  context: SemanticValidationContext | undefined,
): ConditionThresholds => {
  const manifest = context?.registries["foundation-resolved-token-manifest"];
  if (!isUnknownRecord(manifest) || !Array.isArray(manifest["contexts"])) return {};
  const firstContext = manifest["contexts"].find(isUnknownRecord);
  if (firstContext === undefined || !Array.isArray(firstContext["tokens"])) return {};
  return Object.fromEntries(firstContext["tokens"].filter(isUnknownRecord).flatMap((token) => {
    const resolved = token["resolvedValue"];
    const value = typeof resolved === "number"
      ? resolved
      : isUnknownRecord(resolved) && typeof resolved["value"] === "number"
        ? resolved["value"]
        : undefined;
    return typeof token["id"] === "string" && value !== undefined ? [[token["id"], value]] : [];
  }));
};

const arraysEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const stringArray = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const isStrictlySorted = (values: readonly string[]): boolean =>
  values.every((value, index) => index === 0 || values[index - 1]!.localeCompare(value, STABLE_SORT_LOCALE) < 0);

const validateApplicabilityOrder = (
  evidence: UnknownRecord,
  pointer: string,
): readonly Diagnostic[] => {
  const applicability = evidence["applicability"];
  if (!isUnknownRecord(applicability)) return [];
  const variants = Array.isArray(applicability["variants"])
    ? applicability["variants"].filter(isUnknownRecord)
    : [];
  const states = Array.isArray(applicability["states"])
    ? applicability["states"].filter(isUnknownRecord)
    : [];
  const axes = variants.flatMap((variant) => typeof variant["axis"] === "string" ? [variant["axis"]] : []);
  const stateKeys = states.flatMap((state) =>
    typeof state["slot"] === "string" && typeof state["state"] === "string"
      ? [`${state["slot"]}\u0000${state["state"]}`]
      : []);
  const invalidValues = variants.some((variant) => !isStrictlySorted(stringArray(variant["values"])));
  if (isStrictlySorted(axes) && isStrictlySorted(stateKeys) && !invalidValues) return [];
  return [collisionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_APPLICABILITY_ORDER,
    "Collision applicability evidence must be unique and serialized in lexical axis, value, slot, and State order.",
    `${pointer}/applicability`,
  )];
};

const validateApplicabilityEvidence = (
  evidence: UnknownRecord,
  pointer: string,
): readonly Diagnostic[] => {
  const applicability = evidence["applicability"];
  const declarationOrigin = origin(evidence);
  if (!isUnknownRecord(applicability) || declarationOrigin === undefined) return [];
  const variants = Array.isArray(applicability["variants"])
    ? applicability["variants"].filter(isUnknownRecord)
    : [];
  const states = Array.isArray(applicability["states"])
    ? applicability["states"].filter(isUnknownRecord)
    : [];
  const condition = applicability["condition"];
  const source = typeof declarationOrigin["source"] === "string" ? declarationOrigin["source"] : "";
  const stage = declarationOrigin["stage"];
  let valid = false;
  if (stage === "base") valid = source.includes("#/base/") && variants.length === 0 && states.length === 0 && condition === undefined;
  if (stage === "variant") {
    const match = /#\/variants\/([^/]+)\/([^/]+)\//u.exec(source);
    valid = match !== null && variants.length === 1 && states.length === 0 && condition === undefined
      && variants[0]?.["axis"] === match[1]
      && arraysEqual(variants[0]?.["values"], [match[2]]);
  }
  if (stage === "state") valid = source.includes("#/states/") && variants.length === 0 && states.length === 1 && condition === undefined
    && states[0]?.["slot"] === declarationOrigin["slot"];
  if (stage === "compound") valid = source.includes("#/compoundVariants/") && variants.length + states.length > 0 && condition === undefined;
  if (stage === "condition") valid = source.includes("#/conditions/") && isUnknownRecord(condition);
  return valid ? [] : [collisionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_APPLICABILITY_ORDER,
    "Collision applicability evidence must agree with the declaration stage and structural origin.",
    `${pointer}/applicability`,
  )];
};

const declarationProperty = (evidence: UnknownRecord): string | undefined =>
  typeof evidence["property"] === "string" ? evidence["property"] : undefined;

const origin = (evidence: UnknownRecord): UnknownRecord | undefined =>
  isUnknownRecord(evidence["origin"]) ? evidence["origin"] : undefined;

const affectedBy = (
  property: UnknownRecord | undefined,
  kind: "longhands" | "resetLonghands",
  candidate: string,
): boolean => stringArray(property?.[kind]).includes(candidate);

const validateRelation = (
  entry: UnknownRecord,
  earlier: UnknownRecord,
  later: UnknownRecord,
  properties: ReadonlyMap<string, UnknownRecord>,
  pointer: string,
): readonly Diagnostic[] => {
  const earlierName = declarationProperty(earlier);
  const laterName = declarationProperty(later);
  const affected = entry["affectedProperty"];
  const relation = entry["relation"];
  const earlierOrigin = origin(earlier);
  const laterOrigin = origin(later);
  let valid = earlierOrigin?.["slot"] === laterOrigin?.["slot"] && entry["winner"] === "later";
  if (typeof earlierName === "string" && typeof laterName === "string" && typeof affected === "string") {
    if (relation === "same-property" || relation === "condition-overlap") {
      valid &&= earlierName === laterName && affected === earlierName;
    } else if (relation === "shorthand-longhand") {
      valid &&= (affected === laterName && affectedBy(properties.get(earlierName), "longhands", laterName))
        || (affected === earlierName && affectedBy(properties.get(laterName), "longhands", earlierName));
    } else if (relation === "reset-longhand") {
      valid &&= affected === earlierName && affectedBy(properties.get(laterName), "resetLonghands", earlierName);
    } else {
      valid = false;
    }
  } else {
    valid = false;
  }
  return valid ? [] : [collisionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_RELATION_EVIDENCE,
    "Collision relation and affected property must be proven by the two effective declaration properties.",
    pointer,
  )];
};

const validateConditionRelation = (
  entry: UnknownRecord,
  earlier: UnknownRecord,
  later: UnknownRecord,
  context: SemanticValidationContext | undefined,
  pointer: string,
): readonly Diagnostic[] => {
  if (entry["relation"] !== "condition-overlap") return [];
  const left = isUnknownRecord(earlier["applicability"])
    ? earlier["applicability"]["condition"]
    : undefined;
  const right = isUnknownRecord(later["applicability"])
    ? later["applicability"]["condition"]
    : undefined;
  const registry = context?.registries["condition-registry"];
  if (!isUnknownRecord(left) || !isUnknownRecord(right) || !isUnknownRecord(registry)) return [collisionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_RELATION_EVIDENCE,
    "Condition-overlap trace entries require both Condition expressions and the authoritative Condition registry.",
    pointer,
  )];
  const analysis = analyzeConditionPair(
    left as ConditionExpression,
    right as ConditionExpression,
    registry as ConditionRegistry,
    conditionThresholds(context),
  );
  return analysis.relation !== "disjoint" && entry["conditionRelation"] === analysis.relation ? [] : [collisionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_RELATION_EVIDENCE,
    "Condition relation evidence must equal the relation computed from the authoritative Condition model.",
    `${pointer}/conditionRelation`,
  )];
};

/** Validates collision-trace identity, provenance, relation evidence, and structural applicability consistency against authoritative registries. */
export const validateCollisionTrace = (
  value: unknown,
  context?: SemanticValidationContext,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value) || typeof value["recipeId"] !== "string" || !Array.isArray(value["entries"])) return [];
  const diagnostics: Diagnostic[] = [...validateProfileIdentity(value, context)];
  const properties = propertyEntries(context);
  value["entries"].forEach((candidate, index) => {
    if (!isUnknownRecord(candidate)) return;
    const pointer = `/entries/${index}`;
    const expectedId = `collision-${String(index + 1).padStart(4, "0")}`;
    if (candidate["id"] !== expectedId) diagnostics.push(collisionDiagnostic(
      SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_ID_ORDER,
      `Collision trace id must be '${expectedId}' at this source-order position.`,
      `${pointer}/id`,
    ));
    const earlier = candidate["earlier"];
    const later = candidate["later"];
    if (!isUnknownRecord(earlier) || !isUnknownRecord(later)) return;
    const earlierOrigin = origin(earlier);
    const laterOrigin = origin(later);
    if (earlierOrigin?.["recipeId"] !== value["recipeId"] || laterOrigin?.["recipeId"] !== value["recipeId"]) diagnostics.push(collisionDiagnostic(
      SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_RECIPE_ID,
      "Both declaration origins must identify the trace recipe.",
      pointer,
    ));
    const earlierStage = stageOrder.get(String(earlierOrigin?.["stage"]));
    const laterStage = stageOrder.get(String(laterOrigin?.["stage"]));
    if (earlierStage !== undefined && laterStage !== undefined && earlierStage > laterStage) diagnostics.push(collisionDiagnostic(
      SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_RELATION_EVIDENCE,
      "Earlier and later declaration evidence must follow Kernel stage order.",
      pointer,
    ));
    for (const [side, evidence] of [["earlier", earlier], ["later", later]] as const) {
      const propertyName = declarationProperty(evidence);
      const property = propertyName === undefined ? undefined : properties.get(propertyName);
      if (property === undefined) diagnostics.push(collisionDiagnostic(
        SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_PROPERTY_EVIDENCE,
        `Collision declaration property '${propertyName ?? ""}' is absent from the effective property registry.`,
        `${pointer}/${side}/property`,
      ));
      else if (!isUnknownRecord(property["policy"]) || !arraysEqual(evidence["policyProvenance"], property["policy"]["provenance"])) diagnostics.push(collisionDiagnostic(
        SPEC_DIAGNOSTIC_CODE.COLLISION_TRACE_POLICY_PROVENANCE,
        `Collision declaration policy provenance for '${propertyName}' is stale or forged.`,
        `${pointer}/${side}/policyProvenance`,
      ));
      diagnostics.push(...validateApplicabilityOrder(evidence, `${pointer}/${side}`));
      diagnostics.push(...validateApplicabilityEvidence(evidence, `${pointer}/${side}`));
    }
    diagnostics.push(...validateRelation(candidate, earlier, later, properties, pointer));
    diagnostics.push(...validateConditionRelation(candidate, earlier, later, context, pointer));
  });
  return diagnostics;
};
