import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  collectGuidebookModules,
  compareGuidebookModules,
  discoverGuidebookModules,
} from "./check-guidebook-coverage.mjs";

const TEMPORARY_DIRECTORIES = [];

/** Creates and records an isolated repository tree for a discovery test. */
const createTemporaryRepository = async () => {
  const directory = await mkdtemp(join(tmpdir(), "axiom-guidebook-"));
  TEMPORARY_DIRECTORIES.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    TEMPORARY_DIRECTORIES.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("guidebook coverage", () => {
  test("reports missing, stale, and duplicate module markers", () => {
    const documented = collectGuidebookModules(
      [
        "<!-- guidebook-module: packages/example/src/index.ts -->",
        "<!-- guidebook-module: scripts/stale.mjs -->",
        "<!-- guidebook-module: scripts/stale.mjs -->",
      ].join("\n"),
    );

    expect(
      compareGuidebookModules(
        ["packages/example/src/index.ts", "scripts/check.mjs"],
        documented,
      ),
    ).toEqual([
      "Missing guidebook module: scripts/check.mjs",
      "Stale guidebook module: scripts/stale.mjs",
      "Duplicate guidebook module: scripts/stale.mjs",
    ]);
  });

  test("discovers package source and policy scripts while excluding tests", async () => {
    const repositoryRoot = await createTemporaryRepository();
    const sourceDirectory = join(repositoryRoot, "packages", "example", "src", "domain");
    const scriptsDirectory = join(repositoryRoot, "scripts");
    await mkdir(sourceDirectory, { recursive: true });
    await mkdir(scriptsDirectory, { recursive: true });
    await Promise.all([
      writeFile(join(sourceDirectory, "identity.ts"), "export {};\n"),
      writeFile(join(sourceDirectory, "identity.test.ts"), "export {};\n"),
      writeFile(join(scriptsDirectory, "check-example.mjs"), "export {};\n"),
      writeFile(join(scriptsDirectory, "check-example.test.mjs"), "export {};\n"),
    ]);

    await expect(discoverGuidebookModules(repositoryRoot)).resolves.toEqual([
      "packages/example/src/domain/identity.ts",
      "scripts/check-example.mjs",
    ]);
  });
});
