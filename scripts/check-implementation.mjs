import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
import ts from "typescript";
import { OPERATION_SCOPES } from "../modules/ads-core/src/constants.ts";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MODULES = ["modules/ads-core", "modules/local-store", "apps/cli", "modules/browser-store", "modules/target-packs", "apps/studio", "apps/delivery"].map((path) => resolve(ROOT, path));
const CORE_ROOT = resolve(MODULES[0], "src");
const BROWSER_ROOT = resolve(MODULES[3], "src");
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
  const isBrowser = within(BROWSER_ROOT, path);
  const isStudio = ownModule === MODULES[5];
  const neutral = isCore || isBrowser || ownModule === MODULES[4] || isStudio;
  const label = relative(ROOT, path);
  if (/@ts-(?:nocheck|ignore)\b/.test(source) && !["generated/document-envelope.ts", "generated/catalog-structure.ts", "generated/type-expression.ts"].some((generated) => path === resolve(CORE_ROOT, generated))) throw new Error(`Unapproved type-check suppression: ${label}`);
  function dependency(target) {
    if (!target.startsWith(".")) {
      if (path === resolve(BROWSER_ROOT, "browser-services.ts") && target === "@noble/hashes/sha2.js") return;
      if (isStudio && ["react", "react-dom/client"].includes(target)) return;
      if (path === resolve(MODULES[5], "src/ui.tsx") && target === "react-dom") return;
      if (neutral || !NODE_BUILTINS.has(target)) throw new Error(`Unapproved dependency in ${label}: ${target}`);
      return;
    }
    const destination = resolve(dirname(path), target);
    const targetModule = MODULES.find((root) => within(root, destination));
    if (!targetModule) throw new Error(`Dependency escapes implementation modules: ${label} → ${target}`);
    if (isCore && !within(CORE_ROOT, destination)) throw new Error(`Core dependency escapes its source boundary: ${label} → ${target}`);
    if (targetModule !== ownModule && destination !== resolve(targetModule, "src/index.ts")) throw new Error(`Cross-module dependency must use the public barrel: ${label} → ${target}`);
    const permitted = [[0], [0, 1], [0, 1, 2], [0, 3], [0, 4], [0, 3, 4, 5], [0, 1, 4, 6]][MODULES.indexOf(ownModule)];
    if (!permitted.includes(MODULES.indexOf(targetModule))) throw new Error(`Dependency violates ADR-0014 ownership: ${label} → ${target}`);
  }
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
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
    if (neutral && ts.isIdentifier(node) && NODE_GLOBALS.has(node.text)) throw new Error(`Node identifier in core: ${label}: ${node.text}`);
    if (neutral && (ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(node.expression) && ["eval", "Function"].includes(node.expression.text)) throw new Error(`Runtime code generation in core: ${label}`);
    if (neutral && ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && NODE_GLOBALS.has(node.argumentExpression.text)) throw new Error(`Node global access in core: ${label}`);
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
const sources = MODULES.flatMap((root) => files(resolve(root, "src"))).filter((path) => /\.tsx?$/.test(path));
if (sources.filter((path) => within(CORE_ROOT, path)).length < 2) throw new Error("Core implementation is missing");
for (const path of sources) checkSource(path, readFileSync(path, "utf8"));
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
if (JSON.stringify(pkg.dependencies) !== JSON.stringify({ "@noble/hashes": "2.4.0", "@sun-typeface/suit": "2.0.5", "geist": "1.7.2", "react": "19.3.0", "react-dom": "19.3.0" })) throw new Error("Runtime dependencies differ from ADR-0015");
if (pkg.devDependencies["fake-indexeddb"] !== "6.2.5") throw new Error("Browser test emulator differs from ADR-0013");
for (const [name, version] of Object.entries({ "@types/react": "19.3.0", "@types/react-dom": "19.3.0", "esbuild": "0.28.2" })) if (pkg.devDependencies[name] !== version) throw new Error(`Studio tooling pin differs: ${name}`);
const catalog = JSON.parse(readFileSync(resolve(ROOT, "docs/foundation/annexes/command-catalog.json"), "utf8"));
const roadmap = JSON.parse(readFileSync(resolve(ROOT, "docs/implementation/implementation-roadmap.json"), "utf8"));
for (const kind of ["commands", "queries"]) {
  const expected = catalog[kind].map((entry) => entry.id).sort();
  const actual = roadmap[kind].map((entry) => entry.id).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected) || new Set(actual).size !== actual.length) throw new Error(`Implementation roadmap ${kind} inventory drift`);
  if (roadmap[kind].some((entry) => !["PARTIAL_PROFILE", "PLANNED"].includes(entry.status))) throw new Error(`Unsupported roadmap ${kind} completion claim`);
}
const partialCommands = roadmap.commands.filter((entry) => entry.status === "PARTIAL_PROFILE").map((entry) => entry.id).sort();
if (JSON.stringify(partialCommands) !== JSON.stringify(Object.keys(OPERATION_SCOPES).sort())) throw new Error("Implemented command profile differs from roadmap");

// Verify the guard itself without writing invalid source into the checkout.
const cases = [
  [resolve(MODULES[4], "src/fixture.ts"), 'import x from "react";'],
  [resolve(MODULES[4], "src/fixture.ts"), 'import x from "../../browser-store/src/index.ts";'],
  [resolve(MODULES[5], "src/fixture.tsx"), 'import x from "../../../modules/local-store/src/index.ts";'],
  [resolve(MODULES[5], "src/fixture.tsx"), 'const value = <div>{process.env.VALUE}</div>;'],
  [resolve(MODULES[6], "src/fixture.ts"), 'import x from "../../studio/src/index.ts";'],
  [resolve(CORE_ROOT, "fixture.ts"), 'import x from "../../target-packs/src/index.ts";'],
  [resolve(BROWSER_ROOT, "fixture.ts"), 'import fs from "node:fs";'],
  [resolve(BROWSER_ROOT, "fixture.ts"), 'import x from "@noble/hashes/sha2.js";'],
  [resolve(BROWSER_ROOT, "browser-services.ts"), 'import x from "@noble/hashes/utils.js";'],
  [resolve(CORE_ROOT, "fixture.ts"), 'import x from "@noble/hashes/sha2.js";'],
  [resolve(BROWSER_ROOT, "fixture.ts"), 'import x from "../../local-store/src/index.ts";'],
  [resolve(MODULES[1], "src/fixture.ts"), 'import x from "../../browser-store/src/index.ts";'],
  [resolve(CORE_ROOT, "fixture.ts"), 'import fs from "node:fs";'],
  [resolve(CORE_ROOT, "fixture.ts"), 'export type T = import("node:fs").Stats;'],
  [resolve(CORE_ROOT, "fixture.ts"), 'const x = import(target);'],
  [resolve(CORE_ROOT, "fixture.ts"), 'const x = globalThis["process"];'],
  [resolve(CORE_ROOT, "fixture.ts"), 'const x = new Function("return 1");'],
  [resolve(CORE_ROOT, "fixture.ts"), '// @ts-nocheck\nconst value = 1;'],
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
