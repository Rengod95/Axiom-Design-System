import { SPEC_DIAGNOSTIC_CODE } from "../constants.js";
import type {
  Diagnostic,
  SemanticValidationContext,
} from "../types.js";
import {
  isUnknownRecord,
  type UnknownRecord,
} from "../validation/unknown-record.js";
import { validateConditionExpression } from "./condition-expression-validator.js";
import { createSemanticDiagnosticFactory } from "./semantic-diagnostic.js";

const appearanceDiagnostic = createSemanticDiagnosticFactory("normalization");

const prefixDiagnosticPointers = (
  diagnostics: readonly Diagnostic[],
  prefix: string,
): readonly Diagnostic[] => diagnostics.map((diagnostic) => ({
  ...diagnostic,
  ...(diagnostic.location === undefined
    ? {}
    : {
        location: {
          ...diagnostic.location,
          pointer: `${prefix}${diagnostic.location.pointer}`,
        },
      }),
}));

const stringSet = (value: unknown): ReadonlySet<string> =>
  new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

interface AppearanceStateDefinition {
  readonly valueType: "boolean" | "enum";
  readonly values: ReadonlySet<string>;
  readonly applicableComponents: ReadonlySet<string>;
}

/** Resolves component-wide and Slot-qualified State targets for one normalized rule location. */
const stateAppliesToTarget = (
  applicableComponents: ReadonlySet<string>,
  recipeId: string,
  slot: string,
): boolean => applicableComponents.has(recipeId)
  || applicableComponents.has(`${recipeId}.${slot}`);

/** Reports a scope violation only after the referenced State definition has been resolved. */
const stateScopeIsInvalid = (
  definition: AppearanceStateDefinition | undefined,
  recipeId: string,
  slot: string,
): boolean => definition !== undefined
  && definition.applicableComponents.size !== 0
  && !stateAppliesToTarget(definition.applicableComponents, recipeId, slot);

const canonicalStates = (
  context: SemanticValidationContext | undefined,
): ReadonlyMap<string, AppearanceStateDefinition> => {
  const registry = context?.registries["canonical-state-registry"];
  if (!isUnknownRecord(registry) || !Array.isArray(registry["states"])) return new Map();
  return new Map(registry["states"]
    .filter(isUnknownRecord)
    .filter((state) =>
      !Array.isArray(state["usage"]) || state["usage"].includes("appearance")
    )
    .filter((state): state is UnknownRecord & { readonly id: string } =>
      typeof state["id"] === "string"
    )
    .map((state) => [state.id, {
      valueType: state["valueType"] === "enum" ? "enum" : "boolean",
      values: stringSet(state["values"]),
      applicableComponents: stringSet(state["applicableComponents"]),
    }]));
};

const validateStateValue = (
  value: unknown,
  state: string,
  pointer: string,
  states: ReadonlyMap<string, AppearanceStateDefinition>,
): readonly Diagnostic[] => {
  const definition = states.get(state);
  if (definition === undefined) return [];
  const valid = definition.valueType === "boolean"
    ? typeof value === "boolean"
    : typeof value === "string" && definition.values.has(value);
  if (valid) return [];
  return [appearanceDiagnostic(
    SPEC_DIAGNOSTIC_CODE.INVALID_APPEARANCE_STATE_VALUE,
    `Appearance State '${state}' value does not match its canonical ${definition.valueType} definition.`,
    pointer,
  )];
};

const validateProfileIdentity = (
  value: UnknownRecord,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  const profile = context?.registries["css-profile-input"];
  if (!isUnknownRecord(profile)) return [];
  if (
    value["profile"] === profile["id"] &&
    value["profileInputDigest"] === profile["webrefInputDigest"]
  ) return [];
  return [appearanceDiagnostic(
    SPEC_DIAGNOSTIC_CODE.APPEARANCE_PROFILE_MISMATCH,
    "Appearance IR profile identity must match the pinned CSS profile input.",
    "/profileInputDigest",
  )];
};

const declarationsInSlotRecords = (
  records: unknown,
): readonly { readonly slot: string; readonly declaration: UnknownRecord; readonly pointer: string }[] => {
  if (!Array.isArray(records)) return [];
  return records.flatMap((record, recordIndex) => {
    if (!isUnknownRecord(record) || typeof record["slot"] !== "string") return [];
    const slot = record["slot"];
    const declarations = record["declarations"];
    if (!Array.isArray(declarations)) return [];
    return declarations.filter(isUnknownRecord).map((declaration, declarationIndex) => ({
      slot,
      declaration,
      pointer: `/${recordIndex}/declarations/${declarationIndex}`,
    }));
  });
};

