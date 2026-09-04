import { fileURLToPath } from "node:url";

import {
  checkReferenceContractDriftInTemporaryDirectory,
  writeReferenceContracts,
} from "./contracts-generator.js";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const shouldWrite = process.argv.includes("--write");

try {
  if (shouldWrite) {
    const artifacts = await writeReferenceContracts(repoRoot);
    console.log(`Axiom reference contracts generated: ${artifacts.length} artifacts.`);
  } else {
    const drift = await checkReferenceContractDriftInTemporaryDirectory(repoRoot);
    if (drift.length > 0) throw new Error(`Generated reference contracts drifted:\n${drift.join("\n")}`);
    console.log("Axiom generated reference contracts are current.");
  }
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`Axiom reference-contract check failed in ${repoRoot}:\n${message}`);
  process.exitCode = 1;
}
