import { createHash } from "node:crypto";
import { readFile, readdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import {
  Ajv2020,
  type AnySchema,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";

import { canonicalJsonDigest } from "./canonical-json.js";
import {
  BEHAVIOR_DIAGNOSTIC_PHASE,
  ERROR_DIAGNOSTIC_SEVERITY,
  JSON_FILE_SUFFIX,
  JSON_SCHEMA_FILE_SUFFIX,
  SPEC_MANIFEST_PATH,
  SPEC_MANIFEST_SCHEMA_PATH,
  SPEC_DIAGNOSTIC_CODE,
  STABLE_SORT_LOCALE,
  WARNING_DIAGNOSTIC_SEVERITY,
} from "./constants.js";
import { runSemanticValidator } from "./semantic-validators.js";
import type {
  Diagnostic,
  SemanticValidatorId,
  SemanticValidationContext,
  RelatedFixtureManifestEntry,
  SpecCheckReport,
  SpecManifest,
} from "./types.js";

const createAjv = (): Ajv2020 =>
  new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: false,
  });

const readJson = async (path: string): Promise<unknown> => {
  const source = await readFile(path, "utf8");
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: invalid JSON: ${message}`);
  }
};

const resolveInside = (root: string, path: string): string => {
  if (isAbsolute(path)) throw new Error(`Absolute spec path is forbidden: ${path}`);
  const resolvedRoot = resolve(root);
  const candidate = resolve(resolvedRoot, path);
  if (candidate !== resolvedRoot && !candidate.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`Spec path escapes its root: ${path}`);
  }
  return candidate;
};

const listJsonFiles = async (directory: string): Promise<readonly string[]> => {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await listJsonFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(JSON_FILE_SUFFIX)) paths.push(path);
  }
  return paths.sort((left, right) => left.localeCompare(right, STABLE_SORT_LOCALE));
};

const formatErrors = (errors: readonly ErrorObject[] | null | undefined): string =>
  (errors ?? [])
    .map((error) => `${error.instancePath || "/"}: ${error.message ?? error.keyword}`)
    .join("; ");

const assertValid = (
  validate: ValidateFunction,
  value: unknown,
  subject: string,
): void => {
  if (!validate(value)) {
    throw new Error(`${subject}: schema validation failed: ${formatErrors(validate.errors)}`);
  }
};

const asSchema = (value: unknown, subject: string): AnySchema => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${subject}: JSON Schema root must be an object.`);
  }
  return value as AnySchema;
};

const schemaId = (schema: AnySchema): unknown =>
  typeof schema === "boolean" ? undefined : schema.$id;

const withFixtureFile = (
  diagnostics: ReturnType<typeof runSemanticValidator>,
  file: string,
): ReturnType<typeof runSemanticValidator> =>
  diagnostics.map((diagnostic) => ({
    ...diagnostic,
    ...(diagnostic.location === undefined
      ? {}
      : { location: { ...diagnostic.location, file } }),
  }));

/** Identifies error diagnostics, which always invalidate a schema-valid fixture. */
const isErrorDiagnostic = (diagnostic: { readonly severity: string }): boolean =>
  diagnostic.severity === ERROR_DIAGNOSTIC_SEVERITY;

/** Converts semantic diagnostics to fixture failures while allowing only manifest-declared warning codes. */
export const validateFixtureDiagnostics = (
  diagnostics: readonly Diagnostic[],
  allowedWarnings: readonly string[] = [],
): readonly string[] => diagnostics
  .filter((diagnostic) =>
    isErrorDiagnostic(diagnostic) ||
    (diagnostic.severity === WARNING_DIAGNOSTIC_SEVERITY && !allowedWarnings.includes(diagnostic.code)),
  )
  .map((diagnostic) => `${diagnostic.code} ${diagnostic.location?.pointer ?? ""}: ${diagnostic.message}`);

