import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'apps/studio/reference/mantine');
const require = createRequire(path.join(root, 'package.json'));
const ownModules = path.join(root, 'node_modules') + path.sep;
if (!require.resolve('esbuild').startsWith(ownModules)) throw new Error('Install the Mantine reference package with npm ci --ignore-scripts before building.');
const { build } = require('esbuild');
const postcss = require('postcss');
const presetMantine = require('postcss-preset-mantine');
const simpleVars = require('postcss-simple-vars');
const manifest = JSON.parse(await readFile(path.join(root, 'upstream-manifest.json'), 'utf8'));
for (const entry of manifest.files) {
  const bytes = await readFile(path.join(root, entry.path));
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error(`Pinned Mantine source changed: ${entry.path}`);
}
const outdir = path.join(repo, 'dist/studio/references');
await mkdir(outdir, { recursive: true });
const assets = (manifest.assets ?? []).map((asset) => ({ ...asset, output: `mantine-assets/${path.basename(asset.path, path.extname(asset.path))}-${asset.sha256.slice(0,12)}${path.extname(asset.path)}` }));
await mkdir(path.join(outdir, 'mantine-assets'), { recursive: true });
for (const asset of assets) await copyFile(path.join(root, asset.path), path.join(outdir, asset.output));
const result = await build({
  absWorkingDir: root,
  entryPoints: { mantine: 'entry.tsx' },
  outdir,
  bundle: true,
  splitting: true,
  chunkNames: 'mantine-chunks/[name]-[hash]',
  assetNames: 'mantine-assets/[name]-[hash]',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  tsconfigRaw: { compilerOptions: { jsx: 'react-jsx', verbatimModuleSyntax: false } },
  minify: true,
  legalComments: 'eof',
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'mantine-official-demo-css',
    setup(build) {
      build.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
        if (!args.path.startsWith(path.join(root, 'upstream'))) return;
        let contents = await readFile(args.path, 'utf8');
        for (const asset of assets) contents = contents.replaceAll(asset.originalUrl, `/references/${asset.output}`);
        return { contents, loader: args.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
      });
      build.onResolve({ filter: /\.css\?inline$/ }, (args) => ({ path: path.resolve(args.resolveDir, args.path.slice(0, -7)), namespace: 'reference-css-text' }));
      build.onLoad({ filter: /.*/, namespace: 'reference-css-text' }, async (args) => ({ contents: await readFile(args.path, 'utf8'), loader: 'text' }));
      build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
        if (!args.path.startsWith(path.join(root, 'upstream'))) return;
        const source = await readFile(args.path, 'utf8');
        const result = await postcss([presetMantine(), simpleVars({ variables: { 'mantine-breakpoint-xs': '36em', 'mantine-breakpoint-sm': '48em', 'mantine-breakpoint-md': '62em', 'mantine-breakpoint-lg': '75em', 'mantine-breakpoint-xl': '88em' } })]).process(source, { from: args.path });
        return { contents: result.css, loader: 'local-css', resolveDir: path.dirname(args.path) };
      });
    },
  }],
});
const outsideImports = Object.values(result.metafile.outputs).flatMap((output) => output.imports).filter((entry) => entry.external && !(entry.kind === 'url-token' && entry.path.startsWith('data:image/')));
if (outsideImports.length) throw new Error(`Unbundled Mantine imports: ${JSON.stringify(outsideImports)}`);
for (const input of Object.keys(result.metafile.inputs)) {
  const absolute = path.resolve(root, input);
  if (absolute.includes(`${path.sep}node_modules${path.sep}`) && !absolute.startsWith(ownModules)) throw new Error(`Mantine dependency resolved outside its private package: ${input}`);
}
const previews = [];
try {
  const previewManifest = JSON.parse(await readFile(path.join(root, 'previews-manifest.json'), 'utf8'));
  await mkdir(path.join(outdir, 'mantine-previews'), { recursive: true });
  for (const preview of previewManifest.previews) {
    const bytes = await readFile(path.join(root, preview.path));
    if (createHash('sha256').update(bytes).digest('hex') !== preview.sha256) throw new Error(`Mantine preview changed: ${preview.path}`);
    const output = `mantine-previews/${path.basename(preview.path)}`;
    await copyFile(path.join(root, preview.path), path.join(outdir, output));
    previews.push({...preview, output});
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await copyFile(path.join(root, 'LICENSE-Mantine'), path.join(outdir, 'mantine-LICENSE.txt'));
await copyFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(outdir, 'mantine-THIRD-PARTY-NOTICES.txt'));
await writeFile(path.join(outdir, 'mantine-manifest.json'), JSON.stringify({ provider: 'Mantine', version: manifest.version, upstreamCommit: manifest.commit, entry: 'mantine.js', styles: 'mantine.css', templates: manifest.templates.map(({sourceLocal,exportName,factory,directComponent,...entry}) => entry), assets: assets.map(({path,originalUrl,sourceUrl,sha256,license,licenseUrl,author,attribution,output}) => ({path,originalUrl,sourceUrl,sha256,license,licenseUrl,author,attribution,output})), previews, outputs: [...Object.keys(result.metafile.outputs).map((filename) => path.relative(outdir, path.resolve(root, filename)).replaceAll('\\','/')), ...assets.map((asset) => asset.output), ...previews.map((preview) => preview.output), 'mantine-LICENSE.txt','mantine-THIRD-PARTY-NOTICES.txt'] }, null, 2)+'\n');
console.log(`Built ${manifest.templates.length} pinned Mantine reference templates.`);
