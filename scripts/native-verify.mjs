import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { arch, release } from "node:os";
import { dirname, join, relative, resolve, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { nativeFixture, hash, ANDROID_TEST_PINS } from "./native-fixtures.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUTPUT = join(ROOT, "dist/native-verification");
const mode = process.argv[2] ?? "probe";
const target = mode === "prepare" ? process.argv[3] : mode;
const evidence = { kind: "axiom-native-consumer-verification", status: "NOT_RUN", requested: mode, startedAt: new Date().toISOString(), host: { platform: process.platform, architecture: arch(), release: release(), node: process.version }, sourceGeneration: "not-run", nativeCompilation: "not-run", nativeExecution: "not-run", assistiveTechnology: "not-run", physicalDevice: "not-run", commands: [], limitations: ["A focused generated consumer cannot certify the complete catalog or Foundation.", "Emulator/simulator evidence does not establish physical-device, assistive-technology, IME or release readiness.", "Android exercises native semantics and callbacks; the SwiftUI probe exercises mounted UIKit-hosted rendering and consumer state updates, not native touch automation."] };
let directory;

async function command(executable, args, cwd = ROOT, timeout = 120000) {
  let binary = executable, parameters = args;
  if (process.platform === "win32" && /\.(bat|cmd)$/i.test(executable)) {
    assert(!/["\r\n&|<>^%!]/.test(executable) && args.every(argument => /^[A-Za-z0-9./:_=-]+$/.test(argument)), "Only fixed native runner arguments may use the Windows batch launcher");
    binary = process.env.ComSpec ?? "cmd.exe";
    parameters = ["/d", "/s", "/c", `""${executable}" ${args.join(" ")}"`];
  }
  const started = Date.now();
  const result = await new Promise((accept, reject) => {
    const child = spawn(binary, parameters, { cwd, windowsHide: true, env: { ...process.env, CI: "1" } });
    let output = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Native command timed out: ${executable}`)); }, timeout);
    const collect = data => { output += data; if (output.length > 16 * 1024 * 1024) { child.kill(); clearTimeout(timer); reject(new Error("Native command output exceeded its bounded capture")); } };
    child.stdout.on("data", collect); child.stderr.on("data", collect);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("close", code => { clearTimeout(timer); accept({ code, output }); });
  });
  const index = evidence.commands.length;
  evidence.commands.push({ executable, args, exitCode: result.code, elapsedMs: Date.now() - started, outputDigest: hash(result.output) });
  if (directory) await writeFile(join(directory, `command-${index}.log`), result.output);
  if (result.code !== 0) throw new Error(`${executable} exited ${result.code}: ${result.output.slice(-12000)}`);
  return result.output.trim();
}

async function findExecutable(name, extra = []) {
  const suffixes = process.platform === "win32" ? [".exe", ".bat", ".cmd", ""] : [""];
  for (const candidate of [...extra, ...(process.env.PATH ?? "").split(delimiter).flatMap(path => suffixes.map(suffix => join(path, name + suffix)))]) {
    try { await access(candidate); return resolve(candidate); } catch { /* Another documented location may be present. */ }
  }
  return null;
}

async function probe() {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const suffix = process.platform === "win32" ? ".exe" : "";
  const available = {
    java: await findExecutable("java", process.env.JAVA_HOME ? [join(process.env.JAVA_HOME, "bin/java" + suffix)] : []),
    gradle: await findExecutable("gradle"),
    adb: await findExecutable("adb", sdk ? [join(sdk, "platform-tools/adb" + suffix)] : []),
    xcodebuild: process.platform === "darwin" ? await findExecutable("xcodebuild") : null,
    xcrun: process.platform === "darwin" ? await findExecutable("xcrun") : null,
    androidSdk: sdk ?? null,
  };
  evidence.tools = available;
  return available;
}

async function prepare() {
  assert(["compose", "swiftui"].includes(target), "Native target must be compose or swiftui");
  await mkdir(OUTPUT, { recursive: true });
  assert.equal((await realpath(OUTPUT)).toLowerCase(), OUTPUT.toLowerCase(), "Native fixture output must not follow a directory alias");
  directory = await mkdtemp(join(OUTPUT, `${target}-`));
  const fixture = nativeFixture(target);
  for (const file of fixture.files) {
    const destination = resolve(directory, file.path), path = relative(directory, destination);
    assert(path && !path.startsWith("..") && !path.includes(":"), "Native fixture path must stay inside its fresh output directory");
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.text);
  }
  evidence.directory = relative(ROOT, directory).replaceAll("\\", "/");
  evidence.target = target;
  evidence.sourceGeneration = "passed";
  evidence.generatedSource = fixture.manifest.source;
  evidence.expectedDependencies = fixture.manifest.target.dependencies;
  evidence.generatedFiles = fixture.manifest.files;
  evidence.consumerFiles = fixture.files.map(file => ({ path: file.path, digest: hash(file.text) }));
  evidence.representatives = fixture.representatives;
  return fixture;
}

async function compose(tools) {
  const missing = ["java", "gradle", "adb", "androidSdk"].filter(name => !tools[name]);
  if (missing.length) { evidence.status = "BLOCKED"; evidence.missing = missing; process.exitCode = 2; return; }
  const java = await command(tools.java, ["-version"]), gradle = await command(tools.gradle, ["--version"]);
  evidence.observedToolchain = { java, gradle };
  assert(/version "17[.\"]/.test(java), "The native fixture requires the pinned JDK 17");
  assert(gradle.includes(`Gradle ${evidence.expectedDependencies.gradle}`), "The native fixture requires the pinned Gradle version");
  const devices = await command(tools.adb, ["devices", "-l"]);
  const ready = devices.split(/\r?\n/).filter(line => /^\S+\s+device\b/.test(line));
  assert.equal(ready.length, 1, "Connect exactly one authorized Android emulator/device for this bounded run");
  evidence.device = { adb: ready[0], api: await command(tools.adb, ["shell", "getprop", "ro.build.version.sdk"]), fingerprint: await command(tools.adb, ["shell", "getprop", "ro.build.fingerprint"]) };
  evidence.testDependencies = ANDROID_TEST_PINS;
  await command(tools.gradle, ["--no-daemon", "--stacktrace", "--write-locks", "--write-verification-metadata", "sha256", "assembleDebug", "assembleDebugAndroidTest"], directory, 1200000);
  evidence.nativeCompilation = "passed";
  await command(tools.gradle, ["--no-daemon", "--stacktrace", "connectedDebugAndroidTest"], directory, 1200000);
  const reports = await walk(join(directory, "build/outputs/androidTest-results/connected"));
  const results = [];
  for (const path of reports.filter(path => path.endsWith(".xml"))) {
    const xml = await readFile(path, "utf8");
    results.push({ path: relative(directory, path).replaceAll("\\", "/"), digest: hash(xml), tests: Number(xml.match(/<testsuite\b[^>]*\btests="(\d+)"/)?.[1] ?? 0), failures: Number(xml.match(/<testsuite\b[^>]*\bfailures="(\d+)"/)?.[1] ?? 0), errors: Number(xml.match(/<testsuite\b[^>]*\berrors="(\d+)"/)?.[1] ?? 0), skipped: Number(xml.match(/<testsuite\b[^>]*\bskipped="(\d+)"/)?.[1] ?? 0) });
  }
  assert(results.reduce((count, result) => count + result.tests, 0) >= 5 && results.every(result => result.failures === 0 && result.errors === 0 && result.skipped === 0), "Five real native instrumentation cases must pass without skips");
  evidence.testReports = results;
  evidence.nativeExecution = "passed";
  evidence.dependencyLocks = await fileEvidence([join(directory, "gradle.lockfile"), join(directory, "gradle/verification-metadata.xml")]);
  evidence.status = "PASSED";
}

async function swiftui(tools) {
  if (!tools.xcodebuild || !tools.xcrun) { evidence.status = "BLOCKED"; evidence.missing = ["macOS Xcode with iOS Simulator SDK"]; process.exitCode = 2; return; }
  evidence.observedToolchain = { xcode: await command(tools.xcodebuild, ["-version"]), swift: await command(tools.xcrun, ["swiftc", "--version"]), sdk: await command(tools.xcrun, ["--sdk", "iphonesimulator", "--show-sdk-version"]) };
  const sdk = await command(tools.xcrun, ["--sdk", "iphonesimulator", "--show-sdk-path"]);
  const inventory = JSON.parse(await command(tools.xcrun, ["simctl", "list", "devices", "available", "--json"]));
  const destinations = Object.entries(inventory.devices).filter(([runtime]) => runtime.includes(".iOS-")).sort(([left], [right]) => right.localeCompare(left, undefined, { numeric: true })).flatMap(([runtime, devices]) => devices.filter(device => device.isAvailable && device.name.startsWith("iPhone") && device.deviceTypeIdentifier).map(device => ({ ...device, runtime })));
  assert(destinations.length, "An installed iOS Simulator runtime and iPhone device type are required");
  const destination = destinations[0];
  const app = join(directory, "AxiomNativeProbe.app");
  await mkdir(app);
  const sources = (await walk(join(directory, "Sources"))).filter(file => file.endsWith(".swift"));
  await command(tools.xcrun, ["--sdk", "iphonesimulator", "swiftc", "-swift-version", "6", "-parse-as-library", "-module-name", "AxiomDesign", "-sdk", sdk, "-target", `${arch() === "arm64" ? "arm64" : "x86_64"}-apple-ios17.0-simulator`, ...sources, join(directory, "NativeConsumer.swift"), "-o", join(app, "AxiomNativeProbe")], directory, 300000);
  evidence.nativeCompilation = "passed";
  await writeFile(join(app, "Info.plist"), `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>design.axiom.nativeprobe</string><key>CFBundleExecutable</key><string>AxiomNativeProbe</string><key>CFBundleName</key><string>AxiomNativeProbe</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1.0</string><key>LSRequiresIPhoneOS</key><true/><key>MinimumOSVersion</key><string>17.0</string><key>CFBundleSupportedPlatforms</key><array><string>iPhoneSimulator</string></array><key>UIDeviceFamily</key><array><integer>1</integer><integer>2</integer></array><key>UILaunchScreen</key><dict/></dict></plist>`);
  await command("/usr/bin/codesign", ["--force", "--sign", "-", app]);
  const id = await command(tools.xcrun, ["simctl", "create", "Axiom native verification", destination.deviceTypeIdentifier, destination.runtime]);
  assert(/^[A-Fa-f0-9-]{36}$/.test(id), "The created simulator must return an exact identifier");
  evidence.device = { id, runtime: destination.runtime, type: destination.deviceTypeIdentifier, execution: "iOS simulator" };
  try {
    await command(tools.xcrun, ["simctl", "boot", id]);
    await command(tools.xcrun, ["simctl", "bootstatus", id, "-b"], ROOT, 300000);
    await command(tools.xcrun, ["simctl", "install", id, app]);
    const output = await command(tools.xcrun, ["simctl", "launch", "--console", "--terminate-running-process", id, "design.axiom.nativeprobe"], ROOT, 120000);
    const encoded = output.match(/AXIOM_NATIVE_RESULT:([A-Za-z0-9+/=]+)/)?.[1];
    assert(encoded, "The native process must emit its own runtime evidence");
    evidence.runtime = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    assert.equal(evidence.runtime.status, "PASSED", "The mounted SwiftUI consumer must pass its runtime assertions");
    evidence.nativeExecution = "passed";
    evidence.status = "PASSED";
  } finally {
    await command(tools.xcrun, ["simctl", "shutdown", id]).catch(error => { evidence.cleanupError = error.message; });
    await command(tools.xcrun, ["simctl", "delete", id]).catch(error => { evidence.cleanupError = error.message; });
    if (evidence.cleanupError) { evidence.status = "FAILED"; process.exitCode = 1; }
  }
}

async function walk(path) { return (await Promise.all((await readdir(path, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]))).flat(); }
async function fileEvidence(paths) { return Promise.all(paths.map(async path => ({ path: relative(directory, path).replaceAll("\\", "/"), digest: hash(await readFile(path)) }))); }

try {
  assert(["probe", "prepare", "compose", "swiftui"].includes(mode) && process.argv.length <= (mode === "prepare" ? 4 : 3), "Use native-verify.mjs probe | prepare compose|swiftui | compose | swiftui");
  const tools = await probe();
  if (mode !== "probe") {
    await prepare();
    if (mode === "prepare") evidence.status = "PREPARED";
    else await (target === "compose" ? compose(tools) : swiftui(tools));
  }
} catch (error) { evidence.status = "FAILED"; evidence.error = error.message; process.exitCode = 1; }
finally {
  evidence.finishedAt = new Date().toISOString();
  await mkdir(OUTPUT, { recursive: true });
  const text = JSON.stringify(evidence, null, 2) + "\n";
  if (directory) await writeFile(join(directory, "native-evidence.json"), text);
  const resultName = mode === "probe" ? "host-probe" : ["compose", "swiftui"].includes(target) ? target : "invalid";
  await writeFile(join(OUTPUT, `${resultName}-evidence.json`), text);
  console.log(text);
}
