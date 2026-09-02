import { describe, expect, it } from "vitest";

import { canonicalJsonDigest } from "../canonical-json.js";
import {
  BEHAVIOR_DIAGNOSTIC_PHASE,
  SPEC_DIAGNOSTIC_CODE,
} from "../constants.js";
import { runSemanticValidator } from "../semantic-validators.js";
import {
  canonicalBehaviorCriteriaSourceManifest,
  validateBehaviorCriteriaPair,
  validateBehaviorCriteriaSourceManifest,
  validateComponentBehaviorCriteriaProfile,
} from "./behavior-criteria-validator.js";

const SOURCE_MANIFEST = {
  schemaVersion: "0.1",
  provider: "react-aria",
  packages: [
    {
      name: "react-aria",
      version: "0.0.0-fixture",
      integrity: "sha512-fixture-react-aria",
    },
    {
      name: "react-aria-components",
      version: "0.0.0-fixture",
      integrity: "sha512-fixture-components",
    },
    {
      name: "react-stately",
      version: "0.0.0-fixture",
      integrity: "sha512-fixture-stately",
    },
  ],
  evidence: [
    {
      id: "react-aria.button.fixture",
      url: "https://react-aria.adobe.com/Button",
      digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      retrievalPolicy: "pinned-artifact",
      artifactPath: "fixtures/behavior-evidence/button.fixture.html",
    },
  ],
};

const withManifestDigest = (
  value: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => ({
  ...value,
  manifestDigest: canonicalJsonDigest(value),
});

const BUTTON_CRITERION = {
  id: "BTN-SEM-001",
  category: "semantics",
  part: "root",
  requirement: "Fixture Button retains button semantics.",
  evidenceIds: ["react-aria.button.fixture"],
  verification: ["schema"],
} as const;

describe("Behavior Criteria semantic validation", () => {
  it("derives the source manifest payload without its self digest", () => {
    const payload = canonicalBehaviorCriteriaSourceManifest({
      ...SOURCE_MANIFEST,
      manifestDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    expect(payload).not.toHaveProperty("manifestDigest");
    expect(payload).toMatchObject(SOURCE_MANIFEST);
  });

  it("rejects a source manifest whose digest does not match its canonical payload", () => {
    const diagnostics = validateBehaviorCriteriaSourceManifest({
      ...SOURCE_MANIFEST,
      manifestDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    expect(diagnostics).toContainEqual(expect.objectContaining({
      code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_MANIFEST_DIGEST_MISMATCH,
      phase: BEHAVIOR_DIAGNOSTIC_PHASE,
    }));
  });

  it("rejects invalid, duplicate, or unordered source identities", () => {
    const invalidPackageSet = {
      ...SOURCE_MANIFEST,
      packages: SOURCE_MANIFEST.packages.slice(0, 2),
    };
    const unorderedPackages = {
      ...SOURCE_MANIFEST,
      packages: [...SOURCE_MANIFEST.packages].reverse(),
    };
    const duplicateEvidence = {
      ...SOURCE_MANIFEST,
      evidence: [SOURCE_MANIFEST.evidence[0], SOURCE_MANIFEST.evidence[0]],
    };

    expect(
      validateBehaviorCriteriaSourceManifest(withManifestDigest(invalidPackageSet))
        .map((diagnostic) => diagnostic.code),
    ).toContain(SPEC_DIAGNOSTIC_CODE.BEHAVIOR_PACKAGE_SET);
    expect(
      validateBehaviorCriteriaSourceManifest(withManifestDigest(unorderedPackages))
        .map((diagnostic) => diagnostic.code),
    ).toContain(SPEC_DIAGNOSTIC_CODE.BEHAVIOR_PACKAGE_ORDER);
    expect(
      validateBehaviorCriteriaSourceManifest(withManifestDigest(duplicateEvidence))
        .map((diagnostic) => diagnostic.code),
    ).toContain(SPEC_DIAGNOSTIC_CODE.BEHAVIOR_EVIDENCE_ORDER);
  });

  it("rejects a profile whose id disagrees with its component", () => {
    const diagnostics = validateComponentBehaviorCriteriaProfile(
      {
        schemaVersion: "0.1",
        id: "react-aria.button",
        component: "dialog",
        sourceManifestDigest:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        criteria: [
          {
            id: "DLG-SEM-001",
            category: "semantics",
            part: "popup",
            requirement: "Fixture Dialog has semantics.",
            evidenceIds: ["react-aria.button.fixture"],
            verification: ["schema"],
          },
        ],
      },
    );

    expect(diagnostics).toContainEqual(expect.objectContaining({
      code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_PROFILE_IDENTITY,
      phase: BEHAVIOR_DIAGNOSTIC_PHASE,
    }));
  });

  it("rejects duplicate, unordered, or cross-component criterion identities", () => {
    const profile = {
      schemaVersion: "0.1",
      id: "react-aria.button",
      component: "button",
      sourceManifestDigest:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const duplicate = validateComponentBehaviorCriteriaProfile({
      ...profile,
      criteria: [BUTTON_CRITERION, BUTTON_CRITERION],
    });
    const unordered = validateComponentBehaviorCriteriaProfile({
      ...profile,
      criteria: [
        { ...BUTTON_CRITERION, id: "BTN-SEM-002" },
        BUTTON_CRITERION,
      ],
    });
    const wrongNamespace = validateComponentBehaviorCriteriaProfile({
      ...profile,
      criteria: [{ ...BUTTON_CRITERION, id: "DLG-SEM-001" }],
    });

    expect(duplicate.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.BEHAVIOR_CRITERION_DUPLICATE,
    );
    expect(unordered.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.BEHAVIOR_CRITERION_ORDER,
    );
    expect(wrongNamespace.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.BEHAVIOR_CRITERION_NAMESPACE,
    );
  });

  it("rejects profiles with a stale source digest or unknown evidence", () => {
    const diagnostics = validateBehaviorCriteriaPair(
      { ...SOURCE_MANIFEST, manifestDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      {
        schemaVersion: "0.1", id: "react-aria.button", component: "button",
        sourceManifestDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        criteria: [{ id: "BTN-SEM-001", category: "semantics", part: "root", requirement: "Fixture.", evidenceIds: ["missing.evidence"], verification: ["schema"] }],
      },
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.BEHAVIOR_SOURCE_DIGEST_MISMATCH,
    );
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.BEHAVIOR_UNKNOWN_EVIDENCE,
    );
  });

  it("fails closed when a profile has no related source manifest", () => {
    const diagnostics = runSemanticValidator(
      "component-behavior-criteria-profile",
      {
        schemaVersion: "0.1",
        id: "react-aria.button",
        component: "button",
        sourceManifestDigest:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        criteria: [BUTTON_CRITERION],
      },
      { registries: {} },
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      SPEC_DIAGNOSTIC_CODE.BEHAVIOR_SOURCE_MANIFEST_MISSING,
    );
  });
});
