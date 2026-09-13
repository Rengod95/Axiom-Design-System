import type { JsonValue, ValidationProfile } from "./contracts.ts";
import { DOMAIN_PROFILE, STRUCTURAL_PROFILE } from "./constants.ts";
import { inspectDocumentStructure } from "./structural-validation.ts";
import { inspectDocumentDomain } from "./domain-validation.ts";

/** Adoption only moves to a stronger policy; a format flag cannot downgrade it. */
export function strongestValidationProfile(...profiles: (ValidationProfile | undefined)[]): ValidationProfile | undefined {
  if (profiles.includes(DOMAIN_PROFILE)) return DOMAIN_PROFILE;
  return profiles.includes(STRUCTURAL_PROFILE) ? STRUCTURAL_PROFILE : undefined;
}

/** Keep policy selection identical for source repair, mutation and history checks. */
export function inspectProfileDocument(document: JsonValue, profile: ValidationProfile, sourceRef?: string) {
  return profile === DOMAIN_PROFILE ? inspectDocumentDomain(document, sourceRef) : inspectDocumentStructure(document, sourceRef);
}
