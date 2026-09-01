import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { checkSpecification } from "./spec-harness.js";

const specRoot = fileURLToPath(new URL("../../../spec/", import.meta.url));

describe("normative specification", () => {
  it("validates every declared schema, registry, and conformance fixture", async () => {
    const report = await checkSpecification(specRoot);

    expect(report.schemaCount).toBe(23);
    expect(report.registryCount).toBe(11);
    expect(report.positiveFixtureCount).toBe(15);
    expect(report.negativeFixtureCount).toBe(24);
    expect(report.digests["foundation-resolved-token-manifest"]).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
    expect(report.digests["resolver-modifier-registry"]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.digests["token-domain-registry"]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.digests["token-source-profile"]).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
