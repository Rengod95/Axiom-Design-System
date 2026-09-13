import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = await realpath(resolve(fileURLToPath(new URL("../dist/studio", import.meta.url))));
const DEFAULT_PORT = 4317;
const port = process.env.AXIOM_STUDIO_PORT === undefined ? DEFAULT_PORT : Number(process.env.AXIOM_STUDIO_PORT);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid AXIOM_STUDIO_PORT.");
const ASSETS = new Map([["/", ["index.html", "text/html"]], ["/index.html", ["index.html", "text/html"]], ["/app.js", ["app.js", "text/javascript"]], ["/app.css", ["app.css", "text/css"]]]);
const server = createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405).end(); return; }
    const entry = ASSETS.get(new URL(request.url, "http://127.0.0.1").pathname);
    if (!entry) { response.writeHead(404).end(); return; }
    const path = await realpath(resolve(ROOT, entry[0]));
    const inside = relative(ROOT, path);
    if (isAbsolute(inside) || inside.startsWith("..") || !(await stat(path)).isFile()) { response.writeHead(403).end(); return; }
    const data = await readFile(path);
    response.writeHead(200, { "Content-Type": `${entry[1]}; charset=utf-8`, "Content-Length": data.length, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch { response.writeHead(404).end(); }
});
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`Axiom Studio: http://127.0.0.1:${server.address().port}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
