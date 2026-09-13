import { build } from "esbuild";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUTPUT = resolve(ROOT, "dist/studio");
await mkdir(OUTPUT, { recursive: true });
const result = await build({ absWorkingDir: ROOT, entryPoints: ["apps/studio/src/main.tsx"], outfile: "dist/studio/app.js", bundle: true, minify: true, loader: { ".woff2": "file" }, assetNames: "[name]",
  platform: "browser", format: "esm", target: ["es2023"], jsx: "automatic", sourcemap: true, metafile: true, legalComments: "eof", define: { "process.env.NODE_ENV": '"production"' } });
if (Object.keys(result.metafile.inputs).some(path => /modules\/local-store|apps\/(?:cli|delivery)/.test(path))) throw new Error("Studio bundle includes a Node adapter.");
if (Object.values(result.metafile.outputs).some(output => output.imports.some(item => item.external))) throw new Error("Studio has an unbundled external dependency.");
await copyFile(resolve(ROOT, "apps/studio/index.html"), resolve(OUTPUT, "index.html"));
await copyFile(resolve(ROOT, "node_modules/@sun-typeface/suit/fonts/variable/woff2/SUIT-Variable.woff2"), resolve(OUTPUT, "SUIT-Variable.woff2"));
await copyFile(resolve(ROOT, "node_modules/@sun-typeface/suit/LICENSE"), resolve(OUTPUT, "SUIT-OFL.txt"));
await writeFile(resolve(OUTPUT, "build-evidence.json"), `${JSON.stringify({ kind: "axiom-studio-build", inputs: Object.keys(result.metafile.inputs).sort(), outputs: Object.fromEntries(Object.entries(result.metafile.outputs).map(([path, value]) => [path, { bytes: value.bytes }])) }, null, 2)}\n`);
console.log(`Built local Studio: ${Object.keys(result.metafile.inputs).length} inputs; no Node adapter or external imports`);
