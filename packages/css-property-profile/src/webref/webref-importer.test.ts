import { describe, expect, it } from "vitest";

import {
  WEBREF_INPUT_PATH,
  WEBREF_PACKAGE_VERSION,
} from "../constants.js";
import { loadPinnedWebref } from "./webref-importer.js";

describe("pinned Webref importer", () => {
  it("loads the exact consolidated input with stable provenance and ordering", async () => {
    const input = await loadPinnedWebref();

    expect(input.packageVersion).toBe(WEBREF_PACKAGE_VERSION);
    expect(input.inputPath).toBe(WEBREF_INPUT_PATH);
    expect(input.inputDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(input.properties).toHaveLength(818);
    expect(input.properties.map((property) => property.name)).toEqual(
      [...input.properties.map((property) => property.name)].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    );
    expect(input.properties.find((property) => property.name === "margin")).toMatchObject({
      longhands: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
    });
    expect(input.properties.find((property) => property.name === "-webkit-transform"))
      .toMatchObject({ legacyAliasOf: "transform" });
  });
});
