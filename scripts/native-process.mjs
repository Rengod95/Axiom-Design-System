import { spawn } from "node:child_process";

/** Always return bounded partial output, including when no successful process exit exists. */
export async function captureNativeProcess(binary, args, options) {
  const { cwd, timeout = 120000, maxOutput = 16 * 1024 * 1024 } = options;
  return new Promise(accept => {
    let child, timer, output = "", settled = false;
    const finish = (code, signal, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      accept({ code, signal, output, ...(error ? { error } : {}) });
    };
    try { child = spawn(binary, args, { cwd, windowsHide: true, env: { ...process.env, CI: "1" } }); }
    catch (error) { finish(null, null, error.message); return; }
    const stop = reason => { child.kill(); finish(null, null, reason); };
    timer = setTimeout(() => stop(`Native command timed out after ${timeout}ms`), timeout);
    const collect = data => {
      if (settled) return;
      const chunk = data.toString();
      const remaining = maxOutput - output.length;
      output += chunk.slice(0, remaining);
      if (chunk.length > remaining) stop("Native command output exceeded its bounded capture");
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", error => finish(null, null, error.message));
    child.once("close", (code, signal) => finish(code, signal));
  });
}
