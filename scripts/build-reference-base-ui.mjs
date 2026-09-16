import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SOURCE = resolve(ROOT, "apps/studio/reference/base-ui");
const OUTPUT = resolve(ROOT, "dist/studio/references");
const provenance = JSON.parse(await readFile(resolve(SOURCE, "provenance.json"), "utf8"));
for (const source of provenance.files) {
  const actual = createHash("sha256").update(await readFile(resolve(SOURCE, source.path))).digest("hex");
  if (source.sha256 !== actual) throw new Error(`Base UI upstream source changed: ${source.path}`);
}
await mkdir(OUTPUT, { recursive: true });
const result = await build({ absWorkingDir: ROOT, entryPoints: [resolve(SOURCE, "entry.tsx")], outfile: resolve(OUTPUT, "base-ui.js"), bundle: true,
  minify: true, loader: { ".module.css": "local-css" }, platform: "browser", format: "esm", target: ["es2023"], jsx: "automatic", metafile: true,
  legalComments: "eof", define: { "process.env.NODE_ENV": '"production"' } });
if (Object.values(result.metafile.outputs).some(output => output.imports.some(item => item.external))) throw new Error("Base UI reference has an external module import.");
await copyFile(resolve(SOURCE, "LICENSE.upstream"), resolve(OUTPUT, "base-ui-LICENSE.txt"));
await copyFile(resolve(SOURCE, "provenance.json"), resolve(OUTPUT, "base-ui-provenance.json"));
const files = Object.keys(result.metafile.outputs).map(path => relative(OUTPUT, resolve(ROOT, path)).replaceAll("\\", "/"));
const previewManifest = JSON.parse(await readFile(resolve(SOURCE, "previews/manifest.json"), "utf8"));
const previews = [];
await mkdir(resolve(OUTPUT, "base-ui-previews"), { recursive: true });
for (const template of provenance.templates) for (const theme of ["light", "dark"]) {
  const name = `${template.sourceRow}-${theme}.png`;
  const asset = previewManifest.assets.find(item => item.sourceRow === template.sourceRow && item.theme === theme && item.file === name);
  if (!asset) throw new Error(`Missing Base UI preview: ${name}`);
  const bytes = await readFile(resolve(SOURCE, "previews", name));
  const file = `base-ui-previews/${name}`;
  await writeFile(resolve(OUTPUT, file), bytes);
  previews.push({ ...asset, file, sha256: createHash("sha256").update(bytes).digest("hex") });
}
await writeFile(resolve(OUTPUT, "base-ui-manifest.json"), JSON.stringify({ provider: "Base UI", version: "1.8.0", commit: provenance.commit,
  sourceRows: provenance.templates.map(template => template.sourceRow), files, styles: ["base-ui.css"], entry: "base-ui.js",
  previews, license: "base-ui-LICENSE.txt", provenance: "base-ui-provenance.json", outputs: result.metafile.outputs }, null, 2) + "\n");
console.log(`Built ${provenance.templates.length} official Base UI reference templates.`);
