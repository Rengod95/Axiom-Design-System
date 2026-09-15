import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, stat, unlink } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const WAIT_MS = 30_000;
const started = Date.now();
const evidence = { kind: "axiom-real-browser-storage-regression", version: 1, status: "FAILED", node: process.version, platform: process.platform, browser: null, cases: {}, limitations: ["Chromium only; Safari and Firefox are not certified.", "Dedicated test profile; user eviction and power-loss durability are not tested.", "Quota failure uses trusted injection; physical quota exhaustion is not claimed."] };

function within(root, path) {
  const part = relative(root, path);
  return part === "" || (!isAbsolute(part) && part !== ".." && !part.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`));
}
async function browserPath() {
  const explicit = process.env.AXIOM_BROWSER_BIN ?? process.env.CHROME_BIN ?? process.env.EDGE_BIN;
  const windows = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean).flatMap(base => [join(base, "Google/Chrome/Application/chrome.exe"), join(base, "Microsoft/Edge/Application/msedge.exe")]);
  const candidates = explicit ? [explicit] : process.platform === "win32" ? windows : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  for (const candidate of candidates) try { if ((await stat(candidate)).isFile()) return await realpath(candidate); } catch { /* Try only the declared candidates. */ }
  throw new Error("No Chromium browser found. Set AXIOM_BROWSER_BIN to an installed Chrome/Edge executable. This verification never silently skips.");
}

async function serve() {
  const nobleRoot = await realpath(dirname(fileURLToPath(import.meta.resolve("@noble/hashes/sha2.js"))));
  const roots = new Map([
    ["/dist/modules/ads-core/src/", await realpath(join(ROOT, "dist/modules/ads-core/src"))],
    ["/dist/modules/browser-store/src/", await realpath(join(ROOT, "dist/modules/browser-store/src"))],
    ["/noble/", nobleRoot],
  ]);
  const harness = await realpath(join(ROOT, "modules/browser-store/test"));
  const server = createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405).end(); return; }
      const path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      let file, root;
      if (path === "/harness/" || path === "/harness/browser-harness.js") {
        root = harness; file = join(root, path.endsWith(".js") ? "browser-harness.js" : "browser-harness.html");
      } else {
        const match = [...roots].find(([prefix]) => path.startsWith(prefix));
        if (!match || !path.endsWith(".js")) { response.writeHead(404).end(); return; }
        root = match[1]; file = resolve(root, path.slice(match[0].length));
      }
      if (!within(root, file)) { response.writeHead(403).end(); return; }
      const actual = await realpath(file);
      if (!within(root, actual) || !(await stat(actual)).isFile()) { response.writeHead(403).end(); return; }
      const data = await readFile(actual);
      response.writeHead(200, { "Content-Type": actual.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Length": data.length });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((accept, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", accept); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Verify the allowlist itself before exposing the harness to Chromium.
  try {
    for (const path of ["/package.json", "/dist/apps/cli/src/main.js", "/noble/../../../package.json"]) {
      if ((await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(WAIT_MS) })).status !== 404) throw new Error("Static server allowlist regression");
    }
  } catch (error) { await new Promise(resolve => server.close(resolve)); throw error; }
  return { server, origin };
}

class Cdp {
  #socket; #next = 0; #pending = new Map();
  errors = [];
  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const pending = this.#pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer); this.#pending.delete(message.id);
        if (message.error) pending.reject(new Error(`CDP: ${message.error.message}`)); else pending.accept(message.result);
      } else if (message.method === "Runtime.exceptionThrown" && this.errors.length < 5) this.errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    });
    socket.addEventListener("close", () => {
      for (const pending of this.#pending.values()) { clearTimeout(pending.timer); pending.reject(new Error("Browser debug connection closed")); }
      this.#pending.clear();
    });
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((accept, reject) => {
      const timer = setTimeout(() => { socket.close(); reject(new Error("Browser debug connection timed out")); }, WAIT_MS);
      socket.addEventListener("open", () => { clearTimeout(timer); accept(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Browser debug connection failed")); }, { once: true });
    });
    return new Cdp(socket);
  }
  send(method, params = {}, sessionId) {
    const id = ++this.#next;
    return new Promise((accept, reject) => {
      const timer = setTimeout(() => { this.#pending.delete(id); reject(new Error(`CDP ${method} timed out`)); }, WAIT_MS);
      this.#pending.set(id, { accept, reject, timer });
      try { this.#socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); }
      catch (error) { clearTimeout(timer); this.#pending.delete(id); reject(error); }
    });
  }
  async evaluate(sessionId, expression) {
    const reply = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text);
    return reply.result.value;
  }
  async page(url) {
    const { targetId } = await this.send("Target.createTarget", { url });
    const { sessionId } = await this.send("Target.attachToTarget", { targetId, flatten: true });
    await this.send("Runtime.enable", {}, sessionId);
    const deadline = Date.now() + WAIT_MS;
    while (!(await this.evaluate(sessionId, "globalThis.browserHarness?.ready === true"))) {
      if (Date.now() > deadline) throw new Error(`Browser harness did not load: ${this.errors.join("; ")}`);
      await delay(100);
    }
    return { targetId, call: (method, ...args) => this.evaluate(sessionId, `globalThis.browserHarness[${JSON.stringify(method)}](...${JSON.stringify(args)})`) };
  }
  close() { this.#socket.close(); }
}

async function launch(executable, profile) {
  const portFile = join(profile, "DevToolsActivePort");
  await unlink(portFile).catch(error => { if (error.code !== "ENOENT") throw error; });
  const child = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-extensions", "--disable-sync", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "", spawnError;
  child.stderr.on("data", data => { stderr = (stderr + data.toString()).slice(-4000); });
  child.once("error", error => { spawnError = error; });
  const deadline = Date.now() + WAIT_MS;
  try {
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Chromium exited before readiness (${child.exitCode ?? child.signalCode}): ${stderr}`);
      try {
        const [port, endpoint] = (await readFile(portFile, "utf8")).trim().split(/\r?\n/);
        if (/^\d+$/.test(port) && endpoint?.startsWith("/devtools/browser/")) return { child, cdp: await Cdp.connect(`ws://127.0.0.1:${port}${endpoint}`) };
      } catch (error) {
        // Chromium briefly holds this exclusively while publishing it on Windows.
        if (!["ENOENT", "EBUSY", "EACCES", "EPERM"].includes(error.code)) throw error;
      }
      await delay(100);
    }
    throw new Error(`Chromium startup timed out: ${stderr}`);
  } catch (error) { child.kill("SIGKILL"); throw error; }
}

