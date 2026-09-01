import { lexer } from "css-tree";

import {
  BLOCKED_CSS_WIDE_KEYWORDS,
  CUSTOM_PROPERTY_PATTERN,
  CSS_WIDE_KEYWORDS,
  DECLARATION_DELIMITER_PATTERN,
  ERROR_DIAGNOSTIC_SEVERITY,
  IMPORTANT_PATTERN,
  PROPERTY_DIAGNOSTIC_CODE,
  PROPERTY_DIAGNOSTIC_PHASE,
} from "../constants.js";
import type {
  CSSGrammarResult,
  CSSGrammarValidatorOptions,
  EffectiveCSSPropertyRegistry,
  PropertyDiagnostic,
} from "../contracts.js";

const error = (code: string, message: string, property: string): PropertyDiagnostic => ({
  code,
  severity: ERROR_DIAGNOSTIC_SEVERITY,
  phase: PROPERTY_DIAGNOSTIC_PHASE,
  message,
  property,
});

export class CSSGrammarValidator {
  readonly #registry: EffectiveCSSPropertyRegistry;
  readonly #properties: ReadonlyMap<
    string,
    EffectiveCSSPropertyRegistry["properties"][number]
  >;
  readonly #enabledExperimentalProperties: ReadonlySet<string>;

  constructor(
    registry: EffectiveCSSPropertyRegistry,
    options: CSSGrammarValidatorOptions = {},
  ) {
    this.#registry = registry;
    this.#properties = new Map(registry.properties.map((entry) => [entry.name, entry]));
    this.#enabledExperimentalProperties = new Set(
      options.enabledExperimentalProperties ?? [],
    );
  }

  validate(propertyName: string, value: string): CSSGrammarResult {
    const isCustomProperty = CUSTOM_PROPERTY_PATTERN.test(propertyName);
    if (isCustomProperty && !this.#registry.customProperties.includes(propertyName)) {
      return {
        valid: false,
        diagnostics: [
          error(
            PROPERTY_DIAGNOSTIC_CODE.UNKNOWN_PROPERTY,
            `Unknown CSS custom property '${propertyName}'.`,
            propertyName,
          ),
        ],
      };
    }
    if (this.#registry.aliases[propertyName] !== undefined) {
      return {
        valid: false,
        diagnostics: [
          error(
            PROPERTY_DIAGNOSTIC_CODE.VENDOR_PROPERTY_BLOCKED,
            `Legacy or vendor CSS property '${propertyName}' is blocked; use '${this.#registry.aliases[propertyName]}'.`,
            propertyName,
          ),
        ],
      };
    }
    const canonicalName = this.#registry.aliases[propertyName] ?? propertyName;
    const property = this.#properties.get(canonicalName);
    if (property === undefined && !isCustomProperty) {
      return {
        valid: false,
        diagnostics: [
          error(
            PROPERTY_DIAGNOSTIC_CODE.UNKNOWN_PROPERTY,
            `Unknown CSS property '${propertyName}'.`,
            propertyName,
          ),
        ],
      };
    }
    if (property?.authoringName.startsWith("Webkit") || property?.status === "vendor") {
      return {
        valid: false,
        diagnostics: [
          error(
            PROPERTY_DIAGNOSTIC_CODE.VENDOR_PROPERTY_BLOCKED,
            `Vendor CSS property '${propertyName}' is blocked by the profile.`,
            propertyName,
          ),
        ],
      };
    }
    if (
      property?.policy.authoring === "opt-in" &&
      !this.#enabledExperimentalProperties.has(canonicalName)
    ) {
      return {
        valid: false,
        diagnostics: [
          error(
            PROPERTY_DIAGNOSTIC_CODE.EXPERIMENTAL_OPT_IN_REQUIRED,
            `Experimental CSS property '${canonicalName}' requires an explicit opt-in.`,
            canonicalName,
          ),
        ],
      };
    }
    if (property?.policy.authoring === "blocked" || property?.policy.rawCSS === "blocked") {
      return {
        valid: false,
        diagnostics: [
          error(
            PROPERTY_DIAGNOSTIC_CODE.RAW_CSS_BLOCKED,
            `Raw CSS authoring is blocked for '${canonicalName}'.`,
            canonicalName,
          ),
        ],
      };
    }
    if (IMPORTANT_PATTERN.test(value)) {
      return {
        valid: false,
        diagnostics: [
          error(
            PROPERTY_DIAGNOSTIC_CODE.IMPORTANT_FORBIDDEN,
            "!important is forbidden in Axiom declarations.",
            canonicalName,
          ),
        ],
      };
    }
    if (value.trim() === "" || DECLARATION_DELIMITER_PATTERN.test(value)) {
      return {
        valid: false,
        diagnostics: [
          error(
            PROPERTY_DIAGNOSTIC_CODE.DECLARATION_SYNTAX_FORBIDDEN,
            "CSS values cannot contain declaration or selector delimiters.",
            canonicalName,
          ),
        ],
      };
    }
    const normalizedValue = value.trim();
    if (CSS_WIDE_KEYWORDS.has(normalizedValue)) {
      return BLOCKED_CSS_WIDE_KEYWORDS.has(normalizedValue)
        ? {
            valid: false,
            diagnostics: [
              error(
                PROPERTY_DIAGNOSTIC_CODE.RAW_CSS_BLOCKED,
                `CSS-wide keyword '${normalizedValue}' is blocked by the profile.`,
                canonicalName,
              ),
            ],
          }
        : { valid: true };
    }
    if (isCustomProperty) return { valid: true };
    const match = lexer.matchProperty(canonicalName, normalizedValue);
    if (match.error !== null) {
      return {
        valid: false,
        diagnostics: [
          error(
            PROPERTY_DIAGNOSTIC_CODE.CSS_GRAMMAR_MISMATCH,
            `Value does not match the '${canonicalName}' grammar: ${match.error.message}`,
            canonicalName,
          ),
        ],
      };
    }
    return { valid: true };
  }
}
