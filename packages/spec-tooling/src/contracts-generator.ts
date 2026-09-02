import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { canonicalJsonDigest } from "./canonical-json.js";
import { CONTRACT_GENERATOR_VERSION, STABLE_SORT_LOCALE } from "./constants.js";

const CONTRACT_GENERATOR_TEMPORARY_PREFIX = "axiom-reference-contracts-";
const DEFINITION_POINTER_PREFIX = "#/$defs/";
const GENERATED_REFERENCE_TYPE_LIMITATION =
  "Regexes, numeric bounds, uniqueness, and open/closed object exactness remain runtime schema validation.";

/** Names the generated public artifacts owned by the N18 reference-contract packages. */
export const REFERENCE_CONTRACT_DESTINATIONS = [
  "packages/behavior-contracts/src/generated/reference-contracts.ts",
  "packages/condition-registry/src/generated/reference-contracts.ts",
  "packages/motion-schema/src/generated/reference-contracts.ts",
] as const;

type ReferenceContractDestination = (typeof REFERENCE_CONTRACT_DESTINATIONS)[number];

type JsonRecord = Readonly<Record<string, unknown>>;
type Schema = boolean | JsonRecord;
type ContractFamily = "behavior" | "condition" | "motion";

interface SchemaSourceDefinition {
  readonly path: string;
  readonly rootName: string;
  readonly definitionNames?: Readonly<Record<string, string>>;
}

interface ContractFamilyDefinition {
  readonly destination: (typeof REFERENCE_CONTRACT_DESTINATIONS)[number];
  readonly sources: readonly string[];
  readonly schemas: readonly SchemaSourceDefinition[];
}

