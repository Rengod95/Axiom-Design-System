import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
function invoke(...args: string[]) {
  const result = spawnSync(process.execPath, ["scripts/native-verify.mjs", ...args], { cwd: ROOT, encoding: "utf8", timeout: 30000 });
  assert.equal(result.error, undefined);
  return { code: result.status, evidence: JSON.parse(result.stdout) };
}

for (const target of ["compose", "swiftui"] as const) test(`${target} native fixture preserves actual generated source and does not claim execution`, () => {
  const result = invoke("prepare", target);
  assert.equal(result.code, 0);
  assert.equal(result.evidence.status, "PREPARED");
  assert.equal(result.evidence.nativeCompilation, "not-run");
  assert.equal(result.evidence.nativeExecution, "not-run");
  const directory = resolve(ROOT, result.evidence.directory);
  for (const file of result.evidence.generatedFiles.filter((file: { kind: string }) => file.kind === "source")) {
    assert.equal(createHash("sha256").update(readFileSync(resolve(directory, file.path))).digest("hex"), file.digest);
  }
  const source = readFileSync(resolve(directory, target === "compose" ? "src/androidTest/kotlin/design/axiom/NativeConsumerTest.kt" : "NativeConsumer.swift"), "utf8");
  assert(source.includes("Required native body"));
  if (target === "compose") {
    assert.equal((source.match(/@Test fun /g) ?? []).length, 5);
    assert(source.includes("performTextInput") && source.includes("assertIsOff().performClick().assertIsOff()"));
  } else {
    assert(source.includes("UIHostingController") && source.includes("state.label=\"Native updated after mount\""));
    assert(source.includes('data.base64EncodedString()+"\\n"'));
    assert(source.includes('data.write(to:documents.appendingPathComponent("native-result.json"),options:.atomic)'));
  }
});

test("native process failures retain bounded partial diagnostics and never become successful exits", async () => {
  const { captureNativeProcess } = await import(new URL("../../../scripts/native-process.mjs", import.meta.url).href);
  const failed = await captureNativeProcess(process.execPath, ["-e", 'process.stderr.write("compiler error detail"); process.exit(7)'], { cwd: ROOT });
  assert.equal(failed.code, 7);
  assert.equal(failed.output, "compiler error detail");
  const timed = await captureNativeProcess(process.execPath, ["-e", 'process.stdout.write("native launched but pending"); setInterval(() => {}, 1000)'], { cwd: ROOT, timeout: 1000 });
  assert.equal(timed.code, null);
  assert.match(timed.error, /timed out/);
  assert.equal(timed.output, "native launched but pending");
  const missing = await captureNativeProcess(resolve(ROOT, "dist/not-a-native-compiler"), [], { cwd: ROOT });
  assert.equal(missing.code, null);
  assert.match(missing.error, /ENOENT/);
  const bounded = await captureNativeProcess(process.execPath, ["-e", 'process.stdout.write("x".repeat(1000)); setInterval(() => {}, 1000)'], { cwd: ROOT, maxOutput: 64 });
  assert.equal(bounded.code, null);
  assert.equal(bounded.output.length, 64);
  assert.match(bounded.error, /bounded capture/);
});

test("native probe remains explicit and invalid targets never escape its output path", () => {
  const probe = invoke("probe");
  assert.equal(probe.code, 0);
  assert.equal(probe.evidence.status, "NOT_RUN");
  assert.equal(probe.evidence.nativeCompilation, "not-run");
  assert.equal(probe.evidence.nativeExecution, "not-run");
  const invalid = invoke("prepare", "../../outside");
  assert.equal(invalid.code, 1);
  assert.equal(invalid.evidence.status, "FAILED");
  assert.equal(invalid.evidence.directory, undefined);
});
