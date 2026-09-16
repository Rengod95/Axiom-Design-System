/** Maintenance only: refresh the allowlisted official demo closure at the pinned release. */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '../../../..');
const evidence = path.join(repo, 'dist/evidence/catalog-reference');
const commit = '61049ecd950f6fb9ddc631decfec2edbdffe58e1';
const sourcePrefix = 'packages/@docs/demos/src/';
const tree = JSON.parse(await readFile(path.join(evidence, 'mantine-tree.json'), 'utf8'));
const upstreamPaths = new Set(tree.tree.filter((entry) => entry.type === 'blob').map((entry) => entry.path));
const selected = JSON.parse(await readFile(path.join(root, 'selected-source.json'), 'utf8'));
const rawBase = `https://raw.githubusercontent.com/mantinedev/mantine/${commit}/`;
const fetched = new Map();
const sourceRecords = [];
const templates = [];
const assets = [];
const queue = [];
const queued = new Set();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const posix = path.posix;

function localPath(sourcePath) {
  if (sourcePath.startsWith(sourcePrefix)) return `upstream/${sourcePath.slice(sourcePrefix.length)}`;
  if (sourcePath.endsWith('/BasicAppShell.tsx')) return 'upstream/BasicAppShell.tsx';
  if (sourcePath === 'apps/mantine.dev/theme.ts') return 'upstream/docs-theme.ts';
  if (sourcePath.endsWith('/ModalsProviderDemo.tsx')) return 'upstream/ModalsProviderDemo.tsx';
  throw new Error(`Unsupported source destination: ${sourcePath}`);
}

