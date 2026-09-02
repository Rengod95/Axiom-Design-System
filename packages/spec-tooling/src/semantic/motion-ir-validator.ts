import {
  CSSGrammarValidator,
  validateTokenBinding,
  type EffectiveCSSPropertyRegistry,
} from "@axiom/css-property-profile";

import {
  ERROR_DIAGNOSTIC_SEVERITY,
  FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID,
  IN_MEMORY_SOURCE_NAME,
  MOTION_DIAGNOSTIC_PHASE,
  SPEC_DIAGNOSTIC_CODE,
  WARNING_DIAGNOSTIC_SEVERITY,
} from "../constants.js";
import { canonicalJsonDigest } from "../canonical-json.js";
import type { Diagnostic, SemanticValidationContext } from "../types.js";
import {
  isUnknownRecord,
  type UnknownRecord,
} from "../validation/unknown-record.js";
import { createSemanticDiagnosticFactory } from "./semantic-diagnostic.js";

/** Creates stable error diagnostics for Motion IR semantic violations. */
const motionDiagnostic = createSemanticDiagnosticFactory(MOTION_DIAGNOSTIC_PHASE);

interface MotionStateDefinition {
  readonly axis: "lifecycle" | "state";
  readonly valueType: "boolean" | "enum";
  readonly values: ReadonlySet<string>;
}

interface MotionProfileValidation {
  readonly registry: EffectiveCSSPropertyRegistry;
  readonly grammar: CSSGrammarValidator;
}

/** Returns a stable warning without making a schema-valid conformance fixture fail. */
const motionWarning = (
  code: string,
  message: string,
  pointer: string,
): Diagnostic => ({
  code,
  severity: WARNING_DIAGNOSTIC_SEVERITY,
  phase: MOTION_DIAGNOSTIC_PHASE,
  message,
  location: { file: IN_MEMORY_SOURCE_NAME, pointer },
});

/** Collects Motion-authorized state cardinality without inferring component ownership from a Recipe id. */
const motionStates = (
  context: SemanticValidationContext | undefined,
): ReadonlyMap<string, MotionStateDefinition> => {
  const registry = context?.registries["canonical-state-registry"];
  if (!isUnknownRecord(registry) || !Array.isArray(registry["states"])) return new Map();
  return new Map(registry["states"]
    .filter(isUnknownRecord)
    .filter((state) => Array.isArray(state["usage"]) && state["usage"].includes("motion"))
    .filter((state): state is UnknownRecord & { readonly id: string } => typeof state["id"] === "string")
    .map((state) => [state.id, {
      axis: state["axis"] === "lifecycle" ? "lifecycle" : "state",
      valueType: state["valueType"] === "enum" ? "enum" : "boolean",
      values: new Set(Array.isArray(state["values"])
        ? state["values"].filter((value): value is string => typeof value === "string")
        : []),
    }]));
};

/** Returns the validated effective profile only when every public validator input is present. */
const motionProfileValidation = (
  context: SemanticValidationContext | undefined,
): MotionProfileValidation | undefined => {
  const registry = context?.registries["css-effective-property-registry"];
  if (
    !isUnknownRecord(registry) ||
    !Array.isArray(registry["properties"]) ||
    !isUnknownRecord(registry["aliases"]) ||
    !isUnknownRecord(registry["authoringNames"]) ||
    !Array.isArray(registry["customProperties"]) ||
    !isUnknownRecord(registry["profile"])
  ) return undefined;
  const profile = registry as unknown as EffectiveCSSPropertyRegistry;
  return {
    registry: profile,
    grammar: new CSSGrammarValidator(profile, {
      allowCustomPropertyReferences: true,
    }),
  };
};

/** Reads CSS motion policy, preserving minimal test contexts when full public profile validation is unavailable. */
const motionPolicyForProperty = (
  property: string,
  profile: MotionProfileValidation | undefined,
  context: SemanticValidationContext | undefined,
): string | undefined => {
  const profilePolicy = profile?.registry.properties.find((entry) => entry.name === property)?.policy.motion;
  if (profilePolicy !== undefined) return profilePolicy;
  const registry = context?.registries["css-effective-property-registry"];
  if (!isUnknownRecord(registry) || !Array.isArray(registry["properties"])) return undefined;
  const entry = registry["properties"].find(
    (candidate) => isUnknownRecord(candidate) && candidate["name"] === property,
  );
  return isUnknownRecord(entry) && isUnknownRecord(entry["policy"]) && typeof entry["policy"]["motion"] === "string"
    ? entry["policy"]["motion"]
    : undefined;
};

