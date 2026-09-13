import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
import ts from "typescript";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MODULES = ["modules/ads-core", "modules/local-store", "apps/cli"].map((path) => resolve(ROOT, path));
const CORE_ROOT = resolve(MODULES[0], "src");
const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
const NODE_GLOBALS = new Set(["process", "Buffer", "require", "__dirname", "__filename"]);

function within(root, path) {
  const difference = relative(root, path);
  return difference === "" || (!isAbsolute(difference) && difference !== ".." && !difference.startsWith("..\\") && !difference.startsWith("../"));
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Source symlink: ${path}`);
    return entry.isDirectory() ? files(path) : [path];
  });
}
function checkSource(path, source) {
  const ownModule = MODULES.find((root) => within(root, path));
  const isCore = within(CORE_ROOT, path);
  const label = relative(ROOT, path);
  function dependency(target) {
    if (!target.startsWith(".")) {
      if (isCore || !NODE_BUILTINS.has(target)) throw new Error(`Unapproved dependency in ${label}: ${target}`);
      return;
    }
    const destination = resolve(dirname(path), target);
    const targetModule = MODULES.find((root) => within(root, destination));
    if (!targetModule) throw new Error(`Dependency escapes implementation modules: ${label} → ${target}`);
    if (isCore && !within(CORE_ROOT, destination)) throw new Error(`Core dependency escapes its source boundary: ${label} → ${target}`);
    if (targetModule !== ownModule && destination !== resolve(targetModule, "src/index.ts")) throw new Error(`Cross-module dependency must use the public barrel: ${label} → ${target}`);
    if (ownModule === MODULES[1] && targetModule === MODULES[2]) throw new Error(`Storage adapter depends on CLI: ${label}`);
  }
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (!ts.isStringLiteral(node.moduleSpecifier)) throw new Error(`Nonliteral dependency: ${label}`);
      dependency(node.moduleSpecifier.text);
    }
    if (ts.isImportTypeNode(node)) {
      if (!ts.isLiteralTypeNode(node.argument) || !ts.isStringLiteral(node.argument.literal)) throw new Error(`Nonliteral type dependency: ${label}`);
      dependency(node.argument.literal.text);
    }
    if (ts.isImportEqualsDeclaration(node)) throw new Error(`Legacy import is outside the ESM profile: ${label}`);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) throw new Error(`Computed dynamic dependency: ${label}`);
      dependency(node.arguments[0].text);
    }
    if (isCore && ts.isIdentifier(node) && NODE_GLOBALS.has(node.text)) throw new Error(`Node identifier in core: ${label}: ${node.text}`);
    if (isCore && ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && NODE_GLOBALS.has(node.argumentExpression.text)) throw new Error(`Node global access in core: ${label}`);
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
const sources = MODULES.flatMap((root) => files(resolve(root, "src"))).filter((path) => path.endsWith(".ts"));
if (sources.filter((path) => within(CORE_ROOT, path)).length < 2) throw new Error("Core implementation is missing");
for (const path of sources) checkSource(path, readFileSync(path, "utf8"));
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
if (Object.keys(pkg.dependencies ?? {}).length) throw new Error("Runtime dependencies require a profile review");

// Verify the guard itself without writing invalid source into the checkout.
const cases = [
  [resolve(CORE_ROOT, "fixture.ts"), 'import fs from "node:fs";'],
  [resolve(CORE_ROOT, "fixture.ts"), 'export type T = import("node:fs").Stats;'],
  [resolve(CORE_ROOT, "fixture.ts"), 'const x = import(target);'],
  [resolve(CORE_ROOT, "fixture.ts"), 'const x = globalThis["process"];'],
  [resolve(MODULES[2], "src/fixture.ts"), 'import x from "../../../modules/ads-core/src/contracts.ts";'],
  [resolve(MODULES[1], "src/fixture.ts"), 'import x from "../../../apps/cli/src/index.ts";'],
];
for (const [path, source] of cases) {
  let rejected = false;
  try { checkSource(path, source); } catch { rejected = true; }
  if (!rejected) throw new Error(`Boundary guard failed its negative case: ${source}`);
}
checkSource(resolve(CORE_ROOT, "fixture.ts"), '// import fs from "node:fs";\nconst note = "process.Buffer require(1)";');
console.log(`Implementation boundaries passed: ${sources.length} source files; ${cases.length} negative cases`);