const CONTRACT_FAMILY_DEFINITIONS: Readonly<Record<ContractFamily, ContractFamilyDefinition>> = {
  behavior: {
    destination: REFERENCE_CONTRACT_DESTINATIONS[0],
    sources: [
      "spec/behavior/behavior-criteria-source-manifest.schema.json",
      "spec/behavior/component-behavior-criteria-profile.schema.json",
      "spec/common/identifier.schema.json",
    ],
    schemas: [
      {
        path: "spec/behavior/behavior-criteria-source-manifest.schema.json",
        rootName: "BehaviorCriteriaSourceManifest",
        definitionNames: { digest: "Sha256Digest", evidence: "BehaviorEvidence", package: "BehaviorSourcePackage" },
      },
      {
        path: "spec/behavior/component-behavior-criteria-profile.schema.json",
        rootName: "ComponentBehaviorCriteriaProfile",
        definitionNames: { criterion: "BehaviorCriterion", digest: "Sha256Digest" },
      },
      { path: "spec/common/identifier.schema.json", rootName: "AxiomIdentifier" },
    ],
  },
  condition: {
    destination: REFERENCE_CONTRACT_DESTINATIONS[1],
    sources: [
      "spec/common/identifier.schema.json",
      "spec/common/token-reference.schema.json",
      "spec/token/token-id.schema.json",
      "spec/state/canonical-state-registry.schema.json",
      "spec/state/canonical-state-registry.json",
      "spec/condition/condition-registry.schema.json",
      "spec/condition/condition-registry.json",
      "spec/condition/condition-expression.schema.json",
    ],
    schemas: [
      { path: "spec/common/identifier.schema.json", rootName: "AxiomIdentifier" },
      { path: "spec/common/token-reference.schema.json", rootName: "TokenReference" },
      { path: "spec/token/token-id.schema.json", rootName: "TokenId" },
      {
        path: "spec/state/canonical-state-registry.schema.json",
        rootName: "CanonicalStateRegistry",
        definitionNames: { state: "CanonicalState" },
      },
      {
        path: "spec/condition/condition-registry.schema.json",
        rootName: "ConditionRegistry",
        definitionNames: {
          container: "ConditionContainer",
          rangeBase: "ConditionRangeBase",
          viewportCondition: "ViewportCondition",
          containerCondition: "ContainerCondition",
          preferenceCondition: "ReducedMotionCondition",
        },
      },
      { path: "spec/condition/condition-expression.schema.json", rootName: "ConditionExpression" },
    ],
  },
  motion: {
    destination: REFERENCE_CONTRACT_DESTINATIONS[2],
    sources: [
      "spec/common/identifier.schema.json",
      "spec/common/token-reference.schema.json",
      "spec/token/token-id.schema.json",
      "spec/css/property-name.schema.json",
      "spec/condition/condition-expression.schema.json",
      "spec/css/declaration-value.schema.json",
      "spec/css/declaration-origin.schema.json",
      "spec/css/declaration.schema.json",
      "spec/css/ordered-declaration-list.schema.json",
      "spec/css/appearance-ir.schema.json",
      "spec/css/collision-trace.schema.json",
      "spec/motion/motion-ir.schema.json",
    ],
    schemas: [
      { path: "spec/common/identifier.schema.json", rootName: "AxiomIdentifier" },
      { path: "spec/common/token-reference.schema.json", rootName: "TokenReference" },
      { path: "spec/token/token-id.schema.json", rootName: "TokenId" },
      { path: "spec/css/property-name.schema.json", rootName: "CSSPropertyName" },
      { path: "spec/condition/condition-expression.schema.json", rootName: "ConditionExpression" },
      {
        path: "spec/css/declaration-value.schema.json",
        rootName: "CSSDeclarationValue",
        definitionNames: {
          cssLiteral: "CSSLiteral",
          cssValueTemplate: "CSSValueTemplate",
          templatePart: "CSSValueTemplatePart",
        },
      },
      { path: "spec/css/declaration-origin.schema.json", rootName: "DeclarationOrigin" },
      { path: "spec/css/declaration.schema.json", rootName: "CSSDeclaration" },
      { path: "spec/css/ordered-declaration-list.schema.json", rootName: "OrderedDeclarationList" },
      {
        path: "spec/css/appearance-ir.schema.json",
        rootName: "CSSAppearanceIR",
        definitionNames: {
          slotDeclarationRecord: "SlotDeclarationRecord", variantAxis: "VariantAxis",
          variantValue: "VariantValue", stateRule: "AppearanceStateRule", stateCase: "StateCase",
          variantSelection: "VariantSelection", stateSelection: "StateSelection",
          compoundPredicate: "CompoundPredicate", compoundRule: "AppearanceCompoundRule",
          conditionRule: "AppearanceConditionRule",
        },
      },
      {
        path: "spec/css/collision-trace.schema.json",
        rootName: "CollisionTrace",
        definitionNames: {
          policyProvenance: "CollisionPolicyProvenance",
          variantApplicability: "CollisionVariantApplicability",
          stateApplicability: "CollisionStateApplicability",
          applicability: "CollisionApplicability",
          declarationEvidence: "CollisionDeclarationEvidence",
          conditionRelation: "CollisionConditionRelation",
          entry: "CollisionTraceEntry",
        },
      },
      {
        path: "spec/motion/motion-ir.schema.json",
        rootName: "MotionIR",
        definitionNames: {
          digest: "Sha256Digest", phaseName: "MotionPhaseName", stateTransition: "MotionStateTransition",
          phase: "MotionPhase", segmentAt: "MotionSegmentAt", segment: "MotionSegment",
          track: "MotionTrack", keyframe: "MotionKeyframe", transition: "MotionTransition",
          reducedMotion: "ReducedMotionPolicy",
        },
      },
    ],
  },
};

/** Represents one fully rendered generated artifact before it is written or drift-checked. */
export interface GeneratedReferenceContract {
  readonly destination: (typeof REFERENCE_CONTRACT_DESTINATIONS)[number];
  readonly content: string;
}

/** Allows mutation tests to substitute an authoritative source without changing repository files. */
export interface ReferenceContractGenerationOptions {
  readonly sourceOverrides?: Readonly<Record<string, unknown>>;
}

/** Narrows untrusted JSON values to plain schema records. */
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reads a source or test override while retaining the exact value used for provenance and rendering. */
const readSource = async (root: string, path: string, options: ReferenceContractGenerationOptions): Promise<unknown> =>
  options.sourceOverrides?.[path] ?? JSON.parse(await readFile(join(root, path), "utf8")) as unknown;

/** Extracts a source identity only from schema data that declares one. */
const sourceIdentity = (source: unknown, path: string): string =>
  isRecord(source) && typeof source["$id"] === "string" ? source["$id"] : path;

