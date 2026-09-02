import type {
  BehaviorCriteriaSourceManifest,
  ComponentBehaviorCriteriaProfile,
} from "./reference-contracts.js";

const source = {
  schemaVersion: "0.1",
  provider: "react-aria",
  packages: [
    { name: "react-aria", version: "0.0.0", integrity: "sha512-example" },
    { name: "react-aria-components", version: "0.0.0", integrity: "sha512-example" },
    { name: "react-stately", version: "0.0.0", integrity: "sha512-example" },
  ],
  evidence: [{
    id: "button.source",
    url: "https://example.test/button",
    digest: "sha256:example",
    retrievalPolicy: "pinned-artifact",
    artifactPath: "fixtures/behavior/button.json",
  }],
  manifestDigest: "sha256:example",
} as const satisfies BehaviorCriteriaSourceManifest;

const profile = {
  schemaVersion: "0.1",
  id: "react-aria.button",
  component: "button",
  sourceManifestDigest: source.manifestDigest,
  criteria: [{
    id: "BTN-SEM-001",
    category: "semantics",
    part: "root",
    requirement: "Exposes a button role.",
    evidenceIds: ["button.source"],
    verification: ["schema", "type"],
  }],
} as const satisfies ComponentBehaviorCriteriaProfile;

void profile;

// @ts-expect-error Behavior source manifests are pinned to the N17 provider identity.
const invalidSource: BehaviorCriteriaSourceManifest = { ...source, provider: "other" };

void invalidSource;
