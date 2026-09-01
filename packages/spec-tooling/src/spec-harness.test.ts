import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { checkSpecification } from "./spec-harness.js";

const specRoot = fileURLToPath(new URL("../../../spec/", import.meta.url));

describe("normative specification", () => {
  it("validates every declared schema, registry, and conformance fixture", async () => {
    const report = await checkSpecification(specRoot);

    expect(report.schemaCount).toBe(16);
    expect(report.registryCount).toBe(3);
    expect(report.positiveFixtureCount).toBe(8);
    expect(report.negativeFixtureCount).toBe(17);
    expect(report.digests["resolver-modifier-registry"]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.digests["token-domain-registry"]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.digests["token-source-profile"]).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