/** Extracts a declared schema or profile version for generated provenance without inferring one. */
const sourceVersion = (source: unknown): string => {
  if (!isRecord(source)) return "unversioned";
  if (typeof source["schemaVersion"] === "string") return source["schemaVersion"];
  if (typeof source["$id"] === "string") return source["$id"].split("/").at(-1) ?? "unversioned";
  return "unversioned";
};

/** Converts a schema-oriented identifier into a stable exported TypeScript type name. */
const typeName = (value: string): string => value.replaceAll(/[^A-Za-z0-9]+/g, " ").split(" ")
  .filter((part) => part.length > 0)
  .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("");

/** Renders a JSON literal as a TypeScript literal type. */
const literalType = (value: unknown): string => JSON.stringify(value);

/** Builds a readonly tuple expression that preserves a schema's useful array cardinality. */
const arrayType = (item: string, minimum: number, maximum: number | undefined): string => {
  const element = `(${item})`;
  const required = Array.from({ length: minimum }, () => element);
  if (maximum !== undefined && maximum >= minimum && maximum - minimum <= 4) {
    return Array.from({ length: maximum - minimum + 1 }, (_, index) =>
      `readonly [${Array.from({ length: minimum + index }, () => element).join(", ")}]`).join(" | ");
  }
  return required.length === 0 ? `readonly ${element}[]` : `readonly [${required.join(", ")}, ...${element}[]]`;
};

interface RenderingContext {
  readonly names: ReadonlyMap<string, string>;
  readonly schemas: ReadonlyMap<string, Schema>;
  readonly ownerId: string;
}

/** Resolves local and external schema references through the configured family source graph. */
const referenceType = (reference: string, context: RenderingContext): string => {
  const key = reference.startsWith("#") ? `${context.ownerId}${reference}` : reference;
  const named = context.names.get(key);
  if (named !== undefined) return named;
  if (!context.schemas.has(key)) throw new Error(`Unsupported reference contract source '${reference}'.`);
  return typeName(reference.split("/").at(-2) ?? reference);
};

/** Renders a negative simple const-property conditional with the base property's restricted domain. */
const negativeConditional = (schema: JsonRecord, base: JsonRecord | undefined, context: RenderingContext): string => {
  const properties = isRecord(schema["properties"]) ? schema["properties"] : {};
  const baseProperties = base !== undefined && isRecord(base["properties"]) ? base["properties"] : {};
  const alternatives = Object.entries(properties).flatMap(([name, condition]) => {
    if (!isRecord(condition) || !("const" in condition)) return [];
    const baseProperty = baseProperties[name];
    const baseType = baseProperty === undefined ? "string | number | boolean" : renderSchema(baseProperty as Schema, context);
    return [`Readonly<{ readonly ${name}: Exclude<${baseType}, ${literalType(condition["const"])}> }>`];
  });
  return alternatives.length === 0 ? "unknown" : alternatives.join(" | ");
};

/** Renders an object schema while preserving required fields and supported record maps. */
const objectType = (schema: JsonRecord, context: RenderingContext): string => {
  const properties = isRecord(schema["properties"]) ? schema["properties"] : {};
  const required = new Set(Array.isArray(schema["required"])
    ? schema["required"].filter((value): value is string => typeof value === "string") : []);
  const members = Object.keys(properties).sort((left, right) => left.localeCompare(right, STABLE_SORT_LOCALE))
    .map((name) => `readonly ${name}${required.has(name) ? "" : "?"}: ${renderSchema(properties[name] as Schema, context)}`);
  const additional = schema["additionalProperties"];
  if (members.length === 0 && additional !== undefined && additional !== true) {
    return `Readonly<Record<string, ${renderSchema(additional as Schema, context)}>>`;
  }
  return `Readonly<{ ${members.join("; ")} }>`;
};

