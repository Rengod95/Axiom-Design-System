import type {
  CSSAuthoringStyleFragment,
  CSSAuthoringValue,
  CSSRecipeDefinition,
  DefinedCSSRecipe,
  ProjectedTokenBlueprint,
} from "@axiom/appearance-authoring";
import { createCSSRecipeAuthoring, CSSRecipeAuthoringError } from "@axiom/appearance-authoring";
import type {
  CollisionTrace,
  CollisionApplicability,
  CollisionConditionRelation,
  CollisionDeclarationEvidence,
  CollisionTraceEntry,
  CSSAppearanceIR,
  CSSDeclaration,
  CSSDeclarationValue,
  DeclarationOrigin,
  SlotDeclarationRecord,
} from "@axiom/motion-schema";
import { analyzeConditionExpression, analyzeConditionPair } from "@axiom/condition-registry";
import type { ConditionExpression, ConditionThresholds } from "@axiom/condition-registry";

import type {
  AppearanceNormalizationDiagnostic,
  AppearanceNormalizationResult,
  AppearanceNormalizer,
  AppearanceNormalizerInput,
} from "./contracts.js";
import {
  APPEARANCE_COLLISION_ID_PREFIX,
  APPEARANCE_COLLISION_ID_WIDTH,
  APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE,
  APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY,
  APPEARANCE_NORMALIZER_PROFILE_ID,
  APPEARANCE_NORMALIZER_SCHEMA_VERSION,
} from "./constants.js";

type Stage = DeclarationOrigin["stage"];
type StyleDeclaration = Readonly<{ readonly property: string; readonly sourceProperty: string; readonly value: CSSAuthoringValue; readonly index: number }>;
type NormalizedDeclaration = Readonly<{ readonly declaration: CSSDeclaration; readonly property: string }>;
type NormalizableRecipe = DefinedCSSRecipe<CSSRecipeDefinition>;
type TokenManifestLike = Readonly<{
  readonly contexts?: readonly Readonly<{
    readonly tokens?: readonly Readonly<Record<string, unknown>>[];
  }>[];
}>;

/** Reads an untrusted public recipe once without letting getters escape the typed result boundary. */
const recipeDefinition = (value: unknown): { readonly id: string } | undefined => {
  try {
    if (typeof value !== "object" || value === null || !Object.prototype.hasOwnProperty.call(value, "definition")) return undefined;
    const definition = (value as Readonly<{ readonly definition?: unknown }>).definition;
    return typeof definition === "object" && definition !== null && typeof (definition as Readonly<{ readonly id?: unknown }>).id === "string" ? definition as { readonly id: string } : undefined;
  } catch {
    return undefined;
  }
};

/** Detaches JSON-safe output and freezes every reachable object before it crosses the public boundary. */
const detachAndFreeze = <T>(value: T): T => {
  const detached = JSON.parse(JSON.stringify(value)) as T;
  const freeze = (candidate: unknown): void => {
    if (typeof candidate !== "object" || candidate === null || Object.isFrozen(candidate)) return;
    Object.freeze(candidate);
    for (const nested of Object.values(candidate)) freeze(nested);
  };
  freeze(detached);
  return detached;
};

/** Escapes one authoring key for a stable JSON Pointer segment. */
const escapePointerSegment = (value: string): string => value.replaceAll("~", "~0").replaceAll("/", "~1");

/** Rejects host-specific paths so serialized origins remain repository-relative. */
const isRepositoryRelativeSource = (source: string): boolean =>
  source === "<recipe>" || (!source.startsWith("/") && !/^[a-z][a-z0-9+.-]*:/iu.test(source));

/** Produces one valid origin or records a blocking source diagnostic. */
const originFor = (
  recipeId: string,
  slot: string,
  stage: Stage,
  source: string,
  pointer: string,
  diagnostics: AppearanceNormalizationDiagnostic[],
): DeclarationOrigin => {
  if (!isRepositoryRelativeSource(source)) diagnostics.push({
    code: APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.UNSTABLE_ORDER,
    severity: APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.ERROR,
    message: "Declaration origins must use a repository-relative source path or '<recipe>'.",
  });
  return { recipeId, slot, stage, source: `${isRepositoryRelativeSource(source) ? source : "<recipe>"}#${pointer}` };
};

