import type {
  EffectiveCSSPropertyEntry,
  EffectiveCSSPropertyRegistry,
  PropertyProfileDiff,
} from "../contracts.js";
import { serializeCanonicalJson } from "./canonical-json.js";
import { compareStableStrings } from "./stable-string-order.js";

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
  const added = [...nextEntries.keys()]
    .filter((name) => !previousEntries.has(name))
    .sort(compareStableStrings);
  const removed = [...previousEntries.keys()]
    .filter((name) => !nextEntries.has(name))
    .sort(compareStableStrings);
  const changed = [...nextEntries.entries()]
    .filter(([name, entry]) => {
      const previousEntry = previousEntries.get(name);
      return (
        previousEntry !== undefined &&
        serializeCanonicalJson(previousEntry) !== serializeCanonicalJson(entry)
      );
    })
    .map(([name]) => name)
    .sort(compareStableStrings);
  return { added, removed, changed };
};
