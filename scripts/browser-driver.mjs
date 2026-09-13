import { spawn } from "node:child_process";
import { readFile, realpath, stat, unlink } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
const WAIT_MS = 30_000;
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
    await this.send("Page.enable", {}, sessionId);
    return { targetId, sessionId, evaluate: expression => this.evaluate(sessionId, expression), send: (method, params) => this.send(method, params, sessionId) };
  }
  close() { this.#socket.close(); }
}

async function launch(executable, profile) {
  const portFile = join(profile, "DevToolsActivePort");
  const resetDeadline = Date.now() + 10_000;
  while (true) {
    try { await unlink(portFile); break; }
    catch (error) {
      if (error.code === "ENOENT") break;
      if (!["EBUSY", "EACCES", "EPERM"].includes(error.code) || Date.now() >= resetDeadline) throw error;
      await delay(100);
    }
  }
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
        // Chromium briefly holds this exclusively on Windows while publishing its endpoint.
        if (!["ENOENT", "EBUSY", "EACCES", "EPERM"].includes(error.code)) throw error;
      }
      await delay(100);
    }
    throw new Error(`Chromium startup timed out: ${stderr}`);
  } catch (error) {
    try { await stopChild(child); } catch (cleanup) { error.cleanupError = cleanup.message; }
    throw error;
  }
}

async function stopChild(child) {
  if (child.pid && child.exitCode === null && child.signalCode === null) {
    await new Promise((accept, reject) => {
      const timer = setTimeout(() => reject(new Error("Dedicated Chromium process did not terminate")), 10_000);
      child.once("exit", () => { clearTimeout(timer); accept(); });
      child.kill("SIGKILL");
    });
  }
}

async function terminate(browser) {
  if (!browser) return;
  browser.cdp.close();
  await stopChild(browser.child);
}

export { within, browserPath, launch, terminate };