/** Validates one fixture against schema and scoped semantic-warning allowances. */
const validateFixture = (
  validate: ValidateFunction,
  value: unknown,
  semanticValidator: SemanticValidatorId | undefined,
  semanticContext: SemanticValidationContext,
  file: string,
  allowedWarnings: readonly string[] | undefined,
): { readonly schemaValid: boolean; readonly semanticErrors: readonly string[] } => {
  const schemaValid = validate(value) as boolean;
  const semanticErrors = schemaValid
    ? validateFixtureDiagnostics(
      withFixtureFile(runSemanticValidator(semanticValidator, value, semanticContext), file),
      allowedWarnings,
    )
    : [];
  return { schemaValid, semanticErrors };
};

/**
 * Validates pinned evidence files without allowing repository-relative paths or
 * symlink targets to escape the supplied root.
 */
export const validatePinnedEvidenceArtifacts = async (
  value: unknown,
  repositoryRoot: string,
  sourceFile = "<memory>",
): Promise<readonly Diagnostic[]> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  const evidence = (value as Record<string, unknown>)["evidence"];
  if (!Array.isArray(evidence)) return [];
  const diagnostics: Diagnostic[] = [];
  const realRoot = await realpath(repositoryRoot);
  for (const [index, item] of evidence.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (record["retrievalPolicy"] !== "pinned-artifact" || typeof record["artifactPath"] !== "string" || typeof record["digest"] !== "string") continue;
    const artifactPath = record["artifactPath"];
    let artifact: string;
    try {
      artifact = resolveInside(repositoryRoot, artifactPath);
    } catch {
      diagnostics.push({
        code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_EVIDENCE_REPOSITORY_ESCAPE,
        severity: ERROR_DIAGNOSTIC_SEVERITY,
        phase: BEHAVIOR_DIAGNOSTIC_PHASE,
        message: `Pinned evidence path escapes the repository: ${artifactPath}`,
        location: { file: sourceFile, pointer: `/evidence/${index}/artifactPath` },
        target: artifactPath,
      });
      continue;
    }
    let realArtifact: string;
    try {
      realArtifact = await realpath(artifact);
    } catch {
      diagnostics.push({
        code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_EVIDENCE_ARTIFACT_UNAVAILABLE,
        severity: ERROR_DIAGNOSTIC_SEVERITY,
        phase: BEHAVIOR_DIAGNOSTIC_PHASE,
        message: `Pinned evidence artifact is unavailable: ${artifactPath}`,
        location: { file: sourceFile, pointer: `/evidence/${index}/artifactPath` },
        target: artifactPath,
      });
      continue;
    }
    if (realArtifact !== realRoot && !realArtifact.startsWith(`${realRoot}${sep}`)) {
      diagnostics.push({
        code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_EVIDENCE_REPOSITORY_ESCAPE,
        severity: ERROR_DIAGNOSTIC_SEVERITY,
        phase: BEHAVIOR_DIAGNOSTIC_PHASE,
        message: `Pinned evidence artifact resolves outside the repository: ${artifactPath}`,
        location: { file: sourceFile, pointer: `/evidence/${index}/artifactPath` },
        target: artifactPath,
      });
      continue;
    }
    let content: Buffer;
    try {
      content = await readFile(realArtifact);
    } catch {
      diagnostics.push({
        code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_EVIDENCE_ARTIFACT_UNAVAILABLE,
        severity: ERROR_DIAGNOSTIC_SEVERITY,
        phase: BEHAVIOR_DIAGNOSTIC_PHASE,
        message: `Pinned evidence artifact cannot be read: ${artifactPath}`,
        location: { file: sourceFile, pointer: `/evidence/${index}/artifactPath` },
        target: artifactPath,
      });
      continue;
    }
    const digest = `sha256:${createHash("sha256").update(content).digest("hex")}`;
    if (digest !== record["digest"]) {
      diagnostics.push({
        code: SPEC_DIAGNOSTIC_CODE.BEHAVIOR_EVIDENCE_DIGEST_MISMATCH,
        severity: ERROR_DIAGNOSTIC_SEVERITY,
        phase: BEHAVIOR_DIAGNOSTIC_PHASE,
        message: `Pinned evidence artifact digest does not match its declared bytes: ${artifactPath}`,
        location: { file: sourceFile, pointer: `/evidence/${index}/digest` },
        target: artifactPath,
      });
    }
  }
  return diagnostics;
};

