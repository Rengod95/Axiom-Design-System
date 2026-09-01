import {
  EFFECTIVE_PROPERTY_REGISTRY_SCHEMA_VERSION,
  PROPERTY_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
  VENDOR_PROPERTY_PATTERN,
} from "../constants.js";
import type {
  CSSPropertyStatus,
  EffectiveCSSPropertyEntry,
  EffectiveCSSPropertyRegistry,
  EffectivePropertyPolicy,
  EffectiveTokenBindingPolicy,
  PropertyPolicyPatch,
  PropertyProfileGenerationInput,
  SparsePropertyPolicyGroup,
  TokenBindingCatalogEntry,
  TokenBindingCoverageReport,
  UpstreamCSSProperty,
} from "../contracts.js";
import { digestCanonicalJson } from "./canonical-json.js";

const compare = (left: string, right: string): number =>
  left.localeCompare(right, STABLE_SORT_LOCALE);

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].sort(compare);

const toAuthoringName = (property: string): string =>
  property.replace(/-([a-z0-9])/g, (_match, character: string) =>
    character.toUpperCase(),
  );

const resolveStatus = (property: UpstreamCSSProperty): CSSPropertyStatus => {
  if (property.legacyAliasOf !== undefined) return "legacy";
  if (VENDOR_PROPERTY_PATTERN.test(property.name)) return "vendor";
  return "standard";
};

const emptyBindings = (): EffectiveTokenBindingPolicy => ({
  directDomains: [],
  templateDomains: [],
  projectors: [],
  allowsTokenNegation: false,
});

const baselinePolicy = (
  status: CSSPropertyStatus,
  patch: PropertyPolicyPatch,
  kind: "longhand" | "shorthand",
): EffectivePropertyPolicy => ({
  authoring: patch.authoring ?? "allowed",
  valueKinds: patch.valueKinds ?? ["css"],
  tokenBindings: emptyBindings(),
  rawCSS: patch.rawCSS ?? "allowed",
  shorthand: patch.shorthand ?? (kind === "shorthand" ? "warning" : "not-applicable"),
  portability: patch.portability ?? "unknown",
  motion: patch.motion ?? "unknown",
  security: { resources: patch.resources ?? "reported" },
  provenance: [{ source: "status-default", rule: status }],
});

const patchPolicy = (
  policy: EffectivePropertyPolicy,
  patch: PropertyPolicyPatch,
  provenance: { readonly source: string; readonly rule: string },
): EffectivePropertyPolicy => ({
  ...policy,
  ...(patch.authoring === undefined ? {} : { authoring: patch.authoring }),
  ...(patch.valueKinds === undefined ? {} : { valueKinds: patch.valueKinds }),
  ...(patch.rawCSS === undefined ? {} : { rawCSS: patch.rawCSS }),
  ...(patch.shorthand === undefined ? {} : { shorthand: patch.shorthand }),
  ...(patch.portability === undefined ? {} : { portability: patch.portability }),
  ...(patch.motion === undefined ? {} : { motion: patch.motion }),
  ...(patch.resources === undefined
    ? {}
    : { security: { resources: patch.resources } }),
  provenance: [...policy.provenance, provenance],
});

const assertNoGroupConflicts = (
  groups: readonly SparsePropertyPolicyGroup[],
): void => {
  const assignments = new Map<string, Map<string, string>>();
  for (const group of groups) {
    for (const property of group.properties) {
      const fields = assignments.get(property) ?? new Map<string, string>();
      for (const [field, value] of Object.entries(group)) {
        if (field === "id" || field === "properties") continue;
        const serialized = JSON.stringify(value);
        const previous = fields.get(field);
        if (previous !== undefined && previous !== serialized) {
          throw new Error(
            `${PROPERTY_DIAGNOSTIC_CODE.POLICY_CONFLICT}: groups conflict for '${property}.${field}'.`,
          );
        }
        fields.set(field, serialized);
      }
      assignments.set(property, fields);
    }
  }
};

const expandShorthand = (
  seed: string,
  properties: ReadonlyMap<string, UpstreamCSSProperty>,
  output = new Set<string>(),
): ReadonlySet<string> => {
  if (output.has(seed)) return output;
  const property = properties.get(seed);
  if (property === undefined) {
    throw new Error(
      `${PROPERTY_DIAGNOSTIC_CODE.UNKNOWN_PROPERTY}: binding seed '${seed}' is absent from Webref.`,
    );
  }
  output.add(seed);
  for (const longhand of property.longhands ?? []) {
    expandShorthand(longhand, properties, output);
  }
  return output;
};

