import {
  RECIPE_CONDITION_ALL_MAXIMUM_LENGTH,
  RECIPE_CONDITION_ANY_MAXIMUM_LENGTH,
  RECIPE_IDENTIFIER_MAXIMUM_LENGTH,
  RECIPE_IDENTIFIER_PATTERN,
  RECIPE_KERNEL_ALLOWED_DEFINITION_KEYS,
  RECIPE_KERNEL_DIAGNOSTIC_CODE,
  RECIPE_KERNEL_DIAGNOSTIC_PHASE,
  RECIPE_KERNEL_DIAGNOSTIC_SEVERITY,
  RECIPE_KERNEL_FALLBACK_SOURCE,
  RECIPE_STATE_CASE_MAXIMUM_LENGTH,
} from "./constants.js";
import type {
  RecipeKernelDefinition,
  RecipeKernelDiagnostic,
  RecipeKernelJsonValue,
  RecipeStyleFragment,
} from "./contracts.js";

type UnknownRecord = Record<string, unknown>;

/** Returns whether a value is a non-array object without reading any properties. */
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Returns whether a validated style fragment is a plain object or plain Array. */
const isStyleFragment = (value: unknown): value is UnknownRecord | readonly unknown[] =>
  isRecord(value) || Array.isArray(value);

/** Escapes one JSON Pointer segment according to RFC 6901. */
const pointerSegment = (segment: string): string => segment.replaceAll("~", "~0").replaceAll("/", "~1");

/** Appends a JSON Pointer segment without relying on untrusted object access. */
const pointer = (base: string, segment: string | number): string => `${base}/${pointerSegment(String(segment))}`;

/** Builds one stable structural diagnostic. */
const diagnostic = (
  code: RecipeKernelDiagnostic["code"],
  message: string,
  file: string,
  location: string,
  target?: string,
): RecipeKernelDiagnostic => ({
  code,
  severity: RECIPE_KERNEL_DIAGNOSTIC_SEVERITY,
  phase: RECIPE_KERNEL_DIAGNOSTIC_PHASE,
  message,
  location: { file, pointer: location },
  ...(target === undefined ? {} : { target }),
});

/** Adds a diagnostic when a closed object contains a non-contract key. */
const validateKeys = (
  value: UnknownRecord,
  allowed: readonly string[],
  code: RecipeKernelDiagnostic["code"],
  file: string,
  location: string,
  diagnostics: RecipeKernelDiagnostic[],
): void => {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) diagnostics.push(diagnostic(code, `Recipe key '${key}' is not allowed here.`, file, pointer(location, key), key));
  }
};

/** Returns whether an identifier exactly follows the shared common identifier schema. */
const isIdentifier = (value: unknown): value is string =>
  typeof value === "string" && value.length <= RECIPE_IDENTIFIER_MAXIMUM_LENGTH && RECIPE_IDENTIFIER_PATTERN.test(value);

/** Validates data descriptors before their values are read by the Kernel. */
const dataDescriptors = (
  value: object,
  file: string,
  location: string,
  diagnostics: RecipeKernelDiagnostic[],
  arrayLength?: number,
): readonly [string, PropertyDescriptor][] | undefined => {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe definitions must not contain symbol properties.", file, location));
    return undefined;
  }
  const entries: [string, PropertyDescriptor][] = [];
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (arrayLength !== undefined && key === "length") continue;
    if (!descriptor.enumerable || descriptor.get !== undefined || descriptor.set !== undefined || !("value" in descriptor) || key === "toJSON") {
      diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe definitions must use enumerable data properties and cannot define toJSON.", file, pointer(location, key)));
      return undefined;
    }
    if (arrayLength !== undefined) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= arrayLength || String(index) !== key) {
        diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe arrays must not contain extra properties.", file, pointer(location, key)));
        return undefined;
      }
    }
    entries.push([key, descriptor]);
  }
  if (arrayLength !== undefined && entries.length !== arrayLength) {
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe arrays must not be sparse.", file, location));
    return undefined;
  }
  return entries;
};

