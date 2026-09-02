import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PACKAGES_DIRECTORY_NAME,
  REPOSITORY_ROOT,
  SOURCE_DIRECTORY_NAME,
  SOURCE_FILE_EXTENSIONS,
  STABLE_SORT_LOCALE,
  TEST_FILE_SUFFIXES,
} from "./workspace-policy.mjs";

const GUIDEBOOK_PATH = join("docs", "guidebook.md");
const SCRIPTS_DIRECTORY_NAME = "scripts";
const SCRIPT_FILE_EXTENSION = ".mjs";
const GUIDEBOOK_MARKER_PATTERN =
  /<!--\s*guidebook-module:\s*([^\s]+)\s*-->/g;
const GUIDEBOOK_TEST_FILE_SUFFIXES = [
  ...TEST_FILE_SUFFIXES,
  ".test.js",
  ".test.mjs",
];

/** Sorts repository paths with the locale shared by other policy checks. */
const sortPaths = (paths) =>
  [...paths].sort((left, right) => left.localeCompare(right, STABLE_SORT_LOCALE));

/** Converts an operating-system path into a stable repository path. */
const toRepositoryPath = (repositoryRoot, path) =>
  relative(repositoryRoot, path).split(sep).join("/");

/** Recursively returns every regular file below a directory. */
const walkFiles = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
};

/** Returns whether a source path is a colocated test rather than a documented module. */
const isTestModule = (path) =>
  GUIDEBOOK_TEST_FILE_SUFFIXES.some((suffix) => path.endsWith(suffix));

/** Extracts ordered module paths from guidebook coverage markers. */
export const collectGuidebookModules = (markdown) =>
  [...markdown.matchAll(GUIDEBOOK_MARKER_PATTERN)].map((match) => match[1]);

/** Discovers package source modules and repository policy scripts that require entries. */
export const discoverGuidebookModules = async (repositoryRoot = REPOSITORY_ROOT) => {
  const packageRoot = join(repositoryRoot, PACKAGES_DIRECTORY_NAME);
  const packageEntries = await readdir(packageRoot, { withFileTypes: true });
  const packageFiles = [];

  for (const entry of packageEntries) {
    if (!entry.isDirectory()) continue;
    const sourceRoot = join(packageRoot, entry.name, SOURCE_DIRECTORY_NAME);
    const sourceFiles = await walkFiles(sourceRoot);
    packageFiles.push(
      ...sourceFiles.filter(
        (path) => SOURCE_FILE_EXTENSIONS.has(extname(path)) && !isTestModule(path),
      ),
    );
  }

  const scriptsRoot = join(repositoryRoot, SCRIPTS_DIRECTORY_NAME);
  const scriptEntries = await readdir(scriptsRoot, { withFileTypes: true });
  const scriptFiles = scriptEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        extname(entry.name) === SCRIPT_FILE_EXTENSION &&
        !isTestModule(entry.name),
    )
    .map((entry) => join(scriptsRoot, entry.name));

  return sortPaths(
    [...packageFiles, ...scriptFiles].map((path) =>
      toRepositoryPath(repositoryRoot, path),
    ),
  );
};

/** Compares discovered modules with markers and returns deterministic diagnostics. */
export const compareGuidebookModules = (actualPaths, documentedPaths) => {
  const actual = new Set(actualPaths);
  const documented = new Set(documentedPaths);
  const counts = new Map();
  for (const path of documentedPaths) counts.set(path, (counts.get(path) ?? 0) + 1);

  const missing = sortPaths([...actual].filter((path) => !documented.has(path))).map(
    (path) => `Missing guidebook module: ${path}`,
  );
  const stale = sortPaths([...documented].filter((path) => !actual.has(path))).map(
    (path) => `Stale guidebook module: ${path}`,
  );
  const duplicate = sortPaths(
    [...counts].filter(([, count]) => count > 1).map(([path]) => path),
  ).map((path) => `Duplicate guidebook module: ${path}`);

  return [...missing, ...stale, ...duplicate];
};

/** Checks the repository guidebook and returns its module count and diagnostics. */
export const checkGuidebookCoverage = async (repositoryRoot = REPOSITORY_ROOT) => {
  const guidebook = await readFile(join(repositoryRoot, GUIDEBOOK_PATH), "utf8");
  const actualPaths = await discoverGuidebookModules(repositoryRoot);
  const documentedPaths = collectGuidebookModules(guidebook);
  return {
    actualPaths,
    documentedPaths,
    issues: compareGuidebookModules(actualPaths, documentedPaths),
  };
};

const EXECUTED_MODULE_PATH =
  process.argv[1] === undefined ? undefined : resolve(process.argv[1]);

if (EXECUTED_MODULE_PATH === fileURLToPath(import.meta.url)) {
  const report = await checkGuidebookCoverage();
  if (report.issues.length > 0) {
    console.error(report.issues.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Axiom guidebook covers ${report.actualPaths.length} modules.`);
  }
}
