import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SPEC_DIAGNOSTIC_CODE } from "./constants.js";
import {
  checkSpecification,
  createMotionAuthorityValidationPort,
  validateFixtureDiagnostics,
  validatePinnedEvidenceArtifacts,
} from "./spec-harness.js";

const specRoot = fileURLToPath(new URL("../../../spec/", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

describe("normative specification", () => {
  it("refuses to preload the Motion authority port from an invalid manifest", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "axiom-motion-port-manifest-"));
    const temporarySpecRoot = join(temporaryRoot, "spec");
    try {
      await cp(specRoot, temporarySpecRoot, { recursive: true });
      const manifestPath = join(temporarySpecRoot, "manifest.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
      delete manifest["dialect"];
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      await expect(createMotionAuthorityValidationPort(temporarySpecRoot)).rejects.toThrow(
        /manifest\.json: schema validation failed/,
      );
    } finally {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  it("refuses to preload the Motion authority port when a pinned schema path changes", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "axiom-motion-port-inventory-"));
    const temporarySpecRoot = join(temporaryRoot, "spec");
    try {
      await cp(specRoot, temporarySpecRoot, { recursive: true });
      const manifestPath = join(temporarySpecRoot, "manifest.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
        schemas: Array<{ id: string; path: string }>;
      };
      const appearance = manifest.schemas.find(
        (entry) => entry.id === "https://axiom.dev/schemas/css/appearance-ir/0.1",
      );
      expect(appearance).toBeDefined();
      if (appearance === undefined) return;
      appearance.path = "css/declaration.schema.json";
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      await expect(createMotionAuthorityValidationPort(temporarySpecRoot)).rejects.toThrow(
        /pinned Motion authority schema.*appearance/i,
      );
    } finally {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

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

    expect(report.schemaCount).toBe(37);
    expect(report.registryCount).toBe(14);
    expect(report.positiveFixtureCount).toBe(47);
    expect(report.negativeFixtureCount).toBe(88);
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

  it("rejects evidence digest drift and symlink escape while accepting pinned bytes", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "axiom-evidence-"));
    const repositoryRoot = join(temporaryRoot, "repository");
    const artifactPath = join(repositoryRoot, "evidence.html");
    const externalPath = join(temporaryRoot, "external.html");
    const content = "pinned evidence\n";
    await mkdir(repositoryRoot);
    await Promise.all([
      writeFile(artifactPath, content),
      writeFile(externalPath, content),
    ]);
    await symlink(externalPath, join(repositoryRoot, "escaped.html"));
    const digest = `sha256:${createHash("sha256").update(content).digest("hex")}`;
    const evidence = (path: string, pinnedDigest: string) => ({
      evidence: [{
        retrievalPolicy: "pinned-artifact",
        artifactPath: path,
        digest: pinnedDigest,
      }],
    });

    try {
      await expect(
        validatePinnedEvidenceArtifacts(
          evidence("evidence.html", digest),
          repositoryRoot,
        ),
      ).resolves.toEqual([]);
      await expect(
        validatePinnedEvidenceArtifacts(
          evidence(
            "evidence.html",
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          ),
          repositoryRoot,
        ),
      ).resolves.toEqual([
        expect.objectContaining({
          code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_EVIDENCE_DIGEST_MISMATCH,
          phase: "behavior",
          severity: "error",
          target: "evidence.html",
        }),
      ]);
      await expect(
        validatePinnedEvidenceArtifacts(
          evidence("escaped.html", digest),
          repositoryRoot,
        ),
      ).resolves.toEqual([
        expect.objectContaining({
          code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_EVIDENCE_REPOSITORY_ESCAPE,
          phase: "behavior",
          severity: "error",
          target: "escaped.html",
        }),
      ]);
    } finally {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  it("validates a related fixture against its declared schema before pairing", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "axiom-related-fixture-"));
    const temporarySpecRoot = join(temporaryRoot, "spec");
    try {
      await cp(specRoot, temporarySpecRoot, { recursive: true });
      await mkdir(join(temporaryRoot, "fixtures"), { recursive: true });
      await cp(
        join(repositoryRoot, "fixtures", "behavior-evidence"),
        join(temporaryRoot, "fixtures", "behavior-evidence"),
        { recursive: true },
      );
      const manifestPath = join(temporarySpecRoot, "manifest.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
        fixtureSuites: Array<{
          id: string;
          relatedFixtures?: { source?: { path: string } };
        }>;
      };
      const profileSuite = manifest.fixtureSuites.find(
        (suite) => suite.id === "component-behavior-criteria-profile",
      );
      expect(profileSuite?.relatedFixtures?.source).toBeDefined();
      if (profileSuite?.relatedFixtures?.source === undefined) return;
      profileSuite.relatedFixtures.source.path =
        "fixtures/related/schema-invalid-source.json";
      await mkdir(join(temporarySpecRoot, "fixtures", "related"), {
        recursive: true,
      });
      await Promise.all([
        writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`),
        writeFile(
          join(
            temporarySpecRoot,
            "fixtures",
            "related",
            "schema-invalid-source.json",
          ),
          `${JSON.stringify({
            manifestDigest:
              "sha256:f0735cfd23b13c35a497ad8b35c5f91a466e3021bfcb14762c3e43c028ba8ddf",
            evidence: [
              { id: "react-aria.button.fixture" },
              { id: "react-aria.dialog.fixture" },
              { id: "react-aria.select.fixture" },
            ],
          })}\n`,
        ),
      ]);

      await expect(checkSpecification(temporarySpecRoot)).rejects.toThrow(
        /source: related fixture .* is invalid/,
      );
    } finally {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });
});