/** Converts one authoring style to explicit declarations; object form uses canonical kebab ordering. */
const styleDeclarations = (
  style: CSSAuthoringStyleFragment,
  authoringNames: Readonly<Record<string, string>>,
): readonly StyleDeclaration[] => {
  if (Array.isArray(style)) return style.map((entry, index) => ({ property: entry.property, sourceProperty: entry.property, value: entry.value, index }));
  return Object.entries(style)
    .map(([property, value], index) => ({ property: authoringNames[property] ?? property.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`), sourceProperty: property, value, index }))
    .sort((left, right) => left.property.localeCompare(right.property));
};

/** Lowers N21-approved negation while retaining the original unresolved Token Reference. */
const lowerValue = (
  value: CSSAuthoringValue,
  blueprints: readonly ProjectedTokenBlueprint[] | undefined,
): readonly Readonly<{ readonly property?: string; readonly value: CSSDeclarationValue }>[] => {
  if (blueprints !== undefined) return blueprints.map((blueprint) => ({
    property: blueprint.property,
    value: blueprint.value,
  }));
  if (typeof value === "object" && value !== null && "kind" in value && value.kind === "negated-token") return [{
    value: { kind: "css-template", parts: ["calc(0px - ", value.token, ")"] },
  }];
  return [{ value: typeof value === "string" ? { kind: "css", value } : value as CSSDeclarationValue }];
};

/** Normalizes one slot/style application and preserves N21 projector field ordering. */
const normalizeSlot = (
  recipe: NormalizableRecipe,
  input: AppearanceNormalizerInput,
  slot: string,
  style: CSSAuthoringStyleFragment,
  stage: Stage,
  source: string,
  pointer: string,
  diagnostics: AppearanceNormalizationDiagnostic[],
): SlotDeclarationRecord => {
  const declarations: CSSDeclaration[] = [];
  for (const authored of styleDeclarations(style, input.propertyRegistry.authoringNames)) {
    const bindingPointer = Array.isArray(style) ? `${pointer}/${authored.index}/value` : `${pointer}/${escapePointerSegment(authored.sourceProperty)}`;
    const blueprints = recipe.tokenBindingReport.bindings.find((binding) => binding.path.stage === stage && binding.path.slot === slot && binding.path.property === authored.property && binding.path.declarationIndex === authored.index && binding.path.pointer === bindingPointer)?.projectedDeclarations;
    const values = lowerValue(authored.value, blueprints);
    for (const lowered of values) {
      const property = lowered.property ?? authored.property;
      declarations.push({
        property,
        value: lowered.value,
        important: false,
        origin: originFor(recipe.definition.id, slot, stage, source,
          bindingPointer, diagnostics),
      });
    }
  }
  return { slot, declarations };
};

/** Produces a trace record for an ordered declaration collision. */
const collision = (
  entries: CollisionTraceEntry[],
  recipe: NormalizableRecipe,
  input: AppearanceNormalizerInput,
  earlier: CSSDeclaration,
  later: CSSDeclaration,
  relation: CollisionTraceEntry["relation"],
  winner: CollisionTraceEntry["winner"],
  affectedProperty: string,
  conditionRelation?: CollisionConditionRelation,
): string => {
  const id = `${APPEARANCE_COLLISION_ID_PREFIX}${String(entries.length + 1).padStart(APPEARANCE_COLLISION_ID_WIDTH, "0")}`;
  const evidenceFor = (declaration: CSSDeclaration): CollisionDeclarationEvidence => {
    const property = input.propertyRegistry.properties.find((entry) => entry.name === declaration.property)!;
    return {
      property: declaration.property,
      origin: declaration.origin,
      policyProvenance: property.policy.provenance as CollisionDeclarationEvidence["policyProvenance"],
      applicability: traceApplicabilityFor(recipe, declaration),
    };
  };
  const evidence = {
    id,
    affectedProperty,
    earlier: evidenceFor(earlier),
    later: evidenceFor(later),
    winner,
  };
  if (relation === "condition-overlap") entries.push({ ...evidence, relation, conditionRelation: conditionRelation! });
  else entries.push({ ...evidence, relation });
  return id;
};

/** Returns whether two declaration origins are mutually exclusive branches of the same Variant or State rule. */
const exclusiveBranches = (earlier: CSSDeclaration, later: CSSDeclaration): boolean => {
  const pointer = (declaration: CSSDeclaration): string => declaration.origin.source.split("#")[1] ?? "";
  const variant = /^\/variants\/([^/]+)\/([^/]+)\//u;
  const state = /^\/states\/(\d+)\/cases\/(\d+)\//u;
  const earlierVariant = variant.exec(pointer(earlier));
  const laterVariant = variant.exec(pointer(later));
  if (earlierVariant !== null && laterVariant !== null) return earlierVariant[1] === laterVariant[1] && earlierVariant[2] !== laterVariant[2];
  const earlierState = state.exec(pointer(earlier));
  const laterState = state.exec(pointer(later));
  return earlierState !== null && laterState !== null && earlierState[1] === laterState[1] && earlierState[2] !== laterState[2];
};

/** Extracts numeric breakpoint thresholds from N21's already-configured resolved Token manifest. */
const conditionThresholds = (input: AppearanceNormalizerInput): ConditionThresholds => {
  const manifest = input.tokenValidation.resolvedTokenManifest as unknown as TokenManifestLike;
  const tokens = manifest.contexts?.[0]?.tokens ?? [];
  return Object.fromEntries(tokens.flatMap((token) => {
    const value = token["resolvedValue"];
    const threshold = typeof value === "number" ? value : typeof value === "object" && value !== null && typeof (value as Readonly<Record<string, unknown>>)["value"] === "number" ? (value as Readonly<Record<string, number>>)["value"] : undefined;
    return typeof token["id"] === "string" && threshold !== undefined ? [[token["id"], threshold]] : [];
  }));
};

/** Reads a Condition-rule index from a stable serialized origin pointer. */
const conditionIndex = (declaration: CSSDeclaration): number | undefined => {
  const match = /#\/conditions\/(\d+)\//u.exec(declaration.origin.source);
  return match === null ? undefined : Number(match[1]);
};

type Applicability = Readonly<{ readonly variants: Readonly<Record<string, readonly string[]>>; readonly states: Readonly<Record<string, Readonly<Record<string, boolean | string>>>> }>;

/** Parses the N22-owned pointer suffix without relying on source file names. */
const originPointer = (declaration: CSSDeclaration): string => declaration.origin.source.split("#")[1] ?? "";

/** Converts one Variant selection map to a closed overlap form. */
const variantsOf = (value: unknown): Readonly<Record<string, readonly string[]>> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([axis, selection]) =>
    typeof selection === "string" ? [[axis, [selection]]] : Array.isArray(selection) && selection.every((item) => typeof item === "string") ? [[axis, selection]] : []));
};

/** Converts one State selection map to a closed overlap form. */
const statesOf = (value: unknown): Readonly<Record<string, Readonly<Record<string, boolean | string>>>> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Readonly<Record<string, Readonly<Record<string, boolean | string>>>> : {};

/** Derives one normalized declaration's possible Variant and State activation predicate from the fresh N21 snapshot. */
const applicabilityFor = (recipe: NormalizableRecipe, declaration: CSSDeclaration): Applicability => {
  const pointer = originPointer(declaration);
  const variant = /^\/variants\/([^/]+)\/([^/]+)\//u.exec(pointer);
  if (variant !== null) return { variants: { [variant[1]!]: [variant[2]!] }, states: {} };
  const state = /^\/states\/(\d+)\/cases\/(\d+)\//u.exec(pointer);
  if (state !== null) {
    const rule = recipe.snapshot.stateRules[Number(state[1])];
    const stateCase = rule?.cases[Number(state[2])];
    return rule === undefined || stateCase === undefined ? { variants: {}, states: {} } : { variants: {}, states: { [rule.slot]: { [rule.state]: stateCase.equals } } };
  }
  const compound = /#\/compoundVariants\/(\d+)\//u.exec(declaration.origin.source);
  if (compound !== null) {
    const rule = recipe.snapshot.compoundVariants[Number(compound[1])];
    return { variants: variantsOf(rule?.when.variants), states: statesOf(rule?.when.states) };
  }
  const condition = conditionIndex(declaration);
  if (condition !== undefined) {
    const rule = recipe.snapshot.conditions[condition];
    return { variants: variantsOf(rule?.variants), states: statesOf(rule?.states) };
  }
  return { variants: {}, states: {} };
};

/** Serializes the normalizer-derived activation predicate into closed trace evidence. */
const traceApplicabilityFor = (
  recipe: NormalizableRecipe,
  declaration: CSSDeclaration,
): CollisionApplicability => {
  const applicability = applicabilityFor(recipe, declaration);
  const variants = Object.entries(applicability.variants)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .flatMap(([axis, values]) => {
      const [first, ...rest] = [...values].sort((left, right) => left.localeCompare(right, "en"));
      return first === undefined ? [] : [{ axis, values: [first, ...rest] as const }];
    });
  const states = Object.entries(applicability.states).flatMap(([slot, selections]) =>
    Object.entries(selections).map(([state, equals]) => ({ slot, state, equals })))
    .sort((left, right) => `${left.slot}\u0000${left.state}`.localeCompare(`${right.slot}\u0000${right.state}`, "en"));
  const index = conditionIndex(declaration);
  const condition = index === undefined ? undefined : recipe.snapshot.conditions[index]?.when;
  return { variants, states, ...(condition === undefined ? {} : { condition }) } as CollisionApplicability;
};

/** Returns whether two Variant/State selection predicates can be simultaneously active. */
const applicabilityOverlaps = (left: Applicability, right: Applicability): boolean => {
  for (const axis of new Set([...Object.keys(left.variants), ...Object.keys(right.variants)])) {
    const first = left.variants[axis];
    const second = right.variants[axis];
    if (first !== undefined && second !== undefined && !first.some((value) => second.includes(value))) return false;
  }
  for (const slot of new Set([...Object.keys(left.states), ...Object.keys(right.states)])) for (const state of new Set([...Object.keys(left.states[slot] ?? {}), ...Object.keys(right.states[slot] ?? {})])) {
    const first = left.states[slot]?.[state];
    const second = right.states[slot]?.[state];
    if (first !== undefined && second !== undefined && first !== second) return false;
  }
  return true;
};

/** Identifies the ordered-array escape hatch that makes same-stage declaration order intentional. */
const isOrderedArrayDeclaration = (declaration: CSSDeclaration): boolean => /\/\d+\/value$/u.test(originPointer(declaration));

/** Finds same-property and profile-defined shorthand/reset-longhand collisions in stage order. */
const analyzeCollisions = (
  recipe: NormalizableRecipe,
  records: readonly SlotDeclarationRecord[],
  input: AppearanceNormalizerInput,
  entries: CollisionTraceEntry[],
  diagnostics: AppearanceNormalizationDiagnostic[],
): void => {
  const previous: Array<Readonly<{ readonly slot: string; readonly declaration: CSSDeclaration }>> = [];
  for (const record of records) for (const declaration of record.declarations) {
    const ownCondition = conditionIndex(declaration);
    if (ownCondition !== undefined) {
      const expression = recipe.snapshot.conditions[ownCondition]?.when;
      if (expression !== undefined && !analyzeConditionExpression(expression as ConditionExpression, input.conditionRegistry, conditionThresholds(input)).satisfiable) continue;
    }
    for (const priorRecord of previous) {
      const prior = priorRecord.declaration;
      if (priorRecord.slot !== record.slot || prior.property !== declaration.property || exclusiveBranches(prior, declaration) || !applicabilityOverlaps(applicabilityFor(recipe, prior), applicabilityFor(recipe, declaration))) continue;
      const earlierCondition = conditionIndex(prior);
      const laterCondition = conditionIndex(declaration);
      if (earlierCondition !== undefined && laterCondition !== undefined) {
        const left = recipe.snapshot.conditions[earlierCondition]?.when;
        const right = recipe.snapshot.conditions[laterCondition]?.when;
        if (left !== undefined && right !== undefined) {
          const relation = analyzeConditionPair(left as ConditionExpression, right as ConditionExpression, input.conditionRegistry, conditionThresholds(input));
          if (relation.relation === "disjoint") continue;
          const traceId = collision(entries, recipe, input, prior, declaration, "condition-overlap", "later", declaration.property, relation.relation);
          diagnostics.push({ code: APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.CONDITION_OVERLAP, severity: APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.WARNING, message: `Satisfiable Condition rules are ${relation.relation} and can collide without explicit relation intent.`, traceId });
          continue;
        }
      }
      const traceId = collision(entries, recipe, input, prior, declaration, "same-property", "later", declaration.property);
      if ((prior.origin.stage === "variant" && declaration.origin.stage === "variant") || (prior.origin.stage === "state" && declaration.origin.stage === "state")) diagnostics.push({ code: APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.SHORTHAND_LONGHAND, severity: APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.WARNING, message: "Simultaneously applicable Variant or State declarations target the same property.", traceId });
    }
    for (const priorRecord of previous) {
      const priorDeclaration = priorRecord.declaration;
      if (priorRecord.slot !== record.slot || exclusiveBranches(priorDeclaration, declaration) || !applicabilityOverlaps(applicabilityFor(recipe, priorDeclaration), applicabilityFor(recipe, declaration))) continue;
      const earlierProperty = input.propertyRegistry.properties.find((property) => property.name === priorDeclaration.property);
      const laterProperty = input.propertyRegistry.properties.find((property) => property.name === declaration.property);
      const shorthandLonghand = earlierProperty?.longhands.includes(declaration.property) || laterProperty?.longhands.includes(priorDeclaration.property);
      const resetLonghand = laterProperty?.resetLonghands.includes(priorDeclaration.property) ?? false;
      if (!shorthandLonghand && !resetLonghand) continue;
      const affectedProperty = resetLonghand
        ? priorDeclaration.property
        : earlierProperty?.longhands.includes(declaration.property)
          ? declaration.property
          : priorDeclaration.property;
      const traceId = collision(entries, recipe, input, priorDeclaration, declaration, resetLonghand ? "reset-longhand" : "shorthand-longhand", "later", affectedProperty);
      diagnostics.push({
        code: resetLonghand ? APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.RESET_LONGHAND : APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.SHORTHAND_LONGHAND,
        severity: resetLonghand || (priorDeclaration.origin.stage === declaration.origin.stage && !(isOrderedArrayDeclaration(priorDeclaration) && isOrderedArrayDeclaration(declaration))) ? APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.ERROR : APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.WARNING,
        message: resetLonghand ? "A reset-longhand conflicts with another declaration." : "A shorthand overlaps a longhand declaration.",
        traceId,
      });
    }
    previous.push({ slot: record.slot, declaration });
  }
};

/** Verifies the frozen N21 receipt against the exact configured public authorities. */
const receiptDiagnostics = (
  recipe: NormalizableRecipe,
  input: AppearanceNormalizerInput,
): AppearanceNormalizationDiagnostic[] => {
  if (!Object.isFrozen(recipe) || !Object.isFrozen(recipe.snapshot) || !Object.isFrozen(recipe.tokenBindingReport)
    || !Object.isFrozen(recipe.tokenBindingReport.authority) || !Object.isFrozen(recipe.tokenBindingReport.bindings)
    || !Array.isArray(recipe.snapshot.base) || !Array.isArray(recipe.snapshot.variantAxes)
    || !Array.isArray(recipe.snapshot.stateRules) || !Array.isArray(recipe.snapshot.compoundVariants)
    || !Array.isArray(recipe.snapshot.conditions) || typeof recipe.definition.id !== "string") return [{
    code: APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.AUTHORITY_INVALID, severity: APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.ERROR, message: "N22 accepts only a frozen, structurally complete N21 DefinedCSSRecipe receipt.",
  }];
  const receipt = recipe.tokenBindingReport.authority;
  const configured = input.tokenValidation.authorityDigests;
  const matches = receipt.profileInputDigest === input.propertyRegistry.profile.webrefInputDigest
    && receipt.effectivePropertyRegistry === configured.effectivePropertyRegistry
    && receipt.propertyPolicySource === configured.propertyPolicySource
    && receipt.resolvedTokenManifest === configured.resolvedTokenManifest
    && receipt.tokenDomainRegistry === configured.tokenDomainRegistry
    && receipt.projectorRegistry === configured.projectorRegistry
    && receipt.canonicalStateRegistry === configured.canonicalStateRegistry
    && receipt.conditionRegistry === configured.conditionRegistry;
  return matches ? [] : [{
    code: APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.AUTHORITY_INVALID,
    severity: APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.ERROR,
    message: "N22 requires an N21 Token binding receipt for these exact authority digests.",
  }];
};

/** Creates the deterministic, renderer-neutral N22 Appearance normalizer. */
export const createAppearanceNormalizer = (input: AppearanceNormalizerInput): AppearanceNormalizer => ({
  /** Normalizes all five Kernel stages in their specified precedence order. */
  normalize(recipe: NormalizableRecipe): AppearanceNormalizationResult {
    const definition = recipeDefinition(recipe);
    if (definition === undefined) return detachAndFreeze({ diagnostics: [{ code: APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.AUTHORITY_INVALID, severity: APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.ERROR, message: "N22 requires a readable defined Recipe." }], trace: { schemaVersion: APPEARANCE_NORMALIZER_SCHEMA_VERSION, profile: APPEARANCE_NORMALIZER_PROFILE_ID, profileInputDigest: input.propertyRegistry.profile.webrefInputDigest, recipeId: "invalid-recipe", entries: [] } });
    try {
      recipe = createCSSRecipeAuthoring(input).defineRecipe(definition as CSSRecipeDefinition) as NormalizableRecipe;
    } catch (error) {
      const trace: CollisionTrace = { schemaVersion: APPEARANCE_NORMALIZER_SCHEMA_VERSION, profile: APPEARANCE_NORMALIZER_PROFILE_ID, profileInputDigest: input.propertyRegistry.profile.webrefInputDigest, recipeId: definition.id, entries: [] };
      return detachAndFreeze({ diagnostics: [{ code: APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.AUTHORITY_INVALID, severity: APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.ERROR, message: error instanceof CSSRecipeAuthoringError ? error.diagnostics.map((diagnostic) => diagnostic.message).join(" ") : "N22 could not freshly validate the supplied definition through N21." }], trace });
    }
    const diagnostics = receiptDiagnostics(recipe, input);
    const traceEntries: CollisionTraceEntry[] = [];
    const emptyTrace: CollisionTrace = {
      schemaVersion: APPEARANCE_NORMALIZER_SCHEMA_VERSION, profile: APPEARANCE_NORMALIZER_PROFILE_ID, profileInputDigest: input.propertyRegistry.profile.webrefInputDigest,
      recipeId: recipe.definition.id, entries: traceEntries,
    };
    if (diagnostics.length > 0) return detachAndFreeze({ diagnostics, trace: emptyTrace });
    const source = recipe.definition.source ?? "<recipe>";
    const authoringNames = (input.propertyRegistry as Readonly<{ readonly authoringNames?: Readonly<Record<string, string>> }>).authoringNames ?? {};
    const inputWithNames = { ...input, propertyRegistry: { ...input.propertyRegistry, authoringNames } };
    const base = recipe.snapshot.base.map((record) => normalizeSlot(recipe, inputWithNames, record.slot, record.style, "base", source, `/base/${escapePointerSegment(record.slot)}`, diagnostics));
    const variantAxes = recipe.snapshot.variantAxes.map((axis) => ({
      name: axis.name, ...(axis.defaultValue === undefined ? {} : { defaultValue: axis.defaultValue }),
      values: axis.values.map((value) => ({ value: value.value, apply: value.apply.map((record) => normalizeSlot(recipe, inputWithNames, record.slot, record.style, "variant", source, `/variants/${escapePointerSegment(axis.name)}/${escapePointerSegment(value.value)}/${escapePointerSegment(record.slot)}`, diagnostics)) })),
    }));
    const stateRules = recipe.snapshot.stateRules.map((rule, index) => ({ slot: rule.slot, state: rule.state, cases: rule.cases.map((stateCase, caseIndex) => ({ equals: stateCase.equals, apply: normalizeSlot(recipe, inputWithNames, rule.slot, stateCase.apply, "state", rule.source ?? source, `/states/${index}/cases/${caseIndex}/apply`, diagnostics).declarations })) }));
    const compoundRules = recipe.snapshot.compoundVariants.map((rule, index) => ({ when: rule.when, apply: Object.entries(rule.apply).map(([slot, style]) => normalizeSlot(recipe, inputWithNames, slot, style as CSSAuthoringStyleFragment, "compound", rule.source ?? source, `/compoundVariants/${index}/apply/${escapePointerSegment(slot)}`, diagnostics)) }));
    const conditionRules = recipe.snapshot.conditions.map((rule, index) => ({ when: rule.when, ...(rule.variants === undefined ? {} : { variants: rule.variants }), ...(rule.states === undefined ? {} : { states: rule.states }), apply: Object.entries(rule.apply).map(([slot, style]) => normalizeSlot(recipe, inputWithNames, slot, style as CSSAuthoringStyleFragment, "condition", rule.source ?? source, `/conditions/${index}/apply/${escapePointerSegment(slot)}`, diagnostics)) }));
    if (recipe.snapshot.conditions.some((rule) => !analyzeConditionExpression(rule.when as ConditionExpression, input.conditionRegistry, conditionThresholds(input)).satisfiable)) diagnostics.push({ code: APPEARANCE_NORMALIZER_DIAGNOSTIC_CODE.CONDITION_CONTRADICTORY, severity: APPEARANCE_NORMALIZER_DIAGNOSTIC_SEVERITY.ERROR, message: "Condition rule contains no satisfiable registered environment combination." });
    analyzeCollisions(recipe, [...base, ...variantAxes.flatMap((axis) => axis.values.flatMap((value) => value.apply)), ...stateRules.map((rule) => ({ slot: rule.slot, declarations: rule.cases.flatMap((stateCase) => stateCase.apply) })), ...compoundRules.flatMap((rule) => rule.apply), ...conditionRules.flatMap((rule) => rule.apply)], inputWithNames, traceEntries, diagnostics);
    const trace: CollisionTrace = { ...emptyTrace, entries: traceEntries };
    if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) return detachAndFreeze({ diagnostics, trace });
    const appearance = { schemaVersion: APPEARANCE_NORMALIZER_SCHEMA_VERSION, profile: APPEARANCE_NORMALIZER_PROFILE_ID, profileInputDigest: input.propertyRegistry.profile.webrefInputDigest, recipeId: recipe.definition.id, slots: recipe.snapshot.slots, base, variantAxes, stateRules, compoundRules, conditionRules } as unknown as CSSAppearanceIR;
    return detachAndFreeze({ diagnostics, trace, appearance });
  },
});
