import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const PACKAGES_DIRECTORY_NAME = "packages";
export const SOURCE_DIRECTORY_NAME = "src";
export const PACKAGE_MANIFEST_NAME = "package.json";
export const PACKAGE_CONSTANTS_MODULE = "constants.ts";
export const STABLE_SORT_LOCALE = "en";

export const PACKAGE_RUNTIME_DEPENDENCIES = {
  "appearance-normalizer": [
    "@axiom/appearance-authoring",
    "@axiom/condition-registry",
    "@axiom/motion-schema",
  ],
  "appearance-authoring": [
    "@axiom/condition-registry",
    "@axiom/css-property-profile",
    "@axiom/motion-schema",
    "@axiom/recipe-kernel",
    "@axiom/tokens",
  ],
  "behavior-contracts": [],
  "css-property-profile": ["@webref/css", "css-tree"],
  "condition-registry": [],
  "motion-schema": [
    "@axiom/condition-registry",
    "@axiom/css-property-profile",
    "@axiom/tokens",
  ],
  "recipe-kernel": [],
  "spec-tooling": ["@axiom/condition-registry", "@axiom/css-property-profile", "ajv"],
  "token-tooling": ["@axiom/tokens", "@terrazzo/parser"],
  tokens: [],
};

export const RENDERER_INDEPENDENT_PACKAGES = Object.keys(
  PACKAGE_RUNTIME_DEPENDENCIES,
);

export const GENERATED_REFERENCE_PACKAGES = [
  "behavior-contracts",
  "condition-registry",
  "motion-schema",
];

export const FORBIDDEN_RENDERER_IMPORT_PATTERNS = [
  /from\s+["']react(?:\/|["'])/,
  /from\s+["']react-aria/,
  /from\s+["']react-aria-components/,
  /from\s+["']@base-ui/,
  /from\s+["']tailwindcss/,
];

export const FORBIDDEN_SPEC_TOOLING_IMPORT_PATTERN = /from\s+["']@axiom\/spec-tooling(?:\/|["'])/;

export const SOURCE_FILE_EXTENSIONS = new Set([".js", ".mjs", ".ts", ".tsx"]);
export const TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx"];
export const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "coverage",
  "dist",
  "node_modules",
]);

export const VERSIONED_PATH_NAME_PATTERN =
  /(?:^|[-_.])v(?:\d+[-_.]\d+|\d{2,})(?:[-_.]|$)/i;
export const VERSIONED_IDENTIFIER_PATTERN =
  /\b[A-Za-z_$][A-Za-z0-9_$]*V(?:\d{2,}|\d+(?:_\d+)+)\b/g;
export const EXPORTED_CONSTANT_DECLARATION_PATTERN =
  /\bexport\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
export const CONSTANT_CASE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