const bindingProperties = (
  binding: TokenBindingCatalogEntry,
  properties: ReadonlyMap<string, UpstreamCSSProperty>,
): readonly string[] => {
  const expanded = new Set(binding.properties ?? []);
  for (const shorthand of binding.expandShorthands ?? []) {
    for (const property of expandShorthand(shorthand, properties)) expanded.add(property);
  }
  for (const property of expanded) {
    if (!properties.has(property)) {
      throw new Error(
        `${PROPERTY_DIAGNOSTIC_CODE.UNKNOWN_PROPERTY}: binding '${binding.id}' references '${property}'.`,
      );
    }
  }
  return [...expanded].sort(compare);
};

const applyBinding = (
  policy: EffectivePropertyPolicy,
  binding: TokenBindingCatalogEntry,
): EffectivePropertyPolicy => {
  const tokenBindings = {
    directDomains: uniqueSorted([
      ...policy.tokenBindings.directDomains,
      ...binding.directDomains,
    ]),
    templateDomains: uniqueSorted([
      ...policy.tokenBindings.templateDomains,
      ...binding.templateDomains,
    ]),
    projectors: uniqueSorted([
      ...policy.tokenBindings.projectors,
      ...binding.projectors,
    ]),
    allowsTokenNegation:
      policy.tokenBindings.allowsTokenNegation || binding.allowsTokenNegation,
  };
  const valueKinds = uniqueSorted([
    ...policy.valueKinds,
    ...(binding.directDomains.length > 0 || binding.projectors.length > 0
      ? ["token"]
      : []),
    ...(binding.templateDomains.length > 0 ? ["css-template"] : []),
  ]) as EffectivePropertyPolicy["valueKinds"];
  return {
    ...policy,
    valueKinds,
    tokenBindings,
    provenance: [
      ...policy.provenance,
      { source: "token-binding-catalog", rule: binding.id },
    ],
  };
};

const coverage = (
  properties: readonly EffectiveCSSPropertyEntry[],
  profileDigest: string,
): TokenBindingCoverageReport => {
  const direct: Record<string, string[]> = {};
  const template: Record<string, string[]> = {};
  const projectors: Record<string, string[]> = {};
  const propertyBindings: Record<string, EffectiveTokenBindingPolicy> = {};
  for (const property of properties) {
    if (
      property.policy.tokenBindings.directDomains.length > 0 ||
      property.policy.tokenBindings.templateDomains.length > 0 ||
      property.policy.tokenBindings.projectors.length > 0
    ) {
      propertyBindings[property.name] = property.policy.tokenBindings;
    }
    for (const domain of property.policy.tokenBindings.directDomains) {
      (direct[domain] ??= []).push(property.name);
    }
    for (const domain of property.policy.tokenBindings.templateDomains) {
      (template[domain] ??= []).push(property.name);
    }
    for (const projector of property.policy.tokenBindings.projectors) {
      (projectors[projector] ??= []).push(property.name);
    }
  }
  return {
    schemaVersion: EFFECTIVE_PROPERTY_REGISTRY_SCHEMA_VERSION,
    profileDigest,
    direct: Object.fromEntries(Object.entries(direct).sort(([left], [right]) => compare(left, right))),
    template: Object.fromEntries(Object.entries(template).sort(([left], [right]) => compare(left, right))),
    projectors: Object.fromEntries(
      Object.entries(projectors).sort(([left], [right]) => compare(left, right)),
    ),
    properties: Object.fromEntries(
      Object.entries(propertyBindings).sort(([left], [right]) => compare(left, right)),
    ),
  };
};

