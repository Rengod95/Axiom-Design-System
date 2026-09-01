import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const allowedRuntimeDependencies = {
  "spec-tooling": ["ajv"],
  "token-tooling": ["@axiom/tokens", "@terrazzo/parser"],
  tokens: [],
  "appearance-schema": ["@axiom/tokens"],
  recipes: ["@axiom/appearance-schema"],
  "recipe-engine": ["@axiom/appearance-schema", "@axiom/recipes"],
  "adapter-tailwind": [
    "@axiom/appearance-schema",
    "@axiom/recipe-engine",
    "@axiom/tokens",
  ],
  behavior: [],
  react: [
    "@axiom/adapter-tailwind",
    "@axiom/appearance-schema",
    "@axiom/behavior",
    "@axiom/recipe-engine",
    "@axiom/recipes",
    "react-aria-components",
  ],
};

const issues = [];

for (const [packageName, allowed] of Object.entries(allowedRuntimeDependencies)) {
  const packagePath = join(root, "packages", packageName, "package.json");
  const manifest = JSON.parse(await readFile(packagePath, "utf8"));
  const actual = Object.keys(manifest.dependencies ?? {}).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...allowed].sort())) {
    issues.push(
      `${relative(root, packagePath)}: runtime dependencies ${JSON.stringify(actual)} do not match ${JSON.stringify([...allowed].sort())}`,
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

const corePackages = [
  "spec-tooling",
  "token-tooling",
  "tokens",
  "appearance-schema",
  "recipes",
];
const forbiddenImports = [
  /from\s+["']react(?:\/|["'])/,
  /from\s+["']react-aria/,
  /from\s+["']react-aria-components/,
  /from\s+["']@base-ui/,
  /from\s+["']tailwindcss/,
];

for (const packageName of corePackages) {
  const sourceRoot = join(root, "packages", packageName, "src");
  const files = (await walk(sourceRoot)).filter(
    (path) =>
      [".ts", ".tsx"].includes(extname(path)) &&
      !path.endsWith(".test.ts") &&
      !path.includes(`${join("src", "generated")}`),
  );
  for (const path of files) {
    const source = await readFile(path, "utf8");
    for (const pattern of forbiddenImports) {
      if (pattern.test(source)) {
        issues.push(`${relative(root, path)}: forbidden renderer import ${pattern}`);
      }
    }
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Axiom package boundaries are valid.");
}