const validateSlotRecords = (
  records: unknown,
  pointer: string,
  slots: ReadonlySet<string>,
  recipeId: string,
  stage: string,
): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  if (!Array.isArray(records)) return diagnostics;
  const seen = new Set<string>();
  records.forEach((record, index) => {
    if (!isUnknownRecord(record) || typeof record["slot"] !== "string") return;
    const slot = record["slot"];
    if (!slots.has(slot) || seen.has(slot)) {
      diagnostics.push(appearanceDiagnostic(
        SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_SLOT,
        seen.has(slot)
          ? `Appearance stage contains duplicate slot '${slot}'.`
          : `Appearance stage references undeclared slot '${slot}'.`,
        `${pointer}/${index}/slot`,
      ));
    }
    seen.add(slot);
  });
  declarationsInSlotRecords(records).forEach(({ slot, declaration, pointer: suffix }) => {
    diagnostics.push(...validateOrigin(declaration, recipeId, slot, stage, `${pointer}${suffix}`));
  });
  return diagnostics;
};

const validateOrigin = (
  declaration: UnknownRecord,
  recipeId: string,
  slot: string,
  stage: string,
  pointer: string,
): readonly Diagnostic[] => {
  const origin = declaration["origin"];
  if (!isUnknownRecord(origin)) return [];
  if (
    origin["recipeId"] === recipeId &&
    origin["slot"] === slot &&
    origin["stage"] === stage
  ) return [];
  return [appearanceDiagnostic(
    SPEC_DIAGNOSTIC_CODE.APPEARANCE_ORIGIN_MISMATCH,
    `Declaration origin must match recipe '${recipeId}', slot '${slot}', and stage '${stage}'.`,
    `${pointer}/origin`,
  )];
};

const variantDefinitions = (
  axes: unknown,
  diagnostics: Diagnostic[],
): ReadonlyMap<string, ReadonlySet<string>> => {
  const result = new Map<string, ReadonlySet<string>>();
  if (!Array.isArray(axes)) return result;
  axes.forEach((axis, axisIndex) => {
    if (!isUnknownRecord(axis) || typeof axis["name"] !== "string") return;
    const name = axis["name"];
    if (result.has(name)) {
      diagnostics.push(appearanceDiagnostic(
        SPEC_DIAGNOSTIC_CODE.DUPLICATE_VARIANT_AXIS,
        `Variant axis '${name}' is duplicated.`,
        `/variantAxes/${axisIndex}/name`,
      ));
    }
    const values = new Set<string>();
    if (Array.isArray(axis["values"])) {
      axis["values"].forEach((entry, valueIndex) => {
        if (!isUnknownRecord(entry) || typeof entry["value"] !== "string") return;
        const value = entry["value"];
        if (values.has(value)) {
          diagnostics.push(appearanceDiagnostic(
            SPEC_DIAGNOSTIC_CODE.DUPLICATE_VARIANT_VALUE,
            `Variant axis '${name}' contains duplicate value '${value}'.`,
            `/variantAxes/${axisIndex}/values/${valueIndex}/value`,
          ));
        }
        values.add(value);
      });
    }
    if (typeof axis["defaultValue"] === "string" && !values.has(axis["defaultValue"])) {
      diagnostics.push(appearanceDiagnostic(
        SPEC_DIAGNOSTIC_CODE.INVALID_VARIANT_DEFAULT,
        `Variant axis '${name}' default '${axis["defaultValue"]}' is not a declared value.`,
        `/variantAxes/${axisIndex}/defaultValue`,
      ));
    }
    result.set(name, values);
  });
  return result;
};

const validateVariantSelection = (
  value: unknown,
  pointer: string,
  variants: ReadonlyMap<string, ReadonlySet<string>>,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value)) return [];
  const diagnostics: Diagnostic[] = [];
  for (const [axis, selected] of Object.entries(value)) {
    const allowed = variants.get(axis);
    const selections = typeof selected === "string"
      ? [selected]
      : Array.isArray(selected)
        ? selected.filter((item): item is string => typeof item === "string")
        : [];
    if (allowed === undefined || selections.some((item) => !allowed.has(item))) {
      diagnostics.push(appearanceDiagnostic(
        SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_VARIANT,
        `Appearance rule references unknown variant selection '${axis}'.`,
        `${pointer}/${axis}`,
      ));
    }
  }
  return diagnostics;
};

const validateStateSelection = (
  value: unknown,
  pointer: string,
  slots: ReadonlySet<string>,
  states: ReadonlyMap<string, AppearanceStateDefinition>,
  recipeId: string,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value)) return [];
  const diagnostics: Diagnostic[] = [];
  for (const [slot, selection] of Object.entries(value)) {
    if (!slots.has(slot)) {
      diagnostics.push(appearanceDiagnostic(
        SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_SLOT,
        `Appearance rule references undeclared slot '${slot}'.`,
        `${pointer}/${slot}`,
      ));
    }
    if (!isUnknownRecord(selection)) continue;
    for (const state of Object.keys(selection)) {
      if (!states.has(state)) {
        diagnostics.push(appearanceDiagnostic(
          SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_STATE,
          `Appearance rule references unknown State '${state}'.`,
          `${pointer}/${slot}/${state}`,
        ));
      } else {
        if (stateScopeIsInvalid(states.get(state), recipeId, slot)) diagnostics.push(appearanceDiagnostic(
          SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_STATE,
          `State '${state}' is not applicable to component/Slot target '${recipeId}.${slot}'.`,
          `${pointer}/${slot}/${state}`,
        ));
        diagnostics.push(...validateStateValue(
          selection[state],
          state,
          `${pointer}/${slot}/${state}`,
          states,
        ));
      }
    }
  }
  return diagnostics;
};

