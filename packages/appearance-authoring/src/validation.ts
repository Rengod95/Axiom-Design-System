import { PROPERTY_DIAGNOSTIC_CODE } from "@axiom/css-property-profile";
import type {
  CSSGrammarValidator,
  EffectiveCSSPropertyEntry,
  EffectiveCSSPropertyRegistry,
  PropertyDiagnostic,
} from "@axiom/css-property-profile";

import {
  CSS_RECIPE_DIAGNOSTIC_CODE,
  CSS_RECIPE_DIAGNOSTIC_PHASE,
  CSS_RECIPE_DIAGNOSTIC_SEVERITY,
  CSS_RECIPE_FALLBACK_SOURCE,
  CSS_RECIPE_NEGATED_TOKEN_KIND,
  CSS_RECIPE_TOKEN_PROJECTOR_KIND,
} from "./constants.js";
import {
  CSSRecipeAuthoringError,
  type CSSAuthoringDeclaration,
  type CSSAuthoringStyleFragment,
  type CSSRecipeAuthoringInput,
  type CSSRecipeDefinition,
  type CSSRecipeDiagnostic,
} from "./contracts.js";

type RecipeStage = NonNullable<CSSRecipeDiagnostic["stage"]>;
type UnknownRecord = Record<string, unknown>;

/** Returns whether a Kernel-captured value is a plain declaration object. */
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Builds one stable diagnostic with the recipe context required for CSS authoring failures. */
const diagnostic = (
  code: string,
  message: string,
  source: string,
  context: Omit<CSSRecipeDiagnostic, "code" | "severity" | "phase" | "message" | "source"> = {},
): CSSRecipeDiagnostic => ({
  code,
  severity: CSS_RECIPE_DIAGNOSTIC_SEVERITY,
  phase: CSS_RECIPE_DIAGNOSTIC_PHASE,
  message,
  source,
  ...context,
});

/** Adapts a public CSS profile diagnostic while retaining Recipe and policy provenance. */
const propertyDiagnostic = (
  value: PropertyDiagnostic,
  source: string,
  context: Omit<CSSRecipeDiagnostic, "code" | "severity" | "phase" | "message" | "source" | "property" | "provenance">,
  property: EffectiveCSSPropertyEntry | undefined,
): CSSRecipeDiagnostic => diagnostic(value.code, value.message, source, {
  ...context,
  ...(value.property === undefined ? {} : { property: value.property }),
  ...(property === undefined ? {} : { provenance: property.policy.provenance }),
});

/** Resolves one generated camel-case or canonical array property under its required naming mode. */
const resolveProperty = (
  propertyName: string,
  mode: "object" | "array",
  registry: EffectiveCSSPropertyRegistry,
  source: string,
  context: Omit<CSSRecipeDiagnostic, "code" | "severity" | "phase" | "message" | "source">,
): { readonly canonicalName: string; readonly property: EffectiveCSSPropertyEntry } | CSSRecipeDiagnostic => {
  const canonicalName = mode === "object" ? registry.authoringNames[propertyName] : propertyName;
  if (canonicalName === undefined) {
    const alternate = registry.properties.some((entry) => entry.name === propertyName);
    if (alternate) return diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.NAMING_MODE_VIOLATION,
      `CSS property '${propertyName}' is not valid in ${mode} declaration mode.`,
      source,
      { ...context, property: propertyName, target: propertyName },
    );
    return diagnostic(PROPERTY_DIAGNOSTIC_CODE.UNKNOWN_PROPERTY, `Unknown CSS property '${propertyName}'.`, source, {
      ...context,
      property: propertyName,
      target: propertyName,
    });
  }
  const property = registry.properties.find((entry) => entry.name === canonicalName);
  if (property !== undefined) return { canonicalName, property };

  const alternate = Object.prototype.hasOwnProperty.call(registry.authoringNames, propertyName);
  if (alternate) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.NAMING_MODE_VIOLATION,
    `CSS property '${propertyName}' is not valid in ${mode} declaration mode.`,
    source,
    { ...context, property: propertyName, target: propertyName },
  );
  return diagnostic(PROPERTY_DIAGNOSTIC_CODE.UNKNOWN_PROPERTY, `Unknown CSS property '${propertyName}'.`, source, {
    ...context,
    property: propertyName,
    target: propertyName,
  });
};