async function terminate(browser) {
  if (!browser) return;
  browser.cdp.close();
  if (browser.child.exitCode === null && browser.child.signalCode === null) {
    await new Promise((accept, reject) => {
      const timer = setTimeout(() => reject(new Error("Dedicated Chromium process did not terminate")), 10_000);
      browser.child.once("exit", () => { clearTimeout(timer); accept(); });
      browser.child.kill("SIGKILL");
    });
  }
}

let temp, localServer, browser;
try {
  const executable = await browserPath();
  temp = await mkdtemp(join(tmpdir(), "axiom-browser-"));
  const profile = join(temp, "profile");
  const { server, origin } = await serve(); localServer = server;
  browser = await launch(executable, profile);
  const version = await browser.cdp.send("Browser.getVersion");
  evidence.browser = { product: version.product, userAgent: version.userAgent, protocolVersion: version.protocolVersion, executable };
  const first = await browser.cdp.page(`${origin}/harness/`), second = await browser.cdp.page(`${origin}/harness/`);
  const database = `axiom-regression-${randomUUID()}`;
  evidence.cases.nativeServices = await first.call("setup", database);
  await second.call("setup", database);
  evidence.cases.workflow = await first.call("workflow");
  const left = await first.call("prepareRace", "a"), right = await second.call("prepareRace", "b");
  if (left.baseRevision !== right.baseRevision) throw new Error("Race candidates do not share a base revision");
  const raced = await Promise.all([first.call("applyRace"), second.call("applyRace")]);
  if (raced.map(result => result.status).sort().join(",") !== "accepted,conflict") throw new Error("Two-tab race did not yield exactly one commit and one conflict");
  const observations = await Promise.all([first.call("inspectRace"), second.call("inspectRace")]);
  if (JSON.stringify(observations[0]) !== JSON.stringify(observations[1])) throw new Error("Separate browser tabs disagree after concurrent writes");
  evidence.cases.concurrentTabs = { distinctTargets: first.targetId !== second.targetId, sharedOriginAndProfile: true, simultaneousRequests: true, commonBase: left.baseRevision, outcomes: raced.map(result => result.status), observationsAgree: true };
  evidence.cases.transactions = await first.call("faultCases");
  evidence.cases.reconnect = await first.call("reconnect");
  const checkpoint = await first.call("checkpoint");
  await terminate(browser); browser = undefined;
  browser = await launch(executable, profile);
  const reopened = await browser.cdp.page(`${origin}/harness/`);
  await reopened.call("setup", database);
  evidence.cases.processRestart = await reopened.call("verifyRestart", checkpoint);
  evidence.cases.processRestart.termination = "dedicated process SIGKILL after completed transactions";
  evidence.cases.processRestart.persistedStateDigest = checkpoint.stateDigest;
  evidence.status = "PASSED";
} catch (error) {
  evidence.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  try { await terminate(browser); } catch (error) { evidence.status = "FAILED"; evidence.cleanupError = error.message; process.exitCode = 1; }
  if (localServer) await new Promise(resolve => localServer.close(resolve));
  if (temp) {
    const absolute = resolve(temp), parent = resolve(tmpdir());
    if (!within(parent, absolute) || !relative(parent, absolute).startsWith("axiom-browser-")) throw new Error("Refusing cleanup outside the dedicated temporary directory");
    try { await rm(absolute, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
    catch (error) { evidence.status = "FAILED"; evidence.cleanupError = error.message; process.exitCode = 1; }
  }
  evidence.elapsedMs = Date.now() - started;
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}