/** Validates recursively JSON-safe values without invoking user getters or hooks. */
const validateJsonValue = (
  value: unknown,
  file: string,
  location: string,
  diagnostics: RecipeKernelDiagnostic[],
  ancestors: ReadonlySet<object> = new Set(),
): boolean => {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return true;
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe definitions must not contain non-finite numbers.", file, location));
    return false;
  }
  if (typeof value !== "object" || value === null) {
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe definitions must contain only JSON-safe values.", file, location));
    return false;
  }
  if (ancestors.has(value)) {
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe definitions must not contain cyclic values.", file, location));
    return false;
  }
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe definitions must use plain Arrays.", file, location));
      return false;
    }
    const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
    if (typeof length !== "number") {
      diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe Arrays must have a data length.", file, location));
      return false;
    }
    const entries = dataDescriptors(value, file, location, diagnostics, length);
    if (entries === undefined) return false;
    return entries.map(([key, descriptor]) => validateJsonValue(descriptor.value, file, pointer(location, key), diagnostics, nextAncestors)).every(Boolean);
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.NON_JSON_SAFE_VALUE, "Recipe definitions must use only plain objects and arrays.", file, location));
    return false;
  }
  const entries = dataDescriptors(value, file, location, diagnostics);
  if (entries === undefined) return false;
  return entries.map(([key, descriptor]) => validateJsonValue(descriptor.value, file, pointer(location, key), diagnostics, nextAncestors)).every(Boolean);
};

/** Copies a value already proven JSON-safe using property descriptors. */
const copyJsonValue = (value: RecipeKernelJsonValue): RecipeKernelJsonValue => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
    const copy: RecipeKernelJsonValue[] = new Array(length as number);
    for (let index = 0; index < (length as number); index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      copy[index] = copyJsonValue(descriptor?.value as RecipeKernelJsonValue);
    }
    return Object.freeze(copy);
  }
  const copy: Record<string, RecipeKernelJsonValue> = Object.create(null) as Record<string, RecipeKernelJsonValue>;
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    Object.defineProperty(copy, key, { value: copyJsonValue(descriptor.value as RecipeKernelJsonValue), enumerable: true, writable: false, configurable: false });
  }
  return Object.freeze(copy);
};

/** Resolves a valid source string, emitting a nearest-source diagnostic when invalid. */
const sourceFor = (
  value: UnknownRecord,
  parentSource: string,
  location: string,
  diagnostics: RecipeKernelDiagnostic[],
): string => {
  const source = value["source"];
  if (source === undefined) return parentSource;
  if (typeof source === "string" && source.length > 0) return source;
  diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_SOURCE, "Recipe source must be a non-empty string.", parentSource, pointer(location, "source")));
  return parentSource;
};

/** Validates a non-empty Slot-keyed style application against declared slots. */
const validateApply = (
  value: unknown,
  slots: ReadonlySet<string>,
  file: string,
  location: string,
  diagnostics: RecipeKernelDiagnostic[],
): void => {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_DEFINITION, "Recipe apply maps must be non-empty plain objects.", file, location));
    return;
  }
  for (const slot of Object.keys(value)) {
    if (!slots.has(slot)) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.UNKNOWN_SLOT, `Recipe references undeclared Slot '${slot}'.`, file, pointer(location, slot), slot));
    else if (!isStyleFragment(value[slot])) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_DEFINITION, "Recipe Slot styles must be JSON object or ordered-array fragments.", file, pointer(location, slot), slot));
  }
};

/** Validates a non-empty State-case style fragment after JSON safety is proven. */
const validateStateStyle = (
  value: unknown,
  file: string,
  location: string,
  diagnostics: RecipeKernelDiagnostic[],
): void => {
  if (!isStyleFragment(value) || Object.keys(value).length === 0) diagnostics.push(diagnostic(
    RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_STATE_RULE,
    "Recipe State case apply values must be non-empty JSON style fragments.",
    file,
    location,
  ));
};

/** Builds declared Variant values after their container shape is checked. */
const variantValues = (value: unknown): ReadonlyMap<string, ReadonlySet<string>> => {
  const result = new Map<string, ReadonlySet<string>>();
  if (!isRecord(value)) return result;
  for (const [axis, candidates] of Object.entries(value)) result.set(axis, isRecord(candidates) ? new Set(Object.keys(candidates)) : new Set());
  return result;
};

