import { access, readFile, readdir } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

import {
  CONSTANT_CASE_PATTERN,
  EXPORTED_CONSTANT_DECLARATION_PATTERN,
  IGNORED_DIRECTORY_NAMES,
  PACKAGE_CONSTANTS_MODULE,
  PACKAGE_RUNTIME_DEPENDENCIES,
  PACKAGES_DIRECTORY_NAME,
  REPOSITORY_ROOT,
  SOURCE_DIRECTORY_NAME,
  SOURCE_FILE_EXTENSIONS,
  VERSIONED_IDENTIFIER_PATTERN,
  VERSIONED_PATH_NAME_PATTERN,
} from "./workspace-policy.mjs";

const issues = [];
const discoveredPaths = [];

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    discoveredPaths.push(path);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
};

const files = await walk(REPOSITORY_ROOT);

for (const path of discoveredPaths) {
  const repositoryPath = relative(REPOSITORY_ROOT, path);
  const versionedSegment = repositoryPath
    .split(sep)
    .find((segment) => VERSIONED_PATH_NAME_PATTERN.test(segment));
  if (versionedSegment !== undefined) {
    issues.push(
      `${repositoryPath}: version-bearing path segment '${versionedSegment}' is forbidden`,
    );
  }
}

for (const path of files) {
  const repositoryPath = relative(REPOSITORY_ROOT, path);
  if (!SOURCE_FILE_EXTENSIONS.has(extname(path))) continue;
  const source = await readFile(path, "utf8");
  for (const match of source.matchAll(VERSIONED_IDENTIFIER_PATTERN)) {
    issues.push(`${repositoryPath}: version-bearing identifier '${match[0]}' is forbidden`);
  }

  if (path.endsWith(PACKAGE_CONSTANTS_MODULE) || path.endsWith("workspace-policy.mjs")) {
    for (const match of source.matchAll(EXPORTED_CONSTANT_DECLARATION_PATTERN)) {
      if (!CONSTANT_CASE_PATTERN.test(match[1])) {
        issues.push(
          `${repositoryPath}: exported constant '${match[1]}' must use CONSTANT_CASE`,
        );
      }
    }
  }
}

for (const packageName of Object.keys(PACKAGE_RUNTIME_DEPENDENCIES)) {
  const constantsPath = join(
    REPOSITORY_ROOT,
    PACKAGES_DIRECTORY_NAME,
    packageName,
    SOURCE_DIRECTORY_NAME,
    PACKAGE_CONSTANTS_MODULE,
  );
  try {
    await access(constantsPath);
  } catch {
    issues.push(
      `${relative(REPOSITORY_ROOT, constantsPath)}: package constants module is required`,
    );
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Axiom source naming and constants modules are valid.");
}
