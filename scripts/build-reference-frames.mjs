import { build } from "esbuild";
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url))), output = resolve(ROOT, "dist/studio/references");
await mkdir(output, { recursive: true });
await build({ absWorkingDir: ROOT, entryPoints: ["apps/studio/src/reference-frame-runtime.ts"], outfile: resolve(output, "frame-runtime.js"), bundle: true, format: "esm", platform: "browser", minify: true, target: "es2023", legalComments: "eof" });
for (const provider of ["shadcn", "mantine", "react-aria", "base-ui"]) {
  await writeFile(resolve(output, `${provider}-boot.js`), `import {mountReferenceTemplate} from './${provider}.js';\nimport {mountReferenceFrame} from './frame-runtime.js';\nmountReferenceFrame(mountReferenceTemplate);\n`);
  await writeFile(resolve(output, `${provider}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./${provider}.css"><link rel="stylesheet" href="./frame.css"></head><body><div id="reference-root"></div><script type="module" crossorigin="anonymous" src="./${provider}-boot.js"></script></body></html>`);
}
await writeFile(resolve(output, "frame.css"), "html,body{margin:0;min-width:0}body{padding:16px;box-sizing:border-box;background:transparent}#reference-root{min-width:0;position:relative}*{box-sizing:border-box}");
const types = { js: "text/javascript", css: "text/css", html: "text/html", png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", woff2: "font/woff2", wasm: "application/wasm", txt: "text/plain", json: "application/json" };
async function assets(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error("Reference assets cannot be symlinks.");
    const name = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await assets(resolve(directory, entry.name), name + "/"));
    else { const mime = types[name.split(".").pop()]; if (mime && name !== "assets.json") result.push({ path: `references/${name}`, mime }); }
  }
  return result;
}
await writeFile(resolve(output, "assets.json"), JSON.stringify(await assets(output), null, 2) + "\n");
console.log("Built isolated reference frames and explicit public asset inventory.");
