import { describe, expect, it } from "vitest";

import {
  compareStableStrings,
  uniqueSortedStrings,
} from "./stable-string-order.js";

describe("stable generation order", () => {
  it("sorts strings deterministically and removes duplicates", () => {
    expect(["z-index", "align-items", "display"].sort(compareStableStrings)).toEqual([
      "align-items",
      "display",
      "z-index",
    ]);
    expect(uniqueSortedStrings(["display", "align-items", "display"])).toEqual([
      "align-items",
      "display",
    ]);
  });
});
