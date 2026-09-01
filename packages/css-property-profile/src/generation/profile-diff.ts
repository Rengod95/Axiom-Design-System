import { STABLE_SORT_LOCALE } from "../constants.js";
import type {
  EffectiveCSSPropertyEntry,
  EffectiveCSSPropertyRegistry,
  PropertyProfileDiff,
} from "../contracts.js";
import { serializeCanonicalJson } from "./canonical-json.js";

const compare = (left: string, right: string): number =>
  left.localeCompare(right, STABLE_SORT_LOCALE);

const entriesByName = (
  registry: EffectiveCSSPropertyRegistry,
): ReadonlyMap<string, EffectiveCSSPropertyEntry> =>
  new Map(registry.properties.map((entry) => [entry.name, entry]));

export const diffPropertyProfiles = (
  previous: EffectiveCSSPropertyRegistry,
  next: EffectiveCSSPropertyRegistry,
): PropertyProfileDiff => {
  const previousEntries = entriesByName(previous);
  const nextEntries = entriesByName(next);
  const added = [...nextEntries.keys()].filter((name) => !previousEntries.has(name)).sort(compare);
  const removed = [...previousEntries.keys()].filter((name) => !nextEntries.has(name)).sort(compare);
  const changed = [...nextEntries.entries()]
    .filter(([name, entry]) => {
      const previousEntry = previousEntries.get(name);
      return (
        previousEntry !== undefined &&
        serializeCanonicalJson(previousEntry) !== serializeCanonicalJson(entry)
      );
    })
    .map(([name]) => name)
    .sort(compare);
  return { added, removed, changed };
};