/** Renders the constrained JSON Schema forms that N12-N17 expose to reference TypeScript. */
const renderSchema = (schema: Schema, context: RenderingContext): string => {
  if (schema === true) return "unknown";
  if (schema === false) return "never";
  if (typeof schema["$ref"] === "string") return referenceType(schema["$ref"], context);
  if ("const" in schema) return literalType(schema["const"]);
  if (Array.isArray(schema["enum"])) return schema["enum"].map(literalType).join(" | ");
  if (Array.isArray(schema["oneOf"])) return schema["oneOf"].map((item) => `(${renderSchema(item as Schema, context)})`).join(" | ");
  const allOf = Array.isArray(schema["allOf"]) ? schema["allOf"] : [];
  if (allOf.length > 0) {
    const base = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "allOf"));
    const baseType = Object.keys(base).length === 0 ? undefined : renderSchema(base, context);
    const allOfTypes = allOf.map((item) => {
      if (!isRecord(item) || !isRecord(item["if"])) return renderSchema(item as Schema, context);
      const thenType = item["then"] === undefined ? "unknown" : renderSchema(item["then"] as Schema, context);
      const elseType = item["else"] === undefined ? "unknown" : renderSchema(item["else"] as Schema, context);
      return `(${renderSchema(item["if"] as Schema, context)} & ${thenType}) | (${negativeConditional(
        item["if"] as JsonRecord, base, context,
      )} & ${elseType})`;
    });
    return [baseType, ...allOfTypes].filter((value): value is string => value !== undefined)
      .map((value) => `(${value})`).join(" & ");
  }
  if (schema["type"] === "array") {
    return arrayType(
      renderSchema((schema["items"] ?? true) as Schema, context),
      typeof schema["minItems"] === "number" ? schema["minItems"] : 0,
      typeof schema["maxItems"] === "number" ? schema["maxItems"] : undefined,
    );
  }
  if (schema["type"] === "object" || schema["properties"] !== undefined || schema["additionalProperties"] !== undefined) {
    return objectType(schema, context);
  }
  if (schema["type"] === "string") return "string";
  if (schema["type"] === "number" || schema["type"] === "integer") return "number";
  if (schema["type"] === "boolean") return "boolean";
  if (schema["type"] === "null") return "null";
  return "unknown";
};

/** Builds the immutable provenance header required for a generated public contract. */
const provenance = (family: ContractFamily, sources: readonly { readonly path: string; readonly value: unknown }[]): string =>
  `// GENERATED by @axiom/spec-tooling.\n` +
  `// sourceIdentity: ${sources.map(({ path, value }) => sourceIdentity(value, path)).join(" | ")}\n` +
  `// generatorVersion: ${CONTRACT_GENERATOR_VERSION}\n` +
  `// schemaOrProfileVersion: ${sources.map(({ value }) => sourceVersion(value)).join(" | ")}\n` +
  `// contractFamily: ${family}\n` +
  `// canonicalInputDigest: ${canonicalJsonDigest(sources.map(({ path, value }) => ({ path, value })))}\n` +
  `// ${GENERATED_REFERENCE_TYPE_LIMITATION}\n\n`;

/** Derives literal identity unions from registry data without inventing identifiers outside those sources. */
const registryIdentityTypes = (family: ContractFamily, sources: ReadonlyMap<string, unknown>): string => {
  if (family !== "condition") return "";
  const stateRegistry = sources.get("spec/state/canonical-state-registry.json");
  const conditionRegistry = sources.get("spec/condition/condition-registry.json");
  const identifiers = (registry: unknown, key: string): string => isRecord(registry) && Array.isArray(registry[key])
    ? registry[key].filter(isRecord).map((entry) => entry["id"]).filter((id): id is string => typeof id === "string")
      .sort((left, right) => left.localeCompare(right, STABLE_SORT_LOCALE)).map(literalType).join(" | ") || "never"
    : "never";
  return `export type CanonicalStateId = ${identifiers(stateRegistry, "states")};\n` +
    `export type ConditionId = ${identifiers(conditionRegistry, "conditions")};\n` +
    `export type ConditionContainerId = ${identifiers(conditionRegistry, "containers")};\n\n`;
};