/** Returns the value kind governed by a structural CSS declaration value. */
const valueKind = (value: unknown): "css" | "token" | "css-template" | "negated-token" | "token-projector" | undefined => {
  if (typeof value === "string") return "css";
  if (!isRecord(value) || typeof value["kind"] !== "string") return undefined;
  return value["kind"] === "css" || value["kind"] === "token" || value["kind"] === "css-template" || value["kind"] === CSS_RECIPE_NEGATED_TOKEN_KIND || value["kind"] === CSS_RECIPE_TOKEN_PROJECTOR_KIND
    ? value["kind"]
    : undefined;
};

/** Validates the closed schema-shaped form before raw CSS grammar is evaluated. */
const validateValueShape = (
  value: unknown,
  kind: ReturnType<typeof valueKind>,
  source: string,
  context: Omit<CSSRecipeDiagnostic, "code" | "severity" | "phase" | "message" | "source">,
): CSSRecipeDiagnostic | undefined => {
  if (typeof value === "string") return undefined;
  if (!isRecord(value) || kind === undefined) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.INVALID_DECLARATION_VALUE,
    "CSS Recipe declarations must use a CSS literal, Token Reference, or Token-containing CSS template.",
    source,
    context,
  );
  const keys = Object.keys(value).sort();
  if (kind === "css" && (keys.join(",") !== "kind,value" || typeof value["value"] !== "string")) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.INVALID_DECLARATION_VALUE,
    "A CSS literal requires only string kind and value fields.", source, context,
  );
  if (kind === "token" && (keys.join(",") !== "kind,path" || typeof value["path"] !== "string" || value["path"].length === 0)) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.INVALID_DECLARATION_VALUE,
    "A Token Reference requires only a non-empty string path.", source, context,
  );
  if (kind === CSS_RECIPE_NEGATED_TOKEN_KIND) {
    const tokenReference = value["token"];
    if (keys.join(",") !== "kind,token" || !isRecord(tokenReference) || Object.keys(tokenReference).sort().join(",") !== "kind,path" || tokenReference["kind"] !== "token" || typeof tokenReference["path"] !== "string" || tokenReference["path"].length === 0) return diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.INVALID_DECLARATION_VALUE,
      "A negated Token requires only a closed non-empty Token Reference.", source, context,
    );
  }
  if (kind === CSS_RECIPE_TOKEN_PROJECTOR_KIND) {
    const tokenReference = value["token"];
    const allowedProjectorKeys = value["parameters"] === undefined ? "kind,projector,token" : "kind,parameters,projector,token";
    const parameters = value["parameters"];
    if (keys.join(",") !== allowedProjectorKeys || !isRecord(tokenReference) || Object.keys(tokenReference).sort().join(",") !== "kind,path" || tokenReference["kind"] !== "token" || typeof tokenReference["path"] !== "string" || tokenReference["path"].length === 0 || typeof value["projector"] !== "string" || parameters !== undefined && !isRecord(parameters)) return diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.INVALID_DECLARATION_VALUE,
      "A Token projector requires a closed non-empty Token Reference and projector identity.", source, context,
    );
  }
  if (kind === "css-template") {
    if (keys.join(",") !== "kind,parts" || !Array.isArray(value["parts"]) || value["parts"].length === 0) return diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.INVALID_DECLARATION_VALUE,
      "A CSS template requires a non-empty parts array.", source, context,
    );
    const parts = value["parts"];
    const hasToken = parts.some((part) => isRecord(part) && part["kind"] === "token" && typeof part["path"] === "string" && part["path"].length > 0);
    if (!hasToken || parts.some((part) => typeof part !== "string" && (!isRecord(part) || part["kind"] !== "token" || Object.keys(part).sort().join(",") !== "kind,path" || typeof part["path"] !== "string" || part["path"].length === 0))) return diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.INVALID_DECLARATION_VALUE,
      "A CSS template may contain strings and non-empty Token References and must contain a Token Reference.", source, context,
    );
  }
  return undefined;
};

