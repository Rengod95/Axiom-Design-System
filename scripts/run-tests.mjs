import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TEST_ROOTS = ["modules/ads-core/test", "modules/local-store/test", "apps/cli/test", "modules/browser-store/test"];
const tests = TEST_ROOTS.flatMap((directory) => {
  const entries = readdirSync(join(ROOT, directory), { withFileTypes: true });
  const paths = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
    .map((entry) => join(ROOT, directory, entry.name));
  if (paths.length === 0) throw new Error(`No product tests found: ${directory}`);
  return paths;
}).sort();
const result = spawnSync(process.execPath, ["--test", ...tests], { cwd: ROOT, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
