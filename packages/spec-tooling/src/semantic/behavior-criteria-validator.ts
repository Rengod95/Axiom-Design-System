import { canonicalJsonDigest } from "../canonical-json.js";
import {
  BEHAVIOR_DIAGNOSTIC_PHASE,
  BEHAVIOR_CRITERION_PREFIX,
  BEHAVIOR_PROVIDER_ID,
  BEHAVIOR_REQUIRED_PACKAGE_NAMES,
  SPEC_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
} from "../constants.js";
import type { Diagnostic } from "../types.js";
import { isUnknownRecord } from "../validation/unknown-record.js";
import { createSemanticDiagnosticFactory } from "./semantic-diagnostic.js";

const behaviorDiagnostic = createSemanticDiagnosticFactory(BEHAVIOR_DIAGNOSTIC_PHASE);

/** Returns manifest data without its self-referential digest field. */
export const canonicalBehaviorCriteriaSourceManifest = (
  value: unknown,
): Readonly<Record<string, unknown>> => {
  if (!isUnknownRecord(value)) return {};
  const { manifestDigest: _manifestDigest, ...payload } = value;
  return payload;
};

/** Validates source-manifest provenance and canonical identity ordering. */
export const validateBehaviorCriteriaSourceManifest = (
  value: unknown,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value)) return [];
  const diagnostics: Diagnostic[] = [];
  if (
    value["manifestDigest"] !==
    canonicalJsonDigest(canonicalBehaviorCriteriaSourceManifest(value))
  ) {
    diagnostics.push(
      behaviorDiagnostic(
        SPEC_DIAGNOSTIC_CODE.BEHAVIOR_MANIFEST_DIGEST_MISMATCH,
        "Source Manifest self digest does not match its canonical payload.",
        "/manifestDigest",
      ),
    );
  }
  for (const [key, code] of [
    ["packages", SPEC_DIAGNOSTIC_CODE.BEHAVIOR_PACKAGE_ORDER],
    ["evidence", SPEC_DIAGNOSTIC_CODE.BEHAVIOR_EVIDENCE_ORDER],
  ] as const) {
    const entries = Array.isArray(value[key]) ? value[key].filter(isUnknownRecord) : [];
    const identityKey = key === "packages" ? "name" : "id";
    const ids = entries
      .map((entry) => entry[identityKey])
      .filter((id): id is string => typeof id === "string");
    const unordered = ids.some(
      (id, index) =>
        index > 0 &&
        ids[index - 1]!.localeCompare(id, STABLE_SORT_LOCALE) > 0,
    );
    if (new Set(ids).size !== ids.length || unordered) {
      diagnostics.push(
        behaviorDiagnostic(
          code,
          `${key} must have unique ascending identities.`,
          `/${key}`,
        ),
      );
    }
    const allowedPackages: readonly string[] = [
      ...BEHAVIOR_REQUIRED_PACKAGE_NAMES,
      "@react-aria/test-utils",
    ];
    const hasInvalidPackageSet =
      ids.length < 3 ||
      ids.length > 4 ||
      !BEHAVIOR_REQUIRED_PACKAGE_NAMES.every((id) => ids.includes(id)) ||
      ids.some((id) => !allowedPackages.includes(id));
    if (key === "packages" && hasInvalidPackageSet) {
      diagnostics.push(
        behaviorDiagnostic(
          SPEC_DIAGNOSTIC_CODE.BEHAVIOR_PACKAGE_SET,
          "Source Manifest package set must contain the required React Aria packages and only the optional test utility.",
          "/packages",
        ),
      );
    }
  }
  return diagnostics;
};

/** Validates profile-local identity and deterministic criterion ordering. */
export const validateComponentBehaviorCriteriaProfile = (
  value: unknown,
): readonly Diagnostic[] => {
  if (!isUnknownRecord(value) || !Array.isArray(value["criteria"])) return [];
  const diagnostics: Diagnostic[] = [];
  const component = value["component"];
  if (
    typeof component === "string" &&
    value["id"] !== `${BEHAVIOR_PROVIDER_ID}.${component}`
  ) {
    diagnostics.push(
      behaviorDiagnostic(
        SPEC_DIAGNOSTIC_CODE.BEHAVIOR_PROFILE_IDENTITY,
        "Profile id must equal the provider and component identity.",
        "/id",
      ),
    );
  }
  const ids = value["criteria"]
    .filter(isUnknownRecord)
    .map((criterion) => criterion["id"])
    .filter((id): id is string => typeof id === "string");
  const prefix =
    typeof component === "string"
      ? BEHAVIOR_CRITERION_PREFIX[
        component as keyof typeof BEHAVIOR_CRITERION_PREFIX
      ]
      : undefined;
  if (prefix !== undefined && ids.some((id) => !id.startsWith(`${prefix}-`))) {
    diagnostics.push(
      behaviorDiagnostic(
        SPEC_DIAGNOSTIC_CODE.BEHAVIOR_CRITERION_NAMESPACE,
        "Criteria must use the namespace for their component.",
        "/criteria",
      ),
    );
  }
  if (new Set(ids).size !== ids.length) {
    diagnostics.push(
      behaviorDiagnostic(
        SPEC_DIAGNOSTIC_CODE.BEHAVIOR_CRITERION_DUPLICATE,
        "Criteria must have unique ids.",
        "/criteria",
      ),
    );
  }
  if (
    ids.some(
      (id, index) =>
        index > 0 &&
        ids[index - 1]!.localeCompare(id, STABLE_SORT_LOCALE) > 0,
    )
  ) {
    diagnostics.push(
      behaviorDiagnostic(
        SPEC_DIAGNOSTIC_CODE.BEHAVIOR_CRITERION_ORDER,
        "Criteria must be serialized in ascending id order.",
        "/criteria",
      ),
    );
  }
  return diagnostics;
};

/** Validates that a profile references the exact source manifest and its evidence. */
export const validateBehaviorCriteriaPair = (
  source: unknown,
  profile: unknown,
): readonly Diagnostic[] => {
  if (
    !isUnknownRecord(source) ||
    !isUnknownRecord(profile) ||
    !Array.isArray(profile["criteria"])
  ) {
    return [];
  }
  const diagnostics: Diagnostic[] = [];
  if (profile["sourceManifestDigest"] !== source["manifestDigest"]) {
    diagnostics.push(
      behaviorDiagnostic(
        SPEC_DIAGNOSTIC_CODE.BEHAVIOR_SOURCE_DIGEST_MISMATCH,
        "Profile sourceManifestDigest does not match the declared source manifest.",
        "/sourceManifestDigest",
      ),
    );
  }
  const evidence = new Set(
    (Array.isArray(source["evidence"]) ? source["evidence"] : [])
      .filter(isUnknownRecord)
      .map((entry) => entry["id"])
      .filter((id): id is string => typeof id === "string"),
  );
  profile["criteria"].filter(isUnknownRecord).forEach((criterion, index) => {
    const evidenceIds = Array.isArray(criterion["evidenceIds"])
      ? criterion["evidenceIds"]
      : [];
    evidenceIds.forEach((id, evidenceIndex) => {
      if (typeof id === "string" && !evidence.has(id)) {
        diagnostics.push(
          behaviorDiagnostic(
            SPEC_DIAGNOSTIC_CODE.BEHAVIOR_UNKNOWN_EVIDENCE,
            `Criterion evidence '${id}' is absent from the source manifest.`,
            `/criteria/${index}/evidenceIds/${evidenceIndex}`,
          ),
        );
      }
    });
  });
  return diagnostics;
};