/** Validates one property/value pair at the N20 policy and raw-grammar boundary. */
const validateDeclaration = (
  propertyName: string,
  value: unknown,
  mode: "object" | "array",
  input: CSSRecipeAuthoringInput,
  grammarValidator: CSSGrammarValidator,
  source: string,
  context: Omit<CSSRecipeDiagnostic, "code" | "severity" | "phase" | "message" | "source">,
): readonly CSSRecipeDiagnostic[] => {
  const resolved = resolveProperty(propertyName, mode, input.propertyRegistry, source, context);
  if ("code" in resolved) return [resolved];
  const kind = valueKind(value);
  const shapeError = validateValueShape(value, kind, source, { ...context, property: resolved.canonicalName });
  if (shapeError !== undefined) return [shapeError];
  const policyValueKind = kind === CSS_RECIPE_NEGATED_TOKEN_KIND || kind === CSS_RECIPE_TOKEN_PROJECTOR_KIND ? "token" : kind;
  if (!resolved.property.policy.valueKinds.includes(policyValueKind!)) return [diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.VALUE_KIND_NOT_ALLOWED,
    `CSS value kind '${policyValueKind}' is not allowed for '${resolved.canonicalName}'.`,
    source,
    { ...context, property: resolved.canonicalName, provenance: resolved.property.policy.provenance },
  )];
  const literal = typeof value === "string" ? value : kind === "css" && isRecord(value) ? value["value"] : undefined;
  if (typeof literal !== "string") return [];
  const result = grammarValidator.validate(resolved.canonicalName, literal);
  return result.valid ? [] : result.diagnostics.map((item) => propertyDiagnostic(
    item,
    source,
    context,
    resolved.property,
  ));
};

/** Validates one opaque Kernel style fragment using its unambiguous CSS authoring mode. */
const validateStyleFragment = (
  style: CSSAuthoringStyleFragment,
  input: CSSRecipeAuthoringInput,
  grammarValidator: CSSGrammarValidator,
  source: string,
  context: Omit<CSSRecipeDiagnostic, "code" | "severity" | "phase" | "message" | "source">,
): readonly CSSRecipeDiagnostic[] => {
  if (Array.isArray(style)) return style.flatMap((declaration) => {
    if (!isRecord(declaration) || typeof declaration["property"] !== "string" || !("value" in declaration) || Object.keys(declaration).length !== 2) return [diagnostic(
      CSS_RECIPE_DIAGNOSTIC_CODE.INVALID_DECLARATION_VALUE,
      "Ordered CSS declaration entries require only property and value fields.",
      source,
      context,
    )];
    return validateDeclaration(declaration["property"], declaration["value"], "array", input, grammarValidator, source, context);
  });
  return Object.entries(style).flatMap(([property, value]) =>
    validateDeclaration(property, value, "object", input, grammarValidator, source, context));
};

/** Checks one State ID against supplied registry membership, appearance usage, component scope, and value type. */
const validateState = (
  stateId: string,
  value: unknown,
  recipeId: string,
  input: CSSRecipeAuthoringInput,
  source: string,
  context: Omit<CSSRecipeDiagnostic, "code" | "severity" | "phase" | "message" | "source">,
): CSSRecipeDiagnostic | undefined => {
  const state = input.canonicalStateRegistry.states.find((candidate) => candidate.id === stateId);
  if (state === undefined) return diagnostic(CSS_RECIPE_DIAGNOSTIC_CODE.UNKNOWN_STATE, `Unknown canonical State '${stateId}'.`, source, { ...context, target: stateId });
  if (!state.usage.includes("appearance") || !state.applicableComponents.includes(recipeId)) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.STATE_NOT_APPLICABLE,
    `Canonical State '${stateId}' is not applicable to appearance Recipe '${recipeId}'.`, source, { ...context, target: stateId },
  );
  if (state.valueType === "boolean" && typeof value !== "boolean") return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.STATE_VALUE_INVALID,
    `Canonical State '${stateId}' requires a boolean value.`, source, { ...context, target: stateId },
  );
  if (state.valueType === "enum" && (typeof value !== "string" || !state.values?.includes(value))) return diagnostic(
    CSS_RECIPE_DIAGNOSTIC_CODE.STATE_VALUE_INVALID,
    `Canonical State '${stateId}' requires a registered enum value.`, source, { ...context, target: stateId },
  );
  return undefined;
};