/** Builds declared State names by Slot after their container shape is checked. */
const stateNames = (value: unknown): ReadonlyMap<string, ReadonlySet<string>> => {
  const result = new Map<string, Set<string>>();
  if (!Array.isArray(value)) return result;
  for (const rule of value) {
    if (!isRecord(rule) || typeof rule["slot"] !== "string" || typeof rule["state"] !== "string") continue;
    const names = result.get(rule["slot"]) ?? new Set<string>();
    names.add(rule["state"]);
    result.set(rule["slot"], names);
  }
  return result;
};

/** Validates a variant-or-state predicate and its declared references. */
const validatePredicate = (
  value: unknown,
  variants: ReadonlyMap<string, ReadonlySet<string>>,
  states: ReadonlyMap<string, ReadonlySet<string>>,
  slots: ReadonlySet<string>,
  file: string,
  location: string,
  diagnostics: RecipeKernelDiagnostic[],
): void => {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_COMPOUND_PREDICATE, "Recipe predicates must be non-empty plain objects.", file, location));
    return;
  }
  validateKeys(value, ["variants", "states"], RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_COMPOUND_PREDICATE, file, location, diagnostics);
  if (value["variants"] === undefined && value["states"] === undefined) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_COMPOUND_PREDICATE, "Recipe predicates require variants or states.", file, location));
  if (value["variants"] !== undefined) {
    if (!isRecord(value["variants"]) || Object.keys(value["variants"]).length === 0) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_COMPOUND_PREDICATE, "Recipe predicate variants must be non-empty objects.", file, pointer(location, "variants")));
    else for (const [axis, selected] of Object.entries(value["variants"])) {
      const candidates = typeof selected === "string" ? [selected] : Array.isArray(selected) ? selected : [];
      const valid = candidates.length > 0 && candidates.every(isIdentifier) && new Set(candidates).size === candidates.length;
      if (!isIdentifier(axis) || !valid || !variants.get(axis)?.size || candidates.some((candidate) => !variants.get(axis)?.has(candidate))) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_COMPOUND_PREDICATE, "Recipe predicate references an invalid Variant selection.", file, pointer(pointer(location, "variants"), axis), axis));
    }
  }
  if (value["states"] !== undefined) {
    if (!isRecord(value["states"]) || Object.keys(value["states"]).length === 0) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_COMPOUND_PREDICATE, "Recipe predicate states must be non-empty objects.", file, pointer(location, "states")));
    else for (const [slot, selected] of Object.entries(value["states"])) {
      if (!slots.has(slot) || !isRecord(selected) || Object.keys(selected).length === 0) {
        diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_COMPOUND_PREDICATE, "Recipe predicate references an invalid Slot State.", file, pointer(pointer(location, "states"), slot), slot));
        continue;
      }
      for (const [state, selectedValue] of Object.entries(selected)) {
        if (!isIdentifier(state) || (typeof selectedValue !== "boolean" && !isIdentifier(selectedValue)) || !states.get(slot)?.has(state)) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_COMPOUND_PREDICATE, "Recipe predicate references an invalid State selection.", file, pointer(pointer(pointer(location, "states"), slot), state), state));
      }
    }
  }
};

/** Validates a closed environment Condition expression without registry evaluation. */
const validateConditionExpression = (value: unknown, file: string, location: string, diagnostics: RecipeKernelDiagnostic[]): void => {
  if (!isRecord(value)) {
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_CONDITION, "Recipe Conditions require a plain object expression.", file, location));
    return;
  }
  validateKeys(value, ["all"], RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_CONDITION, file, location, diagnostics);
  const all = value["all"];
  if (!Array.isArray(all) || all.length === 0 || all.length > RECIPE_CONDITION_ALL_MAXIMUM_LENGTH) {
    diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_CONDITION, "Recipe Conditions require a bounded non-empty all array.", file, pointer(location, "all")));
    return;
  }
  for (let index = 0; index < all.length; index += 1) {
    const clause = all[index];
    const clausePointer = pointer(pointer(location, "all"), index);
    if (isIdentifier(clause)) continue;
    if (!isRecord(clause)) {
      diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_CONDITION, "Recipe Condition clauses must be identifiers or any objects.", file, clausePointer));
      continue;
    }
    validateKeys(clause, ["any"], RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_CONDITION, file, clausePointer, diagnostics);
    const any = clause["any"];
    if (!Array.isArray(any) || any.length === 0 || any.length > RECIPE_CONDITION_ANY_MAXIMUM_LENGTH || any.some((candidate) => !isIdentifier(candidate)) || new Set(any).size !== any.length) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_CONDITION, "Recipe Condition any clauses must contain unique identifiers.", file, pointer(clausePointer, "any")));
  }
};