/** Returns a Token's Domain only when its identity is present in every resolved context. */
const resolvedTokenDomain = (
  path: string,
  context: SemanticValidationContext | undefined,
): string | undefined => {
  const manifest = context?.registries[FOUNDATION_RESOLVED_TOKEN_MANIFEST_ID];
  if (!isUnknownRecord(manifest) || !Array.isArray(manifest["contexts"]) || manifest["contexts"].length === 0) {
    return undefined;
  }
  const domains = manifest["contexts"].map((entry) => {
    if (!isUnknownRecord(entry) || !Array.isArray(entry["tokens"])) return undefined;
    const token = entry["tokens"].find(
      (candidate) => isUnknownRecord(candidate) && candidate["id"] === path,
    );
    return isUnknownRecord(token) && typeof token["domain"] === "string"
      ? token["domain"]
      : undefined;
  });
  const domain = domains[0];
  return domain !== undefined && domains.every((candidate) => candidate === domain)
    ? domain
    : undefined;
};

/** Validates timing Token Domains while leaving track value binding integration to N21. */
const validateTimingToken = (
  value: unknown,
  expectedDomain: "duration" | "easing",
  pointer: string,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value) || typeof value["path"] !== "string") return [];
  if (resolvedTokenDomain(value["path"], context) === expectedDomain) return [];
  return [motionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.MOTION_TOKEN_DOMAIN_MISMATCH,
    `Motion timing Token '${value["path"]}' must resolve in every context in the ${expectedDomain} Domain.`,
    pointer,
  )];
};

/** Ensures normalized keyframes retain the explicit, monotonic endpoints required by backends. */
const validateKeyframes = (
  value: unknown,
  pointer: string,
): readonly Diagnostic[] => {
  if (!Array.isArray(value)) return [];
  const offsets = value
    .filter(isUnknownRecord)
    .map((keyframe) => keyframe["offset"])
    .filter((offset): offset is number => typeof offset === "number");
  const hasEndpoints = offsets[0] === 0 && offsets[ offsets.length - 1] === 1;
  const isStrictlyAscending = offsets.every((offset, index) => index === 0 || offset > (offsets[index - 1] ?? offset));
  if (hasEndpoints && isStrictlyAscending) return [];
  return [motionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.INVALID_MOTION_KEYFRAME_OFFSET,
    "Motion keyframe offsets must be strictly ascending and preserve normalized 0 and 1 endpoints.",
    pointer,
  )];
};

/** Reports a value kind that the effective property policy has not explicitly enabled. */
const validateValueKind = (
  property: string,
  kind: "css" | "token" | "css-template",
  pointer: string,
  profile: MotionProfileValidation | undefined,
): readonly Diagnostic[] => {
  const propertyEntry = profile?.registry.properties.find((entry) => entry.name === property);
  if (propertyEntry === undefined || propertyEntry.policy.valueKinds.includes(kind)) return [];
  return [motionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.MOTION_KEYFRAME_VALUE_KIND_INVALID,
    `Motion property '${property}' does not permit '${kind}' keyframe values.`,
    pointer,
  )];
};

/** Maps CSS-profile grammar failures to the Motion diagnostic namespace without copying parser behavior. */
const validateCssLiteral = (
  property: string,
  value: string,
  pointer: string,
  profile: MotionProfileValidation | undefined,
): readonly Diagnostic[] => {
  if (profile === undefined || profile.grammar.validate(property, value).valid) return [];
  return [motionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.MOTION_KEYFRAME_GRAMMAR_MISMATCH,
    `Motion keyframe value does not match the '${property}' CSS grammar.`,
    pointer,
  )];
};

/** Validates one resolved Token segment against the effective property's direct or template binding policy. */
const validateKeyframeToken = (
  property: string,
  value: UnknownRecord,
  mode: "direct" | "template",
  pointer: string,
  profile: MotionProfileValidation | undefined,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (typeof value["path"] !== "string") return [];
  const domain = resolvedTokenDomain(value["path"], context);
  const bindingInput = {
    property,
    mode,
    ...(domain === undefined ? {} : { domain }),
  };
  if (profile === undefined || validateTokenBinding(profile.registry, bindingInput).length === 0) return [];
  return [motionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.MOTION_KEYFRAME_TOKEN_BINDING_INVALID,
    `Motion Token '${value["path"]}' is not permitted for '${property}' in ${mode} mode.`,
    pointer,
  )];
};