/** Loads a related fixture only after its declared schema and semantics pass. */
const loadRelatedFixture = async (
  id: string,
  entry: RelatedFixtureManifestEntry,
  ajv: Ajv2020,
  semanticContext: SemanticValidationContext,
  specRoot: string,
): Promise<unknown> => {
  const validate = ajv.getSchema(entry.schema);
  if (validate === undefined) {
    throw new Error(`${id}: unknown related fixture schema '${entry.schema}'.`);
  }
  const fixturePath = resolveInside(specRoot, entry.path);
  const relativePath = relative(specRoot, fixturePath);
  const value = await readJson(fixturePath);
  const result = validateFixture(
    validate,
    value,
    entry.semanticValidator,
    semanticContext,
    relativePath,
    undefined,
  );
  const artifactErrors =
    entry.semanticValidator === "behavior-criteria-source-manifest" && result.schemaValid
      ? validateFixtureDiagnostics(
        await validatePinnedEvidenceArtifacts(
          value,
          resolve(specRoot, ".."),
          relativePath,
        ),
      )
      : [];
  if (!result.schemaValid || result.semanticErrors.length > 0 || artifactErrors.length > 0) {
    throw new Error(
      `${id}: related fixture '${relativePath}' is invalid: ${
        result.schemaValid
          ? [...result.semanticErrors, ...artifactErrors].join("; ")
          : formatErrors(validate.errors)
      }`,
    );
  }
  return value;
};

const validateSchemaInventory = async (
  specRoot: string,
  manifest: SpecManifest,
): Promise<void> => {
  const declared = manifest.schemas
    .map((entry) => entry.path)
    .sort((left, right) => left.localeCompare(right, STABLE_SORT_LOCALE));
  const actual = (await listJsonFiles(specRoot))
    .map((path) => relative(specRoot, path))
    .filter((path) => path.endsWith(JSON_SCHEMA_FILE_SUFFIX))
    .sort((left, right) => left.localeCompare(right, STABLE_SORT_LOCALE));

  if (JSON.stringify(actual) !== JSON.stringify(declared)) {
    throw new Error(
      `Schema inventory mismatch. Declared ${JSON.stringify(declared)}, actual ${JSON.stringify(actual)}.`,
    );
  }
};