/** Selects schema definitions and renders source-sensitive aliases in stable configured order. */
const renderFamily = async (root: string, family: ContractFamily, options: ReferenceContractGenerationOptions): Promise<GeneratedReferenceContract> => {
  const definition = CONTRACT_FAMILY_DEFINITIONS[family];
  const sources = await Promise.all(definition.sources.map(async (path) => ({ path, value: await readSource(root, path, options) })));
  const sourceValues = new Map(sources.map(({ path, value }) => [path, value]));
  const schemaById = new Map<string, Schema>();
  const names = new Map<string, string>();
  for (const sourceDefinition of definition.schemas) {
    const source = sourceValues.get(sourceDefinition.path);
    if (!isRecord(source) || typeof source["$id"] !== "string") throw new Error(`Reference contract source '${sourceDefinition.path}' must declare $id.`);
    const identifier = source["$id"];
    schemaById.set(identifier, source);
    names.set(identifier, sourceDefinition.rootName);
    const definitions = isRecord(source["$defs"]) ? source["$defs"] : {};
    for (const [name, schema] of Object.entries(definitions)) {
      const key = `${identifier}${DEFINITION_POINTER_PREFIX}${name}`;
      schemaById.set(key, schema as Schema);
      names.set(key, sourceDefinition.definitionNames?.[name] ?? `${sourceDefinition.rootName}${typeName(name)}`);
    }
  }
  const emittedNames = new Set<string>();
  const emitDeclaration = (name: string, schema: Schema, context: RenderingContext): string | undefined => {
    if (emittedNames.has(name)) return undefined;
    emittedNames.add(name);
    return `export type ${name} = ${renderSchema(schema, context)};`;
  };
  const declarations = definition.schemas.flatMap((sourceDefinition) => {
    const schema = sourceValues.get(sourceDefinition.path) as JsonRecord;
    const identifier = schema["$id"] as string;
    const context = { names, schemas: schemaById, ownerId: identifier };
    const definitions = isRecord(schema["$defs"]) ? schema["$defs"] : {};
    return [
      emitDeclaration(sourceDefinition.rootName, schema, context),
      ...Object.keys(definitions).sort((left, right) => left.localeCompare(right, STABLE_SORT_LOCALE)).map((name) =>
        emitDeclaration(names.get(`${identifier}${DEFINITION_POINTER_PREFIX}${name}`) ?? typeName(name), definitions[name] as Schema, context)),
    ].filter((declaration): declaration is string => declaration !== undefined);
  });
  return { destination: definition.destination, content: `${provenance(family, sources)}${registryIdentityTypes(family, sourceValues)}${declarations.join("\n")}\n` };
};

/** Generates all N18 artifacts in stable destination order without mutating the checkout. */
export const generateReferenceContracts = async (
  sourceRoot: string,
  options: ReferenceContractGenerationOptions = {},
): Promise<readonly GeneratedReferenceContract[]> => {
  const artifacts = await Promise.all((Object.keys(CONTRACT_FAMILY_DEFINITIONS) as ContractFamily[])
    .map((family) => renderFamily(sourceRoot, family, options)));
  return artifacts.sort((left, right) => left.destination.localeCompare(right.destination, STABLE_SORT_LOCALE));
};

/** Writes every deterministic contract artifact beneath an explicit output root. */
export const writeReferenceContracts = async (sourceRoot: string, outputRoot: string = sourceRoot): Promise<readonly GeneratedReferenceContract[]> => {
  const artifacts = await generateReferenceContracts(sourceRoot);
  await Promise.all(artifacts.map(async (artifact) => {
    const destination = join(outputRoot, artifact.destination);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, artifact.content, "utf8");
  }));
  return artifacts;
};

/** Returns every destination whose checked-in content differs from fresh deterministic output. */
export const checkReferenceContractDrift = async (sourceRoot: string, outputRoot: string = sourceRoot): Promise<readonly string[]> => {
  const artifacts = await generateReferenceContracts(sourceRoot);
  const comparisons = await Promise.all(artifacts.map(async (artifact) => {
    try {
      return (await readFile(join(outputRoot, artifact.destination), "utf8")) === artifact.content ? undefined : artifact.destination;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return artifact.destination;
      throw error;
    }
  }));
  return comparisons.filter((destination): destination is ReferenceContractDestination => destination !== undefined);
};

/** Regenerates into a disposable directory before comparing every checked-in public artifact. */
export const checkReferenceContractDriftInTemporaryDirectory = async (sourceRoot: string): Promise<readonly string[]> => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), CONTRACT_GENERATOR_TEMPORARY_PREFIX));
  try {
    await writeReferenceContracts(sourceRoot, temporaryRoot);
    return Promise.all(REFERENCE_CONTRACT_DESTINATIONS.map(async (destination) => {
      const [actual, expected] = await Promise.all([readFile(join(sourceRoot, destination), "utf8"), readFile(join(temporaryRoot, destination), "utf8")]);
      return actual === expected ? undefined : destination;
    })).then((comparisons) => comparisons.filter(
      (destination): destination is ReferenceContractDestination => destination !== undefined,
    ));
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
};