export const generatePropertyProfile = (
  input: PropertyProfileGenerationInput,
): {
  readonly registry: EffectiveCSSPropertyRegistry;
  readonly coverage: TokenBindingCoverageReport;
} => {
  assertNoGroupConflicts(input.policy.groups);
  const upstream = new Map(input.upstreamProperties.map((entry) => [entry.name, entry]));
  for (const group of input.policy.groups) {
    for (const property of group.properties) {
      if (!upstream.has(property)) {
        throw new Error(
          `${PROPERTY_DIAGNOSTIC_CODE.UNKNOWN_PROPERTY}: policy group '${group.id}' references '${property}'.`,
        );
      }
    }
  }
  const knownDomains = new Set(input.tokenDomains);
  const knownProjectors = new Set(input.projectors);
  for (const domain of input.bindings.conditionOnlyDomains) {
    if (!knownDomains.has(domain)) {
      throw new Error(
        `${PROPERTY_DIAGNOSTIC_CODE.TOKEN_DOMAIN_MISMATCH}: unknown condition-only Domain '${domain}'.`,
      );
    }
  }
  const bindings = new Map<string, TokenBindingCatalogEntry[]>();
  for (const binding of input.bindings.bindings) {
    for (const domain of [...binding.directDomains, ...binding.templateDomains]) {
      if (!knownDomains.has(domain)) {
        throw new Error(
          `${PROPERTY_DIAGNOSTIC_CODE.TOKEN_DOMAIN_MISMATCH}: binding '${binding.id}' references unknown Domain '${domain}'.`,
        );
      }
    }
    for (const projector of binding.projectors) {
      if (!knownProjectors.has(projector)) {
        throw new Error(
          `${PROPERTY_DIAGNOSTIC_CODE.PROJECTOR_MISSING}: binding '${binding.id}' references unknown projector '${projector}'.`,
        );
      }
    }
    for (const property of bindingProperties(binding, upstream)) {
      const entries = bindings.get(property) ?? [];
      entries.push(binding);
      bindings.set(property, entries);
    }
  }

  const properties = [...input.upstreamProperties]
    .sort((left, right) => compare(left.name, right.name))
    .map((property): EffectiveCSSPropertyEntry => {
      const statusOverride = input.policy.overrides.find(
        (entry) => entry.property === property.name,
      )?.status;
      const status = statusOverride ?? resolveStatus(property);
      const kind = (property.longhands?.length ?? 0) > 0 ? "shorthand" : "longhand";
      let policy = baselinePolicy(status, input.policy.defaults[status], kind);
      for (const group of input.policy.groups.filter((entry) =>
        entry.properties.includes(property.name),
      )) {
        policy = patchPolicy(policy, group, { source: "policy-group", rule: group.id });
      }
      const override = input.policy.overrides.find(
        (entry) => entry.property === property.name,
      );
      if (override !== undefined) {
        policy = patchPolicy(policy, override, {
          source: "property-override",
          rule: property.name,
        });
      }
      for (const binding of bindings.get(property.name) ?? []) {
        policy = applyBinding(policy, binding);
      }
      if (input.policy.blockedProperties.includes(property.name)) {
        policy = {
          ...policy,
          authoring: "blocked",
          rawCSS: "blocked",
          provenance: [
            ...policy.provenance,
            { source: "blocked-properties", rule: property.name },
          ],
        };
      }
      return {
        name: property.name,
        authoringName: toAuthoringName(property.name),
        syntax: property.syntax ?? null,
        sourceHref: property.href,
        status,
        kind,
        inherited:
          typeof property.inherited === "boolean" ? property.inherited : null,
        initialValue: property.initial ?? null,
        longhands: uniqueSorted(property.longhands ?? []),
        resetLonghands: uniqueSorted(property.resetLonghands ?? []),
        ...(property.legacyAliasOf === undefined
          ? {}
          : { legacyAliasOf: property.legacyAliasOf }),
        policy,
      };
    });

  const aliases = Object.fromEntries(
    properties
      .filter((entry) => entry.legacyAliasOf !== undefined)
      .map((entry): [string, string] => [entry.name, entry.legacyAliasOf as string])
      .sort(([left], [right]) => compare(left, right)),
  );
  const authoringEntries = properties
    .filter((entry) => entry.status !== "legacy" && entry.status !== "vendor")
    .map((entry): [string, string] => [entry.authoringName, entry.name])
    .sort(([left], [right]) => compare(left, right));
  const authoringNames = Object.fromEntries(authoringEntries);
  if (Object.keys(authoringNames).length !== authoringEntries.length) {
    throw new Error(
      `${PROPERTY_DIAGNOSTIC_CODE.POLICY_CONFLICT}: CSS authoring-name projection contains a collision.`,
    );
  }
  const registry = {
    schemaVersion: EFFECTIVE_PROPERTY_REGISTRY_SCHEMA_VERSION,
    profile: input.profile,
    properties,
    aliases,
    authoringNames,
    customProperties: uniqueSorted(input.policy.customProperties),
  } satisfies EffectiveCSSPropertyRegistry;
  return { registry, coverage: coverage(properties, digestCanonicalJson(input.profile)) };
};