/** Validates the renderer-neutral Recipe Kernel structural contract. */
export const validateRecipeDefinition = (value: unknown): readonly RecipeKernelDiagnostic[] => {
  const diagnostics: RecipeKernelDiagnostic[] = [];
  const rootSource = RECIPE_KERNEL_FALLBACK_SOURCE;
  if (!validateJsonValue(value, rootSource, "", diagnostics)) return diagnostics;
  if (!isRecord(value)) return [diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_DEFINITION, "Recipe definitions must be plain objects.", rootSource, "")];
  const source = sourceFor(value, rootSource, "", diagnostics);
  validateKeys(value, RECIPE_KERNEL_ALLOWED_DEFINITION_KEYS, RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_DEFINITION, source, "", diagnostics);
  if (!isIdentifier(value["id"])) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_IDENTIFIER, "Recipe id must be a shared-schema identifier.", source, "/id"));
  if (!Array.isArray(value["slots"]) || value["slots"].length === 0) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_DEFINITION, "Recipe slots must be a non-empty array.", source, "/slots"));
  const slots = new Set<string>();
  if (Array.isArray(value["slots"])) for (let index = 0; index < value["slots"].length; index += 1) {
    const slot = value["slots"][index];
    if (!isIdentifier(slot)) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_IDENTIFIER, "Recipe Slot names must be shared-schema identifiers.", source, pointer("/slots", index)));
    else if (slots.has(slot)) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.DUPLICATE_SLOT, `Recipe Slot '${slot}' is duplicated.`, source, pointer("/slots", index), slot));
    else slots.add(slot);
  }
  if (value["base"] !== undefined) validateApply(value["base"], slots, source, "/base", diagnostics);
  if (value["variants"] !== undefined) {
    if (!isRecord(value["variants"]) || Object.keys(value["variants"]).length === 0) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_VARIANT, "Recipe variants must be a non-empty object.", source, "/variants"));
    else for (const [axis, candidates] of Object.entries(value["variants"])) {
      if (!isIdentifier(axis) || !isRecord(candidates) || Object.keys(candidates).length === 0) {
        diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_VARIANT, "Recipe Variant axes require non-empty identifier-keyed objects.", source, pointer("/variants", axis), axis));
        continue;
      }
      for (const [candidate, apply] of Object.entries(candidates)) {
        if (!isIdentifier(candidate)) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_VARIANT, "Recipe Variant values must be identifiers.", source, pointer(pointer("/variants", axis), candidate), candidate));
        validateApply(apply, slots, source, pointer(pointer("/variants", axis), candidate), diagnostics);
      }
    }
  }
  const variants = variantValues(value["variants"]);
  if (value["defaultVariants"] !== undefined) {
    if (!isRecord(value["defaultVariants"])) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_DEFAULT_VARIANT, "Recipe defaultVariants must be an object.", source, "/defaultVariants"));
    else for (const [axis, candidate] of Object.entries(value["defaultVariants"])) {
      if (!isIdentifier(axis) || !isIdentifier(candidate) || !variants.get(axis)?.has(candidate)) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_DEFAULT_VARIANT, "Recipe default Variant selection is not declared.", source, pointer("/defaultVariants", axis), axis));
    }
  }
  if (value["states"] !== undefined) {
    if (!Array.isArray(value["states"])) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_STATE_RULE, "Recipe states must be an array.", source, "/states"));
    else for (let index = 0; index < value["states"].length; index += 1) {
      const rule = value["states"][index]; const rulePointer = pointer("/states", index);
      if (!isRecord(rule)) { diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_STATE_RULE, "Recipe State rules must be objects.", source, rulePointer)); continue; }
      const ruleSource = sourceFor(rule, source, rulePointer, diagnostics);
      validateKeys(rule, ["slot", "state", "cases", "source"], RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_STATE_RULE, ruleSource, rulePointer, diagnostics);
      if (!isIdentifier(rule["slot"]) || !slots.has(rule["slot"] as string)) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.UNKNOWN_SLOT, "Recipe State rule references an undeclared Slot.", ruleSource, pointer(rulePointer, "slot")));
      if (!isIdentifier(rule["state"])) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_STATE_RULE, "Recipe State names must be identifiers.", ruleSource, pointer(rulePointer, "state")));
      const cases = rule["cases"];
      if (!Array.isArray(cases) || cases.length === 0 || cases.length > RECIPE_STATE_CASE_MAXIMUM_LENGTH) { diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_STATE_RULE, "Recipe State rules require bounded non-empty cases.", ruleSource, pointer(rulePointer, "cases"))); continue; }
      for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
        const stateCase = cases[caseIndex]; const casePointer = pointer(pointer(rulePointer, "cases"), caseIndex);
        if (!isRecord(stateCase)) { diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_STATE_RULE, "Recipe State cases must be objects.", ruleSource, casePointer)); continue; }
        validateKeys(stateCase, ["equals", "apply"], RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_STATE_RULE, ruleSource, casePointer, diagnostics);
        if (typeof stateCase["equals"] !== "boolean" && !isIdentifier(stateCase["equals"])) diagnostics.push(diagnostic(RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_STATE_RULE, "Recipe State case equals must be scalar.", ruleSource, pointer(casePointer, "equals")));
        validateStateStyle(stateCase["apply"], ruleSource, pointer(casePointer, "apply"), diagnostics);
      }
    }
  }
  const states = stateNames(value["states"]);
  const validateRuleList = (key: "compoundVariants" | "conditions"): void => {
    const rules = value[key]; if (rules === undefined) return;
    const code = key === "conditions" ? RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_CONDITION : RECIPE_KERNEL_DIAGNOSTIC_CODE.INVALID_COMPOUND_PREDICATE;
    if (!Array.isArray(rules)) { diagnostics.push(diagnostic(code, `Recipe ${key} must be an array.`, source, `/${key}`)); return; }
    for (let index = 0; index < rules.length; index += 1) {
      const rule = rules[index]; const rulePointer = pointer(`/${key}`, index);
      if (!isRecord(rule)) { diagnostics.push(diagnostic(code, `Recipe ${key} entries must be objects.`, source, rulePointer)); continue; }
      const ruleSource = sourceFor(rule, source, rulePointer, diagnostics);
      const allowed = key === "conditions" ? ["when", "variants", "states", "apply", "source"] : ["when", "apply", "source"];
      validateKeys(rule, allowed, code, ruleSource, rulePointer, diagnostics);
      validateApply(rule["apply"], slots, ruleSource, pointer(rulePointer, "apply"), diagnostics);
      if (key === "conditions") {
        validateConditionExpression(rule["when"], ruleSource, pointer(rulePointer, "when"), diagnostics);
        if (rule["variants"] !== undefined) validatePredicate({ variants: rule["variants"] }, variants, states, slots, ruleSource, pointer(rulePointer, "variants"), diagnostics);
        if (rule["states"] !== undefined) validatePredicate({ states: rule["states"] }, variants, states, slots, ruleSource, pointer(rulePointer, "states"), diagnostics);
      } else validatePredicate(rule["when"], variants, states, slots, ruleSource, pointer(rulePointer, "when"), diagnostics);
    }
  };
  validateRuleList("compoundVariants");
  validateRuleList("conditions");
  return diagnostics;
};

/** Returns a frozen descriptor-based copy after structural validation succeeds. */
export const copyRecipeDefinition = <
  TStyle extends RecipeStyleFragment,
  TDefinition extends RecipeKernelDefinition<TStyle>,
>(definition: TDefinition): TDefinition => copyJsonValue(definition as unknown as RecipeKernelJsonValue) as unknown as TDefinition;