export const validateAppearanceIr = (
  value: unknown,
  context: SemanticValidationContext | undefined,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value) || typeof value["recipeId"] !== "string") return [];
  const recipeId = value["recipeId"];
  const slots = stringSet(value["slots"]);
  const states = canonicalStates(context);
  const diagnostics: Diagnostic[] = [];
  const variants = variantDefinitions(value["variantAxes"], diagnostics);

  diagnostics.push(...validateProfileIdentity(value, context));
  diagnostics.push(...validateSlotRecords(value["base"], "/base", slots, recipeId, "base"));
  if (Array.isArray(value["variantAxes"])) value["variantAxes"].forEach((axis, axisIndex) => {
    if (!isUnknownRecord(axis) || !Array.isArray(axis["values"])) return;
    axis["values"].forEach((entry, valueIndex) => {
      if (!isUnknownRecord(entry)) return;
      diagnostics.push(...validateSlotRecords(
        entry["apply"],
        `/variantAxes/${axisIndex}/values/${valueIndex}/apply`,
        slots,
        recipeId,
        "variant",
      ));
    });
  });
  if (Array.isArray(value["stateRules"])) value["stateRules"].forEach((rule, ruleIndex) => {
    if (!isUnknownRecord(rule) || typeof rule["slot"] !== "string") return;
    const slot = rule["slot"];
    if (!slots.has(slot)) diagnostics.push(appearanceDiagnostic(
      SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_SLOT,
      `State rule references undeclared slot '${slot}'.`,
      `/stateRules/${ruleIndex}/slot`,
    ));
    if (typeof rule["state"] === "string" && !states.has(rule["state"])) {
      diagnostics.push(appearanceDiagnostic(
        SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_STATE,
        `State rule references unknown State '${rule["state"]}'.`,
        `/stateRules/${ruleIndex}/state`,
      ));
    }
    if (typeof rule["state"] === "string" && stateScopeIsInvalid(states.get(rule["state"]), recipeId, slot)) diagnostics.push(appearanceDiagnostic(
      SPEC_DIAGNOSTIC_CODE.UNKNOWN_APPEARANCE_STATE,
      `State '${rule["state"]}' is not applicable to component/Slot target '${recipeId}.${slot}'.`,
      `/stateRules/${ruleIndex}/state`,
    ));
    if (!Array.isArray(rule["cases"])) return;
    rule["cases"].forEach((entry, caseIndex) => {
      if (!isUnknownRecord(entry) || !Array.isArray(entry["apply"])) return;
      if (typeof rule["state"] === "string") diagnostics.push(...validateStateValue(
        entry["equals"],
        rule["state"],
        `/stateRules/${ruleIndex}/cases/${caseIndex}/equals`,
        states,
      ));
      entry["apply"].filter(isUnknownRecord).forEach((declaration, declarationIndex) => {
        diagnostics.push(...validateOrigin(
          declaration,
          recipeId,
          slot,
          "state",
          `/stateRules/${ruleIndex}/cases/${caseIndex}/apply/${declarationIndex}`,
        ));
      });
    });
  });

  const validateRules = (rules: unknown, key: "compoundRules" | "conditionRules") => {
    if (!Array.isArray(rules)) return;
    const stage = key === "compoundRules" ? "compound" : "condition";
    rules.forEach((rule, index) => {
      if (!isUnknownRecord(rule)) return;
      const when = rule["when"];
      if (key === "conditionRules") diagnostics.push(...prefixDiagnosticPointers(
        validateConditionExpression(when, context),
        `/conditionRules/${index}/when`,
      ));
      if (key === "compoundRules" && isUnknownRecord(when)) {
        diagnostics.push(...validateVariantSelection(when["variants"], `/${key}/${index}/when/variants`, variants));
        diagnostics.push(...validateStateSelection(when["states"], `/${key}/${index}/when/states`, slots, states, recipeId));
      }
      if (key === "conditionRules") {
        diagnostics.push(...validateVariantSelection(rule["variants"], `/${key}/${index}/variants`, variants));
        diagnostics.push(...validateStateSelection(rule["states"], `/${key}/${index}/states`, slots, states, recipeId));
      }
      diagnostics.push(...validateSlotRecords(rule["apply"], `/${key}/${index}/apply`, slots, recipeId, stage));
    });
  };
  validateRules(value["compoundRules"], "compoundRules");
  validateRules(value["conditionRules"], "conditionRules");
  return diagnostics;
};
