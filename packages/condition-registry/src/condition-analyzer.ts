import type {
  ConditionExpression,
  ConditionRegistry,
} from "./generated/reference-contracts.js";

/** Provides the resolved numeric breakpoint values required for Condition relation analysis. */
export type ConditionThresholds = Readonly<Record<string, number>>;

/** Names the deterministic relationship of the left Condition expression to the right expression. */
export type ConditionRelation = "disjoint" | "equivalent" | "overlap" | "subset" | "superset";

/** Reports whether a bounded Condition expression has at least one satisfiable OR choice. */
export interface ConditionExpressionAnalysis {
  readonly satisfiable: boolean;
}

/** Reports a pairwise Condition relation without compiling a query or reading repository state. */
export interface ConditionPairAnalysis extends ConditionExpressionAnalysis {
  readonly relation: ConditionRelation;
}

type Interval = Readonly<{ readonly lower?: number; readonly upper?: number }>;
type Region = Readonly<{ readonly intervals: ReadonlyMap<string, Interval>; readonly preferences: ReadonlySet<string> }>;

/** Reads the bounded OR choices of one closed Condition expression. */
const choices = (expression: ConditionExpression): readonly (readonly string[])[] => expression.all.map((clause) =>
  typeof clause === "string" ? [clause] : clause.any,
);

/** Builds the range family that must share bounds during overlap analysis. */
const family = (condition: Record<string, unknown>): string | undefined => {
  if (condition["kind"] === "viewport" && condition["feature"] === "width") return "viewport:width";
  if (condition["kind"] === "container" && condition["feature"] === "inline-size" && typeof condition["container"] === "string") return `container:${condition["container"]}:inline-size`;
  return undefined;
};

/** Tests whether a range interval is internally satisfiable. */
const isSatisfiableInterval = (interval: Interval): boolean =>
  interval.lower === undefined || interval.upper === undefined || interval.lower < interval.upper;

/** Adds one registered Condition to a copied logical region. */
const addCondition = (
  region: Region,
  id: string,
  definitions: ReadonlyMap<string, Record<string, unknown>>,
  thresholds: ConditionThresholds,
): Region | undefined => {
  const condition = definitions.get(id);
  if (condition === undefined) return undefined;
  if (typeof condition["kind"] !== "string") return region;
  if (condition["kind"] === "preference") {
    const preference = `preference:${condition["feature"]}:${condition["equals"]}`;
    const [, feature] = preference.split(":", 3);
    if ([...region.preferences].some((candidate) => candidate.split(":", 3)[1] === feature && candidate !== preference)) return undefined;
    return {
    intervals: region.intervals,
    preferences: new Set([...region.preferences, preference]),
  };
  }
  const rangeFamily = family(condition);
  const token = condition["value"];
  if (rangeFamily === undefined || typeof token !== "object" || token === null || typeof (token as Record<string, unknown>)["path"] !== "string") return undefined;
  const threshold = thresholds[(token as Record<string, unknown>)["path"] as string];
  if (typeof threshold !== "number" || !Number.isFinite(threshold)) return undefined;
  const current = region.intervals.get(rangeFamily) ?? {};
  const next: Interval = condition["comparison"] === ">="
    ? { ...current, lower: Math.max(current.lower ?? -Infinity, threshold) }
    : condition["comparison"] === "<"
      ? { ...current, upper: Math.min(current.upper ?? Infinity, threshold) }
      : current;
  if (!isSatisfiableInterval(next)) return undefined;
  const intervals = new Map(region.intervals);
  intervals.set(rangeFamily, next);
  return { intervals, preferences: region.preferences };
};

/** Expands one bounded AND/simple-OR expression into its satisfiable logical regions. */
const regions = (
  expression: ConditionExpression,
  registry: ConditionRegistry,
  thresholds: ConditionThresholds,
): readonly Region[] => {
  const definitions = new Map(registry.conditions.map((condition) => [condition.id, condition as unknown as Record<string, unknown>]));
  let result: readonly Region[] = [{ intervals: new Map(), preferences: new Set() }];
  for (const choice of choices(expression)) {
    const next: Region[] = [];
    for (const region of result) for (const id of choice) {
      const candidate = addCondition(region, id, definitions, thresholds);
      if (candidate !== undefined) next.push(candidate);
    }
    result = next;
  }
  return result;
};

/** Returns whether every constraint in the outer region admits the inner region. */
const contains = (outer: Region, inner: Region): boolean => {
  for (const preference of outer.preferences) if (!inner.preferences.has(preference)) return false;
  for (const [name, outerInterval] of outer.intervals) {
    const innerInterval = inner.intervals.get(name) ?? {};
    if (outerInterval.lower !== undefined && (innerInterval.lower === undefined || innerInterval.lower < outerInterval.lower)) return false;
    if (outerInterval.upper !== undefined && (innerInterval.upper === undefined || innerInterval.upper > outerInterval.upper)) return false;
  }
  return true;
};

/** Returns whether two regions can be true at the same time. */
const overlaps = (left: Region, right: Region): boolean => {
  for (const preference of left.preferences) {
    const [, feature] = preference.split(":", 3);
    if (feature !== undefined && [...right.preferences].some((candidate) => {
      const [, candidateFeature] = candidate.split(":", 3);
      return candidateFeature === feature && candidate !== preference;
    })) return false;
  }
  const names = new Set([...left.intervals.keys(), ...right.intervals.keys()]);
  for (const name of names) {
    const leftInterval = left.intervals.get(name) ?? {};
    const rightInterval = right.intervals.get(name) ?? {};
    if (!isSatisfiableInterval({ lower: Math.max(leftInterval.lower ?? -Infinity, rightInterval.lower ?? -Infinity), upper: Math.min(leftInterval.upper ?? Infinity, rightInterval.upper ?? Infinity) })) return false;
  }
  return true;
};

/** Determines whether every region in left is contained by at least one region in right. */
const isSubset = (left: readonly Region[], right: readonly Region[]): boolean =>
  left.every((candidate) => right.some((container) => contains(container, candidate)));

/** Analyses bounded Condition satisfiability using only supplied registry and threshold values. */
export const analyzeConditionExpression = (
  expression: ConditionExpression,
  registry: ConditionRegistry,
  thresholds: ConditionThresholds,
): ConditionExpressionAnalysis => ({ satisfiable: regions(expression, registry, thresholds).length > 0 });

/** Compares two bounded Condition expressions without emitting CSS or evaluating browser state. */
export const analyzeConditionPair = (
  left: ConditionExpression,
  right: ConditionExpression,
  registry: ConditionRegistry,
  thresholds: ConditionThresholds,
): ConditionPairAnalysis => {
  const leftRegions = regions(left, registry, thresholds);
  const rightRegions = regions(right, registry, thresholds);
  const satisfiable = leftRegions.some((leftRegion) => rightRegions.some((rightRegion) => overlaps(leftRegion, rightRegion)));
  if (!satisfiable) return { satisfiable: false, relation: "disjoint" };
  const leftSubset = isSubset(leftRegions, rightRegions);
  const rightSubset = isSubset(rightRegions, leftRegions);
  if (leftSubset && rightSubset) return { satisfiable: true, relation: "equivalent" };
  if (leftSubset) return { satisfiable: true, relation: "subset" };
  if (rightSubset) return { satisfiable: true, relation: "superset" };
  return { satisfiable: true, relation: "overlap" };
};
