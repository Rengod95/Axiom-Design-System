import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = await realpath(resolve(fileURLToPath(new URL("../dist/studio", import.meta.url))));
const DEFAULT_PORT = 4317;
const port = process.env.AXIOM_STUDIO_PORT === undefined ? DEFAULT_PORT : Number(process.env.AXIOM_STUDIO_PORT);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid AXIOM_STUDIO_PORT.");
const ASSETS = new Map([["/", ["index.html", "text/html"]], ["/index.html", ["index.html", "text/html"]], ["/app.js", ["app.js", "text/javascript"]], ["/app.css", ["app.css", "text/css"]], ["/SUIT-Variable.woff2", ["SUIT-Variable.woff2", "font/woff2"]], ["/SUIT-OFL.txt", ["SUIT-OFL.txt", "text/plain"]]]);
ASSETS.set("/Geist-Variable.woff2", ["Geist-Variable.woff2", "font/woff2"]);
ASSETS.set("/GeistMono-Variable.woff2", ["GeistMono-Variable.woff2", "font/woff2"]);
ASSETS.set("/Geist-OFL.txt", ["Geist-OFL.txt", "text/plain"]);
const references = JSON.parse(await readFile(resolve(ROOT, "references/assets.json"), "utf8"));
if (!Array.isArray(references) || references.length > 3000) throw new Error("Invalid reference asset inventory.");
for (const asset of references) {
  if (typeof asset.path !== "string" || !/^references\/[a-zA-Z0-9_./-]+$/.test(asset.path) || asset.path.split("/").includes("..") || !["text/html", "text/javascript", "text/css", "image/png", "image/webp", "image/jpeg", "image/svg+xml", "font/woff2", "application/wasm", "text/plain", "application/json"].includes(asset.mime)) throw new Error("Invalid public reference asset.");
  ASSETS.set(`/${asset.path}`, [asset.path, asset.mime]);
}
const server = createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405).end(); return; }
    const entry = ASSETS.get(new URL(request.url, "http://127.0.0.1").pathname);
    if (!entry) { response.writeHead(404).end(); return; }
    const path = await realpath(resolve(ROOT, entry[0]));
    const inside = relative(ROOT, path);
    if (isAbsolute(inside) || inside.startsWith("..") || !(await stat(path)).isFile()) { response.writeHead(403).end(); return; }
    const data = await readFile(path);
    const reference = entry[0].startsWith("references/");
    response.writeHead(200, { "Content-Type": `${entry[1]}; charset=utf-8`, "Content-Length": data.length, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(reference || entry[1] === "font/woff2" ? { "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin" } : {}),
      "Content-Security-Policy": reference
        ? "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"
        : "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch { response.writeHead(404).end(); }
});
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`Axiom Studio: http://127.0.0.1:${server.address().port}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
