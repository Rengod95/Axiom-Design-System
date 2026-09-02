import {
  ERROR_DIAGNOSTIC_SEVERITY,
  PROPERTY_DIAGNOSTIC_CODE,
  PROPERTY_DIAGNOSTIC_PHASE,
} from "../constants.js";
import type {
  EffectiveCSSPropertyRegistry,
  PropertyDiagnostic,
  TokenBindingMode,
} from "../contracts.js";

const failure = (
  code: string,
  message: string,
  property: string,
): readonly PropertyDiagnostic[] => [
  {
    code,
    severity: ERROR_DIAGNOSTIC_SEVERITY,
    phase: PROPERTY_DIAGNOSTIC_PHASE,
    message,
    property,
  },
];

/** Validates one canonical property against profile-owned Token binding policy only. */
export const validateTokenBinding = (
  registry: EffectiveCSSPropertyRegistry,
  input: {
    readonly property: string;
    readonly mode: TokenBindingMode;
    readonly domain?: string;
    readonly projector?: string;
    readonly negated?: boolean;
  },
): readonly PropertyDiagnostic[] => {
  if (registry.aliases[input.property] !== undefined) {
    return failure(
      PROPERTY_DIAGNOSTIC_CODE.VENDOR_PROPERTY_BLOCKED,
      `Legacy or vendor CSS property '${input.property}' is blocked.`,
      input.property,
    );
  }
  const canonical = registry.aliases[input.property] ?? input.property;
  const property = registry.properties.find((entry) => entry.name === canonical);
  if (property === undefined) {
    return failure(
      PROPERTY_DIAGNOSTIC_CODE.UNKNOWN_PROPERTY,
      `Unknown CSS property '${input.property}'.`,
      input.property,
    );
  }
  const bindings = property.policy.tokenBindings;
  if (input.negated === true && !bindings.allowsTokenNegation) {
    return failure(
      PROPERTY_DIAGNOSTIC_CODE.TOKEN_BINDING_MISSING,
      `Property '${canonical}' does not permit Token negation.`,
      canonical,
    );
  }
  if (input.mode === "projector") {
    if (bindings.projectors.length === 0) {
      return failure(
        PROPERTY_DIAGNOSTIC_CODE.TOKEN_BINDING_MISSING,
        `Property '${canonical}' has no configured Token projector.`,
        canonical,
      );
    }
    if (input.projector === undefined || !bindings.projectors.includes(input.projector)) {
      return failure(
        PROPERTY_DIAGNOSTIC_CODE.PROJECTOR_MISSING,
        `Projector '${input.projector ?? ""}' is not configured for '${canonical}'.`,
        canonical,
      );
    }
    return [];
  }
  const domains =
    input.mode === "direct" ? bindings.directDomains : bindings.templateDomains;
  if (domains.length === 0) {
    return failure(
      PROPERTY_DIAGNOSTIC_CODE.TOKEN_BINDING_MISSING,
      `Property '${canonical}' has no configured ${input.mode} Token binding.`,
      canonical,
    );
  }
  if (input.domain === undefined || !domains.includes(input.domain)) {
    return failure(
      PROPERTY_DIAGNOSTIC_CODE.TOKEN_DOMAIN_MISMATCH,
      `Token Domain '${input.domain ?? ""}' is not allowed for '${canonical}' in ${input.mode} mode.`,
      canonical,
    );
  }
  return [];
};
