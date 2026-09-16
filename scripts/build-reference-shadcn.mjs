import {build} from "esbuild";
import {createHash} from "node:crypto";
import {readFile, writeFile, mkdir, copyFile, readdir} from "node:fs/promises";
import {existsSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SOURCE = resolve(ROOT, "apps/studio/reference/shadcn");
const OUTPUT = resolve(ROOT, "dist/studio/references");
const provenance = JSON.parse(await readFile(resolve(SOURCE, "provenance.json"), "utf8"));
const assets = JSON.parse(await readFile(resolve(SOURCE, "assets.json"), "utf8"));
const digest = value => createHash("sha256").update(value).digest("hex");
for (const source of provenance.sources) {
  if (digest(await readFile(resolve(SOURCE, source.path))) !== source.vendoredSha256) throw new Error(`Changed upstream template: ${source.path}`);
}
for (const asset of Object.values(assets)) {
  if (digest(await readFile(resolve(SOURCE, asset.localPath))) !== asset.sha256) throw new Error(`Changed upstream asset: ${asset.localPath}`);
}
await mkdir(OUTPUT, {recursive: true});
const resolveSource = candidate => [candidate, `${candidate}.tsx`, `${candidate}.ts`, `${candidate}/index.tsx`, `${candidate}/index.ts`].find(existsSync);
const result = await build({
  absWorkingDir: SOURCE, entryPoints: ["entry.tsx"], outfile: resolve(OUTPUT, "shadcn.js"), bundle: true,
  minify: true, platform: "browser", format: "esm", target: ["es2023"], jsx: "automatic", sourcemap: true,
  metafile: true, legalComments: "eof", define: {"process.env.NODE_ENV": '"production"'},
  plugins: [{name: "pinned-upstream-reference", setup(plugin) {
    plugin.onResolve({filter: /^next\/(?:image|link)$/}, args => ({path: args.path, namespace: "reference-next"}));
    plugin.onLoad({filter: /.*/, namespace: "reference-next"}, args => ({contents: `export {${args.path.endsWith("image") ? "ReferenceImage" : "ReferenceLink"} as default} from ${JSON.stringify(resolve(SOURCE, "framework-adapters.tsx"))};`, loader: "tsx", resolveDir: SOURCE}));
    plugin.onResolve({filter: /^@\//}, args => {
      let target;
      const style = args.path.match(/^@\/styles\/((?:base|radix)-[^/]+)\/ui(?:-rtl)?\/(.+)$/);
      const registry = args.path.match(/^@\/registry\/((?:base|radix)-[^/]+)\/(.+)$/);
      if (style) target = `registry/${style[1]}/ui/${style[2]}`;
      else if (registry) target = `registry/${registry[1]}/${registry[2]}`;
      else target = `apps/v4/${args.path.slice(2)}`;
      const path = resolveSource(resolve(SOURCE, "upstream", target));
      if (!path) throw new Error(`Missing vendored source ${args.path} imported by ${args.importer}`);
      return {path};
    });
    plugin.onLoad({filter: /\.[cm]?[jt]sx?$/}, async args => {
      if (!args.path.startsWith(resolve(SOURCE, "upstream"))) return;
      let contents = await readFile(args.path, "utf8");
      for (const [source, asset] of Object.entries(assets)) contents = contents.split(source).join(asset.runtimePath);
      return {contents, loader: args.path.endsWith("tsx") ? "tsx" : "ts", resolveDir: dirname(args.path)};
    });
  }}],
});
const externalImports = Object.values(result.metafile.outputs).flatMap(output => output.imports.filter(item => item.external));
if (externalImports.length) throw new Error(`Reference has an unbundled runtime import: ${JSON.stringify(externalImports)}`);
const compiler = resolve(SOURCE, "node_modules/@tailwindcss/cli/dist/index.mjs");
const css = spawnSync(process.execPath, [compiler, "-i", "theme.css", "-o", resolve(OUTPUT, "shadcn.css"), "--minify"], {cwd: SOURCE, encoding: "utf8", windowsHide: true});
if (css.status !== 0) throw new Error(css.stderr || css.stdout || "Reference CSS build failed");
await mkdir(resolve(OUTPUT, "shadcn-assets"), {recursive: true});
for (const asset of Object.values(assets)) await copyFile(resolve(SOURCE, asset.localPath), resolve(ROOT, "dist/studio", asset.runtimePath.slice(1)));
const license = provenance.sources.find(source => /\/LICENSE(?:\.md)?$/.test(source.path));
if (license) await copyFile(resolve(SOURCE, license.path), resolve(OUTPUT, "shadcn-LICENSE.txt"));
const previews = [];
if (existsSync(resolve(SOURCE, "previews"))) {
  await mkdir(resolve(OUTPUT, "shadcn-previews"), {recursive: true});
  for (const name of (await readdir(resolve(SOURCE, "previews"))).filter(name => name.endsWith(".png"))) {
    const bytes = await readFile(resolve(SOURCE, "previews", name));
    await copyFile(resolve(SOURCE, "previews", name), resolve(OUTPUT, "shadcn-previews", name));
    previews.push({path: `shadcn-previews/${name}`, sha256: digest(bytes)});
  }
}
await writeFile(resolve(OUTPUT, "shadcn-manifest.json"), JSON.stringify({provider: "shadcn/ui", sourceRows: provenance.templates.map(template => template.sourceRow), sourceCommit: provenance.upstreamCommit, javascript: "shadcn.js", stylesheet: "shadcn.css", templates: provenance.templates, previews, inputs: Object.keys(result.metafile.inputs), javascriptSha256: digest(await readFile(resolve(OUTPUT, "shadcn.js"))), stylesheetSha256: digest(await readFile(resolve(OUTPUT, "shadcn.css")))}, null, 2)+"\n");
console.log(`Built ${provenance.templates.length} original shadcn/ui templates; ${provenance.sources.length} verified upstream files; no external runtime imports.`);
