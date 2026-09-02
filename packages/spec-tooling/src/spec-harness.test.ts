import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { checkSpecification, validateFixtureDiagnostics } from "./spec-harness.js";

const specRoot = fileURLToPath(new URL("../../../spec/", import.meta.url));

describe("normative specification", () => {
  it("allows only fixture-suite warning codes declared in the manifest", () => {
    const backendWarning = {
      code: "AXM1012",
      severity: "warning" as const,
      phase: "motion" as const,
      message: "Backend validation is deferred.",
    };
    const discreteWarning = {
      code: "AXM1015",
      severity: "warning" as const,
      phase: "motion" as const,
      message: "Discrete Motion was explicitly accepted.",
    };

    expect(
      validateFixtureDiagnostics(
        [backendWarning, discreteWarning],
        ["AXM1012", "AXM1015"],
      ),
    ).toEqual([]);
    expect(validateFixtureDiagnostics([backendWarning])).toEqual([
      "AXM1012 : Backend validation is deferred.",
    ]);
  });

  it("validates every declared schema, registry, and conformance fixture", async () => {
    const report = await checkSpecification(specRoot);

    expect(report.schemaCount).toBe(34);
    expect(report.registryCount).toBe(14);
    expect(report.positiveFixtureCount).toBe(36);
    expect(report.negativeFixtureCount).toBe(62);
    expect(report.digests["canonical-state-registry"]).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
    expect(report.digests["condition-registry"]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.digests["foundation-resolved-token-manifest"]).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
    expect(report.digests["resolver-modifier-registry"]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.digests["semantic-token-vocabulary"]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.digests["token-domain-registry"]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.digests["token-source-profile"]).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
