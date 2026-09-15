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
  }
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