/** Serializes template Token references to a neutral CSS variable solely for grammar validation. */
const motionTemplateGrammarValue = (parts: readonly unknown[]): string =>
  parts.map((part) => isUnknownRecord(part) && part["kind"] === "token"
    ? "var(--axiom-motion-token)"
    : typeof part === "string" ? part : "").join("");

/** Validates the value algebra and CSS-profile policy for one normalized Motion keyframe. */
const validateKeyframeValue = (
  property: string,
  value: unknown,
  pointer: string,
  profile: MotionProfileValidation | undefined,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value) || typeof value["kind"] !== "string") return [];
  const kind = value["kind"];
  if (kind === "css") {
    if (typeof value["value"] !== "string") return [];
    return [
      ...validateValueKind(property, "css", pointer, profile),
      ...validateCssLiteral(property, value["value"], pointer, profile),
    ];
  }
  if (kind === "token") return [
    ...validateValueKind(property, "token", pointer, profile),
    ...validateKeyframeToken(property, value, "direct", pointer, profile, context),
  ];
  if (kind !== "css-template" || !Array.isArray(value["parts"])) return [];
  const diagnostics = [
    ...validateValueKind(property, "css-template", pointer, profile),
    ...validateCssLiteral(property, motionTemplateGrammarValue(value["parts"]), pointer, profile),
  ];
  value["parts"].forEach((part, index) => {
    if (isUnknownRecord(part) && part["kind"] === "token") {
      diagnostics.push(...validateKeyframeToken(property, part, "template", `${pointer}/parts/${index}`, profile, context));
    }
  });
  return diagnostics;
};

/** Applies CSS motion capability policy to every property track. */
const validateTrack = (
  value: unknown,
  pointer: string,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value) || typeof value["property"] !== "string") return [];
  const property = value["property"];
  const diagnostics: Diagnostic[] = [];
  const profile = motionProfileValidation(context);
  const policy = motionPolicyForProperty(property, profile, context);
  if (policy === undefined) {
    diagnostics.push(motionDiagnostic(
      SPEC_DIAGNOSTIC_CODE.UNKNOWN_MOTION_PROPERTY,
      `Motion property '${property}' is absent from the effective CSS Property Registry.`,
      `${pointer}/property`,
    ));
  } else if (policy === "not-animatable") {
    diagnostics.push(motionDiagnostic(
      SPEC_DIAGNOSTIC_CODE.MOTION_PROPERTY_NOT_ANIMATABLE,
      `Motion property '${property}' is not animatable in the CSS profile.`,
      `${pointer}/property`,
    ));
  } else if (policy === "discrete" && value["allowDiscrete"] !== true) {
    diagnostics.push(motionDiagnostic(
      SPEC_DIAGNOSTIC_CODE.DISCRETE_MOTION_OPT_IN_REQUIRED,
      `Discrete Motion property '${property}' requires allowDiscrete: true.`,
      `${pointer}/allowDiscrete`,
    ));
  } else if (policy === "discrete") {
    diagnostics.push(motionWarning(
      SPEC_DIAGNOSTIC_CODE.DISCRETE_MOTION_OPT_IN_ACCEPTED,
      `Discrete Motion property '${property}' is enabled by explicit allowDiscrete: true opt-in.`,
      `${pointer}/allowDiscrete`,
    ));
  } else if (policy === "unknown") {
    diagnostics.push(motionWarning(
      SPEC_DIAGNOSTIC_CODE.UNKNOWN_MOTION_PROPERTY_CAPABILITY,
      `Motion property '${property}' requires backend capability validation.`,
      `${pointer}/property`,
    ));
  }
  diagnostics.push(...validateKeyframes(value["keyframes"], `${pointer}/keyframes`));
  if (Array.isArray(value["keyframes"])) value["keyframes"].forEach((keyframe, index) => {
    if (!isUnknownRecord(keyframe)) return;
    diagnostics.push(...validateKeyframeValue(
      property,
      keyframe["value"],
      `${pointer}/keyframes/${index}/value`,
      profile,
      context,
    ));
  });
  return diagnostics;
};