/** Validates all State and Condition registry references while deliberately excluding condition contradiction analysis. */
const validateRegistries = (
  definition: CSSRecipeDefinition,
  input: CSSRecipeAuthoringInput,
): readonly CSSRecipeDiagnostic[] => {
  const diagnostics: CSSRecipeDiagnostic[] = [];
  const source = definition.source ?? CSS_RECIPE_FALLBACK_SOURCE;
  for (const stateRule of definition.states ?? []) {
    for (const stateCase of stateRule.cases) {
      const error = validateState(stateRule.state, stateCase.equals, definition.id, input, stateRule.source ?? source, {
        recipeId: definition.id,
        slot: stateRule.slot,
        stage: "state",
      });
      if (error !== undefined) diagnostics.push(error);
    }
  }
  const validateSelections = (selections: Partial<Readonly<Record<string, Readonly<Record<string, boolean | string>>>>> | undefined, stage: RecipeStage, ruleSource: string): void => {
    for (const [slot, states] of Object.entries(selections ?? {})) for (const [stateId, value] of Object.entries(states ?? {})) {
      const error = validateState(stateId, value, definition.id, input, ruleSource, { recipeId: definition.id, slot, stage });
      if (error !== undefined) diagnostics.push(error);
    }
  };
  for (const rule of definition.compoundVariants ?? []) validateSelections(rule.when.states, "compound", rule.source ?? source);
  for (const rule of definition.conditions ?? []) {
    const ruleSource = rule.source ?? source;
    for (const clause of rule.when.all) {
      const ids = typeof clause === "string" ? [clause] : clause.any;
      for (const id of ids) if (!input.conditionRegistry.conditions.some((condition) => condition.id === id)) diagnostics.push(diagnostic(
        CSS_RECIPE_DIAGNOSTIC_CODE.UNKNOWN_CONDITION,
        `Unknown registered Condition '${id}'.`,
        ruleSource,
        { recipeId: definition.id, stage: "condition", target: id },
      ));
    }
    validateSelections(rule.states, "condition", ruleSource);
  }
  return diagnostics;
};

/** Validates CSS style fragments and registry references after the Kernel has made input safe and immutable. */
export const validateCSSRecipeDefinition = (
  definition: CSSRecipeDefinition,
  input: CSSRecipeAuthoringInput,
  grammarValidator: CSSGrammarValidator,
): void => {
  const diagnostics: CSSRecipeDiagnostic[] = [];
  const source = definition.source ?? CSS_RECIPE_FALLBACK_SOURCE;
  const validateApply = (apply: Partial<Readonly<Record<string, CSSAuthoringStyleFragment>>>, stage: RecipeStage, ruleSource = source): void => {
    for (const [slot, style] of Object.entries(apply)) if (style !== undefined) diagnostics.push(...validateStyleFragment(style, input, grammarValidator, ruleSource, {
      recipeId: definition.id,
      slot,
      stage,
    }));
  };
  if (definition.base !== undefined) validateApply(definition.base, "base");
  for (const axis of Object.values(definition.variants ?? {})) for (const apply of Object.values(axis)) validateApply(apply, "variant");
  for (const rule of definition.states ?? []) for (const stateCase of rule.cases) diagnostics.push(...validateStyleFragment(
    stateCase.apply,
    input,
    grammarValidator,
    rule.source ?? source,
    { recipeId: definition.id, slot: rule.slot, stage: "state" },
  ));
  for (const rule of definition.compoundVariants ?? []) validateApply(rule.apply, "compound", rule.source ?? source);
  for (const rule of definition.conditions ?? []) validateApply(rule.apply, "condition", rule.source ?? source);
  diagnostics.push(...validateRegistries(definition, input));
  if (diagnostics.length > 0) throw new CSSRecipeAuthoringError(diagnostics);
};