export const checkSpecification = async (specRoot: string): Promise<SpecCheckReport> => {
  const manifestSchemaValue = await readJson(
    resolveInside(specRoot, SPEC_MANIFEST_SCHEMA_PATH),
  );
  const manifestSchema = asSchema(manifestSchemaValue, SPEC_MANIFEST_SCHEMA_PATH);
  const manifestValue = await readJson(resolveInside(specRoot, SPEC_MANIFEST_PATH));

  const bootstrapAjv = createAjv();
  const validateManifest = bootstrapAjv.compile(manifestSchema);
  assertValid(validateManifest, manifestValue, SPEC_MANIFEST_PATH);
  const manifest = manifestValue as SpecManifest;
  await validateSchemaInventory(specRoot, manifest);

  const ajv = createAjv();
  const schemaIds = new Set<string>();
  for (const entry of manifest.schemas) {
    if (schemaIds.has(entry.id)) throw new Error(`Duplicate schema id in manifest: ${entry.id}`);
    schemaIds.add(entry.id);

    const value = await readJson(resolveInside(specRoot, entry.path));
    const schema = asSchema(value, entry.path);
    if (schemaId(schema) !== entry.id) {
      throw new Error(`${entry.path}: $id does not match manifest id '${entry.id}'.`);
    }
    ajv.addSchema(schema, entry.id);
  }

  for (const entry of manifest.schemas) {
    if (ajv.getSchema(entry.id) === undefined) {
      throw new Error(`Schema could not be compiled: ${entry.id}`);
    }
  }

  const digests: Record<string, string> = {
    manifest: canonicalJsonDigest(manifestValue),
  };
  const registryValues: Record<string, unknown> = {};
  for (const entry of manifest.registries) {
    const validate = ajv.getSchema(entry.schema);
    if (validate === undefined) throw new Error(`${entry.id}: unknown schema '${entry.schema}'.`);
    const value = await readJson(resolveInside(specRoot, entry.path));
    assertValid(validate, value, entry.path);
    registryValues[entry.id] = value;
    digests[entry.id] = canonicalJsonDigest(value);
  }

  const semanticContext: SemanticValidationContext = {
    registries: registryValues,
  };
  for (const entry of manifest.registries) {
    const value = registryValues[entry.id];
    const semanticErrors = withFixtureFile(
      runSemanticValidator(entry.semanticValidator, value, semanticContext),
      entry.path,
    );
    if (semanticErrors.length > 0) {
      throw new Error(
        `${entry.path}: semantic validation failed: ${semanticErrors
          .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
          .join("; ")}`,
      );
    }
  }

  let positiveFixtureCount = 0;
  let negativeFixtureCount = 0;
  for (const suite of manifest.fixtureSuites) {
    const validate = ajv.getSchema(suite.schema);
    if (validate === undefined) throw new Error(`${suite.id}: unknown schema '${suite.schema}'.`);

    const relatedFixtures: Record<string, unknown> = {};
    for (const [id, entry] of Object.entries(suite.relatedFixtures ?? {})) {
      relatedFixtures[id] = await loadRelatedFixture(
        id,
        entry,
        ajv,
        semanticContext,
        specRoot,
      );
    }
    const fixtureContext: SemanticValidationContext = {
      ...semanticContext,
      ...(Object.keys(relatedFixtures).length === 0 ? {} : { relatedFixtures }),
    };
    const positiveFiles = await listJsonFiles(resolveInside(specRoot, suite.positiveDirectory));
    const negativeFiles = await listJsonFiles(resolveInside(specRoot, suite.negativeDirectory));
    if (positiveFiles.length === 0 || negativeFiles.length === 0) {
      throw new Error(`${suite.id}: fixture suites require positive and negative cases.`);
    }

    for (const path of positiveFiles) {
      positiveFixtureCount += 1;
      const value = await readJson(path);
      const result = validateFixture(
        validate,
        value,
        suite.semanticValidator,
        fixtureContext,
        relative(specRoot, path),
        suite.allowedWarnings,
      );
      const artifactErrors = suite.id === "behavior-criteria-source-manifest" && result.schemaValid
        ? validateFixtureDiagnostics(
          await validatePinnedEvidenceArtifacts(
            value,
            resolve(specRoot, ".."),
            relative(specRoot, path),
          ),
        )
        : [];
      if (!result.schemaValid || result.semanticErrors.length > 0 || artifactErrors.length > 0) {
        throw new Error(
          `${relative(specRoot, path)}: expected valid fixture; ${
            result.schemaValid
              ? [...result.semanticErrors, ...artifactErrors].join("; ")
              : formatErrors(validate.errors)
          }`,
        );
      }
    }

    for (const path of negativeFiles) {
      negativeFixtureCount += 1;
      const value = await readJson(path);
      const result = validateFixture(
        validate,
        value,
        suite.semanticValidator,
        fixtureContext,
        relative(specRoot, path),
        suite.allowedWarnings,
      );
      const artifactErrors = suite.id === "behavior-criteria-source-manifest" && result.schemaValid
        ? validateFixtureDiagnostics(
          await validatePinnedEvidenceArtifacts(
            value,
            resolve(specRoot, ".."),
            relative(specRoot, path),
          ),
        )
        : [];
      if (
        result.schemaValid &&
        result.semanticErrors.length === 0 &&
        artifactErrors.length === 0
      ) {
        throw new Error(`${relative(specRoot, path)}: expected invalid fixture, but it passed.`);
      }
    }
  }

  return {
    schemaCount: manifest.schemas.length,
    registryCount: manifest.registries.length,
    positiveFixtureCount,
    negativeFixtureCount,
    digests,
  };
};