/** Validates a segment's ordered tracks and transition-owned timing Tokens. */
const validateSegment = (
  value: unknown,
  pointer: string,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value)) return [];
  const diagnostics: Diagnostic[] = [];
  if (Array.isArray(value["tracks"])) value["tracks"].forEach((track, index) => {
    diagnostics.push(...validateTrack(track, `${pointer}/tracks/${index}`, context));
  });
  const transition = value["transition"];
  if (!isUnknownRecord(transition)) return diagnostics;
  if (transition["type"] === "tween") {
    diagnostics.push(...validateTimingToken(transition["duration"], "duration", `${pointer}/transition/duration`, context));
    diagnostics.push(...validateTimingToken(transition["delay"], "duration", `${pointer}/transition/delay`, context));
    diagnostics.push(...validateTimingToken(transition["easing"], "easing", `${pointer}/transition/easing`, context));
  } else if (transition["type"] === "spring" && transition["duration"] !== undefined) {
    diagnostics.push(...validateTimingToken(transition["duration"], "duration", `${pointer}/transition/duration`, context));
  }
  return diagnostics;
};

/** Checks State-change values against canonical cardinality without asserting provider lifecycle capability. */
const validateStateTransition = (
  phase: UnknownRecord,
  pointer: string,
  states: ReadonlyMap<string, MotionStateDefinition>,
): readonly Diagnostic[] => {
  if (phase["phase"] !== "stateChange" || !isUnknownRecord(phase["state"])) return [];
  const state = phase["state"];
  if (typeof state["name"] !== "string") return [];
  const definition = states.get(state["name"]);
  if (definition === undefined || definition.axis !== "state") return [motionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.UNKNOWN_MOTION_STATE,
    `Motion state '${state["name"]}' is absent from the Canonical State Registry.`,
    `${pointer}/state/name`,
  )];
  const values = [state["from"], state["to"]];
  const valid = definition.valueType === "boolean"
    ? values.every((value) => typeof value === "boolean")
    : values.every((value) => typeof value === "string" && definition.values.has(value));
  return valid ? [] : [motionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.INVALID_MOTION_STATE_VALUE,
    `Motion state '${state["name"]}' transition values do not match its canonical ${definition.valueType} definition.`,
    `${pointer}/state`,
  )];
};

/** Validates each normal or reduced-motion phase while preserving serialized sequence order. */
const validatePhases = (
  value: unknown,
  pointer: string,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (!Array.isArray(value)) return [];
  const states = motionStates(context);
  const diagnostics: Diagnostic[] = [];
  value.forEach((phase, phaseIndex) => {
    if (!isUnknownRecord(phase)) return;
    const phasePointer = `${pointer}/${phaseIndex}`;
    diagnostics.push(...validateStateTransition(phase, phasePointer, states));
    if (Array.isArray(phase["sequence"])) phase["sequence"].forEach((segment, segmentIndex) => {
      diagnostics.push(...validateSegment(segment, `${phasePointer}/sequence/${segmentIndex}`, context));
    });
  });
  return diagnostics;
};

/** Validates the exact registries that bind a serialized Motion IR to a reproducible profile. */
const validateInputIdentity = (
  value: UnknownRecord,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const profile = context?.registries["css-profile-input"];
  if (isUnknownRecord(profile) && (
    value["profile"] !== profile["id"] ||
    value["profileInputDigest"] !== profile["webrefInputDigest"]
  )) diagnostics.push(motionDiagnostic(
    SPEC_DIAGNOSTIC_CODE.MOTION_PROFILE_MISMATCH,
    "Motion IR profile identity must match the pinned CSS profile input.",
    "/profileInputDigest",
  ));
  const conditionRegistry = context?.registries["condition-registry"];
  if (isUnknownRecord(conditionRegistry) && value["conditionRegistryDigest"] !== canonicalJsonDigest(conditionRegistry)) {
    diagnostics.push(motionDiagnostic(
      SPEC_DIAGNOSTIC_CODE.MOTION_CONDITION_DIGEST_MISMATCH,
      "Motion IR Condition Registry digest must match the exact validated registry input.",
      "/conditionRegistryDigest",
    ));
  }
  return diagnostics;
};

/** Validates renderer-neutral Motion IR semantics using only validated registry inputs. */
export const validateMotionIr = (
  value: unknown,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value)) return [];
  const diagnostics = [...validateInputIdentity(value, context)];
  diagnostics.push(...validatePhases(value["phases"], "/phases", context));
  if (isUnknownRecord(value["reducedMotion"]) && value["reducedMotion"]["strategy"] === "replace") {
    diagnostics.push(...validatePhases(value["reducedMotion"]["phases"], "/reducedMotion/phases", context));
  }
  return diagnostics;
};
