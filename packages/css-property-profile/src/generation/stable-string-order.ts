import { STABLE_SORT_LOCALE } from "../constants.js";

export const compareStableStrings = (left: string, right: string): number =>
  left.localeCompare(right, STABLE_SORT_LOCALE);

export const uniqueSortedStrings = (
  values: readonly string[],
): readonly string[] => [...new Set(values)].sort(compareStableStrings);
