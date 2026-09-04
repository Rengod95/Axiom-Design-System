import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

import {
  FORBIDDEN_RENDERER_IMPORT_PATTERNS,
  FORBIDDEN_SPEC_TOOLING_IMPORT_PATTERN,
  GENERATED_REFERENCE_PACKAGES,
  PACKAGE_MANIFEST_NAME,
  PACKAGE_RUNTIME_DEPENDENCIES,
  PACKAGES_DIRECTORY_NAME,
  RENDERER_INDEPENDENT_PACKAGES,
  REPOSITORY_ROOT,
  SOURCE_DIRECTORY_NAME,
  SOURCE_FILE_EXTENSIONS,
  STABLE_SORT_LOCALE,
  TEST_FILE_SUFFIXES,
} from "./workspace-policy.mjs";

const issues = [];

const sorted = (values) =>
  [...values].sort((left, right) => left.localeCompare(right, STABLE_SORT_LOCALE));

for (const [packageName, allowedDependencies] of Object.entries(
  PACKAGE_RUNTIME_DEPENDENCIES,
)) {
  const manifestPath = join(
    REPOSITORY_ROOT,
    PACKAGES_DIRECTORY_NAME,
    packageName,
    PACKAGE_MANIFEST_NAME,
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const actualDependencies = sorted(Object.keys(manifest.dependencies ?? {}));
  const expectedDependencies = sorted(allowedDependencies);
  if (JSON.stringify(actualDependencies) !== JSON.stringify(expectedDependencies)) {
    issues.push(
      `${relative(REPOSITORY_ROOT, manifestPath)}: runtime dependencies ${JSON.stringify(
        actualDependencies,
      )} do not match ${JSON.stringify(expectedDependencies)}`,
    );
  }
}

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
};

for (const packageName of RENDERER_INDEPENDENT_PACKAGES) {
  const sourceRoot = join(
    REPOSITORY_ROOT,
    PACKAGES_DIRECTORY_NAME,
    packageName,
    SOURCE_DIRECTORY_NAME,
  );
  const sourceFiles = (await walk(sourceRoot)).filter(
    (path) =>
      SOURCE_FILE_EXTENSIONS.has(extname(path)) &&
      !TEST_FILE_SUFFIXES.some((suffix) => path.endsWith(suffix)),
  );
  for (const path of sourceFiles) {
    const source = await readFile(path, "utf8");
    for (const pattern of FORBIDDEN_RENDERER_IMPORT_PATTERNS) {
      if (pattern.test(source)) {
        issues.push(`${relative(REPOSITORY_ROOT, path)}: forbidden renderer import ${pattern}`);
      }
    }
  }
}

for (const packageName of GENERATED_REFERENCE_PACKAGES) {
  const sourceRoot = join(
    REPOSITORY_ROOT,
    PACKAGES_DIRECTORY_NAME,
    packageName,
    SOURCE_DIRECTORY_NAME,
  );
  const sourceFiles = (await walk(sourceRoot)).filter(
    (path) => SOURCE_FILE_EXTENSIONS.has(extname(path)),
  );
  for (const path of sourceFiles) {
    const source = await readFile(path, "utf8");
    if (FORBIDDEN_SPEC_TOOLING_IMPORT_PATTERN.test(source)) {
      issues.push(`${relative(REPOSITORY_ROOT, path)}: generated reference package imports @axiom/spec-tooling`);
    }
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Axiom package boundaries are valid.");
}