async function sourceBytes(sourcePath) {
  if (fetched.has(sourcePath)) return fetched.get(sourcePath);
  let bytes;
  try { bytes = await readFile(path.join(evidence, 'mantine-pinned-source', sourcePath)); }
  catch {
    const response = await fetch(rawBase + sourcePath);
    if (!response.ok) throw new Error(`${response.status}: ${sourcePath}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  fetched.set(sourcePath, bytes);
  return bytes;
}

function enqueue(sourcePath) {
  if (queued.has(sourcePath)) return;
  if (!upstreamPaths.has(sourcePath)) throw new Error(`Source not in pinned tree: ${sourcePath}`);
  queued.add(sourcePath);
  queue.push(sourcePath);
}

function resolveRelative(sourcePath, specifier) {
  const relative = specifier.split('?')[0];
  const target = posix.normalize(posix.join(posix.dirname(sourcePath), relative));
  const found = [target, `${target}.ts`, `${target}.tsx`, `${target}.css`, `${target}/index.ts`, `${target}/index.tsx`].find((candidate) => upstreamPaths.has(candidate));
  if (!found) throw new Error(`Unresolved official relative import ${specifier} from ${sourcePath}`);
  return found;
}

for (const entry of selected) {
  let sourcePath;
  let exportName;
  let factory;
  const defaultDemo = entry.officialDemoIds[0]?.split('.').at(-1);
  if (['DatePicker', 'MonthPicker', 'YearPicker'].includes(entry.name)) {
    sourcePath = `${sourcePrefix}demos/dates/_shared/picker-usage.demo.tsx`;
    exportName = 'getPickerUsageDemo';
    factory = entry.name;
  } else if (['DatePickerInput', 'MonthPickerInput', 'YearPickerInput'].includes(entry.name)) {
    sourcePath = `${sourcePrefix}demos/dates/_shared/picker-input-usage.demo.tsx`;
    exportName = 'getPickerInputUsageDemo';
    factory = entry.name;
  } else if (entry.name === 'AppShell') {
    sourcePath = entry.defaultDemoPaths[0];
    exportName = 'BasicAppShell';
  } else if (entry.defaultDemoPaths.length) {
    sourcePath = entry.defaultDemoPaths[0];
    exportName = defaultDemo;
  }
  let sourceLocal;
  if (sourcePath) {
    enqueue(sourcePath);
    sourceLocal = localPath(sourcePath);
  } else {
    const snippet = entry.defaultCodeBlock;
    if (!snippet || !snippet.includes('function Demo()')) throw new Error(`No executable official source for ${entry.name}`);
    const source = snippet.replace('function Demo()', 'export function Demo()') + '\n';
    sourceLocal = `upstream/snippets/row-${entry.sourceRow}.tsx`;
    await mkdir(path.dirname(path.join(root, sourceLocal)), { recursive: true });
    await writeFile(path.join(root, sourceLocal), source);
    sourceRecords.push({ path: sourceLocal, sourceUrl: entry.pinnedDocsSource, upstreamCommit: commit, sha256: sha256(source), upstreamSnippetSha256: sha256(snippet), transform: 'Extract first usage TSX code block; export Demo for the fixed registry.', license: 'MIT' });
    exportName = 'Demo';
  }
  templates.push({ sourceRow: entry.sourceRow, catalogId: entry.catalogId, name: entry.name, provider: entry.provider, package: entry.package, version: entry.version, docsUrl: entry.docsUrl, sourceUrl: sourcePath ? `https://github.com/mantinedev/mantine/blob/${commit}/${sourcePath}` : entry.pinnedDocsSource, upstreamCommit: commit, sourceLocal, exportName, factory, directComponent: entry.name === 'AppShell' || !sourcePath });
}
enqueue('apps/mantine.dev/theme.ts');
enqueue('apps/mantine.dev/src/components/ModalsProviderDemo/ModalsProviderDemo.tsx');

while (queue.length) {
  const batch = queue.splice(0, 12);
  await Promise.all(batch.map(async (sourcePath) => {
    const bytes = await sourceBytes(sourcePath);
    const source = bytes.toString('utf8');
    const destination = localPath(sourcePath);
    await mkdir(path.dirname(path.join(root, destination)), { recursive: true });
    await writeFile(path.join(root, destination), bytes);
    sourceRecords.push({ path: destination, sourceUrl: `https://github.com/mantinedev/mantine/blob/${commit}/${sourcePath}`, upstreamPath: sourcePath, upstreamCommit: commit, sha256: sha256(bytes), license: 'MIT', transform: null });
    if (/\.[cm]?[jt]sx?$/.test(sourcePath)) {
      const parsed = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      for (const statement of parsed.statements) {
        if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier = statement.moduleSpecifier.text;
        if (specifier.startsWith('.')) enqueue(resolveRelative(sourcePath, specifier));
        else if (specifier.startsWith('@docs/')) throw new Error(`Unexpected documentation package dependency: ${specifier}`);
      }
    }
  }));
}

const licenseBytes = await sourceBytes('LICENSE');
await writeFile(path.join(root, 'LICENSE-Mantine'), licenseBytes);
sourceRecords.push({ path: 'LICENSE-Mantine', sourceUrl: `https://github.com/mantinedev/mantine/blob/${commit}/LICENSE`, upstreamCommit: commit, sha256: sha256(licenseBytes), license: 'MIT', transform: null });
const imageUrls = new Set();
for (const bytes of fetched.values()) {
  for (const match of bytes.toString('utf8').matchAll(/https:\/\/raw\.githubusercontent\.com\/mantinedev\/mantine\/master\/(\.demo\/[^\s'"<>`]+\.(?:png|jpg|svg))/g)) imageUrls.add(match[1]);
}
for (const sourcePath of imageUrls) {
  if (!upstreamPaths.has(sourcePath)) throw new Error(`Demo image not in pinned tree: ${sourcePath}`);
  const bytes = await sourceBytes(sourcePath);
  const destination = `assets/${posix.basename(sourcePath)}`;
  await mkdir(path.join(root, 'assets'), { recursive: true });
  await writeFile(path.join(root, destination), bytes);
  const asset = { path: destination, sourceUrl: `https://github.com/mantinedev/mantine/blob/${commit}/${sourcePath}`, originalUrl: `https://raw.githubusercontent.com/mantinedev/mantine/master/${sourcePath}`, upstreamCommit: commit, sha256: sha256(bytes), license: 'MIT', transform: null };
  sourceRecords.push(asset);
  assets.push(asset);
}
const photograph = {
  originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Rock_in_caputh-WBTBWB-47.jpg/600px-Rock_in_caputh-WBTBWB-47.jpg',
  retrievedUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Rock_in_caputh-WBTBWB-47.jpg',
  path: 'assets/rock-in-caputh.jpg',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rock_in_caputh-WBTBWB-47.jpg',
  license: 'CC-BY-SA-3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  author: 'Henry Laurisch',
  attribution: 'Rock in Caputh – WBTBWB, Henry Laurisch, CC BY-SA 3.0. Original Wikimedia image; no content edits. The official demo 600px thumbnail URL returned HTTP 400, so the same original photograph is sized by the unchanged component CSS.',
};
let photographBytes;
try { photographBytes = await readFile(path.join(root, photograph.path)); }
catch {
  const response = await fetch(photograph.retrievedUrl);
  if (!response.ok) throw new Error(`Official demo photograph fetch failed: ${response.status}`);
  photographBytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(root, photograph.path), photographBytes);
}
const photographRecord = {...photograph,sha256:sha256(photographBytes),transform:'Original Wikimedia photograph, unchanged; replaces the same image thumbnail URL which returned HTTP 400.'};
sourceRecords.push(photographRecord);
assets.push(photographRecord);
const outlinePath = 'apps/mantine.dev/src/pages/core/table-of-contents.mdx';
const outlineSource = (await sourceBytes(outlinePath)).toString('utf8');
const outline = [...outlineSource.matchAll(/^(#{1,6}) ([^\r\n]+)|^<AutoContrast /gm)].map((match) => ({ depth: match[1]?.length ?? 2, title: match[2] ?? 'autoContrast' }));
const outlineBytes = JSON.stringify(outline,null,2)+'\n';
await mkdir(path.join(root,'fixtures'),{recursive:true});
await writeFile(path.join(root,'fixtures/table-of-contents.json'),outlineBytes);
sourceRecords.push({path:'fixtures/table-of-contents.json',sourceUrl:`https://github.com/mantinedev/mantine/blob/${commit}/${outlinePath}`,upstreamCommit:commit,sha256:sha256(outlineBytes),license:'MIT',transform:'Extract the actual document heading context consumed by the official first TableOfContents demo, including the AutoContrast heading.'});
sourceRecords.sort((a, b) => a.path.localeCompare(b.path));
templates.sort((a, b) => a.sourceRow - b.sourceRow);
await writeFile(path.join(root, 'upstream-manifest.json'), JSON.stringify({ provider: 'Mantine', version: '9.6.1', commit, license: 'MIT', files: sourceRecords, assets, templates }, null, 2)+'\n');

const registryImports = [];
for (const entry of templates) {
  const adapter = `generated/row-${entry.sourceRow}.tsx`;
  const importPath = '../'+entry.sourceLocal;
  let text = `import { ${entry.exportName} as source } from ${JSON.stringify(importPath)};\n`;
  if (entry.factory) text += `import { ${entry.factory} } from '@mantine/dates';\nexport default source(${entry.factory});\n`;
  else if (entry.directComponent) text += `export default { component: source, type: 'code' };\n`;
  else text += 'export default source;\n';
  await mkdir(path.join(root, 'generated'), { recursive: true });
  await writeFile(path.join(root, adapter), text);
  registryImports.push(`  ${entry.sourceRow}: () => import('./${adapter}'),`);
}
await writeFile(path.join(root, 'registry.ts'), `/** Generated from the pinned Mantine first-demo source manifest. */\nexport const referenceTemplates = ${JSON.stringify(templates.map(({sourceLocal,exportName,factory,directComponent,...meta}) => meta),null,2)} as const;\n\nexport const demoLoaders: Record<number, () => Promise<{ default: any }>> = {\n${registryImports.join('\n')}\n};\n`);
console.log(JSON.stringify({ templates: templates.length, vendoredFiles: sourceRecords.length, commit }));
