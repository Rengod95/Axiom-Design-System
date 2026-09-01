import { fileURLToPath } from "node:url";

import { STABLE_SORT_LOCALE } from "./constants.js";
import { checkSpecification } from "./spec-harness.js";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const specRoot = fileURLToPath(new URL("../../../spec/", import.meta.url));

try {
  const report = await checkSpecification(specRoot);
  console.log(
    `Axiom specification is valid: ${report.schemaCount} schemas, ${report.registryCount} registries, ` +
      `${report.positiveFixtureCount} positive fixtures, ${report.negativeFixtureCount} negative fixtures.`,
  );
  for (const [name, digest] of Object.entries(report.digests).sort(([left], [right]) =>
    left.localeCompare(right, STABLE_SORT_LOCALE),
  )) {
    console.log(`${name}: ${digest}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`Axiom specification check failed in ${repoRoot}:\n${message}`);
  process.exitCode = 1;
}
