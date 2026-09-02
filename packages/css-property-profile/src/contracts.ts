import {
  CSS_POLICY_SCHEMA_VERSION,
  CSS_PROFILE_ID,
  CSS_PROFILE_SCHEMA_VERSION,
  EFFECTIVE_PROPERTY_REGISTRY_SCHEMA_VERSION,
  TOKEN_BINDING_CATALOG_SCHEMA_VERSION,
} from "./constants.js";
import type { CSSAuthoringProperty } from "./generated/css-property-names.js";

export type {
  CSSAuthoringProperty,
  CSSCanonicalProperty,
  CsstypeBackedAuthoringProperty,
} from "./generated/css-property-names.js";
export type CSSPropertyStatus =
  | "standard"
  | "experimental"
  | "deprecated"
  | "legacy"
  | "vendor";
export type CSSPropertyKind = "longhand" | "shorthand";
export type CSSValueKind = "css" | "token" | "css-template";
export type TokenBindingMode = "direct" | "template" | "projector";

export interface UpstreamCSSProperty {
  readonly name: string;
  readonly href: string;
  readonly syntax?: string;
  readonly inherited?: boolean | string;
  readonly initial?: string;
  readonly longhands?: readonly string[];
  readonly resetLonghands?: readonly string[];
  readonly legacyAliasOf?: string;
}

export interface CSSAppearanceProfileInputManifest {
  readonly schemaVersion: typeof CSS_PROFILE_SCHEMA_VERSION;
  readonly id: typeof CSS_PROFILE_ID;
  readonly webrefPackageVersion: string;
  readonly webrefInputPath: string;
  readonly webrefInputDigest: string;
  readonly generatorVersion: string;
  readonly policySourceDigest: string;
}

export interface EffectiveTokenBindingPolicy {
  readonly directDomains: readonly string[];
  readonly templateDomains: readonly string[];
  readonly projectors: readonly string[];
  readonly allowsTokenNegation: boolean;
}

export interface PropertyPolicyPatch {
  readonly authoring?: "allowed" | "opt-in" | "blocked";
  readonly valueKinds?: readonly CSSValueKind[];
  readonly rawCSS?: "allowed" | "warning" | "blocked";
  readonly shorthand?: "not-applicable" | "allowed" | "warning" | "blocked";
  readonly portability?: "portable-candidate" | "web-specific" | "unknown";
  readonly motion?: "interpolable" | "discrete" | "not-animatable" | "unknown";
  readonly resources?: "allowed" | "reported" | "blocked";
}

export interface SparsePropertyPolicyGroup extends PropertyPolicyPatch {
  readonly id: string;
  readonly properties: readonly string[];
}

export interface SparsePropertyPolicyOverride extends PropertyPolicyPatch {
  readonly property: string;
  readonly status?: CSSPropertyStatus;
}

export interface SparsePropertyPolicySource {
  readonly schemaVersion: typeof CSS_POLICY_SCHEMA_VERSION;
  readonly defaults: Readonly<
    Record<
      "standard" | "experimental" | "deprecated" | "legacy" | "vendor",
      PropertyPolicyPatch
    >
  >;
  readonly groups: readonly SparsePropertyPolicyGroup[];
  readonly overrides: readonly SparsePropertyPolicyOverride[];
  readonly blockedProperties: readonly string[];
  readonly customProperties: readonly string[];
}

export interface TokenBindingCatalogEntry {
  readonly id: string;
  readonly properties?: readonly string[];
  readonly expandShorthands?: readonly string[];
  readonly directDomains: readonly string[];
  readonly templateDomains: readonly string[];
  readonly projectors: readonly string[];
  readonly allowsTokenNegation: boolean;
}

export interface TokenBindingCatalog {
  readonly schemaVersion: typeof TOKEN_BINDING_CATALOG_SCHEMA_VERSION;
  readonly conditionOnlyDomains: readonly string[];
  readonly bindings: readonly TokenBindingCatalogEntry[];
}

export interface PolicyProvenance {
  readonly source: string;
  readonly rule: string;
}

export interface EffectivePropertyPolicy {
  readonly authoring: "allowed" | "opt-in" | "blocked";
  readonly valueKinds: readonly CSSValueKind[];
  readonly tokenBindings: EffectiveTokenBindingPolicy;
  readonly rawCSS: "allowed" | "warning" | "blocked";
  readonly shorthand: "not-applicable" | "allowed" | "warning" | "blocked";
  readonly portability: "portable-candidate" | "web-specific" | "unknown";
  readonly motion: "interpolable" | "discrete" | "not-animatable" | "unknown";
  readonly security: { readonly resources: "allowed" | "reported" | "blocked" };
  readonly provenance: readonly PolicyProvenance[];
}

export interface EffectiveCSSPropertyEntry {
  readonly name: string;
  readonly authoringName: string;
  readonly syntax: string | null;
  readonly sourceHref: string;
  readonly status: CSSPropertyStatus;
  readonly kind: CSSPropertyKind;
  readonly inherited: boolean | null;
  readonly initialValue: string | null;
  readonly longhands: readonly string[];
  readonly resetLonghands: readonly string[];
  readonly legacyAliasOf?: string;
  readonly policy: EffectivePropertyPolicy;
}

export interface EffectiveCSSPropertyRegistry {
  readonly schemaVersion: typeof EFFECTIVE_PROPERTY_REGISTRY_SCHEMA_VERSION;
  readonly profile: CSSAppearanceProfileInputManifest;
  readonly properties: readonly EffectiveCSSPropertyEntry[];
  readonly aliases: Readonly<Record<string, string>>;
  readonly authoringNames: Readonly<Record<string, string>>;
  readonly customProperties: readonly string[];
}

export interface TokenBindingCoverageReport {
  readonly schemaVersion: typeof EFFECTIVE_PROPERTY_REGISTRY_SCHEMA_VERSION;
  readonly profileDigest: string;
  readonly direct: Readonly<Record<string, readonly string[]>>;
  readonly template: Readonly<Record<string, readonly string[]>>;
  readonly projectors: Readonly<Record<string, readonly string[]>>;
  readonly properties: Readonly<Record<string, EffectiveTokenBindingPolicy>>;
}

export interface PropertyProfileDiff {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changed: readonly string[];
}

export interface PropertyDiagnostic {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly phase: "propertyProfile" | "property";
  readonly message: string;
  readonly property?: string;
  readonly details?: Readonly<Record<string, boolean | number | string | null>>;
}

export type CSSGrammarResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly diagnostics: readonly PropertyDiagnostic[] };

export interface CSSGrammarValidatorOptions {
  readonly enabledExperimentalProperties?: readonly string[];
  readonly allowCustomPropertyReferences?: boolean;
}

export interface PropertyProfileGenerationInput {
  readonly upstreamProperties: readonly UpstreamCSSProperty[];
  readonly profile: CSSAppearanceProfileInputManifest;
  readonly policy: SparsePropertyPolicySource;
  readonly bindings: TokenBindingCatalog;
  readonly tokenDomains: readonly string[];
  readonly projectors: readonly string[];
}
